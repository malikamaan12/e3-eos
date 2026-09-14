const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[Vercel Build] Building @e3-eos/web...');
execSync('pnpm --filter @e3-eos/web build', { stdio: 'inherit' });

const srcDist = path.resolve(__dirname, '..', 'apps', 'web', 'dist');
const rootDist = path.resolve(__dirname, '..', 'dist');

console.log(`[Vercel Build] Ensuring build output is present at both ${srcDist} and ${rootDist}...`);
fs.cpSync(srcDist, rootDist, { recursive: true });

console.log('[Vercel Build] Build and copy completed successfully!');
