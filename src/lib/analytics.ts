/**
 * Owner-facing analytics — the fixed 4-event taxonomy.
 *
 * Every project in the fleet emits exactly these four events so PostHog can
 * build one cross-fleet funnel (signup -> activated -> core_action) and a
 * D1/D7 retention insight without any custom dashboard.
 *
 * Every event carries `project: "resume-tailor"`. This wrapper is intentionally
 * thin so it can later be promoted into `@saas-maker/posthog-client`.
 *
 * It is isomorphic: in the browser it routes through `@saas-maker/posthog-client`
 * (`track`); inside a server action it posts to the PostHog capture API so the
 * 4 events still land for server-side triggers (`activated`, `core_action`).
 *
 * NOTE: `@saas-maker/posthog-client` (the browser entry) bundles
 * `PostHogProvider`, which calls `React.createContext` at module-evaluation
 * time. A static top-level import would therefore execute `createContext`
 * during SSR / `next build` page-data collection and crash with
 * "createContext is not a function" (this module is imported by Server
 * Components / server actions). The browser client is only needed inside the
 * browser branch of `emit()`, so it is loaded lazily via dynamic `import()`
 * there. The server path uses a raw `fetch` and pulls in nothing React.
 */

const PROJECT = 'resume-tailor' as const;

// Shared with foundry-monitoring.ts — same PostHog project.
const POSTHOG_KEY = 'phc_qgiAarw4Co4pw9fz3Fxj4UJaHmqzFetqs4JrXhGc35Nd';
const POSTHOG_HOST = 'https://us.i.posthog.com';

/** The product-specific action behind a `core_action` event. */
export type CoreAction =
  | 'tailor_completed'
  | 'cover_letter_generated'
  | 'fit_score_run';

interface AnalyticsEventMap {
  /** First session after an account is created. */
  signup: { project: typeof PROJECT };
  /** The user reaches first real value — their first successful tailor run. */
  activated: { project: typeof PROJECT };
  /** The thing the product exists to do. */
  core_action: { project: typeof PROJECT; action: CoreAction };
  /** A return session by a user with prior activity. */
  returned: { project: typeof PROJECT };
}

function emitServer(event: string, props: Record<string, unknown>, distinctId?: string) {
  // Fire-and-forget: analytics must never block or break a server action.
  void fetch(`${POSTHOG_HOST}/i/v0/e/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      distinct_id: distinctId ?? `${PROJECT}-server`,
      properties: props,
    }),
  }).catch(() => {
    // Swallow — best-effort only.
  });
}

function emit<K extends keyof AnalyticsEventMap>(
  event: K,
  props: Omit<AnalyticsEventMap[K], 'project'>,
  distinctId?: string,
) {
  const payload = { project: PROJECT, ...props };
  try {
    if (typeof window === 'undefined') {
      emitServer(event, payload, distinctId);
    } else {
      // Browser context. Load the browser client lazily so the
      // React-dependent `@saas-maker/posthog-client` entry is never evaluated
      // during SSR / `next build`.
      void import('@saas-maker/posthog-client')
        .then(({ track }) => {
          track(event, payload);
        })
        .catch(() => {
          // Analytics must never break a user flow. Swallow and move on.
        });
    }
  } catch {
    // Analytics must never break a user flow.
  }
}

/** Fire once, on the first session after an account is created. */
export function trackSignup() {
  emit('signup', {});
}

/** Fire once, when the user completes their first successful resume tailor. */
export function trackActivated(distinctId?: string) {
  emit('activated', {}, distinctId);
}

/** Fire on each completion of the core product action. */
export function trackCoreAction(action: CoreAction, distinctId?: string) {
  emit('core_action', { action }, distinctId);
}

/** Fire on session start for a user who has prior activity. */
export function trackReturned() {
  emit('returned', {});
}
