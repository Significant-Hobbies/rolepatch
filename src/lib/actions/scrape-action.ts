'use server';

import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

interface ScrapeResult {
  title: string;
  text: string;
  html: string;
  company: string;
  role: string;
}

export async function scrapeJobUrl(url: string): Promise<ScrapeResult> {
  // Primary: Jina Reader
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/markdown' },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const text = await res.text();
      const title = text.split('\n')[0]?.replace(/^#+\s*/, '') ?? '';
      return {
        title,
        text,
        html: '',
        company: extractCompany(url, title),
        role: title,
      };
    }
  } catch {
    // fallback below
  }

  // Fallback: linkedom + Readability
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,*/*',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const { document } = parseHTML(html);
  const reader = new Readability(document as unknown as Document);
  const article = reader.parse();

  if (!article) throw new Error('Failed to parse job page content');

  return {
    title: article.title ?? '',
    text: article.textContent ?? '',
    html: article.content ?? '',
    company: extractCompany(url, article.title ?? ''),
    role: article.title ?? '',
  };
}

function extractCompany(url: string, title: string): string {
  const greenhouse = url.match(/boards\.greenhouse\.io\/(\w+)/);
  if (greenhouse) return greenhouse[1];

  const lever = url.match(/jobs\.lever\.co\/([^/]+)/);
  if (lever) return lever[1];

  const match = title.match(/(?:at|@)\s+(.+?)(?:\s*[-|]|$)/i);
  return match?.[1]?.trim() ?? '';
}
