# E3-EOS — Controlled Documents, Company Evidence Vault & Submission Packs

## 1. Implementation instruction

Implement this specification inside the existing E3-EOS repository. Extend the current project, document, requirements, workflow, approval, design-review, storage, notification, and audit architecture. This is one integrated capability, not a separate application or a second authoritative document store.

First inspect repository instructions, schema, services, routes, permissions, workers, UI components, tests, and configured integrations. Identify what the existing parser, Design & Creative module, document control, evidence vault, and client portal actually implement. Provide a concise reuse/extend/add map before making changes, then proceed with the authorized implementation. Do not assume earlier prompts are already implemented.

Preserve existing IDs, files, manual edits, approved versions, workflows, and downstream links. Use additive migrations, existing design conventions, and the smallest compatible service extensions. Keep workflows configurable by project, country, legal entity, document type, and risk. Do not replace working modules, create unnecessary microservices, introduce paid services without authorization, or deploy/migrate live data as part of this task.

## 2. User outcome and product boundaries

E3 must be able to:

- Store reusable company documents such as Commercial Registration (CR), trade licences, financial statements, insurance, credentials, policies, CVs, and templates in a controlled vault.
- Find the correct document by name, entity, type, reporting year, validity, language, verification, and permitted use.
- See documents required by an RFP even when the files are missing.
- Attach appropriate vault revisions to a project or tender without duplicating or altering their masters.
- Create and edit project documents; review, comment, request changes, and mark preparation status.
- Arrange documents into a user-controlled sequence and section structure.
- Freeze a document revision or a complete package; resume work through a new revision.
- Remove documents from a pack, delete eligible drafts, and archive used material with traceability.
- Share selected revisions with clients for review under explicit access controls.
- Assemble selected documents into one PDF or the separate files/envelopes required by the tender.
- Apply optional, authorized signature/stamp assets to selected documents/pages.
- Retain the exact files, source revisions, sequence, approvals, and transmission evidence for every submitted package.

The core rule is: store a reusable master once, select an explicit revision for each use, and preserve exactly what was reviewed or submitted.

## 3. Three connected workspaces, one document foundation

| Workspace | Purpose | Ownership rule |
| --- | --- | --- |
| Company Evidence Vault | Reusable E3 evidence, templates, and restricted assets | Master updates require authorized ownership and verification |
| Project Document Workspace | Required-document register, working documents, reviews, and project-specific derivatives | Project editing does not overwrite company masters |
| Submission Pack Builder | Ordered selections, review snapshots, exports, finalization, and issue history | Each pack revision pins exact document revisions and output settings |

Reuse the same underlying document identity, revision, file, approval, and comment services across these workspaces and Design & Creative. A drawing may appear in both a design workspace and a submission pack without creating disconnected copies or approvals.

Existing external evidence sources may retain their origin IDs/links. Use the existing EOS storage and integration architecture; do not automatically migrate or duplicate live evidence from another system. Controlled use of a mutable external link requires a retained version or immutable snapshot accessible under the applicable permissions.

## 4. Company vault structure and naming

Support configurable categories seeded from E3's existing evidence conventions:

- Legal and Corporate, including CR, trade licences, registrations, and financial eligibility evidence.
- Brand, Letterhead and Signatures.
- Leadership, Staff and CVs.
- Projects and References.
- Contracts and Completion Certificates.
- HSE, QA and Policies.
- Equipment, Catalogues and Supplier Proof.
- E3 Systems and Digital Modules.
- Internal Cost and Rate Library, restricted from ordinary client packages.
- Images, Logos and Presentation Templates.
- Approved Tender Templates and Past Submissions.

Provide financial-document filters/subcategories for reporting period and audit status. Categories organize evidence; they do not grant access or prove suitability.

For new evidence use the configurable convention `E3-EV-<CATEGORY>-<NNNN>`, retaining existing IDs if already assigned. Suggested codes: CORP, BRAND, STAFF, PROJ, CERT, HSEQ, EQUIP, SYS, COST, TMPL. Never recycle IDs. Do not renumber existing records simply because their category changes.

Keep a permanent internal ID, readable evidence code, editable display title, original filename, and configurable export filename separate. Example export patterns are `E3_CR_<Entity>_<Revision>_Exp-<YYYY-MM-DD>.pdf` and `E3_Audited_Financial_Statements_<Entity>_FY-<Year>_<Revision>.pdf`. Never insert invented dates to fill a pattern. Preserve exact source legal names and identifiers.

Index title, document number, entity, category, tags, permitted OCR text, reporting year, and issuer. Apply access filters before showing search results, previews, snippets, autocomplete suggestions, counts, or exports.

## 5. Master, revision, file, and evidence metadata

Reuse or extend existing entities to represent:

| Concept | Required information |
| --- | --- |
| Document master | Stable ID/code, title, document class/type, entity/person/project, owner, category, tags, origin |
| Revision | Revision ID/label, predecessor, change summary, author/uploader, immutable content references, verification/review decisions |
| File/rendition | Original/source, editable source, issued PDF, preview, certified copy, approved translation, or redacted derivative; checksum and processing status |
| Evidence facts | Source document number, issuer, issue/effective dates, expiry or explicit expiry state, reporting period, language, supported facts, scope/territory |
| Usage controls | Confidentiality, allowed client/tender/geography/use, verifier/date, required certification, retention policy and holds |

Maintain revision-level evidence records and a current approved pointer. The latest upload is not automatically current, approved, or permitted for client use. Preserve original files byte-for-byte; sanitization and preview conversion produce separate derivatives.

New uploads default to Pending Verification. Approval needs a named authorized verifier or a trusted existing approval record. An AI-extracted field is a proposal until verified; missing or uncertain values remain explicit.

Distinguish these document classes: internally authored controlled instructions, external controlled sources, reusable templates, completed records, and reference-only material. External documents retain issuer approval and applicability; internal review must not impersonate an external authority's approval. Completed records retain corrections/amendments as linked history.

Translations and redactions need their own revision/provenance and review. A redaction must remove protected content from the exported file, searchable text, and relevant hidden data; a black rectangle alone is insufficient. Do not modify the preserved original. Check that a derivative still satisfies the intended requirement.

## 6. Expiry, reporting periods, renewals, and suitability

Represent expiry as known date, no stated expiry, unknown, or not applicable. Keep review due date distinct from validity expiry. Record the source and timezone/date-boundary policy where relevant; do not invent a date from a filename or ambiguous OCR.

Financial statements are selected by legal entity, period start/end, financial year label, audit status, and required supporting material. FY2024 and FY2025 are separate period records, not simply newer and older revisions of one interchangeable document. A corrected report for the same period can be a revision. Do not supersede a prior year solely because a later year's accounts arrive.

Evaluate evidence against the tender's confirmed conditions: exact entity, period, scope, language, certification, audited/unaudited status, and validity at the required submission or activity dates. If the tender requires three specified financial years, every required period must be accounted for; three files with similar titles do not prove coverage. A valid file may still be unsuitable for this tender.

Provide configurable renewal reminders, for example 90/60/30/7 days before a known expiry, assigned to the responsible owner. Deduplicate reminders and allow project-specific escalation. Missing dates must create a verification task rather than pretend the document is current.

New revisions or revocation/expiry events notify affected working projects and packages. They must not silently replace selected revisions. Preserve frozen/submitted bytes and history while displaying an external readiness warning where the pending submission is now affected. Verify suitability again when finalizing, downloading an issue-ready artifact, or issuing, as appropriate to the workflow.

## 7. RFP integration and the required-document register

Extend the existing requirements register with document deliverables; do not create a separate competing requirement system.

Each required-document entry must identify its source requirement/clause, mandatory or conditional basis, requested entity/years/language/format, certification and signing needs, owner, due date, required envelope, and current evidence links. A missing file must remain visible as a real required-document slot, not a fabricated document revision.

The parser proposes requirements and vault matches. The user confirms the requirement and selected evidence. Validate the original evidence and permissions, not just title similarity or previous tender usage. Preserve many-to-many mapping: one file can support several requirements, and one requirement can require several files.

Show matching outcomes such as Verified Available, Available—Update Required, Pending Verification, Wrong Entity/Period, Missing, Client Clarification Required, Supplier Input Required, or Not Applicable with an authorized reason.

Evidence uploaded or attached is not automatically compliant or complete. Completion requires the configured reviewer to confirm coverage. A rejected or removed mandatory attachment reopens the appropriate gap.

## 8. Project document list and pack ordering

Provide a practical table with configurable columns: sequence, section, document title/code, source, selected revision, owner, due date, preparation status, validity/suitability, comments, included/excluded, signature/stamp requirement, and actions. Keep default columns compact.

Users must be able to:

- Add from vault, upload, create from template, link an existing design/document, or add a missing-document slot.
- Drag to reorder, move to a named position, and use keyboard-accessible ordering controls.
- Create sections/dividers and move entries across sections and permitted envelopes.
- Set submission-facing titles without changing the vault master title.
- Include/exclude an item without deleting its master; provide reasons for excluding mandatory items.
- Select an explicit revision, compare newer revisions, and consciously replace a selection.
- Assign owners, reviewers and due dates; filter/sort while preserving the underlying submission order.
- Save and reuse a pack structure/template without copying old project evidence, approvals, signatures, or confidential data.

A prescribed tender order is stored as a rule with evidence. User reordering is available in working mode, but deviations remain visible and prevent readiness where the rule is mandatory. Do not silently reorder against the user's saved selection.

Avoid duplicate inclusion of the same revision merely because it supports several requirements. Permit intentional repeats when the submission rules call for them; make the repeat explicit. Page-range extraction is optional and must warn if required pages, endorsements, or schedules are omitted. Preserve full official documents by default.

Each package item references a stable source revision and its project-use metadata. Changes to the vault master do not implicitly change a draft, review share, frozen pack, or submission. A user must accept a proposed replacement and repeat affected reviews.

## 9. Editing, concurrent work, freeze, and deletion

Editable project documents support authorized revision creation, tracked review where the editor supports it, and save/restore history. Integrate an existing editor where available; otherwise provide a working download/edit/upload-new-revision flow. Clearly label unsupported in-browser editing. Do not rebuild Word, Sheets, or a general PDF editor to complete the first release.

Create project derivatives from exact approved template revisions. Editing a derivative must not change its master. Updating a company master is a separate permissioned action and verification path. Preserve mandatory client form structure when editing its allowed fields.

Use optimistic concurrency or the current editor's concurrency controls. Never silently overwrite another user's changes. A later revision does not inherit approval without the configured review.

| Action | Required result |
| --- | --- |
| Freeze document | Lock the selected content revision and approved scope |
| Freeze package content | Lock selected revisions, use metadata, included pages, order, sections, intended audience/envelopes, and export/signing instructions |
| Resume editing | Fork a new working revision, preserving frozen content and decisions |
| Remove from pack | Remove only that package membership; reopen coverage gaps if needed |
| Delete eligible unused draft | Recoverable trash subject to permissions and dependency checks |
| Delete/retire previously used evidence | Preserve issued/submitted references and audit history; archive or restrict instead of destructive removal |
| Restore | Restore permitted draft/history records without changing historical submissions |

Retention holds prevent permanent deletion. Authorized retention/disposal rules may remove eligible data when allowed; do not hard-code indefinite retention. Show dependencies and affected projects before a deletion or retirement action.

Read-only content can still receive separate comments or revocation notices. These events must not alter the frozen file bytes or masquerade as document edits. Cosmetic metadata changes are audited; changes affecting identity, suitability, access, or approval must trigger reassessment.

## 10. State model and current-for-use behavior

Keep independent state dimensions rather than one overloaded status:

| Dimension | Suggested values |
| --- | --- |
| Vault verification | Draft, Pending Verification, Approved |
| Record lifecycle | Current, Superseded, Archived, Withdrawn |
| Validity | Unknown, Not Yet Effective, Effective, Expired, No Stated Expiry, Not Applicable |
| Confidentiality | Public, Internal, Confidential, Restricted |
| Project preparation | Pending, Working, Under Review, Changes Required, Final for Submission |
| Operational release | Not Issued, Issued for Review, Issued for Use, Superseded, Withdrawn |
| Package lifecycle | Working, Under Review, Ready for Final Approval, Ready to Submit, Submitted, Superseded |

Track missing attachments, blocking comments, stale outputs, and freeze state separately. Map existing enums compatibly; do not discard historical meanings merely to adopt these labels.

Users can request a status change, but server-side transition rules and permissions determine whether it is valid. Final for Submission is scoped to the exact revision and package/use. An approved vault record alone is not approval for every client or tender.

For operational documents, resolve current for use by purpose, scope/location, and effective time. A new draft or future-effective revision does not replace today's authorized plan. Supersede only the corresponding scope when the authorized replacement becomes effective. Explicit withdrawal may leave no permitted version; show that gap.

Freeze is not approval. Ready to Submit requires passed checks, final approval, required signatures/stamps, and the exact frozen output. Submitted requires an authorized recorded transmission/receipt or a permissioned manual record with supporting evidence; a download, review share, or successful PDF build must not set Submitted.

## 11. Comments and review rounds

Reuse existing version-aware document/design comments, mentions, assignments, and reviews. Support document-level comments and anchors on pages, text ranges, or coordinates where available. Store source revision, anchor geometry/coordinate system, author, audience, assignee, due date, resolution, and explicit blocking/nonblocking classification.

Statuses should cover Open, In Progress, Ready for Review, Resolved, and Reopened. Resolution is a recorded decision, not automatic because a new file was uploaded. Carry-forward requires confirmation and repositioning if the content changed.

Internal comments and their attachments must never leak into client views or normal submission exports. Client-visible threads are explicitly published. A reply cannot silently broaden a thread's audience.

For compiled PDFs, store an immutable page map: output page to package item, source revision, source page, and transformation where available. A comment on merged page 48 belongs to that export version. Reordering a new pack must not move the original comment onto unrelated content.

Permit historical discussion after freeze without mutating the approved content. A material change request opens a new working revision and marks affected readiness decisions stale. Bulk completion must not bypass blocking comments or mandatory review rules.

## 12. Review, approval, and issue responsibilities

Use existing roles/capabilities for author, reviewer, verifier, document controller/issuer, project approver, financial approver, authorized signatory, client reviewer, and administrator. Roles may combine where the project policy permits; independent checking can be mandatory for selected types.

Approval records must include exact subject revision or frozen content manifest, purpose, scope, approver identity/role, decision, timestamp, conditions, and evidence. External approval remains attributed to the actual external issuer. Separation of duties and delegation follow existing policy, not a hard-coded universal chain.

An administrative override requires the configured authority, reason, scope, and audit event. It cannot fabricate an external signature, override access isolation, or erase history. Conditions must say which uses are allowed and which remain blocked.

Material changes to content, selected versions, sequence, included pages, intended audience, envelope, or signing/issuance instructions invalidate the affected approval and generated output. Preserve the prior approval as historical, not current.

## 13. Pack rules, envelopes, and client-facing content

Represent tender-specific packaging requirements with source evidence: permitted file types, filename patterns, order, size limits, prescribed forms, originals/certified copies, signing rules, native-file requirements, and technical/commercial envelopes.

Support a combined PDF where allowed, separate envelope PDFs, individual files plus index, and ZIP/native-file bundles where permitted. Do not merge technical and commercial material when separate submissions are required. Preserve required native BOQ/workbook deliverables even if a PDF preview is also generated.

Financial eligibility evidence belongs in the envelope prescribed by the tender; do not automatically classify all financial statements as priced commercial content. Internal cost build-ups, supplier rates, margins, negotiation notes, raw HR records, and unrestricted signature assets remain excluded from ordinary client packages.

Validate selection and confidentiality before export. Inspect generated client renditions for accidental comments, tracked changes, hidden sheets/rows, internal attachments, metadata, and other confidential material. Preserve required formulas, official form layouts, and protections. Do not sanitize a signed original destructively; use an approved alternative handling path.

## 14. PDF conversion, assembly, and final-output lifecycle

Build asynchronous export jobs using approved existing converters/libraries. Prefer reliable PDF assembly first, then verified conversion of supported DOCX/XLSX/PPTX/images. Keep original files. Unsupported, password-protected, corrupt, or failed items must be visible and must not be silently omitted from a final export.

Conversion/export settings should include optional cover, contents, dividers, bookmarks, submission title, continuous/section numbering, compression, draft watermark, page-size policy, selected page ranges, and explicit stamp/signature instructions. Default to preserving source orientation/size unless a controlled conversion is requested. Support Arabic text and fonts. Check spreadsheet print ranges, scaling, formulas/cached values, and page breaks when rendering.

Use this artifact lifecycle:

1. Edit and select documents in a working package.
2. Resolve required reviews and freeze a content manifest.
3. Build and visually review an unsigned candidate from that manifest and export configuration.
4. Record authorized final-issue/signing instructions against the candidate hash, manifest hash, exact assets/pages/positions, and purpose.
5. Apply only authorized visual additions; where certificate signing is required, complete permitted assembly before that signing stage.
6. Verify final rendering, required marks, selected documents, page map, confidentiality, and applicable signature validation. Bind the final artifact hash to the authorized issuance record and seal the output.
7. Set Ready to Submit only if the configured final-output verification and readiness gates pass. Issue through a separate authorized action or record an external submission with evidence.

Any change to the reviewed candidate or authorized transformation instructions requires renewed authorization. Do not re-sign a different rebuilt file under a previous approval. Do not create a circular workflow that demands a signed output before authorization to sign; distinguish content approval, authorization of exact signing instructions, and verification of the resulting artifact.

The final record must contain the actual generated bytes, checksum, size/page count, source revision manifest, output page map, template/converter versions, export settings, relevant approvals, signing actions, and build/issue timestamps. Retain the exact artifact; re-running a converter later is not a substitute for the submitted bytes.

Draft exports may contain clearly labeled unresolved items with an explicit report. Final exports cannot quietly skip mandatory files or conversion failures. Native attachments that cannot become PDF remain identified separate outputs when the tender permits them.

## 15. Optional stamp and signature functionality

Provide permissioned selection of existing authorized E3 stamp/signature assets, preview placement, selected documents/pages, positioning/sizing, and an auditable apply action. Required marks come from the confirmed tender instructions; optional marks are never applied by default.

Assets remain Restricted even when current. Do not expose raw assets or broad download rights through ordinary vault selection. Use protected server-side operations and authorized previews. Record asset revision, signatory identity/authority, actor, purpose, target hashes, document/page positions, approval, and time. Never fabricate a signature/stamp or infer authority merely because an image exists.

Use assets only for the exact approved final-issue purpose. A prior tender's permission does not carry forward. Re-exporting an already sealed artifact can return those exact bytes; applying the mark to changed content needs fresh authorization.

Distinguish a visual image from a certificate-based digital signature. Do not label an image overlay as cryptographically verified. Integrate genuine certificate signing only through a supported authorized signing service/provider with appropriate key management; never invent certificate identity or expose signing keys.

Detect existing digital signatures and restrictions. Preserve originals, do not flatten away signatures silently, and do not claim a merged visual copy preserves their validation. Use permitted separately attached originals, an accepted container, or an authorized new signing workflow as the actual tender permits. If signature validation is unavailable, show Not Verified rather than Valid. Do not bypass a signed PDF's protections.

Relevant development references: [Adobe signed-PDF permissions](https://helpx.adobe.com/acrobat/desktop/e-sign-documents/learn-about-signatures/signed-pdf-limitations.html) and [digital-signature validation](https://helpx.adobe.com/acrobat/desktop/e-sign-documents/manage-digital-signatures/validate-digital-sign.html). Verify the actual selected library/provider against these requirements; there is no blanket promise that every PDF can be edited or merged without consequences.

## 16. Client review, transmittals, and submission history

Share for Review and Issue for Submission are distinct operations. A review share pins an exact document/export revision and explicitly published comment audience. It does not expose the company vault or follow a changing latest pointer. A new review round publishes a new selected snapshot.

Support named recipients, configurable authentication/OTP where available, expiry, revocation, view/comment/download permissions, and optional watermark. Recheck permissions on the server for previews, files, comments, search, and exports. Anonymous public access must never be the default for confidential evidence.

A formal transmittal records exact package artifacts/revisions, purpose, intended recipient organization, issue time/channel, required response date, and related acknowledgement/adoption records. Distinguish queued/sent/delivered/opened/downloaded/acknowledged/adopted/approved; do not infer one from another. Email open tracking is not conclusive receipt.

Allow an authorized user to record portal/manual submission with receipt/reference and exact issued artifacts. External messages, email, portal submission, and signing requests require explicit authorized actions; building a package does not send it. Test with mocks/sandbox channels rather than real recipients.

Revoking online access cannot recall previously downloaded or printed copies. Optional printed-copy metadata/QR links point to an authenticated status check with revision and supersession information. Preserve the submitted snapshot even if access is later restricted or evidence becomes outdated.

## 17. Readiness checks and safe publication

Build a server-side readiness evaluation reused by UI, export, finalization, and issue operations. Return actionable blockers, warnings, owners, source references, and evaluated versions/time.

Check at least:

- Required document slots and their evidence coverage, entity/years/language/scope, certification, and validity at applicable dates.
- Required reviews, verification, conditional approvals, and unresolved blocking comments.
- Selected revision identity, withdrawal/revocation, known newer evidence requiring reassessment, and stale outputs.
- Exact sequence/envelope, official forms, filenames, native-file requirements, size limits, and page completeness.
- Authorized signature/stamp instructions and required final artifact verification.
- Access rights, allowed use, target audience, and exclusion of internal confidential material.
- No change between reviewed manifest, final candidate, approved transformations, and issued bytes.

Freeze snapshot content independently from time-sensitive readiness. An unchanged frozen file can become unsuitable tomorrow through expiry or revocation; reevaluate its readiness without rewriting the artifact or past approvals.

Use atomic version checks when freezing/finalizing/issuing, and reject stale requests with a fresh diff. Persist the evaluated policy/metadata versions. Detect concurrent document replacement, pack reorder, withdrawn evidence, or changed permissions before publication; never mark a stale export final.

Reuse transactional outbox/job patterns and idempotency keys so retries do not duplicate pack versions, signatures, final artifacts, notifications, or submission records. Side effects must refer to the exact successful operation and artifact. Cancelled/failed builds must not become selectable final outputs.

## 18. Minimal data and API integration

Extend existing shared entities first. Missing concepts may include document master/revision/rendition, evidence metadata, required-document slot, project document use, package/revision/item, export job/artifact/page map, signing authorization/action, review share, transmittal/receipt, and audit events. Avoid duplicate user, project, file, approval, requirement, or comment tables when suitable entities already exist.

Use indexed typed fields for entity, period, expiry, verification, required use, and relationships. Enforce tenant/project ownership, foreign keys, version identity, and uniqueness where appropriate. Same bytes can be reused safely within permissions without treating distinct document subjects or financial periods as the same evidence record.

Expose authenticated operations following existing API conventions for vault search/intake/verify/new-revision; register/match/select evidence; create/edit/reorder/exclude pack items; comments/review/approval; freeze/fork; preview/export/finalize; share/revoke; issue/record receipt; and archive/trash/restore. Enforce mutations server-side with version preconditions and audit history.

For each selection retain the evidence revision, approved metadata snapshot, supported requirement links, use decision, and project-specific title/position. Historical packages must remain explainable even when current metadata later changes.

## 19. Permissions, processing security, and operating visibility

Implement capabilities for viewing sensitive evidence, downloading originals, editing project derivatives, updating masters, verifying evidence, reviewing/approving, changing sequence, freezing, applying authorized marks, sharing externally, issuing, and deleting/retiring. An authenticated URL is not enough; enforce tenant/project/document/recipient scope on every request.

Validate upload type/signature/size; scan or quarantine according to existing controls. Isolate conversions with memory/time limits and no unneeded network access; do not execute macros or active content. Protect archive extraction, temporary files, external links, and callbacks. Do not send confidential evidence to unapproved conversion/AI services. Treat document content as untrusted data and AI suggestions as proposals.

Keep private storage and short-lived authorized links. Do not log raw signatures, sensitive financial/HR content, credentials, or signed download URLs. Use configured retention and deletion rules for derivatives, temporary artifacts, logs, and backups, while respecting holds and historical evidence obligations.

Expose processing states such as Uploaded, Scanning, Processing, Ready, Failed, and Quarantined; show retry/manual alternatives. Provide dashboards for missing mandatory documents, pending verification, overdue review, upcoming relevant expiry, blocked packages, stale exports, and unacknowledged critical issues. Send useful deduplicated digests using existing notification preferences.

Reuse the EOS visual system, light/dark modes, tables, drawers, viewer and responsive patterns. Include empty/loading/error/permission states and accessible reorder controls. Do not ship disconnected mock dashboards as completed functionality.

## 20. Acceptance scenarios and regression tests

Use synthetic fixtures and authorized samples. Cover actual APIs, permissions, persistence, concurrency and rendered outputs, not only UI snapshots. At minimum implement these cases:

| # | Scenario | Expected result |
| --- | --- | --- |
| 1 | Upload CR without verifier | Pending Verification; no automatic approved/client-ready status |
| 2 | Same file uploaded twice | Safe duplicate handling; no accidental duplicate masters or approvals |
| 3 | Same filename with changed bytes | New immutable revision; prior file preserved |
| 4 | Select evidence for the wrong entity | Suitability blocker despite matching title |
| 5 | Tender requests three named financial years | All exact periods accounted for; latest year alone insufficient |
| 6 | Next year's accounts uploaded | Prior required financial years remain usable records |
| 7 | No stated expiry versus unknown expiry | Distinct states; no fabricated validity date |
| 8 | Valid now but expired at required submission/activity date | Readiness blocker or review according to confirmed requirement |
| 9 | New CR revision after pack freeze | New-version alert; frozen and submitted bytes unchanged |
| 10 | Edit project copy of an approved template | New project revision; master and other projects unchanged |
| 11 | Two users edit or reorder simultaneously | Conflict/version handling; no silent lost changes |
| 12 | Drag/reorder, filter table, then export | Saved sequence governs export; table sorting does not corrupt order |
| 13 | Exclude a mandatory document | Pack gap remains visible; cannot become Ready to Submit |
| 14 | One file supports multiple requirements | Multiple links without accidental duplicate pages |
| 15 | Reuse an old pack template | Structure reused without old approvals, signatures, or confidential evidence |
| 16 | Remove from pack versus delete source | Membership removal leaves vault/history intact |
| 17 | Delete used evidence or held record | Protected history retained; allowed archive/trash behavior only |
| 18 | Reopen a frozen/submitted pack | New working revision; historical artifact remains immutable |
| 19 | Rev03 under review while Rev02 is operationally effective | Current-for-use returns Rev02 for the applicable purpose |
| 20 | Future-effective or zone-limited replacement | Only applicable scope/time changes; no global premature supersession |
| 21 | Internal comment and attachment viewed by client | Neither exposed through UI, API, preview, or export |
| 22 | Comment on a merged page then reorder new pack | Old comment stays on its original export/source revision |
| 23 | Material edit after document marked Final for Submission | Affected readiness/approval becomes stale |
| 24 | Mixed PDFs, DOCX, workbook and Arabic pages | Correct sequence, readable rendering, no clipped/omitted required content |
| 25 | One converter fails or a file is locked | Explicit failure; no silent omission or false final completion |
| 26 | Required native workbook and separate envelopes | Correct separate outputs retained; no destructive PDF-only conversion |
| 27 | Wrong envelope or internal costing selected | Actionable blocker before client-ready export |
| 28 | Hidden comments/changes/internal workbook data | Detected/handled in client rendition without damaging original evidence |
| 29 | Unauthorized stamp/signature request | Denied; asset and file remain protected |
| 30 | Authorized visual mark on selected rotated pages | Correct placement, exact asset/version, approval and audit trail |
| 31 | Candidate or signing instructions change after approval | Old authorization cannot sign/finalize changed content |
| 32 | Digitally signed original supplied for merge | Original retained; no false claim of preserved validation |
| 33 | Retry export/finalization/signing job | No duplicate sign action or final issuance; exact operation trace |
| 34 | Change pack while export worker runs | Result stays bound to old manifest; cannot replace current final output |
| 35 | Readiness becomes invalid through expiry/revocation | Pending issuance reevaluated; historical submission untouched |
| 36 | Share exact client-review snapshot then revise source | Reviewer sees selected snapshot until a new review round is published |
| 37 | Revoke share or cross-tenant guess IDs | Future access denied; no metadata/file/comment leakage |
| 38 | Generate/download PDF | Does not mark Submitted or send to recipients |
| 39 | Record authorized portal receipt | Exact artifacts, recipient/channel/reference/time and actor retained |
| 40 | Restore eligible draft or attempt deletion under hold | Valid restore works; hold and dependency rules enforced |

Create one end-to-end synthetic tender requiring CR, trade licence, three specified audited financial years, editable cover letter, technical methodology, and a prescribed form. Demonstrate missing evidence, vault matching, project editing, comments, reorder, freeze, preview, authorized test marks, final verification, and a simulated/manual-evidence submission. Use a clearly synthetic non-signature test mark for automated tests, not a real executive signature or stamp.

Then renew the CR and change the cover letter. Assert that the prior frozen/submitted artifact, index, approvals, source references, and checksums remain unchanged, and that only the new working revision requires renewed checks.

## 21. Implementation increments

### Increment A — Vault and document foundation

Deliver metadata, naming, verification, dates/periods, permissions, revision preservation, required-document slots, search, manual evidence selection, and functional renewal warnings. Verify existing record migration and no automatic approval on upload.

### Increment B — Project workspace and pack control

Deliver project derivatives, supported editing/round-trip fallback, version-aware comments, states, ordering/sections, include/exclude, approval scope, freeze/fork, dependency-aware delete/archive, and immutable manifests. Integrate requirement matching with confirmed parser outputs where available.

### Increment C — Submission generation and distribution

Deliver real PDF assembly/conversions for declared supported formats, preview/QA, page maps, envelopes/native outputs, permissioned visual marks, final approval/verification, controlled review shares, transmittals and receipt history. Certificate-signing integration is enabled only if a supported authorized provider exists; otherwise show it as unavailable and retain a controlled external-signing return/verification workflow where permitted.

### Increment D — Measured improvements

Add richer in-browser editing, advanced redaction/certification flows, connectors, smarter evidence matching, cross-document consistency checks, and improved visual comparison after the complete first journey works. Do not delay core vault, sequencing, freezing, PDF assembly, and review for speculative AI features.

If configuration blocks part of a feature, implement the safe manual/adapter boundary, report the exact limitation, and complete independent authorized work. Do not invent provider credentials or treat mock conversion/signature results as production success.

## 22. Definition of done and final handoff

The module is done when a user can manage verified reusable evidence, satisfy actual project document requirements, edit/review working copies, control order, freeze exact revisions, assemble and inspect genuine outputs, apply permitted marks with authorization, and retain an accurate issue history without changing company masters or past submissions.

Deliver:

1. Actual integration map and concise implementation decisions.
2. Entities/migrations, API and UI routes, permission matrix, workflow mappings, and feature flags.
3. Format/editor/converter/signature support matrix with real limitations and prerequisites.
4. Completed acceptance cases, regression results, type/lint/build outcomes, and rendered-output QA evidence.
5. Screenshots of vault, required-document list, comment review, ordered pack, freeze diff, final preview, and issue history.
6. Setup, deployment and rollback instructions appropriate to the existing repository; no unrequested live deployment.
7. Clear completed/partial/blocked/deferred list, including any unsupported signing or editing functionality.

Begin with repository inspection and the reuse/extend/add map, then implement the first complete vertical slice. Ask only for missing decisions that materially affect authority, confidential-data exposure, paid integrations, or intended behavior; make and document ordinary implementation choices.
