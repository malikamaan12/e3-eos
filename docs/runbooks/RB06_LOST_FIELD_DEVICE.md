# Operational Runbook RB06: Lost / Compromised Offline Field Device

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Offline data containment, supervisor review gating (`AT-055`, `AT-058`)

---

## 1. Immediate Containment
1. **Trigger Condition**: A field operations mobile phone or tablet is reported lost, stolen, or compromised on-site.
2. **Revoke Active Device Session**:
   - Invalidate the device's authentication session token on the server:
     ```http
     POST /api/v1/identity/devices/:deviceId/revoke
     ```
   - All subsequent synchronization attempts from this device will be rejected with HTTP 401.

---

## 2. Risk Assessment & Data Reconciliation
1. **Evaluate Local Storage Exposure**:
   - In accordance with `specs/06_INTEGRATIONS_AND_OFFLINE.md` §4, the offline PWA cache only holds data assigned to the operator's active shift (checklists, run-sheet segments).
   - Commercial margins, financial payroll, and unrelated projects are never cached offline.
2. **Recover Queued Mutations via Supervisor Review**:
   - If un-synced safety sign-offs or photos were stored on the lost device:
     - The on-site Lead Supervisor re-inspects the physical zone.
     - Creates a fresh authoritative inspection sign-off witnessed on a verified device.
     - Never fabricate back-dated evidence or assume lost device tasks were completed.
