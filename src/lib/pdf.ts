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
 * Render HTML to PDF bytes using puppeteer-core + @sparticuz/chromium.
 * Works on Vercel serverless (x86_64 Lambda with provided Chromium binary).
 * For local macOS dev, set PUPPETEER_EXECUTABLE_PATH to a local Chrome/Chromium.
 */
export async function renderPdf(html: string): Promise<Uint8Array> {
  const [chromiumMod, puppeteerMod] = await Promise.all([
    import('@sparticuz/chromium'),
    import('puppeteer-core'),
  ]);

  const chromium = chromiumMod.default;
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath());

  const browser = await puppeteerMod.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
