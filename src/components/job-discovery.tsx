'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, MapPin, Building2, DollarSign, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { createJobApplication } from '@/lib/actions/job-actions';

interface DiscoveredJob {
  id: string;
  site?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  is_remote?: boolean | null;
  date_posted?: string | null;
  job_type?: string | null;
  min_amount?: number | null;
  max_amount?: number | null;
  currency?: string | null;
  job_url?: string | null;
  description?: string | null;
  description_short?: string | null;
}

interface JobDiscoveryProps {
  resumes: { id: string; name: string }[];
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null): string | null {
  if (min == null && max == null) return null;
  const cur = currency ?? 'USD';
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);
  if (min != null && max != null) return `${cur} ${fmt(min)}–${fmt(max)}`;
  if (min != null) return `${cur} ${fmt(min)}+`;
  return `${cur} up to ${fmt(max!)}`;
}

export function JobDiscovery({ resumes }: JobDiscoveryProps) {
  const router = useRouter();
  const { isGuest } = useAuth();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<DiscoveredJob[]>([]);
  const [tailoringId, setTailoringId] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          location: location.trim() || undefined,
          remote: remote || undefined,
          results_wanted: 25,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        let msg = `Search failed (${res.status})`;
        try {
          const json = JSON.parse(body);
          msg = json.error ?? json.detail ?? msg;
        } catch { /* keep default */ }
        throw new Error(msg);
      }

      const data = (await res.json()) as { jobs?: DiscoveredJob[] };
      setResults(data.jobs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTailor(job: DiscoveredJob) {
    if (!job.job_url || !resumes.length) return;
    setTailoringId(job.id);
    try {
      const jobId = await createJobApplication(
        resumes[0].id,
        job.job_url,
        job.company ?? 'Unknown Company',
        job.title ?? 'Untitled Role',
        job.description ?? job.description_short ?? '',
        job.description ?? job.description_short ?? '',
      );
      router.push(`/tailor/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
      setTailoringId(null);
    }
  }

  if (isGuest) {
    return (
      <div className="border border-dashed border-[var(--border)] rounded-2xl py-12 px-6 text-center bg-muted/10">
        <Sparkles className="w-6 h-6 mx-auto text-[var(--muted-foreground)]/40 mb-3" />
        <p className="text-sm font-bold text-foreground">Sign in to discover jobs</p>
        <p className="text-xs font-medium text-[var(--muted-foreground)] mt-1">
          Pulls live openings from Indeed, LinkedIn, Google, Glassdoor, and ZipRecruiter.
        </p>
      </div>
    );
  }

  const needsResume = resumes.length === 0;

  return (
    <div className="space-y-6">
      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="bg-[var(--card)] border border-[var(--border)]/60 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_auto_auto] gap-3 items-end"
      >
        <div>
          <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-1.5">
            What
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="python engineer, staff PM, ..."
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-1.5">
            Where (optional)
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="San Francisco, Remote, ..."
            className="input-base"
          />
        </div>
        <label className="inline-flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remote}
            onChange={(e) => setRemote(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          Remote
        </label>
        <button
          type="submit"
          disabled={loading || !query.trim() || needsResume}
          className="px-5 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
        >
          {loading ? 'Searching…' : 'Discover jobs'}
        </button>
      </form>

      {needsResume && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Create a resume first — tailoring needs a base to work from.
        </p>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((job) => {
            const salary = formatSalary(job.min_amount, job.max_amount, job.currency);
            return (
              <div
                key={job.id}
                className="bg-[var(--card)] border border-[var(--border)]/60 rounded-2xl p-5 flex flex-col gap-3 hover:border-[var(--primary)]/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground truncate">
                      {job.title ?? 'Untitled role'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] mt-1">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{job.company ?? 'Unknown company'}</span>
                    </div>
                  </div>
                  {job.site && (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-muted text-[var(--muted-foreground)]">
                      {job.site}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                      {job.is_remote ? ' · Remote' : ''}
                    </span>
                  )}
                  {salary && (
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {salary}
                    </span>
                  )}
                  {job.date_posted && <span>Posted {job.date_posted.slice(0, 10)}</span>}
                </div>

                {job.description_short && (
                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-3 opacity-80">
                    {job.description_short}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-auto pt-2">
                  <button
                    onClick={() => handleTailor(job)}
                    disabled={needsResume || tailoringId === job.id}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {tailoringId === job.id ? 'Saving…' : 'Tailor this'}
                  </button>
                  {job.job_url && (
                    <a
                      href={job.job_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <p className="text-xs text-[var(--muted-foreground)] opacity-70">
          Search pulls live openings from Indeed, LinkedIn, Google, Glassdoor, and ZipRecruiter. First search may take 10–30s on cold start.
        </p>
      )}
    </div>
  );
}
