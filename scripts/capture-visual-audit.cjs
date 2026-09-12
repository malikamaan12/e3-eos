const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode=')) || '--mode=before';
const mode = modeArg.split('=')[1] || 'before';

const TARGET_HOST = process.env.EOS_TARGET_URL || 'https://e3-eos-web-staging-4m6nzwqkuq-ww.a.run.app';

const PROJECT_OUT_DIR = path.resolve('b:\\PROJECTS\\EOS', 'artifacts', 'ui-audit', mode);
const AGENT_OUT_DIR = path.resolve('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c7a021cc-a6b6-4cff-9128-1946fe5cad64', 'artifacts', 'ui-audit', mode);

fs.mkdirSync(PROJECT_OUT_DIR, { recursive: true });
fs.mkdirSync(AGENT_OUT_DIR, { recursive: true });

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ROUTES = [
  { id: '01-login', path: '/login', title: 'Login' },
  { id: '02-forgot-password', path: '/forgot-password', title: 'Forgot Password' },
  { id: '03-home', path: '/', title: 'Home Dashboard' },
  { id: '04-my-work', path: '/my-work', title: 'My Work Queue' },
  { id: '05-projects-list', path: '/projects', title: 'Projects Directory' },
  { id: '06-project-cockpit', path: '/projects/f1111111-1111-4111-8111-111111111111', title: 'Project Cockpit' },
  { id: '07-vendors', path: '/vendors', title: 'Vendors Directory' },
  { id: '08-warehouse', path: '/warehouse', title: 'Warehouse Hub' },
  { id: '09-financial-control', path: '/commercial/financial-control', title: 'Financial Control Center' },
  { id: '10-supplier-invoices', path: '/commercial/supplier-invoices', title: 'Supplier Invoices (3-Way Match)' },
  { id: '11-client-billing', path: '/commercial/client-billing', title: 'Client Billing & Collections' },
  { id: '12-commercial-closeout', path: '/commercial/closeout', title: 'Commercial Closeout (10 Pillars)' },
  { id: '13-field-ops', path: '/field', title: 'Field Ops Mobile' },
  { id: '14-command-centre', path: '/live/command-center', title: 'Live Command Centre' },
  { id: '15-run-sheet', path: '/live/run-sheet', title: 'Live Run Sheet' },
  { id: '16-compliance', path: '/live/compliance', title: 'Compliance Register' },
  { id: '17-live-roster', path: '/live/roster', title: 'Live Roster Attendance' },
  { id: '18-client-portal', path: '/client', title: 'Client Collaboration Portal' },
  { id: '19-client-results', path: '/client/results', title: 'Client Results Room' },
  { id: '20-post-event-report', path: '/reports/post-event', title: 'Post-Event Closeout Report' },
  { id: '21-workflow-builder', path: '/governance/workflows', title: 'Workflow Builder' },
  { id: '22-policy-simulator', path: '/governance/simulator', title: 'Policy Simulator' },
  { id: '23-country-packs', path: '/compliance/country-packs', title: 'Country Packs (QA / SA / AE)' },
  { id: '24-admin-users', path: '/admin/users', title: 'Admin Users & RBAC' },
  { id: '25-rollout-console', path: '/admin/rollout', title: 'Production Rollout Console' },
  { id: '26-human-uat', path: '/admin/release/human-uat', title: 'Human UAT Control Centre' },
  { id: '27-uat-defects', path: '/admin/release/uat-defects', title: 'UAT Defect Triage Board' },
  { id: '28-go-live-board', path: '/admin/release/go-live', title: 'Go / No-Go Decision Board' },
];

async function captureAll() {
  console.log(`[Visual Audit] Starting capture in mode: ${mode.toUpperCase()}`);
  console.log(`[Visual Audit] Target host: ${TARGET_HOST}`);
  console.log(`[Visual Audit] Saving to: ${PROJECT_OUT_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080'],
  });

  let totalCaptures = 0;

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(20000);

    // Initial visit to set up session
    await page.goto(TARGET_HOST, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      localStorage.setItem('eos_user_email', 'nasser.alkuwari@e3.qa');
      localStorage.setItem('eos_role', 'executive');
    });

    // 1. Primary Desktop 1440x900 EN for ALL routes
    console.log('\n--- Capturing Primary Desktop 1440x900 (EN) ---');
    await page.setViewport({ width: 1440, height: 900 });
    for (const r of ROUTES) {
      try {
        const url = `${TARGET_HOST}${r.path}?lang=en`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
        await new Promise(res => setTimeout(res, 250));
        const filename = `${r.id}_desktop-1440_en.png`;
        const p1 = path.join(PROJECT_OUT_DIR, filename);
        const p2 = path.join(AGENT_OUT_DIR, filename);
        await page.screenshot({ path: p1, fullPage: false });
        fs.copyFileSync(p1, p2);
        console.log(`  ✓ [EN] ${r.id} (${r.title})`);
        totalCaptures++;
      } catch (err) {
        console.error(`  ✗ Failed ${r.id}: ${err.message}`);
      }
    }

    // 2. Primary Desktop 1440x900 AR (RTL) for ALL routes
    console.log('\n--- Capturing Primary Desktop 1440x900 (AR / RTL) ---');
    for (const r of ROUTES) {
      try {
        const url = `${TARGET_HOST}${r.path}?lang=ar`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
        await new Promise(res => setTimeout(res, 250));
        const filename = `${r.id}_desktop-1440_ar.png`;
        const p1 = path.join(PROJECT_OUT_DIR, filename);
        const p2 = path.join(AGENT_OUT_DIR, filename);
        await page.screenshot({ path: p1, fullPage: false });
        fs.copyFileSync(p1, p2);
        console.log(`  ✓ [AR] ${r.id} (${r.title})`);
        totalCaptures++;
      } catch (err) {
        console.error(`  ✗ Failed [AR] ${r.id}: ${err.message}`);
      }
    }

    // 3. Mobile 390x844 EN & AR for key mobile routes
    const mobileRoutes = [
      '01-login',
      '03-home',
      '04-my-work',
      '05-projects-list',
      '06-project-cockpit',
      '08-warehouse',
      '09-financial-control',
      '13-field-ops',
      '14-command-centre',
      '15-run-sheet',
      '18-client-portal',
      '26-human-uat',
      '27-uat-defects',
    ];
    console.log('\n--- Capturing Mobile 390x844 (EN & AR) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    for (const rid of mobileRoutes) {
      const r = ROUTES.find(x => x.id === rid);
      if (!r) continue;
      // EN
      try {
        await page.goto(`${TARGET_HOST}${r.path}?lang=en`, { waitUntil: 'networkidle2', timeout: 25000 });
        await new Promise(res => setTimeout(res, 250));
        const fEn = `${r.id}_mobile-390_en.png`;
        const p1En = path.join(PROJECT_OUT_DIR, fEn);
        const p2En = path.join(AGENT_OUT_DIR, fEn);
        await page.screenshot({ path: p1En, fullPage: false });
        fs.copyFileSync(p1En, p2En);
        console.log(`  ✓ [Mobile EN] ${r.id}`);
        totalCaptures++;
      } catch (e) {
        console.error(`  ✗ Failed Mobile EN ${r.id}: ${e.message}`);
      }
      // AR
      try {
        await page.goto(`${TARGET_HOST}${r.path}?lang=ar`, { waitUntil: 'networkidle2', timeout: 25000 });
        await new Promise(res => setTimeout(res, 250));
        const fAr = `${r.id}_mobile-390_ar.png`;
        const p1Ar = path.join(PROJECT_OUT_DIR, fAr);
        const p2Ar = path.join(AGENT_OUT_DIR, fAr);
        await page.screenshot({ path: p1Ar, fullPage: false });
        fs.copyFileSync(p1Ar, p2Ar);
        console.log(`  ✓ [Mobile AR] ${r.id}`);
        totalCaptures++;
      } catch (e) {
        console.error(`  ✗ Failed Mobile AR ${r.id}: ${e.message}`);
      }
    }

    // 4. Tablet 1024x768 & Laptop 1366x768 & Desktop 1920x1080 for core views
    const tabletRoutes = ['03-home', '06-project-cockpit', '09-financial-control', '14-command-centre', '26-human-uat'];
    console.log('\n--- Capturing Tablet 1024x768, Laptop 1366x768, Desktop 1920x1080 ---');
    for (const rid of tabletRoutes) {
      const r = ROUTES.find(x => x.id === rid);
      if (!r) continue;
      // Tablet 1024
      await page.setViewport({ width: 1024, height: 768 });
      await page.goto(`${TARGET_HOST}${r.path}?lang=en`, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(res => setTimeout(res, 200));
      const fTab = `${r.id}_tablet-1024_en.png`;
      await page.screenshot({ path: path.join(PROJECT_OUT_DIR, fTab), fullPage: false });
      fs.copyFileSync(path.join(PROJECT_OUT_DIR, fTab), path.join(AGENT_OUT_DIR, fTab));

      // Laptop 1366
      await page.setViewport({ width: 1366, height: 768 });
      await page.goto(`${TARGET_HOST}${r.path}?lang=en`, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(res => setTimeout(res, 200));
      const fLap = `${r.id}_laptop-1366_en.png`;
      await page.screenshot({ path: path.join(PROJECT_OUT_DIR, fLap), fullPage: false });
      fs.copyFileSync(path.join(PROJECT_OUT_DIR, fLap), path.join(AGENT_OUT_DIR, fLap));

      // 1920 Desktop
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(`${TARGET_HOST}${r.path}?lang=en`, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(res => setTimeout(res, 200));
      const f1920 = `${r.id}_desktop-1920_en.png`;
      await page.screenshot({ path: path.join(PROJECT_OUT_DIR, f1920), fullPage: false });
      fs.copyFileSync(path.join(PROJECT_OUT_DIR, f1920), path.join(AGENT_OUT_DIR, f1920));

      totalCaptures += 3;
    }

  } finally {
    await browser.close();
  }

  console.log(`\n========================================`);
  console.log(`Visual Audit Capture [${mode.toUpperCase()}] Complete!`);
  console.log(`Total Screenshots Captured: ${totalCaptures}`);
  console.log(`Directory: ${PROJECT_OUT_DIR}`);
  console.log(`========================================\n`);
}

captureAll().catch(err => {
  console.error('[Visual Audit Fatal Error]:', err);
  process.exit(1);
});
