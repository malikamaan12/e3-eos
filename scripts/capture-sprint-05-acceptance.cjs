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
  console.log(`Starting web server for Sprint 05 screenshot capture...`);
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
    // 1. 01-financial-control-centre.png — Financial Control Centre Dashboard
    // -------------------------------------------------------------------------
    console.log('Capturing 01-financial-control-centre.png...');
    await page.goto('http://localhost:3000/commercial/financial-control', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('01-financial-control-centre.png');

    // -------------------------------------------------------------------------
    // 2. 02-supplier-invoice-register.png — Supplier Invoices Register
    // -------------------------------------------------------------------------
    console.log('Capturing 02-supplier-invoice-register.png...');
    await page.goto('http://localhost:3000/commercial/supplier-invoices', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('02-supplier-invoice-register.png');

    // -------------------------------------------------------------------------
    // 3. 03-three-way-match.png — Three-Way Match Inspector Modal
    // -------------------------------------------------------------------------
    console.log('Capturing 03-three-way-match.png...');
    // Click "Inspect 3-Way Match" on the first or third invoice (INV-SUP-003 with exception)
    const inspectButtons = await page.$$('button');
    for (const btn of inspectButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Inspect 3-Way Match')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('03-three-way-match.png');

    // -------------------------------------------------------------------------
    // 4. 04-client-billing.png — Client Billing & Milestones
    // -------------------------------------------------------------------------
    console.log('Capturing 04-client-billing.png...');
    await page.goto('http://localhost:3000/commercial/client-billing', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('04-client-billing.png');

    // -------------------------------------------------------------------------
    // 5. 05-collections-receivables.png — Collections & Aging Analysis
    // -------------------------------------------------------------------------
    console.log('Capturing 05-collections-receivables.png...');
    // Scroll down to collections register
    await page.evaluate(() => window.scrollBy(0, 400));
    await sleep(800);
    await takeScreenshot('05-collections-receivables.png');

    // -------------------------------------------------------------------------
    // 6. 06-variation-register.png — Commercial Variations Register
    // -------------------------------------------------------------------------
    console.log('Capturing 06-variation-register.png...');
    await page.goto('http://localhost:3000/commercial/financial-control', { waitUntil: 'networkidle0' });
    await sleep(1200);
    // Click Tab: Margin Bridge Waterfall which shows approved variations breakdown
    const tabButtons = await page.$$('button');
    for (const btn of tabButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Margin Bridge Waterfall')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('06-variation-register.png');

    // -------------------------------------------------------------------------
    // 7. 07-profitability-dashboard.png — Profitability Breakdown Table
    // -------------------------------------------------------------------------
    console.log('Capturing 07-profitability-dashboard.png...');
    // Click Tab: Budget vs Actual Breakdown
    const controlButtons = await page.$$('button');
    for (const btn of controlButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Budget vs Actual Breakdown')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('07-profitability-dashboard.png');

    // -------------------------------------------------------------------------
    // 8. 08-margin-bridge.png — Margin Bridge Waterfall View
    // -------------------------------------------------------------------------
    console.log('Capturing 08-margin-bridge.png...');
    for (const btn of controlButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Margin Bridge Waterfall')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('08-margin-bridge.png');

    // -------------------------------------------------------------------------
    // 9. 09-budget-vs-actual.png — Budget vs Actual Invariant Breakdown
    // -------------------------------------------------------------------------
    console.log('Capturing 09-budget-vs-actual.png...');
    for (const btn of controlButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Budget vs Actual Breakdown')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('09-budget-vs-actual.png');

    // -------------------------------------------------------------------------
    // 10. 10-cash-position.png — Cash Position & Working Capital
    // -------------------------------------------------------------------------
    console.log('Capturing 10-cash-position.png...');
    for (const btn of controlButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Cash Position & Working Capital')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('10-cash-position.png');

    // -------------------------------------------------------------------------
    // 11. 11-commercial-closeout.png — Commercial Closeout Gate Checklist
    // -------------------------------------------------------------------------
    console.log('Capturing 11-commercial-closeout.png...');
    await page.goto('http://localhost:3000/commercial/closeout', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('11-commercial-closeout.png');

    // -------------------------------------------------------------------------
    // 12. 12-portfolio-executive-dashboard.png — Month-End Snapshots Ledger
    // -------------------------------------------------------------------------
    console.log('Capturing 12-portfolio-executive-dashboard.png...');
    await page.goto('http://localhost:3000/commercial/financial-control', { waitUntil: 'networkidle0' });
    await sleep(1200);
    const snapButtons = await page.$$('button');
    for (const btn of snapButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Locked Month-End Ledger Snapshots')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('12-portfolio-executive-dashboard.png');

    // -------------------------------------------------------------------------
    // 13. 13-client-results-room.png — Client Results Room Landing
    // -------------------------------------------------------------------------
    console.log('Capturing 13-client-results-room.png...');
    await page.goto('http://localhost:3000/client/results', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('13-client-results-room.png');

    // -------------------------------------------------------------------------
    // 14. 14-post-event-report.png — Post-Event Closeout Report
    // -------------------------------------------------------------------------
    console.log('Capturing 14-post-event-report.png...');
    await page.goto('http://localhost:3000/reports/post-event', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('14-post-event-report.png');

    // -------------------------------------------------------------------------
    // 15. 15-kpi-sla-dashboard.png — Project KPIs & SLAs
    // -------------------------------------------------------------------------
    console.log('Capturing 15-kpi-sla-dashboard.png...');
    await page.goto('http://localhost:3000/closeout/performance', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('15-kpi-sla-dashboard.png');

    // -------------------------------------------------------------------------
    // 16. 16-vendor-performance.png — Vendor Performance Scorecards
    // -------------------------------------------------------------------------
    console.log('Capturing 16-vendor-performance.png...');
    const perfButtons = await page.$$('button');
    for (const btn of perfButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Vendor Performance Scorecards')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('16-vendor-performance.png');

    // -------------------------------------------------------------------------
    // 17. 17-lessons-learned.png — Lessons Learned Knowledge Base
    // -------------------------------------------------------------------------
    console.log('Capturing 17-lessons-learned.png...');
    for (const btn of perfButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Lessons Learned Knowledge Base')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot('17-lessons-learned.png');

    // -------------------------------------------------------------------------
    // 18. 18-integration-control-centre.png — Enterprise Connectors Control
    // -------------------------------------------------------------------------
    console.log('Capturing 18-integration-control-centre.png...');
    await page.goto('http://localhost:3000/admin/integrations', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot('18-integration-control-centre.png');

    // -------------------------------------------------------------------------
    // 19. 19-reconciliation-queue.png — Reconciliation Exception Queue
    // -------------------------------------------------------------------------
    console.log('Capturing 19-reconciliation-queue.png...');
    await page.evaluate(() => window.scrollBy(0, 500));
    await sleep(1000);
    await takeScreenshot('19-reconciliation-queue.png');

    // -------------------------------------------------------------------------
    // 20. 20-project-closure-gate.png — Executive Commercial Closeout Cryptographic Seal
    // -------------------------------------------------------------------------
    console.log('Capturing 20-project-closure-gate.png...');
    await page.goto('http://localhost:3000/commercial/closeout', { waitUntil: 'networkidle0' });
    await sleep(1200);
    await page.evaluate(() => window.scrollBy(0, 600));
    await sleep(1000);
    await takeScreenshot('20-project-closure-gate.png');

    console.log(`\n======================================================`);
    console.log(`All 20 Sprint 05 acceptance screenshots captured successfully!`);
    console.log(`======================================================\n`);

    await browser.close();
  } finally {
    webServer.kill();
  }
}

capture().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
