# Membership administration browser review

Date: 26 September 2026. Local Vite preview at `http://localhost:3002/admin/users`, rebuilt Nest API on port 4000. Existing local synthetic administrator session; synthetic identity switching disabled.

| Check | Observation |
|---|---|
| Environment | Header reports `LOCAL` from the API. No fixed cloud region/staging claim. |
| Error and retry | During API replacement, the capability endpoint failure was shown explicitly with Retry. Retrying after startup loaded stored memberships; no fallback directory was shown. |
| Current organisation | Directory identifies E3 Synthetic Events Internal and reads its stored memberships, with separate active/revoked counts. Existing test fixtures remain labelled by their stored names/emails; they are not invented by the UI. |
| Search and filters | Searching an observed email reduced the directory to one membership. Revoked filter displayed seven recorded revoked memberships with “Access disabled” and no revocation button. |
| Revocation dialog | Opening a row's confirmation displayed the exact user, email, organisation and role. Confirm was disabled without a reason. The dialog was cancelled without submission. |
| Incomplete commands | Invitation button disabled with visible explanation; unfinished project grants, role changes and restoration were not offered as working actions. Local role preview absent while synthetic mode is off. |
| Arabic and mobile | At 390 × 844, titles, actions, guidance, search labels and status labels render in Arabic/RTL. Measured document width 380 at viewport width 390; the directory scrolls horizontally within its own region. |
| Appearance | Glass E3 layout retained. Dark desktop and light Arabic/mobile views were visually inspected. |

English/dark mode, All memberships and the normal viewport were restored, with the admin page left open. No existing user's access or membership was changed through the browser. Actual revocation and restart replay are covered by the isolated HTTP evidence and PostgreSQL regression tests, not by this read-only visual inspection.
