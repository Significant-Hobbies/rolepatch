import { marked } from 'marked';

/**
 * Render a Markdown resume string to a full standalone HTML document
 * suitable for PDF conversion via Puppeteer. One template only — clean
 * single-column, serif body, 10.5pt, 1in margins, bold headers, tight bullets.
 */
export function markdownToHtml(markdown: string, title = 'Resume'): string {
  const body = marked.parse(markdown, { async: false, gfm: true }) as string;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: letter; margin: 1in; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111;
    font-family: 'Georgia', 'Times New Roman', Times, serif;
    font-size: 10.5pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .resume { max-width: 100%; }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    margin: 0 0 2px;
    text-align: center;
    letter-spacing: 0.01em;
  }
  h1 + p {
    text-align: center;
    font-size: 9pt;
    color: #444;
    margin: 0 0 6px;
  }
  h2 {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 10px 0 4px;
    padding-bottom: 2px;
    border-bottom: 1px solid #333;
    break-after: avoid;
  }
  h3 {
    font-size: 10.5pt;
    font-weight: 700;
    margin: 6px 0 1px;
    break-after: avoid;
  }
  p { margin: 1px 0; }
  hr { display: none; }
  a { color: #1a5276; text-decoration: none; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  ul {
    margin: 1px 0 4px;
    padding-left: 1.1em;
    list-style: disc outside;
  }
  li {
    margin-bottom: 0;
    break-inside: avoid;
  }
  li::marker { color: #444; }
  h2 + p { margin-top: 6px; }
  p + ul { margin-top: 0; }
</style>
</head>
<body>
<div class="resume">
${body}
</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * PDF rendering on Cloudflare Workers: stubbed until we wire in
 * Cloudflare Browser Rendering (`@cloudflare/puppeteer`). Previously used
 * puppeteer-core + @sparticuz/chromium but those push the worker past the
 * 3 MiB free-tier limit. Client-side `window.print()` fallback works today.
 */
export async function renderPdf(_html: string): Promise<Uint8Array> {
  void _html;
  throw new Error('PDF rendering not available on this deployment. Use client-side Print instead.');
}
