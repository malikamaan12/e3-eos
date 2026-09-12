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
  console.log(`Starting web server for Sprint 04 screenshot capture...`);
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

    async function takeScreenshot(filename) {
      const outPath = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✓ [SAVED] ${filename} -> ${outPath}`);
    }

    // -------------------------------------------------------------------------
    // 1. 01-field-home.png — Mobile Field Ops PWA Landing
    // -------------------------------------------------------------------------
    console.log('Capturing 01-field-home.png...');
    await page.goto('http://localhost:3000/field', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('01-field-home.png');

    // -------------------------------------------------------------------------
    // 2. 02-crew-attendance.png — Live Crew Roster & Attendance
    // -------------------------------------------------------------------------
    console.log('Capturing 02-crew-attendance.png...');
    await page.goto('http://localhost:3000/live/roster', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('02-crew-attendance.png');

    // -------------------------------------------------------------------------
    // 3. 03-qualification-card.png — Worker Safety Passport & Qualifications
    // -------------------------------------------------------------------------
    console.log('Capturing 03-qualification-card.png...');
    const qualTab = await page.$('#tab-qualifications');
    if (qualTab) {
      await qualTab.click();
      await sleep(1200);
    }
    await takeScreenshot('03-qualification-card.png');

    // -------------------------------------------------------------------------
    // 4. 04-compliance-register.png — Regulatory Compliance Register
    // -------------------------------------------------------------------------
    console.log('Capturing 04-compliance-register.png...');
    await page.goto('http://localhost:3000/live/compliance', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('04-compliance-register.png');

    // -------------------------------------------------------------------------
    // 5. 05-permit-detail.png — Physical Verification Modal / Detail
    // -------------------------------------------------------------------------
    console.log('Capturing 05-permit-detail.png...');
    const altVerifyBtn = await page.$('#btn-alt-verify-obl-001');
    if (altVerifyBtn) {
      await altVerifyBtn.click();
      await sleep(1000);
    }
    await takeScreenshot('05-permit-detail.png');

    // -------------------------------------------------------------------------
    // 6. 06-offline-queue.png — Mobile Offline Queue & Bounded Rules
    // -------------------------------------------------------------------------
    console.log('Capturing 06-offline-queue.png...');
    await page.goto('http://localhost:3000/field', { waitUntil: 'networkidle0' });
    await sleep(1000);
    const queueTab = await page.$('#mobile-tab-queue');
    if (queueTab) {
      await queueTab.click();
      await sleep(1200);
    }
    await takeScreenshot('06-offline-queue.png');

    // -------------------------------------------------------------------------
    // 7. 07-run-sheet.png — Live Master Run Sheet
    // -------------------------------------------------------------------------
    console.log('Capturing 07-run-sheet.png...');
    await page.goto('http://localhost:3000/live/run-sheet', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('07-run-sheet.png');

    // -------------------------------------------------------------------------
    // 8. 08-command-centre.png — Unified 8-Panel Live Operations Command Centre
    // -------------------------------------------------------------------------
    console.log('Capturing 08-command-centre.png...');
    await page.goto('http://localhost:3000/live/command-center', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('08-command-centre.png');

    // -------------------------------------------------------------------------
    // 9. 09-incident-detail.png — Incident Management Card / Modal
    // -------------------------------------------------------------------------
    console.log('Capturing 09-incident-detail.png...');
    const reportIncidentBtn = await page.$('#btn-report-incident-top');
    if (reportIncidentBtn) {
      await reportIncidentBtn.click();
      await sleep(1000);
    }
    await takeScreenshot('09-incident-detail.png');

    // -------------------------------------------------------------------------
    // 10. 10-protective-action.png — Immediate Protective Safety Action Modal
    // -------------------------------------------------------------------------
    console.log('Capturing 10-protective-action.png...');
    await page.goto('http://localhost:3000/live/command-center', { waitUntil: 'networkidle0' });
    await sleep(1200);
    const protActionBtn = await page.$('#btn-protective-action-inc1');
    if (protActionBtn) {
      await protActionBtn.click();
      await sleep(1000);
    }
    await takeScreenshot('10-protective-action.png');

    // -------------------------------------------------------------------------
    // 11. 11-client-request.png — Live Client Requests & Variations
    // -------------------------------------------------------------------------
    console.log('Capturing 11-client-request.png...');
    await page.goto('http://localhost:3000/live/command-center', { waitUntil: 'networkidle0' });
    await sleep(1200);
    await page.evaluate(() => {
      window.scrollBy(0, 480);
    });
    await sleep(1000);
    await takeScreenshot('11-client-request.png');

    // -------------------------------------------------------------------------
    // 12. 12-shift-handover.png — Shift Handover Briefing Log
    // -------------------------------------------------------------------------
    console.log('Capturing 12-shift-handover.png...');
    await page.evaluate(() => {
      window.scrollBy(0, 200);
    });
    await sleep(1000);
    await takeScreenshot('12-shift-handover.png');

    // -------------------------------------------------------------------------
    // 13. 13-zone-readiness.png — Zone-by-Zone Operational Readiness
    // -------------------------------------------------------------------------
    console.log('Capturing 13-zone-readiness.png...');
    await page.evaluate(() => {
      window.scrollTo(0, 260);
    });
    await sleep(1000);
    await takeScreenshot('13-zone-readiness.png');

    // -------------------------------------------------------------------------
    // 14. 14-opening-release.png — Governed Show Opening Authorization Release Gate
    // -------------------------------------------------------------------------
    console.log('Capturing 14-opening-release.png...');
    await page.goto('http://localhost:3000/projects/f1111111-1111-4111-8111-111111111111?tab=readiness', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.evaluate(() => {
      const el = document.getElementById('governed-opening-authorization-card');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await sleep(1000);
    await takeScreenshot('14-opening-release.png');

    // -------------------------------------------------------------------------
    // 15. 15-bump-out-dashboard.png — Bump-Out Execution Tracker
    // -------------------------------------------------------------------------
    console.log('Capturing 15-bump-out-dashboard.png...');
    await page.goto('http://localhost:3000/closeout', { waitUntil: 'networkidle0' });
    await sleep(1500);
    const bumpoutTab = await page.$('#tab-bumpout');
    if (bumpoutTab) await bumpoutTab.click();
    await sleep(1000);
    await takeScreenshot('15-bump-out-dashboard.png');

    // -------------------------------------------------------------------------
    // 16. 16-return-inspection.png — Asset Return Condition Assessment Form
    // -------------------------------------------------------------------------
    console.log('Capturing 16-return-inspection.png...');
    const returnsTab = await page.$('#tab-returns');
    if (returnsTab) {
      await returnsTab.click();
      await sleep(1000);
      const inspectBtn = await page.$('#btn-inspect-return');
      if (inspectBtn) {
        await inspectBtn.click();
        await sleep(1000);
      }
    }
    await takeScreenshot('16-return-inspection.png');

    // -------------------------------------------------------------------------
    // 17. 17-venue-handover.png — Venue Reinstatement & Handover Sign-Off
    // -------------------------------------------------------------------------
    console.log('Capturing 17-venue-handover.png...');
    await page.goto('http://localhost:3000/closeout', { waitUntil: 'networkidle0' });
    await sleep(1200);
    const venueTab = await page.$('#tab-venue');
    if (venueTab) {
      await venueTab.click();
      await sleep(1000);
    }
    await takeScreenshot('17-venue-handover.png');

    // -------------------------------------------------------------------------
    // 18. 18-operational-closure.png — 7-Pillar Operational Closure Gate
    // -------------------------------------------------------------------------
    console.log('Capturing 18-operational-closure.png...');
    const closureTab = await page.$('#tab-closure');
    if (closureTab) {
      await closureTab.click();
      await sleep(1000);
    }
    await takeScreenshot('18-operational-closure.png');

    console.log('All 18 screenshots captured successfully!');
    await browser.close();
  } finally {
    console.log('Shutting down temporary web server...');
    webServer.kill();
  }
}

capture().catch((err) => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
