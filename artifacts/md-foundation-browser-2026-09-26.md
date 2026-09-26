# Markdown foundation — browser review

Reviewed 26 September 2026 against the local Vite app at `http://localhost:3002`, with the rebuilt API on port 4000 and an existing seeded session. This is a bounded regression review, not complete phase/UAT acceptance.

| Surface | Observation |
|---|---|
| Governance Approvals, desktop dark theme | Queue loads through the restarted API. Empty pending state says no requests are recorded in this project queue; it does not claim every project gate is approved. E3 logo, glass surfaces, navigation and dark palette remain intact. |
| Field queue, desktop | Empty queue keeps sync disabled. Disclosure says captures remain provisional and server sync is unavailable. No simulated upload success or accepted-media records remain. The operational sample-record button was removed. |
| Field queue, 390 × 844 | No page-level horizontal overflow: measured document width 380 at viewport width 390. Tool tabs scroll within their own strip. The project selector's previously invisible text is now readable. |
| Field header, dark theme | Replaced the inverse pale header with theme surfaces and readable project/label colors. |
| Field queue, Arabic/light theme | New queue headings, empty states, contingency guidance, sync status and media verification disclosure render in Arabic with RTL layout. Fake file names, progress totals and verified-evidence claims are absent. Pale disclosure text discovered during review was changed to the primary theme text color. |

The empty live approval queue provided no record on which to exercise the decision modal in this browser review. Exact-version rejection, failed-decision handling and missing-target checks are covered by the automated regression suite; this report does not substitute that coverage for a witnessed real approval journey.

No operational approval, incident, evidence acceptance or external connector command was issued. No field capture was created or cleared in the browser. Retry/recovery retention was exercised by automated tests. English/dark mode and the normal viewport were restored after the review.

Open observations are recorded in `docs/MD_IMPLEMENTATION_TRACKER.md`, including the hardcoded staging/cloud badge, remaining synthetic field module data outside this queue slice, and missing durable field upload receipts. The current local browser preview runs Vite development source; production bundle verification is recorded separately in the tracker.
