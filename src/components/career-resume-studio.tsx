'use client';

import { Label } from '@saas-maker/ui/components/label';
import {
  NativeSelect,
  NativeDisclosure,
  NativeSummary,
} from '@saas-maker/ui/components/native-controls';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@saas-maker/ui/components/button';
import { Input } from '@saas-maker/ui/components/input';
import { Textarea } from '@saas-maker/ui/components/textarea';
import { callCareerResume } from '@/lib/actions/career-resume';

type Response = Awaited<ReturnType<typeof callCareerResume>>;
type Draft = Extract<Response, { markdown: string; saved: boolean; ok: true }>;
type HistoryRow = Extract<Response, { versions: unknown[] }>['versions'][number];
const fieldClass = 'grid gap-1 text-sm font-medium';
const selectClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const toIds = (text: string) =>
  text
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

export function CareerResumeStudio({ profileId }: { profileId: string }) {
  return <Studio key={profileId} profileId={profileId} />;
}

function Studio({ profileId }: { profileId: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [archived, setArchived] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const request = useRef({ key: '', id: '' });
  const historyEpoch = useRef(0);
  const fetchHistory = useCallback(
    async (next?: string) => {
      const epoch = ++historyEpoch.current;
      try {
        const result = await callCareerResume('rolepatch_resume_versions_list', {
          profile_id: profileId,
          include_archived: archived,
          cursor: next,
        });
        if (epoch !== historyEpoch.current) return;
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        if ('versions' in result && result.versions) {
          const rows = result.versions;
          setHistory((existing) => (next ? [...existing, ...rows] : rows));
          setCursor(result.next_cursor ?? null);
        }
      } catch {
        if (epoch === historyEpoch.current) setMessage('Resume history could not be loaded.');
      }
    },
    [profileId, archived]
  );
  useEffect(() => {
    void fetchHistory();
    return () => {
      historyEpoch.current++;
    };
  }, [fetchHistory]);
  function open(result: Draft) {
    setDraft(result);
    setMarkdown(result.markdown);
  }
  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setMessage('');
    try {
      await action();
    } catch {
      setMessage('Connection interrupted. Retry the same action.');
    } finally {
      setPending(false);
    }
  }
  async function mutate(name: string, args: Record<string, unknown>) {
    const key = JSON.stringify([name, args]);
    if (request.current.key !== key) request.current = { key, id: crypto.randomUUID() };
    const result = await callCareerResume(name, { ...args, request_id: request.current.id });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    request.current = { key: '', id: '' };
    if ('markdown' in result) {
      open(result);
      setMessage(
        'credits_charged' in result
          ? `Generation completed. Credits charged: ${result.credits_charged}.`
          : `Saved revision ${result.revision}.`
      );
    }
    await fetchHistory();
  }
  function save(approved: boolean) {
    if (!draft) return;
    const args = draft.saved
      ? { version_id: draft.id, expected_revision: draft.revision }
      : { draft_id: draft.id };
    return mutate(
      draft.saved ? 'rolepatch_resume_versions_update' : 'rolepatch_resume_versions_save',
      { ...args, markdown, approved }
    );
  }
  async function download() {
    if (!draft) return;
    const result =
      draft.saved && markdown === draft.markdown
        ? await callCareerResume('rolepatch_render_resume_pdf', { version_id: draft.id })
        : await fetch('/api/resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: 'render_pdf', resume_markdown: markdown }),
          }).then(
            (response) =>
              response.json() as Promise<
                { ok: true; pdf: { data_base64: string } } | { ok: false; error: string }
              >
          );
    if (!result.ok || !('pdf' in result)) {
      setMessage(!result.ok ? result.error : 'PDF unavailable.');
      return;
    }
    const bytes = Uint8Array.from(atob(result.pdf.data_base64), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume.pdf';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      aria-labelledby="career-resume-heading"
      className="space-y-5 rounded-xl border bg-card p-4 sm:p-6"
    >
      <div>
        <h2 id="career-resume-heading" className="text-lg font-semibold">
          Résumé options
        </h2>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const value = (key: string) => String(form.get(key) || '').trim();
          void run(() =>
            mutate('rolepatch_generate_resume', {
              profile_id: profileId,
              jd_text: value('jd_text') || undefined,
              job_url: value('job_url') || undefined,
              application_id: value('application_id') || undefined,
              target_pages: Number(value('target_pages')),
              mode: value('mode'),
              emphasis: value('emphasis'),
              pin_ids: toIds(value('pin_ids')),
              exclude_ids: toIds(value('exclude_ids')),
            })
          );
        }}
      >
        <Label className={fieldClass}>
          Job description{' '}
          <Textarea name="jd_text" placeholder="Optional for a general resume" rows={3} />
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label className={fieldClass}>
            Wording
            <NativeSelect className={selectClass} name="mode">
              <option value="fixed_wording">Keep approved wording · free</option>
              <option value="grounded_rewrite">
                Rewrite from my contributions · up to 1 credit
              </option>
            </NativeSelect>
          </Label>
          <Label className={fieldClass}>
            Target length
            <NativeSelect className={selectClass} name="target_pages">
              <option value="1">One page</option>
              <option value="2">Two pages</option>
            </NativeSelect>
          </Label>
        </div>
        <NativeDisclosure>
          <NativeSummary className="cursor-pointer text-sm font-medium">
            Job, emphasis and record selection
          </NativeSummary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Label className={fieldClass}>
              Job URL
              <Input name="job_url" type="url" />
            </Label>
            <Label className={fieldClass}>
              Application ID
              <Input name="application_id" />
            </Label>
            <Label className={fieldClass}>
              Emphasis
              <Input name="emphasis" />
            </Label>
            <Label className={fieldClass}>
              Pin record IDs
              <Input name="pin_ids" placeholder="Comma-separated IDs" />
            </Label>
            <Label className={fieldClass}>
              Exclude record IDs
              <Input name="exclude_ids" placeholder="Comma-separated IDs" />
            </Label>
          </div>
        </NativeDisclosure>
        <Button type="submit" disabled={pending}>
          Generate draft
        </Button>
      </form>
      {draft && (
        <div className="space-y-3 border-t pt-4">
          <Label className={fieldClass}>
            Resume Markdown
            <Textarea
              className="min-h-48 font-mono text-sm"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
            />
          </Label>
          <p className="text-sm text-muted-foreground">
            {draft.saved
              ? `Revision ${draft.revision} · ${draft.approved ? 'Approved' : 'Draft'}`
              : 'Unsaved draft · available for 24 hours'}
          </p>
          {draft.warnings.map((w) => (
            <p key={w} className="break-words text-sm">
              {w}
            </p>
          ))}
          <NativeDisclosure>
            <NativeSummary className="cursor-pointer text-sm">Sources and changes</NativeSummary>
            <ul className="mt-2 space-y-1 break-words text-xs">
              {draft.changes.map((c) => (
                <li key={c.record_id}>
                  {c.record_id} · {c.reason}
                </li>
              ))}
            </ul>
          </NativeDisclosure>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending || draft.archived}
              onClick={() =>
                void run(async () => {
                  await save(false);
                })
              }
            >
              Save draft
            </Button>
            <Button
              variant="outline"
              disabled={pending || draft.archived}
              onClick={() =>
                void run(async () => {
                  await save(true);
                })
              }
            >
              Approve and save
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => void run(download)}>
              Export PDF
            </Button>
            {draft.saved && !draft.archived && (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  void run(() =>
                    mutate('rolepatch_resume_versions_archive', {
                      version_id: draft.id,
                      expected_revision: draft.revision,
                    })
                  )
                }
              >
                Archive series
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="space-y-2 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-medium">Saved versions</h4>
          <Label className="flex items-center gap-2 text-sm">
            <Input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            Include archived
          </Label>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved versions for this profile.</p>
        ) : (
          <ul className="divide-y">
            {history.map((row) => (
              <li key={row.id}>
                <Button
                  variant="ghost"
                  type="button"
                  disabled={pending}
                  className="flex w-full flex-wrap justify-between gap-2 py-2 text-left text-sm"
                  onClick={() =>
                    void run(async () => {
                      const result = await callCareerResume('rolepatch_resume_versions_get', {
                        version_id: row.id,
                      });
                      if (!result.ok) setMessage(result.error);
                      else if ('markdown' in result) open(result);
                    })
                  }
                >
                  <span>
                    Revision {row.revision} ·{' '}
                    {row.archived ? 'Archived' : row.approved ? 'Approved' : 'Draft'}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(row.created_at * 1000).toLocaleString()}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {cursor && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void run(() => fetchHistory(cursor))}
          >
            Load more
          </Button>
        )}
      </div>
      <p role="status" className="text-sm">
        {pending ? 'Working…' : message}
      </p>
    </section>
  );
}
