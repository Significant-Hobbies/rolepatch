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
    expect.objectContaining({ redirect: 'error' })
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
    extractPublicJob('https://job-boards.greenhouse.io/twilio/jobs/999999999')
  ).rejects.toThrow('specific posting');
});

it('rejects a reader-stripped directory with no current-openings heading', async () => {
  const directory =
    'Title: Twilio\nMarkdown Content:\nG&A\n### Accounting\n| Job |\n| --- |\n' +
    '| [Financial Manager](https://job-boards.greenhouse.io/twilio/jobs/1) |\n' +
    '| [Network Engineer](https://job-boards.greenhouse.io/twilio/jobs/2) |\n';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(directory)));
  await expect(
    extractPublicJob('https://job-boards.greenhouse.io/twilio/jobs/999999999')
  ).rejects.toThrow('specific posting');
});
