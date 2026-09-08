import http from 'http';

interface EndpointCheck {
  path: string;
  expectedStatus: number;
  expectedContentType?: string;
  description: string;
}

const CHECKS: EndpointCheck[] = [
  { path: '/api/v1/health', expectedStatus: 200, expectedContentType: 'application/json', description: 'Core API Health Probe' },
  { path: '/api/v1/health/system', expectedStatus: 200, expectedContentType: 'application/json', description: 'Telemetry & Process Metrics' },
  { path: '/api/v1/me', expectedStatus: 200, expectedContentType: 'application/json', description: 'Active User Profile' },
  { path: '/api/v1/my-work', expectedStatus: 200, expectedContentType: 'application/json', description: 'Personal Task & Approvals Queue' },
  { path: '/api/v1/projects', expectedStatus: 200, expectedContentType: 'application/json', description: 'Multi-Tenant Project Registry' },
  { path: '/api/v1/projects/stage-library', expectedStatus: 200, expectedContentType: 'application/json', description: 'Canonical 13-Stage Activity Library' },
  { path: '/api/v1/field/storage-contingency', expectedStatus: 200, expectedContentType: 'application/json', description: 'Offline Storage Contingency Disclosure' },
  { path: '/api/v1/production/security-assessment', expectedStatus: 200, expectedContentType: 'application/json', description: 'Pre-Flight Security Audit Manifest' },
  { path: '/api/v1/openapi.yaml', expectedStatus: 200, expectedContentType: 'text/yaml', description: 'OpenAPI 3.1 YAML Contract' },
  { path: '/api/v1/docs', expectedStatus: 200, expectedContentType: 'text/html', description: 'Scalar API Documentation UI' },
];

async function runSmokeTests() {
  console.log('================================================================================');
  console.log('   E3-EOS v1.0.0 — LIVE ENDPOINT SMOKE TEST (PORT 4000)');
  console.log('================================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const check of CHECKS) {
    process.stdout.write(`[*] Checking ${check.path.padEnd(42)} ... `);
    try {
      const res = await fetch(`http://localhost:4000${check.path}`, {
        headers: {
          'x-organisation-id': '11111111-1111-4111-8111-111111111111',
        },
      });

      const contentType = res.headers.get('content-type') || '';
      const statusOk = res.status === check.expectedStatus;
      const typeOk = !check.expectedContentType || contentType.includes(check.expectedContentType);

      if (statusOk && typeOk) {
        console.log(`[PASS] (${res.status} OK) — ${check.description}`);
        passedCount++;
      } else {
        console.log(`[FAIL] (Got ${res.status}, expected ${check.expectedStatus})`);
        failedCount++;
      }
    } catch (err: any) {
      console.log(`[ERROR] Connection failed: ${err.message}`);
      failedCount++;
    }
  }

  console.log('\n================================================================================');
  console.log(`   SMOKE TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (${passedCount + failedCount} Total)`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('[Unhandled]', err);
  process.exit(1);
});
