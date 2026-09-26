# Local visual test — 26 September 2026

Updated after fixes: all seven visual findings below have been addressed and the local database is running. The original observations are retained below as a record of the initial test.

## Fix verification

- Mobile header wraps into usable rows; project Requirements measures 380 CSS pixels of document width in a 390-pixel viewport (the remaining space is the scrollbar). Sign-out, theme, language, and project controls remain visible.
- Login labels and account cards, Requirements KPI captions/banner, and financial formulas use readable theme colors.
- Forecast badge wraps inside its metric card. Administration allocates sufficient space to role labels and separates columns; narrow views scroll the table.
- Calendar blank/today cells follow the selected theme.
- Requirements headings, KPI labels, presets, grouping choices, readiness filters, and clarification labels translate into Arabic. The stage fraction remains 2 / 4 in RTL through bidi isolation.
- Acceptance project placeholders use the same UUIDs as the API and no longer produce duplicate selector options.
- PostgreSQL 17 initialized under ignored `.local`, bound to localhost with password authentication. All 16 migrations and the development seed completed. Server login and authenticated identity lookup succeeded.
- Corrected an additional seed bug that assigned every account with an organization ID to the client audience. Internal roles now receive internal audience, including on reseeding. Added a passing regression test.
- Full existing suite: 774 passed, zero failed or skipped. The added seed regression also passes (2/2 seed tests). Workspace typecheck and production build passed. Build retains a warning about the large frontend bundle.
- Rechecked desktop cockpit, mobile Requirements, Arabic Requirements, login, Administration, and Calendar in the browser. Restored original viewport and English language afterward.

The additional QND sample-content observation was traced to `seedInitialScope`: the same demonstration template is explicitly seeded for both demo project IDs. It was not caused by a missing project filter; the query filters by project ID. Demo content remains synthetic and is not certified event data.

See `docs/LOCAL_DEVELOPMENT.md` for restart instructions. Integration tests mutate development fixtures; the database was reseeded afterward. No deployment or commit was made. The pre-existing runtime vault modification and user-created `E3_EOS_Complete_MD_2026-09-26/` directory were left intact.

## Running services

- Web: http://localhost:3002 (ports 3000 and 3001 were already occupied).
- API: http://localhost:4000; health endpoint returns OK.
- Dependencies installed with frozen lockfile; API build passed.
- PostgreSQL connection failed at startup. Docker/PostgreSQL commands and services were not found in the local checks. UAT login has a client fallback, so successful demo sign-in does not establish working backend authentication or persistence.

## Browser coverage

Inspected sign-in, Home, Projects, project cockpit, Requirements, My Work, Calendar, Portfolio/financial control, Reports, and Administration. Checked desktop at 1440 × 900, mobile at 390 × 844, and the original approximately 900-pixel-wide panel. Tested one-click UAT login, project navigation, Requirements Missing Owner filter (one matching row), Arabic RTL toggle, and return to English. Left Home open with original viewport restored.

## Findings

| Priority | Finding | Reproduction / observed result |
|---|---|---|
| High | Mobile horizontal overflow | Open project Requirements at 390 × 844. Document width measures 502 pixels. Header controls, including sign-out and language/theme controls, extend beyond the viewport. |
| Medium | Low contrast in dark mode | Login email/password labels are very dark against a dark panel. Financial formula text and some colored requirement KPI captions are also difficult to read. |
| Medium | Clipped financial badge | Desktop cockpit EAC card clips its forecast-saving badge at the right edge. |
| Medium | Overlapping administration columns | Long role labels such as marketing_commercial extend into the Audience column at desktop width. |
| Medium | Incomplete Arabic localization | RTL direction and navigation translate, but Requirements traceability heading, KPI labels, view presets, and other interface text remain English. The stage fraction visually reverses from 2 / 4 to 4 / 2. |
| Low | Inconsistent dark surfaces | Requirements traceability panel, calendar blank cells, and login account cards use bright white surfaces inside the dark UI. |
| Low | Duplicate project options | The global project selector lists Acceptance A and Acceptance B twice. |

Additional data observation requiring investigation: the Qatar Tourism project Requirements screen displays REQ-QND rows describing Lusail/National Day scope. No data-isolation conclusion was established in this visual pass.

## Supporting tests and limitations

`pnpm test`: 50 files passed, 10 failed; 712 tests passed, 36 failed, 26 skipped (774 total). Failures include unavailable PostgreSQL/durable datastore checks. Do not treat the repository README's passing-test claim as verified for this environment.

No application source fixes were made. Runtime/test execution modified the tracked apps/api/data/encrypted-secrets-vault.json file; its contents were not included in this report. Database-backed create/update flows, uploads, external integrations, exports, and every role/workstream were not validated.
