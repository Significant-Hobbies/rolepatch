---
title: ADR-0017 — Scoped assistant access to career data
---

# Scoped assistant access to career data

**Status** Proposed on the career database branch.

## Context

A candidate may connect one assistant to read a resume and another to maintain
job applications. A grant made when RolePatch offered four resume tools did
not include permission to edit employment history, disclose sensitive answers
or remove application materials.

## Decision

Keep one remote MCP endpoint. Check the scopes of the requested operation
against both the presented OAuth token and current consent before entering
the shared owner-scoped domain actions. Settings displays the permissions
from the provider-validated request. Require a separate permission and an
explicit tool argument for sensitive answers.

Use the existing resume and job identities for both interfaces. Retain a
separate immutable copy of materials associated with an application. A tracker
status entered by a user or assistant records their report. Only the existing
reviewed submission workflow can produce its own external receipt.

## Consequences

Existing clients can continue using their original resume operations.
An assistant that takes on a new responsibility needs fresh consent.
The finite API token remains restricted to its original purpose. The browser
and remote client can inspect the same records after reconnecting.
