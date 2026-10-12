import { z } from 'zod';
import { assertJobPage, jobPageContent } from '@/lib/job-page-content';
import { publicJobUrl } from '@/lib/resume-assistant-input';

const greenhousePosting = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

function greenhouseReference(raw: string) {
  const url = new URL(raw);
  if (!['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname)) return;
  const match = /^\/([a-zA-Z0-9][a-zA-Z0-9_.-]{0,119})\/jobs\/(\d{1,20})\/?$/.exec(url.pathname);
  if (!match) return;
  return {
    id: match[2],
    url: `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(match[1])}/jobs/${match[2]}`,
  };
}

/** Only fixed provider origins receive requests; the caller cannot choose a fetch target. */
async function readPosting(url: string, accept: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: accept, 'X-No-Cache': 'true' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('Could not read the posting. Paste jd_text to continue.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The posting was empty. Paste jd_text to continue.');
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 256_000) throw new Error('The posting was too large. Paste jd_text to continue.');
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return text;
}

async function greenhouseText(content: string): Promise<string> {
  const { parseHTML } = await import('linkedom');
  const { document } = parseHTML('<html><body></body></html>');
  // Greenhouse returns entity-encoded HTML; older postings can contain another layer.
  for (let layer = 0; layer < 2 && /&(?:amp;)?lt;\/?[a-z]/i.test(content); layer++) {
    document.body.innerHTML = content;
    content = document.body.textContent ?? '';
  }
  document.body.innerHTML = content;
  for (const node of document.querySelectorAll('script, style, noscript, template')) node.remove();
  for (const node of document.querySelectorAll('br')) node.replaceWith('\n');
  for (const node of document.querySelectorAll('p, li, div, h1, h2, h3, h4, h5, h6'))
    node.appendChild(document.createTextNode('\n'));
  return (document.body.textContent ?? '').replace(/\n\s*\n/g, '\n\n').trim();
}

/** Public Greenhouse jobs use their published JSON; other boards use the reader. */
export async function extractPublicJob(raw: string): Promise<string> {
  const url = publicJobUrl(raw);
  const reference = greenhouseReference(url);
  if (reference) {
    const job = greenhousePosting.parse(
      JSON.parse(await readPosting(reference.url, 'application/json'))
    );
    if (String(job.id) !== reference.id)
      throw new Error('Could not read a specific posting. Paste jd_text to continue.');
    const text = await greenhouseText(job.content);
    if (text.length < 100) throw new Error('The posting was empty. Paste jd_text to continue.');
    assertJobPage(job.title, text);
    return `${job.title}\n\n${text}`.slice(0, 15_000);
  }
  const text = await readPosting(`https://r.jina.ai/${url}`, 'text/plain');
  if (
    text.trim().length < 100 ||
    /captcha|verify you are human|unusual traffic|access denied/i.test(text)
  )
    throw new Error(
      'The posting needs manual access. Paste jd_text to continue; verification is not bypassed.'
    );
  try {
    return jobPageContent(text).text.slice(0, 15_000);
  } catch {
    throw new Error('Could not read a specific posting. Paste jd_text to continue.');
  }
}
