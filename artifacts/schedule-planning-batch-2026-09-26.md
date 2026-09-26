# Schedule planning batch — 26 September 2026

Implemented working-calendar definitions, milestone planning and frozen baseline candidates together before verification, as requested. UI entry: project selection in `/schedule`, then Working calendars, Milestones or Baseline candidates. Existing E3 glass components, English/Arabic labels and dark/light theme tokens are reused.

Working calendar revisions retain weekday intervals and local-date exceptions. Milestone revisions preserve unknown dates and earlier targets. Baseline candidates freeze reviewed task/dependency/definition sources, reject stale previews and provide read-only comparisons with current planning. Candidates are explicitly unapproved; the governed publication/amendment workflow remains open.

Migration: `0029_schedule_planning_register.sql`. API: seven operations under `/projects/{projectId}/schedule-register`; OpenAPI mirrors version 1.8.0. Access uses current internal membership, explicit project grants and work-planning permissions. Assignment-only field users cannot retrieve project-wide snapshots. Existing account/project grants are unchanged by implementation.

## Completion checks

- Migration applied transactionally to loopback PostgreSQL; ledger now 31. Before/after counts remained 75 users, 75 memberships, 13 projects and zero project grants. Evidence: `schedule-planning-migration-2026-09-26.json`.
- One focused check passed **3 files / 13 tests**: six database-backed planning cases, three client retry/error cases and four existing schedule contract cases. The database cases cover immutable revisions/candidates, concurrent stale revisions, stale previews, retained unknowns, calendar validation, integrity conflicts, viewer/field boundaries and revoked receipt replay. Exact fixture cleanup completed through the test hooks. Log: `.local/schedule-planning-focused.log`.
- API and referenced package build passed (`.local/schedule-planning-api-build.log`); web TypeScript check passed (`.local/schedule-planning-web-typecheck.log`); web production build passed (`.local/schedule-planning-web-build.log`). The existing bundle-size warning remains: 2,203.61 kB minified / 513.28 kB gzip.
- Local API restarted from verified PID 29040 to PID 27172 and reported successful startup on port 4000. Runtime log: `.local/schedule-planning-api-runtime.log`. The Vite preview remains on port 3002.
- `git diff --check` passed before this final documentation update; existing CRLF warnings were informational.

No full regression, broad audit, new live-HTTP acceptance run or browser walkthrough is claimed for this increment. The 13 tests passed on their first run; no repeated test cycle was used.

## Remaining boundaries

- Calendars are retained planning definitions. They do not calculate working-time schedules, resolve DST gaps/folds, auto-reschedule work or reserve crew/venue capacity.
- Planning milestones are separate from protected contractual dates and acceptance records.
- Candidates do not publish or replace approved baselines. Approval policy, version-bound decisions and contractual amendment application remain required.
- Lists: up to 300 calendar/milestone definitions and the latest 25 candidates. History: latest 100 revisions. Complete candidate snapshots reject more than 500 tasks, 1,000 active dependencies or 300 definitions; no silent truncation.
- The new screens have not received populated visual acceptance in this increment. No production deployment or external provider action is included.
