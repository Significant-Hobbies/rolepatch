'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  careerKinds,
  careerClaimChanged,
  verificationStatuses,
  type CareerData,
  type CareerKind,
  type CareerRecord,
} from '@/lib/career-tools';

const fieldsByKind: Record<CareerKind, (keyof CareerData)[]> = {
  identity: ['value'],
  employment: ['employer', 'role', 'start_date', 'end_date', 'context', 'technologies'],
  project: [
    'start_date',
    'end_date',
    'related_role_id',
    'context',
    'technical_decisions',
    'impact',
    'technologies',
  ],
  achievement: [
    'related_role_id',
    'related_project_id',
    'context',
    'individual_contribution',
    'team_outcome',
    'technical_decisions',
    'impact',
    'metric',
    'metric_is_estimate',
    'start_date',
    'end_date',
    'technologies',
  ],
  education: ['institution', 'credential', 'start_date', 'end_date'],
  skill: ['value'],
  answer: ['value'],
  note: ['value'],
};
const labels: Partial<Record<keyof CareerData, string>> = {
  context: 'Context or problem',
  related_role_id: 'Employment record ID',
  related_project_id: 'Project record ID',
  source_urls: 'Source links (one per line)',
  technologies: 'Technologies (one per line)',
  summary: 'Draft summary',
  metric_is_estimate: 'Metric is an estimate',
};
const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
export interface RecordDraft {
  id: string;
  kind: CareerKind;
  title: string;
  data: CareerData;
  sensitive: boolean;
  expected_revision?: number;
  clear_fields?: (keyof CareerData)[];
}

export function CareerRecordEditor({
  record,
  includeSensitive,
  pending,
  onSave,
  onCancel,
}: {
  record?: CareerRecord;
  includeSensitive: boolean;
  pending: boolean;
  onSave: (draft: RecordDraft) => void;
  onCancel: () => void;
}) {
  const [id] = useState(() => record?.id ?? crypto.randomUUID());
  const [kind, setKind] = useState<CareerKind>(record?.kind ?? 'achievement');
  const [title, setTitle] = useState(record?.title ?? '');
  const [sensitive, setSensitive] = useState(record?.sensitive ?? false);
  const [data, setData] = useState<CareerData>(record?.data ?? {});
  const keys = Array.from(
    new Set<keyof CareerData>([
      ...fieldsByKind[kind],
      'original_text',
      'approved_wording',
      'summary',
      'source_urls',
      'verification_status',
      ...(Object.keys(record?.data ?? {}) as (keyof CareerData)[]),
    ])
  );
  function setField(key: keyof CareerData, value: unknown) {
    setData((old) => {
      const next = { ...old, [key]: value };
      if (careerClaimChanged(old, next)) next.verification_status = 'unverified';
      return next;
    });
  }
  return (
    <form
      className="space-y-4 rounded-lg border bg-background p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const clear_fields = (Object.keys(record?.data ?? {}) as (keyof CareerData)[]).filter(
          (key) => data[key] === undefined
        );
        onSave({
          id,
          kind,
          title,
          data,
          sensitive,
          clear_fields,
          expected_revision: record?.revision,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Record type
          <select
            className={selectClass}
            value={kind}
            disabled={!!record}
            onChange={(event) => {
              setKind(event.target.value as CareerKind);
              setData({});
              setSensitive(false);
            }}
          >
            {careerKinds.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Title
          <Input
            required
            value={title}
            maxLength={400}
            onChange={(event) => {
              setTitle(event.target.value);
              setData((old) => ({ ...old, verification_status: 'unverified' }));
            }}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {keys.map((key) => {
          const label =
            labels[key] ?? key.replaceAll('_', ' ').replace(/^./, (s) => s.toUpperCase());
          if (key === 'metric_is_estimate')
            return (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!data[key]}
                  onChange={(e) => setField(key, e.target.checked)}
                />
                {label}
              </label>
            );
          if (key === 'verification_status')
            return (
              <label key={key} className="space-y-1 text-sm font-medium">
                {label}
                <select
                  className={selectClass}
                  value={data[key] ?? 'unverified'}
                  onChange={(e) => setField(key, e.target.value)}
                >
                  {verificationStatuses.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            );
          if (key === 'technologies' || key === 'source_urls')
            return (
              <label key={key} className="space-y-1 text-sm font-medium">
                {label}
                <Textarea
                  rows={2}
                  defaultValue={data[key]?.join('\n') ?? ''}
                  onChange={(e) =>
                    setField(
                      key,
                      e.target.value
                        .split('\n')
                        .map((x) => x.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </label>
            );
          const isLong = [
            'context',
            'individual_contribution',
            'technical_decisions',
            'team_outcome',
            'impact',
            'value',
            'original_text',
            'approved_wording',
            'summary',
          ].includes(key);
          const props = {
            value: data[key] ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setField(key, e.target.value || undefined),
          };
          return (
            <label key={key} className="space-y-1 text-sm font-medium">
              {label}
              {isLong ? <Textarea rows={2} {...props} /> : <Input {...props} />}
            </label>
          );
        })}
      </div>
      {kind === 'answer' && includeSensitive && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sensitive}
            onChange={(e) => setSensitive(e.target.checked)}
          />
          Sensitive answer
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save record'}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
