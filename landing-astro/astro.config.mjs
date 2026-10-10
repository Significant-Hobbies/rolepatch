// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { readFile, writeFile } from 'node:fs/promises';

// Mirrors fleet/sarthakagrawal/astro.config.mjs, the reference 360 ms-LCP
// Astro setup. Pure static output (no SSR adapter) — the rolepatch.com
// landing is fully static markup. Inline styles to avoid a render-blocking
// request after the document; the overlay copies /_astro assets alongside it.
//
// Tailwind v4 via the official Vite plugin (fleet web stack standard,
// VoidZero ecosystem). Lightning CSS replaces the default PostCSS
// pipeline as both transformer and minifier. See ../../AGENTS.md →
// "Fleet web stack standard".
export default defineConfig({
  site: 'https://rolepatch.com',
  output: 'static',
  trailingSlash: 'never',
  // Emit `about.html` rather than `about/index.html` — no 308 redirect
  // on every link. Same as sarthakagrawal.pages.dev.
  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },
  integrations: [sitemap(), react(), {
    name: 'responsive-hero',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        // The shared Workbench template has no srcset passthrough. Add only
        // delivery attributes to its static hero; keep its markup and styling.
        const page = new URL('index.html', dir);
        const html = await readFile(page, 'utf8');
        const hero = /<img\b[^>]*\bsrc="\/images\/patch-stage\.webp"[^>]*>/g;
        if ([...html.matchAll(hero)].length !== 1) {
          throw new Error('Expected exactly one Workbench hero image');
        }
        await writeFile(page, html.replace(hero, (tag) => tag.replace(
          'src="/images/patch-stage.webp"',
          'src="/images/patch-stage.webp" srcset="/images/patch-stage-400.webp 400w, /images/patch-stage-700.webp 700w, /images/patch-stage-1000.webp 1000w, /images/patch-stage.webp 1400w" sizes="(max-width: 639px) calc(100vw - clamp(32px, 16px + 5vw, 80px) - 34px), (max-width: 1023px) calc(100vw - clamp(32px, 16px + 5vw, 80px) - 82px), calc(min(100vw, 1216px) - clamp(32px, 16px + 5vw, 80px) - 114px)"',
        )));
      },
    },
  }],
  vite: {
    plugins: [tailwindcss()],
    css: { transformer: 'lightningcss' },
    build: { cssMinify: 'lightningcss' },
  },
});
