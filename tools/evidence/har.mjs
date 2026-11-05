import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const OUT = 'E:/DSLKit-Project/labs/01-network/data';
const url = 'https://app.diagrams.net/';
for (const [name, throttle] of [['fast3g', true]]) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: false, args: ['--auto-open-devtools-for-tabs'] });
  const context = await browser.newContext({ recordHar: { path: `${OUT}/draw-io-${name}.har`, content: 'embed' }, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (throttle) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 });
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForLoadState('networkidle', { timeout: 180000 });
  await page.waitForTimeout(3000);
  console.log(name, await browser.version(), await page.title());
  await context.close();
  await browser.close();
}
