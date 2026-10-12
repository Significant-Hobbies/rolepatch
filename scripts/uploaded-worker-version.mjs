import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function uploadedWorkerVersionId(output) {
  const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
  const plain = String(output).replace(ansi, '');
  const matches = [
    ...plain.matchAll(
      /^\s*Worker Version ID:\s*([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\s*$/gim
    ),
  ];
  if (matches.length !== 1) throw new Error('Expected exactly one uploaded Worker Version ID.');
  return matches[0][1].toLowerCase();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const versionId = uploadedWorkerVersionId(process.env.WORKER_UPLOAD_OUTPUT ?? '');
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required.');
  appendFileSync(process.env.GITHUB_OUTPUT, `version-id=${versionId}\n`);
}
