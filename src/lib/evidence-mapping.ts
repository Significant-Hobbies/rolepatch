import type { AchievementEvidence, AchievementImpact } from '@/lib/types';

export function strField(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? '');
}

function numField(row: Record<string, unknown>, key: string): number {
  return Number(row[key] ?? 0);
}

export function rowToEvidence(
  row: Record<string, unknown>,
  parseListFn: (value: unknown) => string[],
  toImpactType: (row: Record<string, unknown>) => AchievementImpact
): AchievementEvidence {
  return {
    id: String(row.id),
    title: strField(row, 'title'),
    situation: strField(row, 'situation'),
    action: strField(row, 'action'),
    result: strField(row, 'result'),
    metric: strField(row, 'metric'),
    scope: strField(row, 'scope'),
    skills: parseListFn(row.skills),
    role_targets: parseListFn(row.role_targets),
    impact_type: toImpactType(row),
    created_at: numField(row, 'created_at'),
    updated_at: numField(row, 'updated_at'),
  };
}
