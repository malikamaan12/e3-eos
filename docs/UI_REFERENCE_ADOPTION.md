# UI reference adoption — 26 September 2026

## Source of truth

Read the current decisions before adding UI. Later decisions override older proposals for their named subject:

- [Current decisions and reading order](../E3_EOS_Complete_MD_2026-09-26/00_CURRENT_DECISIONS_AND_READING_ORDER.md)
- [UI and accessibility update](../E3_EOS_Complete_MD_2026-09-26/updates/04_UI_AND_ACCESSIBILITY.md)
- [Global component rules](../E3_EOS_Complete_MD_2026-09-26/references/E3_EOS_GLOBAL_UI_COMPONENT_RULES.md)
- [Product modules and UX](../E3_EOS_Complete_MD_2026-09-26/specs/01_PRODUCT_MODULES_AND_UX.md)

The supplied screenshots and local Figma/Sketch sources in `UI COMPONENT/` provide visual direction. The CRM Sketch preview was inspected locally. These are design-source files, not React component packages; no claim is made that their native components were imported or mapped through Figma Code Connect.

## Applied design direction

- White rounded panels, subtle borders/shadows, more breathing room and larger KPI values reflect the desktop references.
- A lavender feature panel, restrained chart colors and structured project list bring the references into EOS without replacing the prescribed bronze actions and dark executive palette.
- Existing shared Card, MetricCard, Badge, Button and LayoutShell components carry the refresh into project workspaces. No UI library was added.
- The Home dashboard uses project-directory records for counts and lifecycle distribution. Missing lifecycle data is explicitly shown as Not recorded; the legacy delivery value maps to Delivering.
- Hardcoded Home approval counts, urgent claims, critical-task counts and move-in countdown were removed. Operational queues remain accessible through their existing routes.
- The directory service already has seeded/local fallback behavior. The dashboard therefore identifies staging/demo data and does not claim that all displayed records are live production data.
- The design lab remains accessible when its record exists. Links use the record UUID.
- English/Arabic, RTL, saved dark/light/system theme behavior, existing routes and permissions remain supported. Dark remains the default; the review preview uses light mode.
- Mobile uses two KPI columns, stacked chart/list sections and 48px bottom-navigation targets. Tablet KPI columns collapse before they become cramped.
- Keyboard focus is visible, clickable KPI cards support Enter/Space, and reduced-motion preferences disable decorative transitions/animations.

## Implementation locations

- `apps/web/src/views/HomeView.tsx` and `HomeView.css`: dashboard composition, translations, chart and directory.
- `apps/web/src/workspace.css`: shared visual treatment and responsive/accessibility rules.
- `apps/web/src/components/DesignSystem.tsx`: shared component hooks and semantic badges.
- `apps/web/src/components/LayoutShell.tsx` and `WorkspaceIcon.tsx`: navigation icons and theme-aware header.
- `apps/web/src/context/EosContext.tsx`: contrast-aware semantic foreground colors.
- `apps/web/src/views/ProjectCockpitView.tsx`: semantic status text contrast.

## Verification

- Web TypeScript check passed.
- Production web build passed; the existing large JavaScript bundle warning remains.
- Existing design-system and web/client regression suites: 93 tests passed.
- Browser checks at 390, 768, 1024 and 1440px; no document-level horizontal overflow in the tested dashboard states.
- Inspected English light desktop/mobile, Arabic RTL mobile/tablet, and dark desktop/tablet. Fixed cramped tablet KPIs found during the review.
- Opened a project from the new Home directory and inspected its light-mode cockpit with the refreshed shared components.

Scope: Home is recomposed; shared components and the shell are refreshed across consuming pages. Bespoke module layouts have not all been individually redesigned or audited. Existing service fallback behavior and production data integration are unchanged.

## Superseding visual direction: dimensional glass

The user's subsequent instruction on 26 September explicitly replaces the earlier flat/bronze visual direction with 3D, glassmorphism, animation, a black-based dark mode, a light mode, and the supplied E3 logo. This takes precedence over the older guide's prohibition on glass/gradients. Workflow, accessibility, responsive and RTL requirements remain in effect.

- Added the supplied E3 SVG under `apps/web/public/brand/`. The original is retained; display variants trim its empty canvas. The dark variant changes only the wordmark to a light color, preserving the original gradient symbol. The mark is also the favicon.
- Added BrandLogo to the app header, mobile drawer and sign-in view.
- Purple/cyan brand accents, black glass dark surfaces, lavender/cyan light surfaces, translucent panels, blurred navigation chrome, bright upper edges, layered shadows and raised controls now define the shared appearance.
- KPI cards tilt/lift on fine-pointer hover; dashboard entry is staggered and the feature icon floats. Touch layouts do not tilt. Reduced-motion preferences disable animation and hover movement; browsers without backdrop-filter receive opaque readable surfaces.
- Existing project records, permissions, routes and chart semantics are unchanged.

Glass update validation: TypeScript passed; production build passed (existing bundle warning remains); 93 UI/client tests passed. Browser review confirmed loaded SVG variants, blur(18px) panels, an active 3D hover transform, desktop light/dark rendering and 390px Arabic mobile light/dark layouts without document overflow. Mobile uses the original symbol to keep the header compact.
