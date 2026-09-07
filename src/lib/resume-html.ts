import { Marked } from 'marked';
import {
  DEFAULT_RENDER_CONFIG,
  type ResumeRenderConfig,
  parseTemplateId,
  templateCSS,
} from '@/lib/resume-templates';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const markdown = new Marked({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    image({ text }) {
      return escapeHtml(text);
    },
    link({ href, tokens }) {
      const content = this.parser.parseInline(tokens);
      try {
        const url = new URL(href);
        if (['https:', 'http:', 'mailto:'].includes(url.protocol)) {
          return `<a href="${escapeHtml(url.href)}" rel="noopener noreferrer">${content}</a>`;
        }
      } catch {
        /* Unsupported or relative links remain readable text. */
      }
      return content;
    },
  },
});

function bounded(value: number | undefined, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/** Pure formatter shared by local downloads and authenticated server rendering. */
export function markdownToHtml(
  source: string,
  title = 'Resume',
  config?: Partial<ResumeRenderConfig>
): string {
  const cfg: ResumeRenderConfig = {
    template: parseTemplateId(config?.template),
    fontFamily:
      config?.fontFamily && /^[a-zA-Z0-9 ,"'-]{1,160}$/.test(config.fontFamily)
        ? config.fontFamily
        : DEFAULT_RENDER_CONFIG.fontFamily,
    fontSize: bounded(config?.fontSize, DEFAULT_RENDER_CONFIG.fontSize, 6, 28),
    lineHeight: bounded(config?.lineHeight, DEFAULT_RENDER_CONFIG.lineHeight, 1, 2.5),
    margin: bounded(config?.margin, DEFAULT_RENDER_CONFIG.margin, 0.25, 2),
  };
  const body = markdown.parse(source, { async: false, gfm: true });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(title)}</title>
<style>${templateCSS(cfg)}</style>
</head>
<body><div class="resume">${body}</div></body>
</html>`;
}
