import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export function workspaceTestEnv(baseUrl) {
  if (new URL(baseUrl).hostname !== 'localhost') {
    throw new Error('RolePatch test authentication can only run on localhost.');
  }
  const dbPath =
    process.env.ROLEPATCH_E2E_DB_PATH ??
    join(mkdtempSync(join(tmpdir(), 'rolepatch-e2e-')), 'workspace.sqlite');
  const secret = process.env.ROLEPATCH_E2E_AUTH_SECRET ?? 'rolepatch-workspace-test-only-secret-32';
  const preload = resolve('e2e/fixtures/cloudflare-db.cjs');
  return {
    ROLEPATCH_E2E_DB_PATH: dbPath,
    ROLEPATCH_E2E_AUTH_SECRET: secret,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: baseUrl,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${JSON.stringify(preload)}`.trim(),
  };
}
