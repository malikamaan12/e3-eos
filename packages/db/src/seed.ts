import {
  SYNTHETIC_ORGANISATIONS,
  SYNTHETIC_USERS,
  SYNTHETIC_PROJECTS,
} from '@e3-eos/test-fixtures';
import {
  ALL_STAGE_ACTIVITIES,
  STANDARD_THIRTEEN_STAGE_TEMPLATE,
  LOCAL_TEAM_ACCOUNTS,
} from '@e3-eos/domain';
import pg from 'pg';
import { hashPassword } from './auth-crypto.js';

export interface SeedDataManifest {
  seededAt: string;
  organisationsCount: number;
  usersCount: number;
  projectsCount: number;
  stageInstancesCount: number;
  stageActivitiesCount: number;
  entities: {
    organisations: Array<{ id: string; name: string; code: string }>;
    users: Array<{ id: string; name: string; email: string; isSuperAdmin: boolean }>;
    projects: Array<{ id: string; code: string; title: string; origin: string; organisationId: string }>;
    stageInstances: Array<{
      id: string;
      projectId: string;
      organisationId: string;
      stageNumber: number;
      stageName: string;
      status: string;
      progressPercent: number;
    }>;
    stageActivities: Array<{
      id: string;
      projectId: string;
      organisationId: string;
      stageNumber: number;
      activityCode: string;
      title: string;
      accountableRole: string;
      status: string;
    }>;
  };
}

export const CANONICAL_E3_ROLES_USERS = [
  // 1. All 33 Local Team Accounts (Configured for temporary testing & role validation)
  ...LOCAL_TEAM_ACCOUNTS.map((m) => ({
    id: m.id,
    name: `${m.name} (${m.position})`,
    email: m.email,
    role: m.role,
    isSuperAdmin: m.isSuperAdmin,
    orgId: m.organisationId,
  })),

  // 2. Fallback / Test Suite Compatibility Accounts
  { id: '10000000-0000-4000-8000-000000000001', name: 'Tareq Al-Kuwari (Super Admin)', email: 'superadmin@e3.qa', role: 'super_admin', isSuperAdmin: true },
  { id: '10000000-0000-4000-8000-000000000002', name: 'Nasser Al-Attiyah (Executive Partner)', email: 'executive@e3.qa', role: 'executive', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000003', name: 'Fatima Al-Sulaiti (Project Director)', email: 'director@e3.qa', role: 'project_director', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000004', name: 'Zaid Mansour (Lead Event PM)', email: 'pm@e3.qa', role: 'project_manager', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000005', name: 'Rashid Al-Hajri (Financial Controller)', email: 'finance@e3.qa', role: 'finance', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000006', name: 'Maryam Al-Kuwari (Procurement Lead)', email: 'procurement@e3.qa', role: 'procurement', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000007', name: 'Karim Haddad (Technical & Creative Director)', email: 'designer@e3.qa', role: 'design_production', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000008', name: 'Salem Al-Marri (Head of Live Operations)', email: 'ops@e3.qa', role: 'operations', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000009', name: 'Hamad Al-Khelaifi (Logistics & Fleet)', email: 'logistics@e3.qa', role: 'logistics', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000010', name: 'Dr. Sarah Ibrahim (HSE & Quality Inspector)', email: 'hse@e3.qa', role: 'hse_quality', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000011', name: 'Khalid Al-Thani (Commercial & Marketing)', email: 'commercial@e3.qa', role: 'marketing_commercial', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000012', name: 'Omar Farooq (Site Field Supervisor)', email: 'field@e3.qa', role: 'field_supervisor', isSuperAdmin: false },
  { id: '20000000-0000-4000-8000-000000000013', name: 'Hessa Al-Nuaimi (Qatar Tourism Authority)', email: 'client@qatartourism.qa', role: 'client_user', isSuperAdmin: false, orgId: '22222222-2222-4222-8222-222222222222' },
  { id: '10000000-0000-4000-8000-000000000014', name: 'Eng. Tariq Al-Mansoor (Technical Director)', email: 'techdirector@e3.qa', role: 'technical_director', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000015', name: 'Eng. Bilal Qasim (Structural Engineer)', email: 'structural@e3.qa', role: 'structural_engineer', isSuperAdmin: false },
  { id: '10000000-0000-4000-8000-000000000016', name: 'Dr. Mariam Al-Sulaiti (HSE Director)', email: 'hsedirector@e3.qa', role: 'hse_director', isSuperAdmin: false },
];

export function seedMembershipAudience(role: string): 'client' | 'internal' {
  return role === 'client_user' ? 'client' : 'internal';
}

/**
 * Builds the canonical synthetic development seed data manifest.
 * Used by local docker-compose and database migrations.
 */
export function generateSeedManifest(): SeedDataManifest {
  const organisations = Object.values(SYNTHETIC_ORGANISATIONS);
  const users = Object.values(SYNTHETIC_USERS);
  const projects = Object.values(SYNTHETIC_PROJECTS).map((p) => ({
    id: p.id,
    code: p.projectCode,
    title: p.title,
    origin: p.originCode,
    organisationId: p.organisationId,
  }));

  const stageInstances: SeedDataManifest['entities']['stageInstances'] = [];
  const stageActivities: SeedDataManifest['entities']['stageActivities'] = [];

  for (const project of projects) {
    for (const stage of STANDARD_THIRTEEN_STAGE_TEMPLATE.stages) {
      const stageNumber = stage.defaultOrder;
      const stageInstId = `stage-${project.id}-${stageNumber}`;
      stageInstances.push({
        id: stageInstId,
        projectId: project.id,
        organisationId: project.organisationId,
        stageNumber,
        stageName: stage.name,
        status: stageNumber === 1 ? 'in_progress' : 'not_started',
        progressPercent: stageNumber === 1 ? 15 : 0,
      });
    }

    for (const act of ALL_STAGE_ACTIVITIES) {
      stageActivities.push({
        id: `act-${project.id}-${act.id.toLowerCase()}`,
        projectId: project.id,
        organisationId: project.organisationId,
        stageNumber: act.stageNumber,
        activityCode: act.id,
        title: act.name,
        accountableRole: act.proposedOwnerRole,
        status: 'not_started',
      });
    }
  }

  return {
    seededAt: new Date().toISOString(),
    organisationsCount: organisations.length,
    usersCount: users.length,
    projectsCount: projects.length,
    stageInstancesCount: stageInstances.length,
    stageActivitiesCount: stageActivities.length,
    entities: {
      organisations,
      users,
      projects,
      stageInstances,
      stageActivities,
    },
  };
}

export async function runSeed(): Promise<SeedDataManifest> {
  const manifest = generateSeedManifest();
  console.log(`[E3-EOS DB Seed] Synthetic manifest generated (${manifest.projectsCount} projects, ${manifest.stageInstancesCount} stages).`);

  const connectionString = process.env.DATABASE_URL;
  const isLocal = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || process.env.DB_SSL === 'false';
  const pool = connectionString
    ? new pg.Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } })
    : new pg.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'postgres',
      });

  let client: pg.PoolClient | null = null;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    console.log('[*] Connected to PostgreSQL. Seeding persistent tables...');

    // 0. Ensure Sprint 01 & 03 hardening columns exist
    await client.query(`
      ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS legal_name TEXT;
      ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS trading_name TEXT;
      ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS country TEXT;
      ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS rating NUMERIC;
      ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS qualification_status TEXT;
      ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS compliance_verified BOOLEAN DEFAULT FALSE;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id UUID NOT NULL REFERENCES organisations(id),
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT,
        token TEXT,
        token_hash TEXT UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT,
        token_hash TEXT UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS token_hash TEXT;
      ALTER TABLE user_invitations ALTER COLUMN token DROP NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invitations_token_hash ON user_invitations(token_hash);

      ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS token_hash TEXT;
      ALTER TABLE password_resets ALTER COLUMN token DROP NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);

      CREATE TABLE IF NOT EXISTS user_mfa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        secret TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        link TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 1. Seed Organisations
    for (const org of Object.values(SYNTHETIC_ORGANISATIONS)) {
      await client.query(`
        INSERT INTO organisations (id, name, code, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = $2, code = $3;
      `, [org.id, org.name, org.code]);
    }

    const getInitialUserPassword = (_email?: string): string => {
      if (process.env.INITIAL_ADMIN_PASSWORD) return process.env.INITIAL_ADMIN_PASSWORD;
      return 'E3#Doha2026!';
    };

    for (const u of CANONICAL_E3_ROLES_USERS) {
      const orgId = (u as any).orgId || '11111111-1111-4111-8111-111111111111';
      const userPasswordHash = hashPassword(getInitialUserPassword(u.email));

      await client.query(`
        INSERT INTO users (id, email, name, email_verified, is_super_admin, created_at, updated_at)
        VALUES ($1, $2, $3, true, $4, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, is_super_admin = $4;
      `, [u.id, u.email, u.name, u.isSuperAdmin]);

      // Password account (unique scrypt salt hash)
      await client.query(`
        UPDATE accounts SET password = $2 WHERE user_id = $1 AND provider_id = 'credential';
      `, [u.id, userPasswordHash]);

      await client.query(`
        INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at)
        SELECT gen_random_uuid(), $1, $2, 'credential', $3, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE user_id = $1 AND provider_id = 'credential');
      `, [u.id, u.email, userPasswordHash]);

      // Membership
      await client.query(`
        INSERT INTO memberships (id, organisation_id, user_id, role, audience, is_revoked, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW(), NOW())
        ON CONFLICT (organisation_id, user_id) DO UPDATE SET role = $3, audience = $4;
      `, [orgId, u.id, u.role, seedMembershipAudience(u.role)]);
    }

    // 3. Seed Projects & 13 Stages
    const qatarProjectId = 'f1111111-1111-4111-8111-111111111111';
    const defaultProjectId = '00000000-0000-4000-8000-000000000001';
    const e3OrgId = '11111111-1111-4111-8111-111111111111';
    const pmUserId = '10000000-0000-4000-8000-000000000004'; // Zaid Mansour

    await client.query(`
      INSERT INTO projects (
        id, organisation_id, project_code, title, description, origin_code, owner_id,
        client_organisation_id, maturity, outcome, created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1, $2, 'PRJ-2026-QATAR-01', 'Qatar Tourism Annual Exhibition & Gala 2026',
        'Flagship cultural tender for Qatar Tourism with main stage, gala dinner, and immersive lighting installation.',
        'TENDER_RFP', $3, '22222222-2222-4222-8222-222222222222', 'developing', 'undetermined', $3, $3, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
    `, [qatarProjectId, e3OrgId, pmUserId]);

    await client.query(`
      INSERT INTO projects (
        id, organisation_id, project_code, title, description, origin_code, owner_id,
        client_organisation_id, maturity, outcome, created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1, $2, 'QND26', 'Qatar National Day 2026 Celebrations',
        'Flagship celebration at Lusail Boulevard with 360-degree kinetic LED arch and cultural pavilion.',
        'TENDER_RFP', $3, '22222222-2222-4222-8222-222222222222', 'developing', 'undetermined', $3, $3, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
    `, [defaultProjectId, e3OrgId, pmUserId]);

    const labProjectId = '00000000-0000-4000-8000-000000000099';
    await client.query(`
      INSERT INTO projects (
        id, organisation_id, project_code, title, description, origin_code, owner_id,
        client_organisation_id, maturity, outcome, created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1, $2, 'PRJ-TEST-ALL-FORMATS', 'Universal File Formats & Design Testing Lab',
        'Comprehensive testing lab project containing full test dataset across all 18 CAD, BIM, 3D, Video, Image, Vector, and Engineering document formats.',
        'DIRECT_AWARD', $3, '22222222-2222-4222-8222-222222222222', 'delivery', 'undetermined', $3, $3, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, project_code = EXCLUDED.project_code;
    `, [labProjectId, e3OrgId, pmUserId]);

    // Seed 13 Stages for Qatar Tourism Project
    for (const stage of STANDARD_THIRTEEN_STAGE_TEMPLATE.stages) {
      await client.query(`
        INSERT INTO project_stage_instances (
          id, project_id, organisation_id, stage_number, stage_name, status, progress_percent, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) ON CONFLICT (project_id, stage_number) DO UPDATE SET
          stage_name = EXCLUDED.stage_name, status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent;
      `, [
        qatarProjectId,
        e3OrgId,
        stage.defaultOrder,
        stage.name,
        stage.defaultOrder === 1 ? 'in_progress' : 'not_started',
        stage.defaultOrder === 1 ? 40 : 0
      ]);
    }

    // Seed a sample Work Package and Task
    const workPackageId = 'e1111111-1111-4111-8111-111111111111';
    await client.query(`
      INSERT INTO work_packages (id, organisation_id, project_id, name, owner_id, status, acceptance_state, created_at)
      VALUES ($1, $2, $3, 'Stage Rigging & Structural Design', $4, 'active', 'pending', NOW())
      ON CONFLICT (id) DO NOTHING;
    `, [workPackageId, e3OrgId, qatarProjectId, pmUserId]);

    const taskId = 'd1111111-1111-4111-8111-111111111111';
    await client.query(`
      INSERT INTO task_instances (id, package_id, organisation_id, project_id, title, assignee_id, state, is_completed, created_at)
      VALUES ($1, $2, $3, $4, 'Finalize CAD Structural Rigging Calculations', '10000000-0000-4000-8000-000000000007', 'active', false, NOW())
      ON CONFLICT (id) DO NOTHING;
    `, [taskId, workPackageId, e3OrgId, qatarProjectId]);

    // Seed sample notifications
    await client.query(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
      VALUES 
        (gen_random_uuid(), $1, 'Project Kickoff Milestone', 'Qatar Tourism Gala 2026 onboarding complete and ready for Stage 1 deliverables.', 'task', '/cockpit/' || $2, false, NOW()),
        (gen_random_uuid(), $1, 'Approval Request Pending', 'Commercial budget sign-off requested by Khalid Al-Thani.', 'approval', '/approvals', false, NOW() - INTERVAL '2 hours'),
        (gen_random_uuid(), '10000000-0000-4000-8000-000000000001', 'System Security Notice', 'MFA foundation activated for all privileged administrator accounts.', 'system', '/account', false, NOW() - INTERVAL '1 day')
      ON CONFLICT DO NOTHING;
    `, [pmUserId, qatarProjectId]);

    // 4. Seed Controlled Documents & Revisions
    // Calculated byte hashes for exact text specs
    const deccCalculatedSha256 = '9aaedaecbd3adaf9fb2547cca03643a4ac70c8697d8a695d94c71b0078798ffa';
    const meccCalculatedSha256 = '884136ab8abb69eea2b6adf2e73a986846c97b5781c2eb19f0910fb119521827';
    const avCalculatedSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    for (const pid of [qatarProjectId, defaultProjectId]) {
      const pCode = pid === qatarProjectId ? 'PRJ-2026-QATAR-01' : 'QND26';
      const suffix = pid === qatarProjectId ? '' : '-def';

      await client.query(`
        INSERT INTO controlled_documents (
          id, organisation_id, project_id, project_code, document_number, title,
          discipline, document_type, confidentiality_level, current_revision_code, revisions_count,
          created_by, created_at, updated_at
        ) VALUES 
          (
            $1, $3, $4, $5, 'DOC-DECC-FP-2024',
            'Doha Exhibition and Convention Center Technical Floorplan & Capacity Guide',
            'staging', 'drawing', 'internal', 'Rev 2024.1', 1,
            'Eng. Tariq Al-Mansoor', NOW(), NOW()
          ),
          (
            $2, $3, $4, $5, 'DOC-MECC-ENV-2005',
            'Qatar Environmental Protection Law No. 30 of 2002 & Executive Regulation Resolution No. 4 of 2005',
            'health_safety', 'specification', 'internal', 'rev-mecc-env-01', 1,
            'Dr. Mariam Al-Sulaiti', NOW(), NOW()
          ),
          (
            'doc-001' || $6, $3, $4, $5, 'E3-QND26-AV-DWG-0001',
            'Main Ceremony 360-Degree Kinetic LED Arch — General Elevation',
            'audio_visual', 'drawing', 'client_confidential', 'Rev 01', 2,
            'Karim Haddad (Technical Director)', NOW(), NOW()
          ),
          (
            'doc-002' || $6, $3, $4, $5, 'E3-QND26-STG-DWG-0002',
            'Lusail Boulevard Royal Pavilion Structural Load Calculations & Footings',
            'staging', 'drawing', 'internal', 'Rev A', 1,
            'Civil Defence Certified Structural Engineer', NOW(), NOW()
          ),
          (
            'doc-003' || $6, $3, $4, $5, 'E3-QND26-HSE-SPC-0003',
            'Fire Safety & Flame-Retardant Material Specifications (Law No. 13 Compliance)',
            'health_safety', 'specification', 'public', 'Rev 02', 3,
            'HSE & Civil Defence Lead', NOW(), NOW()
          )
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
      `, [
        `doc-decc-fp-01${suffix}`,
        `doc-mecc-env-01${suffix}`,
        e3OrgId,
        pid,
        pCode,
        suffix,
      ]);

      await client.query(`
        INSERT INTO controlled_document_revisions (
          id, organisation_id, document_id, revision, storage_object_path,
          original_filename, mime_type, size, calculated_sha256, quarantine_scan_state,
          approval_state, uploaded_by, uploaded_at
        ) VALUES
          (
            $1, $3, $4, 'Rev 2024.1',
            'documents/' || $5 || '/DOC-DECC-FP-2024.pdf',
            'DOC-DECC-FP-2024.pdf', 'application/pdf', 152840,
            $6, 'passed', 'approved', 'Eng. Tariq Al-Mansoor', NOW()
          ),
          (
            $2, $3, $7, 'rev-mecc-env-01',
            'documents/' || $5 || '/DOC-MECC-ENV-2005.pdf',
            'DOC-MECC-ENV-2005.pdf', 'application/pdf', 241900,
            $8, 'passed', 'approved', 'Dr. Mariam Al-Sulaiti', NOW()
          ),
          (
            'rev-001' || $9, $3, 'doc-001' || $9, 'Rev 01',
            'drawings/E3-QND26-AV-DWG-0001-Rev01.pdf',
            'E3-QND26-AV-DWG-0001-Rev01.pdf', 'application/pdf', 14250000,
            $10, 'passed', 'approved', 'Karim Haddad', NOW()
          )
        ON CONFLICT (id) DO UPDATE SET calculated_sha256 = EXCLUDED.calculated_sha256;
      `, [
        `rev-decc-fp-01${suffix}`,
        `rev-mecc-env-01${suffix}`,
        e3OrgId,
        `doc-decc-fp-01${suffix}`,
        pCode,
        deccCalculatedSha256,
        `doc-mecc-env-01${suffix}`,
        meccCalculatedSha256,
        suffix,
        avCalculatedSha256,
      ]);
    }

    // 5. Seed Production Operational Constraints strictly as UNVERIFIED (per Rule 6)
    const seedConstraints = [
      {
        id: 'CST-QA-ENV-NOISE-DAY-001',
        type: 'environmental_boundary_noise',
        srcType: 'statutory',
        srcOrg: 'Ministry of Environment and Climate Change (MECC)',
        zone: 'Commercial / Exhibition District Boundary',
        timeWindow: '04:00 - 22:00',
        limit: 65,
        unit: 'dB(A) Leq (10-min average at building boundary)',
        authority: 'MECC Environmental Inspectorate',
      },
      {
        id: 'CST-QA-ENV-NOISE-NIGHT-002',
        type: 'environmental_boundary_noise',
        srcType: 'statutory',
        srcOrg: 'Ministry of Environment and Climate Change (MECC)',
        zone: 'Commercial / Exhibition District Boundary',
        timeWindow: '22:00 - 04:00',
        limit: 55,
        unit: 'dB(A) Leq (10-min average at building boundary)',
        authority: 'MECC Environmental Inspectorate',
      },
      {
        id: 'CST-QA-NOISE-OCC-003',
        type: 'occupational_noise_exposure',
        srcType: 'statutory',
        srcOrg: 'Ministry of Environment and Climate Change (MECC)',
        zone: 'All On-Site Worker Workstations & Assembly Zones',
        timeWindow: 'Continuous 8-Hour Work Shift',
        limit: 85,
        unit: 'dB(A) 8h continuous exposure',
        authority: 'Ministry of Labour & MECC Joint Inspectorate',
      },
      {
        id: 'CST-DECC-FLOOR-LOAD-004',
        type: 'floor_load',
        srcType: 'venue',
        srcOrg: 'Doha Exhibition and Convention Center (DECC)',
        zone: 'Exhibition Halls 1 to 5 Ground Slab',
        timeWindow: '24 Hours',
        limit: 2500,
        unit: 'kg/m²',
        authority: 'DECC Civil & Structural Engineering Bureau',
      },
      {
        id: 'CST-DECC-HEIGHT-005',
        type: 'clear_height',
        srcType: 'venue',
        srcOrg: 'Doha Exhibition and Convention Center (DECC)',
        zone: 'Exhibition Halls 1 to 5 Clear Span',
        timeWindow: '24 Hours',
        limit: 18,
        unit: 'meters',
        authority: 'DECC Technical Operations',
      },
      {
        id: 'CST-DECC-RIG-POINT-006',
        type: 'rigging_point',
        srcType: 'venue',
        srcOrg: 'DECC Rigging & Technical Services',
        zone: 'Halls 1-5 Roof Truss Grid',
        timeWindow: '24 Hours',
        limit: 1000,
        unit: 'kg / point',
        authority: 'DECC Rigging Supervisor',
      },
      {
        id: 'CST-QA-LABOUR-HOURS-007',
        type: 'working_hours',
        srcType: 'statutory',
        srcOrg: 'Qatar Ministry of Labour',
        zone: 'All On-Site Workforces',
        timeWindow: '24 Hours',
        limit: 8,
        unit: 'hours / shift',
        authority: 'Qatar Ministry of Labour Inspectorate',
      },
      {
        id: 'CST-DECC-LOGISTICS-008',
        type: 'logistics_dock',
        srcType: 'venue',
        srcOrg: 'DECC Logistics & Security',
        zone: 'Marshaling Yards 1-4 & Loading Bays',
        timeWindow: '24 Hours',
        limit: 16,
        unit: 'trailers simultaneous',
        authority: 'DECC Traffic & Loading Dock Manager',
      },
    ];

    for (const pid of [qatarProjectId, defaultProjectId]) {
      for (const sc of seedConstraints) {
        const cstId = pid === qatarProjectId ? sc.id : `${sc.id}-def`;
        await client.query(`
          INSERT INTO operational_constraints (
            id, organisation_id, project_id, constraint_type, source_type, source_organisation,
            location_zone, time_window, limit_value, unit, applicability, priority,
            override_authority, verification_status, created_at, updated_at, version
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 'medium', $11, 'Unverified', NOW(), NOW(), 1
          ) ON CONFLICT (id) DO UPDATE SET verification_status = 'Unverified';
        `, [
          cstId, e3OrgId, pid, sc.type, sc.srcType, sc.srcOrg,
          sc.zone, sc.timeWindow, sc.limit, sc.unit, sc.authority
        ]);
      }
    }

    // 6. Seed Sprint 03 Real Acceptance Project: Large Indoor Family Entertainment Event
    const feeProjectId = 'a1111111-1111-4111-8111-111111111111';
    await client.query(`
      INSERT INTO projects (
        id, organisation_id, project_code, title, description, origin_code, owner_id,
        client_organisation_id, maturity, outcome, created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1, $2, 'PRJ-2026-FEE-01', 'Large Indoor Family Entertainment Event 2026',
        'Flagship multi-zone indoor family festival featuring main stage, registration counters, AV, lighting, games, furniture, branding, security, and staffing.',
        'DIRECT_AWARD', $3, '22222222-2222-4222-8222-222222222222', 'developing', 'undetermined', $3, $3, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
    `, [feeProjectId, e3OrgId, pmUserId]);

    for (const stage of STANDARD_THIRTEEN_STAGE_TEMPLATE.stages) {
      await client.query(`
        INSERT INTO project_stage_instances (
          id, project_id, organisation_id, stage_number, stage_name, status, progress_percent, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) ON CONFLICT (project_id, stage_number) DO UPDATE SET
          stage_name = EXCLUDED.stage_name, status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent;
      `, [
        feeProjectId,
        e3OrgId,
        stage.defaultOrder,
        stage.name,
        stage.defaultOrder <= 8 ? 'completed' : (stage.defaultOrder === 9 ? 'in_progress' : 'not_started'),
        stage.defaultOrder <= 8 ? 100 : (stage.defaultOrder === 9 ? 65 : 0)
      ]);
    }

    // 7. Seed Sprint 03 Physical Delivery Infrastructure & Acceptance Scenario
    // Vendors
    const abcJoineryId = '00000000-0000-4000-a000-000000000001';
    const qatarScenicId = '00000000-0000-4000-a000-000000000002';
    const gulfExhibitsId = '00000000-0000-4000-a000-000000000003';
    const alAttiyahFleetId = '00000000-0000-4000-a000-000000000004';

    await client.query(`
      INSERT INTO vendors (id, organisation_id, vendor_code, name, legal_name, trading_name, vendor_type, category, country, rating, qualification_status, status, compliance_verified, created_at)
      VALUES 
        ($1, $5, 'VEN-ABC-01', 'ABC Joinery & Fabrication', 'ABC Joinery LLC', 'ABC Scenic', 'fabricator', 'corporate', 'Qatar', '4.8', 'approved', 'active', true, NOW()),
        ($2, $5, 'VEN-QS-02', 'Qatar Scenic Workshops', 'Qatar Scenic Productions WLL', 'Qatar Scenic', 'fabricator', 'corporate', 'Qatar', '4.5', 'approved', 'active', true, NOW()),
        ($3, $5, 'VEN-GE-03', 'Gulf Exhibits & Structures', 'Gulf Exhibition Systems Co.', 'Gulf Exhibits', 'fabricator', 'corporate', 'Qatar', '4.3', 'approved', 'active', true, NOW()),
        ($4, $5, 'VEN-LOG-04', 'Al-Attiyah Fleet Logistics', 'Al-Attiyah Transport & Logistics', 'Al-Attiyah Logistics', 'logistics_supplier', 'corporate', 'Qatar', '4.9', 'approved', 'active', true, NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, qualification_status = EXCLUDED.qualification_status;
    `, [abcJoineryId, qatarScenicId, gulfExhibitsId, alAttiyahFleetId, e3OrgId]);

    // Warehouse
    const dohaWarehouseId = '00000000-0000-4000-b000-000000000001';
    await client.query(`
      INSERT INTO warehouses (id, organisation_id, warehouse_code, name, country, city, address, capacity, manager_id, operating_hours, created_at)
      VALUES ($1, $2, 'WH-DOHA-01', 'Doha Central Logistics Depot', 'Qatar', 'Doha', 'Street 24, Industrial Area, Doha', '12,000 sq m', '10000000-0000-4000-8000-000000000009', '07:00 - 20:00', NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `, [dohaWarehouseId, e3OrgId]);

    // E3 Assets
    const counterAssetId = '00000000-0000-4000-c000-000000000001';
    const barrierAssetId = '00000000-0000-4000-c000-000000000002';
    await client.query(`
      INSERT INTO assets (id, organisation_id, asset_tag, barcode, name, category, quantity, ownership, warehouse_id, zone, location, condition, availability, purchase_value, replacement_value, created_at)
      VALUES 
        ($1, $3, 'AST-CNT-001', 'E3-BC-CNT-001', 'Modular Registration Counter (Branded)', 'Furniture & Staging', 8, 'e3_owned', $4, 'Furniture', 'Bay 03-A', 'serviceable', 'available', '12000', '16000', NOW()),
        ($2, $3, 'AST-BAR-002', 'E3-BC-BAR-002', 'Crowd Control Barriers (2.5m Steel)', 'Crowd Safety', 42, 'e3_owned', $4, 'Tools', 'Yard B', 'serviceable', 'available', '25000', '32000', NOW())
      ON CONFLICT (id) DO UPDATE SET quantity = EXCLUDED.quantity;
    `, [counterAssetId, barrierAssetId, e3OrgId, dohaWarehouseId]);

    // Acceptance Project BOQ, Procurement Requirement & Fulfillment Journey
    const feeEstimateId = '00000000-0000-4000-d000-000000000001';
    await client.query(`
      INSERT INTO estimates (id, organisation_id, project_id, name, currency, status, total_cost, total_sell, version_number, created_at)
      VALUES ($1, $2, $3, 'FEE 2026 Commercial Master Budget', 'QAR', 'approved', '450000', '680000', 1, NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `, [feeEstimateId, e3OrgId, feeProjectId]);

    const feeBoqLineId = '00000000-0000-4000-e000-000000000001';
    await client.query(`
      INSERT INTO boq_lines (id, estimate_id, organisation_id, project_id, line_code, description, quantity, uom, unit_cost, unit_sell, created_at)
      VALUES ($1, $2, $3, $4, 'BOQ-FEE-REG-01', 'Modular Branded Registration Counters (Complete Assembly with LED lighting)', '30', 'units', '2200', '3200', NOW())
      ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description;
    `, [feeBoqLineId, feeEstimateId, e3OrgId, feeProjectId]);

    // Procurement Requirement (30 required: 8 internal E3 asset + 22 external fabrication)
    const feeProcReqId = '00000000-0000-4000-f000-000000000001';
    await client.query(`
      INSERT INTO procurement_requirements (
        id, organisation_id, project_id, requirement_code, source, boq_line_id, description, category,
        quantity, unit, required_on_site_date, procurement_lead_time_days, required_delivery_location,
        preferred_vendor_id, estimated_cost, approved_budget, status, priority, source_decision,
        internal_asset_quantity, external_sourcing_quantity, created_at
      ) VALUES (
        $1, $2, $3, 'PRQ-FEE-001', 'boq_line', $4, 'Provide 30 branded registration counters for Hall 1 entry portal', 'Staging & Fabrication',
        '30', 'units', NOW() + INTERVAL '7 days', '10', 'DECC Exhibition Hall 1',
        $5, '66000', '70000', 'awarded', 'high', 'use_e3_asset',
        '8', '22', NOW()
      ) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    `, [feeProcReqId, e3OrgId, feeProjectId, feeBoqLineId, abcJoineryId]);

    // Internal Asset Allocation of 8 existing counters
    await client.query(`
      INSERT INTO asset_allocations (id, organisation_id, asset_id, project_id, procurement_requirement_id, boq_line_id, allocated_quantity, window_start, window_end, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 8, NOW(), NOW() + INTERVAL '14 days', 'confirmed', NOW())
      ON CONFLICT DO NOTHING;
    `, [e3OrgId, counterAssetId, feeProjectId, feeProcReqId, feeBoqLineId]);

    // RFQ for balance (22 units)
    const feeRfqId = '00000000-0000-4000-f000-000000000002';
    await client.query(`
      INSERT INTO rfqs (id, organisation_id, project_id, rfq_number, procurement_requirement_id, issue_date, closing_date, invited_vendor_ids, technical_specification, quantity, delivery_requirement, commercial_terms, status, created_at)
      VALUES (
        $1, $2, $3, 'RFQ-FEE-2026-001', $4, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days',
        $5, 'Fabrication of 22 modular branded registration counters matching design specification DES-FEE-REG-001 Rev 02', '22',
        'Direct site delivery to DECC Hall 1 with loading dock clearance', '30 Days Net on final acceptance', 'issued', NOW()
      ) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    `, [feeRfqId, e3OrgId, feeProjectId, feeProcReqId, JSON.stringify([abcJoineryId, qatarScenicId, gulfExhibitsId])]);

    // Vendor Quotes: ABC Joinery recommended
    await client.query(`
      INSERT INTO vendor_quotes (id, organisation_id, rfq_id, vendor_id, quote_reference, unit_rate, total_price, currency, delivery_time_days, payment_terms, warranty, technical_compliance, technical_score, commercial_score, risk_score, total_score, is_recommended, created_at)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, 'QT-ABC-2026-88', '3000', '66000', 'QAR', '10', '30 Days Net', '12 Months', '100% Compliant', '95', '95', '92', '94', true, NOW()),
        (gen_random_uuid(), $1, $2, $4, 'QT-QS-2026-104', '3250', '71500', 'QAR', '14', '30 Days Net', '12 Months', '100% Compliant', '90', '85', '85', '87', false, NOW()),
        (gen_random_uuid(), $1, $2, $5, 'QT-GE-2026-302', '3400', '74800', 'QAR', '18', '50% Advance', '6 Months', 'Compliant with minor exclusions', '85', '80', '75', '80', false, NOW())
      ON CONFLICT DO NOTHING;
    `, [e3OrgId, feeRfqId, abcJoineryId, qatarScenicId, gulfExhibitsId]);

    // Purchase Order for ABC Joinery: QAR 66,000 committed cost
    const feePoId = '00000000-0000-4000-f000-000000000003';
    await client.query(`
      INSERT INTO purchase_orders (
        id, organisation_id, project_id, po_number, vendor_id, rfq_id, procurement_requirement_id,
        currency, subtotal, total_amount, payment_terms, delivery_date, delivery_location, status,
        external_delivery_status, created_at
      ) VALUES (
        $1, $2, $3, 'PO-QND26-0045', $4, $5, $6,
        'QAR', '66000', '66000', '30 Days Net', NOW() + INTERVAL '5 days', 'DECC Exhibition Hall 1', 'released',
        'confirmed', NOW()
      ) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    `, [feePoId, e3OrgId, feeProjectId, abcJoineryId, feeRfqId, feeProcReqId]);

    // Production Package: 22 units produced by ABC Joinery
    const feePkgId = '00000000-0000-4000-f000-000000000004';
    await client.query(`
      INSERT INTO production_packages (
        id, organisation_id, project_id, package_code, vendor_id, linked_requirement_id,
        title, quantity, completed_quantity, material, finish, production_owner_id,
        start_date, required_completion_date, delivery_date, status, created_at
      ) VALUES (
        $1, $2, $3, 'PKG-FEE-REG-01', $4, $5,
        'Fabrication of 22 Modular Registration Counters', 22, 22, 'HDF Melamine & Aluminium Frame with Acrylic Logo Panel', 'Semi-gloss White and Burgundy',
        '10000000-0000-4000-8000-000000000007', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', NOW(), 'delivered', NOW()
      ) ON CONFLICT (id) DO UPDATE SET completed_quantity = EXCLUDED.completed_quantity, status = EXCLUDED.status;
    `, [feePkgId, e3OrgId, feeProjectId, abcJoineryId, feeProcReqId]);

    // Quality Inspection & Resolved Snag
    const feeInspId = '00000000-0000-4000-f000-000000000005';
    await client.query(`
      INSERT INTO quality_inspections (id, organisation_id, project_id, package_id, inspector_id, inspection_date, inspection_type, result, created_at)
      VALUES ($1, $2, $3, $4, '10000000-0000-4000-8000-000000000010', NOW() - INTERVAL '1 day', 'factory_acceptance', 'passed', NOW())
      ON CONFLICT (id) DO NOTHING;
    `, [feeInspId, e3OrgId, feeProjectId, feePkgId]);

    await client.query(`
      INSERT INTO snags (id, organisation_id, project_id, package_id, inspection_id, title, description, severity, status, assigned_to, blocks_dispatch, blocks_readiness, resolved_at, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Edge banding touch-up on Counter #14', 'Minor vinyl film peel on rear cable grommet', 'minor', 'resolved', '10000000-0000-4000-8000-000000000010', false, false, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `, [e3OrgId, feeProjectId, feePkgId, feeInspId]);

    // Packing List (30 counters: 8 internal + 22 fabricated) & Logistics
    const feePackingListId = '00000000-0000-4000-f000-000000000006';
    await client.query(`
      INSERT INTO packing_lists (
        id, organisation_id, project_id, packing_list_number, warehouse_id, destination,
        vehicle_id, dispatch_date, required_arrival, items, status, delivery_proof, delivered_at, created_at
      ) VALUES (
        $1, $2, $3, 'PL-FEE-001', $4, 'DECC Hall 1 Loading Bay',
        'TRUCK-07', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '6 hours',
        $5, 'delivered',
        $6, NOW() - INTERVAL '6 hours', NOW()
      ) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    `, [
      feePackingListId, e3OrgId, feeProjectId, dohaWarehouseId,
      JSON.stringify([
        { assetTag: 'AST-CNT-001', description: 'Modular Registration Counter (Internal E3 Asset)', quantity: 8, casesPallets: '4 pallets', weightKg: 800, volumeM3: 6.4 },
        { assetTag: 'PKG-REG-01', description: 'Modular Registration Counter (ABC Joinery Fabricated)', quantity: 22, casesPallets: '11 pallets', weightKg: 2200, volumeM3: 17.6 }
      ]),
      JSON.stringify({ receiverName: 'Omar Farooq (Site Field Supervisor)', timestamp: new Date().toISOString(), photos: ['evidence/pl-fee-001-pod.jpg'], discrepancies: [] })
    ]);

    // Transport Plan: Truck 07
    await client.query(`
      INSERT INTO logistics_plans (id, organisation_id, project_id, vehicle_id, vehicle_type, supplier, driver_name, driver_phone, load_description, origin, destination, departure_time, arrival_time, access_slot, loading_dock, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, 'TRUCK-07', '7 Ton', 'Al-Attiyah Fleet Logistics', 'Hamad Al-Khelaifi', '+974 5511 2233', '30 Registration Counters on 15 Pallets', 'Doha Central Warehouse', 'DECC Hall 1', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '6 hours', 'Slot A - Morning Dock Access', 'Dock 03', 'arrived', NOW())
      ON CONFLICT DO NOTHING;
    `, [e3OrgId, feeProjectId]);

    // Installation Items: 30 Installed & Accepted
    await client.query(`
      INSERT INTO installation_items (id, organisation_id, project_id, package_id, title, status, installer_notes, verified_at, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, '30 × Modular Branded Registration Counters (Hall 1 Entry)', 'accepted', 'All 30 units positioned, leveled, cable-managed, power-tested, and accepted by Site Supervisor Omar Farooq', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `, [e3OrgId, feeProjectId, feePkgId]);

    // Operational Readiness Gate: 100% COMPLETE
    await client.query(`
      INSERT INTO operational_readiness_gates (id, organisation_id, project_id, overall_status, overall_score_percent, dimension_checks, critical_blockers, exceptions, evaluated_at)
      VALUES (
        gen_random_uuid(), $1, $2, 'READY', '100',
        $3, '[]'::jsonb, '[]'::jsonb, NOW()
      ) ON CONFLICT DO NOTHING;
    `, [
      e3OrgId, feeProjectId,
      JSON.stringify([
        { dimension: 'Scope', isPassed: true, isCritical: true, scorePercent: 100, details: 'All 30 registration counter units fully delivered against scope' },
        { dimension: 'Design', isPassed: true, isCritical: true, scorePercent: 100, details: 'Design DES-FEE-REG-001 approved and built to spec' },
        { dimension: 'Production', isPassed: true, isCritical: true, scorePercent: 100, details: '22/22 units fabricated and dispatched on schedule' },
        { dimension: 'Assets', isPassed: true, isCritical: true, scorePercent: 100, details: '8/8 internal E3 units inspected and dispatched without conflict' },
        { dimension: 'Logistics', isPassed: true, isCritical: true, scorePercent: 100, details: 'Truck 07 cleared loading dock and confirmed site delivery' },
        { dimension: 'Installation', isPassed: true, isCritical: true, scorePercent: 100, details: '30/30 units positioned, connected, and accepted on site' },
        { dimension: 'HSE', isPassed: true, isCritical: true, scorePercent: 100, details: 'Zero safety incidents; flame-retardancy certificates verified' },
        { dimension: 'Permits', isPassed: true, isCritical: true, scorePercent: 100, details: 'Civil Defence & DECC venue work permits fully approved' },
        { dimension: 'Staffing', isPassed: true, isCritical: true, scorePercent: 100, details: 'Hostesses and technical operators rostered without conflict' },
        { dimension: 'Technical Testing', isPassed: true, isCritical: true, scorePercent: 100, details: 'All integrated LED power runs load-tested and passed' }
      ])
    ]);

    await client.query('COMMIT');
    transactionStarted = false;
  } catch (error) {
    if (client && transactionStarted) {
      // Preserve the seed failure if the connection also fails during rollback.
      try { await client.query('ROLLBACK'); } catch {}
    }
    throw error;
  } finally {
    try {
      client?.release();
    } finally {
      await pool.end();
    }
  }

  console.log('[*] ✓ Successfully populated persistent PostgreSQL tables with 16 roles, Qatar Tourism project, FEE Acceptance Project, stages, documents, physical delivery lifecycle, and unverified constraints.');
  return manifest;
}
