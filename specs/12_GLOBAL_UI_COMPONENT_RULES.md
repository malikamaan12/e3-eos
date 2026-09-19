# E3-EOS Global UI Component Rules

**Status:** Global design-system specification  
**Applies to:** Internal Workspace, Project Cockpit, Client Portal, Administration and Field Operations  
**Purpose:** Ensure every E3-EOS screen uses the same visual, interaction, animation, accessibility and responsive rules.

---

## 1. Core Directive

E3-EOS must behave as one product, not a collection of independently designed modules.

All new screens must use the existing EOS component system, semantic tokens and shared patterns. Do not introduce another UI library or create local one-off versions of buttons, tabs, tables, forms, cards, dialogs or status labels.

Framer Motion may be used for controlled interaction animation. It is not permission to redesign existing components or add decorative motion.

### Non-negotiable rules

- Preserve the current executive dark visual language.
- Primary dark canvas: `#090D16`.
- Bronze/gold accent family: `#D97706`, `#B45309`, `#F59E0B`.
- Maintain light, dark and system themes.
- Maintain instant English/Arabic switching and true RTL mirroring.
- Minimum interactive target: `44 × 44px`; Field mode target: `48 × 48px` or larger.
- Do not expose confidential financial, supplier-margin or internal approval data in the Client Portal.
- Permission, workflow and lifecycle rules must come from the backend/RBAC model.
- No animation may delay a user action or hide a system result.
- No component may shift position after data loads.
- No page may require horizontal page scrolling. Only bounded data regions such as tables may scroll horizontally.

---

## 2. Design Token System

Components must consume semantic variables. Raw hex values, arbitrary spacing and local shadows are prohibited inside feature modules.

### 2.1 Dark theme tokens

| Token | Value | Use |
|---|---:|---|
| `--canvas` | `#090D16` | Application background |
| `--surface-1` | `#0F1624` | Main panels and sidebar |
| `--surface-2` | `#151E2E` | Raised cards, menus and drawers |
| `--surface-3` | `#1B2638` | Hovered/selected neutral surface |
| `--surface-inset` | `#0B111D` | Inputs, code/data wells |
| `--border-subtle` | `#1D2939` | Quiet separators |
| `--border-default` | `#2A374B` | Controls and card boundaries |
| `--border-strong` | `#475467` | High-emphasis boundaries |
| `--text-primary` | `#F8FAFC` | Main text |
| `--text-secondary` | `#CBD5E1` | Supporting text |
| `--text-muted` | `#94A3B8` | Metadata and placeholders |
| `--text-disabled` | `#64748B` | Disabled text |
| `--accent` | `#D97706` | Primary brand action |
| `--accent-hover` | `#F59E0B` | Accent hover |
| `--accent-pressed` | `#B45309` | Accent pressed |
| `--accent-soft` | `rgba(217,119,6,.14)` | Active/selected background |
| `--focus-ring` | `#F59E0B` | Keyboard focus |

### 2.2 Light theme tokens

| Token | Value | Use |
|---|---:|---|
| `--canvas` | `#F4F6F8` | Application background |
| `--surface-1` | `#FFFFFF` | Main panels and sidebar |
| `--surface-2` | `#FFFFFF` | Raised cards, menus and drawers |
| `--surface-3` | `#F8FAFC` | Hovered/selected neutral surface |
| `--surface-inset` | `#EEF2F6` | Inputs, code/data wells |
| `--border-subtle` | `#E4E7EC` | Quiet separators |
| `--border-default` | `#D0D5DD` | Controls and card boundaries |
| `--border-strong` | `#98A2B3` | High-emphasis boundaries |
| `--text-primary` | `#101828` | Main text |
| `--text-secondary` | `#344054` | Supporting text |
| `--text-muted` | `#667085` | Metadata and placeholders |
| `--text-disabled` | `#98A2B3` | Disabled text |
| `--accent` | `#B45309` | Primary brand action |
| `--accent-hover` | `#92400E` | Accent hover |
| `--accent-pressed` | `#78350F` | Accent pressed |
| `--accent-soft` | `#FFF7ED` | Active/selected background |
| `--focus-ring` | `#D97706` | Keyboard focus |

### 2.3 Semantic status tokens

| Meaning | Foreground | Soft background | Use |
|---|---:|---:|---|
| Information | `#3B82F6` | `rgba(59,130,246,.14)` | Informational state |
| Success | `#22C55E` | `rgba(34,197,94,.14)` | Complete, approved, healthy |
| Warning | `#F59E0B` | `rgba(245,158,11,.14)` | Attention required |
| Risk | `#F97316` | `rgba(249,115,22,.14)` | At risk, SLA near due |
| Critical | `#EF4444` | `rgba(239,68,68,.14)` | Failed, overdue, rejected |
| Neutral | `#94A3B8` | `rgba(148,163,184,.14)` | Draft, inactive, archived |
| AI suggestion | `#8B5CF6` | `rgba(139,92,246,.14)` | Unconfirmed AI-generated content |

Never use the bronze brand colour to represent danger, failure or rejection.

### 2.4 Typography

Use the current EOS screen font. The approved fallback stack is:

```css
font-family: Inter, "Noto Sans Arabic", system-ui, sans-serif;
```

| Style | Size / line height | Weight | Use |
|---|---:|---:|---|
| Display | `32 / 40` | 700 | Major executive view only |
| Page title | `24 / 32` | 650–700 | One per page |
| Section title | `18 / 26` | 600 | Major page sections |
| Card title | `15 / 22` | 600 | Cards and panels |
| Body | `14 / 22` | 400 | Default content |
| Body strong | `14 / 22` | 600 | Emphasis |
| Label | `13 / 18` | 500 | Forms and controls |
| Table | `13 / 18` | 400–500 | Data tables |
| Caption | `12 / 16` | 400 | Metadata |
| KPI | `28 / 32` | 700 | Dashboard metric |

Rules:

- UI copy uses sentence case.
- All financial values, durations, quantities, dates and KPI values use tabular numerals.
- Do not use font size below `12px`.
- Do not use more than three typographic levels inside one card.
- Arabic text must have equal hierarchy and comfortable line height, not a smaller visual weight.

### 2.5 Spacing

Use the 4px scale only:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`

Common rules:

- Related control gap: `8px`.
- Form field gap: `16px`.
- Card internal padding: `20px` desktop, `16px` mobile.
- Section gap: `24px` or `32px`.
- Page gutter: `32px` desktop, `24px` tablet, `16px` mobile.
- Never use arbitrary values such as `13px`, `19px` or `27px` for layout spacing.

### 2.6 Radius

| Token | Value | Use |
|---|---:|---|
| `--radius-xs` | `4px` | Small tags and inner elements |
| `--radius-sm` | `6px` | Inputs, compact controls |
| `--radius-md` | `8px` | Buttons, menus, normal cards |
| `--radius-lg` | `12px` | Panels, drawers and dialogs |
| `--radius-xl` | `16px` | Major dashboard feature card only |
| `--radius-pill` | `999px` | Badges and avatars only |

Do not use pill styling for normal buttons, tabs, inputs or cards.

### 2.7 Borders and elevation

- Cards use a `1px` semantic border.
- Dark theme should rely on tonal separation plus border, not heavy shadow.
- Floating menus/dialogs use border plus one controlled shadow.
- Do not stack multiple shadows.
- Selected items use `accent-soft` background and/or accent border—not glow effects.

Elevation levels:

| Level | Use |
|---|---|
| 0 | Canvas and inline sections |
| 1 | Cards and sticky headers |
| 2 | Menus, popovers and tooltips |
| 3 | Drawers and dialogs |
| 4 | Critical system overlay only |

### 2.8 Iconography

- Use one existing icon family only.
- Standard icon sizes: `16px`, `20px`, `24px`.
- Stroke weight must remain visually consistent.
- Unknown icons require a text label or tooltip.
- Directional icons mirror in RTL.
- Search, download, upload, media and universal symbols do not mirror.

---

## 3. Global Interaction Rules

Every interactive component must define:

1. Default
2. Hover
3. Focus-visible
4. Active/pressed
5. Selected
6. Disabled
7. Loading
8. Error where applicable
9. Read-only where applicable

### 3.1 Focus

- Keyboard focus ring: `2px solid var(--focus-ring)`.
- Focus offset: `2px`.
- Focus must never be removed without an accessible replacement.
- Mouse click does not need to show the full focus ring; keyboard navigation does.

### 3.2 Hover

- Hover changes one or two properties only: surface, border or text/icon colour.
- Do not move components on hover.
- Do not enlarge dashboard cards on hover.
- Touch devices must not depend on hover for discovery.

### 3.3 Pressed

- Pressed state may reduce brightness or use `accent-pressed`.
- Optional scale is limited to `0.99`; never bounce.

### 3.4 Disabled and read-only

- Disabled controls remain legible at approximately 50–60% emphasis.
- Disabled state blocks pointer and keyboard activation.
- Read-only values remain fully legible and selectable.
- Where the restriction matters, provide a tooltip or inline reason such as “Requires Commercial Approver permission.”

### 3.5 Loading

- Buttons keep their width while loading.
- Show a spinner and change label to the current action when helpful: “Saving…”, “Submitting…”.
- Loading must prevent duplicate submissions.
- Whole-page spinners are prohibited when a stable skeleton can be shown.

---

## 4. Motion and Animation System

Motion communicates relationship, state and direction. It is never decoration.

### 4.1 Duration tokens

| Token | Duration | Use |
|---|---:|---|
| `--motion-instant` | `80ms` | Tooltip and small colour response |
| `--motion-fast` | `120ms` | Hover, pressed, switch |
| `--motion-base` | `180ms` | Tabs, dropdown, accordion |
| `--motion-panel` | `240ms` | Drawer and side panel |
| `--motion-modal` | `200ms` | Dialog enter/exit |
| `--motion-page` | `220ms` | Page/content transition |

### 4.2 Easing

```css
--ease-standard: cubic-bezier(.2, 0, 0, 1);
--ease-enter: cubic-bezier(0, 0, .2, 1);
--ease-exit: cubic-bezier(.4, 0, 1, 1);
```

### 4.3 Approved transitions

| Component | Enter | Exit |
|---|---|---|
| Page content | Opacity 0→1, Y 4→0, 220ms | Opacity 1→0, 120ms |
| Tab panel | Opacity 0→1, Y 2→0, 160ms | Opacity 1→0, 100ms |
| Dropdown | Opacity 0→1, Y -4→0, 140ms | Opacity 1→0, 100ms |
| Drawer LTR | X 24→0, opacity 0→1, 240ms | X 0→24, 180ms |
| Drawer RTL | X -24→0, opacity 0→1, 240ms | X 0→-24, 180ms |
| Modal | Scale .98→1, opacity 0→1, 200ms | Scale 1→.98, 140ms |
| Accordion | Height + opacity, 180ms | Height + opacity, 140ms |
| Toast | Y 8→0, opacity 0→1, 180ms | X 16 + opacity, 140ms |
| Skeleton | Subtle opacity pulse, 1.4s | Removed immediately when data is stable |

### 4.4 Prohibited motion

- No bouncing buttons.
- No infinite icon rotation except an active loading spinner.
- No animated KPI counting on routine page load.
- No pulsing cards except an active critical live incident indicator.
- No large parallax, decorative particles or glassmorphism effects.
- No route animation that blocks the next page.
- No animation longer than `320ms` in operational workflows.

### 4.5 Reduced motion

When `prefers-reduced-motion: reduce` is active:

- Remove translation and scale.
- Replace transitions with a maximum `80ms` opacity change.
- Stop skeleton shimmer; use a static skeleton.
- Never auto-scroll users.

---

## 5. Layout and Responsive Rules

### 5.1 Breakpoints

| Name | Width | Rule |
|---|---:|---|
| Mobile | `390–767px` | Single column, task-first |
| Tablet | `768–1023px` | 8-column grid, drawers replace side panels |
| Desktop | `1024–1439px` | 12-column grid |
| Wide | `1440px+` | 12-column grid, expanded data workspace |

Visual QA is mandatory at `390`, `768`, `1024` and `1440px` widths.

### 5.2 Application shell

- Expanded sidebar: `256px`.
- Collapsed sidebar: `72px`.
- Top bar: `64px`.
- Main content must start at scroll position `{ top: 0, left: 0 }` after navigation.
- Sidebar labels do not wrap.
- Mobile navigation uses a drawer or approved bottom task navigation—never a compressed desktop sidebar.
- The `STAGING` badge is subtle but always visible in non-production environments.
- Technical infrastructure strings such as cloud region, host or internal service names must not appear in user-facing navigation.

### 5.3 Page structure

Use this order:

1. Breadcrumbs when needed
2. Page title, description and primary action
3. Context/status banner when needed
4. KPI or summary region
5. Tabs or section navigation
6. Primary working area
7. Supporting information
8. Sticky action bar for long workflows

Avoid nested cards deeper than two visual levels.

---

## 6. Tabs

Tabs switch between related views inside the same page context.

### 6.1 Tab types

#### A. Page tabs

Use for major sections within a record or project.

- Height: `44px`.
- Label: `14px / 600`.
- Default: transparent background, secondary text.
- Hover: primary text and subtle surface.
- Active: primary text with `2px` bronze underline.
- Underline spans the label area, not the full page width.
- Optional count badge follows the label.
- Page tabs may update the URL so reload/back navigation preserves the selected section.

#### B. Compact tabs

Use inside cards or drawers.

- Height: `36px`.
- Label: `13px / 600`.
- Active underline: `2px`.
- Maximum four visible tabs.

#### C. Segmented control

Use only for mutually exclusive modes such as Table / Board / Calendar.

- Height: `36px` or `40px`.
- Contained neutral background.
- Active segment uses raised surface, strong text and subtle border.
- Do not use an underline.

### 6.2 Tab behavior

- Recommended maximum visible page tabs: 6.
- Additional tabs go into `More` rather than squeezing or wrapping.
- On mobile, tabs scroll horizontally within their container; the page itself must not scroll horizontally.
- Active tab automatically scrolls into view.
- Left/right arrow keys move between tabs; Home/End move to first/last.
- Disabled tabs show the reason on focus/hover.
- Unsaved changes must be resolved before switching tabs.
- Tab content transition: `160ms` opacity plus `2px` vertical movement.
- Do not reload the entire page when switching local tabs.

### 6.3 Tab content rules

- Keep the tab bar position stable.
- Do not show a spinner that collapses the panel height.
- Use a panel-specific skeleton.
- Preserve filters and scroll position when returning to a tab unless the user explicitly resets them.

---

## 7. Data Tables

Tables are the default for structured, comparable enterprise records. They must remain readable before they become compact.

### 7.1 Anatomy

1. Table toolbar
2. Optional saved-view/filter row
3. Header row
4. Data rows
5. Optional summary/footer row
6. Pagination or controlled infinite loading

### 7.2 Dimensions

| Part | Standard | Compact |
|---|---:|---:|
| Header height | `40px` | `36px` |
| Row height | `48px` | `40px` |
| Cell inline padding | `12px` | `8px` |
| Cell block padding | `10px` | `8px` |
| Checkbox column | `44px` | `40px` |
| Actions column | `48px` | `44px` |

Comfortable mode may use `56px` rows when rows include two-line person/project metadata.

### 7.3 Alignment

- Text and names align to inline-start.
- Numbers, quantity, percentage and financial values align to inline-end.
- Dates align to inline-start unless a numeric comparison table requires inline-end.
- Status badges align consistently per table.
- Checkbox is the first logical column.
- Row actions are the last logical pinned column.
- RTL uses logical start/end, not hard-coded left/right.

### 7.4 Width and overflow

- Do not compress columns until values become unreadable.
- Essential text columns have a defined minimum width.
- Long descriptions truncate to two lines with tooltip or detail drawer access.
- The table container may scroll horizontally; the page may not.
- First identity column and final actions column may be pinned.
- Sticky header is required for tables taller than the viewport.
- Never hide required columns without showing how to restore them.

### 7.5 Rows

- Use subtle dividers, not heavy grid lines.
- Do not use zebra striping in the default EOS theme.
- Hover changes background only.
- Selected row uses `accent-soft` with an accent selection marker.
- Overdue/critical state uses a status indicator, not a full red row.
- Entire-row click is allowed only when the row clearly represents one navigable record.
- Buttons/menus inside the row must not trigger the row click.

### 7.6 Sorting and filtering

- Sortable headers show a quiet indicator on hover and a clear ascending/descending state when active.
- Default sort must be documented per register.
- Active filters appear as removable chips above the table.
- `Clear all` is shown when two or more filters are active.
- Filter counts must reflect the current permission-scoped dataset.
- Search debounces at approximately `250–350ms` and must not reset unrelated filters.

### 7.7 Selection and bulk actions

- Selection checkbox appears only when bulk action exists.
- Selecting rows opens a sticky bulk-action bar.
- Bulk destructive actions require confirmation and show the exact number of affected records.
- `Select all` applies to the visible page by default. Selecting all matching records requires a separate explicit action.

### 7.8 Pagination

- Default page size: `25`.
- Options: `10`, `25`, `50`, `100`.
- Show item range and total when the backend provides a truthful total.
- Preserve page, sort and filter state in the URL for major registers.
- For live logs, use controlled cursor loading rather than numbered pages.

### 7.9 Table states

- Loading: render header plus 6–10 skeleton rows.
- Empty first-use: explain the register and show the allowed creation action.
- Empty filtered: show `No results` and `Clear filters`.
- Error: retain toolbar/filter context and provide retry.
- Permission restricted: explain the restricted scope without exposing record names/counts.
- Stale data: show last refreshed time and refresh control.

### 7.10 Mobile table behavior

Below `768px`:

- Convert operational tables to record cards using the same data source.
- Prioritize identity, status, owner, due date and primary action.
- Secondary fields appear in an expandable area or detail screen.
- Do not render desktop tables at tiny font sizes.
- A table may remain scrollable on mobile only for true comparison matrices such as BOQ or traceability; show a visual horizontal-scroll cue.

### 7.11 Performance

- Virtualize tables above approximately 200 rendered rows.
- Keep column definitions stable.
- Avoid recalculating row actions on every hover.
- Never fetch confidential columns and merely hide them visually.

---

## 8. Buttons

### 8.1 Variants

| Variant | Use |
|---|---|
| Primary | One main action per region |
| Secondary | Supporting action |
| Tertiary/Ghost | Low-emphasis action |
| Destructive | Delete, revoke, cancel controlled item |
| Success | Rare; confirm/complete where green meaning is explicit |
| Icon-only | Familiar action with tooltip and accessible label |

### 8.2 Sizes

| Size | Height | Padding | Text |
|---|---:|---:|---:|
| Small | `32px` | `10–12px` | `13px` |
| Medium | `40px` | `14–16px` | `14px` |
| Large | `48px` | `18–20px` | `15px` |
| Field | `52px` minimum | `20px` | `16px` |

Rules:

- One primary button per card/dialog/action area.
- Icon and label gap: `8px`.
- Destructive primary colour is red, not bronze.
- Button label uses a verb: `Create project`, `Submit for approval`, `Save draft`.
- Do not use `Yes` or `No` when the actual action can be named.
- Loading preserves width and blocks repeat submission.

---

## 9. Form Controls

### 9.1 Field anatomy

1. Visible label
2. Optional helper text
3. Input/control
4. Validation or status message
5. Optional character/unit indicator

### 9.2 General rules

- Standard control height: `40px`; touch/Field mode: `48px`.
- Labels remain visible; placeholders are examples, not labels.
- Required status must be available to assistive technology and explained once per form.
- Input focus uses focus ring and strong border.
- Errors use red border, icon and message; never red border alone.
- Read-only data uses a read-only field or definition-list pattern, not a disabled input.
- Financial fields always show currency, normally QAR, and the valuation type: assumption, expected or fixed.
- Date/time fields show timezone when project and user timezones differ.
- Autosave displays `Saving`, `Saved` or `Could not save` visibly.

### 9.3 Text input

- Single-line values only.
- Prefix/suffix allowed for currency, percentage, units and IDs.
- Clear button appears only when useful and accessible.

### 9.4 Text area

- Minimum 3 rows; auto-grow up to a defined maximum.
- Character limit shown when enforced.
- Long controlled notes require a reason/description prompt, not a tiny text area.

### 9.5 Select and combobox

- Native-like select for short fixed lists.
- Searchable combobox for more than 10 options.
- Multi-select displays removable chips, with overflow count after 3–4 visible chips.
- Async results show loading, empty and error states.
- Option groups require visible headings.

### 9.6 Checkbox, radio and switch

- Checkbox: select any number of independent choices.
- Radio: select one choice from a visible group.
- Switch: an immediate on/off setting only.
- Do not use a switch for actions requiring Save/Submit or confirmation.
- Indeterminate checkbox is required for partial table selection.

### 9.7 Date and time

- Use date picker for dates and a separate time control when precision matters.
- Deadlines show timezone.
- Ranges show start and end clearly.
- Past-date restrictions must be explained before submission.

### 9.8 Validation

- Validate format on blur, not on every keystroke.
- Validate cross-field/business rules on review or submission.
- Move focus to an error summary for long forms.
- Error summary links to each invalid field.
- Do not clear entered values after a failed submission.

---

## 10. Cards and Panels

### 10.1 Card anatomy

- Optional icon/status
- Title
- Supporting metadata
- Main content
- Optional footer/action area

### 10.2 Rules

- Standard padding: `20px`; mobile: `16px`.
- Standard radius: `12px` for major panels, `8px` for data cards.
- Card title remains left/inline-start aligned.
- Card actions sit at inline-end.
- Do not make every card clickable.
- If clickable, the complete card gets a clear hover/focus state and accessible name.
- Do not nest a raised card inside another raised card. Use sections/dividers inside the parent.
- KPI cards show value, label, context and optional trend; never show an unexplained number.

---

## 11. Navigation

### 11.1 Primary sidebar

Fixed order:

1. Home
2. My Work
3. Projects
4. Approvals
5. Calendar
6. Portfolio
7. Reports
8. Administration

Rules:

- Active item uses accent-soft background, bronze indicator and primary text.
- Hover uses surface-3.
- Icons remain `20px`.
- Navigation labels do not wrap.
- Count badges use semantic status only when urgency is meaningful.
- Modules within a project belong to the Project Cockpit, not the global sidebar.

### 11.2 Breadcrumbs

- Show hierarchy, not browser history.
- Current page is text, not a link.
- Collapse middle levels when space is limited.
- Mirror separators in RTL.

### 11.3 Project navigation

- Use grouped workstreams with a clear active state.
- Hide modules that do not apply to the project type.
- Permission-hidden modules must not leave blank gaps.
- Configuration may reorder modules, but styling remains fixed.

### 11.4 Command palette/global search

- Keyboard shortcut is visible.
- Results grouped by Projects, Records, People and Actions.
- Search never exposes inaccessible records.
- Recent items are permission-filtered.

---

## 12. Status Badges and Tags

### 12.1 Badge rules

- Height: `22–24px`.
- Horizontal padding: `8px`.
- Text: `12px / 600`.
- Use semantic soft background plus matching text/icon.
- Include a dot/icon when status distinction is important.
- Maximum two badges in a compact table cell; additional status opens in detail.

### 12.2 Meaning

- Green: approved, completed, healthy.
- Amber: attention, pending or due soon.
- Orange: at risk.
- Red: failed, blocked, rejected or overdue.
- Blue: informational/in progress.
- Grey: draft, inactive, not started, archived.
- Purple: AI suggestion only.

Status wording must be consistent across modules. Do not use `Complete`, `Completed` and `Done` for the same canonical status.

---

## 13. Dropdowns, Menus, Popovers and Tooltips

### 13.1 Dropdown menu

- Minimum item height: `36px`; mobile: `44px`.
- Group related actions and separate destructive actions.
- Destructive menu items use red text/icon.
- Menu opens toward available viewport space.
- Escape closes and restores focus.

### 13.2 Popover

- Use for short interactive content such as filters, date selection or assignee picker.
- Do not place complex multi-step forms in a popover.
- Close on outside click unless unsaved input would be lost.

### 13.3 Tooltip

- Use for brief explanation only.
- Delay: approximately `300ms` pointer hover; immediate keyboard focus.
- Tooltip content should normally stay below 120 characters.
- Essential instructions must be visible without relying on a tooltip.

---

## 14. Dialogs and Drawers

### 14.1 Modal dialog

Use for:

- Confirmations
- Focused decisions
- Small create/edit forms
- High-impact warnings

Rules:

- Width options: `480`, `640`, `800px` maximum.
- Title, concise explanation, content and action footer.
- Primary action inline-end; cancel before it.
- Focus is trapped and returned to the trigger.
- Escape closes only when safe.
- Destructive confirmation names the affected item and consequence.

### 14.2 Drawer

Use for:

- Record preview
- Contextual editing
- Filters
- Activity/audit detail

Rules:

- Desktop width: `420–560px`.
- Tablet/mobile: full-width sheet.
- Header and action footer may remain sticky.
- Drawer direction mirrors in RTL.
- Do not open a drawer from another drawer; replace its content or navigate.

---

## 15. Notifications, Alerts and Toasts

### 15.1 Toast

- Used for short confirmation of completed actions.
- Default duration: 4–6 seconds.
- Errors remain until dismissed or resolved.
- Include one optional action such as `Undo` or `View`.
- Do not use a toast for information required to continue a workflow.

### 15.2 Inline alert

- Appears near the related content.
- Supports info, success, warning and critical states.
- Includes title only when the message needs hierarchy.

### 15.3 Banner

Use for project-wide/system-wide conditions such as:

- `ONBOARDING INCOMPLETE (38%)` with `Resume onboarding`.
- Offline mode.
- Staging environment.
- Compliance failure.
- Critical live incident.

Banners must not permanently consume excessive vertical space.

---

## 16. Progress, Stepper and Lifecycle

### 16.1 Progress bar

- Use for measurable completion only.
- Show percentage and definition when unclear.
- Indeterminate progress uses a controlled moving bar, not a fake percentage.

### 16.2 Stepper

- Desktop: horizontal when 3–6 short steps; otherwise vertical.
- Mobile: current step plus `Step X of Y`, with expandable overview.
- States: not started, current, complete, warning, blocked, skipped.
- Users cannot visually bypass a blocked mandatory gate.

### 16.3 EOS lifecycle tracker

- Lifecycle is data-driven and project-configurable.
- Canonical maturity labels remain: Idea, Developing, Submitted, Negotiating, Authorised, Delivering, Closing, Closed.
- Project-specific stages may differ, repeat or be reordered without changing component behavior.
- Current stage uses bronze accent.
- Complete stages use success.
- Blocked stage uses critical icon plus explanation.
- Do not hard-code all 13 stages into page layout.

---

## 17. Search, Filters and Saved Views

- Global search and local table search must look different in scale and context.
- Search input includes clear action when populated.
- Filter button shows active count.
- Active filters render as chips.
- Advanced filters open a drawer on desktop and full-screen sheet on mobile.
- Saved views store columns, order, filters, sorting and density when applicable.
- Personal, team and organization views are visibly distinguished.
- Reset returns to the documented default view.

---

## 18. Calendar and Scheduling

- Support Month, Week, Agenda and Timeline only where the task requires them.
- Use one project/workflow colour system; do not assign arbitrary colours per event.
- Overlapping events remain readable and accessible.
- Current day and current time have clear indicators.
- Event detail opens a drawer or navigates to the record.
- Drag-to-reschedule requires permission, confirmation where necessary and keyboard alternative.
- Display project timezone when it differs from user timezone.

---

## 19. File Upload and Documents

- Support browse, drag-and-drop and Field camera capture where applicable.
- Show allowed type and maximum size before upload.
- Each upload shows filename, size, progress, scan/quarantine state and outcome.
- Failed upload provides retry without reselecting when technically possible.
- Controlled documents show revision, status, owner and approval state.
- Never represent upload completion as document approval.
- Offline Field uploads enter the Offline Queue with visible pending status.

---

## 20. Empty, Loading, Error and Permission States

Every component and page must define:

| State | Rule |
|---|---|
| Loading | Layout-matched skeleton; no large blank spinner |
| First-use empty | Explain purpose and provide permitted primary action |
| Filtered empty | State no results and provide Clear filters |
| Partial | Keep available content and isolate failed region |
| Success | Confirm result and next state |
| Validation error | Inline message plus summary for long forms |
| System error | Plain language, retry and support reference ID |
| Forbidden | Explain access without leaking protected data |
| Read-only | Keep content clear and explain why editing is unavailable |
| Offline | Show cached state, queued actions and last sync |
| Conflict | Compare local/server versions and require explicit resolution |
| Archived | Persistent banner; destructive editing blocked |
| Stale | Last refreshed timestamp and refresh action |

---

## 21. Charts and Data Visualisation

- Chart colour uses semantic/data-series tokens.
- Do not use bronze for every series.
- Always provide title, metric definition, reporting period and filter context.
- Tooltips show complete values and units.
- Financial charts show QAR and value scale.
- Avoid 3D charts, gauges without thresholds and decorative donuts.
- Provide a data table or textual summary for accessibility.
- Empty/no-data is not plotted as zero.

---

## 22. Client Portal Rules

- Same tokens and components, lower information density.
- Remove internal-only menus, comments and financial fields at the data/permission layer.
- Approvals clearly show what the client is approving and the effect of the decision.
- Client-visible status wording must be understandable without internal EOS terminology.
- No supplier margins, internal risk commentary, staff notes or hidden approval chains.
- Branding may include client/project identity without replacing EOS interaction rules.

---

## 23. Field Operations Rules

- Minimum target: `48px`; primary action preferably `52px`.
- One-hand operation is the priority.
- Highest-priority actions: check in/out, checklist, run sheet, incident, quick capture, roster and sync.
- Current project, venue, shift and sync state remain visible.
- Offline state is never hidden.
- Queued action shows Pending, Syncing, Failed or Conflict.
- Critical incidents use persistent high-contrast status, not animation alone.
- Forms favor selection, scanning and camera capture over typing.

---

## 24. Arabic and RTL

- Set both `document.documentElement.dir` and `lang` immediately on language switch.
- Mirror sidebar, breadcrumbs, drawers, tab scroll direction, stepper, chevrons and directional transitions.
- Do not mirror logos, numbers, charts, download/upload, media controls or universal symbols.
- Use CSS logical properties: `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`.
- Table identity column pins to inline-start; actions pin to inline-end.
- Test mixed Arabic/English names, QAR values, dates, email addresses and filenames.
- Arabic labels must not truncate sooner than English due to fixed control widths.
- Language switching must not reload the page or lose unsaved form state.

---

## 25. Accessibility

Target WCAG 2.2 AA.

- Keyboard access for every action.
- Visible focus.
- Correct landmarks, headings and accessible names.
- Minimum 44px interactive targets.
- Status never relies on colour alone.
- Dialog focus trap and trigger return.
- Tabs use correct tablist/tab/tabpanel semantics.
- Tables use headers and captions/accessible names.
- Form labels, descriptions and errors are programmatically associated.
- Live regions announce save, sync, upload and critical error results.
- Drag actions have button/menu alternatives.
- Reduced-motion support is mandatory.

---

## 26. Component API and Naming Rules

Use one shared naming convention:

```text
EosButton
EosTabs
EosDataTable
EosStatusBadge
EosFormField
EosSelect
EosDialog
EosDrawer
EosToast
EosEmptyState
EosSkeleton
EosLifecycleTracker
EosApprovalPanel
```

Common properties should use consistent names:

```ts
type EosCommonProps = {
  size?: 'sm' | 'md' | 'lg';
  density?: 'compact' | 'standard' | 'comfortable';
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  direction?: 'ltr' | 'rtl';
  'aria-label'?: string;
  testId?: string;
};
```

Rules:

- Do not expose raw colour props.
- Use `tone="success"`, not `color="#22C55E"`.
- Use `variant`, `size`, `tone`, `state` and `density` consistently.
- Controlled and uncontrolled behavior must be explicit.
- All production components need Storybook or equivalent state coverage.
- Component visual names in Framer/Figma must match production names and variants.

---

## 27. Global Framer Motion Pattern

Use shared variants rather than local animation values:

```ts
export const eosMotion = {
  page: {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.22, ease: [0.2, 0, 0, 1] },
  },
  tab: {
    initial: { opacity: 0, y: 2 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.16, ease: [0.2, 0, 0, 1] },
  },
  modal: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.2, ease: [0.2, 0, 0, 1] },
  },
};
```

The shared motion utility must automatically reduce motion when the operating system preference requires it.

---

## 28. Prohibited UI Patterns

- New feature-specific colour palettes.
- Raw hex colours in module components.
- Different tab styles in different modules.
- Tiny tables compressed to fit mobile.
- Full-page horizontal scrolling.
- Hidden actions available only on hover.
- Multiple primary buttons competing in the same action group.
- Disabled controls without explanation where permission matters.
- Toast-only critical errors.
- Permanent skeletons or spinners without timeout/error handling.
- Fake data presented as live data.
- Client-side hiding of confidential data already fetched from the API.
- Decorative motion, excessive glow, glass effects or gradient text.
- Detached Framer/Figma component instances in approved designs.
- Technical deployment or cloud-region strings in normal user-facing screens.

---

## 29. Component Definition of Done

A component is complete only when:

- It uses semantic tokens only.
- It preserves the current EOS component system.
- Default, hover, focus, pressed, selected, disabled and loading states exist.
- Error/read-only states exist where relevant.
- Light, dark and system theme behavior is verified.
- English LTR and Arabic RTL are verified.
- `390`, `768`, `1024` and `1440px` behavior is verified.
- Keyboard and screen-reader behavior is documented.
- Long, short, empty and overflow content is tested.
- Permission behavior is defined.
- Reduced motion is supported.
- It has automated interaction tests.
- It has visual regression snapshots.
- It has no unresolved accessibility violation.

---

## 30. Page Definition of Done

A page is complete only when:

- It uses approved shared components only.
- It has no local duplicate controls.
- Navigation resets scroll to the top-left logical origin.
- Loading, empty, error, forbidden, read-only and success states exist.
- Tables have controlled overflow and mobile behavior.
- Arabic RTL works without clipping or incorrect pinning.
- Role-based data and actions are correct.
- Confidential data is not fetched for unauthorized users.
- Page actions are auditable.
- Layout remains stable during loading and interaction.
- Visual regression passes at all mandatory widths and themes.

---

## 31. Required Shared Component Registry

### Foundation

- ThemeProvider
- DirectionProvider
- Typography
- Icon
- FocusRing
- MotionProvider

### Actions and forms

- Button
- IconButton
- ButtonGroup
- Input
- TextArea
- Select/Combobox
- Checkbox
- RadioGroup
- Switch
- DatePicker
- TimePicker
- FileUpload
- FormField
- ValidationSummary

### Navigation

- AppSidebar
- TopBar
- Breadcrumbs
- Tabs
- SegmentedControl
- ProjectNavigator
- Pagination
- CommandPalette

### Data

- DataTable
- TableToolbar
- FilterBuilder
- SavedViewPicker
- Card
- KPI Card
- StatusBadge
- Tag
- Avatar
- Timeline
- ActivityItem
- AttachmentRow
- AuditEntry
- ChartFrame

### Feedback and overlays

- Toast
- InlineAlert
- Banner
- Tooltip
- Popover
- DropdownMenu
- Dialog
- DestructiveDialog
- Drawer
- EmptyState
- Skeleton
- ErrorState
- PermissionState
- OfflineQueue

### EOS domain components

- ProjectHeader
- LifecycleTracker
- StageGate
- ApprovalPanel
- ApprovalChain
- SLAClock
- ControlledRecordHeader
- LinkageBar
- RequirementRow
- RfiCard
- DocumentRegister
- DesignReviewPanel
- BoqLineItem
- CommercialSummary
- RunSheet
- RosterCard
- IncidentCard
- CloseoutChecklist

---

## 32. Implementation Order

1. Freeze semantic tokens and theme provider.
2. Freeze typography, spacing, radius, focus and motion utilities.
3. Standardize Button, FormField, Input, Select and Dialog.
4. Standardize Tabs and SegmentedControl.
5. Standardize DataTable, TableToolbar, filters, pagination and mobile cards.
6. Standardize Card, KPI, badges, alerts, skeleton and empty/error states.
7. Standardize sidebar, top bar, breadcrumbs and project navigation.
8. Standardize lifecycle, approval, audit and controlled-record components.
9. Apply the system to Internal Workspace.
10. Apply the same system with permission-safe density to Client Portal.
11. Apply touch/offline variations to Field Operations.
12. Run visual regression, RTL, accessibility, permission and UAT validation.

This order prevents feature teams from continuing to create new local patterns while the foundation is being standardized.

---

## 33. Governance Rule

Any new UI need must follow this decision order:

1. Reuse an existing component.
2. Add a documented variant to an existing component.
3. Compose existing primitives into a shared pattern.
4. Create a new global component only after design-system review.

Feature modules may configure content, permissions and workflow behavior. They may not invent their own visual language.
