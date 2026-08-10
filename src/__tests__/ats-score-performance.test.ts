import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { expect, test } from 'vitest';

import { calculateATSScore } from '@/lib/ats-score';

const SIZES = [2_000, 10_000, 20_000];
const ITERATIONS = 25;
const VOCABULARY = Array.from({ length: 800 }, (_, index) => `skill${index}`);
const EXPECTED_HASHES = new Map([
  [2_000, '252044279edd44086b42af44df09f0e59b63f257b9579fcf3e101d2a6202b68b'],
  [10_000, '0709ebe2ba2564eb32f453122c4ce111d574a20f25665a6257831e29191f0701'],
  [20_000, '016ad6058b2347dcc3f00257d9e00709d60cab9250aef690b4e36a94e5a55cbb'],
]);

test('ATS scoring scales through the supported resume size', { timeout: 30_000 }, () => {
  const metrics: string[] = [];

  for (const size of SIZES) {
    const resume = buildText(size, 2);
    const jobDescription = buildText(size, 1);
    const expected = JSON.stringify(calculateATSScore(resume, jobDescription));
    const expectedHash = createHash('sha256').update(expected).digest('hex');
    expect(expectedHash).toBe(EXPECTED_HASHES.get(size));
    let durationMs = 0;

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      const startedAt = performance.now();
      const result = calculateATSScore(resume, jobDescription);
      durationMs += performance.now() - startedAt;
      const serialized = JSON.stringify(result);
      expect(serialized).toBe(expected);
      expect(createHash('sha256').update(serialized).digest('hex')).toBe(expectedHash);
    }

    metrics.push(`size${size}=${(durationMs / ITERATIONS).toFixed(3)}ms/op`);
  }

  console.log(`[benchmark] ${metrics.join(' ')} (${ITERATIONS} iterations)`);
  console.log(`[resource] maximum_supported_resume_chars=${SIZES.at(-1)}`);
});

function buildText(targetCharacters: number, stride: number): string {
  const words: string[] = [];
  let length = 0;
  let index = 0;
  while (length < targetCharacters) {
    const word = VOCABULARY[(index * stride) % VOCABULARY.length];
    words.push(word);
    length += word.length + 1;
    index += 1;
  }
  return words.join(' ').slice(0, targetCharacters);
}
