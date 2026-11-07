import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: async () => ({ get: () => '203.0.113.22' }) }));
const mockFetch = vi.fn();
beforeEach(async () => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
  const { resetScrapeRateLimitsForTests } = await import('@/lib/actions/scrape-action');
  await resetScrapeRateLimitsForTests();
});

const body =
  'Build reliable services and improve deployment checks with a cross-functional engineering team.';
const cases = [
  [
    'https://job-boards.greenhouse.io/twilio/jobs/8026207',
    'Software Engineer, Platform Engineering (L2)',
    'Twilio',
    'Software Engineer, Platform Engineering (L2)',
  ],
  [
    'https://jobs.lever.co/skio/0110e9f5-4640-4daf-bc53-da03d6a4e642',
    'Skio - Product Designer',
    'Skio',
    'Product Designer',
  ],
  [
    'https://jobs.ashbyhq.com/ready/d7ada023-ac2b-42bb-8196-0836f97d6440',
    'Senior Data Engineer',
    'Ready',
    'Senior Data Engineer',
  ],
  [
    'https://boards.greenhouse.io/acme/jobs/123',
    'Job Application for Platform Engineer at Acme',
    'Acme',
    'Platform Engineer',
  ],
];
describe('imported job metadata', () => {
  it.each(cases)('normalizes reader metadata for %s', async (url, title, company, role) => {
    mockFetch.mockResolvedValue(
      new Response(`Title: ${title}\n\nURL Source: ${url}\n\nMarkdown Content:\n${body}`, {
        status: 200,
      })
    );
    const { scrapeJobUrlSafe } = await import('@/lib/actions/scrape-action');
    const result = await scrapeJobUrlSafe(url);
    expect(result).toMatchObject({ ok: true, data: { company, role, text: body } });
  });
  it('rejects an expired posting redirected to the company job directory', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        'Title: Twilio\nURL Source: https://job-boards.greenhouse.io/twilio/jobs/999999999\nMarkdown Content:\n# Current openings at Twilio\n## 131 jobs\n[Platform Engineer](https://example.com/job)',
        { status: 200 }
      )
    );
    const { scrapeJobUrlSafe } = await import('@/lib/actions/scrape-action');
    expect(
      await scrapeJobUrlSafe('https://job-boards.greenhouse.io/twilio/jobs/999999999')
    ).toMatchObject({ ok: false, reason: 'unreadable' });
  });
  it('keeps an internal role dash and source headings', async () => {
    mockFetch.mockResolvedValue(
      new Response(`# Staff Engineer - Platform\n\n${body}`, { status: 200 })
    );
    const { scrapeJobUrlSafe } = await import('@/lib/actions/scrape-action');
    expect(await scrapeJobUrlSafe('https://jobs.lever.co/acme/id')).toMatchObject({
      ok: true,
      data: {
        role: 'Staff Engineer - Platform',
        text: expect.stringContaining('# Staff Engineer - Platform'),
      },
    });
  });
  it('does not treat reader metadata alone as a job description', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        'Title: Platform Engineer\nURL Source: https://example.com/job\nMarkdown Content:\n',
        { status: 200 }
      )
    );
    const { scrapeJobUrlSafe } = await import('@/lib/actions/scrape-action');
    expect(await scrapeJobUrlSafe('https://example.com/job')).toMatchObject({
      ok: false,
      reason: 'unreadable',
    });
  });
});
