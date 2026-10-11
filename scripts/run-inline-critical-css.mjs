#!/usr/bin/env node
import { runInlineCss } from './inline-critical-css.mjs';

if (process.argv.includes('--astro')) {
  const { runAstroInlineCss } = await import('../landing-astro/scripts/inline-critical-css.mjs');
  await runAstroInlineCss();
} else {
  await runInlineCss({ strict: process.argv.includes('--strict') });
}
