# Access administration batch verification

Implemented together before validation: project access register, ordinary membership role changes, membership restoration, server role reference, and connected project creation/access states. The supplied current-decisions MD and security specification guided scope. This is a local increment, not production acceptance.

## Database and runtime

Migrations 0016 and 0017 applied in one explicit local PostgreSQL transaction with ledger entries. Before/after migration: 75 users, 75 memberships, 13 projects; zero grants inserted. Ledger has 19 entries. No seed/reset was run. API restarted from rebuilt artifacts on port4000 (PID8812), synthetic authentication disabled. Vite preview remains port3002.

## Combined checks and corrections

The first full run passed 985 tests and found 9 failures plus one suite import failure. Corrections addressed a route-parameter type, strict fixture setup/organization mismatch, the client portal's missing-project crash, and a test metadata import. The seed-import test's timeout under concurrent build/test load passed in the focused retry without weakening its checks.

After fixes: whole-monorepo TypeScript and build passed. The focused backend/contract run passed104 of105; its single remaining fixture organization mismatch was then corrected and all22 audit tests passed. Membership administration27, project access17, contract9, API23 and seed-startup7 tests are covered by these passing focused runs (see local logs for actual file totals). Web rendering77 and access client11 passed. The whole suite was not repeated after the focused corrections. A final dialog-spacing-only change was built afterward; it changes no command behavior.

## Live HTTP

36/36 checks passed using isolated loopback actors and projects. This covers durable draft creation, no automatic owner/admin grant, grant creation/change/replay, viewer/editor and role intersection, cross-org rejection, client-safe detail, internal client-view denial, membership versions, role-change/restoration replays, invalidated sessions and fresh-grant restoration. Eight committed commands produced exactly8 audit entries,8 outbox rows and8 receipts. Temporary fixtures were removed by their exact owned IDs. No existing memberships/grants were changed and no external transport ran. An initial helper expectation treated auth/me unauthenticated as401; the existing contract returns200 with authenticated:false. The helper was corrected and rerun after exact cleanup; no auth implementation changed for that correction.

## Visual check

Live in-app browser inspected project-access register and grant dialog, scoped membership search and role-change confirmation, server role reference, dark desktop and light Arabic mobile at390×844. Mobile document scrollWidth380 stayed within viewport390. Required-reason grant confirmation was disabled. Role confirmation showed current version and global-session sign-out impact. All inspected dialogs were cancelled; no user access decisions were submitted through the browser. Original English/dark settings and default viewport were restored. Project access is left open at http://localhost:3002/admin/access.

## Limits retained

Recent-MFA privileged-role governance, all-controller project/audience/classification enforcement, client published financial/approval content, invitation delivery and production deployment remain open. Legacy project clone/closure/activity mutations explicitly return503 until made durable. New grants are not automatically assigned to existing records. Existing large-bundle warning remains (about2.53MB minified).
