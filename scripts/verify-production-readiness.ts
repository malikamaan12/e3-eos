import { execSync } from 'child_process';
import { runSeed } from '../packages/db/src/seed.js';

interface CheckStep {
  name: string;
  command?: string;
  fn?: () => Promise<void> | void;
  status: 'PENDING' | 'PASSED' | 'FAILED';
  durationMs: number;
  details?: string;
}

async function runPreflight() {
  console.log('================================================================================');
  console.log('   E3-EOS v1.0.0 — COMPREHENSIVE PRODUCTION PRE-FLIGHT VERIFICATION GATE');
  console.log('================================================================================\n');

  const startTime = Date.now();

  const checks: CheckStep[] = [
    {
      name: '1. TypeScript Static Compilation (8 Projects)',
      command: 'pnpm -r run typecheck',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      name: '2. Vitest Automated Suites (245 Tests across 27 Files, incl. RLS & 15 Brutal Invariants)',
      command: 'pnpm test',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      name: '3. Acceptance Traceability Matrix (AT-001 through AT-092)',
      command: 'pnpm verify:matrix',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      name: '4. Domain Invariants & Multi-Tenant Fixtures',
      command: 'pnpm demo',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      name: '5. Production Build Bundle (All Packages & Applications)',
      command: 'pnpm build',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      name: '6. Synthetic Database Seed Generation (13 Stages, 312 Activities)',
      fn: async () => {
        const manifest = await runSeed();
        if (manifest.stageInstancesCount !== 13 || manifest.stageActivitiesCount !== 312) {
          throw new Error(`Unexpected seed count: stages=${manifest.stageInstancesCount}, activities=${manifest.stageActivitiesCount}`);
        }
      },
      status: 'PENDING',
      durationMs: 0,
    },
  ];

  let allPassed = true;

  for (const check of checks) {
    process.stdout.write(`[*] Executing ${check.name}... `);
    const stepStart = Date.now();
    try {
      if (check.command) {
        execSync(check.command, { stdio: 'pipe' });
      } else if (check.fn) {
        await check.fn();
      }
      check.durationMs = Date.now() - stepStart;
      check.status = 'PASSED';
      console.log(`PASSED (${(check.durationMs / 1000).toFixed(2)}s)`);
    } catch (err: any) {
      check.durationMs = Date.now() - stepStart;
      check.status = 'FAILED';
      check.details = err.stderr ? err.stderr.toString() : err.message;
      console.log(`FAILED (${(check.durationMs / 1000).toFixed(2)}s)`);
      console.error(check.details);
      allPassed = false;
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n================================================================================');
  console.log(`   PRE-FLIGHT SUMMARY REPORT — Total Time: ${totalDuration}s`);
  console.log('================================================================================');
  console.table(
    checks.map((c) => ({
      'Verification Gate': c.name,
      Status: c.status,
      'Duration (s)': (c.durationMs / 1000).toFixed(2),
    }))
  );

  if (!allPassed) {
    console.error('\n[FATAL] One or more pre-flight verification gates failed. Deployment blocked.');
    process.exit(1);
  }

  console.log('\n>>> SUCCESS: All 6 Production Gates PASSED.');
  console.log('>>> E3-EOS v1.0.0 is CERTIFIED READY for Google Cloud Doha (me-central2) deployment.');
  console.log('================================================================================\n');
}

runPreflight().catch((err) => {
  console.error('[Unhandled Error]', err);
  process.exit(1);
});
