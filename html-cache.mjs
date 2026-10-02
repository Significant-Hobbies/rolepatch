// OpenNext ships BUILD_ID with the assets, so cached HTML and its chunks
// share one build boundary without a new secret or deployment binding.
export async function documentCacheRequest(request, assets) {
  if (!assets) return null;
  try {
    const buildResponse = await assets.fetch(new Request(new URL('/BUILD_ID', request.url)));
    if (buildResponse.status !== 200) return null;
    const buildId = (await buildResponse.text()).trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(buildId)) return null;
    const key = new URL(request.url);
    key.pathname = `/__rolepatch_html_cache/${buildId}${key.pathname}`;
    return new Request(key, request);
  } catch {
    // Missing/unavailable build metadata must not reuse another build's HTML.
    return null;
  }
}

export function isDocumentRequest(request) {
  return (
    !request.headers.has('authorization') &&
    !request.headers.has('rsc') &&
    !request.headers.has('next-router-prefetch') &&
    !request.headers.has('next-router-state-tree') &&
    !(request.headers.get('accept') ?? '').includes('text/x-component')
  );
}

export const DOCUMENT_CLIENT_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
export const DOCUMENT_EDGE_CACHE_CONTROL = 'public, max-age=86400';
