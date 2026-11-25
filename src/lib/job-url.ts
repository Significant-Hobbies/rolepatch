export function canonicalJobUrl(url: string): string | null {
  try {
    return canonicalTrackerUrl(url);
  } catch {
    return null;
  }
}
export function jobUrlVariants(url: string): string[] {
  const trimmed = url.trim();
  return [...new Set([trimmed, canonicalJobUrl(trimmed)].filter((v): v is string => Boolean(v)))];
}
function removeBoardNavigation(url: URL) {
  const { hostname, pathname, searchParams } = url;
  if (/(^|\.)linkedin\.com$/.test(hostname) && /^\/jobs\/view\/(?:[\w-]+-)?\d+$/i.test(pathname)) {
    url.search = '';
    return;
  }
  if (/(^|\.)greenhouse\.io$/.test(hostname)) {
    searchParams.delete('t');
    if (pathname.endsWith(`/jobs/${searchParams.get('gh_jid')}`) && searchParams.has('gh_jid'))
      searchParams.delete('gh_jid');
  }
  if (/(^|\.)lever\.co$/.test(hostname)) searchParams.delete('lever-source');
  if (/(^|\.)ashbyhq\.com$/.test(hostname)) searchParams.delete('src');
}
export function canonicalTrackerUrl(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Job URL must use HTTP or HTTPS.');
  if (url.username || url.password) throw new Error('Job URL must not contain credentials.');
  if (!/^#!?\//.test(url.hash)) url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  for (const key of [...url.searchParams.keys()])
    if (
      /^(utm(?:_.*)?|gh_src|trk|trackingId)$/i.test(key) ||
      (key === 'source' &&
        /(^|\.)(lever\.co|greenhouse\.io|ashbyhq\.com|linkedin\.com)$/.test(url.hostname))
    )
      url.searchParams.delete(key);
  removeBoardNavigation(url);
  url.searchParams.sort();
  return url.href;
}
