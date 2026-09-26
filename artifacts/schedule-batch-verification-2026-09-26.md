# Schedule batch verification — 2026-09-26

Status: implemented and locally verified within the boundaries below. This is the eighth connected implementation batch, covering manual task forecasts, dependency planning and a calendar backed by saved project data. It does not establish human UAT sign-off, P00 closure or production acceptance.

## Delivered behavior

- Canonical task forecasts with exact offset instants, retained IANA source timezone, expected task/forecast versions, reason, immutable revisions and clear-forecast history. Forecast changes do not change actual completion or an approved baseline.
- Scoped canonical FS/SS/FF dependencies with duplicate, self-link and cycle rejection, current task versions, stable retry receipts, immutable create/archive history and timing consistency indicators. No automatic task movement or execution approval.
- Project schedule register, cockpit integration and scoped UTC month/agenda calendar replacing fixed sample calendar events. Existing E3 glass styling, language controls and light/dark themes remain in use.
- Current tenant, internal membership, project grant and action authority checks, including assignment-only field visibility and current authorization before stored receipt replay.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| Database migration | Migrations 0027–0028 applied transactionally; ledger 30; unchanged 75 users, 75 memberships, 13 projects and zero project grants | `schedule-batch-migrations-2026-09-26.json` |
| Workspace typecheck | Passed | `.local/schedule-batch-typecheck.log` |
| Combined regression | 96 files / 1,234 tests: 1,229 passed; five dependency failures shared a PostgreSQL UUID/text parameter mismatch | `.local/schedule-batch-tests.log` |
| Focused correction | Explicit UUID/text casts corrected the insert; all 27 scheduling service/client/OpenAPI tests passed afterward | `.local/schedule-batch-focused.log` |
| Workspace build | Passed | `.local/schedule-batch-build.log` |
| Final web typecheck/build | Passed after calendar filter/error-state and cockpit label refinements | `.local/schedule-batch-web-final.log` |
| Live HTTP and restart | 58/58 passed; API restarted from PID 34460 to 29040; forecast/dependency receipts and histories survived | `schedule-batch-http-2026-09-26.json` |
| Atomic command records | 21 audit events, 21 outbox records and 21 durable receipts for isolated fixture commands | `schedule-batch-http-2026-09-26.json` |
| Fixture cleanup | Two isolated organizations and six owned users removed; existing project grants unchanged | `schedule-batch-http-2026-09-26.json` |
| Patch whitespace | Passed before documentation finalization; existing line-ending warnings were informational | Recorded local command result |

No second full regression run is claimed. The focused run covers the five discovered failures after their shared implementation correction. OpenAPI mirrors are version 1.7.0 with scheduling routes marked implemented and locally verified.

## Browser coverage

Desktop English/dark checks covered the schedule access state, calendar month navigation and return to the current month. Arabic/light checks at 390 × 844 covered the calendar header, metrics, controls and empty agenda. Content/scroll width was 380 pixels on the mobile viewport, without horizontal overflow. Desktop viewport width was 1,183 pixels and scroll width 1,173 pixels. The user tab was left on `/calendar` with English/dark restored and viewport reset.

The signed-in account has no project grants. Populated schedule forms and month cells were therefore not visually exercised; populated writes and reads were exercised through isolated service/HTTP fixtures. No existing account was granted access for testing. A final clean reload produced no new console errors. Earlier development hot-reload context errors preceded that reload; this batch does not claim to fix hot reload.

## Bounds and remaining work

- Timeline: at most 500 tasks, 1,000 active dependencies and 200 archived dependencies, with limits disclosed. Calendar: at most a 366-day query window and 1,000 saved forecast overlaps. History reads are bounded to 500 entries.
- Forecast authoring is limited to open tasks in active packages. Legacy or inconsistent controlled dependency state blocks graph expansion.
- Saved-date consistency is advisory. Approved baselines, working calendars, recurring periods, milestones, dependency lag, resource/capacity leveling and automatic or governed rescheduling remain open.
- Existing frontend bundle warning remains: final JavaScript bundle 2,180.92 kB minified / 508.01 kB gzip. This batch does not claim bundle optimization.
- The API remains local with durable outbox configuration. No connector activation, production deployment, grant backfill or release acceptance was performed.

## Finalization note

After implementation and verification, automatic approval review could not authorize additional terminal reads because its usage limit was reached. Those final reads did not execute. This evidence records previously completed checks; it does not claim a subsequent terminal check after documentation edits.
