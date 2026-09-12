const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const STAGING_URL = process.env.EOS_TARGET_URL || 'https://e3-eos-web-staging-4m6nzwqkuq-ww.a.run.app';
const ARTIFACTS_DIR = path.resolve('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c7a021cc-a6b6-4cff-9128-1946fe5cad64', 'artifacts', 'live-staging-audit');
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  console.log('Starting live Cloud Run verification against: ' + STAGING_URL);
  console.log('Using browser: ' + CHROME_PATH);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
    defaultViewport: { width: 1600, height: 1000 }
  });

  const page = await browser.newPage();

  async function capture(urlPath, filename) {
    console.log('Navigating to: ' + STAGING_URL + urlPath);
    await page.goto(STAGING_URL + urlPath, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2000));
    const outPath = path.join(ARTIFACTS_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Captured: ' + filename);
    return outPath;
  }

  try {
    // 1. Critical: Financial Control Center
    await capture('/commercial/financial-control', '01-financial-control-remediated.png');

    // 2. Critical: Requirements Matrix
    await capture('/projects/f1111111-1111-4111-8111-111111111111?tab=requirements', '02-requirements-matrix-remediated.png');

    // 3. High: Project Cockpit Workstream Navigation Chevrons & Dropdown
    await capture('/projects/f1111111-1111-4111-8111-111111111111', '03-cockpit-chevrons-remediated.png');

    // 4. High: Workflow Builder Stages 1-13
    await capture('/governance/workflows', '04-workflow-builder-stages-remediated.png');

    // 5. High: Master Calendar
    await capture('/calendar', '05-master-calendar-view-remediated.png');

    // 6. Medium: Arabic RTL Financial Control Center
    await page.evaluate(() => {
      localStorage.setItem('e3_eos_lang', 'ar');
    });
    await capture('/commercial/financial-control', '06-arabic-rtl-financial-remediated.png');

    // 7. Medium: Live Command Centre KPI Cards
    await page.evaluate(() => {
      localStorage.setItem('e3_eos_lang', 'en');
    });
    await capture('/live/command-center', '07-command-center-kpis-remediated.png');

    // 8. Medium: My Work / Approvals Queue
    await capture('/approvals', '08-approvals-queue-remediated.png');

    // 9. Medium: Admin Users & RBAC
    await capture('/admin/users', '09-admin-users-roles-remediated.png');

    // 10. Low: New Project Wizard Pills
    await capture('/projects/new', '10-project-wizard-pills-remediated.png');

    // 11. Low: Home Dashboard
    await capture('/', '11-home-dashboard-instant-remediated.png');

    console.log('ALL_11_CAPTURES_SUCCESS');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
