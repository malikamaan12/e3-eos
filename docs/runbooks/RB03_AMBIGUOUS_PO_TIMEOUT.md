# Operational Runbook RB03: Ambiguous PO / Supplier Timeout

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Zero duplicate external supplier commitments (`AT-045`, `AT-088`)

---

## 1. Immediate Triage & Containment
1. **Trigger Condition**: An external purchase order transmission times out or returns HTTP 504 / gateway timeout.
2. **Ambiguous Outcome Principle**:
   - Invariant: **NEVER blind-retry an external purchase order transmission.**
   - Mark the PO status as `reconciliation_needed` with `externalDeliveryStatus: 'sent_pending_confirmation'`.
   - Freeze the purchase order from automated resend or release attempts.

---

## 2. Recovery & Reconciliation Procedure
1. **Query Supplier System or Vendor Account**:
   - The procurement officer contacts the vendor or queries the external supplier portal to ascertain whether the order was received.
2. **Record Authoritative Outcome**:
   - **Scenario A (Supplier Received the Order)**:
     - Invoke command:
       ```http
       POST /api/v1/procurement/orders/:id/reconcile
       Content-Type: application/json

       {
         "resolution": "confirmed_externally",
         "externalReference": "SUPPLIER-INV-9921",
         "notes": "Confirmed received via supplier phone/portal confirmation"
       }
       ```
     - PO transitions to `acknowledged`.
   - **Scenario B (Supplier Did Not Receive the Order)**:
     - Invoke command with `resolution: "not_received_externally"`.
     - PO transitions back to `approved`, allowing an explicit controlled re-issue with a new idempotency key.
