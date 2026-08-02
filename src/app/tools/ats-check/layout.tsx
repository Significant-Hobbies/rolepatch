import type { Metadata } from 'next';

import { ToolSeo } from '@/components/tool-seo';

export const metadata: Metadata = {
  title: 'Free ATS Resume Checker — Private, No Sign-Up | RolePatch',
  description:
    'Check seven resume structure and formatting signals for free in your browser. See every warning and limitation with no sign-up, upload, or network request.',
  alternates: { canonical: 'https://rolepatch.com/tools/ats-check' },
};

const faqs = [
  {
    question: 'Is this ATS checker really free with no sign-up?',
    answer:
      'Yes. Paste your resume text and the scan runs instantly in your browser. There is no account, no upload, and no network call — your text never leaves the page.',
  },
  {
    question: 'What does the ATS check score actually measure?',
    answer:
      'It runs seven local heuristics: word count (flags under 200 or over 1300 words), presence of the Experience / Education / Skills / Projects sections, contact info (email plus a phone or LinkedIn URL), bullet-line density, numeric quantification, pipe-delimited table rows that ATS parsers flatten, and date coverage. You start at 100 and lose 5 points per warning and 15 per failure.',
  },
  {
    question: 'Does it check ATS keyword match against a job description?',
    answer:
      'No — that is the separate Keyword Checker tool. This page only checks whether your resume is structured and parseable. Use the Keyword Checker to compare your resume against a specific job description.',
  },
  {
    question: 'What resume format should I paste in?',
    answer:
      'Markdown or plain text works best. The section-header check looks for the words "experience", "education", "skills", and "projects", and the bullet check counts lines starting with -, *, or •. Paste the text version of your resume, not a PDF or image.',
  },
  {
    question: 'Why does it warn about pipe-delimited rows?',
    answer:
      'Lines containing three or more pipe-separated columns look like a table to a human, but many ATS parsers flatten or misparse them. The checker flags three or more such rows so you can convert them to plain bullets.',
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToolSeo
        howItWorks={
          <>
            <p>
              Paste plain text or Markdown and the checker runs seven local heuristics: length,
              standard sections, contact details, bullet density, quantified outcomes, table-like
              rows, and date coverage. It does not upload a PDF or DOCX and cannot inspect the
              rendered document.
            </p>
            <p>
              The score starts at 100 and subtracts 5 points for every warning and 15 points for
              every failure, clamped to 0&ndash;100. Every deduction remains visible. There is no
              universal ideal resume length, heading set, bullet density, or ATS threshold, so read
              the findings instead of treating the score as an employer prediction.
            </p>
            <h3 className="font-serif text-lg font-semibold text-foreground pt-3">
              Parseability check or job match?
            </h3>
            <p>
              This checker reviews one resume's structure. The{' '}
              <a
                href="/tools/keywords"
                className="text-[var(--accent)] underline underline-offset-2"
              >
                ATS Keyword Checker
              </a>{' '}
              answers a different question by comparing a resume with one job description and
              reporting matched and missing terms.
            </p>
            <h3 className="font-serif text-lg font-semibold text-foreground pt-3">
              How to use the result
            </h3>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Paste plain text or Markdown from your resume.</li>
              <li>Read every finding, not only the score.</li>
              <li>Fix genuine structure problems without inventing achievements or metrics.</li>
              <li>Run the Keyword Checker against the actual job description.</li>
              <li>Review the final document visually and as extracted text before applying.</li>
            </ol>
            <h3 className="font-serif text-lg font-semibold text-foreground pt-3">
              What this checker does not do
            </h3>
            <p>
              It does not reproduce a proprietary employer ATS, guarantee an interview, know an
              employer's ranking rules, judge whether a claim is true, or determine whether the
              rendered document looks good. Treat it as an inspectable first pass.
            </p>
          </>
        }
        faqs={faqs}
      />
    </>
  );
}
