# Requirement intake, clarification and field-note batch

Local candidate verified on 26 September 2026. The three modules were implemented together, then checked in one consolidated phase with focused UI and contract follow-ups. This is implementation evidence, not a production release or phase acceptance.

## Implemented

- **Requirement intake:** manual drafts in the existing canonical requirement table, original wording separate from interpretation, exact decimal quantities including zero, unknown values preserved, stable identity and immutable revision snapshots with hashes. Revisions require the reviewed version and a reason. Legacy, archived and approved records cannot be revised through intake. Snapshot integrity does not verify the source or approve scope.
- **Clarification register:** internal questions with source attribution, owner and optional deadline/respondent/requirement revision. Responses retain the actual recording actor separately from attributed authorship. Reopening preserves prior answers and immutable action history. Recording a response does not send it externally or approve a requirement.
- **Field notes:** text captures retained under organization/user/project scope on the device; explicit synchronization; immutable server observations and matching audit/event receipts. Stable client-operation identity deduplicates retries even across different transport keys. A stale task version produces an observation with a conflict, without changing the task. Current grants, role and field assignment are checked again before receipt replay.
- **Connected UI:** portfolio links, sidebar navigation, project routes and cockpit tabs. E3 branding and existing glass/3D light and dark styling retained. English/Arabic labels, loading/error states, version conflicts and history truncation disclosures included. Earlier media captures remain available separately and provisional.

Routes: `/requirements/register`, `/clarifications/register`, `/field/notes`, and the corresponding `/projects/:id/requirements`, `/projects/:id/clarifications`, `/projects/:id/field-notes` routes. Preview: http://localhost:3002/requirements/register.

## Verification

| Check | Result |
|---|---|
| Workspace TypeScript | All workspace checks passed |
| Combined regression | **87 files / 1,151 tests passed**; `.local/control-batch-tests.log` |
| Workspace build | Passed; `.local/control-batch-build.log` |
| Final UI follow-up | Web TypeScript/build passed after validation, legacy-null typing, attribution and spacing corrections; `.local/control-batch-web-final.log` |
| OpenAPI follow-up | **25 tests passed** across three contract files, including nine new control-register checks; no second full-suite run claimed |
| Live HTTP | **86/86 checks passed**, including current authority, nested project scope, stale versions, immutable history, retries and restart persistence |
| Whitespace | `git diff --check` passed; an existing CRLF normalization warning is informational |

[HTTP evidence](./control-batch-http-2026-09-26.json) records API process replacement **24428 → 39392**, unchanged original receipts after restart, **22 audit events / 22 outbox events / 24 transport receipts** (two intentional field retry aliases), and exact cleanup of two isolated organizations and seven test users. No existing-user grants were changed by that HTTP exercise. The helper used session-backed requests with synthetic authentication disabled. Logs: `.local/control-batch-http.log` and `.local/control-batch-api-runtime-restarted.log`.

[Migration evidence](./control-batch-migrations-2026-09-26.json): additive migrations **0021–0023** applied with their ledger entries in one transaction to verified loopback PostgreSQL. Ledger now **25**. Migration before/after counts were **75 users, 75 memberships, 13 projects, zero project grants**. No seed/reset or grant backfill was performed in this batch.

## Browser coverage and limits

- Desktop English/dark: new portfolio links, requirement intake, clarification and field-note routes. Glass card edges, branded header, navigation and access-state copy displayed correctly. Width **1173 / scroll width 1173**.
- Mobile Arabic/light at requested **390 × 844**: all three module headings/navigation checked; clarification screenshot reviewed. Effective content width **380 / scroll width 380**, with no horizontal overflow. The remaining 10 pixels belong to the browser scrollbar.
- Returned to English/dark, reset the viewport override, and left Requirement intake open. A clean reload reached the authenticated register with **no new console errors**. Earlier retained development/HMR errors predated that final clean-load check.
- The signed-in account has **zero project grants**. Browser checks therefore cover navigation, themes, RTL and access states; they do not establish populated form interaction or physical-device/offline acceptance. Populated commands, histories and conflicts were exercised through isolated service/HTTP fixtures. Local queue custody and mismatched-receipt handling are covered by unit tests.

The web build still warns about its large JavaScript bundle (about **2.33 MB minified / 536 KB gzip**); code splitting remains open. The queue is browser storage, not a guaranteed offline application shell. Media upload/scan, safety incident handling, approved-scope publication, parser publication, downstream allocation, notification delivery and full reconciliation remain separate work. Legacy scope and field sync/media/qualification HTTP workflows return explicit unavailable responses instead of issuing in-memory success receipts. Other controllers are not certified by this batch.

## Candidate fingerprints (SHA-256)

| Artifact | Hash |
|---|---|
| API requirement-intake service | `BC1BA14990C65C7551D59DC1592DA631A8A5873D86CD1F74575EF5C2DE9DA7E1` |
| API clarification-register service | `561DE8369C2DEA8CCA0B4A1283A8D80E1A7F6CC0EFF9EAA20DDD3AEC85ADB1DF` |
| API field-observations service | `4C46B528620CB6B3AD4766269B78BFA63A5B377EA33F516EC3D7B62D8D8AC0CE` |
| Web `index-BZ0S_tEW.js` | `B207E11BA0A39E0CF3BC882EBEE2F2A8115299E1B27ED8E3963022E2541E38AA` |
| OpenAPI 1.5.0 mirrors | `23568C85679A501662DC00722DD123E229BC53F7A9625EF489FDEB5ED562538C` |
