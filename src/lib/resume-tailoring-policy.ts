import type { Token } from 'marked';
import { lexResumeMarkdown } from '@/lib/resume-bullet-ranking';
import { assertPinnedResumePoints } from '@/lib/resume-pins';

const PROJECT_SECTION = /\b(projects?|products?)\b/i;
const EDUCATION_SECTION = /\b(education|academic background|academic qualifications)\b/i;
const SUMMARY_SECTION = /^(?:(?:professional|career|executive)\s+)?(?:summary|profile|objective)$/i;
const EVIDENCE_SECTION =
  /\b(summary|profile|experience|employment|work history|projects?|products?|education|academic|skills?|achievements?|accomplishments?|highlights)\b/i;

interface ResumeSection {
  title: string;
  start: number;
  bodyStart: number;
  end: number;
  body: string;
  raw: string;
  tokens: Token[];
}

export interface SummaryEvidence {
  id: string;
  context: string;
  text: string;
  kind?: 'bullet' | 'paragraph';
}

export interface GeneratedResumeSummary {
  text: string;
  evidence_ids: string[];
}

export class ResumePolicyError extends Error {}

function sections(source: string): ResumeSection[] {
  const lexed = lexResumeMarkdown(source);
  if (!lexed)
    throw new ResumePolicyError(
      'Use Markdown section headings so your resume can be tailored safely.'
    );
  const result: ResumeSection[] = [];
  let cursor = 0;
  let current: Omit<ResumeSection, 'body' | 'raw' | 'end'> | null = null;
  const finish = (end: number) => {
    if (current)
      result.push({
        ...current,
        end,
        body: source.slice(current.bodyStart, end),
        raw: source.slice(current.start, end),
      });
  };
  for (const token of lexed.tokens) {
    const start = cursor;
    cursor += token.raw.length;
    if (token.type === 'heading' && token.depth <= 2) {
      finish(lexed.offsets[start]);
      current =
        token.depth === 2
          ? {
              title: token.text,
              start: lexed.offsets[start],
              bodyStart: lexed.offsets[cursor],
              tokens: [],
            }
          : null;
    } else current?.tokens.push(token);
  }
  finish(source.length);
  return result;
}

function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/[*_`]/g, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function projectPoints(section: ResumeSection): string[] {
  return section.tokens.flatMap((token) =>
    token.type === 'list'
      ? token.items.filter((item) => plain(item.text)).map((item) => item.raw.replace(/\s+$/, ''))
      : []
  );
}

/** Missing facts are input errors, not an invitation to generate education or projects. */
export function prepareResumePolicy(source: string): { evidence: SummaryEvidence[] } {
  const parsed = sections(source);
  if (parsed.filter((section) => SUMMARY_SECTION.test(plain(section.title))).length > 1)
    throw new ResumePolicyError(
      'Keep one Summary or Profile section before tailoring your resume.'
    );
  if (
    !parsed.some((section) => PROJECT_SECTION.test(section.title) && projectPoints(section).length)
  )
    throw new ResumePolicyError(
      'Add at least one product or project achievement under a Projects or Products heading before tailoring.'
    );
  if (
    !parsed.some(
      (section) =>
        EDUCATION_SECTION.test(section.title) &&
        section.tokens.some(
          (token) =>
            ['heading', 'paragraph', 'list', 'table'].includes(token.type) &&
            plain(token.raw).length > 2
        )
    )
  )
    throw new ResumePolicyError(
      'Add your education under an Education heading before tailoring. No education details have been invented.'
    );

  const evidence: SummaryEvidence[] = [];
  for (const section of parsed) {
    if (!EVIDENCE_SECTION.test(section.title)) continue;
    let context = plain(section.title);
    for (const token of section.tokens) {
      if (token.type === 'heading') context = `${plain(section.title)} / ${plain(token.text)}`;
      const texts =
        token.type === 'paragraph'
          ? [token.text]
          : token.type === 'list'
            ? token.items.map((item) => item.text)
            : [];
      for (const value of texts) {
        const text = plain(value);
        if (text && !/@|https?:\/\//i.test(text))
          evidence.push({
            id: `f${evidence.length + 1}`,
            context,
            text,
            kind: token.type === 'list' ? 'bullet' : 'paragraph',
          });
      }
    }
  }
  if (!evidence.length) throw new ResumePolicyError('Add factual resume content before tailoring.');
  return { evidence };
}

function numericClaims(text: string): string[] {
  return (text.match(/\b\d[\d,]*(?:\.\d+)?(?:K|M|B|%|\+|×)?/gi) ?? []).map((claim) => {
    const cleaned = claim.replaceAll(',', '').toLowerCase();
    const magnitude = cleaned.match(/^([\d.]+)([kmb])$/);
    return magnitude
      ? String(Number(magnitude[1]) * ({ k: 1000, m: 1e6, b: 1e9 }[magnitude[2]] ?? 1))
      : cleaned;
  });
}

/** References and numbers are bounded checks; they cannot prove semantic entailment. */
export function validateGeneratedSummary(
  summary: GeneratedResumeSummary,
  evidence: SummaryEvidence[]
): string {
  const text = summary.text.trim();
  if (
    text.length < 20 ||
    text.length > 1000 ||
    text.split(/\s+/).length < 8 ||
    text.split(/\s+/).length > 90 ||
    /[\r\n<>`[\]*]|@|https?:\/\/|^\s*(?:#|>|-\s|\d+\.\s)/i.test(text)
  )
    throw new Error('Invalid response: summary must be a short plain-text paragraph');
  const byId = new Map(evidence.map((fact) => [fact.id, fact]));
  if (
    !summary.evidence_ids.length ||
    summary.evidence_ids.length > 12 ||
    new Set(summary.evidence_ids).size !== summary.evidence_ids.length ||
    summary.evidence_ids.some((id) => !byId.has(id))
  )
    throw new Error('Invalid response: summary must reference supplied resume evidence');
  const cited = summary.evidence_ids.map((id) => byId.get(id)!.text).join(' ');
  // Known factual-drift regressions. This is deliberately a bounded claim check, not NLI.
  const protectedClaims = [
    {
      claim: /\b(cross[- ]functional|collaborat\w*|teamwork|team[- ]player)\b/i,
      support: /\b(cross[- ]functional|collaborat\w*|teamwork|teams?)\b/i,
    },
    {
      claim:
        /\b(?:led|managed|mentored|supervised)\s+(?:a\s+)?(?:teams?|engineers?|developers?|people)\b/i,
      support:
        /\b(?:led|managed|mentored|supervised)\s+(?:a\s+)?(?:teams?|engineers?|developers?|people)\b/i,
    },
    {
      claim: /\b(ledger|accounting|bookkeeping)\b/i,
      support: /\b(ledger|accounting|bookkeeping)\b/i,
    },
    { claim: /\b(certified|certifications?)\b/i, support: /\b(certified|certifications?)\b/i },
    { claim: /\bresponsive\b/i, support: /\bresponsive\b/i },
    {
      claim: /\b(?:error|failure)[- ]recovery\b|\brecover\w*\s+from\s+(?:errors?|failures?)\b/i,
      support: /\b(?:error|failure)[- ]recovery\b|\brecover\w*\s+from\s+(?:errors?|failures?)\b/i,
    },
    {
      claim: /\bbrowser[- ]rendering\b|\brendering performance\b/i,
      support: /\bbrowser\b[^.]*\brender\w*\b|\brender\w*\b[^.]*\bbrowser\b/i,
    },
  ];
  if (protectedClaims.some(({ claim, support }) => claim.test(text) && !support.test(cited)))
    throw new Error(
      'Invalid response: summary contains unsupported collaboration, leadership, qualification or frontend claims'
    );
  const numbers = new Set(numericClaims(cited));
  if (numericClaims(text).some((claim) => !numbers.has(claim)))
    throw new Error('Invalid response: summary contains unsupported numeric claims');
  const duration =
    /\b(?:\d+(?:\.\d+)?\+?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|several|many|multiple|a|an)(?:\s+|[-‐‑])(?:years?|yrs?|decades?)\b/gi;
  for (const claim of text.match(duration) ?? []) {
    const normalize = (value: string) => value.toLowerCase().replace(/[-‐‑]/g, ' ');
    if (!normalize(cited).includes(normalize(claim)))
      throw new Error('Invalid response: summary contains unsupported years of experience');
  }
  return text;
}

/** The summary is the only generated text allowed to replace original resume content. */
export function applyGeneratedSummary(source: string, text: string): string {
  const parsed = sections(source);
  const summaries = parsed.filter((section) => SUMMARY_SECTION.test(plain(section.title)));
  if (summaries.length > 1) throw new Error('Invalid response: duplicate summary sections');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  if (summaries.length) {
    const summary = summaries[0];
    const leading = summary.body.match(/^\s*/)?.[0] ?? '';
    const trailing = summary.body.match(/\s*$/)?.[0] ?? '';
    const before = leading.includes('\n') ? leading : newline;
    const after =
      summary.end === source.length
        ? trailing
        : trailing.includes('\n')
          ? trailing
          : newline + newline;
    return source.slice(0, summary.bodyStart) + before + text + after + source.slice(summary.end);
  }
  const position = parsed[0]?.start ?? source.length;
  return (
    source.slice(0, position) +
    `## Summary${newline}${newline}${text}${newline}${newline}` +
    source.slice(position)
  );
}

/** Defense against any future selection/page-budget logic silently dropping basic sections. */
export function assertRequiredResumeCoverage(source: string, tailored: string): void {
  assertPinnedResumePoints(source, tailored);
  prepareResumePolicy(tailored);
  const before = sections(source);
  const after = sections(tailored);
  const education = (items: ResumeSection[]) =>
    items
      .filter((section) => EDUCATION_SECTION.test(section.title))
      .map((section) => section.raw.replace(/\s+$/, ''));
  if (JSON.stringify(education(before)) !== JSON.stringify(education(after)))
    throw new Error('Invalid response: education must remain unchanged');
  const points = (items: ResumeSection[]) =>
    items
      .filter((section) => PROJECT_SECTION.test(section.title))
      .flatMap(projectPoints)
      .sort();
  if (JSON.stringify(points(before)) !== JSON.stringify(points(after)))
    throw new Error('Invalid response: every product/project achievement must remain');
  if (!after.some((section) => SUMMARY_SECTION.test(plain(section.title)) && plain(section.body)))
    throw new Error('Invalid response: generated summary is required');
}
