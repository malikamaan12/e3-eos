const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d853dbc9-9538-468c-8831-be7f247c25eb';
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

async function captureModals() {
  const webServer = spawn('node', ['apps/web/server.cjs'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: '3000' },
    stdio: 'ignore'
  });

  try {
    await waitForServer('http://localhost:3000/health');
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,920'],
      defaultViewport: { width: 1440, height: 920 }
    });

    const page = await browser.newPage();
    const projectId = 'f1111111-1111-4111-8111-111111111111';

    // 1. RFI Modal with 5-Way Link Pickers
    const clarUrl = `http://localhost:3000/projects/${projectId}?tab=clarifications`;
    await page.goto(clarUrl, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.waitForSelector('#tab-cockpit-clarifications', { timeout: 15000 });
    await page.click('#tab-cockpit-clarifications');
    await new Promise((r) => setTimeout(r, 1000));
    await page.waitForSelector('#btn-new-clarification', { timeout: 5000 });
    await page.click('#btn-new-clarification');
    await new Promise((r) => setTimeout(r, 800));
    const rfiModalPath = path.join(OUTPUT_DIR, 'demo_27_rfi_modal_link_pickers.png');
    await page.screenshot({ path: rfiModalPath, fullPage: false });
    console.log(`✓ Saved screenshot: ${rfiModalPath}`);

    // 2. POL-DES-01 Production Release Gate Modal
    const desUrl = `http://localhost:3000/projects/${projectId}?tab=design`;
    await page.goto(desUrl, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.waitForSelector('#tab-cockpit-design', { timeout: 15000 });
    await page.click('#tab-cockpit-design');
    await new Promise((r) => setTimeout(r, 1000));
    // Find button containing "Production Release Gate (POL-DES-01)"
    const btns = await page.$$('button');
    for (const b of btns) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.includes('Production Release Gate')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 800));
    const gateModalPath = path.join(OUTPUT_DIR, 'demo_28_pol_des_01_gate_modal.png');
    await page.screenshot({ path: gateModalPath, fullPage: false });
    console.log(`✓ Saved screenshot: ${gateModalPath}`);

    await browser.close();
    console.log(`Modal screenshots captured successfully.`);
  } finally {
    webServer.kill('SIGTERM');
  }
}

captureModals().catch((err) => {
  console.error(`Modal capture failed:`, err);
  process.exit(1);
});
