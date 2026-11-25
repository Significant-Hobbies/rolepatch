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
export function canonicalTrackerUrl(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Job URL must use HTTP or HTTPS.');
  if (url.username || url.password) throw new Error('Job URL must not contain credentials.');
  if (!/^#!?\//.test(url.hash)) url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  for (const key of [...url.searchParams.keys()])
    if (
      /^(utm_.*|gh_src|trk|trackingId)$/i.test(key) ||
      (key === 'source' &&
        /(^|\.)(lever\.co|greenhouse\.io|ashbyhq\.com|linkedin\.com)$/.test(url.hostname))
    )
      url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}
