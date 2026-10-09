import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BUILT_SERVER_COMMAND,
  FOCUSED_E2E_ARGS,
  RELEASE_VERIFY_STEPS,
  STANDALONE_ASSET_COPIES,
} from '../scripts/release-verify.mjs';

describe('release verifier', () => {
  it('executes the CLI checks from a checkout path containing spaces', () => {
    mkdirSync(join(process.cwd(), '.fleet-local'), { recursive: true });
    const fixture = mkdtempSync(join(process.cwd(), '.fleet-local/release CLI '));
    const bin = join(fixture, 'bin');
    mkdirSync(bin);
    cpSync('scripts/release-verify.mjs', join(fixture, 'release-verify.mjs'));
    writeFileSync(join(bin, 'pnpm'), '#!/bin/sh\necho release-check-invoked\nexit 23\n', {
      mode: 0o755,
    });
    try {
      execFileSync(process.execPath, [join(fixture, 'release-verify.mjs')], {
        cwd: fixture,
        env: { PATH: bin, NODE_ENV: 'test' },
        encoding: 'utf8',
        stdio: 'pipe',
      });
      throw new Error('The release CLI skipped its checks');
    } catch (error) {
      const result = error as { status?: number; stdout?: string; stderr?: string };
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('release-check-invoked');
      expect(result.stderr).toContain('typecheck failed with exit 23');
    }
  });
  it('runs non-deploy gates before local smoke and focused e2e', () => {
    expect(RELEASE_VERIFY_STEPS).toEqual([
      ['pnpm', ['typecheck']],
      ['pnpm', ['lint']],
      ['pnpm', ['test']],
      ['pnpm', ['--dir', 'extension', 'build']],
      ['pnpm', ['cf:build']],
    ]);
    expect(FOCUSED_E2E_ARGS).toEqual([
      'exec',
      'playwright',
      'test',
      'e2e/ats-job-flow.spec.ts',
      'e2e/settings-readiness.spec.ts',
      'e2e/history.spec.ts',
      'e2e/resume-builder.spec.ts',
      '--workers=1',
    ]);
    expect(BUILT_SERVER_COMMAND).toEqual([process.execPath, ['.next/standalone/server.js']]);
    expect(STANDALONE_ASSET_COPIES).toEqual([
      ['.next/static', '.next/standalone/.next/static'],
      ['public', '.next/standalone/public'],
    ]);
  });
});
