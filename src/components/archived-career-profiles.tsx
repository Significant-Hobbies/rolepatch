'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { callCareer } from '@/lib/actions/career-records';

export function ArchivedCareerProfiles() {
  const router = useRouter();
  const [items, setItems] = useState<{ id: string; name: string; revision: number }[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function load(after?: string) {
    setPending(true);
    setError('');
    try {
      const result = await callCareer('rolepatch_profiles_list', {
        include_archived: true,
        limit: 100,
        cursor: after,
      });
      if (!result.ok) throw new Error(result.error);
      if ('profiles' in result) {
        setItems((old) => [
          ...(after ? old : []),
          ...result.profiles.filter((p) => p.archived_at !== null),
        ]);
        setCursor(result.next_cursor);
      }
    } catch {
      setError('Could not load archived profiles.');
    } finally {
      setPending(false);
    }
  }
  async function restore(id: string, revision: number) {
    setPending(true);
    setError('');
    try {
      const result = await callCareer('rolepatch_profiles_update', {
        profile_id: id,
        expected_revision: revision,
        restore: true,
      });
      if (!result.ok) throw new Error(result.error);
      setItems((old) => old.filter((profile) => profile.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore this profile.');
    } finally {
      setPending(false);
    }
  }
  return (
    <details
      className="space-y-3 rounded-xl border bg-card p-4 md:p-6"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary className="cursor-pointer text-sm font-medium">Archived career profiles</summary>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!error && !items.length && !pending && (
        <p className="text-sm text-muted-foreground">No archived profiles on this page.</p>
      )}
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading…
        </p>
      )}
      {items.map((profile) => (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"
          key={profile.id}
        >
          <span className="break-all text-sm">{profile.name}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => restore(profile.id, profile.revision)}
          >
            Restore profile
          </Button>
        </div>
      ))}
      {cursor && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => load(cursor)}>
          Load more
        </Button>
      )}
    </details>
  );
}
