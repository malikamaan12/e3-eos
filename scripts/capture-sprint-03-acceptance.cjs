const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c7a021cc-a6b6-4cff-9128-1946fe5cad64';
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode < 500) {
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(check, 500);
        }
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout connecting to ${url}`));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture() {
  console.log(`Starting web server for screenshot capture...`);
  const webServer = spawn('node', ['apps/web/server.cjs'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: '3000' },
    stdio: 'ignore'
  });

  try {
    await waitForServer('http://localhost:3000/health');
    console.log(`Web server listening on port 3000.`);

    console.log(`Launching browser from ${CHROME_PATH}...`);
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
      defaultViewport: { width: 1440, height: 960 }
    });

    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
    });

    const projectId = 'f1111111-1111-4111-8111-111111111111';

    async function takeScreenshot(filename) {
      const outPath = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✓ [SAVED] ${filename} -> ${outPath}`);
    }

    // 1. 01-procurement-requirements-dual-source.png
    console.log('Capturing 01-procurement-requirements-dual-source.png...');
    await page.goto(`http://localhost:3000/projects/${projectId}?tab=procurement`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#tab-cockpit-procurement');
    await sleep(1500);
    await takeScreenshot('01-procurement-requirements-dual-source.png');

    // 2. 02-rfq-3way-evaluation-matrix.png
    console.log('Capturing 02-rfq-3way-evaluation-matrix.png...');
    await page.evaluate(() => {
      window.scrollBy(0, 480);
    });
    await sleep(1000);
    await takeScreenshot('02-rfq-3way-evaluation-matrix.png');

    // 3. 03-vendor-directory-10-types.png
    console.log('Capturing 03-vendor-directory-10-types.png...');
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.btn-vendor-profile');
    await sleep(1200);
    await takeScreenshot('03-vendor-directory-10-types.png');

    // 4. 04-vendor-profile-restricted-bank.png
    console.log('Capturing 04-vendor-profile-restricted-bank.png...');
    const profileBtn = await page.$('.btn-vendor-profile');
    if (profileBtn) {
      await profileBtn.click();
      await page.waitForSelector('#btn-reveal-bank');
      await sleep(600);
      const revealBtn = await page.$('#btn-reveal-bank');
      if (revealBtn) {
        await revealBtn.click();
        await sleep(1000);
      }
    }
    await takeScreenshot('04-vendor-profile-restricted-bank.png');

    // Close vendor modal
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await sleep(500);

    // 5. 05-po-commitment-commercial-eac.png
    console.log('Capturing 05-po-commitment-commercial-eac.png...');
    await page.goto(`http://localhost:3000/projects/${projectId}?tab=commercial`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#tab-cockpit-commercial');
    await sleep(1500);
    await takeScreenshot('05-po-commitment-commercial-eac.png');

    // 6. 06-production-package-lifecycle.png
    console.log('Capturing 06-production-package-lifecycle.png...');
    await page.goto(`http://localhost:3000/projects/${projectId}?tab=production`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#tab-cockpit-production');
    await sleep(1500);
    await takeScreenshot('06-production-package-lifecycle.png');

    // 7. 07-warehouse-10-zones.png
    console.log('Capturing 07-warehouse-10-zones.png...');
    await page.goto('http://localhost:3000/warehouse', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#btn-execute-movement');
    await sleep(1500);
    await takeScreenshot('07-warehouse-10-zones.png');

    // 8. 08-warehouse-custodial-movements.png
    console.log('Capturing 08-warehouse-custodial-movements.png...');
    const moveBtn = await page.$('#btn-execute-movement');
    if (moveBtn) {
      await moveBtn.click();
      await sleep(1000);
    }
    await takeScreenshot('08-warehouse-custodial-movements.png');

    // Close move modal
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await sleep(500);

    // 9. 09-logistics-truck-manifest.png
    console.log('Capturing 09-logistics-truck-manifest.png...');
    await page.goto(`http://localhost:3000/projects/${projectId}?tab=logistics`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#tab-cockpit-logistics');
    await sleep(1500);
    await takeScreenshot('09-logistics-truck-manifest.png');

    // 10. 10-crew-statutory-vs-fatigue-policy.png
    console.log('Capturing 10-crew-statutory-vs-fatigue-policy.png...');
    await page.goto(`http://localhost:3000/projects/${projectId}?tab=crew`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#tab-cockpit-crew');
    await sleep(1500);
    await takeScreenshot('10-crew-statutory-vs-fatigue-policy.png');

    // 11. 11-crew-multi-project-conflict.png
    console.log('Capturing 11-crew-multi-project-conflict.png...');
    await page.waitForSelector('#crew-conflict-alert');
    await sleep(800);
    await takeScreenshot('11-crew-multi-project-conflict.png');

    // 12. 12-daily-site-report-immutable.png
    console.log('Capturing 12-daily-site-report-immutable.png...');
    await page.goto(`http://localhost:3000/projects/${projectId}?tab=site`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#subtab-dsr');
    await page.click('#subtab-dsr');
    await sleep(1500);
    await takeScreenshot('12-daily-site-report-immutable.png');

    // 13. 13-installation-progressive-evidence.png
    console.log('Capturing 13-installation-progressive-evidence.png...');
    await page.waitForSelector('#subtab-installation');
    await page.click('#subtab-installation');
    await sleep(1500);
    await takeScreenshot('13-installation-progressive-evidence.png');

    // 14. 14-readiness-gate-10-dimensions.png
    console.log('Capturing 14-readiness-gate-10-dimensions.png...');
    await page.waitForSelector('#subtab-readiness');
    await page.click('#subtab-readiness');
    await sleep(1500);
    await takeScreenshot('14-readiness-gate-10-dimensions.png');

    // 15. 15-opening-authorization-audit-seal.png
    console.log('Capturing 15-opening-authorization-audit-seal.png...');
    const sealElement = await page.$('#opening-authorization-seal');
    if (!sealElement) {
      const authModalBtn = await page.$('#btn-open-opening-auth-modal');
      if (authModalBtn) {
        await authModalBtn.click();
        await sleep(600);
        const submitAuthBtn = await page.$('#btn-submit-show-authorization');
        if (submitAuthBtn) {
          await submitAuthBtn.click();
          await sleep(1500);
        }
      }
    }
    await page.evaluate(() => {
      const seal = document.querySelector('#opening-authorization-seal');
      if (seal) seal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await sleep(1000);
    await takeScreenshot('15-opening-authorization-audit-seal.png');

    // 16. 16-mobile-field-ops-pod-snag.png
    console.log('Capturing 16-mobile-field-ops-pod-snag.png (<480px mobile viewport)...');
    await page.setViewport({ width: 420, height: 900, isMobile: true });
    await page.goto('http://localhost:3000/field', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#mobile-tab-pod');
    await page.click('#mobile-tab-pod');
    await sleep(1500);
    await takeScreenshot('16-mobile-field-ops-pod-snag.png');

    // 17. 17-project-cockpit-executive-kpis.png
    console.log('Capturing 17-project-cockpit-executive-kpis.png...');
    await page.setViewport({ width: 1440, height: 960, isMobile: false });
    await page.goto(`http://localhost:3000/projects/${projectId}?tab=overview`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#cockpit-module-tabs');
    await sleep(1500);
    await takeScreenshot('17-project-cockpit-executive-kpis.png');

    await browser.close();
    console.log('All 17 Sprint 03 acceptance screenshots captured successfully!');
  } finally {
    webServer.kill('SIGTERM');
  }
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
