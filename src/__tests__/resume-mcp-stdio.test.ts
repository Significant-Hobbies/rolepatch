// @vitest-environment node
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { expect, it } from 'vitest';

it('forwards embedded PDF resources unchanged through the local stdio bridge', async () => {
  const result = {
    jsonrpc: '2.0',
    id: 'pdf',
    result: {
      isError: false,
      structuredContent: {
        ok: true,
        requires_review: true,
        pdf: {
          filename: 'tailored-resume.pdf',
          mime_type: 'application/pdf',
          uri: 'rolepatch://drafts/fixture/resume.pdf',
        },
      },
      content: [
        {
          type: 'resource',
          resource: {
            uri: 'rolepatch://drafts/fixture/resume.pdf',
            mimeType: 'application/pdf',
            blob: 'JVBERi0xLjcK',
          },
        },
      ],
    },
  };
  let received: unknown;
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    received = JSON.parse(Buffer.concat(chunks).toString());
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(result));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture address');
  const child = spawn(process.execPath, ['scripts/resume-mcp.mjs'], {
    env: { NODE_ENV: 'test', ROLEPATCH_BASE_URL: `http://127.0.0.1:${address.port}` },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const message = {
    jsonrpc: '2.0',
    id: 'pdf',
    method: 'tools/call',
    params: {
      name: 'rolepatch_render_resume_pdf',
      arguments: { resume_markdown: '# Ada Example resume fixture' },
    },
  };
  try {
    child.stdin.end(`${JSON.stringify(message)}\n`);
    let output = '';
    for await (const chunk of child.stdout) output += chunk.toString();
    expect(JSON.parse(output.trim())).toEqual(result);
    expect(received).toEqual(message);
  } finally {
    child.kill();
    server.close();
  }
});
