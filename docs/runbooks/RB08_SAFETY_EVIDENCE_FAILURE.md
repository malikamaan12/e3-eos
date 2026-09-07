# Operational Runbook RB08: Missing / Failed Safety Evidence

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Critical checkpoints gate release, immediate protective action (`AT-028`, `AT-059`, `AT-061`)

---

## 1. Immediate Protective Action
1. **Trigger Condition**: A mandatory structural certification (e.g. stage roof rigging) or fire suppression inspection fails or evidence is missing before public opening.
2. **Immediate Stop-Work Order (`AT-028`)**:
   - Authorized Safety / Quality lead triggers immediate stop-work or zone hold without awaiting bureaucratic management consensus.
   - Ready-to-open release is automatically locked:
     ```http
     POST /api/v1/operations/zones/:zoneId/stop-work
     ```
   - Invariant: `canReleaseToOpen` remains strictly `false`. No administrative role can bypass or force open a zone with an unresolved critical condition (`AT-059`, `AT-061`).

---

## 2. Remediation & Reopening
1. **Remedial Engineering**:
   - The structural engineering contractor performs physical adjustments on site.
2. **Re-Inspection & Verification**:
   - Independent inspector verifies structural integrity.
   - Attaches verified photographic evidence or wet-ink physical stamp (`AT-060`).
3. **Authorized Zone Reopening**:
   - Inspector marks checkpoint `passed`.
   - `ReadinessEngine.evaluateReadiness` confirms 100% critical gates clear, authorizing opening release.
