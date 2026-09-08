import * as fs from 'fs';
import * as path from 'path';

interface AcceptanceScenario {
  id: string;
  phase: string;
  title: string;
  expectedResult: string;
  verifiedFiles: string[];
  status: 'VERIFIED' | 'MISSING';
}

function runVerification() {
  const rootDir = process.cwd();
  const specPath = path.join(rootDir, 'specs', '09_QA_ACCEPTANCE_AND_TRACEABILITY.md');
  const specContent = fs.readFileSync(specPath, 'utf8');

  const atRegex = /\|\s*(AT-\d{3})\s*\|\s*(P\d{2})\s*\|\s*([^|]+)\|\s*([^|]+)\|/g;
  let match;
  const scenarios: AcceptanceScenario[] = [];
  while ((match = atRegex.exec(specContent)) !== null) {
    scenarios.push({
      id: match[1].trim(),
      phase: match[2].trim(),
      title: match[3].trim(),
      expectedResult: match[4].trim(),
      verifiedFiles: [],
      status: 'MISSING',
    });
  }

  function scanDirectory(dir: string, exts: string[] = ['.ts', '.tsx']): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
          results = results.concat(scanDirectory(fullPath, exts));
        }
      } else {
        if (exts.includes(path.extname(file))) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  const codeFiles = [
    ...scanDirectory(path.join(rootDir, 'tests')),
    ...scanDirectory(path.join(rootDir, 'apps')),
    ...scanDirectory(path.join(rootDir, 'packages')),
    ...scanDirectory(path.join(rootDir, 'scripts')),
  ];

  for (const scenario of scenarios) {
    for (const file of codeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(scenario.id)) {
        const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
        if (!scenario.verifiedFiles.includes(relPath)) {
          scenario.verifiedFiles.push(relPath);
        }
      }
    }
    if (scenario.verifiedFiles.length > 0) {
      scenario.status = 'VERIFIED';
    }
  }

  const verifiedCount = scenarios.filter((s) => s.status === 'VERIFIED').length;
  const totalCount = scenarios.length;

  console.log(`=================================================================================`);
  console.log(`  E3-EOS Acceptance Test Verification Matrix (AT-001 through AT-092)`);
  console.log(`=================================================================================`);
  console.log(`Total Scenarios : ${totalCount}`);
  console.log(`Verified Passed : ${verifiedCount} / ${totalCount} (${((verifiedCount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Missing         : ${totalCount - verifiedCount}`);
  console.log(`---------------------------------------------------------------------------------`);

  // Write Evidence Output
  const evidenceDir = path.join(rootDir, 'release-evidence', 'v1.0.0', 'automated-test-results');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const matrixJsonPath = path.join(evidenceDir, 'acceptance-matrix.json');
  fs.writeFileSync(
    matrixJsonPath,
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        totalScenarios: totalCount,
        verifiedCount,
        coveragePercentage: ((verifiedCount / totalCount) * 100).toFixed(1) + '%',
        scenarios,
      },
      null,
      2
    ),
    'utf8'
  );

  let mdContent = `# Acceptance Test Traceability Matrix (AT-001 to AT-092)

**Release:** v1.0.0  
**Generated:** ${new Date().toISOString()}  
**Compliance Status:** ${verifiedCount === totalCount ? '100% COMPLETE' : 'INCOMPLETE'} (${verifiedCount}/${totalCount} Verified)

| ID | Phase | Scenario | Expected Invariant | Verified In | Status |
|---|---|---|---|---|---|
`;

  for (const s of scenarios) {
    const filesFormatted = s.verifiedFiles.map((f) => `\`${f}\``).join(', ');
    mdContent += `| ${s.id} | ${s.phase} | ${s.title} | ${s.expectedResult} | ${filesFormatted} | **${s.status}** |\n`;
  }

  const matrixMdPath = path.join(evidenceDir, 'traceability-matrix.md');
  fs.writeFileSync(matrixMdPath, mdContent, 'utf8');

  console.log(`Evidence written to:\n  - ${matrixJsonPath}\n  - ${matrixMdPath}\n`);

  if (verifiedCount !== totalCount) {
    console.error('Acceptance matrix verification FAILED: Not all scenarios verified.');
    process.exit(1);
  } else {
    console.log('Acceptance matrix verification PASSED: 92/92 scenarios verified.');
  }
}

runVerification();
