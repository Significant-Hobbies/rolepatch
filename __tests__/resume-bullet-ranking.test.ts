import { describe, expect, it } from 'vitest';
import {
  assembleRankedProjects,
  assembleRankedResume,
  extractResumeBulletGroups,
  extractResumeProjectGroups,
} from '@/lib/resume-bullet-ranking';

const source = `# Alex Morgan

Remote | alex@example.com | https://example.com

## Experience
### Example Finance | Software Engineer
Mar 2024 - Present

- Built Go planning services with 40,000 validation checks.
- Reconciled 712 of 715 ledger entries.

### Example Media | Software Engineer
Jun 2020 - Feb 2024

- Built retrieval assistants for support.
- Increased feed engagement by 35%.

## Projects
### Runtime
- Built bounded agent execution.
  Kept execution traces.
  - Added per-tool timeouts.

- Trained a compact specialist model.

## Skills
- Go, TypeScript
- React, Rust

## Education
Aug 2016 - Jun 2020
`;

describe('fixed-wording resume ranking', () => {
  it('ranks complete original bullets within each role, preserving contacts, dates, skills and chronology', () => {
    const groups = extractResumeBulletGroups(source);
    expect(groups).toHaveLength(3);
    const rankings = groups.map((group) => ({
      group_id: group.id,
      bullet_ids: group.bullets.map((bullet) => bullet.id).reverse(),
    }));
    const result = assembleRankedResume(source, groups, rankings);
    expect(result.tailored).toBe(
      source
        .replace(
          '- Built Go planning services with 40,000 validation checks.\n- Reconciled 712 of 715 ledger entries.',
          '- Reconciled 712 of 715 ledger entries.\n- Built Go planning services with 40,000 validation checks.'
        )
        .replace(
          '- Built retrieval assistants for support.\n- Increased feed engagement by 35%.',
          '- Increased feed engagement by 35%.\n- Built retrieval assistants for support.'
        )
        .replace(
          '- Built bounded agent execution.\n  Kept execution traces.\n  - Added per-tool timeouts.\n\n- Trained a compact specialist model.',
          '- Trained a compact specialist model.\n\n- Built bounded agent execution.\n  Kept execution traces.\n  - Added per-tool timeouts.'
        )
    );
    expect(result.changes).toHaveLength(6);
    expect(result.changes.every((change) => result.tailored.includes(change.snippet))).toBe(true);
  });

  it('returns exact original bytes and no manufactured edits for an unchanged ranking', () => {
    const groups = extractResumeBulletGroups(source);
    const result = assembleRankedResume(
      source,
      groups,
      groups.map((group) => ({
        group_id: group.id,
        bullet_ids: group.bullets.map((bullet) => bullet.id),
      }))
    );
    expect(result).toEqual({ tailored: source, changes: [] });
  });

  it('rejects cross-employer moves, unknown IDs, duplicates, omissions and missing or repeated groups', () => {
    const groups = extractResumeBulletGroups(source);
    const valid = groups.map((group) => ({
      group_id: group.id,
      bullet_ids: group.bullets.map((bullet) => bullet.id),
    }));
    for (const ids of [['g2b1', 'g1b2'], ['invented', 'g1b2'], ['g1b1', 'g1b1'], ['g1b1']])
      expect(() =>
        assembleRankedResume(source, groups, [{ ...valid[0], bullet_ids: ids }, ...valid.slice(1)])
      ).toThrow('Invalid response');
    expect(() => assembleRankedResume(source, groups, valid.slice(1))).toThrow('Invalid response');
    expect(() => assembleRankedResume(source, groups, [valid[0], valid[0], valid[2]])).toThrow(
      'Invalid response'
    );
  });

  it('keeps CRLF source and identical bullets intact while ranking', () => {
    const original = '# Person\r\n\r\n## Experience\r\n- Repeated\r\n- Different\r\n- Repeated\r\n';
    const groups = extractResumeBulletGroups(original);
    expect(groups).toHaveLength(1);
    expect(
      assembleRankedResume(original, groups, [
        { group_id: 'g1', bullet_ids: ['g1b2', 'g1b3', 'g1b1'] },
      ]).tailored
    ).toBe('# Person\r\n\r\n## Experience\r\n- Different\r\n- Repeated\r\n- Repeated\r\n');
  });

  it('does not rank contact lists, fenced examples, ordered steps, skills or education', () => {
    const original =
      '# Person\n- Email\n- Website\n\n## Experience\n```md\n- Example\n- Another\n```\n\n1. First step\n2. Second step\n\n## Skills\n- Go\n- React\n\n## Education\n- School\n- Dates\n';
    expect(extractResumeBulletGroups(original)).toEqual([]);
  });
});

describe('complete project ranking', () => {
  const a =
    '### [Runtime](https://example.com/runtime)\nSwift, MLX\n\n- Agent loop.\n  - Bounded tools.\n- Trace capture.';
  const b = '### Web app\nNext.js, Go\n\nShipped product.\n\n- Tasks and habits.';
  const prefix =
    '# Person\n\n## Experience\n### Company\n2022–Present\n- API ownership.\n\n## Selected Projects\nKeep this introduction.\n\n';
  const suffix = '\n\n## Skills\nGo, Swift\n';
  const original = `${prefix}${a}\n\n${b}${suffix}`;

  it('moves titles, links, technologies, nested content and single-bullet projects together', () => {
    const groups = extractResumeProjectGroups(original);
    expect(groups).toHaveLength(1);
    expect(groups[0].projects.map((project) => project.text)).toEqual([a, b]);
    const result = assembleRankedProjects(original, [
      { group_id: 'p1', project_ids: ['p1i2', 'p1i1'] },
    ]);
    expect(result.tailored).toBe(`${prefix}${b}\n\n${a}${suffix}`);
    expect(result.changes).toHaveLength(2);
    expect(result.changes.every((change) => result.tailored.includes(change.snippet))).toBe(true);
  });

  it('preserves exact unchanged bytes, including CRLF and EOF without a newline', () => {
    for (const input of [original, original.replaceAll('\n', '\r\n'), `${prefix}${a}\n\n${b}`]) {
      expect(
        assembleRankedProjects(input, [{ group_id: 'p1', project_ids: ['p1i1', 'p1i2'] }])
      ).toEqual({ tailored: input, changes: [] });
    }
    const crlf = `${prefix}${a}\n\n${b}`.replaceAll('\n', '\r\n');
    expect(
      assembleRankedProjects(crlf, [{ group_id: 'p1', project_ids: ['p1i2', 'p1i1'] }]).tailored
    ).toBe(`${prefix}${b}\n\n${a}`.replaceAll('\n', '\r\n'));
  });

  it('re-extracts offsets after bullet moves without transferring evidence to another project', () => {
    const bullets = extractResumeBulletGroups(original);
    const ranked = assembleRankedResume(original, bullets, [
      { group_id: 'g1', bullet_ids: ['g1b2', 'g1b1'] },
    ]);
    const aRanked =
      '### [Runtime](https://example.com/runtime)\nSwift, MLX\n\n- Trace capture.\n- Agent loop.\n  - Bounded tools.';
    expect(
      assembleRankedProjects(ranked.tailored, [{ group_id: 'p1', project_ids: ['p1i2', 'p1i1'] }])
        .tailored
    ).toBe(`${prefix}${b}\n\n${aRanked}${suffix}`);
  });

  it('rejects foreign, duplicate, missing and cross-section IDs', () => {
    const second = `${original}\n## Other Projects\n${a}\n\n${b}\n`;
    const valid = [
      { group_id: 'p1', project_ids: ['p1i1', 'p1i2'] },
      { group_id: 'p2', project_ids: ['p2i1', 'p2i2'] },
    ];
    for (const ids of [['foreign', 'p1i2'], ['p1i1', 'p1i1'], ['p1i1'], ['p2i1', 'p1i2']])
      expect(() =>
        assembleRankedProjects(second, [{ ...valid[0], project_ids: ids }, valid[1]])
      ).toThrow('Invalid response');
    for (const ranks of [[], valid.slice(1), [valid[0], valid[0]]])
      expect(() => assembleRankedProjects(second, ranks)).toThrow('Invalid response');
  });

  it('keeps unsupported formatting, singleton projects and non-project sections unchanged', () => {
    for (const input of [
      source,
      '## Projects\n**First**\n- One\n\n**Second**\n- Two\n',
      '## Experience\n### One\n- API\n### Two\n- UI\n',
      '## Projects\n```md\n### Example\n### Another\n```\n',
    ]) {
      expect(extractResumeProjectGroups(input)).toEqual([]);
      expect(assembleRankedProjects(input, [])).toEqual({ tailored: input, changes: [] });
    }
  });
});
