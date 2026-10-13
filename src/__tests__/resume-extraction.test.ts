// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { extractPublicJob } from '@/lib/public-job-extraction';
import { fetchPublicPosting } from '../../scripts/resume-mcp-extraction.mjs';
afterEach(() => vi.unstubAllGlobals());
it('uses a fixed reader origin and bounds the posting text', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('Job description '.repeat(2000)));
  vi.stubGlobal('fetch', fetcher);
  expect((await extractPublicJob('https://jobs.example.com/123')).length).toBe(15_000);
  expect(fetcher).toHaveBeenCalledWith(
    'https://r.jina.ai/https://jobs.example.com/123',
    expect.objectContaining({ redirect: 'manual' })
  );
});
it('rejects access challenges and oversized reader responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('Verify you are human. '.repeat(20)))
      .mockResolvedValueOnce(new Response('x'.repeat(256001)))
  );
  await expect(extractPublicJob('https://jobs.example.com/123')).rejects.toThrow('manual access');
  await expect(extractPublicJob('https://jobs.example.com/123')).rejects.toThrow('too large');
});
it('pins a public IPv4 address and permits dual-stack public hosts', async () => {
  const resolver = vi.fn().mockResolvedValue([
    { address: '93.184.216.34', family: 4 },
    { address: '2606:2800::1', family: 6 },
  ]);
  const fetcher = vi.fn().mockResolvedValue(new Response('description'));
  await fetchPublicPosting('https://jobs.example.com/123', { resolver, fetcher });
  expect(fetcher).toHaveBeenCalledWith(expect.any(URL), expect.any(Object), '93.184.216.34');
});
it('rejects private resolution before making a request', async () => {
  const fetcher = vi.fn();
  await expect(
    fetchPublicPosting('https://jobs.example.com/123', {
      resolver: vi.fn().mockResolvedValue([{ address: '127.0.0.1', family: 4 }]),
      fetcher,
    })
  ).rejects.toThrow('public');
  expect(fetcher).not.toHaveBeenCalled();
});
it('rechecks every redirect destination before connecting', async () => {
  const resolver = vi
    .fn()
    .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
    .mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }]);
  const fetcher = vi.fn().mockResolvedValue(Response.redirect('http://internal.example/job', 302));
  await expect(
    fetchPublicPosting('https://jobs.example.com/123', { resolver, fetcher })
  ).rejects.toThrow('public');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('rejects a job directory returned for an expired posting', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          'Title: Twilio\nMarkdown Content:\n# Current openings at Twilio\n' +
            '[Engineer](https://example.com/job)\n'.repeat(20)
        )
      )
  );
  await expect(
    extractPublicJob('https://careers.example.com/twilio/jobs/999999999')
  ).rejects.toThrow('specific posting');
});

it('rejects a reader-stripped directory with no current-openings heading', async () => {
  const directory =
    'Title: Twilio\nMarkdown Content:\nG&A\n### Accounting\n| Job |\n| --- |\n' +
    '| [Financial Manager](https://job-boards.greenhouse.io/twilio/jobs/1) |\n' +
    '| [Network Engineer](https://job-boards.greenhouse.io/twilio/jobs/2) |\n';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(directory)));
  await expect(
    extractPublicJob('https://careers.example.com/twilio/jobs/999999999')
  ).rejects.toThrow('specific posting');
});

it.each(['boards.greenhouse.io', 'job-boards.greenhouse.io'])(
  'reads the exact public Greenhouse posting on %s without the reader',
  async (host) => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        id: 123,
        title: 'Software Engineer',
        content:
          '&lt;h2&gt;Responsibilities&lt;/h2&gt;&lt;p&gt;Build TypeScript APIs &amp;amp; React interfaces for a reporting platform.&lt;/p&gt;' +
          '&lt;ul&gt;&lt;li&gt;Write automated regression tests and improve SQL query performance.&lt;/li&gt;&lt;/ul&gt;',
      })
    );
    vi.stubGlobal('fetch', fetcher);
    const text = await extractPublicJob(`https://${host}/acme/jobs/123?gh_jid=999#apply`);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs/123',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
        cache: 'no-store',
        redirect: 'manual',
      })
    );
    expect(text).toContain('Software Engineer\n\nResponsibilities\n');
    expect(text).toContain('TypeScript APIs & React');
    expect(text).toContain('platform.\nWrite automated');
    expect(text).not.toMatch(/&lt;|<p>|&amp;/);
  }
);

it('does not confuse a lookalike hostname with the Greenhouse API', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('Specific job description '.repeat(20)));
  vi.stubGlobal('fetch', fetcher);
  await extractPublicJob('https://boards.greenhouse.io.evil.com/acme/jobs/123');
  expect(fetcher).toHaveBeenCalledWith(
    'https://r.jina.ai/https://boards.greenhouse.io.evil.com/acme/jobs/123',
    expect.any(Object)
  );
});

it.each(['https://jobs.example.com/123', 'https://boards.greenhouse.io/acme/jobs/123'])(
  'rejects an upstream redirect without requesting its destination for %s',
  async (url) => {
    const fetcher = vi.fn().mockResolvedValue(Response.redirect('http://127.0.0.1/private', 302));
    vi.stubGlobal('fetch', fetcher);
    await expect(extractPublicJob(url)).rejects.toThrow('Could not read the posting');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirect: 'manual' })
    );
  }
);

it('fails a missing Greenhouse posting without falling back to a directory', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('Not found', { status: 404 }));
  vi.stubGlobal('fetch', fetcher);
  await expect(extractPublicJob('https://job-boards.greenhouse.io/acme/jobs/123')).rejects.toThrow(
    'Could not read the posting'
  );
  expect(fetcher).toHaveBeenCalledOnce();
});

it('rejects a different posting ID and malformed public API responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ id: 999, title: 'Other engineer', content: 'Other job '.repeat(20) })
      )
      .mockResolvedValueOnce(Response.json({ id: 123, title: 'Engineer', content: null }))
      .mockResolvedValueOnce(Response.json(null))
  );
  const url = 'https://job-boards.greenhouse.io/acme/jobs/123';
  await expect(extractPublicJob(url)).rejects.toThrow('specific posting');
  await expect(extractPublicJob(url)).rejects.toThrow();
  await expect(extractPublicJob(url)).rejects.toThrow();
});

it('bounds API bytes and rejects sparse Greenhouse content', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('x'.repeat(256001)))
      .mockResolvedValueOnce(Response.json({ id: 123, title: 'Engineer', content: '<p>Apply</p>' }))
  );
  const url = 'https://boards.greenhouse.io/acme/jobs/123';
  await expect(extractPublicJob(url)).rejects.toThrow('too large');
  await expect(extractPublicJob(url)).rejects.toThrow('empty');
});

it('normalizes raw and twice-encoded HTML and excludes script/style text', async () => {
  const description = '<p>Design APIs, write tests and improve production reliability. '.repeat(3);
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        id: 123,
        title: 'Engineer',
        content: `${description}</p><script>secret script instructions</script><style>hidden styles</style>`,
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        id: 123,
        title: 'Engineer',
        content: `&amp;lt;p&amp;gt;${'Design TypeScript APIs and regression tests. '.repeat(4)}&amp;lt;/p&amp;gt;`,
      })
    );
  vi.stubGlobal('fetch', fetcher);
  const url = 'https://boards.greenhouse.io/acme/jobs/123';
  const raw = await extractPublicJob(url);
  expect(raw).toContain('Design APIs');
  expect(raw).not.toMatch(/secret script|hidden styles|<p>/);
  const encoded = await extractPublicJob(url);
  expect(encoded).toContain('Design TypeScript APIs');
  expect(encoded).not.toMatch(/&amp;|&lt;|<p>/);
});
