import { marked } from 'marked';
import { buildResumeFile } from '@/lib/resume-download';
import { describe, expect, it } from 'vitest';
import {
  assertPinnedResumePoints,
  listResumePoints,
  setResumePointPinned,
} from '@/lib/resume-pins';
import { assembleRankedResume, extractResumeBulletGroups } from '@/lib/resume-bullet-ranking';

const source =
  '# Candidate\n\n## Experience\n\n### Engineer at Acme\n\n- Shipped a product.\n  - Nested evidence.\n- Built APIs.\n\n## Projects\n\n### Widget\n\n- Released Widget.\n\n## Education\n\nB.Tech, University.\n';

describe('Always include resume points', () => {
  it('supports single-bullet projects, scoped context, and excludes education', () => {
    const points = listResumePoints(source);
    expect(points).toHaveLength(3);
    expect(points[2].context).toBe('Candidate / Projects / Widget');
    expect(points.every((point) => !point.pinned)).toBe(true);
  });
  it.each(['\n', '\r\n'])(
    'pins/unpins losslessly with %j newlines and hides policy from HTML',
    (newline) => {
      const input = source.replaceAll('\n', newline);
      const id = listResumePoints(input)[0].id;
      const pinned = setResumePointPinned(input, id, true);
      expect(listResumePoints(pinned)[0].pinned).toBe(true);
      expect(listResumePoints(pinned)[0].label).not.toContain('rolepatch');
      expect(setResumePointPinned(pinned, id, true)).toBe(pinned);
      expect(setResumePointPinned(pinned, id, false)).toBe(input);
      expect(marked.parse(pinned)).toContain('Shipped a product.');
      expect(marked.parse(pinned)).toContain('<!-- rolepatch:always-include -->');
      // An HTML comment is metadata; it creates no visible text or checkbox.
      expect(marked.parse(pinned)).not.toContain('<input');
      expect(buildResumeFile(pinned, 'Resume', 'txt').content).toBe(input);
      expect(buildResumeFile(pinned, 'Resume', 'html').content).not.toContain(
        'rolepatch:always-include'
      );
    }
  );
  it('preserves selected exact blocks when reranking', () => {
    const pinned = setResumePointPinned(source, listResumePoints(source)[0].id, true);
    const groups = extractResumeBulletGroups(pinned);
    const output = assembleRankedResume(
      pinned,
      groups,
      groups.map((group) => ({
        group_id: group.id,
        bullet_ids: group.bullets.map((bullet) => bullet.id).reverse(),
      }))
    );
    expect(() => assertPinnedResumePoints(pinned, output.tailored)).not.toThrow();
  });
  it('rejects dropped or moved pins, including single-bullet projects', () => {
    const pinned = setResumePointPinned(source, listResumePoints(source)[2].id, true);
    expect(() =>
      assertPinnedResumePoints(pinned, pinned.replace('Released Widget.', 'Changed claim.'))
    ).toThrow(/Always include/);
    expect(() =>
      assertPinnedResumePoints(pinned, pinned.replace('### Widget', '### Other project'))
    ).toThrow(/Always include/);
    expect(() => setResumePointPinned(pinned, 'missing', true)).toThrow(/changed/);
  });
});
