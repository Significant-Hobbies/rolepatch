#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { extractWithSlowSerp } from './resume-mcp-extraction.mjs';

if (process.argv.includes('--help')) {
  console.log(
    'RolePatch resume MCP (stdio). Set ROLEPATCH_BASE_URL to your local app or deployed origin. ROLEPATCH_API_TOKEN from Settings connects owned cloud IDs; optional ROLEPATCH_SLOW_SERP_ROOT reuses local HTTP extraction. No application submission tools are exposed.'
  );
  process.exit(0);
}
const base = new URL(process.env.ROLEPATCH_BASE_URL || 'http://localhost:3000');
if (
  base.username ||
  base.password ||
  (base.protocol !== 'https:' &&
    !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))
)
  throw new Error('Use HTTPS or localhost for ROLEPATCH_BASE_URL.');
const endpoint = new URL('/api/mcp', base);
async function send(message) {
  const response = await fetch(endpoint, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(120_000),
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(process.env.ROLEPATCH_API_TOKEN
        ? { authorization: `Bearer ${process.env.ROLEPATCH_API_TOKEN}` }
        : process.env.ROLEPATCH_SESSION_COOKIE
          ? { cookie: process.env.ROLEPATCH_SESSION_COOKIE }
          : {}),
    },
    body: JSON.stringify(message),
  });
  if (response.status === 202) return null;
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error(
      `RolePatch returned HTTP ${response.status}. Check ROLEPATCH_BASE_URL and that this build includes /api/mcp.`
    );
  const output = await response.json();
  if (response.status === 401 && output?.code === 'invalid_access_token')
    throw new Error('RolePatch API access expired or was revoked. Create a new token in Settings.');
  if (output?.jsonrpc !== '2.0')
    throw new Error(`RolePatch returned an invalid MCP response (HTTP ${response.status}).`);
  return output;
}
const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
for await (const line of lines) {
  let message;
  try {
    message = JSON.parse(line);
    if (
      message?.id !== undefined &&
      message.method === 'tools/call' &&
      message.params?.name === 'rolepatch_tailor_resume' &&
      process.env.ROLEPATCH_SLOW_SERP_ROOT &&
      !message.params?.arguments?.jd_text &&
      message.params?.arguments?.source !== 'rolepatch'
    ) {
      const args = message.params.arguments ?? {};
      const resolved = await send({
        jsonrpc: '2.0',
        id: 'local-extraction',
        method: 'tools/call',
        params: {
          name: 'rolepatch_resolve_job',
          arguments: Object.fromEntries(
            Object.entries(args).filter(([k]) =>
              ['job_id', 'source', 'company', 'job_url'].includes(k)
            )
          ),
        },
      });
      const ref = resolved?.result?.structuredContent;
      if (!ref?.ok || !ref.url)
        throw new Error(ref?.error || 'Use a public job URL or paste jd_text.');
      args.jd_text = await extractWithSlowSerp(process.env.ROLEPATCH_SLOW_SERP_ROOT, ref.url);
    }
    const result = await send(message);
    if (result && (message?.id !== undefined || result.error))
      process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    if (message?.id !== undefined)
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: message.id, ...(message.method === 'tools/call' ? { result: { isError: true, content: [{ type: 'text', text: error.message || 'MCP request failed.' }] } } : { error: { code: -32603, message: 'RolePatch transport unavailable. Check the app origin and retry.' } }) })}\n`
      );
    else if (!message)
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON' } })}\n`
      );
  }
}
