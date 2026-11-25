import { describe, expect, it } from 'vitest';

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
