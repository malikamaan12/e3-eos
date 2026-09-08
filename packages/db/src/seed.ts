import {
  SYNTHETIC_ORGANISATIONS,
  SYNTHETIC_USERS,
  SYNTHETIC_PROJECTS,
} from '../../test-fixtures/src/index.js';
import {
  ALL_STAGE_ACTIVITIES,
  STANDARD_THIRTEEN_STAGE_TEMPLATE,
} from '../../domain/src/index.js';

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
  console.log(`[E3-EOS DB Seed] Successfully generated synthetic development seed:`);
  console.log(`  - Organisations: ${manifest.organisationsCount}`);
  console.log(`  - Users: ${manifest.usersCount}`);
  console.log(`  - Projects: ${manifest.projectsCount}`);
  console.log(`  - Stage Instances: ${manifest.stageInstancesCount}`);
  console.log(`  - Stage Activities: ${manifest.stageActivitiesCount}`);
  return manifest;
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  runSeed().catch(console.error);
}

