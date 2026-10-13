import { brotliCompressSync, constants } from 'node:zlib';

function encodingQuality(header, encoding) {
  const entry = header
    .split(',')
    .find((item) => item.trim().split(';')[0].toLowerCase() === encoding);
  if (!entry) return 0;
  const quality = /;\s*q=([0-9.]+)/i.exec(entry);
  return quality ? Number(quality[1]) : 1;
}

/** Negotiate only public pricing/tools HTML; the cache keeps its identity bytes. */
export async function encodePublicHtmlResponse(response, request) {
  const path = new URL(request.url).pathname;
  const accepted = request.headers.get('accept-encoding') ?? '';
  const br = encodingQuality(accepted, 'br');
  if (
    !['/pricing', '/tools'].includes(path) ||
    request.method !== 'GET' ||
    response.status !== 200 ||
    !response.headers.get('content-type')?.includes('text/html') ||
    response.headers.has('content-encoding') ||
    br <= 0 ||
    br < encodingQuality(accepted, 'gzip')
  )
    return response;
  const body = new Uint8Array(await response.arrayBuffer());
  let encoded;
  try {
    encoded = brotliCompressSync(body, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 6,
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      },
    });
  } catch {
    // An unsupported runtime must still return the complete original document.
    return new Response(body, response);
  }
  const headers = new Headers(response.headers);
  headers.set('content-encoding', 'br');
  headers.delete('content-length');
  headers.set(
    'vary',
    [
      ...new Set([
        ...(headers.get('vary') ?? '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        'Accept-Encoding',
      ]),
    ].join(', ')
  );
  const etag = headers.get('etag');
  if (etag && !etag.startsWith('W/')) headers.set('etag', `W/${etag}`);
  return new Response(encoded, {
    status: response.status,
    statusText: response.statusText,
    headers,
    encodeBody: 'manual',
  });
}
