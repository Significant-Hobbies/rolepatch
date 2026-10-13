// A repeat deployment produced two versions with the same SHA tag. Resolve the
// UUID from this upload's actual Wrangler output, never from a shared tag.
import { describe, expect, it } from 'vitest';
import { uploadedWorkerVersionId } from '../scripts/uploaded-worker-version.mjs';

const version = '11111111-2222-4333-8444-555555555555';

describe('uploaded Worker identity', () => {
  it('selects the uploaded version despite other IDs and a reused SHA tag', () => {
    const output = `Bucket ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\nUploaded resume-tailor (6.17 sec)\nWorker Version ID: ${version}\nTag: ${'a'.repeat(40)}\n`;
    expect(uploadedWorkerVersionId(output)).toBe(version);
  });

  it('accepts Wrangler ANSI formatting without changing the UUID', () => {
    expect(uploadedWorkerVersionId(`\u001b[32mWorker Version ID: ${version}\u001b[0m`)).toBe(
      version
    );
  });

  it.each([
    '',
    `Version ID: ${version}`,
    'Worker Version ID: not-a-version',
    `Worker Version ID: ${version} trailing-command`,
    `Worker Version ID: ${version}\nWorker Version ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`,
  ])('refuses missing or ambiguous upload identity (%s)', (output) => {
    expect(() => uploadedWorkerVersionId(output)).toThrow();
  });
});
