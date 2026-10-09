import { extractResumeBulletGroups } from '@/lib/resume-bullet-ranking';

const MARKER = '<!-- rolepatch:always-include -->';

export function stripResumePins(source: string): string {
  return source.replaceAll(` ${MARKER}`, '').replaceAll(MARKER, '');
}

export function listResumePoints(source: string) {
  return extractResumeBulletGroups(source, 1).flatMap((group) =>
    group.bullets.map((bullet) => ({
      ...bullet,
      context: group.context,
      pinned: bullet.text.split(/\r?\n/)[0].includes(MARKER),
      label: bullet.text
        .replaceAll(MARKER, '')
        .replace(/^\s*[-+*]\s+/, '')
        .trim(),
    }))
  );
}

/** Store policy with the original block, using existing resume persistence. */
export function setResumePointPinned(source: string, id: string, pinned: boolean): string {
  const point = listResumePoints(source).find((item) => item.id === id);
  if (!point) throw new Error('This point changed. Reopen Always include and try again.');
  if (point.pinned === pinned) return source;
  const firstLineEnd = point.text.search(/\r?\n/);
  const position = firstLineEnd < 0 ? point.text.length : firstLineEnd;
  const firstLine = point.text.slice(0, position);
  const updated =
    (pinned ? `${firstLine} ${MARKER}` : firstLine.replace(` ${MARKER}`, '').replace(MARKER, '')) +
    point.text.slice(position);
  return source.slice(0, point.start) + updated + source.slice(point.end);
}

/** Fail closed if future selection logic drops a pin or moves its attribution. */
export function assertPinnedResumePoints(source: string, tailored: string): void {
  const remaining = new Map<string, number>();
  for (const point of listResumePoints(tailored).filter((item) => item.pinned)) {
    const key = JSON.stringify([point.context, point.text]);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  for (const point of listResumePoints(source).filter((item) => item.pinned)) {
    const key = JSON.stringify([point.context, point.text]);
    const count = remaining.get(key) ?? 0;
    if (!count)
      throw new Error(
        'Invalid response: an Always include point must remain unchanged in its original section'
      );
    remaining.set(key, count - 1);
  }
}
