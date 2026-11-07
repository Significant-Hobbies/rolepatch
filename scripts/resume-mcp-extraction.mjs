import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

function assertPublicAddress(address) {
  // Conservative: IPv6 egress is unavailable in this optional local adapter.
  if (address.includes(':')) throw new Error('Use jd_text for IPv6-only postings.');
  const [a, b] = address.split('.').map(Number);
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && [0, 168].includes(b)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && [18, 19, 51].includes(b)) ||
    (a === 203 && b === 0)
  )
    throw new Error('Only public job postings are allowed.');
}
function pinnedFetch(url, options, address) {
  return new Promise((resolveResponse, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      {
        headers: options.headers,
        signal: options.signal,
        // Pin the checked address, avoiding a second DNS resolution at connection.
        lookup: (_host, _options, callback) => callback(null, address, 4),
        family: 4,
      },
      (incoming) => {
        const response = new Response(Readable.toWeb(incoming), {
          status: incoming.statusCode,
          headers: Object.fromEntries(
            Object.entries(incoming.headers)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value])
          ),
        });
        Object.defineProperty(response, 'url', { value: url.href });
        resolveResponse(response);
      }
    );
    request.on('error', reject);
    request.end();
  });
}

export async function fetchPublicPosting(raw, { fetcher = pinnedFetch, resolver = lookup } = {}) {
  let url = new URL(raw);
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      (url.port && !['80', '443'].includes(url.port))
    )
      throw new Error('Use a public HTTP(S) posting URL.');
    const addresses = await resolver(url.hostname, { all: true });
    if (!addresses.length) throw new Error('Posting hostname did not resolve.');
    const ipv4 = addresses.filter((entry) => entry.family === 4);
    if (!ipv4.length) throw new Error('Use jd_text for IPv6-only postings.');
    for (const { address } of ipv4) assertPublicAddress(address);
    const response = await fetcher(
      url,
      {
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'RolePatch-resume-extractor/0.1',
        },
      },
      ipv4[0].address
    );
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    await response.body?.cancel();
    const location = response.headers.get('location');
    if (!location) throw new Error('Posting redirect had no destination.');
    url = new URL(location, url);
  }
  throw new Error('Too many posting redirects. Paste jd_text to continue.');
}

/** Reuse slow-serp's parser and byte cap, without booting Chrome or a service. */
export async function extractWithSlowSerp(root, url) {
  const { HttpScraper } = await import(pathToFileURL(resolve(root, 'src/http.mjs')).href);
  const entries = new Map();
  const cache = {
    get: (key) => entries.get(key),
    set: (key, value) => entries.set(key, value),
    conditionalHeaders: () => ({}),
  };
  const scraper = new HttpScraper(
    {
      httpRetries: 0,
      httpTimeoutMs: 15_000,
      maxResponseBytes: 1_000_000,
      locale: 'en-US',
      userAgent: 'RolePatch-resume-extractor/0.1',
    },
    cache
  );
  // Instance override preserves bounded extraction while validating each redirect.
  scraper.request = (target) => fetchPublicPosting(target.url);
  try {
    const result = await scraper.scrape({
      name: 'Job posting',
      url,
      extractor: 'page',
      transport: 'http',
    });
    const text = result.data?.text ?? '';
    if (text.length < 100 || /captcha|verify you are human|access denied/i.test(text))
      throw new Error('Posting unavailable.');
    return text.slice(0, 15_000);
  } catch {
    throw new Error(
      'Local extraction could not read this job. Paste jd_text to continue. No CAPTCHA or browser session is used.'
    );
  }
}
