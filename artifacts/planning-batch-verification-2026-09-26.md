# Allocation, design brief and impact-review batch

Local implementation verified on 26 September 2026. All three modules were developed before the combined verification phase, following the supplied requirements/scope/design guide. These results cover this batch; they do not establish production acceptance or completion of the MD roadmap.

## Implemented

- **Allocation planning:** extends canonical requirement allocations with exact requirement revision pins, separate location/zone/department fields, optional owner and immutable revision history. Unknown quantity remains distinct from zero. Decimal arithmetic compares quantities without declaring an approved quantity rule, conversion or commercial allocation.
- **Design briefs:** extends canonical design packages with versioned brief metadata and exact requirement/allocation pins. A source change flags the brief for review; adopting current sources requires an explicit new revision. Files remain missing and no approval or production release is created.
- **Change impact:** compares retained source pins with current requirement/allocation revisions. Reviewers record immutable advisory assessments against the exact target version and impact fingerprint. Assessments do not automatically resolve stale drafts or change their source references.
- **Connected UI:** E3 branding, glass light/dark themes, English/Arabic, project selectors, sidebar/cockpit/portfolio navigation, explicit loading/error/access states, revision history and stable retry keys.
- **Authority:** current server session, internal membership, role permission and explicit project grant are required. Commands atomically persist domain changes, audit, outbox intent and durable receipt. Current authority and applicable nested source/owner checks run before replay. Legacy design HTTP routes return an unavailable response after checking project access.

Entry routes: [Allocation planning](http://localhost:3002/allocations/register), [Design briefs](http://localhost:3002/designs/register), [Change impact](http://localhost:3002/impact-review). Project counterparts are `/projects/:id/allocations`, `/projects/:id/design-briefs`, and `/projects/:id/impact-review`.

## Verification

| Check | Result |
|---|---|
| Combined regression | 93 files / 1,207 tests exercised: 1,205 passed, two new allocation fixtures failed because they omitted required revocation actor/time. Both fixtures were corrected. |
| Focused correction run | All five planning test files / **47 tests passed**, including all allocation, design, impact, API-client and contract tests. No second full-suite run is claimed. |
| Workspace TypeScript | All workspace checks passed after adding an explicit return to the source-selection rejection guard. |
| Workspace build | Web and all shared/worker packages built in the combined run. API declaration emit identified two unexported pin types; exporting them fixed the API follow-up build. All workspace outputs are built. |
| Final contract check | **6/6 passed** after updating verification metadata and matching design list limit 200, allocation limit 500 and history limit 500. Both OpenAPI mirrors are 1.6.0. |
| Live HTTP and persistence | **63/63 checks passed**, including actual process replacement, exact receipt replay, current permissions, cross-project isolation, stale-source rejection, explicit rebasing and retained history. |

Logs are `.local/planning-batch-tests.log`, `.local/planning-batch-focused-tests.log`, `.local/planning-batch-typecheck-final.log`, `.local/planning-batch-build.log`, `.local/planning-batch-api-build.log`, and `.local/planning-batch-contract-final.log`.

[HTTP evidence](./planning-batch-http-2026-09-26.json) records process replacement **9952 → 23372**, **16 audit events / 16 outbox intents / 16 command receipts**, and exact cleanup of two isolated organizations and five temporary users. No existing-user grants were changed. Tests use real server sessions with synthetic authentication disabled. The running local API log is `.local/planning-batch-api-runtime-restarted.log`.

[Migration evidence](./planning-batch-migrations-2026-09-26.json): migrations **0024–0026** and their ledger entries were applied in one transaction to verified loopback PostgreSQL. Ledger: **28 entries**. Before/after counts remained **75 users, 75 memberships, 13 projects and zero project grants**. No seed/reset or grant backfill was performed. The allocation-to-requirement scope foreign key uses `NOT VALID` to preserve existing legacy rows while enforcing new writes; this does not certify historical data consistency.

## Browser coverage and remaining limits

- Desktop English/dark navigation and access states checked for all three new routes. Branded glass surfaces, headings and navigation rendered correctly.
- Mobile Arabic/light checked at **390 × 844**. Effective content width and scroll width were both **380**, with no horizontal overflow. The design-brief access-state screenshot was inspected. English/dark and the normal viewport were restored.
- A clean reload reached the authenticated workspace. Retained console errors were development/HMR errors timestamped before the clean reload; no later error appeared in the inspected log.
- The signed-in user has no project grants. Browser evidence therefore covers themes, RTL, navigation and access states. Populated forms were not exercised in the browser; populated commands, conflicts and history were covered by isolated service/HTTP tests.

Allocation lists are capped at 500; comparisons use all controlled allocations with separately disclosed comparison truncation. Design lists are capped at 200. Revision history is capped at 500. The impact register inspects at most 200 eligible draft targets and labels its counts as that inspected subset.

Private retained files, scanning, controlled drawing approvals, client publication, production release, approved-baseline change authority, a configured quantity basis and BOQ/task propagation remain separate work. Impact assessments are advisory. Immutable update guards do not replace deployment retention privileges or independent recovery evidence. Other controllers and production security are not certified here.

The web bundle remains large: **2,237.87 kB minified / 517.56 kB gzip**. Vite reports its existing chunk-size warning; code splitting remains open.

## Candidate fingerprints (SHA-256)

| Artifact | Hash |
|---|---|
| apps/api/src/scope/allocation-register.service.ts | `c56c5bbc2c39b14e288f264fe7c91f79faf64f8b59e57bb3da6621d090da961a` |
| apps/api/src/designs/design-register.service.ts | `2e3eaeb07e050a0f726d58ac178d46a2f20527aca4f56fb93585b6d780037ded` |
| apps/api/src/scope/impact-register.service.ts | `e319ba01438948f943e995e933102ed8425bcc8b948412f5c7c2c95bf7673d82` |
| apps/web/dist/assets/index-CY6HPILd.js | `74ef783d8dd1e75f27e863a857455001d2a8d570fc43fc7932f0232860b181d6` |
| contracts/CORE_COMMANDS.openapi.yaml | `083ab3ef07d2d9777563b437b2fde4fbcc9f5e2b2d527f62976b96a621527a4b` |
