// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Mirrors fleet/sarthakagrawal/astro.config.mjs, the reference 360 ms-LCP
// Astro setup. Pure static output (no SSR adapter) — the rolepatch.com
// landing is fully static markup. CSS is inlined into the HTML
// (`build.inlineStylesheets: 'always'`) so the LCP path is one round-
// trip: HTML → fonts → paint.
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
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    css: { transformer: 'lightningcss' },
    build: { cssMinify: 'lightningcss' },
  },
});
