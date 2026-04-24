// Copy non-JS assets (manifest, popup.html, icons) into dist/.
// Run after esbuild, before loading the unpacked extension.
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');

async function ensureDir(path) {
  if (!existsSync(path)) await mkdir(path, { recursive: true });
}

async function main() {
  await ensureDir(dist);
  await ensureDir(join(dist, 'icons'));

  await copyFile(join(root, 'manifest.json'), join(dist, 'manifest.json'));
  await copyFile(join(root, 'src', 'popup.html'), join(dist, 'popup.html'));

  const iconsDir = join(root, 'icons');
  if (existsSync(iconsDir)) {
    for (const file of await readdir(iconsDir)) {
      await copyFile(join(iconsDir, file), join(dist, 'icons', file));
    }
  }

  console.log('[extension] copied static assets to dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
