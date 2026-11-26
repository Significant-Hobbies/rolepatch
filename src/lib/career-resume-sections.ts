/** Merge structured entries into matching master sections, keeping unknown sections intact. */
export function joinResumeSections(parts: string[]) {
  const blocks = new Map<string, { heading: string; body: string[] }>();
  const header: string[] = [];
  for (const part of parts) {
    let body = header;
    for (const line of part.split('\n')) {
      const heading = line.match(/^## (.+?)\s*$/);
      if (!heading) {
        body.push(line);
        continue;
      }
      const key = heading[1].trim().toLowerCase();
      let block = blocks.get(key);
      if (!block) {
        block = { heading: line, body: [] };
        blocks.set(key, block);
      }
      body = block.body;
      body.push('');
    }
    body.push('');
  }
  const headerLines = header.join('\n').trim().split('\n');
  const nameIndex = headerLines.findIndex((line) => /^# /.test(line));
  if (nameIndex > 0) headerLines.unshift(...headerLines.splice(nameIndex, 1));
  const headings = [
    'summary',
    'profile',
    'experience',
    'employment',
    'work history',
    'projects',
    'achievements',
    'education',
    'skills',
  ];
  const weight = (key: string) =>
    headings.includes(key) ? headings.indexOf(key) : headings.length;
  return [
    headerLines.join('\n').trim(),
    ...[...blocks]
      .sort(([a], [b]) => weight(a) - weight(b))
      .map(([, block]) => {
        const body = block.body.join('\n').trim();
        return body ? `${block.heading}\n\n${body}` : '';
      }),
  ]
    .filter(Boolean)
    .join('\n\n');
}
