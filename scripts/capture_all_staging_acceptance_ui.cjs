const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BROWSER_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const LOCAL_EVIDENCE_DIR = path.resolve(__dirname, '..', 'docs', 'evidence', 'ui');
const BRAIN_EVIDENCE_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\737a3051-33c9-4fd2-b34b-b0982c5ab3fc\\evidence_ui';

[LOCAL_EVIDENCE_DIR, BRAIN_EVIDENCE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveScreenshot(page, filename) {
  const localPath = path.join(LOCAL_EVIDENCE_DIR, filename);
  const brainPath = path.join(BRAIN_EVIDENCE_DIR, filename);
  await page.screenshot({ path: localPath, fullPage: false });
  fs.copyFileSync(localPath, brainPath);
  console.log(`[Captured] ${filename} -> saved to both docs/evidence/ui and brain artifacts.`);
}

async function runCapture() {
  console.log('Launching browser for comprehensive staging acceptance visual QA...');
  console.log(`Browser: ${BROWSER_PATH}`);

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[Browser Console Error]:', msg.text());
    });

    const setupSession = async (theme = 'dark', lang = 'en') => {
      await page.evaluateOnNewDocument((t, l) => {
        localStorage.setItem('eos_user_email', 'director@e3.qa');
        localStorage.setItem('eos_theme', t);
        localStorage.setItem('eos_lang', l);
        localStorage.setItem('e3_eos_lang', l);
      }, theme, lang);
    };

    // -------------------------------------------------------------------------
    // 1. PROJECT COCKPIT (PROJ-ACC-001)
    // -------------------------------------------------------------------------
    console.log('\n--- Capturing Project Cockpit ---');
    await setupSession('dark', 'en');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/projects/PROJ-ACC-001?tab=overview&theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await saveScreenshot(page, '01_cockpit_desktop_dark_en.png');

    // Desktop Light EN
    await page.goto('http://localhost:3000/projects/PROJ-ACC-001?tab=overview&theme=light&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await saveScreenshot(page, '02_cockpit_desktop_light_en.png');

    // Mobile Dark EN (390px)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3000/projects/PROJ-ACC-001?tab=overview&theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await saveScreenshot(page, '03_cockpit_mobile_dark_en.png');

    // Mobile Light AR RTL (390px)
    await page.goto('http://localhost:3000/projects/PROJ-ACC-001?tab=overview&theme=light&lang=ar', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await saveScreenshot(page, '04_cockpit_mobile_light_ar.png');

    // -------------------------------------------------------------------------
    // 2. RESOURCE PLANNER (PROJ-ACC-001 & PROJ-ACC-002)
    // -------------------------------------------------------------------------
    console.log('\n--- Capturing Resource Planner ---');
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
    await page.goto('http://localhost:3000/portfolio/resource-planner?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);

    // Ensure PROJ-ACC-001 is selected
    await page.evaluate(() => {
      const select = document.getElementById('planner-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1500);

    // Switch to Demand & Grouping tab to view 20-counter demand and allocations
    console.log('Switching to Resource Demand & Grouping tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const demandBtn = btns.find((b) => b.textContent && b.textContent.includes('Resource Demand & Grouping'));
      if (demandBtn) demandBtn.click();
    });
    await sleep(1500);
    await saveScreenshot(page, '05_planner_desktop_dark_en_initial_20units.png');

    // Revise demand: 20 -> 22 counters in the Scope Revision card
    console.log('Exercising Scope Revision (20 -> 22 counters)...');
    await page.focus('#input-total-demand');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('22');
    await sleep(500);
    await page.click('#btn-save-demand-revision');
    await sleep(2500); // Allow HTTP POST /api/v1/projects/PROJ-ACC-001/resource-demand to complete
    await saveScreenshot(page, '06_planner_desktop_dark_en_revised_22units.png');

    // Switch to Multi-Sourcing Modeler tab in Light theme (shows 8/8/4 split and Needs Review alert banner)
    console.log('Switching to Sourcing tab in Light theme...');
    await page.goto('http://localhost:3000/portfolio/resource-planner?theme=light&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('planner-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1500);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sourcingBtn = btns.find((b) => b.textContent && (b.textContent.includes('Multi-Sourcing Modeler') || b.textContent.includes('Sourcing')));
      if (sourcingBtn) sourcingBtn.click();
    });
    await sleep(1500);
    await saveScreenshot(page, '07_planner_desktop_light_en_sourcing.png');

    // Mobile Dark EN (390px)
    console.log('Capturing Resource Planner on Mobile (Dark EN)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3000/portfolio/resource-planner?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('planner-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const demandBtn = btns.find((b) => b.textContent && b.textContent.includes('Demand'));
      if (demandBtn) demandBtn.click();
    });
    await sleep(1500);
    await saveScreenshot(page, '08_planner_mobile_dark_en.png');

    // Mobile Light AR RTL (390px)
    console.log('Capturing Resource Planner on Mobile (Light AR RTL)...');
    await page.goto('http://localhost:3000/portfolio/resource-planner?theme=light&lang=ar', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('planner-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const demandBtn = btns.find((b) => b.textContent && b.textContent.includes('متطلبات الموارد'));
      if (demandBtn) demandBtn.click();
    });
    await sleep(1500);
    await saveScreenshot(page, '09_planner_mobile_light_ar.png');

    // Acceptance B Isolation (PROJ-ACC-002: 6 counters isolated)
    console.log('Verifying Project Separation: switching to PROJ-ACC-002 (Acceptance B)...');
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
    await page.goto('http://localhost:3000/portfolio/resource-planner?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('planner-project-select');
      if (select) {
        select.value = 'PROJ-ACC-002';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const demandBtn = btns.find((b) => b.textContent && b.textContent.includes('Resource Demand & Grouping'));
      if (demandBtn) demandBtn.click();
    });
    await sleep(2000);
    await saveScreenshot(page, '10_planner_desktop_dark_proj_b_isolation.png');

    // -------------------------------------------------------------------------
    // 3. POST-EVENT DOSSIER
    // -------------------------------------------------------------------------
    console.log('\n--- Capturing Post-Event Dossier ---');
    await page.goto('http://localhost:3000/reports/post-event?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    // Select Acceptance A
    await page.evaluate(() => {
      const select = document.getElementById('dossier-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1500);
    await saveScreenshot(page, '11_dossier_desktop_dark_en.png');

    // Desktop Light EN
    await page.goto('http://localhost:3000/reports/post-event?theme=light&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('dossier-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1000);
    await saveScreenshot(page, '12_dossier_desktop_light_en.png');

    // Mobile Dark EN (390px)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3000/reports/post-event?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('dossier-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1000);
    await saveScreenshot(page, '13_dossier_mobile_dark_en.png');

    // Acceptance B Dossier (PROJ-ACC-002)
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
    await page.goto('http://localhost:3000/reports/post-event?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('dossier-project-select');
      if (select) {
        select.value = 'PROJ-ACC-002';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1500);
    await saveScreenshot(page, '14_dossier_desktop_dark_proj_b.png');

    // -------------------------------------------------------------------------
    // 4. LIVE COMMAND CENTRE
    // -------------------------------------------------------------------------
    console.log('\n--- Capturing Live Command Centre ---');
    await page.goto('http://localhost:3000/live?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('command-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1500);
    await saveScreenshot(page, '15_live_command_desktop_dark_en.png');

    // Desktop Light EN
    await page.goto('http://localhost:3000/live?theme=light&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('command-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1000);
    await saveScreenshot(page, '16_live_command_desktop_light_en.png');

    // Mobile Dark EN (390px)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3000/live?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('command-project-select');
      if (select) {
        select.value = 'PROJ-ACC-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1000);
    await saveScreenshot(page, '17_live_command_mobile_dark_en.png');

    // Acceptance B Live Command Centre (PROJ-ACC-002)
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
    await page.goto('http://localhost:3000/live?theme=dark&lang=en', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
    await sleep(1500);
    await page.evaluate(() => {
      const select = document.getElementById('command-project-select');
      if (select) {
        select.value = 'PROJ-ACC-002';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1500);
    await saveScreenshot(page, '18_live_command_desktop_dark_proj_b.png');

    console.log('\n>>> Visual QA Screenshot Capture Successfully Completed! All 18 screenshots recorded. <<<');
  } finally {
    await browser.close();
  }
}

runCapture().catch((err) => {
  console.error('[Error during visual capture]:', err);
  process.exit(1);
});
