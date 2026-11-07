import { NextResponse } from 'next/server';
import { callResumeMcpTool, RESUME_MCP_TOOLS } from '@/lib/resume-mcp';
import { withResumeAccess } from '@/lib/resume-access';

export const dynamic = 'force-dynamic';
const versions = ['2025-06-18', '2025-03-26', '2024-11-05'];
const limits = new Map<string, { count: number; reset: number }>();
const responseHeaders = { 'Cache-Control': 'no-store' };
const rpc = (id: unknown, body: object, status = 200) =>
  NextResponse.json({ jsonrpc: '2.0', id, ...body }, { status, headers: responseHeaders });

/** Stateless Streamable HTTP with JSON responses; no server-push stream. */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return new Response('Origin not allowed', { status: 403 });
  if (!req.headers.get('content-type')?.includes('application/json'))
    return new Response('Use application/json', { status: 415 });
  const accept = req.headers.get('accept') ?? '';
  if (!accept.includes('application/json') || !accept.includes('text/event-stream'))
    return new Response('Accept application/json and text/event-stream', { status: 406 });
  const protocol = req.headers.get('mcp-protocol-version');
  if (protocol && !versions.includes(protocol))
    return new Response('Unsupported MCP protocol version', { status: 400 });
  const reader = req.body?.getReader();
  if (!reader) return rpc(null, { error: { code: -32700, message: 'Empty request' } }, 400);
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 100_000) {
        await reader.cancel();
        return new Response('Request too large', { status: 413 });
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let message: {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: { protocolVersion?: string; name?: string; arguments?: unknown };
  };
  try {
    message = JSON.parse(text);
  } catch {
    return rpc(null, { error: { code: -32700, message: 'Invalid JSON' } }, 400);
  }
  if (
    !message ||
    typeof message !== 'object' ||
    Array.isArray(message) ||
    message.jsonrpc !== '2.0' ||
    typeof message.method !== 'string' ||
    (message.id !== undefined &&
      message.id !== null &&
      !['string', 'number'].includes(typeof message.id))
  )
    return rpc(null, { error: { code: -32600, message: 'Invalid request' } }, 400);
  if (message.id === undefined)
    return new Response(null, { status: 202, headers: responseHeaders });
  const id = message.id;
  if (message.method === 'initialize')
    return rpc(id, {
      result: {
        protocolVersion: versions.includes(message.params?.protocolVersion ?? '')
          ? message.params!.protocolVersion
          : versions[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'rolepatch-resume', version: '0.1.0' },
        instructions:
          'Bring your existing resume and a specific job. Outputs are unsaved drafts: review every change before use. Public guest calls require resume_markdown each time; there is no access to account data without a session.',
      },
    });
  if (message.method === 'ping') return rpc(id, { result: {} });
  if (message.method === 'tools/list') return rpc(id, { result: { tools: RESUME_MCP_TOOLS } });
  if (message.method !== 'tools/call')
    return rpc(id, { error: { code: -32601, message: 'Method not found' } });
  const name = message.params?.name;
  if (!RESUME_MCP_TOOLS.some((t) => t.name === name))
    return rpc(id, { error: { code: -32602, message: 'Unknown tool' } });
  const now = Date.now();
  for (const [key, state] of limits) if (state.reset <= now) limits.delete(key);
  // An additional per-isolate guard; the shared gateway remains the AI budget authority.
  const key = req.headers.get('cf-connecting-ip') ?? 'local';
  const state = limits.get(key) ?? { count: 0, reset: now + 60_000 };
  if (state.count >= 10 || limits.size >= 1000)
    return rpc(
      id,
      {
        result: {
          isError: true,
          content: [{ type: 'text', text: 'Too many requests. Wait a minute and retry.' }],
        },
      },
      429
    );
  state.count++;
  limits.set(key, state);
  try {
    const args = message.params?.arguments ?? {};
    const hasInlineMaster =
      typeof args === 'object' &&
      args !== null &&
      'resume_markdown' in args &&
      typeof args.resume_markdown === 'string';
    const requireAccount =
      name === 'rolepatch_resume_profiles' ||
      (name === 'rolepatch_tailor_resume' && !hasInlineMaster);
    return await withResumeAccess(
      req,
      async () => {
        const output = await callResumeMcpTool(name!, message.params?.arguments ?? {});
        return rpc(id, {
          result: {
            isError: !output.ok,
            content: [{ type: 'text', text: JSON.stringify(output) }],
            structuredContent: output,
          },
        });
      },
      requireAccount
    );
  } catch {
    return rpc(id, {
      result: {
        isError: true,
        content: [{ type: 'text', text: 'Resume preparation is unavailable. Please retry.' }],
      },
    });
  }
}

export function GET() {
  return new Response('Server-push streams are not supported. Use POST.', {
    status: 405,
    headers: { Allow: 'POST', ...responseHeaders },
  });
}
export const DELETE = GET;
