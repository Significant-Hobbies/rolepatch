'use client';

import { Label } from '@saas-maker/ui/components/label';
import { NativeSelect } from '@saas-maker/ui/components/native-controls';
import { useState } from 'react';
import { Button } from '@saas-maker/ui/components/button';
import { Input } from '@saas-maker/ui/components/input';
import { Textarea } from '@saas-maker/ui/components/textarea';
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
  reconfirm?: boolean;
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
  const [decision, setDecision] = useState<{ title: string; data: CareerData }>();
  const choice =
    decision && decision.title === title && !careerClaimChanged(decision.data, data)
      ? decision.data.verification_status
      : undefined;
  const changed = !!record && (record.title !== title || careerClaimChanged(record.data, data));
  const verification =
    choice ?? (changed ? 'unverified' : (data.verification_status ?? 'unverified'));
  function setField(key: keyof CareerData, value: unknown) {
    setData((old) => ({ ...old, [key]: value }));
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
          data: { ...data, verification_status: verification },
          reconfirm: changed && (choice === 'user_confirmed' || choice === 'document_supported'),
          sensitive,
          clear_fields,
          expected_revision: record?.revision,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="block space-y-1 text-sm font-medium">
          Record type
          <NativeSelect
            className={selectClass}
            value={kind}
            disabled={!!record}
            onChange={(event) => {
              setKind(event.target.value as CareerKind);
              setData({});
              setDecision(undefined);
              setSensitive(false);
            }}
          >
            {careerKinds.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
        </Label>
        <Label className="block space-y-1 text-sm font-medium">
          Title
          <Input
            required
            value={title}
            maxLength={400}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        </Label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {keys.map((key) => {
          const label =
            labels[key] ?? key.replaceAll('_', ' ').replace(/^./, (s) => s.toUpperCase());
          if (key === 'metric_is_estimate')
            return (
              <Label key={key} className="flex items-center gap-2 text-sm">
                <Input
                  type="checkbox"
                  checked={!!data[key]}
                  onChange={(e) => setField(key, e.target.checked)}
                />
                {label}
              </Label>
            );
          if (key === 'verification_status')
            return (
              <Label key={key} className="space-y-1 text-sm font-medium">
                {label}
                <NativeSelect
                  className={selectClass}
                  value={verification}
                  onChange={(e) =>
                    setDecision({
                      title,
                      data: {
                        ...data,
                        verification_status: e.target.value as CareerData['verification_status'],
                      },
                    })
                  }
                >
                  {verificationStatuses.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll('_', ' ')}
                    </option>
                  ))}
                </NativeSelect>
              </Label>
            );
          if (key === 'technologies' || key === 'source_urls')
            return (
              <Label key={key} className="space-y-1 text-sm font-medium">
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
              </Label>
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
            <Label key={key} className="space-y-1 text-sm font-medium">
              {label}
              {isLong ? <Textarea rows={2} {...props} /> : <Input {...props} />}
            </Label>
          );
        })}
      </div>
      {kind === 'answer' && includeSensitive && (
        <Label className="flex items-center gap-2 text-sm">
          <Input
            type="checkbox"
            checked={sensitive}
            onChange={(e) => setSensitive(e.target.checked)}
          />
          Sensitive answer
        </Label>
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
