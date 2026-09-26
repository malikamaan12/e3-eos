# Controlled invitation browser verification — 26 September 2026

Environment: local web `http://localhost:3002`, local API `http://localhost:4000`, synthetic authentication disabled. Verification used the Codex in-app browser in a separate QA tab, then restored the normal viewport and English dark mode. No production deployment, external message, real invitation or membership change was issued through the browser.

| Check | Observed result |
| --- | --- |
| Scoped administration | Current organization and verified session are shown; Invite user is enabled only after API capability verification. A separate invitation register distinguishes queued delivery, acceptance, expiry, cancellation and legacy unverified records. |
| Form validation | Empty recipient/name/role/reason prevents queuing. Filling disposable preview values and choosing Operations enables the command; Cancel closes it without creating an invitation. |
| Roles | Choices match the server allowlist; Super Admin and Executive are absent. Project access remains explicitly separate. |
| Keyboard | Dialog has an accessible name and modal role. Escape closes it and focus returns to Invite user. |
| Desktop dark | E3 vector logo, dimensional glass surfaces, readable inputs, role selector and action hierarchy visually reviewed. |
| Mobile Arabic light | 390 × 844 viewport; invitation dialog fits within a 348-pixel width and the document scroll width is 380. Labels, buttons, RTL placement and disclosure are localized. |
| Missing/invalid invitation | Missing link shows instructions; invalid link produces the real unavailable response, never an activation success. Retry is offered. |
| New-account preview | Disposable isolated HTTP fixture displays the actual organization, invited email, role, expiry, full-name and new-password fields. No credential was entered and acceptance was not submitted through the browser. |
| Existing-account preview | Disposable isolated fixture requires the invited identity to sign in. The form asks for the existing password and explains that password/name are preserved; it does not present a password replacement form. |
| Existing-account Arabic mobile | Visible form spans about 310 pixels within the 390-pixel viewport; no horizontal overflow. Long synthetic email wraps. |
| Token handling | Incoming fragment token is removed from the visible URL, retained in memory only, and sent in the inspect request body. Opening another fragment link on the same screen updates the preview. Reload requires reopening the original link. No token is put into a login redirect. |
| Reload/session | Protected pages show a session-verification state and restore the server-provided user and organization, including noncanonical invited accounts. The source no longer fabricates a login result when the API fails. |

The browser previews used deliberately nonsecret tokens on isolated synthetic records. Their original encrypted delivery links were invalidated; the HTTP helper removes these fixtures after restart verification. The actual credential, concurrency and durable mutation checks were performed through isolated database/HTTP tests, not browser password entry.

The whole suite passed 965 tests before the final invitation-list filter, fragment-navigation, localized unavailable-message and session-loading refinements. Final web TypeScript and production build passed after those refinements. The built bundle still exceeds Vite's size warning threshold (approximately 2.55 MB minified / 575 kB gzip); this remains a performance follow-up.

Limits: no email-delivery worker, privileged invitation workflow, browser-reload persistence of command keys, project grants, or human production UAT is certified by this visual check. Existing legacy synthetic records are displayed truthfully and were not removed as part of this work.
