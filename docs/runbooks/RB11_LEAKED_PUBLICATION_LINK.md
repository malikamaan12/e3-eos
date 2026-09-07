# Operational Runbook RB11: Leaked Client Publication Link / Token

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Immediate link revocation, zero false recall promises (`AT-036`)

---

## 1. Immediate Containment
1. **Trigger Condition**: A client portal viewing token or supplier upload URL is accidentally shared outside the authorized recipient group.
2. **Revoke Publication Token Immediately (`AT-036`)**:
   - Invoke administrative revocation:
     ```http
     POST /api/v1/portal/publications/:publicationId/revoke
     Content-Type: application/json

     {
       "revocationReason": "Token leaked on unencrypted external channel",
       "revokedBy": "user-account-manager-01"
     }
     ```
   - Future HTTP requests to the revoked link return `404 Not Found` or `410 Gone`.

---

## 2. Integrity & Truthful Disclosure Invariant
1. **Zero Recall Invariant**:
   - In accordance with `specs/01_PRODUCT_MODULES_AND_UX.md` §7 and `AT-036`, EOS **never claims that previously downloaded PDFs or exported spreadsheets can be remotely recalled or erased**.
2. **Issue Replacement Authorized Publication**:
   - Generate a fresh publication record with a new cryptographic access token.
   - Transmit securely to authorized client contacts via authenticated email.
3. **Log Exposure Event**:
   - Record the exposure window and accessing IP addresses in the project audit log for stakeholder review.
