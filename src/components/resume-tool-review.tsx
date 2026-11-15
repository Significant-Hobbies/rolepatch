import {
  ArrowRight,
  CheckSquare,
  GitCompare,
  Hash,
  ListChecks,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export const resumeReviewTools = [
  {
    href: '/tools/ats-check',
    icon: CheckSquare,
    title: 'ATS Resume Structure Checker',
    input: 'Your resume as plain text or Markdown',
    desc: 'Review seven text signals, including sections, contact details, dates and table-like rows. This cannot inspect the layout of a PDF or DOCX.',
  },
  {
    href: '/tools/keywords',
    icon: Search,
    title: 'ATS Keyword Checker',
    input: 'Your resume text and one job description',
    desc: 'See matched and missing literal terms. Check synonyms and partial-word matches yourself, and add a term only when your experience supports it.',
  },
  {
    href: '/tools/bullet-check',
    icon: ListChecks,
    title: 'Bullet Strength Checker',
    input: 'One accomplishment bullet',
    desc: 'Review verb strength, length, tense and quantified outcomes. Use the feedback to make real work clearer; the score does not verify an achievement.',
  },
  {
    href: '/tools/diff',
    icon: GitCompare,
    title: 'Resume Diff Tool',
    input: 'Your original and revised resume text',
    desc: 'Compare the versions word by word. Check every added claim, changed number and removed detail before using the revised resume.',
  },
  {
    href: '/tools/word-count',
    icon: Hash,
    title: 'Resume Word Count',
    input: 'A resume or section as text',
    desc: 'Count words, characters, sentences and bullets while editing. The count does not establish an ideal length for your role or experience.',
  },
  {
    href: '/tools/snippets',
    icon: Sparkles,
    title: 'Bullet Snippet Library',
    input: 'Reusable bullets and their titles',
    desc: 'Keep useful wording in this browser and copy it into a draft. Snippets do not sync between browsers; clearing site data removes them.',
  },
];

export function ResumeToolLink({
  tool,
  step,
}: {
  tool: (typeof resumeReviewTools)[number];
  step?: number;
}) {
  'use no memo';
  return (
    <Link
      href={tool.href}
      prefetch={false}
      className="group grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-[var(--border)] py-6 text-foreground transition-colors hover:bg-[var(--card)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--foreground)] sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-x-6"
    >
      <span className="pt-0.5 font-mono text-sm text-[var(--muted-foreground)]">
        {step ? String(step).padStart(2, '0') : <tool.icon className="h-5 w-5" />}
      </span>
      <div>
        <h3 className="font-serif text-lg font-semibold tracking-tight">{tool.title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          {tool.desc}
        </p>
        <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
          <span className="font-medium text-foreground">Bring:</span> {tool.input}
        </p>
      </div>
      <span className="col-start-2 inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium group-hover:underline sm:col-start-auto">
        Open tool <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function ResumeFinalReview() {
  'use no memo';
  return (
    <section className="mt-14 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
      <h2 className="font-serif text-xl font-semibold text-foreground">Before you send it</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
        <li>
          Open the final PDF or DOCX and inspect its spacing, page breaks and contact details.
        </li>
        <li>
          Copy its text into a plain text editor and check the reading order. These tools cannot
          reproduce an employer&apos;s parser or ranking rules.
        </li>
        <li>
          Check the job requirements against your actual experience. Keep every skill, achievement
          and number supported by facts, even when a suggested edit raises a score.
        </li>
      </ul>
      <p className="mt-6 text-sm leading-6 text-[var(--muted-foreground)]">
        Want to keep a master resume and prepare a role-specific draft?
      </p>
      <Link
        href="/resume-builder"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-foreground hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--foreground)]"
      >
        Open resume workspace <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
