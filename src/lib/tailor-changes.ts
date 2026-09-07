import type { TailorChange } from '@/lib/types';

/** Structured-output models sometimes encode Markdown line breaks as HTML. */
export function normalizeTailoredMarkdown(markdown: string): string {
  return markdown.replace(/<br\s*\/?\s*>/gi, '\n');
}

/** Keep explanations only when their excerpt identifies a real textual edit. */
export function groundTailorChanges(
  original: string,
  tailored: string,
  changes: TailorChange[]
): TailorChange[] {
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
  const before = normalize(original);
  const after = normalize(tailored);
  return changes.filter(({ snippet }) => {
    const excerpt = normalize(snippet);
    return excerpt.length > 0 && after.includes(excerpt) && !before.includes(excerpt);
  });
}
