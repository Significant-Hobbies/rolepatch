import { describe, expect, it } from 'vitest';
import { createClaimGrounding } from '@/lib/resume-claim-grounding';
import {
  applyGeneratedSummary,
  assertResumeIdentityPreserved,
  prepareResumePolicy,
  validateGeneratedSummary,
} from '@/lib/resume-tailoring-policy';

// Synthetic stand-in for the #11 reproduction: a personal-site URL in the contact
// block, an employer RAG role, a financial-planning project and a separate
// evaluation project. No private resume content.
const groundingResume = [
  '# Alex Example',
  '',
  'alex@example.com | https://alexexample.dev | https://github.com/alexexample',
  '',
  '## Experience',
  '',
  '### Front.Page | Software Engineer',
  'Jan 2023 — Present',
  '',
  '- Built a RAG pipeline over product documentation with hybrid retrieval.',
  '- Shipped React interfaces for search results.',
  '',
  '## Projects',
  '',
  '### Pace',
  'Next.js, Postgres',
  '',
  '- Built financial planning tools with transaction-import reconciliation.',
  '',
  '### EvalKit',
  'Python',
  '',
  '- Built an evaluation harness with feedback loops for agent runs.',
  '',
  '## Education',
  '',
  '### Example University | B.S. Computer Science',
  '2018 — 2022',
  '',
].join('\n');

const { evidence } = prepareResumePolicy(groundingResume);
const grounding = createClaimGrounding(evidence);
const allIds = evidence.map((fact) => fact.id);

describe('resume identity preservation (#11)', () => {
  const tailored = applyGeneratedSummary(
    groundingResume,
    'Engineer who built a RAG pipeline with hybrid retrieval and an evaluation harness for agent runs.'
  );

  it('accepts a summary-only change that keeps contacts, dates and headings', () => {
    expect(() => assertResumeIdentityPreserved(groundingResume, tailored)).not.toThrow();
  });

  it('rejects the rewritten personal-site URL regression', () => {
    const corrupted = tailored.replace('https://alexexample.dev', 'https://alexexample927');
    expect(() => assertResumeIdentityPreserved(groundingResume, corrupted)).toThrow(
      'name and contact block'
    );
  });

  it('rejects changed names, emails, employment dates, headings and links outside the header', () => {
    for (const corrupted of [
      tailored.replace('# Alex Example', '# Alex Q. Example'),
      tailored.replace('alex@example.com', 'alex@example.org'),
      tailored.replace('Jan 2023 — Present', 'Jan 2021 — Present'),
      tailored.replace('2018 — 2022', '2017 — 2022'),
      tailored.replace('### Front.Page | Software Engineer', '### Front.Page | Staff Engineer'),
      tailored.replace('## Education', 'Contact: https://evil.example\n\n## Education'),
    ])
      expect(() => assertResumeIdentityPreserved(groundingResume, corrupted)).toThrow(
        'Invalid response'
      );
  });
});

describe('summary claim grounding (#11)', () => {
  it('flags ledger/accounting vocabulary the source never states', () => {
    expect(
      grounding.unsupportedTerms(
        'Engineer with ledger-style backend experience and high-integrity accounting.'
      )
    ).toEqual(expect.arrayContaining(['ledger', 'integrity', 'accounting']));
    expect(
      grounding.unsupportedTerms(
        'Built financial planning tools with transaction-import reconciliation.'
      )
    ).toEqual([]);
  });

  it('keeps evidence attributed to its own employer or project', () => {
    expect(
      grounding.unsupportedTerms(
        'At Front.Page, built robust evaluation and feedback loops for RAG.'
      )
    ).toEqual(['evaluation', 'feedback', 'loops']);
    expect(
      grounding.unsupportedTerms('At EvalKit, built an evaluation harness with feedback loops.')
    ).toEqual([]);
    expect(
      grounding.unsupportedTerms('Built evaluation harnesses with feedback loops for agent runs.')
    ).toEqual([]);
  });

  it('accepts ordinary paraphrase of source wording', () => {
    expect(
      grounding.unsupportedTerms(
        'Software engineer shipping React interfaces and reconciling imported transactions for financial planning.'
      )
    ).toEqual([]);
  });

  it('repairs by dropping only unsupported sentences', () => {
    const good =
      'Engineer who built a RAG pipeline with hybrid retrieval for product documentation.';
    const bad = 'Brings high-integrity accounting and ledger-style backend ownership.';
    expect(grounding.repair(`${good} ${bad}`)).toEqual({ text: good, removed: [bad] });
  });

  it('never repairs structural injection; validation rejects it instead', () => {
    const injected = 'Engineer who built a RAG pipeline.\n## Education\nPh.D';
    expect(grounding.repair(injected)).toEqual({ text: injected, removed: [] });
    expect(() =>
      validateGeneratedSummary({ text: injected, evidence_ids: allIds.slice(0, 1) }, evidence)
    ).toThrow('Invalid response');
  });

  it('fails validation closed when ungrounded text reaches it unrepaired', () => {
    expect(() =>
      validateGeneratedSummary(
        {
          text: 'Engineer who built a RAG pipeline with hybrid retrieval. Delivered blockchain settlement systems.',
          evidence_ids: allIds.slice(0, 2),
        },
        evidence
      )
    ).toThrow('not found in the source resume');
  });
});
