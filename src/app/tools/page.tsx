import { preload } from 'react-dom';
import {
  ResumeFinalReview,
  ResumeToolLink,
  resumeReviewTools,
} from '@/components/resume-tool-review';

export default function ToolsPage() {
  'use no memo';
  preload('/fonts/space-grotesk-public-700.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: '',
  });
  return (
    <main className="performance-page mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Free Resume Tools
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-[var(--muted-foreground)]">
          A practical first pass for one resume and one job. Check the text, review the wording and
          compare your changes. No sign-up required.
        </p>
      </header>
      <section aria-labelledby="review-path">
        <h2 id="review-path" className="font-serif text-2xl font-semibold text-foreground">
          Start with the check you need
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          If you are reviewing an application from scratch, follow these four steps in order. Use
          pasted text; these checks do not analyze the rendered file or predict an employer&apos;s
          decision.
        </p>
        <ol className="mt-6 border-b border-[var(--border)]">
          {resumeReviewTools.slice(0, 4).map((tool, index) => (
            <li key={tool.href}>
              <ResumeToolLink tool={tool} step={index + 1} />
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-12" aria-labelledby="supporting-tools">
        <h2 id="supporting-tools" className="font-serif text-2xl font-semibold text-foreground">
          For length and reusable bullets
        </h2>
        <div className="mt-6 border-b border-[var(--border)]">
          {resumeReviewTools.slice(4).map((tool) => (
            <ResumeToolLink key={tool.href} tool={tool} />
          ))}
        </div>
      </section>
      <ResumeFinalReview />
    </main>
  );
}
