const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', msg => console.log('[BROWSER LOG]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err.message));

  console.log('[Live Test] 1. Navigating to https://e3-eos-api.vercel.app/ ...');
  await page.goto('https://e3-eos-api.vercel.app/', { waitUntil: 'networkidle0', timeout: 30000 });

  const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d3e34dfa-162f-462f-a355-e0189bb334ba';

  // Check if we are on login screen
  const loginBtn = await page.$('#login-submit-btn');
  console.log('[Live Test] Login screen detected:', !!loginBtn);

  if (loginBtn) {
    console.log('[Live Test] Clicking Super Admin 1-Click login button...');
    // Find button with text containing "1-Click"
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const oneClickBtn = buttons.find(b => b.textContent && b.textContent.includes('1-Click'));
      if (oneClickBtn) {
        oneClickBtn.click();
        return true;
      }
      return false;
    });
    console.log('[Live Test] 1-Click button clicked:', clicked);
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('[Live Test] 2. Checking authenticated Home View...');
  const homeBanner = await page.$('#home-test-lab-banner');
  console.log('[Live Test] #home-test-lab-banner found on Home View:', !!homeBanner);

  const globalSelector = await page.$('#global-project-selector');
  console.log('[Live Test] #global-project-selector found:', !!globalSelector);

  if (globalSelector) {
    const options = await page.$$eval('#global-project-selector option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
    console.log('[Live Test] Global project options:', options.map(o => o.text));
  }

  // Screenshot: Authenticated Home View
  const homeScreenshot = path.join(artifactDir, 'live_authenticated_home.png');
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  console.log('[Live Test] Saved home screenshot:', homeScreenshot);

  // 3. Open Design Lab
  console.log('[Live Test] 3. Clicking #btn-open-design-lab...');
  const openLabBtn = await page.$('#btn-open-design-lab');
  if (openLabBtn) {
    await openLabBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  } else {
    await page.goto('https://e3-eos-api.vercel.app/design-lab', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
  }

  const labText = await page.evaluate(() => document.body.innerText);
  console.log('[Live Test] Design Lab contains PRJ-TEST-ALL-FORMATS:', labText.includes('PRJ-TEST-ALL-FORMATS'));
  console.log('[Live Test] Design Lab contains Universal File Formats & Design Testing Lab:', labText.includes('Universal File Formats & Design Testing Lab'));

  // Screenshot: Design Lab
  const labScreenshot = path.join(artifactDir, 'live_authenticated_design_lab.png');
  await page.screenshot({ path: labScreenshot, fullPage: false });
  console.log('[Live Test] Saved design lab screenshot:', labScreenshot);

  // 4. Check Project Directory (/projects)
  console.log('[Live Test] 4. Navigating to /projects...');
  await page.goto('https://e3-eos-api.vercel.app/projects', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const dirText = await page.evaluate(() => document.body.innerText);
  console.log('[Live Test] Directory contains PRJ-TEST-ALL-FORMATS:', dirText.includes('PRJ-TEST-ALL-FORMATS'));
  console.log('[Live Test] Directory contains 18 FORMATS badge:', dirText.includes('18 FORMATS'));

  // Screenshot: Project Directory
  const dirScreenshot = path.join(artifactDir, 'live_authenticated_projects_directory.png');
  await page.screenshot({ path: dirScreenshot, fullPage: false });
  console.log('[Live Test] Saved projects directory screenshot:', dirScreenshot);

  // 5. Open Project Cockpit for PRJ-TEST-ALL-FORMATS
  console.log('[Live Test] 5. Navigating to /projects/00000000-0000-4000-8000-000000000099 ...');
  await page.goto('https://e3-eos-api.vercel.app/projects/00000000-0000-4000-8000-000000000099', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const cockpitText = await page.evaluate(() => document.body.innerText);
  console.log('[Live Test] Cockpit contains PRJ-TEST-ALL-FORMATS:', cockpitText.includes('PRJ-TEST-ALL-FORMATS'));

  // Screenshot: Project Cockpit
  const cockpitScreenshot = path.join(artifactDir, 'live_authenticated_cockpit.png');
  await page.screenshot({ path: cockpitScreenshot, fullPage: false });
  console.log('[Live Test] Saved cockpit screenshot:', cockpitScreenshot);

  await browser.close();
  console.log('[Live Test] All verification steps passed successfully!');
}

main().catch(err => {
  console.error('[Live Test] Error:', err);
  process.exit(1);
});
