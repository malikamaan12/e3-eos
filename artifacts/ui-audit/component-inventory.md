# E3-EOS v1.0 — Design System Component Inventory & Master Registry

**Design Framework**: Native CSS Custom Properties + Typed Design Tokens (`TOKENS`, `E3_THEME`)  
**Design Standards Compliance**: `E3_EOS_GLOBAL_UI_COMPONENT_RULES.md` (`specs/12_GLOBAL_UI_COMPONENT_RULES.md`)  
**Visual Aesthetic**: Executive Dark (`#090D16` canvas, `#0F1624` surface, `#D97706` warm bronze accent)  

---

## 1. Foundations & Tokens

| Token Category | Token Keys / Variables | Values / Specs | Behavioral Guarantees |
| :--- | :--- | :--- | :--- |
| **Canvas** | `--canvas`, `E3_THEME.surface.pageBg` | `#090D16` (Dark) / `#F8FAFC` (Light) | Default page background for application viewport |
| **Surfaces** | `--surface-1`, `--surface-2`, `--surface-3`, `--surface-inset` | `#0F1624`, `#172033`, `#1E293B`, `#0B0F19` | Elevated hierarchy for cards, sidebars, modals |
| **Borders** | `--border-subtle`, `--border-default`, `--border-strong` | `rgba(255,255,255,0.08)`, `rgba(255,255,255,0.14)`, `rgba(255,255,255,0.22)` | Subtle contrast on dark surfaces |
| **Typography** | `--text-primary`, `--text-secondary`, `--text-muted` | `#F8FAFC`, `#94A3B8`, `#64748B` | Font stack: `Inter, "Noto Sans Arabic", system-ui, sans-serif` |
| **Accent** | `--accent`, `--accent-hover`, `--accent-soft` | `#D97706`, `#B45309`, `rgba(217,119,6,0.15)` | Warm bronze primary action branding |
| **Numerals** | `fontVariantNumeric: 'tabular-nums'` | Monospaced digits | Enforced on all currency, timestamps, and metric values |
| **Direction** | `dir="ltr"` / `dir="rtl"` | CSS Logical Properties | Seamless bidirectional mirroring for Arabic |

---

## 2. Shared Primitives (`apps/web/src/components/DesignSystem.tsx`)

| Primitive Component | Touch Targets | Variants / States | Accessibility & Invariants |
| :--- | :--- | :--- | :--- |
| `Button` | 32px (sm), 40px (md), 48px (lg) | Primary (`#D97706`), Secondary, Ghost, Danger (`#EF4444`) | Preserves layout width during `isLoading`, keyboard focus ring |
| `Badge` | 20px / 24px | Info, Success, Warning, Risk, Neutral | Token-driven translucent background with high-contrast text |
| `Card` | Padding 16px/20px, radius 8px | Default, Interactive, Elevated | Built on `var(--surface-1)` with `var(--border-default)` |
| `Modal` | Desktop 480–720px, Mobile 96% | Open, Closing, Backdrop Scrim | Scrim `rgba(0,0,0,0.7)`, focus trap, Esc key dismissal |
| `Drawer` | Desktop 420–560px, Mobile 100% | Slide-in (Right LTR, Left RTL) | Scrimmed overlay, smooth transition |
| `Input` | 40px standard, 48px field | Normal, Focus, Error, Disabled | Inset surface `var(--surface-inset)`, label above, inline error |
| `Select` | 40px standard, 48px field | Normal, Focus, Error, Disabled | Chevron icon indicator, custom options styling |
| `Tabs` | 44px page tab, 36px compact | Active, Inactive, Disabled | 2px warm bronze active underline (`var(--accent)`), keyboard navigation |
| `Skeleton` | Responsive widths, 16–48px heights | Shimmer animation | Exact layout dimension matching to prevent Cumulative Layout Shift (CLS) |
| `EmptyState` | Full-width or inline | Zero-data, Search-miss | Distinct iconography, actionable primary CTA |

---

## 3. Design System Composites (`apps/web/src/design-system/composites/`)

| Composite Component | File Location | Key Capabilities | Audit Status |
| :--- | :--- | :--- | :--- |
| `KPICard` | `KPICard.tsx` | Tabular value, trend delta indicator, confidential masking, badge | Verified Pass |
| `MetricStrip` | `KPICard.tsx` | Auto-fit responsive grid (minmax 220px) | Verified Pass |
| `DataTable` | `DataTable.tsx` | Sortable columns, zebra striping, sticky headers, responsive horizontal scroll | Verified Pass |
| `EosTabs` | `primitives/Tabs.tsx` | Accessible tablist, keyboard navigation, bronze underline indicator | Verified Pass |
| `EosStatusBadge`| `primitives/Badge.tsx`| Semantic workflow badges (Draft, Approved, Blocked, In Progress) | Verified Pass |

---

## 4. Application Shell & Navigation (`apps/web/src/components/LayoutShell.tsx`)

| Shell Feature | Responsive Behavior | RTL Behavior | Governance Adherence |
| :--- | :--- | :--- | :--- |
| **Canonical Sidebar** | Desktop fixed (240px); Mobile hidden (<768px) with slide-over drawer | Anchored right in RTL, left in LTR | Strictly 8 primary destinations per Section 11.1 |
| **Collapsible Modules** | Nested sub-modules contained in accordion group | Mirrors alignment and chevron indicators | Prevents 30+ item sidebar clutter |
| **Top Header Bar** | Sticky header, responsive tool collapses on small screens | Brand on right in RTL, controls mirrored | Contains Theme Toggle, Language Switcher, User Menu |
| **Mobile Bottom Bar** | Visible only on screens <768px (4 thumb targets) | Order mirrored in RTL | Quick access to Home, My Work, Projects, Menu |
| **Scroll Reset** | Resets `window` and `mainRef` scroll to `(0,0)` on route change | N/A | Prevents scroll position bleed across views |
