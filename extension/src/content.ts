import type { ExtensionMessage, ScrapedJob } from './types';

// Content script: extracts JD text from the active page. Uses site-specific
// selectors where we have them, falls back to body.innerText otherwise.

function textFromSelector(selector: string): string | null {
  const node = document.querySelector(selector);
  if (!node) return null;
  const text = (node as HTMLElement).innerText?.trim();
  return text && text.length > 0 ? text : null;
}

function scrapeGreenhouse(): Partial<ScrapedJob> | null {
  if (!/greenhouse\.io/.test(location.hostname)) return null;
  const title = textFromSelector('h1.app-title') ?? textFromSelector('h1');
  const company = textFromSelector('.company-name') ?? textFromSelector('span.company-name');
  const description =
    textFromSelector('#content') ??
    textFromSelector('.content') ??
    textFromSelector('[class*="job__description"]');
  if (!description) return null;
  return { title: title ?? document.title, company: company ?? undefined, description, source: 'greenhouse' };
}

function scrapeLever(): Partial<ScrapedJob> | null {
  if (!/lever\.co/.test(location.hostname)) return null;
  const title = textFromSelector('.posting-headline h2') ?? textFromSelector('h2');
  const company = textFromSelector('.main-header-logo img')
    ? (document.querySelector('.main-header-logo img') as HTMLImageElement | null)?.alt ?? undefined
    : undefined;
  const description =
    textFromSelector('.posting-page .section-wrapper') ??
    textFromSelector('[data-qa="job-description"]') ??
    textFromSelector('.content');
  if (!description) return null;
  return { title: title ?? document.title, company, description, source: 'lever' };
}

function scrapeLinkedIn(): Partial<ScrapedJob> | null {
  if (!/linkedin\.com/.test(location.hostname)) return null;
  const title =
    textFromSelector('.top-card-layout__title') ??
    textFromSelector('.job-details-jobs-unified-top-card__job-title') ??
    textFromSelector('h1');
  const company =
    textFromSelector('.topcard__org-name-link') ??
    textFromSelector('.job-details-jobs-unified-top-card__company-name');
  const description =
    textFromSelector('.description__text') ??
    textFromSelector('#job-details') ??
    textFromSelector('.jobs-description__content');
  if (!description) return null;
  return { title: title ?? document.title, company: company ?? undefined, description, source: 'linkedin' };
}

function scrapeWorkday(): Partial<ScrapedJob> | null {
  if (!/workday\.com|myworkdayjobs\.com/.test(location.hostname)) return null;
  const title = textFromSelector('[data-automation-id="jobPostingHeader"]') ?? textFromSelector('h2');
  const description =
    textFromSelector('[data-automation-id="jobPostingDescription"]') ??
    textFromSelector('[data-automation-id="job-posting-details"]');
  if (!description) return null;
  return { title: title ?? document.title, description, source: 'workday' };
}

function scrapeGeneric(): Partial<ScrapedJob> {
  // Last resort: grab main/article, then body. Trim excessive whitespace.
  const candidate =
    textFromSelector('main') ??
    textFromSelector('article') ??
    document.body.innerText;
  const description = candidate.replace(/\n{3,}/g, '\n\n').trim();
  return { title: document.title, description, source: 'generic' };
}

function scrape(): ScrapedJob {
  const partial =
    scrapeGreenhouse() ??
    scrapeLever() ??
    scrapeLinkedIn() ??
    scrapeWorkday() ??
    scrapeGeneric();
  return {
    url: location.href,
    title: partial.title ?? document.title,
    company: partial.company,
    description: partial.description ?? '',
    source: partial.source ?? 'generic',
  };
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'SCRAPE_JOB') {
      try {
        sendResponse({ ok: true, job: scrape() });
      } catch (err) {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
      return true;
    }
    return undefined;
  },
);
