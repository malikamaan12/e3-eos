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
    projectCode: 'PRJ-2026-SYNTH-01',
    title: 'Synthetic International Tech Expo 2026',
    description: 'A complete synthetic test project for verifying EOS core commands and invariants.',
    originCode: 'DIRECT_AWARD',
    ownerId: SYNTHETIC_USERS.projectManager.id,
    clientOrganisationId: SYNTHETIC_ORGANISATIONS.clientCorp.id,
  },
};
