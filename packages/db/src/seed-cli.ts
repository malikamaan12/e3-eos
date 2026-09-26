// Explicit database-writing entrypoint. Library imports never invoke seeding.
import { runSeed } from './seed.js';

try {
  await runSeed();
} catch (error) {
  console.error('[E3-EOS DB Seed] Failed:', error instanceof Error ? error.message : 'Unknown seed failure');
  process.exitCode = 1;
}
