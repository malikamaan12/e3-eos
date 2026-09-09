export interface CanonicalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  organisationId: string;
}

export const CANONICAL_E3_USERS: CanonicalUser[] = [
  { id: '10000000-0000-4000-8000-000000000001', name: 'Tareq Al-Kuwari (Super Admin)', email: 'superadmin@e3.qa', role: 'super_admin', isSuperAdmin: true, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000002', name: 'Nasser Al-Attiyah (Executive Partner)', email: 'executive@e3.qa', role: 'executive', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000003', name: 'Fatima Al-Sulaiti (Project Director)', email: 'director@e3.qa', role: 'project_director', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000004', name: 'Zaid Mansour (Lead Event PM)', email: 'pm@e3.qa', role: 'project_manager', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000005', name: 'Rashid Al-Hajri (Financial Controller)', email: 'finance@e3.qa', role: 'finance', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000006', name: 'Maryam Al-Kuwari (Procurement Lead)', email: 'procurement@e3.qa', role: 'procurement', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000007', name: 'Karim Haddad (Technical Director)', email: 'designer@e3.qa', role: 'design_production', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000008', name: 'Salem Al-Marri (Head of Live Ops)', email: 'ops@e3.qa', role: 'operations', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000009', name: 'Hamad Al-Khelaifi (Logistics & Fleet)', email: 'logistics@e3.qa', role: 'logistics', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000010', name: 'Dr. Sarah Ibrahim (HSE Inspector)', email: 'hse@e3.qa', role: 'hse_quality', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000011', name: 'Khalid Al-Thani (Commercial Lead)', email: 'commercial@e3.qa', role: 'marketing_commercial', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '10000000-0000-4000-8000-000000000012', name: 'Omar Farooq (Site Field Supervisor)', email: 'field@e3.qa', role: 'field_supervisor', isSuperAdmin: false, organisationId: '11111111-1111-4111-8111-111111111111' },
  { id: '20000000-0000-4000-8000-000000000013', name: 'Hessa Al-Nuaimi (Qatar Tourism Client)', email: 'client@qatartourism.qa', role: 'client_user', isSuperAdmin: false, organisationId: '22222222-2222-4222-8222-222222222222' },
];
