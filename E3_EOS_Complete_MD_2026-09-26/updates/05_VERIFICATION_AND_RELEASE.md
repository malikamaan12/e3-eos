# Current verification, acceptance and release rules

## Status evidence

Previous developer reports mention different commits, passing test counts and staging fixes. Treat them as dated reports, not proof of the current deployment. For a new candidate, record frontend and API build IDs, schema migration ledger, effective policy version, database target, connector modes, feature flags and observed browser/API paths. A successful local build or push to a branch is not a staging pass.

## Minimum end-to-end acceptance

1. Onboard an idea, tender, direct award and call-off without forcing irrelevant stages or inventing unknown values.
2. Upload a tender, extract evidence-linked candidates, resolve duplicate versus separate zone allocations, publish approved requirements and process an addendum.
3. Carry a requirement through design review, BOQ, resource demand, approved change, controlled submission and client acceptance without losing source/revision lineage.
4. Save and reload a 20-counter demand allocated 12/8 across two zones; regroup by department without changing totals. A second project overlaps in time; show a potential conflict without claiming external stock availability while disconnected.
5. Verify concurrency/idempotency and persistence across independent processes using the real durable store; rejection of stale writes preserves user input.
6. Verify cross-project and client isolation; role permissions, internal rates and documents remain scoped in UI, API, search and exports.
7. Verify Arabic/RTL, narrow mobile, keyboard accessibility, reduced motion, graceful API errors and visibly provisional offline field captures.
8. Generate a controlled submission pack with exact revisions and output hash; a later correction issues a new version.
9. Show distinct operational, acceptance, reporting, finance and settlement states at closeout.

External integrations are accepted separately once source contracts and E3 activation are approved. Human UAT, security review, data migration/reconciliation, backup/restore, monitoring, runbooks and named owner sign-off are separate go-live gates. Record PASS, FAIL or BLOCKED for every case with environment, actor, timestamp and evidence. Do not convert blocked tests to passes.

See `../references/E3_EOS_Staging_Acceptance_and_Targeted_Fixes_Prompt.md` for detailed storage and browser scenarios, and the original `../specs/09_QA_ACCEPTANCE_AND_TRACEABILITY.md` for the wider test matrix.
