import { describe, expect, it } from 'vitest';
import {
  applyGeneratedSummary,
  assertRequiredResumeCoverage,
  prepareResumePolicy,
  validateGeneratedSummary,
} from '@/lib/resume-tailoring-policy';
import {
  assembleRankedProjects,
  assembleRankedResume,
  extractResumeBulletGroups,
} from '@/lib/resume-bullet-ranking';

const experience =
  '## Experience\n\n### Company | Engineer\n2022 — Present\n\n- Built Go services with 50,000 checks.\n- Shipped React interfaces.\n\n';
const projects =
  '## Selected Projects\n\n### [Runtime](https://example.com/runtime)\nSwift, MLX\n\n- Built bounded agent execution.\n  - Kept tool traces.\n- Served queries at 2.2 ms.\n\n### Tasks\nNext.js, Go\n\n- Shipped tasks and habits.\n\n';
const education =
  '## Education\n\n### Example College | B.Tech, Computer Science\n2018 — 2022\n\nAlgorithms, DBMS and Operating Systems.\n';
const original = `# Person\n\nperson@example.com | https://example.com\n\n${experience}${projects}${education}`;
const paragraph =
  'Software engineer building reliable Go services, React interfaces and user-facing products. Brings hands-on experience with bounded agent execution and tool traces.';

describe('minimum resume coverage and summary-only generation', () => {
  it('does not turn tested error states into unsupported recovery implementation', () => {
    const evidence = [
      {
        id: 'f1',
        context: 'Projects / Reader',
        text: 'Added optimistic UI updates and tested the empty and error states.',
      },
      {
        id: 'f2',
        context: 'Projects / Sync',
        text: 'Implemented error recovery with retry controls for failed saves.',
      },
    ];
    for (const claim of ['error recovery', 'failure-recovery', 'recovering from errors']) {
      expect(() =>
        validateGeneratedSummary(
          {
            text: `Frontend engineer building optimistic interfaces and implementing ${claim} for customer products.`,
            evidence_ids: ['f1'],
          },
          evidence
        )
      ).toThrow('unsupported');
    }
    const supported =
      'Frontend engineer building optimistic interfaces and implementing error recovery with retry controls for failed saves.';
    expect(
      validateGeneratedSummary({ text: supported, evidence_ids: ['f1', 'f2'] }, evidence)
    ).toBe(supported);
    const tested =
      'Frontend engineer building optimistic interfaces and testing their empty and error states for customer products.';
    expect(validateGeneratedSummary({ text: tested, evidence_ids: ['f1'] }, evidence)).toBe(tested);
  });

  it('rejects responsive-layout and browser-rendering claims inferred from different frontend work', () => {
    const evidence = [
      {
        id: 'f1',
        context: 'Experience',
        text: 'Built React screens, matched web and iOS presentation, and reduced server-side HTML generation latency.',
      },
    ];
    for (const text of [
      'Frontend engineer building React screens and responsive cross-platform layouts for customer products.',
      'Frontend engineer building React screens and optimizing browser rendering performance for customer products.',
    ])
      expect(() => validateGeneratedSummary({ text, evidence_ids: ['f1'] }, evidence)).toThrow(
        'unsupported'
      );
    expect(
      validateGeneratedSummary(
        {
          text: 'Frontend engineer building React screens and reducing server-side HTML generation latency for customer products.',
          evidence_ids: ['f1'],
        },
        evidence
      )
    ).toContain('server-side HTML generation');
  });

  it('allows frontend claims when the cited evidence actually states them', () => {
    const text =
      'Frontend engineer building responsive React layouts and improving browser rendering performance for customer products.';
    expect(
      validateGeneratedSummary({ text, evidence_ids: ['f1'] }, [
        {
          id: 'f1',
          context: 'Experience',
          text: 'Built responsive React layouts and improved browser rendering performance.',
        },
      ])
    ).toBe(text);
  });
  it('requires supplied project points and education, not just headings or fenced examples', () => {
    for (const input of [
      original.replace(projects, ''),
      original.replace(projects, '## Projects\n\n### Placeholder\n\n'),
      original.replace(projects, '## Projects\n```md\n- Fabricated example\n```\n'),
    ])
      expect(() => prepareResumePolicy(input)).toThrow(
        'Add at least one product or project achievement'
      );
    for (const input of [
      original.replace(education, ''),
      original.replace(education, '## Education\n\n'),
      original.replace(education, '## Education\n```md\nDegree\n```\n'),
    ])
      expect(() => prepareResumePolicy(input)).toThrow('Add your education');
  });

  it('accepts Products, one-point projects and non-degree education without inventing details', () => {
    const source =
      '# Person\n\n## Products\n### Tasks\n- Shipped a task manager.\n\n## Education\nCompleted a web development bootcamp.\n';
    expect(prepareResumePolicy(source).evidence.map((fact) => fact.text)).toEqual([
      'Shipped a task manager.',
      'Completed a web development bootcamp.',
    ]);
    const output = applyGeneratedSummary(source, paragraph);
    expect(() => assertRequiredResumeCoverage(source, output)).not.toThrow();
    expect(output).toContain('Completed a web development bootcamp.');
  });

  it('inserts a summary without changing contact identity, projects or education', () => {
    const output = applyGeneratedSummary(original, paragraph);
    expect(output).toBe(
      original.replace('## Experience', `## Summary\n\n${paragraph}\n\n## Experience`)
    );
    expect(() => assertRequiredResumeCoverage(original, output)).not.toThrow();
  });

  it('replaces only an existing or empty Summary/Profile body, preserving CRLF and adjacent sections', () => {
    for (const heading of ['Summary', 'Professional Summary', 'Profile', 'Career Objective']) {
      for (const old of ['Old summary.\n\n', '', '\n']) {
        const input = original
          .replace(experience, `## ${heading}\n${old}${experience}`)
          .replaceAll('\n', '\r\n');
        const output = applyGeneratedSummary(input, paragraph);
        expect(output).toContain(paragraph);
        expect(output).not.toContain('Old summary.');
        expect(output).toContain(experience.replaceAll('\n', '\r\n'));
        expect(output).toContain(projects.replaceAll('\n', '\r\n'));
        expect(output).toContain(education.replaceAll('\n', '\r\n'));
        expect(output.replaceAll('\r\n', '')).not.toContain('\n');
        expect(() => assertRequiredResumeCoverage(input, output)).not.toThrow();
      }
    }
  });

  it('rejects duplicate real summary sections but ignores headings inside fenced code', () => {
    expect(() =>
      prepareResumePolicy(`${original}\n## Summary\nOld.\n## Profile\nAnother.\n`)
    ).toThrow('Keep one');
    const input = original.replace(
      experience,
      `## Summary\n\n\`\`\`md\n## Profile\nExample only\n\`\`\`\n\n${experience}`
    );
    expect(() => prepareResumePolicy(input)).not.toThrow();
    expect(applyGeneratedSummary(input, paragraph)).not.toContain('Example only');
  });

  it('keeps every complete project and education through combined bullet/project/summary assembly', () => {
    const groups = extractResumeBulletGroups(original);
    const bullets = assembleRankedResume(
      original,
      groups,
      groups.map((group) => ({
        group_id: group.id,
        bullet_ids: group.bullets.map((bullet) => bullet.id).reverse(),
      }))
    );
    const ordered = assembleRankedProjects(bullets.tailored, [
      { group_id: 'p1', project_ids: ['p1i2', 'p1i1'] },
    ]);
    const output = applyGeneratedSummary(ordered.tailored, paragraph);
    expect(() => assertRequiredResumeCoverage(original, output)).not.toThrow();
    expect(output).toContain(education);
    expect(output.indexOf('### Tasks')).toBeLessThan(output.indexOf('### [Runtime]'));
    expect(output).toContain('- Built bounded agent execution.\n  - Kept tool traces.');
    expect(output).toContain('Swift, MLX');
    expect(output).toContain('https://example.com/runtime');
  });

  it('rejects point removal, education rewrites or missing generated summary', () => {
    const output = applyGeneratedSummary(original, paragraph);
    for (const bad of [
      output.replace('- Shipped tasks and habits.', ''),
      output.replace('B.Tech', 'Ph.D'),
      original,
    ])
      expect(() => assertRequiredResumeCoverage(original, bad)).toThrow();
  });

  it('requires valid evidence references and a concise plain-text paragraph', () => {
    const { evidence } = prepareResumePolicy(original);
    const ids = evidence
      .filter((fact) => /Built Go|Shipped React|bounded agent/.test(fact.text))
      .map((fact) => fact.id);
    expect(validateGeneratedSummary({ text: paragraph, evidence_ids: ids }, evidence)).toBe(
      paragraph
    );
    for (const refs of [[], ['foreign'], [ids[0], ids[0]]])
      expect(() =>
        validateGeneratedSummary({ text: paragraph, evidence_ids: refs }, evidence)
      ).toThrow('supplied resume evidence');
    for (const text of [
      '',
      'Engineer.',
      `${paragraph}\n## Education`,
      `${paragraph} <script>bad()</script>`,
      `${paragraph} https://bad.example`,
      `${paragraph} [Click](bad)`,
      `${paragraph} person@example.com`,
      'Experienced '.repeat(91),
    ])
      expect(() => validateGeneratedSummary({ text, evidence_ids: ids }, evidence)).toThrow(
        'plain-text'
      );
  });

  it('checks numbers against cited facts, including percentage units and unsupported experience years', () => {
    const evidence = [
      { id: 'f1', context: 'Experience', text: 'Built 50,000 checks, with 20% fewer failures.' },
      { id: 'f2', context: 'Projects', text: 'Served queries at 2.2 ms.' },
      {
        id: 'f3',
        context: 'Summary',
        text: 'Engineer with 4+ years of experience building services.',
      },
    ];
    expect(
      validateGeneratedSummary(
        {
          text: 'Engineer building reliable services with 50K checks and 20% fewer failures.',
          evidence_ids: ['f1'],
        },
        evidence
      )
    ).toContain('50K');
    for (const [text, ids] of [
      ['Engineer building reliable services with 99,000 checks and safe releases.', ['f1']],
      ['Engineer building reliable services with 20 checks and safe releases.', ['f1']],
      ['Engineer building reliable services with 20% fewer failures and safe releases.', ['f2']],
      ['Engineer with 2.2 years of experience building services and safe releases.', ['f2']],
      ['Engineer with ten years of experience building services and safe releases.', ['f2']],
      ['Engineer with a decade of experience building services and safe releases.', ['f2']],
      ['Engineer with 2.2-year experience building services and safe releases.', ['f2']],
    ] as const)
      expect(() => validateGeneratedSummary({ text, evidence_ids: [...ids] }, evidence)).toThrow(
        'unsupported'
      );
    expect(
      validateGeneratedSummary(
        {
          text: 'Engineer with 4+ years of experience building services and safe releases.',
          evidence_ids: ['f3'],
        },
        evidence
      )
    ).toContain('4+ years');
  });

  it('rejects observed unsupported collaboration and earlier ledger/leadership/qualification drift', () => {
    const evidence = [
      {
        id: 'f1',
        context: 'Experience',
        text: 'Built financial-planning services and React interfaces.',
      },
    ];
    for (const text of [
      'Engineer building financial-planning services and collaborating in cross-functional teams to deliver solutions.',
      'Engineer who led teams and built financial-planning services and React interfaces.',
      'Engineer building ledger and accounting systems with React interfaces and financial services.',
      'Certified engineer building financial-planning services and React interfaces for client products.',
    ])
      expect(() => validateGeneratedSummary({ text, evidence_ids: ['f1'] }, evidence)).toThrow(
        'unsupported'
      );
    const text =
      'Engineer who collaborated with teams to build financial-planning services and React interfaces.';
    expect(
      validateGeneratedSummary({ text, evidence_ids: ['f1'] }, [
        {
          ...evidence[0],
          text: 'Collaborated with teams to build financial-planning services and React interfaces.',
        },
      ])
    ).toBe(text);
  });
});
