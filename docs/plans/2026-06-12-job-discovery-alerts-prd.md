# Job Discovery and Alerts PRD

Date: 2026-06-12

## Problem

The product can tailor against a job URL, but it does not yet help users find and organize opportunities continuously. Users still need to search manually, copy links around, and remember which jobs are worth acting on.

## Goal

Add a job discovery layer with saved searches, alerts, and shortlist management so the app becomes a weekly job-hunting workflow instead of a one-off tailoring tool.

## Non-Goals

- Do not build a full job board crawler.
- Do not depend on fragile multi-board scraping if a narrower initial source is enough.
- Do not add email spam or aggressive notification behavior.

## Users

- Active job seekers who search multiple times per week.
- Users who want a shortlist before spending tokens on tailoring.

## Proposed Experience

### Search and save

- Let users run structured searches by:
  - title
  - company
  - location
  - remote / hybrid
  - seniority
  - keywords
- Allow saving a search as a recurring alert.

### Shortlist workflow

- Users can star or save jobs into a shortlist.
- Saved jobs can be linked directly into tailoring or interview prep.
- Surface duplicate detection so the same role is not saved repeatedly.

### Alerts

- Notify users when:
  - a saved search finds new matches
  - a shortlisted job changes or expires
  - a follow-up date is approaching

### Ranking

- Rank job results by fit score, keyword overlap, and recency.
- Let users filter low-fit jobs before they spend time tailoring.

## Data Model

Potential tables:

- `saved_searches`
- `job_alerts`
- `saved_jobs`

Minimum fields:

- search query and filters
- notification cadence
- last run timestamp
- match count
- user ownership

## Success Criteria

- Users can save a job search once and revisit it later.
- The app can surface new matches without manual searching.
- Saved jobs can flow directly into existing tailoring and interview prep.
- Users can maintain a shortlist without duplicating work.

## Risks

- Search quality depends on the reliability of the data source.
- Alerts need a strict relevance bar or they will be ignored.
- This can become expensive if the job source is too broad too early.

