import { z } from 'zod';
import {
  assembleRankedProjects,
  assembleRankedResume,
  extractResumeBulletGroups,
  extractResumeProjectGroups,
} from '@/lib/resume-bullet-ranking';
import {
  applyGeneratedSummary,
  assertRequiredResumeCoverage,
  prepareResumePolicy,
  validateGeneratedSummary,
} from '@/lib/resume-tailoring-policy';
import type { TailorChange } from '@/lib/types';

export const refinementTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('summary') }),
  z.object({ kind: z.literal('bullets'), groupId: z.string().min(1).max(40) }),
  z.object({ kind: z.literal('projects'), groupId: z.string().min(1).max(40) }),
]);
export type RefinementTarget = z.infer<typeof refinementTargetSchema>;
export type ResumeDraft = { source: string; changes: TailorChange[] };

const FACT_SECTION_WORDS = new Set(
  'skill skills technical technology technologies experience employment work history project projects product products achievement achievements accomplishment accomplishments education academic'.split(
    ' '
  )
);

function isSummarySection(context: string): boolean {
  const heading = context.split(' / ')[0].normalize('NFKC').toLowerCase();
  const words = heading.match(/[\p{L}]+(?:-[\p{L}]+)*/gu) ?? [];
  const summaryIndex = words.indexOf('summary');
  const factIndex = words.findIndex((word) => FACT_SECTION_WORDS.has(word));
  return (
    words.some((word) => ['summary', 'profile', 'objective'].includes(word)) &&
    (factIndex < 0 || (summaryIndex >= 0 && summaryIndex < factIndex))
  );
}

export function listRefinementTargets(source: string) {
  return [
    { value: 'summary', label: 'Summary', target: { kind: 'summary' } as RefinementTarget },
    ...extractResumeBulletGroups(source).map((group) => ({
      value: `bullets:${group.id}`,
      label: `Bullet order · ${group.context}`,
      target: { kind: 'bullets', groupId: group.id } as RefinementTarget,
    })),
    ...extractResumeProjectGroups(source).map((group) => ({
      value: `projects:${group.id}`,
      label: `Project order · ${group.context}`,
      target: { kind: 'projects', groupId: group.id } as RefinementTarget,
    })),
  ];
}

export function prepareRefinement(master: string, source: string, target: RefinementTarget) {
  prepareResumePolicy(source);
  if (target.kind === 'summary') {
    const evidence = prepareResumePolicy(master).evidence.filter(
      (fact) => !isSummarySection(fact.context)
    );
    if (!evidence.length) throw new Error('Add original resume facts before refining the summary.');
    return { summary_evidence: evidence };
  }
  const group =
    target.kind === 'bullets'
      ? extractResumeBulletGroups(source).find((item) => item.id === target.groupId)
      : extractResumeProjectGroups(source).find((item) => item.id === target.groupId);
  if (!group) throw new Error('This section changed. Select a current section and try again.');
  if (('bullets' in group ? group.bullets.length : group.projects.length) > 200)
    throw new Error('Select a section with at most 200 points.');
  return { group };
}

export const refinementAnswerSchema = z.object({
  summary: z
    .object({ text: z.string().max(1000), evidence_ids: z.array(z.string()).max(12) })
    .optional(),
  ordered_ids: z.array(z.string().max(40)).max(200).optional(),
});

export function assembleRefinement(
  master: string,
  source: string,
  target: RefinementTarget,
  output: unknown
): { tailored: string; changes: TailorChange[] } {
  const answer = refinementAnswerSchema.parse(output);
  let result: { tailored: string; changes: TailorChange[] };
  if (target.kind === 'summary') {
    const { summary_evidence: evidence } = prepareRefinement(master, source, target);
    if (!answer.summary || !evidence) throw new Error('Invalid response: missing summary');
    const summary = validateGeneratedSummary(answer.summary, evidence);
    result = {
      tailored: applyGeneratedSummary(source, summary),
      changes: [
        {
          snippet: summary,
          reason:
            'Refined only the summary using original resume evidence. Achievement wording is unchanged.',
        },
      ],
    };
  } else if (target.kind === 'bullets') {
    const group = extractResumeBulletGroups(source).find((item) => item.id === target.groupId);
    if (!group || !answer.ordered_ids) throw new Error('Invalid response: missing bullet order');
    result = assembleRankedResume(
      source,
      [group],
      [{ group_id: group.id, bullet_ids: answer.ordered_ids }]
    );
  } else {
    const groups = extractResumeProjectGroups(source);
    if (!groups.some((group) => group.id === target.groupId) || !answer.ordered_ids)
      throw new Error('Invalid response: missing project order');
    result = assembleRankedProjects(
      source,
      groups.map((group) => ({
        group_id: group.id,
        project_ids:
          group.id === target.groupId
            ? answer.ordered_ids!
            : group.projects.map((project) => project.id),
      }))
    );
  }
  assertRequiredResumeCoverage(source, result.tailored);
  return result;
}
