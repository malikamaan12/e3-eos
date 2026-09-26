# Requirements, scope, allocation and design

**Owner of operational truth:** The existing EOS requirement and revision register.  
**Applies to:** Ideas, client requests, tenders, addenda, direct awards, call-offs and change requests.

## One controlled chain

`Source document/version → evidence span → extraction candidate → human review decision → requirement revision → allocation → deliverable/design revision → BOQ/resource demand → work package/task → acceptance/evidence`.

Every link carries the project, scope, actor, time and version. Many source spans may support one requirement; one compound clause can produce several requirements. An extracted candidate is not operational scope until an authorised review publishes it. Preserve source wording, translations as separate derivatives, exclusions, qualification and uncertainty.

## Requirement record

Store a stable requirement ID, revision, title, category, source and evidence spans, original and interpreted text, obligation strength, deliverable, units/quantity, target date/timezone, location, zone, phase, acceptance criteria, owner department, responsible person, status, disposition, dependencies, client-facing visibility, sensitivity, and amendment reason. Mark missing values unknown; never supply a guessed zero, deadline or quantity.

The current revision is a pointer to immutable history. A change may create a new revision, allocation change, approved variation, clarification/RFI, or `not applicable` determination with evidence and authority. No edit silently overwrites an approved design, BOQ, task or client commitment.

## Allocation model

One requirement may be repeated across venues, zones, dates, show periods or departments. Model the shared obligation once and create separately identifiable allocations with quantity, unit, location, time window, owner and delivery state. Where the obligation itself differs materially, create distinct related requirements. A location grouping is a view; regrouping cannot create or remove operational records.

For quantity-controlled requirements, the configured quantity basis determines whether allocations must sum to the requirement quantity or may be independent occurrences. Show unallocated and overallocated amounts. Example: 20 counters allocated 12 to Zone A and 8 to Zone B total 20; changing to a department view keeps the total and both allocations unchanged.

Department ownership and physical location are separate dimensions. A production department can own fabrication of counters in multiple zones, while design, procurement and installation tasks have different owners against the same controlled scope.

## Parser review workflow

1. Register tender package and all document revisions; capture language, issuer, role and amendment relationships.
2. Extract digital text and tables; OCR pages that need it. Track failures and coverage by page, sheet and block.
3. Create evidence-linked candidates with field-level confidence/uncertainty.
4. Match candidates to existing requirements and allocations as create, link, revise, split, or unresolved proposals.
5. Show the original clause beside each proposed change, including earlier decisions and downstream impact.
6. Reviewer approves specific actions and previews exact writes before publication.
7. Publish through existing services with idempotency and conflict control; retry/reupload without duplicate requirements.
8. Process an addendum as an impact review; keep previous approval and submitted versions visible.

Start with PDF, scanned PDF, DOCX and XLSX, with English, Arabic and mixed text. Unsupported or low-quality regions remain registered and visibly require manual review. An AI summary is navigation help, not source evidence or approval. See the full parser contract in `../references/E3_EOS_RFP_Parser_Integration_Prompt.md`.

## Design handoff

Design concepts, 2D/3D files, drawings, PDF renditions, comments and approval decisions share a versioned design record. Link each design package to the requirements and allocations it covers. A revised requirement flags affected design, BOQ, schedule, material order, build instruction and submitted pack for impact review. The build team sees only the explicitly released revision; comments and visual comparisons do not change release status.

Completion means each applicable requirement has an accountable outcome: evidenced satisfied, open, rejected, formally amended, reviewed not applicable, or exception-authorised with follow-up. Never silently collapse these outcomes into one completed flag.
