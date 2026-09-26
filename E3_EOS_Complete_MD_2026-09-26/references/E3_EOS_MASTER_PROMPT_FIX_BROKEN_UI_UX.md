# Master Implementation Prompt — Fix Broken E3-EOS UI/UX

Copy and paste the full prompt below into the coding environment that has access to the E3-EOS repository.

---

## PROMPT START

You are working on **E3-EOS — the E3 Enterprise Event Operating System**.

Your task is to perform a full, evidence-based UI/UX repair of the existing application. This is an implementation task, not a design proposal and not a report-only audit. You must inspect the current repository and running application, identify broken or inconsistent UI/UX, fix the underlying shared components and affected screens, and verify the result across routes, themes, languages, viewports and user roles.

## 1. Mandatory first actions

Before editing any code:

1. Read `E3_EOS_GLOBAL_UI_COMPONENT_RULES.md` in full. Treat it as the authoritative UI specification.
2. Read any repository-level and directory-level `AGENTS.md` instructions that apply.
3. Inspect the existing design-system, layout, theme, motion, routing, localization and shared-component files.
4. Inspect package manifests and determine the actual frontend framework, styling approach, component system, test tools and build commands.
5. Discover every user-facing route from the router/source. Do not rely on an old route list.
6. Determine the current staging/local run method from repository configuration. Do not invent ports, URLs or environment variables.
7. Record the starting Git commit and working-tree state. Preserve unrelated existing changes.

Do not begin by installing or replacing a UI library.

## 2. Core objective

Make E3-EOS look and behave like one coherent enterprise operating system across:

- Internal Workspace
- Home and My Work
- Projects and Project Cockpit
- Approvals
- Calendar
- Portfolio
- Reports
- Administration and Settings
- Scope/requirements and RFP parsing
- Design and creative review
- BOQ/commercial control
- Procurement, vendors and assets
- Resource/capacity planning
- Documents and audit trails
- Field Operations
- Client Portal
- Authentication, onboarding and account screens

The final result must be visually consistent, responsive, bilingual, accessible, permission-aware and operationally truthful.

## 3. Protected system boundaries

Preserve the following unless a verified UI integration defect requires a narrow correction:

- Backend/API contracts
- Database schema and migrations
- RBAC and authority rules
- Tenant isolation
- Project lifecycle and stage-gate logic
- Approval and audit rules
- Commercial calculations
- Financial confidentiality
- Client Portal data isolation
- Document control and revision logic
- Existing integrations/connectors
- Working authentication and session behavior
- Existing production/staging deployment configuration

Do not simplify or bypass these systems to make the interface appear functional.

Never:

- Replace real API data with hard-coded sample data.
- fetch confidential data and hide it only with CSS.
- bypass permission checks.
- mark incomplete workflows as complete.
- invent counts, KPIs, project status or financial totals.
- replace the existing component system with a new library.
- perform a wholesale rewrite when shared-component repair is sufficient.

## 4. Fixed visual direction

Preserve the established EOS executive visual identity.

### Dark theme

- Canvas: `#090D16`
- Surface 1: `#0F1624`
- Surface 2: `#151E2E`
- Surface 3: `#1B2638`
- Default border: `#2A374B`
- Primary text: `#F8FAFC`
- Secondary text: `#CBD5E1`
- Muted text: `#94A3B8`

### Bronze/gold brand accent

- Default: `#D97706`
- Hover: `#F59E0B`
- Pressed: `#B45309`

### Semantic colours

- Information: blue
- Success/approved: green
- Warning/pending: amber
- Risk: orange
- Critical/rejected/failed/overdue: red
- Neutral/draft/archived: grey
- Unconfirmed AI suggestion: purple

Do not use bronze for danger or failure. Do not create module-specific palettes. Use semantic tokens, not raw hex values inside feature components.

## 5. Global component strategy

Repair problems at the highest reusable level possible.

Decision order:

1. Reuse an existing global component.
2. Correct or extend an existing global component.
3. Compose existing primitives into a reusable shared pattern.
4. Create a new global component only when no suitable component exists.

Do not leave page-local copies of buttons, tabs, tables, cards, form controls, dialogs, badges, loaders, empty states or alerts.

Where shared components exist, consolidate inconsistent implementations into the shared version without breaking business behavior.

## 6. Audit every route

Create a route inventory from source and inspect every accessible user-facing route.

For each route, inspect:

- Initial loading
- Loaded state
- Empty state
- Error state
- Permission-denied/read-only state
- Long content
- Narrow content
- Dense data
- Dropdowns and overflow menus
- Modals and drawers
- Tabs
- Tables
- Forms and validation
- Navigation and back behavior
- Scroll behavior
- Theme switching
- EN/Arabic switching
- Keyboard navigation
- Actual button/link behavior
- Browser console errors
- Failed network requests

Do not mark a route as passed merely because the initial screenshot looks acceptable.

## 7. Mandatory viewports and modes

Test every major route at minimum:

| Viewport | Width | Required use |
|---|---:|---|
| Mobile | `390px` | Single-column and task-first behavior |
| Tablet | `768px` | Drawer and table/card transition |
| Laptop | `1024px` | Compact desktop layout |
| Desktop | `1440px` | Full enterprise workspace |

Test in:

- Dark theme
- Light theme
- English LTR
- Arabic RTL

Prioritize the complete cross-product matrix for shells, shared components and critical routes. Use risk-based sampling for secondary pages only after shared-component coverage is proven.

## 8. Defect classes to find and fix

Search systematically for all of the following.

### Layout and responsive defects

- Horizontal page overflow
- Content hidden behind sidebar/top bar/sticky footer
- Cards extending outside the viewport
- Unequal or broken gutters
- Misaligned headings, cards and actions
- Excessive unused space
- Nested cards creating visual clutter
- Controls wrapping incorrectly
- Buttons becoming too small
- Modal content cut off
- Drawers wider than the viewport
- Sticky elements overlapping content
- Incorrect mobile stacking order
- Desktop navigation compressed into mobile
- Tables squeezed until text is unreadable
- Fixed widths that break Arabic or long content

### Navigation defects

- Wrong active sidebar item
- Inconsistent sidebar order
- Route changes that retain an old scroll position
- Broken breadcrumbs
- Dead links
- Duplicate navigation destinations
- Project modules incorrectly added to global navigation
- Back button losing context
- Tabs not reflected in URL where persistence is required
- Mobile navigation that cannot be closed or reached by keyboard

After route navigation, the main content must reset to logical `{ top: 0, left: 0 }` unless the user is intentionally returning to a preserved list/tab state.

### Tabs and segmented controls

- Different tab styles across modules
- Wrapped or squeezed tabs
- Active tab not visible on mobile
- Tab switch causing full-page reload
- Tab panel height collapse while loading
- Filters/scroll unexpectedly resetting when returning to a tab
- Missing keyboard arrow/Home/End behavior
- Segmented view switches incorrectly styled as page tabs

Use:

- Page tabs: `44px` high with a `2px` bronze active underline.
- Compact tabs: `36px` high.
- Segmented controls: contained selection without underline.
- More than six page tabs: use controlled horizontal scrolling or `More`; never wrap randomly.

### Tables

- Column clipping
- Header/data misalignment
- Inconsistent row height
- Broken sticky headers
- Row actions outside the viewport
- Entire page scrolling horizontally
- Incorrect number/date/financial alignment
- Missing loading/empty/error states
- Search resetting filters
- Sorting indicators not reflecting actual sort
- Bulk actions without selection context
- `Select all` affecting hidden pages unexpectedly
- No mobile treatment
- Client-visible restricted columns

Table rules:

- Standard header: `40px`.
- Standard row: `48px`.
- Compact row: `40px`.
- Use subtle dividers; no default zebra striping.
- Text aligns inline-start; numbers and financial values inline-end.
- Checkbox is first logical column; actions are final logical pinned column.
- Table container may scroll horizontally; page may not.
- Below `768px`, operational tables become record cards. True comparison matrices may remain horizontally scrollable with a visible cue.
- Render header plus skeleton rows during loading.
- Preserve filters/sort/page in URL for major registers.

### Forms

- Placeholder-only fields
- Missing or detached labels
- Inconsistent heights
- Validation only shown after losing user data
- Error colour without message/icon
- Disabled inputs used to present read-only information
- Currency without currency/value type
- Date/time without required timezone context
- Submit buttons remaining active while saving
- Duplicate submissions
- Form state lost on tab/language change
- Long Arabic labels clipped
- Select dropdowns opening outside the viewport
- Switches incorrectly used for Save/Submit actions

Form rules:

- Standard height: `40px`; Field mode: `48px`.
- Validate format on blur and business rules on review/submit.
- Preserve entered values after failure.
- Long forms require an error summary linked to invalid fields.
- Financial values display QAR or configured currency and assumption/expected/fixed classification.
- Autosave reports `Saving`, `Saved` or `Could not save` truthfully.

### Buttons and actions

- Multiple competing primary buttons
- Icon-only buttons without accessible name/tooltip
- Destructive action styled as brand action
- Vague labels such as Yes/No when action can be named
- Loading button width changing
- Hidden actions available only on hover
- Buttons that appear active but do nothing
- Action state not reflected after API response

Minimum target: `44 × 44px`; Field Operations: `48 × 48px` or larger.

### Cards and dashboards

- KPI numbers without definitions
- Misaligned metric cards
- Inconsistent padding/radius
- Clickable appearance without click behavior
- Nested raised cards
- Unsupported/fake dashboard values
- Charts plotting missing data as zero
- Unclear reporting period/filter context
- Excessive glow, gradients or decorative effects

### Dialogs, drawers and overlays

- Missing focus trap
- Focus not returned to trigger
- Background page still interactive
- Escape behavior causing data loss
- Drawer opening from another drawer
- Footer actions off-screen
- RTL opening from the wrong side
- Destructive confirmation not naming impact
- Menus clipped by containers
- Tooltips containing essential instructions

### Loading, empty, error and offline states

- Blank screen during loading
- Full-page spinner where a skeleton is possible
- Layout shift after loading
- Infinite loading without error/timeout
- Generic empty state for filtered results
- Error replacing the entire page when only one region failed
- Permission state exposing record names or counts
- Offline actions without queue status
- Stale data without timestamp
- Retry repeating a dangerous mutation

### Arabic and RTL

- `dir` and `lang` not synchronized
- Sidebar, drawers, tabs, steppers or chevrons not mirrored
- Numbers/charts/logos incorrectly mirrored
- Hard-coded left/right CSS
- Pinned table columns on wrong side
- Mixed Arabic/English text unreadable
- Arabic labels clipped or overlapping icons
- Language switch reloading the page or losing unsaved state

Use logical CSS properties such as `margin-inline`, `padding-inline`, `inset-inline` and `border-inline`.

### Accessibility

- Missing visible focus
- Incorrect heading order
- Unlabelled controls
- Inaccessible icon buttons
- Dialog/tab/table semantics missing
- Colour-only statuses
- Insufficient contrast
- Drag-only interaction
- Missing keyboard alternative
- Dynamic save/sync/error result not announced
- Motion not respecting `prefers-reduced-motion`

Target WCAG 2.2 AA.

### Permission and data-truth defects

- UI actions shown to roles that cannot perform them
- Disabled actions without an explanation
- Client Portal exposing internal comments, supplier margins, staff notes or internal approval chains
- Hidden data still present in network payloads
- Incorrect project counts or status summaries
- UI claiming success before server confirmation
- Empty API response replaced with mock content
- Stale cache presented as live without timestamp

## 9. Motion and interaction repair

Use the shared motion system. Do not add local arbitrary animation.

Approved maximum patterns:

- Hover/pressed: `80–120ms`
- Tabs/dropdowns/accordion: `140–180ms`
- Dialog: `200ms`
- Page content: `220ms`
- Drawer/panel: `240ms`
- No operational animation longer than `320ms`

Use Framer Motion only through shared variants/utilities.

Approved patterns:

- Page: opacity `0→1`, Y `4→0`.
- Tab panel: opacity `0→1`, Y `2→0`.
- Dialog: opacity `0→1`, scale `.98→1`.
- Drawer LTR: X `24→0`; RTL: X `-24→0`.

Prohibited:

- Bouncing buttons
- Animated KPI counting on routine load
- Constant pulsing cards
- Large parallax
- Decorative particles
- Excessive glassmorphism
- Gradient text
- Animation that delays user action

Reduced-motion mode removes translation/scale and limits opacity transitions to approximately `80ms`.

## 10. Component repair priorities

Fix in this order so page work inherits corrected foundations:

1. Theme and semantic tokens
2. Typography, spacing, borders, radius and focus
3. Application shell and scroll behavior
4. Button and icon button
5. FormField, input, select, checkbox, radio and switch
6. Tabs and segmented controls
7. DataTable, toolbar, filters, pagination and mobile record cards
8. Card, KPI, badges and chart frames
9. Dialog, drawer, dropdown, popover and tooltip
10. Toast, alert, banner, skeleton, empty/error/permission states
11. Breadcrumbs, project navigation and command palette
12. Lifecycle, approval, audit and controlled-record components
13. Domain pages and remaining route-specific defects

## 11. Functional interaction testing

Test real workflows, not only component rendering.

At minimum verify:

1. Sign in and session restoration.
2. Change light/dark/system theme without flash.
3. Change English/Arabic without losing state.
4. Navigate through all eight primary sidebar destinations.
5. Open a project and move through Project Cockpit modules.
6. Create/edit/save a permitted record.
7. Trigger and correct validation errors.
8. Search, filter, sort and paginate a register.
9. Open/close a dialog, drawer, menu and tooltip by mouse and keyboard.
10. Submit an approval action and verify server-confirmed state.
11. Verify read-only and permission-denied behavior with appropriate roles.
12. Verify Client Portal cannot access internal commercial fields.
13. Verify a Field flow at `390px`, including offline/queued state if supported by the current environment.
14. Verify onboarding incomplete state and `Resume onboarding` path when applicable.
15. Verify lifecycle/stage components use real project configuration rather than a hard-coded stage list.

Do not modify real production data. Use the approved development/staging test fixture strategy.

## 12. Evidence and artifacts

Create or update:

```text
artifacts/ui-audit/
  route-inventory.md
  component-inventory.md
  defect-register.md
  verification-matrix.md
  final-ui-ux-report.md
  before/
  after/
```

### Defect register fields

Each defect must include:

| Field | Requirement |
|---|---|
| ID | Stable `UI-###` identifier |
| Route/component | Exact location |
| Severity | P0, P1, P2 or P3 |
| Category | Layout, interaction, accessibility, RTL, permission, data truth, etc. |
| Reproduction | Exact steps |
| Expected | Required behavior |
| Actual | Observed broken behavior |
| Root cause | Actual source-level cause |
| Fix | Files/components changed |
| Verification | Test and screenshot evidence |
| Status | Open, Fixed, Verified or Blocked |

### Screenshot naming

Use deterministic names such as:

```text
projects_1440_dark_en_before.png
projects_1440_dark_en_after.png
approvals_390_dark_ar_before.png
approvals_390_dark_ar_after.png
```

Screenshots must use the same route, state, viewport, theme, locale and dataset before and after.

## 13. Verification commands

Run the repository's real commands for:

- Formatting/lint
- Strict type checking
- Unit/component tests
- Integration tests
- Frontend build
- Existing smoke/E2E tests
- New UI interaction tests
- Accessibility checks
- Visual regression/capture

Do not invent command names. Discover them from package manifests and CI configuration.

Inspect:

- Browser console errors
- Unhandled promise rejections
- Failed frontend requests
- Hydration warnings
- React key warnings
- Layout overflow
- Accessibility violations

Every command must exit successfully or be recorded as an unresolved blocker with exact evidence.

## 14. Regression requirements

After each shared-component repair, retest all consuming routes.

Particular regression checks:

- Dark and light themes
- EN and Arabic RTL
- `390`, `768`, `1024`, `1440px`
- Long project and client names
- Empty datasets
- Large tables
- Slow loading
- API error
- Read-only role
- Client role
- Super Admin role where available
- Reduced motion
- Keyboard-only operation

## 15. Completion criteria

The task is complete only when:

- All discovered P0 and P1 UI/UX defects are fixed and verified.
- P2/P3 defects are fixed or explicitly documented with a justified blocker.
- All screens use approved global components or documented shared extensions.
- No full-page horizontal overflow exists at mandatory widths.
- Tables have controlled overflow/mobile behavior.
- Tabs, forms, buttons, cards, dialogs and states are consistent across modules.
- English and Arabic RTL pass visual and interaction checks.
- Light, dark and system themes work without flash or illegible states.
- Keyboard and focus behavior work across critical journeys.
- Client Portal confidentiality remains enforced at the API/permission layer.
- Real data is shown truthfully; no UI-only mock fallback is added.
- Build, typecheck and relevant test suites pass.
- Before/after evidence exists for every fixed defect.
- `final-ui-ux-report.md` maps every defect to code and verification evidence.

Automated testing does **not** complete human UAT. Keep Human UAT at `0/11` unless actual human participants complete and sign off the defined journeys.

## 16. Final response format

Return:

1. **Outcome:** concise summary of what was repaired.
2. **Starting and final commit:** exact SHAs.
3. **Routes audited:** passed/failed/blocked counts.
4. **Defects:** count by P0/P1/P2/P3 and final status.
5. **Shared components changed:** exact files and impact.
6. **Major UX fixes:** grouped by shell, navigation, tabs, tables, forms, overlays, responsive, RTL and accessibility.
7. **Verification:** exact commands and results.
8. **Evidence:** paths to before/after screenshots, defect register and final report.
9. **Remaining blockers:** only genuine unresolved items with reason and next action.
10. **Human UAT:** clearly state that it remains pending unless genuinely performed.

Do not claim success without build/test results and visual evidence. Do not stop after writing the audit. Implement the repairs, retest the application and provide the final verified evidence package.

## PROMPT END

