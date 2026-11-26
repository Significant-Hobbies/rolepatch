export const careerSecretMessage =
  'Remove the credential from the career data, or replace the link with a public URL.';

const credentialField =
  /^(?:password|passwd|token|secret|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|secret[ _-]?access[ _-]?key)$/i;
const privateKeyHeader = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;
const providerToken =
  /\b(?:gh[pousr]_[A-Za-z0-9]{32,255}|github_pat_[A-Za-z0-9_]{35,255}|xox[baprs]-[A-Za-z0-9-]{16,200}|sk-proj-[A-Za-z0-9_-]{32,255}|sk-[A-Za-z0-9]{48,128}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/;
const jwt = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{10,}\b/;
const authorizationValue = /\bAuthorization\s*:\s*(?:Basic|Bearer)\s+([a-z\d/+=_.-]+)/gi;
const assignment =
  /(?:^|[\s{"'`(,;&])(?:[A-Z0-9]+_)*(password|passwd|token|secret|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|secret[ _-]?access[ _-]?key)["']?\s*([=:])\s*(?:"([^"]+)"|'([^']+)'|([^\s<>{},;"'`]+))/gi;
const urlInText = /\b[a-z][a-z\d+.-]{0,24}:\/\/[^\s<>{}|"'`\])]+/gi;

function privateParameters(params: URLSearchParams) {
  for (const [key, value] of params) {
    if (value && (credentialField.test(key) || /^(sig|x-amz-signature)$/i.test(key))) return true;
  }
  return false;
}
function containsCredentialLink(text: string) {
  for (const match of text.matchAll(urlInText)) {
    let url: URL;
    try {
      url = new URL(match[0]);
    } catch {
      continue;
    }
    if (url.password) return true;
    if (url.hostname === 'hooks.slack.com' && /^\/services\/[^/]+\/[^/]+\/[^/]+/.test(url.pathname))
      return true;
    const fragment = url.hash.slice(1).split('?').pop();
    if (privateParameters(url.searchParams) || privateParameters(new URLSearchParams(fragment)))
      return true;
  }
  return false;
}
function tokenShaped(value: string) {
  if (value.length < 7 || /^\d+[-.]?[a-z]+$/i.test(value)) return false;
  if (/^[a-z]+(?:[-_.][a-z]+)*[.!?]?$/i.test(value)) return false;
  return (
    /[a-z]/i.test(value) &&
    (/[0-9]/.test(value) || (/[=+/!@#$%^&*]/.test(value) && value.length >= 12))
  );
}
// These names commonly appear verbatim on security and platform engineering resumes.
const technicalTerm =
  /^(?:(?:HMAC-|PBKDF2-)?SHA-?(?:1|224|256|384|512)|PBKDF2|Argon2(?:id|i|d)?|AES-?(?:128|192|256)(?:-GCM|-CBC|-CTR)?|OAuth(?:2(?:\.0)?)?|TLS(?:1\.[0-3])?|authentication|authorization|implementation|configuration|verification|infrastructure|management|credentials?|credentialing|requirements|documentation)[.,;]?$/i;
const reference =
  /^(?:(?:process\.env\.|import\.meta\.env\.|env\.|\$)[A-Z_][A-Z0-9_]*|\$[a-z]+(?:_[a-z]+)+|\$\{[a-zA-Z_][a-zA-Z_0-9]*\}|\$\{\{\s*(?:secrets|env|vars)\.[a-zA-Z_][a-zA-Z_0-9]*\s*\}\})$/;
function opaqueValue(value: string) {
  return /^[a-z\d]{12,}$/i.test(value) && !technicalTerm.test(value);
}
function credentialAssignment(line: string, match: RegExpExecArray) {
  const [, field, operator, doubleQuoted, singleQuoted, unquoted] = match;
  const value = doubleQuoted ?? singleQuoted ?? unquoted;
  if (technicalTerm.test(value) || reference.test(value.replace(/[.)]+$/, ''))) return false;
  // The level can be written "Clearance: Secret" or "Clearance: Top Secret".
  if (
    /^secret$/i.test(field) &&
    /\bclearance\s*:\s*(?:(?:active|top)\b\s*)*$/i.test(line.slice(0, match.index))
  )
    return false;
  if (tokenShaped(value)) return true;
  if (operator === '=' && opaqueValue(value)) return true;
  // A direct quoted password assignment can contain a multiword passphrase.
  return (
    operator === '=' &&
    /^(password|passwd)$/i.test(field) &&
    !unquoted &&
    value.length >= 12 &&
    /\s/.test(value)
  );
}
function credentialAuthorization(match: RegExpExecArray) {
  const value = match[1];
  return !technicalTerm.test(value) && (opaqueValue(value) || tokenShaped(value));
}
function credentialLine(original: string) {
  const line = original.replace(/\\([_#*.+!(){}[\]-])/g, '$1');
  if (
    privateKeyHeader.test(line) ||
    providerToken.test(line) ||
    jwt.test(line) ||
    containsCredentialLink(line)
  )
    return true;
  return (
    Array.from(line.matchAll(assignment)).some((match) => credentialAssignment(line, match)) ||
    Array.from(line.matchAll(authorizationValue)).some((match) => credentialAuthorization(match))
  );
}
export function containsCareerCredential(...values: (string | undefined)[]) {
  return values.some((value) => value?.split(/\r?\n/).some(credentialLine));
}

/** Compare only to an owner-scoped persisted value. An unchanged imported line
 * may survive an unrelated edit; new occurrences of the same line are checked. */
export function careerCredentialIssue(
  field: string,
  nextText: string | undefined,
  storedText?: string
): string | null {
  if (!nextText || nextText === storedText) return null;
  const counts = new Map<string, number>();
  for (const line of storedText?.split(/\r?\n/) ?? [])
    counts.set(line, (counts.get(line) ?? 0) + 1);
  for (const [index, line] of nextText.split(/\r?\n/).entries()) {
    const count = counts.get(line) ?? 0;
    if (count) {
      counts.set(line, count - 1);
      continue;
    }
    if (credentialLine(line)) return `${field}, line ${index + 1}. ${careerSecretMessage}`;
  }
  return null;
}
export function containsCredentialAnswer(title: string, values: readonly string[]) {
  return (
    credentialField.test(
      title
        .trim()
        .replace(/^what is (?:your|the) /i, '')
        .replace(/[:?]$/, '')
    ) && values.some((value) => value.trim())
  );
}
