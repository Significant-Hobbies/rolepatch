import type { FitScore, RequirementMatch } from '@/lib/types';

const statuses = new Set(['evidence_found', 'partial', 'not_evidenced']);

export function fitScoreForResume(
  score: FitScore | null,
  source: string | undefined
): FitScore | null {
  const original = score?.dimensions.find(
    (dimension) => dimension.requirement_source !== undefined
  )?.requirement_source;
  return original !== undefined && original !== source?.slice(0, 20_000) ? null : score;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sourceContext(source: string, position: number): string {
  const headings: Array<{ depth: number; text: string }> = [];
  for (const line of source.slice(0, position).split(/\r?\n/)) {
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (!match) continue;
    while (headings.length && headings.at(-1)!.depth >= match[1].length) headings.pop();
    headings.push({ depth: match[1].length, text: match[2].trim() });
  }
  return headings.map((heading) => heading.text).join(' / ') || 'Original resume';
}

function supportedQuotes(value: unknown, resume: string): RequirementMatch['evidence'] {
  if (!Array.isArray(value)) return [];
  const evidence: RequirementMatch['evidence'] = [];
  for (const quote of value.slice(0, 3)) {
    if (!record(quote) || typeof quote.excerpt !== 'string') continue;
    const excerpt = quote.excerpt.trim();
    const position = resume.indexOf(excerpt);
    if (
      excerpt.length < 8 ||
      excerpt.length > 1000 ||
      position < 0 ||
      evidence.some((entry) => entry.excerpt === excerpt)
    )
      continue;
    evidence.push({ context: sourceContext(resume, position), excerpt });
  }
  return evidence;
}

function readRequirement(value: unknown, jobDescription: string) {
  if (
    !record(value) ||
    typeof value.requirement !== 'string' ||
    typeof value.status !== 'string' ||
    !statuses.has(value.status)
  )
    return null;
  const requirement = value.requirement.trim();
  if (requirement.length < 8 || requirement.length > 500 || !jobDescription.includes(requirement))
    return null;
  return {
    requirement,
    status: value.status as RequirementMatch['status'],
    evidence: value.evidence,
  };
}

/** Quotes must exist in their own source. A job requirement never backs a candidate claim. */
export function normalizeRequirementMatches(
  value: unknown,
  resume: string,
  jobDescription: string
): RequirementMatch[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const matches: RequirementMatch[] = [];
  for (const raw of value.slice(0, 12)) {
    const item = readRequirement(raw, jobDescription);
    if (!item) continue;
    const { requirement } = item;
    const key = requirement.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const evidence = item.status === 'not_evidenced' ? [] : supportedQuotes(item.evidence, resume);
    matches.push({
      requirement,
      status: evidence.length ? item.status : 'not_evidenced',
      evidence,
    });
  }
  return matches;
}
