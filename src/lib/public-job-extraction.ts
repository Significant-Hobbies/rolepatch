import { jobPageContent } from '@/lib/job-page-content';
import { publicJobUrl } from '@/lib/resume-assistant-input';

/** Hosted generic extraction stays on a fixed public origin, with bounded reads. */
export async function extractPublicJob(raw: string): Promise<string> {
  const url = publicJobUrl(raw);
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/plain', 'X-No-Cache': 'true' },
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
  }
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
