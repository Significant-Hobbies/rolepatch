---
title: Data model
---

# Data model

Cloudflare D1 is the signed-in persistence layer. The schema lives in
`src/lib/db-schema.sql` (source of truth — do not duplicate it here).
This page documents the table groups, the guest parity contract, and
the non-obvious constraints.

## Tables

Application tables are grouped by concern below.

| Group | Tables |
| --- | --- |
| **Identity** | `users` |
| **Resumes** | `resumes`, `career_records`, `tailored_resumes`, `cover_letters`, `career_resume_versions`, `career_resume_requests` |
| **Jobs** | `job_applications`, `application_events`, `application_create_requests`, `application_material_versions`, `saved_job_searches`, `saved_job_shortlist`, `job_discovery_alerts`, `company_watches` |
| **Evidence** | `achievement_evidence`, `interview_stories`, `skills_roadmaps`, `fit_scores`, `outreach_emails` |
| **Stash** | `stash_entries` |
| **Tokens / payments** | `token_balances`, `token_transactions`, `payments` |
| **Apply-agent** | `application_queue`, `application_receipts`, `profile_answers`, `recruiter_reply_events` |

Apply the numbered SQL migrations in order. The schema snapshot describes a
fresh application database. Better Auth and OAuth tables are defined in migrations
0002 and 0003.

The tracker migration adds a precise stage to each existing application and
records its last known stage as a migration snapshot. The migration maps the old interview status to screening and labels the initial
event as a migration snapshot. Earlier transition times are unknown.
The tracker and existing resume/apply workflows update the same application ID.
Event material references retain the exact revision linked at that time.

A career profile uses its existing `resumes.id`. Account-wide evidence and
reusable answers remain accessible as original sources. Profile-linked career
records keep their own IDs, verification state and revision. A generation
snapshot captures its profile revision, selected sources, target and Markdown.
Appending an edit creates another version ID. See the
[career access decision](decisions/0017-career-data-access.md).

## Guest parity contract

Existing guest tools use `src/lib/local-storage.ts` under `rt-*` keys.
The connected career database requires an account. Guest drafts and browser
records stay local until the user signs in. The guest contract follows.

1. **Same interface.** `getItems` / `setItems` are generic helpers that
   mirror the DB layer interface, so server actions can swap between DB
   and localStorage based on `getCurrentUserId()`.
2. **Guest writes never touch D1.** Server actions throw if `userId` is
   null on a write path — see
   [the security audit](../knowledge/security-audit.md) for the
   historical unauthenticated-write leak that motivated this.
3. **Guest reads return empty/null for cross-user queries.** `WHERE
   user_id IS NULL` queries must return empty arrays or null for
   unauthenticated requests, never another guest's data.
4. **Migration on sign-in.** `src/lib/actions/migration-actions.ts`
   bulk-inserts localStorage data into D1 with the user's id on first
   sign-in, then clears the `rt-*` keys.

See [ADR-0002](decisions/0002-guest-localstorage-parity.md) for why this
dual layer exists.

## Token system

`token_balances` (per-user balance, atomic debit), `token_transactions`
(per-change ledger with `balance_after` snapshot), `payments` (Dodo
payment idempotency — `dodo payment_id` as PK, `INSERT OR IGNORE`
prevents double-credit). The atomic debit is a single SQL statement:

```sql
UPDATE token_balances
SET balance = balance - 1, total_used = total_used + 1, updated_at = unixepoch()
WHERE user_id = ? AND balance >= 1
RETURNING balance
```

Payment insert + token credit are wrapped in a single D1 transaction
(see [the security audit](../knowledge/security-audit.md) — the original
implementation had a no-transaction bug where a failed `creditTokens`
left a payment recorded but tokens never granted, and the idempotency
check prevented retry).

## Apply-agent tables

- `application_queue` — review-first queue entries with readiness state
  (`ready_to_submit`, `blocked`, `submitted`, etc.).
- `application_receipts` — submitted/failed receipts with final visible
  ATS field snapshots and machine-readable failure codes.
- `profile_answers` — reusable sensitive profile answers learned from
  successful submitted receipts (file/upload fields ignored).
- `recruiter_reply_events` — inbound recruiter replies routed via
  Cloudflare Email Routing to per-user forwarding addresses.

See [ADR-0003](decisions/0003-apply-agent-review-first.md) for the
review-first boundary and the [apply-agent CLI
runbook](../operations/runbooks/apply-agent-cli.md) for the HTTP API.

## Migrations

Wrangler D1 migrations. Apply with `wrangler d1 migrations apply rolepatch`
(production) — never run migrations from agent sessions without explicit
approval. The single migration is
`migrations/0001_initial_schema.sql`; `src/lib/db-schema.sql` is the
canonical schema source (idempotent `CREATE TABLE IF NOT EXISTS`).
