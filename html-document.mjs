/** Preserve Next's early polyfill while keeping its doctype first (standards mode). */
export function ensureLeadingHtmlDoctype(body) {
  const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
  const prefix = new TextDecoder().decode(bytes.subarray(0, 1024));
  const doctype = /<!doctype html>/i.exec(prefix);
  if (!doctype || doctype.index === 0) return bytes;
  const before = prefix.slice(0, doctype.index);
  // Only repair the observed Next inlineCss ordering; leave other documents alone.
  if (!/^(?:\s*<script\b[^>]*>[\s\S]*?<\/script>)+\s*$/i.test(before)) return bytes;
  const encoder = new TextEncoder();
  const offset = encoder.encode(before).length;
  const declaration = encoder.encode(doctype[0]);
  const result = new Uint8Array(bytes.length);
  result.set(declaration);
  result.set(bytes.subarray(0, offset), declaration.length);
  result.set(bytes.subarray(offset + declaration.length), offset + declaration.length);
  return result;
}
