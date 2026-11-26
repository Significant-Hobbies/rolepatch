import type { ApplicationAnalytics, ApplicationAnalyticsRange } from '@/lib/tracker-store';
import { displayChoice } from './application-tracker-fields';

const monthLabel = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});
const ranges: ApplicationAnalyticsRange[] = [30, 90, 365];

export function ApplicationAnalyticsSummary({
  days,
  data,
  error,
  onChange,
  onRetry,
}: {
  days: ApplicationAnalyticsRange;
  data?: ApplicationAnalytics;
  error?: string;
  onChange: (days: ApplicationAnalyticsRange) => void;
  onRetry: () => void;
}) {
  const peak = Math.max(1, ...(data?.months.map(({ count }) => count) ?? []));
  const metrics = [
    ['Submitted', data?.total],
    ['Reached screening or interview', data?.interviewed],
    ['Reached offer', data?.offers],
  ] as const;
  return (
    <section aria-label="Application analytics" className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Application analytics</h3>
          <p className="text-sm text-muted-foreground">Based on recorded submission dates (UTC).</p>
        </div>
        <select
          aria-label="Analytics date range"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={days}
          onChange={(event) => {
            const selected = ranges.find((range) => String(range) === event.currentTarget.value);
            if (selected) onChange(selected);
          }}
        >
          {ranges.map((range) => (
            <option key={range} value={range}>
              Last {range} days
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p role="alert" className="text-destructive">
            {error}
          </p>
          <button type="button" className="underline underline-offset-4" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 border-y py-3 sm:grid-cols-3">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {data.total > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-medium">Submissions by month</h4>
                <ul className="space-y-1.5 text-sm">
                  {data.months.map(({ month, count }) => (
                    <li key={month} className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2">
                      <time dateTime={month}>
                        {monthLabel.format(new Date(`${month}-01T00:00:00Z`))}
                      </time>
                      <span
                        aria-hidden="true"
                        className="h-2 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${(count / peak) * 100}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium">Current stages</h4>
                <dl className="space-y-1.5 text-sm">
                  {data.stages.map(({ stage, count }) => (
                    <div key={stage} className="flex items-center justify-between gap-3">
                      <dt>{displayChoice(stage)}</dt>
                      <dd className="tabular-nums">{count}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No dated submissions in this period.</p>
          )}
          {data.undated > 0 && (
            <p className="text-sm text-muted-foreground">
              {data.undated} {data.undated === 1 ? 'application has' : 'applications have'} no
              recorded submission date and are outside the period totals.
            </p>
          )}
        </>
      )}
    </section>
  );
}
