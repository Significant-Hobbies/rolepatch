import {
  assembleRankedProjects,
  assembleRankedResume,
  extractResumeBulletGroups,
  extractResumeProjectGroups,
} from '@/lib/resume-bullet-ranking';
import {
  applyGeneratedSummary,
  assertRequiredResumeCoverage,
  validateGeneratedSummary,
  type SummaryEvidence,
} from '@/lib/resume-tailoring-policy';

const stopWords = new Set(
  'a an and are as at be by for from has have in is it of on or our that the their this to we with you your will work working experience role company team candidate required requirements responsibilities'.split(
    ' '
  )
);

function terms(text: string): string[] {
  const words = (
    text
      .toLowerCase()
      .replace(/\b(?:react\.js|reactjs)\b/g, 'react')
      .replace(/\b(?:node\.js|nodejs)\b/g, 'node')
      .replace(/\b(?:next\.js|nextjs)\b/g, 'next')
      .replace(/\b(?:apis|api)\b/g, 'api')
      .replace(/\b(?:front[- ]end|frontend)\b/g, 'frontend')
      .replace(/\b(?:back[- ]end|backend)\b/g, 'backend')
      .match(/[\p{L}\p{N}]+(?:[+#]+)?/gu) ?? []
  ).filter((term) => term.length > 1 && !stopWords.has(term));
  // Relevance features only: these labels never become resume claims.
  if (
    /\b(react|vue|angular|next(?:\.js)?|astro|tailwind|mui|storybook|swiftui|flutter|screens?|interfaces?|ui|ios|web app|design system|front[- ]?end)\b/i.test(
      text
    )
  )
    words.push('frontend_evidence');
  if (
    /\b(go|node(?:\.js|js)?|back[- ]?end|databases?|postgres\w*|sql|apis?|transactions?)\b/i.test(
      text
    )
  )
    words.push('backend_evidence');
  if (/\b(agents?|rag|retrieval|inference|llms?|tool schemas|bounded execution)\b/i.test(text))
    words.push('agent_evidence');
  return words;
}

/** BM25 against source facts only. Stable ties and zero matches keep the master order. */
export function rankSourceItems<T extends { text: string }>(items: T[], jd: string): T[] {
  const documents = items.map((item) => terms(item.text));
  const query = new Set(terms(jd));
  const role =
    jd
      .slice(0, 250)
      .match(
        /\b(front[- ]?end|back[- ]?end|ui engineer|web developer|(?:agent|llm|inference|ai)\s+engineer)\b/i
      )?.[0] ?? '';
  const focus = /\b(front[- ]?end|ui engineer|web developer)\b/i.test(role)
    ? 'frontend_evidence'
    : /\b(back[- ]?end)\b/i.test(role)
      ? 'backend_evidence'
      : /\b(agent|llm|inference|ai)\s+engineer\b/i.test(role)
        ? 'agent_evidence'
        : '';
  const average = documents.reduce((sum, doc) => sum + doc.length, 0) / (items.length || 1);
  const frequencies = new Map<string, number>();
  for (const doc of documents)
    for (const term of new Set(doc)) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  return items
    .map((item, index) => {
      const doc = documents[index];
      let score = 0;
      for (const term of query) {
        const count = doc.filter((word) => word === term).length;
        if (!count) continue;
        const df = frequencies.get(term) ?? 0;
        const idf = Math.log(1 + (items.length - df + 0.5) / (df + 0.5));
        score +=
          ((term === focus ? 8 : 1) * (idf * count * 2.2)) /
          (count + 1.2 * (0.25 + (0.75 * doc.length) / (average || 1)));
      }
      return { item, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

/** Complete approved facts, never a truncation, paraphrase or JD-derived claim. */
export function extractiveSummary(evidence: SummaryEvidence[], jd: string): string {
  const candidates = evidence.filter(
    (fact) =>
      !/^(?:summary|profile|objective)\b/i.test(fact.context) &&
      // Project stack/date paragraphs are metadata, not achievement sentences.
      (fact.kind !== 'paragraph' ||
        (fact.text.split(/\s+/).length >= 8 && /[.!?]$/.test(fact.text))) &&
      fact.text.split(/\s+/).length <= 85 &&
      fact.text.length <= 950 &&
      !/[\r\n<>`[\]*]|@|https?:\/\/|^\s*(?:#|>|-\s|\d+\.\s)/i.test(fact.text)
  );
  const achievements = candidates.filter(
    (fact) =>
      fact.kind !== 'paragraph' &&
      /\b(experience|employment|work history|projects?|products?|achievements?)\b/i.test(
        fact.context
      )
  );
  const ranked = [
    ...rankSourceItems(achievements, jd),
    ...rankSourceItems(
      candidates.filter((fact) => !achievements.includes(fact)),
      jd
    ),
  ];
  const chosen: SummaryEvidence[] = [];
  let words = 0;
  for (const fact of ranked) {
    const count = fact.text.split(/\s+/).length;
    if (words + count > 90 || chosen.some((item) => item.text === fact.text)) continue;
    chosen.push(fact);
    words += count;
    if (chosen.length >= 2 && words >= 8) break;
  }
  const text = chosen
    .map((fact) => (/[.!?]$/.test(fact.text) ? fact.text : `${fact.text}.`))
    .join(' ');
  return validateGeneratedSummary({ text, evidence_ids: chosen.map((fact) => fact.id) }, evidence);
}

export function buildSourceFallback(source: string, jd: string, evidence: SummaryEvidence[]) {
  const groups = extractResumeBulletGroups(source);
  const bullets = assembleRankedResume(
    source,
    groups,
    groups.map((group) => ({
      group_id: group.id,
      bullet_ids: rankSourceItems(group.bullets, jd).map((bullet) => bullet.id),
    }))
  );
  const projects = assembleRankedProjects(
    bullets.tailored,
    extractResumeProjectGroups(bullets.tailored).map((group) => ({
      group_id: group.id,
      project_ids: rankSourceItems(group.projects, jd).map((project) => project.id),
    }))
  );
  const summary = extractiveSummary(evidence, jd);
  const tailored = applyGeneratedSummary(projects.tailored, summary);
  assertRequiredResumeCoverage(source, tailored);
  return {
    tailored,
    generation_method: 'source_fallback' as const,
    changes: [
      {
        snippet: summary.slice(0, 240),
        reason:
          'The AI result was unavailable or failed validation. Ranked original points and whole projects by text relevance and composed this summary from complete source facts. No new claims were written; the AI credit was refunded if charged.',
      },
      ...projects.changes,
      ...bullets.changes,
    ].slice(0, 8),
  };
}
