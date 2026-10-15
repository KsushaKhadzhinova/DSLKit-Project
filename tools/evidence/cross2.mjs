import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = 'E:/DSLKit-Project/docs/metrics/browsers';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173';
const targets = [
  ['firefox', { browser: 'firefox', executablePath: 'C:/Program Files/Mozilla Firefox/firefox.exe' }],
  ['edge', { browser: 'chrome', executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' }],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = {};

for (const [name, opts] of targets) {
  const rows = [];
  const check = (label, ok, detail = '') => rows.push({ label, ok: Boolean(ok), detail });
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, ...opts });
  } catch (error) {
    results[name] = { version: 'launch failed', rows: [{ label: 'launch', ok: false, detail: String(error).slice(0, 200) }] };
    continue;
  }
  const version = await browser.version();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/kroki|favicon|Failed to load resource/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  const $count = (sel) => page.$$eval(sel, (els) => els.length);
  const go = async (path) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
  };

  await go('/');
  check('landing loads with one h1', (await $count('h1')) === 1);
  check('hero CTA visible', await page.$eval('.button--hero', (e) => e.getBoundingClientRect().width > 100));
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('.theme__button');
  await sleep(150);
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  check('theme toggle changes theme', before !== after, `${before} -> ${after}`);
  await page.reload({ waitUntil: 'networkidle0' });
  check('theme persists after reload', (await page.evaluate(() => document.documentElement.dataset.theme)) === after);
  const chips = await page.$$('.filter__chip');
  await chips[1].click();
  await sleep(100);
  check('filter shows 3 beta cards', (await $count('#notations-list > li:not([hidden])')) === 3);
  await chips[0].click();
  await sleep(100);
  check('filter all shows 6 cards', (await $count('#notations-list > li:not([hidden])')) === 6);
  const summaries = await page.$$('.faq__item summary');
  await summaries[0].click();
  await sleep(100);
  await summaries[1].click();
  await sleep(150);
  const open = await page.$$eval('.faq__item', (els) => els.map((e) => e.open));
  check('FAQ keeps one answer open', open.filter(Boolean).length === 1, JSON.stringify(open));
  await page.click('#waitlist-form button[type=submit]');
  await sleep(150);
  check('empty form shows 4 errors', (await $count('.form__error:not([hidden])')) === 4);
  await page.type('#name', 'Ксения');
  await page.type('#email', 'k@example.com');
  await page.select('#notation', 'idef0');
  await page.type('#team', '3');
  await page.click('#consent');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('#waitlist-form button[type=submit]')]);
  check('thanks page opened', page.url().endsWith('thanks.html'), page.url());
  const saved = await page.evaluate(() => localStorage.getItem('dslkit.waitlist'));
  check('valid form saved to LocalStorage', saved && saved.includes('k@example.com'));
  await page.screenshot({ path: `${OUT}/${name}-thanks.png` });

  await go('/');
  await page.screenshot({ path: `${OUT}/${name}-landing-1280.png` });
  await page.setViewport({ width: 375, height: 800, isMobile: false });
  await page.reload({ waitUntil: 'networkidle0' });
  check('no horizontal scroll at 375 px', await page.evaluate(() => { window.scrollTo(300, 0); return window.scrollX === 0; }));
  await page.click('.burger__button');
  await sleep(150);
  check('burger opens the menu', await page.$eval('.burger__input', (e) => e.checked));
  await page.keyboard.press('Escape');
  await sleep(150);
  check('Escape closes the menu', !(await page.$eval('.burger__input', (e) => e.checked)));
  await page.screenshot({ path: `${OUT}/${name}-landing-375.png` });
  await page.setViewport({ width: 1280, height: 900 });

  await go('/app/dashboard.html');
  const dchips = await page.$$('.filter__chip');
  await dchips[1].click();
  await sleep(100);
  const dash = await $count('#project-list > li:not([hidden])');
  check('dashboard filter narrows the list', dash > 0 && dash < 8, String(dash));
  await dchips[0].click();
  await page.type('input.app-topbar__search-input', 'zzz');
  await sleep(150);
  check('dashboard search without match shows message', (await page.$eval('#project-count', (e) => e.textContent)).includes('не найдено'));

  await go('/app/settings.html');
  await page.click('label.theme-option__label[for="theme-dark"]').catch(async () => { await page.evaluate(() => document.querySelector('input[name=theme][value=dark]').click()); });
  await sleep(150);
  check('settings dark radio applies dark theme', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');

  await go('/app/editor.html');
  const tabs = await page.$$('.editor-tabs__list [role=tab]');
  await tabs[1].click();
  await sleep(100);
  check('editor tab switch', (await page.evaluate((e) => e.getAttribute('aria-selected'), tabs[1])) === 'true');
  await page.select('.canvas__engine', 'local');
  await page.waitForSelector('.canvas__remote .local-engine__box', { timeout: 10000 });
  check('own engine draws live SVG boxes', (await $count('.canvas__remote .local-engine__box')) === 2);
  await page.screenshot({ path: `${OUT}/${name}-editor-local-engine.png` });
  await page.click('.editor-tabs__close');
  await sleep(200);
  check('close dialog opens', await page.$eval('#close-tab-modal', (d) => d.open));

  check('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  results[name] = { version, rows };
  await browser.close();
}

for (const [name, { version, rows }] of Object.entries(results)) {
  console.log(`\n== ${name} ${version}: ${rows.filter((r) => r.ok).length}/${rows.length} passed`);
  for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.detail ? ' [' + r.detail + ']' : ''}`);
}
