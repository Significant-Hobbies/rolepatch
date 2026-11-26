'use client';

import { Badge } from '@saas-maker/ui/components/badge';
import { Button } from '@saas-maker/ui/components/button';
import { Input } from '@saas-maker/ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@saas-maker/ui/components/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@saas-maker/ui/components/tabs';
import { Textarea } from '@saas-maker/ui/components/textarea';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { callTracker, getApplicationAnalytics } from '@/lib/actions/tracker-records';
import type {
  ApplicationAnalytics,
  ApplicationAnalyticsRange,
  TrackerResult,
} from '@/lib/tracker-store';
import type { TrackerName } from '@/lib/tracker-tools';
import { materialKinds, trackerStages } from '@/lib/tracker-vocabulary';
import { ApplicationAnalyticsSummary } from './application-analytics';
import {
  TrackerFields,
  readFields,
  displayChoice,
  choiceClass,
  type TrackerField,
  type TrackerRow,
} from './application-tracker-fields';

const mainFields: TrackerField[] = [
  { key: 'company', label: 'Company', required: true },
  { key: 'role', label: 'Role', required: true },
  { key: 'url', label: 'Job URL', type: 'url' },
  { key: 'status', label: 'Status', choices: trackerStages, required: true },
  { key: 'priority', label: 'Priority', choices: ['low', 'normal', 'high'] },
  { key: 'location', label: 'Location' },
  { key: 'jd_text', label: 'Job description', type: 'long' },
];
const detailFields: TrackerField[] = [
  { key: 'board', label: 'Board identifier (e.g. greenhouse/acme)' },
  { key: 'external_job_id', label: 'Board job ID' },
  { key: 'manual_id', label: 'Manual opening ID' },
  { key: 'next_action', label: 'Next action' },
  { key: 'remote_eligibility', label: 'Remote eligibility' },
  { key: 'india_eligibility', label: 'India eligibility' },
  { key: 'salary_min', label: 'Minimum compensation', type: 'number' },
  { key: 'salary_max', label: 'Maximum compensation', type: 'number' },
  { key: 'salary_currency', label: 'Currency (e.g. INR)' },
  { key: 'salary_period', label: 'Pay period', choices: ['hour', 'day', 'week', 'month', 'year'] },
  { key: 'compensation_evidence', label: 'Compensation source or note' },
  { key: 'applied_at', label: 'Applied on', type: 'date' },
  { key: 'follow_up_at', label: 'Follow-up date', type: 'date' },
  { key: 'interview_date', label: 'Interview date', type: 'date' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'rejection_reason', label: 'Rejection reason' },
  { key: 'notes', label: 'Notes', type: 'long' },
];
const filterFields: TrackerField[] = [
  { key: 'query', label: 'Search company, role or notes' },
  { key: 'status', label: 'Filter by status', choices: trackerStages },
  { key: 'company', label: 'Company' },
  { key: 'priority', label: 'Priority', choices: ['low', 'normal', 'high'] },
  { key: 'salary_min', label: 'Minimum compensation', type: 'number' },
  { key: 'salary_max', label: 'Maximum compensation', type: 'number' },
  { key: 'salary_currency', label: 'Currency' },
  { key: 'salary_period', label: 'Pay period', choices: ['hour', 'day', 'week', 'month', 'year'] },
  { key: 'date_from', label: 'Applied from', type: 'date' },
  { key: 'date_to', label: 'Applied through', type: 'date' },
  { key: 'due_before', label: 'Follow-ups due through', type: 'date' },
];
class ExistingApplication extends Error {
  readonly id: string;
  constructor(message: string, id: string) {
    super(message);
    this.id = id;
  }
}
async function invoke(name: TrackerName, args: unknown) {
  const result = await callTracker(name, args);
  if (!result.ok) {
    if (result.code === 'conflict' && result.id)
      throw new ExistingApplication(result.error, result.id);
    throw new Error(result.error);
  }
  return result;
}
type Task = (work: () => Promise<void>) => void;
type Choice = { id: string; label: string };
function RecordForm({
  record,
  save,
  cancel,
}: {
  record?: TrackerRow;
  save: (data: Record<string, unknown>) => void;
  cancel: () => void;
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [initial] = useState(() => record ?? { status: 'discovered' });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = readFields(e.currentTarget, [...mainFields, ...detailFields], record);
    if (!record && !fields.url && !fields.external_job_id && !fields.manual_id)
      fields.manual_id = key;
    save(
      record
        ? { id: record.id, expected_revision: record.revision, ...fields }
        : { request_id: key, ...fields }
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">{record ? 'Edit application' : 'Add application'}</h3>
      <TrackerFields fields={mainFields} record={initial} />
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          Compensation, dates and more
        </summary>
        <div className="pt-4">
          <TrackerFields fields={detailFields} record={initial} />
        </div>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save application</Button>
        <Button type="button" variant="ghost" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
function Removal({
  row,
  kind,
  remove,
}: {
  row: TrackerRow;
  kind: string;
  remove: (permanent: boolean) => void;
}) {
  const [confirm, setConfirm] = useState('');
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium">Archive or delete {kind}</summary>
      <div className="mt-3 grid gap-3 rounded-md border p-3">
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          onClick={() => remove(false)}
        >
          Archive {kind}
        </Button>
        <label className="grid gap-1">
          To permanently delete, type the ID <code className="break-all">{row.id}</code>
          <Input value={confirm} autoComplete="off" onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <Button
          type="button"
          variant="destructive"
          className="justify-self-start"
          disabled={confirm !== row.id}
          onClick={() => remove(true)}
        >
          Delete permanently
        </Button>
      </div>
    </details>
  );
}
function MaterialForm({
  row,
  documents,
  save,
  cancel,
}: {
  row?: TrackerRow;
  documents: Choice[];
  save: (data: Record<string, unknown>) => void;
  cancel: () => void;
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [source, setSource] = useState('text');
  return (
    <form
      className="grid gap-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        save({
          ...(row ? { id: row.id, expected_revision: row.revision } : { request_id: key }),
          kind: data.get('kind'),
          title: data.get('title'),
          ...(source === 'text'
            ? { content: data.get('content') }
            : { reference_type: source, reference_id: data.get('reference_id') }),
        });
      }}
    >
      <h4 className="text-sm font-semibold">{row ? 'Edit material' : 'Add material'}</h4>
      <TrackerFields
        fields={[
          { key: 'kind', label: 'Material type', choices: materialKinds, required: true },
          { key: 'title', label: 'Title', required: true },
        ]}
        record={row}
      />
      <label className="grid gap-1 text-sm font-medium">
        Source
        <select className={choiceClass} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="text">Text</option>
          <option value="tailored_resume">Saved tailored resume</option>
          <option value="resume_version">Career resume version</option>
          <option value="cover_letter">Saved cover letter</option>
        </select>
      </label>
      {source === 'text' ? (
        <label className="grid gap-1 text-sm font-medium">
          Material text
          <Textarea required name="content" defaultValue={String(row?.content ?? '')} rows={4} />
        </label>
      ) : (
        <label className="grid gap-1 text-sm font-medium">
          Document ID
          <Input
            name="reference_id"
            required
            list={source === 'tailored_resume' ? 'tracker-documents' : undefined}
          />
          <datalist id="tracker-documents">
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.label}
              </option>
            ))}
          </datalist>
        </label>
      )}
      <div className="flex gap-2">
        <Button type="submit">Save material</Button>
        <Button type="button" variant="ghost" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
type List = Extract<TrackerResult, { ok: true }>;
const pageSize = 25;
const appliedDate = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
export function ApplicationTracker({
  documents = [],
  onChange,
}: {
  documents?: Choice[];
  onChange?: () => Promise<void>;
}) {
  const [view, setView] = useState('applications');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState<string>();
  const [filter, setFilter] = useState<Record<string, unknown>>({});
  const [applications, setApplications] = useState<List>({ ok: true });
  const [analyticsRange, setAnalyticsRange] = useState<ApplicationAnalyticsRange>(90);
  const [analytics, setAnalytics] = useState<ApplicationAnalytics>();
  const [analyticsError, setAnalyticsError] = useState('');
  const [selected, setSelected] = useState<TrackerRow>();
  const [edit, setEdit] = useState(false);
  const [receipts, setReceipts] = useState<TrackerRow[]>([]);
  const [events, setEvents] = useState<List>({ ok: true });
  const [materials, setMaterials] = useState<List>({ ok: true });
  const [material, setMaterial] = useState<TrackerRow>();
  const [editMaterial, setEditMaterial] = useState(false);
  const [importReport, setImportReport] = useState<string[]>([]);
  const detail = useRef<HTMLElement>(null);
  const focusDetail = useRef(false);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    void invoke('rolepatch_applications_list', { limit: pageSize })
      .then((result) => {
        if (active) setApplications(result);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load applications.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!focusDetail.current || busy || (!selected && !edit)) return;
    focusDetail.current = false;
    detail.current?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 1279px)').matches) {
      detail.current?.scrollIntoView({ block: 'start' });
    }
  }, [selected, edit, busy]);
  function closeDetail() {
    setSelected(undefined);
    setEdit(false);
    detailTrigger.current?.focus();
  }
  const task: Task = async (work) => {
    setError('');
    setExistingId(undefined);
    setBusy(true);
    try {
      await work();
    } catch (e) {
      if (e instanceof ExistingApplication) setExistingId(e.id);
      setError(e instanceof Error ? e.message : 'Could not update the tracker. Please retry.');
    } finally {
      setBusy(false);
    }
  };
  async function list(filters = filter, more = false) {
    const res = await invoke('rolepatch_applications_list', {
      ...filters,
      limit: pageSize,
      ...(more ? { cursor: applications.next_cursor } : {}),
    });
    setApplications(
      more ? { ...res, items: [...(applications.items ?? []), ...(res.items ?? [])] } : res
    );
  }
  async function summarize(days = analyticsRange) {
    if (analytics?.days !== days) setAnalytics(undefined);
    setAnalyticsError('');
    try {
      const now = new Date();
      const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      const result = await getApplicationAnalytics(days, localDate);
      if (!result.ok) throw new Error(result.error);
      setAnalytics(result.summary);
    } catch (error) {
      setAnalytics(undefined);
      setAnalyticsError(
        error instanceof Error ? error.message : 'Could not load application analytics.'
      );
    }
  }
  async function select(id: string) {
    const [job, events, materials] = await Promise.all([
      invoke('rolepatch_applications_get', { id }),
      invoke('rolepatch_application_events_list', { application_id: id }),
      invoke('rolepatch_materials_list', { application_id: id, include_archived: true }),
    ]);
    setSelected(job.record);
    setReceipts(job.submission_receipts ?? []);
    setEvents(events);
    setMaterials(materials);
    setMaterial(undefined);
    setEditMaterial(false);
    setEdit(false);
  }
  async function changed(id?: string) {
    setAnalytics(undefined);
    await list();
    if (id) await select(id);
    else {
      setSelected(undefined);
      setEdit(false);
    }
    await onChange?.();
  }
  return (
    <section aria-labelledby="application-tracker-heading" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="application-tracker-heading" className="text-xl font-semibold tracking-tight">
          Application tracker
        </h2>
        {view === 'applications' && (
          <Button
            type="button"
            disabled={loading || busy}
            onClick={(event) => {
              detailTrigger.current = event.currentTarget;
              setSelected(undefined);
              focusDetail.current = true;
              setEdit(true);
            }}
          >
            <Plus className="size-4" />
            Add application
          </Button>
        )}
      </div>
      <Tabs
        value={view}
        onValueChange={(next) => {
          setView(next);
          if (next === 'analytics' && !analytics) void task(() => summarize());
        }}
      >
        <div className="border-b">
          <TabsList aria-label="Application tracker views" variant="line" className="gap-4">
            <TabsTrigger value="applications" disabled={busy}>
              Applications
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled={loading || busy}>
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="analytics" className="pt-2">
          <fieldset disabled={busy} aria-busy={busy}>
            {busy && (
              <p role="status" className="py-2 text-sm text-muted-foreground">
                Loading analytics…
              </p>
            )}
            <ApplicationAnalyticsSummary
              days={analyticsRange}
              data={analytics}
              error={analyticsError}
              onChange={(days) => {
                setAnalyticsRange(days);
                void task(() => summarize(days));
              }}
              onRetry={() => void task(() => summarize())}
            />
          </fieldset>
        </TabsContent>
        <TabsContent value="applications" className="min-w-0 pt-2">
          <fieldset
            disabled={loading || busy}
            className="min-w-0 space-y-3"
            aria-busy={loading || busy}
          >
            {error && (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm"
              >
                <p>{error}</p>
                {!applications.items && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => task(() => list())}
                  >
                    Retry
                  </Button>
                )}
                {existingId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      focusDetail.current = true;
                      void task(() => select(existingId));
                    }}
                  >
                    Open existing application
                  </Button>
                )}
              </div>
            )}
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const values = readFields(e.currentTarget, filterFields);
                for (const key of ['due_before', 'date_to'])
                  if (typeof values[key] === 'number') values[key] = Number(values[key]) + 86399;
                void task(async () => {
                  await list(values);
                  setFilter(values);
                });
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-28 flex-1 sm:max-w-80">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                  />
                  <Input
                    name="query"
                    type="search"
                    aria-label="Search company, role or notes"
                    placeholder="Search roles"
                    defaultValue={String(filter.query ?? '')}
                    className="pl-9"
                  />
                </div>
                <select
                  name="status"
                  aria-label="Filter by status"
                  defaultValue={String(filter.status ?? '')}
                  className="h-9 max-w-32 rounded-md border border-input bg-background px-2 text-sm capitalize"
                >
                  <option value="">All stages</option>
                  {trackerStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {displayChoice(stage)}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline">
                  Filter
                </Button>
              </div>
              <details>
                <summary className="w-fit cursor-pointer py-1 text-sm text-muted-foreground">
                  More filters
                </summary>
                <div className="max-w-3xl pt-3">
                  <TrackerFields
                    fields={filterFields.slice(2)}
                    record={
                      {
                        ...filter,
                        date_to: typeof filter.date_to === 'number' ? filter.date_to - 86399 : null,
                        due_before:
                          typeof filter.due_before === 'number' ? filter.due_before - 86399 : null,
                      } as TrackerRow
                    }
                  />
                </div>
              </details>
            </form>
            <div
              className={
                selected || edit
                  ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]'
                  : ''
              }
            >
              <div className="min-w-0 space-y-3">
                {loading ? (
                  <p
                    role="status"
                    className="rounded-md border px-4 py-6 text-sm text-muted-foreground"
                  >
                    Loading applications…
                  </p>
                ) : applications.items?.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-sm">
                    <p className="font-medium">
                      {Object.keys(filter).length
                        ? 'No matching applications'
                        : 'No applications yet'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {Object.keys(filter).length
                        ? 'Try a different search or stage.'
                        : 'Add a role to track its progress and keep your materials together.'}
                    </p>
                  </div>
                ) : applications.items?.length ? (
                  <div className="overflow-hidden rounded-lg border">
                    <Table className="table-fixed">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead scope="col">Company and role</TableHead>
                          <TableHead scope="col" className="w-28 sm:w-32">
                            Stage
                          </TableHead>
                          <TableHead scope="col" className="hidden w-32 sm:table-cell">
                            Applied
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.items.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={selected?.id === row.id ? 'selected' : undefined}
                          >
                            <TableCell className="min-w-0 p-0 whitespace-normal">
                              <Button
                                type="button"
                                variant="ghost"
                                aria-pressed={selected?.id === row.id}
                                className="group h-auto min-h-14 w-full justify-start gap-3 rounded-none px-3 py-2.5 text-left whitespace-normal focus-visible:ring-inset"
                                onClick={(event) => {
                                  detailTrigger.current = event.currentTarget;
                                  focusDetail.current = true;
                                  void task(() => select(String(row.id)));
                                }}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block font-medium break-words">
                                    {row.company}
                                  </span>
                                  <span className="block text-xs leading-5 wrap-anywhere text-muted-foreground">
                                    {row.role}
                                  </span>
                                </span>
                                <ChevronRight
                                  aria-hidden="true"
                                  className="hidden size-3.5 text-muted-foreground group-hover:text-foreground md:block"
                                />
                              </Button>
                            </TableCell>
                            <TableCell className="px-2 sm:px-3">
                              <Badge
                                variant={
                                  row.status === 'applied' || row.status === 'rejected'
                                    ? 'outline'
                                    : 'secondary'
                                }
                                className="max-w-full whitespace-normal capitalize"
                              >
                                {displayChoice(String(row.status))}
                              </Badge>
                              {row.applied_at != null && (
                                <span className="mt-1 block text-xs text-muted-foreground sm:hidden">
                                  {appliedDate.format(Number(row.applied_at) * 1000)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden text-xs text-muted-foreground tabular-nums sm:table-cell">
                              {row.applied_at == null
                                ? '—'
                                : appliedDate.format(Number(row.applied_at) * 1000)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
                {applications.next_cursor && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => task(() => list(filter, true))}
                  >
                    Load more applications
                  </Button>
                )}
              </div>
              {(selected || edit) && (
                <aside
                  ref={detail}
                  tabIndex={-1}
                  aria-label="Application details"
                  className="min-w-0 scroll-mt-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {edit && (
                    <RecordForm
                      key={String(selected?.id ?? 'new')}
                      record={selected}
                      cancel={selected ? () => setEdit(false) : closeDetail}
                      save={(data) =>
                        task(async () => {
                          const r = await invoke(
                            selected
                              ? 'rolepatch_applications_update'
                              : 'rolepatch_applications_create',
                            data
                          );
                          await changed(r.id);
                        })
                      }
                    />
                  )}
                  {selected && !edit && (
                    <div className="grid min-w-0 gap-4 rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{selected.role}</h3>
                          <p className="text-sm text-muted-foreground">
                            {selected.company} · {displayChoice(String(selected.status))}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEdit(true)}
                          >
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={closeDetail}>
                            Close
                          </Button>
                        </div>
                      </div>
                      <dl className="grid gap-2 sm:grid-cols-2">
                        {[...mainFields, ...detailFields]
                          .filter(
                            (f) =>
                              !['company', 'role', 'status'].includes(f.key) &&
                              selected[f.key] != null &&
                              selected[f.key] !== ''
                          )
                          .map((f) => (
                            <div key={f.key} className={f.type === 'long' ? 'sm:col-span-2' : ''}>
                              <dt className="text-xs text-muted-foreground">{f.label}</dt>
                              <dd className="whitespace-pre-wrap break-words text-sm">
                                {f.type === 'date'
                                  ? new Date(Number(selected[f.key]) * 1000)
                                      .toISOString()
                                      .slice(0, 10)
                                  : String(selected[f.key])}
                              </dd>
                            </div>
                          ))}
                      </dl>
                      <section className="grid gap-2 border-t pt-4">
                        <h4 className="font-semibold">Materials</h4>
                        {materials.items?.length === 0 && (
                          <p className="text-sm text-muted-foreground">No materials attached.</p>
                        )}
                        {materials.items?.map((m) => (
                          <Button
                            type="button"
                            key={m.id}
                            variant="ghost"
                            className="justify-self-start whitespace-normal"
                            onClick={() => {
                              setEditMaterial(false);
                              setMaterial(m);
                            }}
                          >
                            {m.title} · revision {m.revision}
                            {m.archived ? ' (archived)' : ''}
                          </Button>
                        ))}
                        {materials.next_cursor && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              task(async () => {
                                const next = await invoke('rolepatch_materials_list', {
                                  application_id: selected.id,
                                  cursor: materials.next_cursor,
                                  include_archived: true,
                                });
                                setMaterials({
                                  ...next,
                                  items: [...(materials.items ?? []), ...(next.items ?? [])],
                                });
                              })
                            }
                          >
                            More materials
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="justify-self-start"
                          onClick={() => {
                            setMaterial(undefined);
                            setEditMaterial(true);
                          }}
                        >
                          Add material
                        </Button>
                        {editMaterial ? (
                          <MaterialForm
                            key={String(material?.id ?? 'new')}
                            row={material}
                            documents={documents}
                            cancel={() => setEditMaterial(false)}
                            save={(data) =>
                              task(async () => {
                                await invoke('rolepatch_materials_upsert', {
                                  ...data,
                                  application_id: selected.id,
                                });
                                await select(String(selected.id));
                              })
                            }
                          />
                        ) : (
                          material && (
                            <div className="grid gap-2 rounded-md bg-muted p-3 text-sm">
                              <strong>
                                {material.title} · revision {material.revision}
                              </strong>
                              <p className="whitespace-pre-wrap break-words">{material.content}</p>
                              <form
                                className="flex flex-wrap items-end gap-2"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const rev = Number(new FormData(e.currentTarget).get('revision'));
                                  task(async () => {
                                    const r = await invoke('rolepatch_materials_get', {
                                      id: material.id,
                                      revision: rev,
                                    });
                                    setMaterial(r.record);
                                  });
                                }}
                              >
                                <label>
                                  View revision
                                  <Input
                                    name="revision"
                                    type="number"
                                    min={1}
                                    required
                                    defaultValue={Number(material.revision)}
                                  />
                                </label>
                                <Button type="submit" variant="outline">
                                  View
                                </Button>
                              </form>
                              {materials.items?.some(
                                (m) => m.id === material.id && m.revision === material.revision
                              ) && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditMaterial(true)}
                                  >
                                    Edit material
                                  </Button>
                                  <Removal
                                    row={material}
                                    kind="material"
                                    remove={(permanent) =>
                                      task(async () => {
                                        await invoke('rolepatch_materials_delete', {
                                          id: material.id,
                                          expected_revision: material.revision,
                                          permanent,
                                          confirm_id: permanent ? material.id : undefined,
                                        });
                                        await select(String(selected.id));
                                      })
                                    }
                                  />
                                </>
                              )}
                            </div>
                          )
                        )}
                      </section>
                      <section className="grid gap-2 border-t pt-4">
                        <h4 className="font-semibold">Application events</h4>
                        {receipts.length > 0 && (
                          <div className="rounded-md border p-3">
                            <h5 className="text-sm font-semibold">Submission receipts</h5>
                            <ul className="text-sm">
                              {receipts.map((r) => (
                                <li key={r.id}>
                                  {displayChoice(String(r.source))} · {r.provider} · {r.status} ·{' '}
                                  {new Date(Number(r.created_at) * 1000).toLocaleDateString()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <ul className="space-y-2 text-sm">
                          {events.items?.map((ev) => (
                            <li key={ev.id} className="border-l-2 pl-3">
                              <strong className="capitalize">
                                {displayChoice(String(ev.status))}
                              </strong>{' '}
                              · {new Date(Number(ev.created_at) * 1000).toLocaleDateString()} ·{' '}
                              {displayChoice(String(ev.source))}
                              {ev.note && (
                                <p className="whitespace-pre-wrap break-words">{ev.note}</p>
                              )}
                              {JSON.parse(String(ev.material_versions)).map(
                                (ref: { id: string; revision: number }) => (
                                  <button
                                    type="button"
                                    key={ref.id}
                                    className="mr-3 underline"
                                    onClick={() =>
                                      task(async () => {
                                        const r = await invoke('rolepatch_materials_get', ref);
                                        setEditMaterial(false);
                                        setMaterial(r.record);
                                      })
                                    }
                                  >
                                    {materials.items?.find((m) => m.id === ref.id)?.title ??
                                      'Attached material'}{' '}
                                    · revision {ref.revision}
                                  </button>
                                )
                              )}
                            </li>
                          ))}
                        </ul>
                        {events.next_cursor && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              task(async () => {
                                const next = await invoke('rolepatch_application_events_list', {
                                  application_id: selected.id,
                                  cursor: events.next_cursor,
                                });
                                setEvents({
                                  ...next,
                                  items: [...(events.items ?? []), ...(next.items ?? [])],
                                });
                              })
                            }
                          >
                            More events
                          </Button>
                        )}
                        <form
                          key={`${String(selected.id)}-${String(selected.revision)}`}
                          className="grid gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const data = new FormData(e.currentTarget);
                            task(async () => {
                              await invoke('rolepatch_application_events_add', {
                                application_id: selected.id,
                                expected_revision: selected.revision,
                                request_id: crypto.randomUUID(),
                                status: data.get('status'),
                                note: data.get('note'),
                                material_versions: data
                                  .getAll('material_version')
                                  .map((value) => JSON.parse(String(value))),
                              });
                              await changed(String(selected.id));
                            });
                          }}
                        >
                          <TrackerFields
                            fields={[
                              {
                                key: 'status',
                                label: 'Reported stage',
                                choices: trackerStages,
                                required: true,
                              },
                              { key: 'note', label: 'Event note', type: 'long', required: true },
                            ]}
                            record={selected}
                          />
                          {materials.items?.some((m) => !m.archived) && (
                            <fieldset className="grid gap-2">
                              <legend className="mb-1 text-sm font-medium">
                                Materials used for this event
                              </legend>
                              {materials.items
                                .filter((m) => !m.archived)
                                .map((m) => (
                                  <label key={m.id} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      name="material_version"
                                      value={JSON.stringify({ id: m.id, revision: m.revision })}
                                    />
                                    {m.title} · revision {m.revision}
                                  </label>
                                ))}
                            </fieldset>
                          )}
                          <Button type="submit" variant="outline" className="justify-self-start">
                            Record event
                          </Button>
                        </form>
                      </section>
                      <Removal
                        row={selected}
                        kind="application"
                        remove={(permanent) =>
                          task(async () => {
                            await invoke('rolepatch_applications_delete', {
                              id: selected.id,
                              expected_revision: selected.revision,
                              permanent,
                              confirm_id: permanent ? selected.id : undefined,
                            });
                            await changed();
                          })
                        }
                      />
                    </div>
                  )}
                </aside>
              )}
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-medium">Import applications</summary>
              <form
                className="mt-3 grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = String(new FormData(e.currentTarget).get('items'));
                  task(async () => {
                    const items = JSON.parse(input);
                    const r = await invoke('rolepatch_applications_bulk_upsert', { items });
                    setImportReport(
                      (r.outcomes ?? []).map(
                        (item, i) => `Row ${i + 1} · ${item.ok ? 'Saved' : item.error}`
                      )
                    );
                    await changed();
                  });
                }}
              >
                <label className="grid gap-1 text-sm">
                  Applications as a JSON array
                  <Textarea
                    name="items"
                    required
                    placeholder={
                      '[{"request_id":"job-1","manual_id":"job-1","company":"Acme","role":"Engineer"}]'
                    }
                  />
                </label>
                <Button type="submit" variant="outline" className="justify-self-start">
                  Import jobs
                </Button>
              </form>
              <ul className="text-sm">
                {importReport.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          </fieldset>
        </TabsContent>
      </Tabs>
    </section>
  );
}
