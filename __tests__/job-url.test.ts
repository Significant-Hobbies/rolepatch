import { describe, expect, it } from 'vitest';

import { uniqueDiscoveryAlerts } from '@/lib/job-discovery-alerts';
import { canonicalJobUrl, jobUrlVariants } from '@/lib/job-url';

describe('job URL normalization', () => {
  it('strips tracking parameters, section fragments, and trailing slashes while preserving the URL path', () => {
    expect(canonicalJobUrl('https://Boards.Greenhouse.io/acme/jobs/123/?gh_src=abc#app')).toBe(
      'https://boards.greenhouse.io/acme/jobs/123'
    );
  });

  it('keeps job IDs distinct from queryless pages even when tracking parameters are present', () => {
    expect(jobUrlVariants('https://jobs.example.com/view?job=42&utm_source=mail')).toEqual([
      'https://jobs.example.com/view?job=42&utm_source=mail',
      'https://jobs.example.com/view?job=42',
    ]);
  });
  it('keeps the exact URL as a lookup variant before the canonical URL', () => {
    expect(jobUrlVariants('https://jobs.lever.co/acme/1?source=linkedin#apply')).toEqual([
      'https://jobs.lever.co/acme/1?source=linkedin#apply',
      'https://jobs.lever.co/acme/1',
    ]);
  });
});

it('removes board navigation while retaining query-addressed job IDs', () => {
  for (const [posting, navigation] of [
    ['https://jobs.lever.co/tenant/job', 'lever-source=page'],
    ['https://jobs.ashbyhq.com/tenant/job', 'src=share'],
    ['https://boards.greenhouse.io/tenant/jobs/123', 'gh_jid=123&t=ad'],
    ['https://www.linkedin.com/jobs/view/engineer-123', 'refId=first&eBP=a&position=2'],
  ]) {
    expect(canonicalJobUrl(posting + '?' + navigation)).toBe(posting);
  }
  expect(canonicalJobUrl('https://boards.greenhouse.io/embed/job_app?gh_jid=42&t=a')).toBe(
    'https://boards.greenhouse.io/embed/job_app?gh_jid=42'
  );
  expect(canonicalJobUrl('https://jobs.example.org/view?job=2')).not.toBe(
    canonicalJobUrl('https://jobs.example.org/view')
  );
});

it('keeps valid distinct openings when a malformed discovery alert appears in the batch', () => {
  const first = { job_url: 'https://jobs.example.org/view?id=1' };
  const second = { job_url: 'https://jobs.example.org/view?id=2' };
  expect(
    uniqueDiscoveryAlerts([
      first,
      { job_url: 'unparseable' },
      { job_url: 'ftp://site/open' },
      { ...first, job_url: first.job_url + '&utm_source=x' },
      second,
    ])
  ).toEqual([first, second]);
});
