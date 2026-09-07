# Operational Runbook RB04: Credential Compromise & Secret Rotation

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Immediate session revocation, zero privileged access leakage, audit isolation (`AT-006`, `AT-010`)

---

## 1. Immediate Containment
1. **Identify Compromised Credential**: User account, API key, JWT signing secret, or cloud service account.
2. **Session / Key Invalidation**:
   - For user identity compromise:
     - Invalidate all active sessions immediately via administrative command or database update:
       ```sql
       UPDATE sessions SET is_revoked = TRUE WHERE user_id = 'compromised-user-id';
       ```
     - Expire all active refresh tokens and temporary MFA recovery codes.
   - For JWT or API secret compromise:
     - Rotate the secret in Google Cloud Secret Manager:
       ```bash
       gcloud secrets versions add e3-eos-jwt-secret-production --data-file=new_secret.txt
       ```
     - Trigger rolling restart of Cloud Run API containers to pick up the new secret version.

---

## 2. Forensic Audit & Reauthorization
1. **Inspect Audit Log**:
   - Query immutable audit table for actions executed by the compromised identity during the breach window:
     ```sql
     SELECT action, entity_type, entity_id, timestamp, ip_address 
     FROM audit_events 
     WHERE actor_id = 'compromised-user-id' 
     ORDER BY timestamp DESC;
     ```
2. **Revert Unauthorized Mutations**:
   - Any unapproved changes or spend releases are flagged and reversed using compensating actions.
3. **Re-Enroll User**:
   - User re-authenticates through a witnessed identity re-verification procedure with fresh MFA setup.
