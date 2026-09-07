# Operational Runbook RB07: Erroneous Policy Published

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Immutable historical audit, snapshot rollback, zero retroactive erasure (`AT-003`, `AT-020`)

---

## 1. Immediate Containment
1. **Trigger Condition**: An approval policy or governance rule was published with incorrect thresholds (e.g. spend limit accidentally set too high or required approver omitted).
2. **Halt Future Consequential Releases**:
   - Suspend approvals in the affected workflow domain using administrative override.

---

## 2. Recovery & Rollback Procedure
1. **Revert to Prior Valid Policy Snapshot**:
   - The policy engine maintains all historical compiled snapshots with content hashes.
   - Activate the previous verified snapshot version:
     ```http
     POST /api/v1/admin/policies/:policyId/rollback
     Content-Type: application/json

     {
       "targetSnapshotVersion": 4,
       "reason": "Rollback erroneous policy v5 threshold changes"
     }
     ```
2. **Audit Past Transactions Under Erroneous Policy**:
   - Query decisions approved while erroneous policy was active:
     ```sql
     SELECT id, project_id, amount, approved_by, approved_at 
     FROM approvals 
     WHERE policy_snapshot_version = 5;
     ```
   - Invariant: **DO NOT erase or delete approved records.** Decisions made under v5 are marked `flagged_for_governance_review` and evaluated by the Executive Committee.
