import { describe, expect, it } from 'vitest';
import { groundTailorChanges, normalizeTailoredMarkdown } from '@/lib/tailor-changes';

describe('generated Markdown recovery', () => {
  it('restores headings and bullets when the model returns HTML line breaks', () => {
    expect(normalizeTailoredMarkdown('# Riley<br><br/>## Experience<BR />- Built APIs.')).toBe(
      '# Riley\n\n## Experience\n- Built APIs.'
    );
  });

  it('preserves valid Markdown and candidate facts', () => {
    const source = '# Riley\n\n- Reduced p95 from 240 ms to 160 ms.\n- Maintained < 1% errors.';
    expect(normalizeTailoredMarkdown(source)).toBe(source);
  });
});

describe('tailoring explanation grounding', () => {
  it('keeps a real reordered excerpt and discards invented or unchanged edit claims', () => {
    const original = 'Skills: SQL, TypeScript, Node.js\nReduced latency from 240 ms to 160 ms.';
    const tailored = 'Skills: TypeScript, Node.js, SQL\nReduced latency from 240 ms to 160 ms.';
    const real = {
      snippet: 'TypeScript, Node.js, SQL',
      reason: 'Prioritize the requested API skills.',
    };
    expect(
      groundTailorChanges(original, tailored, [
        real,
        { snippet: 'Built AWS services', reason: 'Not in the output.' },
        { snippet: 'Reduced latency from 240 ms to 160 ms.', reason: 'This was already present.' },
        { snippet: ' ', reason: 'Empty excerpt.' },
      ])
    ).toEqual([real]);
  });

  it('does not describe formatting-only changes as substantive edits', () => {
    expect(
      groundTailorChanges('TypeScript\nNode.js', 'TYPESCRIPT  Node.js', [
        { snippet: 'TYPESCRIPT Node.js', reason: 'Formatting.' },
      ])
    ).toEqual([]);
  });
});
