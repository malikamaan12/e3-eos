# Operational Runbook RB09: Financial Import Mismatch & Duplicate Ledger Batches

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Source file hash deduplication, ledger quarantine isolation (`AT-067`, `AT-068`)

---

## 1. Immediate Containment
1. **Trigger Condition**: An accounting ledger batch or supplier invoice spreadsheet contains mismatched totals, unallocated line items, or duplicate batch IDs.
2. **Duplicate Source File Rejection (`AT-067`)**:
   - The file upload handler computes SHA-256 hash `fileHash`.
   - If `fileHash` or `batchId` already exists, EOS rejects import with `DUPLICATE_IMPORT_REJECTED` (409 Conflict), preventing duplicate expenses from hitting project EAC.
3. **Statutory Quarantine Isolation (`AT-068`)**:
   - Invoices marked `quarantined_by_ledger` are isolated with `isPaid: false`.
   - Financial dashboards strictly display `awaiting_ledger_clearance`.

---

## 2. Remediation Procedure
1. **Investigate Batch Discrepancies**:
   - Financial Controller compares batch sum against line items ($\sum \text{Lines} \stackrel{?}{=} \text{Batch Total}$).
2. **Post Corrective Reversing Entries**:
   - If erroneous postings occurred:
     - Issue a visible credit note or reversing entry (`type: 'reversal'`).
     - Invariant: Never delete historical ledger rows. Post corrective records with documented audit rationale.
3. **Re-evaluate EAC**:
   - Recalculate project financial position via `FinancialCalculator.calculatePosition`.
   - Verify EAC remains accurate with zero double-counting (`AT-066`).
