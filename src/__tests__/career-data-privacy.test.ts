import { expect, it } from 'vitest';
import { containsCareerCredential, careerCredentialIssue } from '@/lib/career-data-privacy';

it.each([
  'Authentication & Authorization: Bearer token validation, RBAC and SSO',
  'Password: bcrypt-based hashing and rotation policy',
  'Access token: 15-minute expiry with sliding refresh',
  'Password: SHA-256',
  'Password: PBKDF2-SHA256',
  'API key: HMAC-SHA256',
  'Secret: AES-256-GCM',
  'Token: OAuth2.0',
  '- Password: Argon2id',
  'Security Clearance: Top Secret: TS/SCI-2019',
  'password=policy-enforcement',
  'Set token=refresh_rotation in config',
  'Set api_key=process.env.API_KEY in CI',
  'Configured password=$DB_PASSWORD.',
  'Rotated secrets (password=$DATABASE_PASSWORD) weekly',
  'api_key=process.env.API_KEY_2.',
  'token=$S3_TOKEN.',
  `token: "\${{ secrets.GITHUB_TOKEN }}"`,
  `password="\${dbPassword}"`,
  'password=$db_password',
  'secret = "rotated every quarter"',
  'Authorization: Bearer authentication',
  'Password: Hashing',
  'Token: OAuth2.0 and JWT',
  '- Password: Argon2id hashing replaced bcrypt',
  'Clearance: Secret: TS/SCI-2019',
  'API key: rotation, storage and auditing',
  'Built password=less login',
  'password=None skipped validation',
  'Portfolio: https://jane@janedoe.dev',
  String.raw`\href{https://linkedin.com}{john@doe.com}`,
  'Migrated sk-learn-pipelines-to-production-ready-services-2024',
])('allows professional context %s', (line) => {
  expect(containsCareerCredential(line)).toBe(false);
});

it('recognizes credential URL parameters, webhook and provider tokens without echoing them', () => {
  const key = `AKIA${'X'.repeat(16)}`;
  const jwt = `eyJ${'Y'.repeat(16)}.eyJ${'Y'.repeat(16)}.${'X'.repeat(16)}`;
  const token = `ghp_${'Z'.repeat(36)}`;
  for (const value of [
    'password: Summer2024! (work laptop)',
    'password: Tr0ub4dor&3 for staging',
    'API key: sk_live_abc123 (prod)',
    'token: abc123def456 (expired)',
    'Authorization: Bearer abcdefghijkl and more',
    'password: $ummer2024!',
    'password=$ummer2024!',
    'password=$ecret123456789',
    'api_key=env.abc123def456ghi',
    'password: "$ummer2024!"',
    'token="<abc123def456>"',
    'secret: "{{abc123def456}}"',
    'secret: synthetic2',
    'DB_PASSWORD=supersecretvalue',
    'API_KEY=abcdefghijklmnopqrstuvwx',
    'Authorization: Bearer abcdefghijklmnopqrstuvwxyz',
    'Authorization: Basic abcdefghijklmnopqrstuvwxyz',
    'password = "my secret phrase 99"',
    "password = 'synthetic secret phrase'",
    'token: abcd1234abcd1234',
    key,
    jwt,
    token.replace('_', '\\_'),
    'https://hooks.slack.com/services/EXAMPLE/EXAMPLE/SYNTHETIC',
    'https://example.test/?token=abc',
    'https://example.test/#access_token=abc',
    'https://example.test/#/callback?secret=abc',
    'https://example.test/?sig=abc',
  ]) {
    expect(containsCareerCredential(value)).toBe(true);
    const issue = careerCredentialIssue('Master resume', `Professional summary\n${value}`);
    expect(issue).toContain('Master resume, line 2.');
    expect(issue).not.toContain(value);
  }
});
it('allows unrelated edits to an existing master while checking new occurrences', () => {
  const old = 'API_KEY=example-12345\nOld summary';
  expect(careerCredentialIssue('Master', 'API_KEY=example-12345\nNew summary', old)).toBeNull();
  expect(careerCredentialIssue('Master', `${old}\nAPI_KEY=example-12345`, old)).toContain(
    'line 3.'
  );
});
