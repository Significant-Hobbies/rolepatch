import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResumeStudioPreview } from '@/components/resume-studio-preview';
import { markdownToHtml } from '@/lib/resume-html';

const pinned = '- Built reliable APIs. <!-- rolepatch:always-include -->';

describe('mandatory-point display metadata', () => {
  it('hides policy markers in the shared signed-in HTML/PDF formatter', () => {
    const html = markdownToHtml(`## Experience\n\n${pinned}`);
    expect(html).toContain('Built reliable APIs.');
    expect(html).not.toContain('rolepatch:always-include');
    expect(markdownToHtml('<script>alert(1)</script>')).toContain('&lt;script&gt;');
  });

  it('hides markers in both the tailored iframe and patch explanations', () => {
    render(
      <ResumeStudioPreview
        source={`## Experience\n\n${pinned}`}
        changes={[{ snippet: pinned, reason: 'Moved this existing bullet.', jd_match: '' }]}
        hasDraft
      />
    );
    expect(screen.getByTitle('Resume document preview').getAttribute('srcdoc')).not.toContain(
      'rolepatch:always-include'
    );
    expect(screen.getByRole('complementary').textContent).toContain('Built reliable APIs.');
    expect(screen.getByRole('complementary').textContent).not.toContain('rolepatch:always-include');
  });
});
