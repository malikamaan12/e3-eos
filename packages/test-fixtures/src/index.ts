export const SYNTHETIC_ORGANISATIONS = {
  e3Internal: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'E3 Synthetic Events Internal',
    code: 'E3-SYNTHETIC',
  },
  clientCorp: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Client Alpha Corporation (Synthetic)',
    code: 'CLIENT-ALPHA-SYNTHETIC',
  },
  supplierVendor: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Global Stage Rigging Supplies (Synthetic)',
    code: 'SUPPLIER-RIGGING-SYNTHETIC',
  },
};

export const SYNTHETIC_USERS = {
  superAdmin: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'synthetic-superadmin@e3-synthetic.qa',
    name: 'Synthetic Super Admin',
    isSuperAdmin: true,
  },
  projectManager: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    email: 'synthetic-pm@e3-synthetic.qa',
    name: 'Synthetic Project Manager',
    isSuperAdmin: false,
  },
  commercialDirector: {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    email: 'synthetic-commercial@e3-synthetic.qa',
    name: 'Synthetic Commercial Director',
    isSuperAdmin: false,
  },
  financeController: {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    email: 'synthetic-finance@e3-synthetic.qa',
    name: 'Synthetic Finance Controller',
    isSuperAdmin: false,
  },
  clientUser: {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    email: 'synthetic-client@client-alpha.com',
    name: 'Synthetic Client Viewer',
    isSuperAdmin: false,
  },
};

export const SYNTHETIC_PROJECTS = {
  sampleExhibition: {
    id: 'f1111111-1111-4111-8111-111111111111',
    organisationId: SYNTHETIC_ORGANISATIONS.e3Internal.id,
    projectCode: 'PRJ-2026-QATAR-01',
    title: 'Qatar Tourism Annual Exhibition & Gala 2026',
    description: 'Flagship annual tourism exhibition and gala dinner hosted at Doha Exhibition and Convention Centre (DECC).',
    originCode: 'DIRECT_AWARD',
    ownerId: SYNTHETIC_USERS.projectManager.id,
    clientOrganisationId: SYNTHETIC_ORGANISATIONS.clientCorp.id,
  },
  qnd26: {
    id: '00000000-0000-4000-8000-000000000001',
    organisationId: SYNTHETIC_ORGANISATIONS.e3Internal.id,
    projectCode: 'PRJ-QND-2026',
    title: 'Qatar National Day 2026 Celebrations',
    description: 'Official ceremonial pavilion and celebrations along Lusail Boulevard with 125,000+ public attendance.',
    originCode: 'DIRECT_AWARD',
    ownerId: SYNTHETIC_USERS.projectManager.id,
    clientOrganisationId: SYNTHETIC_ORGANISATIONS.clientCorp.id,
  },
  acceptanceProject: {
    id: 'a1111111-1111-4111-8111-111111111111',
    organisationId: SYNTHETIC_ORGANISATIONS.e3Internal.id,
    projectCode: 'PRJ-2026-FEE-01',
    title: 'Large Indoor Family Entertainment Event 2026',
    description: 'Flagship multi-zone indoor family festival featuring main stage, registration counters, AV, lighting, games, furniture, branding, security, and staffing.',
    originCode: 'DIRECT_AWARD',
    ownerId: SYNTHETIC_USERS.projectManager.id,
    clientOrganisationId: SYNTHETIC_ORGANISATIONS.clientCorp.id,
  },
  allFormatsLab: {
    id: '00000000-0000-4000-8000-000000000099',
    organisationId: SYNTHETIC_ORGANISATIONS.e3Internal.id,
    projectCode: 'PRJ-TEST-ALL-FORMATS',
    code: 'PRJ-TEST-ALL-FORMATS',
    title: 'Universal File Formats & Design Testing Lab',
    name: 'Universal File Formats & Design Testing Lab',
    description: 'Comprehensive testing lab project containing full test dataset across all 18 CAD, BIM, 3D, Video, Image, Vector, and Engineering document formats.',
    originCode: 'DIRECT_AWARD',
    ownerId: SYNTHETIC_USERS.projectManager.id,
    clientOrganisationId: SYNTHETIC_ORGANISATIONS.clientCorp.id,
    clientName: 'Universal Formats QA Testing',
    venueName: 'Lusail Testing Arena & Boulevard',
    venue: { name: 'Lusail Testing Arena & Boulevard', address: 'Lusail City, Qatar' },
    maturity: 'delivery',
    status: 'operational',
    currency: 'QAR',
    isOnboardingComplete: true,
    onboardingCompletionPct: 100,
  },
};

export type SyntheticOrganisation = typeof SYNTHETIC_ORGANISATIONS[keyof typeof SYNTHETIC_ORGANISATIONS];
export type SyntheticUser = typeof SYNTHETIC_USERS[keyof typeof SYNTHETIC_USERS];
export type SyntheticProject = typeof SYNTHETIC_PROJECTS[keyof typeof SYNTHETIC_PROJECTS];

export * from './dummy-designs.js';

