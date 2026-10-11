// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { POST, GET } from '@/app/api/mcp/route';
import { callResumeMcpTool } from '@/lib/resume-mcp';
vi.mock('@/lib/resume-mcp', () => ({
  RESUME_MCP_TOOLS: [
    { name: 'rolepatch_tailor_resume', inputSchema: { type: 'object' } },
    { name: 'rolepatch_render_resume_pdf', inputSchema: { type: 'object' } },
  ],
  callResumeMcpTool: vi.fn(),
}));
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });
beforeEach(() => vi.resetAllMocks());
it('negotiates the protocol and lists tools', async () => {
  expect(
    await (
      await POST(
        request({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18' },
        })
      )
    ).json()
  ).toMatchObject({
    id: 1,
    result: { protocolVersion: '2025-06-18', capabilities: { tools: {} } },
  });
  expect(
    await (await POST(request({ jsonrpc: '2.0', id: 2, method: 'tools/list' }))).json()
  ).toMatchObject({
    result: {
      tools: [{ name: 'rolepatch_tailor_resume' }, { name: 'rolepatch_render_resume_pdf' }],
    },
  });
  expect(GET().status).toBe(405);
});
it('does not generate on a notification', async () => {
  expect(
    (
      await POST(
        request({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'rolepatch_tailor_resume' },
        })
      )
    ).status
  ).toBe(202);
  expect(callResumeMcpTool).not.toHaveBeenCalled();
});
it('rejects cross-origin calls and unaccepted transports', async () => {
  expect((await POST(request({}, { origin: 'https://attacker.example' }))).status).toBe(403);
  expect((await POST(request({}, { accept: 'text/html' }))).status).toBe(406);
  expect((await POST(request({}, { 'mcp-protocol-version': 'bad' }))).status).toBe(400);
});
it('rejects malformed and oversized requests before dispatch', async () => {
  expect((await POST(request([]))).status).toBe(400);
  expect((await POST(request({ jsonrpc: '2.0', id: {}, method: 'tools/list' }))).status).toBe(400);
  expect(
    (
      await POST(
        request({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'rolepatch_tailor_resume',
            arguments: { resume_markdown: 'x'.repeat(100_000) },
          },
        })
      )
    ).status
  ).toBe(413);
  expect(callResumeMcpTool).not.toHaveBeenCalled();
});
it('returns structured portable drafts and tool errors', async () => {
  const body = {
    jsonrpc: '2.0',
    id: 'draft',
    method: 'tools/call',
    params: {
      name: 'rolepatch_tailor_resume',
      arguments: { jd_text: 'test', resume_markdown: '# Guest master' },
    },
  };
  vi.mocked(callResumeMcpTool).mockResolvedValue({ ok: true, markdown: '# Resume' } as Awaited<
    ReturnType<typeof callResumeMcpTool>
  >);
  expect(await (await POST(request(body))).json()).toMatchObject({
    id: 'draft',
    result: { isError: false, structuredContent: { ok: true, markdown: '# Resume' } },
  });
  vi.mocked(callResumeMcpTool).mockResolvedValue({ ok: false, error: 'Paste jd_text' });
  expect(await (await POST(request(body))).json()).toMatchObject({
    result: { isError: true, structuredContent: { ok: false, error: 'Paste jd_text' } },
  });
});
it('delivers a PDF as an embedded resource without duplicating its blob in metadata or text', async () => {
  vi.mocked(callResumeMcpTool).mockResolvedValue({
    ok: true,
    draft_id: 'opaque-draft',
    requires_review: true,
    persisted: false,
    markdown: '# Ada Example resume',
    pdf: {
      filename: 'tailored-resume.pdf',
      mime_type: 'application/pdf',
      data_base64: 'JVBERi0xLjcK',
    },
  } as Awaited<ReturnType<typeof callResumeMcpTool>>);
  const body = await (
    await POST(
      request(
        {
          jsonrpc: '2.0',
          id: 'pdf',
          method: 'tools/call',
          params: {
            name: 'rolepatch_render_resume_pdf',
            arguments: { resume_markdown: '# Ada Example resume' },
          },
        },
        { 'cf-connecting-ip': 'pdf-resource' }
      )
    )
  ).json();
  expect(body.result.content[1]).toEqual({
    type: 'resource',
    resource: {
      uri: 'rolepatch://drafts/opaque-draft/resume.pdf',
      mimeType: 'application/pdf',
      blob: 'JVBERi0xLjcK',
    },
  });
  expect(body.result.structuredContent.pdf).toEqual({
    filename: 'tailored-resume.pdf',
    mime_type: 'application/pdf',
    uri: 'rolepatch://drafts/opaque-draft/resume.pdf',
  });
  expect(JSON.parse(body.result.content[0].text)).toEqual(body.result.structuredContent);
  expect(body.result.content[0].text).not.toContain('JVBER');
  expect(body.result.isError).toBe(false);
});
it('rejects unknown tools and limits repeated generation', async () => {
  expect(
    await (
      await POST(
        request({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'submit_everything' },
        })
      )
    ).json()
  ).toMatchObject({ error: { code: -32602 } });
  vi.mocked(callResumeMcpTool).mockResolvedValue({ ok: true } as Awaited<
    ReturnType<typeof callResumeMcpTool>
  >);
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'rolepatch_tailor_resume', arguments: { resume_markdown: '# Guest master' } },
  };
  for (let i = 0; i < 10; i++)
    expect((await POST(request(body, { 'cf-connecting-ip': 'rate-test' }))).status).toBe(200);
  expect((await POST(request(body, { 'cf-connecting-ip': 'rate-test' }))).status).toBe(429);
  expect(callResumeMcpTool).toHaveBeenCalledTimes(10);
});
