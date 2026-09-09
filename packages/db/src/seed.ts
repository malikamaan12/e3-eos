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
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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

    // 2. Seed Users & Accounts for 13 Roles
    const defaultHashedPassword = hashPassword('Password123!');

    for (const u of CANONICAL_E3_ROLES_USERS) {
      const orgId = (u as any).orgId || '11111111-1111-4111-8111-111111111111';
      await client.query(`
        INSERT INTO users (id, email, name, email_verified, is_super_admin, created_at, updated_at)
        VALUES ($1, $2, $3, true, $4, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, is_super_admin = $4;
      `, [u.id, u.email, u.name, u.isSuperAdmin]);

      // Password account (password: 'Password123!' hashed with scrypt salt)
      await client.query(`
        UPDATE accounts SET password = $2 WHERE user_id = $1 AND provider_id = 'credential';
      `, [u.id, defaultHashedPassword]);

      await client.query(`
        INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at)
        SELECT gen_random_uuid(), $1, $2, 'credential', $3, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE user_id = $1 AND provider_id = 'credential');
      `, [u.id, u.email, defaultHashedPassword]);

      // Membership
      await client.query(`
        INSERT INTO memberships (id, organisation_id, user_id, role, audience, is_revoked, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW(), NOW())
        ON CONFLICT (organisation_id, user_id) DO UPDATE SET role = $3;
      `, [orgId, u.id, u.role, (u as any).orgId ? 'client' : 'internal']);
    }

    // 3. Seed Qatar Tourism Tender Project & 13 Stages
    const qatarProjectId = 'f1111111-1111-4111-8111-111111111111';
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

    console.log('[*] ✓ Successfully populated persistent PostgreSQL tables with 13 roles, Qatar Tourism project, stages, and work tasks.');
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
