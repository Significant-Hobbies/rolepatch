import type { Metadata } from 'next';

import { ToolSeo } from '@/components/tool-seo';

export const metadata: Metadata = {
  title: 'Free ATS Keyword Checker — Resume vs Job Description Match',
  description:
    'Compare your resume with a job description in a free ATS keyword checker. See your keyword coverage, matched terms, and missing keywords without signing up.',
  alternates: { canonical: 'https://rolepatch.com/tools/keywords' },
};

const faqs = [
  {
    question: 'How is keyword coverage calculated?',
    answer:
      'The tool extracts single words and two-word phrases from the job description after removing stop words and filler. Coverage is the number of matched terms divided by all extracted terms, rounded to a percentage. Matching uses literal substrings, so synonyms may be missed and partial words may match. This is not an employer ATS score.',
  },
  {
    question: 'Does the keyword checker send my resume anywhere?',
    answer:
      'No. The comparison runs entirely in your browser. Both textareas are processed locally with JavaScript — there is no upload, no account, and no server call.',
  },
  {
    question: 'Does repeating a keyword make it worth more?',
    answer:
      'No. Each distinct extracted term counts once in this checker. Repetition in a job description is not proof of an employer’s scoring rules.',
  },
  {
    question: 'What counts as a keyword versus a filler word?',
    answer:
      'The extractor removes common English stop words (the, and, of, with…) and resume filler words (experience, skills, responsibilities, required, preferred…). It also ignores tokens shorter than three characters. What remains — skills, tools, technologies, domain terms — are treated as keywords.',
  },
  {
    question: 'How do I improve my match score?',
    answer:
      'The "Missing keywords" list shows exactly which JD terms are not in your resume. Add the ones you genuinely have using the same phrasing as the job description. RolePatch can suggest edits and show a word-level diff. Review every change and retain only statements supported by your experience.',
  },
];

export default function KeywordsToolLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToolSeo
        howItWorks={
          <>
            <p>
              Paste your resume in one box and the job description in the other, hit Analyze, and
              the tool computes matched-keyword coverage entirely in your browser. It tokenizes the
              job description, removes English stop words and generic resume filler (words like
              &ldquo;experience&rdquo;, &ldquo;team&rdquo;, &ldquo;required&rdquo;), and extracts
              single-word terms plus two-word bigrams.
            </p>
            <p>
              Each distinct extracted term counts once. The percentage is the matched count divided
              by the total count. Matching is literal and includes substrings, so review the lists
              for partial-word matches and missing synonyms. More matches do not establish
              qualifications or predict an employer’s decision.
            </p>
            <p>
              This checker shares keyword extraction with the tailor flow, but displays an
              unweighted coverage percentage. Here you bring both texts yourself; in the app you
              paste a job URL, RolePatch scrapes the JD, rewrites your resume to close the keyword
              gaps, and shows you a{' '}
              <a href="/tools/diff" className="text-[var(--accent)] underline underline-offset-2">
                word-level diff
              </a>{' '}
              before you accept.
            </p>
          </>
        }
        faqs={faqs}
      />
    </>
  );
}
