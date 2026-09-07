# Operational Runbook RB12: Failed Production Deployment & Migration Rollback

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Non-destructive compensating rollback, no database reset (`AT-088`, `AT-089`)

---

## 1. Immediate Halt & Assessment
1. **Trigger Condition**: A production deployment fails pre-flight validation, container startup fails health probes, or database migration fails halfway.
2. **Pre-Flight Gate Halt (`AT-089`)**:
   - If deployment contains mock services or stub handlers, the deployment pipeline aborts before touching live infrastructure.
3. **Keep Prior Compatible Application Running**:
   - Cloud Run traffic routing maintains 100% traffic on the previous stable revision.

---

## 2. Non-Destructive Database Rollback
1. **Expand / Contract Guarantee**:
   - Because all DDL operations follow additive expand/contract design (new columns are optional or have defaults), the prior application version remains 100% compatible with the expanded database schema.
2. **Prohibition of Database Resets**:
   - Invariant: **NEVER execute `DROP DATABASE` or destructive SQL scripts.**
   - Live financial, procurement, and project tracking records are preserved.
3. **Compensating Rollback for Dispatched Actions (`AT-088`)**:
   - If external purchase orders or notifications were sent prior to deployment failure:
     - Issue formal compensating actions (`compensating_cancellation_issued`).
     - Reconcile external partner state while immutably retaining original dispatch history.
4. **Post-Mortem & Incident Logging**:
   - Document error traces in `docs/post-mortems/`.
   - Update unit test suites and release candidate checklist before attempting re-deployment.
