# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Job seekers who want role-specific materials, a reviewable application queue, and evidence of what an assisted workflow filled or submitted.

## Product Purpose

RolePatch connects job discovery, resume tailoring, fit review, application preparation, Chrome-assisted ATS fill, and submission receipts without presenting unattended bulk apply as the product.

## Positioning

The differentiator is a review-first application packet and receipt trail: users can inspect fit evidence, generated materials, filled fields, blockers, and confirmation evidence before treating an application as submitted.

## Capabilities and Constraints

- Guest workflows use local browser storage; signed-in workflows can persist to the service.
- Browser-assisted submit refuses CAPTCHA, missing required answers, outstanding uploads, excluded companies, duplicate URLs, low fit, and daily-cap violations.
- Production deploys are manual.
- Product claims must preserve the boundary between assisted fill and unattended automation.

## Evidence on Hand

Verified shipped behavior lives in `PROJECT_STATUS.md`; the existing public release notes live in `CHANGELOG.md`; tests and production-smoke contracts live in `src/__tests__/`, `e2e/`, and `scripts/`.

## Product Principles

- Keep the user in control of every application.
- Preserve exact evidence and receipts.
- Explain blockers before automation runs.
- Make product claims no broader than verified behavior.

