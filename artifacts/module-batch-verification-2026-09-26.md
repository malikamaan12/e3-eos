# Project module batch — 26 September 2026

Implemented the work package/task register, document draft/revision metadata, internal report snapshots, and scoped portfolio together before one combined verification phase. Follow-up execution was limited to correcting discovered failures and checking the affected paths.

## Delivered behavior

- `/work-register` and `/projects/:id/work`: create packages and tasks, record completion with reason, optional evidence and current version. Task completion does not accept a package's output.
- `/documents/register` and `/projects/:id/document-register`: register draft metadata and revision metadata; show missing files and unverified legacy records truthfully. No uploaded file, scan, approval or download is invented.
- `/reports` and `/projects/:id/reports`: capture immutable internal drafts from canonical project/stage/activity records, inspect source references and history, create a new version without replacing the previous snapshot.
- `/portfolio`: aggregate only projects with current explicit grants. No fabricated financial totals or fallback projects.
- Server commands recheck current membership, project grant, audience and action permission; document classification and field assignment also apply. Mutation, audit, outbox and retry receipt commit together.
- EN/AR screens use the existing E3 glass/3D light/dark design. Navigation and cockpit task/document entrypoints use the new flows. OpenAPI mirrors are version 1.4.0.

## Database and build

- Migrations 0018–0020 applied in one transaction with ledger entries on verified loopback PostgreSQL. Counts before and after migration: 75 users, 75 memberships, 13 projects. No grant backfill; ledger 22. [Migration evidence](module-batch-migrations-2026-09-26.json).
- Whole workspace build passed. All seven other workspace TypeScript checks passed; the API's Zod narrowing issue was corrected, compiled in the successful build, and its final `tsc --noEmit` passed.
- `git diff --check` passed. Existing large web bundle warning remains (approximately 2.50 MB uncompressed main bundle).

## Regression evidence

- The single full run reported 995 passing tests, 6 failures and one web-suite transform failure. Failures were a portfolio JSX error, a strict union/narrowing integration issue, a revocation test fixture missing required provenance, a changed route title and old tests expecting demo data or unauthenticated task/schedule behavior.
- Corrected focused checks: web and work **93/93**; document and module contracts **17/17**; durable task persistence and structural constraints **25/25**. The focused client/route/membership contract run also passed those three files (**20 tests**); its remaining web expectation was subsequently corrected and covered by the 93-test run.
- Old fixture tests now use actual scoped sessions/packages for durable task persistence, or explicitly assert unavailable responses. Production constraints were not weakened.
- No final full-suite rerun is claimed. Logs: `.local/module-batch-tests.log`, `.local/module-batch-focused-web.log`, `.local/module-batch-focused-web-final.log`, `.local/work-regression-focused.log`, `.local/module-batch-build.log`, `.local/module-batch-api-typecheck-final.log`.

## Live HTTP and process persistence

[80/80 live checks passed](module-batch-http-2026-09-26.json). The helper used exact-owned temporary organizations, users, sessions, projects and grants, then removed them. Existing users and their grants were not changed by the live check.

Checks covered create/read/replay, stale versions, audience/role/grant denial, nested project isolation, field assignment, document classification, metadata-only file states, immutable report history, portfolio filtering, and matching audit/outbox/receipt identities. API restart **39780 → 19180** retained completion, document revision and report revision receipts and report hashes/history. Synthetic authentication remained disabled; no seed/reset, deployment or external message was performed.

## Browser observations and limits

- Desktop dark portfolio: actual zero-grant totals, glass metric cards and working module navigation. No fabricated projects appeared.
- Work and document entrypoints: correct project selectors and access-required states.
- Reports: mobile 390 × 844, Arabic/light; rendered content width matched viewport (380 CSS px), with no horizontal overflow. E3 branding and bottom navigation remained usable.
- Returned to desktop English/dark and `/portfolio`. No existing-user access changes or domain commands were submitted through the browser.
- The signed-in account has no explicit project grants. Populated forms and command success were therefore verified at the HTTP/service layer, not through this user's browser account. This is not full human UAT.

File upload/scanning/approval/publication, vault delivery, submission packs, formal work acceptance, schedule authoring, financial reporting, privileged approvals and the broader P00 boundary remain unfinished. Other legacy business controllers are not certified by this batch.
