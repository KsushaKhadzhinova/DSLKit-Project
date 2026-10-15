import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true, defaultViewport: { width: 1280, height: 900 } });
for (const n of ['before', 'after']) {
  const p = await b.newPage();
  await p.goto(`file:///E:/DSLKit-Project/labs/08-frontend-testing/lighthouse-${n}/report.html`, { waitUntil: 'load' });
  await sleep(2500);
  await p.screenshot({ path: `E:/DSLKit-Project/labs/08-frontend-testing/figures/lighthouse-${n}.jpg`, type: 'jpeg', quality: 85 });
  await p.close();
}
await b.close();
