export const careerSecretMessage =
  'Remove the credential from the career data, or replace the link with a public URL.';

// Match explicit credential fields. A degree, a certificate ID or a description
// of work on password security is ordinary career data.
const credentialField =
  /^(?:password|passwd|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|secret[ _-]?access[ _-]?key)$/i;
const privateKeyHeader = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;
const providerToken =
  /\b(?:gh[pousr]_[A-Za-z0-9]{32,255}|github_pat_[A-Za-z0-9_]{35,255}|xox[baprs]-[A-Za-z0-9-]{16,200}|sk-(?:proj-)?[A-Za-z0-9_-]{32,255})\b/;
const authorizationValue = /\bAuthorization\s*:\s*(?:Basic|Bearer)\s+[^\s,;"'`<>]+/i;
const assignment =
  /(?:^|[\s{"'`(,;&])(?:[A-Z0-9]+_)*(password|passwd|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|secret[ _-]?access[ _-]?key)["']?\s*([=:])\s*(?:"[^"\n]+"|'[^'\n]+'|([^\s<>{},;"'`]+))/gi;
const urlInText = /\b[a-z][a-z\d+.-]{0,24}:\/\/[^\s<>"'`\])]+/gi;

function containsCredentialLink(text: string) {
  for (const match of text.matchAll(urlInText)) {
    let url: URL;
    try {
      url = new URL(match[0]);
    } catch {
      continue;
    }
    if (url.password || (url.username && ['http:', 'https:'].includes(url.protocol))) return true;
    for (const [key, value] of url.searchParams) {
      if (value && (credentialField.test(key) || /^x-amz-signature$/i.test(key))) return true;
    }
  }
  return false;
}

function containsAssignment(text: string) {
  for (const match of text.matchAll(assignment)) {
    // A colon can introduce descriptive prose. A lone value, quoted value,
    // token-shaped value or environment-style assignment is sufficient.
    const unquoted = match[3];
    if (match[2] === '=' || !unquoted || /[^a-z]/i.test(unquoted)) return true;
    const immediate = text.slice(match.index + match[0].length);
    if (!immediate.trimStart() || /^\s*(?:\r?\n|[}`,;])/.test(immediate)) return true;
  }
  return false;
}

export function containsCareerCredential(...values: (string | undefined)[]) {
  return values.some(
    (value) =>
      value &&
      (privateKeyHeader.test(value) ||
        providerToken.test(value) ||
        authorizationValue.test(value) ||
        containsAssignment(value) ||
        containsCredentialLink(value))
  );
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
