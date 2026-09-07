import { markdownToHtml } from '@/lib/resume-html';
import type { ResumeRenderConfig } from '@/lib/resume-templates';

export type LocalResumeFormat = 'print' | 'txt' | 'html' | 'doc';

export function buildResumeFile(
  source: string,
  name: string,
  format: Exclude<LocalResumeFormat, 'print'>,
  config?: Partial<ResumeRenderConfig>
) {
  const slug =
    name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'resume';
  return {
    name: `${slug}.${format}`,
    type:
      format === 'txt'
        ? 'text/plain;charset=utf-8'
        : format === 'doc'
          ? 'application/msword;charset=utf-8'
          : 'text/html;charset=utf-8',
    content: format === 'txt' ? source : markdownToHtml(source, name, config),
  };
}

/** No request or storage write: export the current in-memory resume. */
export function exportLocalResume(
  source: string,
  name: string,
  format: LocalResumeFormat,
  config?: Partial<ResumeRenderConfig>
): void {
  if (format === 'print') {
    const preview = window.open('', '_blank');
    if (!preview)
      throw new Error('Allow pop-ups for RolePatch, then choose Print / Save PDF again.');
    preview.opener = null;
    preview.document.open();
    preview.document.write(markdownToHtml(source, name, config));
    preview.document.close();
    preview.focus();
    // Wait for layout before opening the native print / Save as PDF dialog.
    preview.setTimeout(() => {
      if (!preview.closed) preview.print();
    }, 100);
    return;
  }
  const file = buildResumeFile(source, name, format, config);
  const url = URL.createObjectURL(new Blob([file.content], { type: file.type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
