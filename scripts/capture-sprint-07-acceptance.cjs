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

async function selectTab(page, tabLabel) {
  await page.evaluate((label) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes(label));
    if (btn) btn.click();
  }, tabLabel);
  await sleep(600);
}

async function capture() {
  console.log('Starting web server for Sprint 07 screenshot capture on port 3000...');
  const webServer = spawn('node', ['apps/web/server.cjs'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: '3000' },
    stdio: 'ignore',
  });

  try {
    await waitForServer('http://localhost:3000/health');
    console.log('Web server is ready on port 3000.');

    console.log(`Launching browser from ${CHROME_PATH}...`);
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1100'],
      defaultViewport: { width: 1600, height: 1100 },
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:3000/admin/rollout', { waitUntil: 'networkidle0' });
    await sleep(1000);

    const shots = [
      {
        name: '01-release-readiness.png',
        label: '1. Release Readiness',
        action: async () => {},
      },
      {
        name: '02-feature-flag-register.png',
        label: '2. Feature Flags',
        action: async () => {},
      },
      {
        name: '03-migration-reconciliation.png',
        label: '3. Migration Reconciliation',
        action: async () => {},
      },
      {
        name: '04-production-health.png',
        label: '4. Production Health',
        action: async () => {},
      },
      {
        name: '05-alert-dashboard.png',
        label: '5. Alert Dashboard',
        action: async () => {},
      },
      {
        name: '06-backup-status.png',
        label: '6. Backup Status',
        action: async () => {},
      },
      {
        name: '07-restore-drill.png',
        label: '7. Restore Drill',
        action: async () => {
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const runBtn = btns.find((b) => b.textContent && b.textContent.includes('Execute Live Restore Drill'));
            if (runBtn) runBtn.click();
          });
          await sleep(1500);
        },
      },
      {
        name: '08-security-findings.png',
        label: '8. Security Audit',
        action: async () => {},
      },
      {
        name: '09-uat-progress.png',
        label: '9. UAT Progress',
        action: async () => {},
      },
      {
        name: '10-training-adoption.png',
        label: '10. Training & Adoption',
        action: async () => {},
      },
      {
        name: '11-support-health.png',
        label: '11. Support Runbooks',
        action: async () => {
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const drillBtn = btns.find((b) => b.textContent && b.textContent.includes('Execute Live Drill'));
            if (drillBtn) drillBtn.click();
          });
          await sleep(1000);
        },
      },
      {
        name: '12-exception-register.png',
        label: '12. Exception Register',
        action: async () => {},
      },
      {
        name: '13-cutover-checklist.png',
        label: '13. Cutover Checklist',
        action: async () => {},
      },
      {
        name: '14-go-no-go-board.png',
        label: '14. Go / No-Go Board',
        action: async () => {},
      },
      {
        name: '15-production-sign-off.png',
        label: '15. Production Sign-Off',
        action: async () => {
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const signBtn = btns.find((b) => b.textContent && b.textContent.includes('Authorize Production Go-Live'));
            if (signBtn) signBtn.click();
          });
          await sleep(1200);
        },
      },
    ];

    for (const shot of shots) {
      console.log(`Capturing ${shot.name} (Tab: ${shot.label})...`);
      await selectTab(page, shot.label);
      if (shot.action) {
        await shot.action();
      }
      const outPath = path.join(OUTPUT_DIR, shot.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved: ${outPath}`);
    }

    await browser.close();
    console.log('Successfully captured all 15 Sprint 07 production rollout screenshots!');
  } finally {
    webServer.kill();
  }
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
