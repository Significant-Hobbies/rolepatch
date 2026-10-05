import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  buildSmokeChecks,
  normalizeBaseUrl,
  runProductionSmoke,
} from '../scripts/production-smoke.mjs';

describe('production smoke harness', () => {
  it('normalizes base URLs and keeps auth checks opt-in', () => {
    expect(normalizeBaseUrl('https://rolepatch.com/')).toBe('https://rolepatch.com');
    expect(buildSmokeChecks({ hasSessionCookie: false }).map((check) => check.name)).toEqual([
      'landing',
      'jobs browser',
      'pricing',
      'proof project',
      'truehire proof preview guard',
      'settings readiness',
    ]);
    expect(buildSmokeChecks({ hasSessionCookie: true }).map((check) => check.name)).toContain(
      'apply queue api'
    );
  });

  it('runs public smoke checks without a session cookie', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith('/jobs')) return new Response('<h1>Find roles</h1>');
      if (url.endsWith('/pricing')) return new Response('<h1>Tokens</h1>');
      if (url.endsWith('/proof')) {
        return new Response('<h1>TrueHire proof project</h1><h2>Candidate proof profile</h2>');
      }
      if (url.includes('/api/proof/truehire-preview')) {
        return Response.json(
          { ok: false, error: 'Enter a TrueHire handle or profile URL.' },
          { status: 400 }
        );
      }
      if (url.endsWith('/settings')) {
        return new Response('<h1>Operational readiness</h1><h2>Chrome extension</h2>');
      }
      return new Response('<h1>RolePatch</h1>');
    });

    const summary = await runProductionSmoke({
      baseUrl: 'https://rolepatch.com/',
      fetchImpl,
    });

    expect(summary.authenticated).toBe(false);
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBe(6);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/api/apply-agent'))).toBe(
      false
    );
  });

  it('runs authenticated apply-agent read checks when a session cookie is supplied', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith('/api/apply-agent/queue')) {
        return Response.json({ queue: [] });
      }
      if (url.endsWith('/api/apply-agent/packets')) {
        return Response.json({ packets: [] });
      }
      if (url.endsWith('/api/apply-agent/receipts')) {
        return Response.json({ receipts: [] });
      }
      if (url.endsWith('/jobs')) return new Response('<h1>Find roles</h1>');
      if (url.endsWith('/pricing')) return new Response('<h1>Tokens</h1>');
      if (url.endsWith('/proof')) {
        return new Response('<h1>TrueHire proof project</h1><h2>Candidate proof profile</h2>');
      }
      if (url.includes('/api/proof/truehire-preview')) {
        return Response.json(
          { ok: false, error: 'Enter a TrueHire handle or profile URL.' },
          { status: 400 }
        );
      }
      if (url.endsWith('/settings')) {
        return new Response('<h1>Operational readiness</h1><h2>Chrome extension</h2>');
      }
      return new Response('<h1>RolePatch</h1>');
    });

    const summary = await runProductionSmoke({
      baseUrl: 'https://rolepatch.com',
      sessionCookie: 'better-auth.session_token=abc',
      fetchImpl,
    });

    expect(summary.authenticated).toBe(true);
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBe(9);
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual(
      expect.arrayContaining([
        'https://rolepatch.com/api/apply-agent/queue',
        'https://rolepatch.com/api/apply-agent/packets',
        'https://rolepatch.com/api/apply-agent/receipts',
      ])
    );
  });

  it('reports fetch failures as failed smoke checks', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('connection refused');
    });

    const summary = await runProductionSmoke({
      baseUrl: 'https://rolepatch.com',
      fetchImpl,
      timeoutMs: 1,
    });

    expect(summary.passed).toBe(0);
    expect(summary.failed).toBe(6);
    expect(summary.results[0]).toMatchObject({
      ok: false,
      status: 0,
      errors: ['connection refused'],
    });
  });

  it('runs the CLI from a path containing spaces and exits nonzero when a public check fails', async () => {
    const requestedPaths: string[] = [];
    const server = createServer((request, response) => {
      const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      requestedPaths.push(path);

      if (path === '/api/proof/truehire-preview') {
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'Invalid preview URL.' }));
        return;
      }

      if (path === '/jobs') {
        response.writeHead(503, { 'content-type': 'text/html' });
        response.end('<h1>Temporarily unavailable</h1>');
        return;
      }

      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(
        {
          '/': '<h1>RolePatch</h1>',
          '/pricing': '<h1>Tokens</h1>',
          '/proof': '<h1>TrueHire proof project</h1><h2>Candidate proof profile</h2>',
          '/settings': '<h1>Operational readiness</h1><h2>Chrome extension</h2>',
        }[path] ?? '<h1>Unexpected route</h1>'
      );
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected an ephemeral TCP port');

    const tempDirectory = await mkdtemp(join(process.cwd(), '.rolepatch smoke cli '));
    try {
      const sourcePath = join(
        dirname(fileURLToPath(import.meta.url)),
        '../scripts/production-smoke.mjs'
      );
      const spacedScriptPath = join(tempDirectory, 'production-smoke.mjs');
      await copyFile(sourcePath, spacedScriptPath);

      const { code, stdout, stderr } = await new Promise<{
        code: number | null;
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [spacedScriptPath, '--base-url', `http://127.0.0.1:${address.port}`],
          {
            env: { PATH: process.env.PATH ?? '', NODE_ENV: 'test' },
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        );
        let childStdout = '';
        let childStderr = '';
        child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
          childStdout += chunk;
        });
        child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
          childStderr += chunk;
        });
        child.once('error', reject);
        child.once('close', (exitCode) =>
          resolve({ code: exitCode, stdout: childStdout, stderr: childStderr })
        );
      });

      expect(spacedScriptPath).toContain(' ');
      expect(stdout).toContain('RolePatch production smoke: 5/6 passed');
      expect(code).toBe(1);
      expect(stderr).toBe('');
      expect(
        stdout
          .split(/\r?\n/)
          .filter((line) => /^(PASS|FAIL) /.test(line))
          .map((line) => line.replace(/^(PASS|FAIL) /, '').replace(/ \d+ \d+ms.*$/, ''))
      ).toEqual([
        'landing',
        'jobs browser',
        'pricing',
        'proof project',
        'truehire proof preview guard',
        'settings readiness',
      ]);
      expect(stdout).toContain('FAIL jobs browser 503');
      expect(requestedPaths).toEqual([
        '/',
        '/jobs',
        '/pricing',
        '/proof',
        '/api/proof/truehire-preview',
        '/settings',
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });
});
