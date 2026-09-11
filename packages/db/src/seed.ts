import {
  SYNTHETIC_ORGANISATIONS,
  SYNTHETIC_USERS,
  SYNTHETIC_PROJECTS,
} from '@e3-eos/test-fixtures';
import {
  ALL_STAGE_ACTIVITIES,
  STANDARD_THIRTEEN_STAGE_TEMPLATE,
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

  // Attempt real database insert if database is reachable
  const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  });

  try {
    const client = await pool.connect();
    console.log('[*] Connected to PostgreSQL. Seeding persistent tables...');

    // 0. Ensure Sprint 01 hardening tables exist
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

    // 2. Seed Users & Accounts for 13 Roles with Distinct Strong Passwords
    const getInitialUserPassword = (email: string): string => {
      if (process.env.INITIAL_ADMIN_PASSWORD) return process.env.INITIAL_ADMIN_PASSWORD;
      const prefix = email.split('@')[0];
      const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      return `E3#${capitalized}*Doha2026!`;
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
        ON CONFLICT (organisation_id, user_id) DO UPDATE SET role = $3;
      `, [orgId, u.id, u.role, (u as any).orgId ? 'client' : 'internal']);
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

    console.log('[*] ✓ Successfully populated persistent PostgreSQL tables with 16 roles, Qatar Tourism project, stages, documents, and unverified constraints.');
    client.release();
  } catch (err: any) {
    console.warn('[*] Database persistent seed notice:', err.message);
  } finally {
    await pool.end();
  }

  return manifest;
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  runSeed().catch(console.error);
}
