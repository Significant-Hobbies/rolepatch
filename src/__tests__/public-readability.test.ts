import { describe, expect, it } from 'vitest';
import { PUBLIC_SURFACES } from '../../public-surfaces.mjs';
import { handleRolePatchAgentRoutes } from '../../rolepatch-agent-routes.mjs';
import { publicRobots, publicCrawlers } from '../../public-readability-policy.mjs';
import { publicSourceMarkdown } from '../lib/public-source';
import { absoluteMarkdownLinks } from '../lib/agent-surfaces/format.mjs';
import { blogPosts } from '../lib/blog-posts';

const origin = 'https://rolepatch.com';
const serve = (path: string, init?: RequestInit) =>
  handleRolePatchAgentRoutes(new Request(origin + path, init), publicSourceMarkdown);
describe('source-backed public readability', () => {
  it('preserves complete authored article bodies and anonymous source copy', () => {
    for (const post of blogPosts)
      expect(publicSourceMarkdown(`/blog/${post.slug}`)).toContain(
        absoluteMarkdownLinks(post.content, `${origin}/blog/${post.slug}`)
      );
    expect(publicSourceMarkdown('/pricing')).toContain('$30');
    expect(publicSourceMarkdown('/proof')).toContain('No proof evidence yet');
    expect(publicSourceMarkdown('/tools/bullet-check')).toContain('analyzed');
    expect(publicSourceMarkdown('/')).toContain('PDF · DOCX · Markdown');
    expect(publicSourceMarkdown('/')).toContain('One base resume. One specific role.');
  });
  it('never reads saved browser state or includes personal workspace routes', async () => {
    localStorage.setItem('resume-tailor-snippets', JSON.stringify([{ body: 'PRIVATE_CANARY' }]));
    for (const surface of PUBLIC_SURFACES)
      expect(publicSourceMarkdown(surface.path)).not.toContain('PRIVATE_CANARY');
    for (const path of ['/jobs', '/evidence', '/resume-builder', '/dashboard', '/login']) {
      expect(publicSourceMarkdown(path)).toBeNull();
      expect((await serve(`${path}.md`))?.status).toBe(404);
    }
  });
  it('implements canonical direct URLs, HEAD, CORS, token estimates and quality-aware negotiation', async () => {
    const direct = await serve('/api/md/tools/ats-check');
    const suffix = await serve('/tools/ats-check.md');
    expect(await direct?.text()).toBe(await suffix?.text());
    expect(direct?.headers.get('content-location')).toBe(`${origin}/tools/ats-check`);
    expect(direct?.headers.get('x-robots-tag')).toBe('noindex, follow');
    expect(direct?.headers.get('access-control-allow-origin')).toBe('*');
    expect(Number(direct?.headers.get('x-markdown-tokens'))).toBeGreaterThan(1);
    const head = await serve('/tools/ats-check.md', { method: 'HEAD' });
    expect(await head?.text()).toBe('');
    expect(head?.headers.get('x-markdown-tokens')).toBe(direct?.headers.get('x-markdown-tokens'));
    for (const accept of [
      '*/*',
      'text/markdown;q=0',
      'text/html,text/markdown',
      'text/html;q=1,text/markdown;q=0.5',
    ])
      expect(await serve('/tools', { headers: { accept } })).toBeNull();
    expect((await serve('/api/md/tools', { method: 'OPTIONS' }))?.status).toBe(204);
  });
  it('exports full public content with bounded coverage and explicit crawler policy', async () => {
    const full = await (await serve('/llms-full.txt'))?.text();
    expect(full).toContain(`Included ${PUBLIC_SURFACES.length} of ${PUBLIC_SURFACES.length}`);
    expect(full).toContain('No proof evidence yet');
    for (const crawler of publicCrawlers)
      expect(publicRobots()).toContain(`User-agent: ${crawler}\nAllow: /`);
    expect(publicRobots()).toContain('Disallow: /resume-builder');
  });
});
