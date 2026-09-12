const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const STAGING_URL = process.env.EOS_TARGET_URL || 'https://e3-eos-web-staging-4m6nzwqkuq-ww.a.run.app';
const ARTIFACTS_DIR = path.resolve('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c7a021cc-a6b6-4cff-9128-1946fe5cad64', 'artifacts', 'live-staging-audit');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
    defaultViewport: { width: 1600, height: 1000 }
  });

  const page = await browser.newPage();
  await page.goto(STAGING_URL + '/commercial/financial-control', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#btn-toggle-language', { timeout: 10000 });
  
  // Click the Arabic language button
  await page.click('#btn-toggle-language');
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06-arabic-rtl-financial-remediated.png'), fullPage: false });
  console.log('Captured 06-arabic-rtl-financial-remediated.png with language toggle active');

  // Also capture requirements matrix in Arabic RTL
  await page.goto(STAGING_URL + '/projects/f1111111-1111-4111-8111-111111111111?tab=requirements', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06b-arabic-rtl-requirements-remediated.png'), fullPage: false });
  console.log('Captured 06b-arabic-rtl-requirements-remediated.png');

  await browser.close();
}

run();
