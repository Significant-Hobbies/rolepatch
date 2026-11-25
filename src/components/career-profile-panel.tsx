'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CareerRecordEditor, type RecordDraft } from '@/components/career-record-editor';
import { callCareer } from '@/lib/actions/career-records';
import {
  careerKinds,
  type CareerProfile,
  type CareerRecord,
  type CareerKind,
} from '@/lib/career-tools';

export function CareerProfilePanel({ profileId }: { profileId: string }) {
  const [sensitive, setSensitive] = useState(false);
  return (
    <section
      id="career-records"
      aria-labelledby="career-records-heading"
      className="min-w-0 space-y-4 rounded-xl border bg-card p-4 md:p-6"
    >
      <h2 id="career-records-heading" className="text-base font-semibold">
        Career profile
      </h2>
      <p className="text-sm text-muted-foreground">
        Keep career facts, approved wording and source links for future applications.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sensitive}
          onChange={(e) => setSensitive(e.target.checked)}
        />
        Include sensitive answers
      </label>
      <ProfileDetails
        key={profileId + String(sensitive)}
        profileId={profileId}
        sensitive={sensitive}
      />
    </section>
  );
}
type ProfileSelection = { profileId: string; sensitive: boolean };
type ProfileControls = ReturnType<typeof useCareerProfile>;
function useCareerProfile({ profileId, sensitive }: ProfileSelection) {
  const router = useRouter();
  const [profile, setProfile] = useState<CareerProfile>();
  const [records, setRecords] = useState<CareerRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [page, setPage] = useState<{ after: string | null }>({ after: null });
  const setAfter = (after: string | null) => setPage({ after });
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<CareerKind | ''>('');
  const [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<CareerRecord | 'new'>();
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<string>();
  const [bulkResult, setBulkResult] = useState<string[]>([]);
  const [editName, setEditName] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    async function load() {
      const result = await callCareer('rolepatch_profiles_get', {
        profile_id: profileId,
        include_sensitive: sensitive,
        sections: kind ? [kind] : undefined,
        query,
        include_archived: archived,
        limit: 20,
        cursor: page.after ?? undefined,
      });
      if (!active) return;
      if (!result.ok) throw new Error(result.error);
      if (
        'profile' in result &&
        'next_cursor' in result &&
        'records' in result &&
        Array.isArray(result.records)
      ) {
        setProfile(result.profile);
        setRecords(result.records);
        setCursor(result.next_cursor);
      }
    }
    load()
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load the career profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileId, sensitive, kind, query, archived, page]);
  async function mutate(tool: string, args: Record<string, unknown>) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await callCareer(tool, { profile_id: profileId, ...args });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if ('outcomes' in result && result.outcomes) {
        setBulkResult(
          result.outcomes.map((item, i) =>
            item.ok ? `Row ${i + 1} saved (${item.id})` : `Row ${i + 1} — ${item.error}`
          )
        );
      }
      setNotice(tool.endsWith('_archive') ? 'Profile archived.' : 'Saved.');
      setEditor(undefined);
      setConfirm(undefined);
      setEditName(false);
      setAfter(null);
      if (tool.startsWith('rolepatch_profiles_')) router.refresh();
    } catch {
      setError('Could not save. Your edits are still here.');
    } finally {
      setPending(false);
    }
  }
  function save(draft: RecordDraft) {
    void mutate('rolepatch_career_records_upsert', { ...draft, include_sensitive: sensitive });
  }

  return {
    profile,
    records,
    cursor,
    page,
    setAfter,
    query,
    setQuery,
    kind,
    setKind,
    archived,
    setArchived,
    editor,
    setEditor,
    pending,
    loading,
    error,
    setError,
    notice,
    confirm,
    setConfirm,
    bulkResult,
    editName,
    setEditName,
    mutate,
    save,
    sensitive,
  };
}
function ProfileDetails(selection: ProfileSelection) {
  const state = useCareerProfile(selection);
  const {
    profile,
    editor,
    pending,
    sensitive,
    save,
    setEditor,
    error,
    notice,
    page,
    setAfter,
    loading,
    records,
    cursor,
  } = state;
  return (
    <div className="min-w-0 space-y-4">
      {profile && <ProfileSettings controls={state} profile={profile} />}
      <RecordFilters controls={state} />
      {editor && (
        <CareerRecordEditor
          key={editor === 'new' ? 'new' : editor.id}
          record={editor === 'new' ? undefined : editor}
          pending={pending}
          includeSensitive={sensitive}
          onSave={save}
          onCancel={() => setEditor(undefined)}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}{' '}
          <button type="button" className="underline" onClick={() => setAfter(page.after)}>
            Reload
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading records…
        </p>
      ) : !error && !records.length ? (
        <p className="text-sm text-muted-foreground">No career records match this view.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {records.map((record) => (
            <CareerRecordRow key={record.id} record={record} controls={state} />
          ))}
        </ul>
      )}
      {(cursor || page.after) && (
        <div className="flex gap-2">
          {page.after && (
            <Button variant="outline" size="sm" onClick={() => setAfter(null)}>
              First page
            </Button>
          )}
          {cursor && (
            <Button variant="outline" size="sm" onClick={() => setAfter(cursor)}>
              Next page
            </Button>
          )}
        </div>
      )}

      <RecordImport controls={state} />
    </div>
  );
}
function ProfileSettings({
  controls,
  profile,
}: {
  controls: ProfileControls;
  profile: CareerProfile;
}) {
  const { pending, mutate, confirm, setConfirm, editName, setEditName } = controls;
  const [name, setName] = useState('');
  return (
    <div className="space-y-3 border-b pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="break-words">{profile.name}</strong>
        {profile.is_default && (
          <span className="text-sm text-muted-foreground">Default profile</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setName(profile.name);
            setEditName(!editName);
          }}
        >
          Rename
        </Button>
        {!profile.is_default && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              mutate('rolepatch_profiles_update', {
                is_default: true,
                expected_revision: profile.revision,
              })
            }
          >
            Make default
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirm('profile')}>
          Archive profile
        </Button>
      </div>
      {editName && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void mutate('rolepatch_profiles_update', {
              name,
              expected_revision: profile.revision,
            });
          }}
        >
          <label className="text-sm">
            Profile name
            <Input
              value={name}
              maxLength={160}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <Button size="sm" disabled={pending}>
            Save name
          </Button>
        </form>
      )}
      {confirm === 'profile' && (
        <div className="space-y-2 text-sm">
          <p>
            Archive this profile and remove it from the active list? Its records and versions will
            be retained.
          </p>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              mutate('rolepatch_profiles_archive', { expected_revision: profile.revision })
            }
          >
            Confirm archive
          </Button>{' '}
          <Button size="sm" variant="ghost" onClick={() => setConfirm(undefined)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
function RecordFilters({ controls }: { controls: ProfileControls }) {
  const { query, setQuery, kind, setKind, archived, setArchived, setAfter, pending, setEditor } =
    controls;
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 basis-full space-y-1 text-sm font-medium sm:flex-1">
          Search records
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setAfter(null);
              setQuery(e.target.value);
            }}
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Type
          <select
            className="block h-9 w-full rounded-md border border-input bg-background px-2"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as CareerKind | '');
              setAfter(null);
            }}
          >
            <option value="">All types</option>
            {careerKinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={pending} onClick={() => setEditor('new')}>
          Add record
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => {
            setArchived(e.target.checked);
            setAfter(null);
          }}
        />
        Include archived records
      </label>
    </>
  );
}
function CareerRecordRow({
  controls,
  record,
}: {
  controls: ProfileControls;
  record: CareerRecord;
}) {
  const { pending, setEditor, setConfirm, confirm, sensitive, mutate } = controls;
  return (
    <li className="min-w-0 space-y-2 p-3" key={record.id}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="break-all text-sm">{record.title}</strong>
        <span className="text-xs text-muted-foreground">
          {record.kind} ·{' '}
          {record.archived_at
            ? 'archived'
            : (record.data.verification_status ?? 'unverified').replaceAll('_', ' ')}
        </span>
      </div>
      {(record.data.approved_wording || record.data.value) && (
        <p className="break-words text-sm">{record.data.approved_wording || record.data.value}</p>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer">Record details</summary>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="text-muted-foreground">Record ID</dt>
            <dd className="break-all">{record.id}</dd>
          </div>
          {Object.entries(record.data).map(([key, value]) => (
            <div key={key}>
              <dt className="capitalize text-muted-foreground">{key.replaceAll('_', ' ')}</dt>
              <dd className="whitespace-pre-wrap break-words">
                {Array.isArray(value) ? value.join('\n') : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <div className="flex flex-wrap gap-2">
        {!record.archived_at && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditor(record)}>
            Edit
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirm(`record:${record.id}`)}
        >
          {record.archived_at ? 'Delete permanently' : 'Archive'}
        </Button>
      </div>
      {confirm === `record:${record.id}` && (
        <div className="space-x-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              mutate('rolepatch_career_records_delete', {
                id: record.id,
                expected_revision: record.revision,
                include_sensitive: sensitive,
                permanent: !!record.archived_at,
                confirm_id: record.archived_at ? record.id : undefined,
              })
            }
          >
            {record.archived_at ? 'Confirm permanent deletion' : 'Confirm archive'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(undefined)}>
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}
function RecordImport({ controls }: { controls: ProfileControls }) {
  const { pending, sensitive, bulkResult, setError, mutate } = controls;
  const [bulk, setBulk] = useState('');
  return (
    <details className="space-y-3 border-t pt-3 text-sm">
      <summary className="cursor-pointer font-medium">Import career records</summary>
      <label className="block space-y-1">
        Records as a JSON array
        <Textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={
            '[{"id":"role-1","kind":"employment","title":"Engineer","data":{"employer":"Example"}}]'
          }
        />
      </label>
      <Button
        variant="outline"
        size="sm"
        disabled={pending || !bulk.trim()}
        onClick={() => {
          try {
            const records: unknown = JSON.parse(bulk);
            void mutate('rolepatch_career_records_bulk_upsert', {
              records,
              include_sensitive: sensitive,
            });
          } catch {
            setError('Enter a valid JSON array.');
          }
        }}
      >
        Import records
      </Button>
      {bulkResult.length > 0 && (
        <ul>
          {bulkResult.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
