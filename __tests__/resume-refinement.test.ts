import { describe, expect, it } from 'vitest';
import { assembleRefinement, prepareRefinement } from '@/lib/resume-refinement';
import { fitScoreForResume, normalizeRequirementMatches } from '@/lib/requirement-evidence';
import type { FitScore } from '@/lib/types';

const master =
  '# Alex\n\n## Experience\n### Studio\n- Built APIs.\n- Built React interfaces.\n\n## Projects\n### Reader\n- Built a reading queue.\n\n### Tasks\n- Built task management tools.\n\n## Education\nBSc, Example College.\n';
const current = master.replace(
  '## Experience',
  '## Summary\nSoftware engineer building APIs and React interfaces for users.\n\n## Experience'
);

describe('scoped resume refinement', () => {
  it.each([
    'Skills Profile',
    'Technical Profile',
    'Professional Profile & Experience',
    'Experience Summary',
    'Objective-C Projects',
  ])('retains original facts under the %s heading', (heading) => {
    const source = master.replace(
      '## Experience',
      `## ${heading}\nBuilt Swift interfaces.\n\n## Experience`
    );
    const evidence = prepareRefinement(source, current, { kind: 'summary' }).summary_evidence!;
    expect(evidence.some((fact) => fact.text.includes('Swift'))).toBe(true);
  });

  it.each([
    'Profile Summary',
    'Summary of Qualifications',
    'Personal Profile',
    'Profile Summary of Qualifications',
    'Summary:',
    'Professional Summary:',
    'SUMMARY –',
    'Summary (2024)',
    'Summary & Highlights',
    'Career Profile/Objective',
    'Summary of Skills',
    'Summary of Achievements',
  ])('excludes existing summary claims under the %s heading', (heading) => {
    const contaminated = master.replace(
      '## Experience',
      `## ${heading}\nCertified Kubernetes architect.\n\n## Experience`
    );
    const evidence = prepareRefinement(contaminated, current, { kind: 'summary' })
      .summary_evidence!;
    expect(evidence.some((fact) => fact.text.includes('Kubernetes'))).toBe(false);
  });

  it('moves only selected original bullets and rejects missing, duplicate or foreign IDs', () => {
    expect(
      assembleRefinement(
        master,
        current,
        { kind: 'bullets', groupId: 'g1' },
        { ordered_ids: ['g1b2', 'g1b1'] }
      ).tailored
    ).toBe(
      current.replace(
        '- Built APIs.\n- Built React interfaces.',
        '- Built React interfaces.\n- Built APIs.'
      )
    );
    for (const ids of [['g1b1'], ['g1b1', 'g1b1'], ['g1b1', 'foreign']])
      expect(() =>
        assembleRefinement(
          master,
          current,
          { kind: 'bullets', groupId: 'g1' },
          { ordered_ids: ids }
        )
      ).toThrow();
  });

  it('moves intact projects while preserving every other section', () => {
    const result = assembleRefinement(
      master,
      current,
      { kind: 'projects', groupId: 'p1' },
      { ordered_ids: ['p1i2', 'p1i1'] }
    );
    expect(result.tailored).toBe(
      current.replace(
        '### Reader\n- Built a reading queue.\n\n### Tasks\n- Built task management tools.',
        '### Tasks\n- Built task management tools.\n\n### Reader\n- Built a reading queue.'
      )
    );
  });

  it('refines only summary and does not let generated summary or instructions become facts', () => {
    const evidence = prepareRefinement(master, current, { kind: 'summary' }).summary_evidence!;
    const text =
      'Software engineer building React interfaces and APIs. Built a reading queue and task management tools.';
    const output = { summary: { text, evidence_ids: evidence.slice(0, 4).map((fact) => fact.id) } };
    expect(assembleRefinement(master, current, { kind: 'summary' }, output).tailored).toBe(
      current
        .replace('Software engineer building APIs and React interfaces for users.', text)
        .replace('## Summary\n', '## Summary\n\n')
    );
    const contaminated = master.replace(
      '## Experience',
      '## Summary\nCertified Kubernetes architect.\n\n## Experience'
    );
    expect(
      prepareRefinement(contaminated, current, { kind: 'summary' }).summary_evidence
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining('Kubernetes') }),
      ])
    );
    expect(() =>
      assembleRefinement(
        contaminated,
        current,
        { kind: 'summary' },
        {
          summary: {
            text: 'Certified Kubernetes architect building React interfaces and APIs for users.',
            evidence_ids: ['f2'],
          },
        }
      )
    ).toThrow();
  });
});

describe('requirement evidence', () => {
  const jd = 'Build React interfaces. Operate Kubernetes clusters. Lead a large team.';
  it('hides saved evidence for a different master while preserving legacy scores', () => {
    const score: FitScore = {
      id: 'fit',
      job_id: 'job',
      overall_score: 80,
      dimensions: [
        { name: 'Skills Match', score: 80, weight: 25, detail: '', requirement_source: master },
      ],
      strengths: [],
      gaps: [],
      recommendation: '',
      created_at: 1,
    };
    expect(fitScoreForResume(score, master)).toBe(score);
    expect(fitScoreForResume(score, master.replace('Built APIs.', 'Built databases.'))).toBeNull();
    const legacy = { ...score, dimensions: [] };
    expect(fitScoreForResume(legacy, current)).toBe(legacy);
  });
  it('keeps exact resume quotes and derives attribution from the source', () => {
    expect(
      normalizeRequirementMatches(
        [
          {
            requirement: 'Build React interfaces.',
            status: 'evidence_found',
            evidence: [{ excerpt: 'Built React interfaces.', context: 'Invented employer' }],
          },
          {
            requirement: 'Operate Kubernetes clusters.',
            status: 'evidence_found',
            evidence: [{ excerpt: 'Operate Kubernetes clusters.' }],
          },
        ],
        master,
        jd
      )
    ).toEqual([
      {
        requirement: 'Build React interfaces.',
        status: 'evidence_found',
        evidence: [{ context: 'Alex / Experience / Studio', excerpt: 'Built React interfaces.' }],
      },
      { requirement: 'Operate Kubernetes clusters.', status: 'not_evidenced', evidence: [] },
    ]);
  });
  it('rejects invented requirements, malformed output, unknown statuses and duplicate rows', () => {
    const match = {
      requirement: 'Build React interfaces.',
      status: 'partial',
      evidence: [{ excerpt: 'Built React interfaces.' }],
    };
    expect(
      normalizeRequirementMatches(
        [
          match,
          match,
          { ...match, status: 'qualified' },
          { ...match, requirement: 'Fabricated requirement' },
          null,
        ],
        master,
        jd
      )
    ).toHaveLength(1);
    expect(normalizeRequirementMatches({ matches: [match] }, master, jd)).toEqual([]);
    expect(
      normalizeRequirementMatches(
        [{ ...match, evidence: 'Built React interfaces.' }],
        master,
        jd
      )[0]
    ).toMatchObject({ status: 'not_evidenced', evidence: [] });
  });
});
