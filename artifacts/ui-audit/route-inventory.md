# E3-EOS v1.0 — Master Route Inventory & Coverage Register

**Audit Environment**: Staging & Local Monorepo  
**Release Target**: `eos-v1.0.0-rc1`  
**Total Routes Audited**: 63 Views / Modules  
**Supported Viewports**: Mobile (390px), Tablet (768px), Laptop (1024px), Desktop (1440px)  
**Supported Themes**: Dark (Executive Obsidian `#090D16`), Light (`#F8FAFC`), System Preference  
**Supported Locales**: English (`en-QA` / LTR), Arabic (`ar-QA` / RTL)  

---

## 1. Authentication & Account Routes (Unauthenticated / Public)

| Route Path | View Component | Target Persona | Layout Shell | Responsive Viewports | Theming & RTL | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `LoginView` | All Personas | Standalone Scrim | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/forgot-password` | `ForgotPasswordView` | All Personas | Standalone Scrim | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/accept-invite` | `AcceptInviteView` | Invitee / Vendor | Standalone Scrim | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/account` | `AccountView` | Authenticated Users | `LayoutShell` | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |

---

## 2. Core Internal Workspace & Executive Navigation (Section 11.1)

| Route Path | View Component | Canonical Destination | Target Persona | Viewports | Theming & RTL | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `HomeView` | 1. Home | All Internal | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/my-work` | `MyWorkView` | 2. My Work | Ops, PM, Lead | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/projects` | `ProjectListView` | 3. Projects | PM, Exec, Lead | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/projects/new` | `NewProjectWizardView` | 3. Projects | Project Director | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/projects/:id` | `ProjectCockpitView` | 3. Projects | PM, Team, Lead | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/approvals` | `PersonalWorkView` | 4. Approvals | PM, Exec, Client | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/calendar` | `MasterCalendarView` | 5. Calendar | Production, Ops | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/portfolio` | `LeadershipView` | 6. Portfolio | C-Suite, Director | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/portfolio/resources` | `PortfolioResourcePlannerView` | 6. Portfolio | Resource Planner | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/portfolio/intelligence` | `EnterprisePortfolioIntelligenceView` | 6. Portfolio | C-Suite, Analysts | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/reports` | `PerformanceKnowledgeView` | 7. Reports | Leadership, PM | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/reports/post-event` | `PostEventReportBuilderView` | 7. Reports | PM, Client Lead | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/admin/users` | `AdminUsersView` | 8. Administration | Super Admin | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/admin/roles` | `AdminRolesView` | 8. Administration | Security Admin | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/admin/studio` | `AdminStudioView` | 8. Administration | Sys Admin | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |

---

## 3. Commercial, Procurement & Supply Chain Modules

| Route Path | View Component | Target Persona | Shell Group | Viewports | Theming & RTL | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/commercial/financial-control` | `FinancialControlCenterView` | Commercial Dir | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/commercial/invoices` | `SupplierInvoicesView` | Finance, Procurement | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/commercial/billing` | `ClientBillingView` | Billing Specialist | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/commercial/closeout` | `CommercialCloseoutView` | Commercial Dir, PM | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/vendors` | `VendorDirectoryView` | Procurement Head | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/warehouse` | `WarehouseOperationsView` | Logistics Mgr | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |

---

## 4. Live Event Operations & Field Execution

| Route Path | View Component | Target Persona | Shell Group | Viewports | Theming & RTL | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/operations/command-centre` | `LiveCommandCentreView` | Event Director | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/operations/run-sheet` | `LiveRunSheetView` | Stage Manager | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/operations/compliance` | `ComplianceRegisterView` | Safety & Compliance | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/operations/live-roster` | `LiveRosterAttendanceView` | Crew Lead | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/operations/field-ops` | `FieldOpsView` | Crew On-Site | Field PWA | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/operations/bump-out` | `BumpOutCloseoutView` | Site Supervisor | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |

---

## 5. Intelligence, Workflows, Documents & Governance

| Route Path | View Component | Target Persona | Shell Group | Viewports | Theming & RTL | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/intelligence/copilot` | `AiCopilotView` | All Users | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/intelligence/estimator` | `HistoricalEstimatorView` | Estimators, PM | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/workflows/builder` | `WorkflowBuilderView` | Ops Director | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/workflows/simulator` | `PolicySimulatorView` | Compliance Head | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/admin/country-packs` | `CountryPacksView` | Regional Director | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/admin/integrations` | `IntegrationsControlCenterView`| System Admin | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/admin/production-rollout`| `ProductionRolloutView` | Release Mgr | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/documents/controlled` | `ControlledDocumentsWorkspaceView` | Document Controller | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/settings/ai-integrations`| `SettingsAiIntegrationsView` | Ops / Security | Enterprise Modules | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |

---

## 6. External Portals (Strict Zero-Leak Isolation)

| Route Path | View Component | Target Persona | Isolation Rules | Viewports | Theming & RTL | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/portal/client` | `ClientPortalView` | External Client | Zero buy rates, zero margins, no internal contingency | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/client/results` | `ClientResultsRoomView` | External Client | Client-facing SLA & KPIs only | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
| `/portal/supplier` | `SupplierPortalView` | External Vendor | Supplier POs & assignments only | 390px, 768px, 1024px, 1440px | Dark/Light, LTR/RTL | Verified Pass |
