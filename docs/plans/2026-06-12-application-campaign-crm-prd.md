# Application Campaign CRM PRD

Date: 2026-06-12

## Problem

Users can tailor resumes and generate interview prep, but the product still stops short of helping them manage the full application pipeline. Once a job is saved, there is no dedicated workflow for follow-ups, deadlines, status changes, notes, outreach, or outcome tracking beyond the current dashboard basics.

## Goal

Turn the dashboard into a lightweight application CRM that helps users move each job from "applied" to "interview" to "offer" with explicit follow-up actions and a clear history of what happened.

## Non-Goals

- Do not build a full ATS replacement.
- Do not add team collaboration or shared pipelines.
- Do not require a sign-in wall; guest mode must still work.

## Users

- Job seekers applying to many roles at once.
- Power users who want a single place to track outreach, callbacks, and outcomes.

## Proposed Experience

### Dashboard upgrades

- Show each job as a compact pipeline card with status, next action, and due date.
- Allow inline status changes for `draft`, `tailored`, `applied`, `interview`, `offer`, and `rejected`.
- Surface overdue follow-ups and interviews happening soon.
- Add quick actions for:
  - mark as followed up
  - add note
  - set next reminder
  - record salary / offer details

### Job detail drawer

- Expand a job into a side panel with:
  - application timeline
  - notes
  - outreach history
  - next follow-up date
  - interview dates
  - offer / rejection outcome

### Follow-up workflow

- After status becomes `applied`, prompt the user to schedule a follow-up.
- After status becomes `interview`, prompt the user to record interview date and prep notes.
- After status becomes `offer`, prompt the user to record compensation details.

## Data Model

Extend `job_applications` with:

- `notes`
- `follow_up_at`
- `interview_date`
- `salary_min`
- `salary_max`
- `salary_currency`
- `offer_amount`
- `rejection_reason`

Optional future table:

- `job_events` for timeline entries and audit history.

## Success Criteria

- Users can manage application status changes inline on the dashboard.
- Users can record follow-up and outcome metadata without leaving the dashboard.
- Overdue follow-ups and upcoming interviews are visible at a glance.
- Guest mode remains fully functional with localStorage-backed persistence.

## Risks

- Timeline UX can get noisy if every action is surfaced equally.
- Notes and reminders need restrained UI so the dashboard does not become a form dump.
- Any server-side tracking must preserve the repo’s guest/user split.

