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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,920'],
      defaultViewport: { width: 1440, height: 920 }
    });

    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
    });
    const projectId = 'f1111111-1111-4111-8111-111111111111';

    const tabs = [
      { name: 'demo_20_cockpit_overview.png', tab: 'overview', title: '1. Overview Tab' },
      { name: 'demo_21_cockpit_requirements.png', tab: 'requirements', title: '2. Requirements Matrix Tab' },
      { name: 'demo_22_cockpit_clarifications.png', tab: 'clarifications', title: '3. Clarifications / RFI Tab' },
      { name: 'demo_23_cockpit_documents.png', tab: 'documents', title: '4. Controlled Documents Tab' },
      { name: 'demo_24_cockpit_timeline.png', tab: 'timeline', title: '5. Master Timeline / CPM Gantt Tab' },
      { name: 'demo_25_cockpit_design.png', tab: 'design', title: '6. Design & Creative Tab' },
      { name: 'demo_26_cockpit_commercial.png', tab: 'commercial', title: '7. Commercial / BOQ Tab' },
    ];

    const initialUrl = `http://localhost:3000/projects/${projectId}?tab=overview`;
    console.log(`Navigating to Project Cockpit: ${initialUrl}`);
    await page.goto(initialUrl, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.waitForSelector('#cockpit-module-tabs', { timeout: 15000 });
    console.log(`Cockpit loaded. Capturing 7 module tabs...`);

    for (const t of tabs) {
      console.log(`Switching to ${t.title}...`);
      const tabBtnSelector = `#tab-cockpit-${t.tab}`;
      await page.waitForSelector(tabBtnSelector, { timeout: 5000 });
      await page.click(tabBtnSelector);
      await new Promise((r) => setTimeout(r, 1200)); // allow charts/SVG to settle
      const outPath = path.join(OUTPUT_DIR, t.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✓ Saved screenshot: ${outPath}`);
    }

    await browser.close();
    console.log(`All 7 cockpit module screenshots captured successfully.`);
  } finally {
    webServer.kill('SIGTERM');
  }
}

capture().catch((err) => {
  console.error(`Screenshot capture failed:`, err);
  process.exit(1);
});
