import { describe, expect, it } from 'vitest';
import { replaceResumeRange, resumeOutline } from '@/lib/resume-outline';

describe('imported resume outline', () => {
  it('preserves all original bytes including CRLF, pins, custom sections and nested lists', () => {
    const source =
      '# Ada\r\n\r\n[Portfolio](https://example.org)\r\n\r\n## Experience\r\n\r\n### Acme\r\n- Built UI. <!-- rolepatch:always-include -->\r\n  - Nested detail.\r\n\r\n## Publications\r\n\r\nA paper.\r\n';
    const sections = resumeOutline(source);
    expect(sections.map((item) => source.slice(item.start, item.end)).join('')).toBe(source);
    const publications = sections.find((item) => item.title === 'Publications')!;
    expect(
      replaceResumeRange(source, publications.contentStart, publications.end, 'Another paper.\r\n')
    ).toBe(source.replace('A paper.\r\n', 'Another paper.\r\n'));
  });
  it('does not treat fenced code as a section heading', () => {
    const sections = resumeOutline(
      '# Ada\n\n## Projects\n\n```md\n## Not a section\n```\n\n## Education\n\nBSc.\n'
    );
    expect(sections.map((item) => item.title)).toEqual([
      'Personal details',
      'Projects',
      'Education',
    ]);
  });
});
