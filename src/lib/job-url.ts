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
  if (/(^|\.)linkedin\.com$/.test(hostname)) {
    const direct = pathname.match(/^\/(?:comm\/)?jobs\/view\/(?:[\w-]+-)?(\d+)$/i);
    const selected = /^\/jobs\/(?:search|collections)(?:\/|$)/i.test(pathname)
      ? searchParams.get('currentJobId')
      : null;
    const id = direct?.[1] ?? selected;
    if (id && /^\d+$/.test(id)) url.href = `https://www.linkedin.com/jobs/view/${id}`;
  }
  if (/(^|\.)greenhouse\.io$/.test(hostname)) {
    searchParams.delete('t');
    if (pathname.endsWith(`/jobs/${searchParams.get('gh_jid')}`) && searchParams.has('gh_jid'))
      searchParams.delete('gh_jid');
  }
  if (/(^|\.)lever\.co$/.test(hostname)) {
    for (const key of [...searchParams.keys()])
      if (/^lever-(?:source|origin)(?:\[\])?$/i.test(key)) searchParams.delete(key);
  }
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
