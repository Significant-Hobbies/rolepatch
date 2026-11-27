import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../security-policy.mjs';

import {
  buildSmokeChecks,
  normalizeBaseUrl,
  runProductionSmoke,
} from '../scripts/production-smoke.mjs';

function workspaceRedirect(path: string) {
  if (!['/jobs', '/history', '/resume-builder', '/settings'].includes(path)) return null;
  return new Response(null, {
    status: 307,
    headers: { location: `/sign-in?${new URLSearchParams({ returnTo: path })}` },
  });
}

describe('production smoke harness', () => {
  it('normalizes base URLs and keeps auth checks opt-in', () => {
    expect(normalizeBaseUrl('https://rolepatch.com/')).toBe('https://rolepatch.com');
    expect(buildSmokeChecks({ hasSessionCookie: false }).map((check) => check.name)).toEqual([
      'landing',
      'jobs requires sign-in',
      'history requires sign-in',
      'resume builder requires sign-in',
      'pricing',
      'proof project',
      'truehire proof preview guard',
      'settings requires sign-in',
      'workspace sign-in',
    ]);
    expect(buildSmokeChecks({ hasSessionCookie: true }).map((check) => check.name)).toContain(
      'apply queue api'
    );
  });

  it('runs public smoke checks without a session cookie', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);
      const privateRoute = workspaceRedirect(new URL(url).pathname);
      if (privateRoute) return privateRoute;
      if (url.endsWith('/sign-in'))
        return new Response('Sign in to RolePatch. Continue with Google');
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
      return new Response('<h1>RolePatch</h1>', {
        headers: { 'content-security-policy': CONTENT_SECURITY_POLICY },
      });
    });

    const summary = await runProductionSmoke({
      baseUrl: 'https://rolepatch.com/',
      fetchImpl,
    });

    expect(summary.authenticated).toBe(false);
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBe(9);
    expect(fetchImpl).toHaveBeenCalledTimes(9);
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/api/apply-agent'))).toBe(
      false
    );
  });

  it.each([undefined, '', 'default-src *'])(
    'rejects a missing, empty or different landing CSP: %s',
    async (policy) => {
      const summary = await runProductionSmoke({
        baseUrl: 'https://rolepatch.com',
        fetchImpl: vi.fn(
          async () =>
            new Response('<h1>RolePatch</h1>', {
              headers: policy === undefined ? {} : { 'content-security-policy': policy },
            })
        ),
      });
      expect(summary.results[0]).toMatchObject({
        name: 'landing',
        ok: false,
        errors: [
          policy === undefined
            ? 'missing response header: content-security-policy'
            : 'unexpected response header: content-security-policy',
        ],
      });
    }
  );

  it('runs authenticated apply-agent read checks when a session cookie is supplied', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
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
      if (url.endsWith('/resume-builder') && new Headers(init?.headers).has('cookie')) {
        return new Response('<h1 id="resume-builder-master-heading">Resume Builder</h1>');
      }
      const privateRoute = workspaceRedirect(new URL(url).pathname);
      if (privateRoute) return privateRoute;
      if (url.endsWith('/sign-in'))
        return new Response('Sign in to RolePatch. Continue with Google');
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
      return new Response('<h1>RolePatch</h1>', {
        headers: { 'content-security-policy': CONTENT_SECURITY_POLICY },
      });
    });

    const summary = await runProductionSmoke({
      baseUrl: 'https://rolepatch.com',
      sessionCookie: 'better-auth.session_token=abc',
      fetchImpl,
    });

    expect(summary.authenticated).toBe(true);
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBe(13);
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
    expect(summary.failed).toBe(9);
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

      const privateRoute = workspaceRedirect(path);
      if (privateRoute) {
        response.writeHead(privateRoute.status, Object.fromEntries(privateRoute.headers));
        response.end();
        return;
      }
      response.writeHead(200, {
        'content-type': 'text/html',
        ...(path === '/' ? { 'content-security-policy': CONTENT_SECURITY_POLICY } : {}),
      });
      response.end(
        {
          '/': '<h1>RolePatch</h1>',
          '/pricing': '<h1>Tokens</h1>',
          '/sign-in': 'Sign in to RolePatch. Continue with Google',
          '/proof': '<h1>TrueHire proof project</h1><h2>Candidate proof profile</h2>',
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
      const spacedScriptPath = join(tempDirectory, 'scripts', 'production-smoke.mjs');
      await mkdir(join(tempDirectory, 'scripts'));
      await copyFile(sourcePath, spacedScriptPath);
      await copyFile(
        join(dirname(sourcePath), '../security-policy.mjs'),
        join(tempDirectory, 'security-policy.mjs')
      );

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
      expect(stdout).toContain('RolePatch production smoke: 8/9 passed');
      expect(code).toBe(1);
      expect(stderr).toBe('');
      expect(
        stdout
          .split(/\r?\n/)
          .filter((line) => /^(PASS|FAIL) /.test(line))
          .map((line) => line.replace(/^(PASS|FAIL) /, '').replace(/ \d+ \d+ms.*$/, ''))
      ).toEqual([
        'landing',
        'jobs requires sign-in',
        'history requires sign-in',
        'resume builder requires sign-in',
        'pricing',
        'proof project',
        'truehire proof preview guard',
        'settings requires sign-in',
        'workspace sign-in',
      ]);
      expect(stdout).toContain('FAIL jobs requires sign-in 503');
      expect(requestedPaths).toEqual([
        '/',
        '/jobs',
        '/history',
        '/resume-builder',
        '/pricing',
        '/proof',
        '/api/proof/truehire-preview',
        '/settings',
        '/sign-in',
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });
});
