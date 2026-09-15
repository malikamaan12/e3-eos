const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findRepoRoot(startDir) {
  let current = startDir;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir;
}

const repoRoot = findRepoRoot(__dirname) || findRepoRoot(process.cwd());
console.log('[Vercel Build] Repository root detected at: ' + repoRoot);
console.log('[Vercel Build] Current working directory: ' + process.cwd());

let pnpmCmd = 'pnpm';
try {
  execSync('pnpm --version', { stdio: 'ignore' });
} catch {
  pnpmCmd = 'npx pnpm';
}

console.log('[Vercel Build] Building @e3-eos/web with ' + pnpmCmd + '...');
execSync(pnpmCmd + ' --filter @e3-eos/web build', { cwd: repoRoot, stdio: 'inherit' });

const srcDist = path.join(repoRoot, 'apps', 'web', 'dist');
const targetLocations = [
  path.join(repoRoot, 'dist'),
  path.join(process.cwd(), 'dist'),
  path.join(repoRoot, 'apps', 'dist'),
  path.join(repoRoot, 'apps', 'web', 'dist'),
  path.join(repoRoot, 'apps', 'api', 'dist'),
];

for (const target of targetLocations) {
  if (target !== srcDist) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(srcDist, target, { recursive: true });
  }
}

console.log('[Vercel Build] Complete! Output mirrored to all candidate output paths.');
