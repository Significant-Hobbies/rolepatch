import { createElement } from 'react';
import home from '../../landing-astro/src/content/home.json';
import { PRODUCT_FAQS } from '../../landing-astro/src/lib/product';
import { PublicFaq } from '@/components/public-faq';
import { PublicDocs } from '@/components/public-docs';
import { PublicChangelog } from '@/components/public-changelog';
import { reactSourceMarkdown } from './react-source-markdown';

type Action = { label: string; href: string };
const action = (value?: Action) => (value ? `[${value.label}](${value.href})` : '');
function homeMarkdown() {
  const hero = home.hero;
  const lines = [
    `# ${hero.title}`,
    hero.eyebrow,
    hero.lede,
    action(hero.primary),
    action(hero.secondary),
    hero.note,
    `![${hero.window.alt}](/images/${hero.window.src})`,
    hero.caption,
  ];
  for (const section of home.sections) {
    if ('header' in section && section.header)
      lines.push(section.header.eyebrow, `## ${section.header.title}`, section.header.lede);
    for (const block of section.blocks) {
      if (block.type === 'cta' && 'primary' in block) {
        lines.push(
          `## ${block.title}`,
          'lede' in block ? (block.lede ?? '') : '',
          action(block.primary),
          block.note ?? ''
        );
      } else if (block.type === 'statement' && 'points' in block) {
        lines.push(block.eyebrow ?? '', `## ${block.title}`, block.lede ?? '');
        for (const point of block.points ?? []) lines.push(`### ${point.title}`, point.body);
      } else if (block.type === 'steps' && 'items' in block) {
        for (const [index, step] of (block.items ?? []).entries())
          lines.push(
            `### ${index + 1}. ${step.title}`,
            step.body,
            'code' in step && step.code ? `\`\`\`text\n${step.code}\n\`\`\`` : ''
          );
      } else if (block.type === 'faq' && 'title' in block) {
        lines.push(`## ${block.title}`);
        for (const faq of PRODUCT_FAQS.slice(0, 4)) lines.push(`### ${faq.q}`, faq.a);
      } else throw new Error(`Unmapped public Workbench block: ${block.type}`);
    }
  }
  return lines.filter(Boolean).join('\n\n');
}

export function publicEditorialMarkdown(path: string): string | null {
  if (path === '/') return homeMarkdown();
  const component = (
    { '/faq': PublicFaq, '/docs': PublicDocs, '/changelog': PublicChangelog } as Record<
      string,
      () => React.ReactNode
    >
  )[path];
  return component
    ? reactSourceMarkdown(createElement(component), {
        origin: 'https://rolepatch.com',
        components: [component],
      })
    : null;
}
