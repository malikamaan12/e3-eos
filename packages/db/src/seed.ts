import {
  SYNTHETIC_ORGANISATIONS,
  SYNTHETIC_USERS,
  SYNTHETIC_PROJECTS,
} from '../../test-fixtures/src/index.js';

export interface SeedDataManifest {
  seededAt: string;
  organisationsCount: number;
  usersCount: number;
  projectsCount: number;
  entities: {
    organisations: Array<{ id: string; name: string; code: string }>;
    users: Array<{ id: string; name: string; email: string; isSuperAdmin: boolean }>;
    projects: Array<{ id: string; code: string; title: string; origin: string }>;
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
  }));

  return {
    seededAt: new Date().toISOString(),
    organisationsCount: organisations.length,
    usersCount: users.length,
    projectsCount: projects.length,
    entities: {
      organisations,
      users,
      projects,
    },
  };
}

export async function runSeed(): Promise<SeedDataManifest> {
  const manifest = generateSeedManifest();
  console.log(`[E3-EOS DB Seed] Successfully generated synthetic development seed:`);
  console.log(`  - Organisations: ${manifest.organisationsCount}`);
  console.log(`  - Users: ${manifest.usersCount}`);
  console.log(`  - Projects: ${manifest.projectsCount}`);
  return manifest;
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  runSeed().catch(console.error);
}
