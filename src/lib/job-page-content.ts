export class UnreadableJobPageError extends Error {
  constructor() {
    super('Failed to parse a specific job posting. Paste its description manually.');
    this.name = 'UnreadableJobPageError';
  }
}

/** Normalize reader transport metadata without mistaking a directory for a posting. */
export function jobPageContent(raw: string): { title: string; text: string } {
  const metadataTitle = raw.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
  const marker = /(?:^|\n)Markdown Content:\s*(?:\n|$)/.exec(raw);
  const text = (marker ? raw.slice(marker.index + marker[0].length) : raw).trim();
  const title =
    metadataTitle ??
    text
      .split('\n')
      .find((line) => line.trim())
      ?.replace(/^#+\s*/, '')
      .trim() ??
    '';
  assertJobPage(title, text);
  return { title, text };
}

export function assertJobPage(title: string, text: string): void {
  const opening = text.slice(0, 2000);
  const jobTableRows =
    opening.match(/^\|\s*\[[^\n]+\]\(https?:\/\/[^\s)]+\/(?:jobs|job)\/[^\s)]+\)\s*\|/gm) ?? [];
  if (
    !text.trim() ||
    (/^\|\s*Job(?: title)?\s*\|/im.test(opening) && jobTableRows.length >= 2) ||
    /(?:^|\n)\s*(?:#{1,6}\s*)?Current openings at\b/i.test(opening) ||
    /^(?:404(?:\s|$)|page not found|job not found|access denied|sign in|log in)/i.test(title) ||
    /(?:job|position|posting) (?:is no longer available|has (?:been closed|expired)|not found)/i.test(
      opening
    ) ||
    /captcha|verify you are human|unusual traffic|access denied/i.test(opening)
  )
    throw new UnreadableJobPageError();
}

/** Remove only a known company prefix/suffix; preserve dashes within role names. */
export function jobRoleFromTitle(title: string, company: string): string {
  const clean = title
    .replace(/^Title:\s*/i, '')
    .replace(/^Job Application for\s+/i, '')
    .trim();
  if (!company) return clean;
  const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return clean
    .replace(new RegExp(`^${escaped}\\s*[-–—|:]\\s*`, 'i'), '')
    .replace(new RegExp(`\\s+(?:at|@)\\s+${escaped}(?:\\s*[-|].*)?$`, 'i'), '')
    .replace(new RegExp(`\\s*[-–—|]\\s*${escaped}$`, 'i'), '')
    .trim();
}
