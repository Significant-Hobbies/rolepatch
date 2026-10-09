import { lexResumeMarkdown } from '@/lib/resume-bullet-ranking';

export interface ResumeSection {
  id: string;
  title: string;
  start: number;
  contentStart: number;
  end: number;
}

/** Slice the original document; never rebuild imported facts from a lossy form. */
export function resumeOutline(source: string): ResumeSection[] {
  const lexed = lexResumeMarkdown(source);
  if (!lexed)
    return [
      { id: 'section-0', title: 'Resume details', start: 0, contentStart: 0, end: source.length },
    ];
  const sections: ResumeSection[] = [
    { id: 'section-0', title: 'Personal details', start: 0, contentStart: 0, end: source.length },
  ];
  let cursor = 0;
  for (const token of lexed.tokens) {
    const start = cursor;
    cursor += token.raw.length;
    if (token.type !== 'heading' || token.depth !== 2) continue;
    sections[sections.length - 1].end = lexed.offsets[start];
    sections.push({
      id: `section-${sections.length}`,
      title: token.text,
      start: lexed.offsets[start],
      contentStart: lexed.offsets[cursor],
      end: source.length,
    });
  }
  return sections.map((section) => ({
    ...section,
    contentStart:
      section.contentStart +
      (source.slice(section.contentStart, section.end).match(/^\s*/)?.[0].length ?? 0),
  }));
}

export function replaceResumeRange(
  source: string,
  start: number,
  end: number,
  value: string
): string {
  return source.slice(0, start) + value + source.slice(end);
}
