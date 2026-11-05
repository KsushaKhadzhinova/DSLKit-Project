import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { staticServer } from '../../tools/server.js';

const ROOT = resolve(fileURLToPath(new URL('../../site', import.meta.url)));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(ROOT).filter((f) => !f.startsWith(join(ROOT, 'design')));
const rel = (f) => f.slice(ROOT.length).replaceAll('\\', '/');
const read = (f) => readFileSync(f, 'utf8');
const pages = files.filter((f) => f.endsWith('.html'));
const results = [];
const add = (id, kind, title, ok, note = '') =>
  results.push({ id, kind, title, status: ok ? 'Passed' : 'Failed', note: ok ? '' : String(Array.isArray(note) ? note.join('; ') : note).slice(0, 300) });

// ---------- Static testing: HTML, links, JS syntax, ru/en parity ----------
let i = 0;
const sid = () => `ST-${String(++i).padStart(2, '0')}`;
const pagesWithout = (re) => pages.filter((p) => !re.test(read(p))).map(rel);
const a1 = pagesWithout(/<title>[^<]+<\/title>/);
add(sid(), 'static', 'У каждой HTML-страницы есть непустой title', !a1.length, a1);
const a2 = pagesWithout(/<html[^>]*\slang="/);
add(sid(), 'static', 'У каждой страницы задан lang', !a2.length, a2);
const a3 = pagesWithout(/name="viewport"/);
add(sid(), 'static', 'У каждой страницы есть meta viewport', !a3.length, a3);
const a4 = pages.filter((p) => (read(p).match(/<h1[\s>]/g) ?? []).length !== 1).map(rel);
add(sid(), 'static', 'На каждой странице ровно один h1', !a4.length, a4);
const a5 = pages.flatMap((p) => (read(p).match(/<img\b(?![^>]*\balt=)[^>]*>/g) ?? []).map((m) => `${rel(p)}: ${m.slice(0, 60)}`));
add(sid(), 'static', 'У всех img есть атрибут alt', !a5.length, a5);
const a6 = pages.flatMap((p) => {
  const ids = [...read(p).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  return ids.filter((x, k) => ids.indexOf(x) !== k).map((x) => `${rel(p)}: #${x}`);
});
add(sid(), 'static', 'На страницах нет повторяющихся id', !a6.length, a6);
const a7 = pages
  .filter((p) => [...read(p).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].some((m) => !/\bsrc=/.test(m[1]) && !/ld\+json/.test(m[1]) && m[2].trim()))
  .map(rel);
add(sid(), 'static', 'Нет встроенных скриптов (кроме JSON-LD), как требует CSP', !a7.length, a7);

const broken = [];
for (const p of pages) {
  for (const m of read(p).matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(u)) continue;
    const target = u.startsWith('/') ? join(ROOT, u) : resolve(dirname(p), u);
    const t2 = existsSync(target) && statSync(target).isDirectory() ? join(target, 'index.html') : target;
    if (!existsSync(t2)) broken.push(`${rel(p)} -> ${u}`);
  }
}
add(sid(), 'static', 'Все локальные ссылки и ресурсы (href, src) существуют', !broken.length, broken.slice(0, 8));

const jsFiles = files.filter((f) => f.endsWith('.js'));
const bad = jsFiles.filter((f) => spawnSync(process.execPath, ['--check', f]).status !== 0).map(rel);
add(sid(), 'static', `Синтаксис всех JS-файлов корректен (${jsFiles.length} файлов, node --check)`, !bad.length, bad);

const missingEn = pages
  .filter((p) => !rel(p).startsWith('/en/') && !rel(p).startsWith('/errors/'))
  .filter((p) => !existsSync(join(ROOT, 'en', rel(p).replace(/^\//, ''))))
  .map(rel);
add(sid(), 'static', 'Для каждой русской страницы есть английская копия', !missingEn.length, missingEn);
const cyr = pages
  .filter((p) => rel(p).startsWith('/en/'))
  .filter((p) =>
    /[А-Яа-яЁё]{4,}/.test(
      read(p)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/<a[^>]*lang="ru"[^>]*>[\s\S]*?<\/a>/g, ''),
    ),
  )
  .map(rel);
add(sid(), 'static', 'В английских страницах нет русского текста (локализация)', !cyr.length, cyr);
const todo = files.filter((f) => ['.js', '.html', '.css'].includes(extname(f)) && /\b(TODO|FIXME|XXX)\b/.test(read(f))).map(rel);
add(sid(), 'static', 'В коде нет оставленных TODO и FIXME', !todo.length, todo);
const secrets = files
  .filter((f) => ['.js', '.html', '.json'].includes(extname(f)) && /(api[_-]?key|secret|password)\s*[:=]\s*['"][^'"]{8,}/i.test(read(f)))
  .map(rel);
add(sid(), 'static', 'В файлах сайта нет зашитых ключей и паролей', !secrets.length, secrets);

// ---------- Security and performance against a live server ----------
const server = staticServer(ROOT).listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://localhost:${server.address().port}`;
const raw = (path) => fetch(base + path, { redirect: 'manual' });
let j = 0;
const xid = () => `SE-${String(++j).padStart(2, '0')}`;

const h = (await raw('/')).headers;
for (const name of [
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
])
  add(xid(), 'security', `Заголовок ${name} отправляется`, !!h.get(name), 'нет заголовка');
const csp = h.get('content-security-policy') ?? '';
add(xid(), 'security', 'CSP разрешает скрипты только с сайта и запрещает object', /script-src 'self'/.test(csp) && /object-src 'none'/.test(csp), csp);
add(xid(), 'security', 'Сервер не раскрывает версию (нет X-Powered-By)', !h.get('x-powered-by'), h.get('x-powered-by'));
for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/js/../../package.json', '/%2e%2e%2f%2e%2e%2fREADME.md']) {
  const r = await raw(p);
  const t = await r.text();
  add(
    xid(),
    'security',
    `Выход за корень сайта закрыт: ${p}`,
    !(r.status === 200 && /"name":\s*"dslkit"|DSLKit/.test(t.slice(0, 800)) && !/<html/i.test(t.slice(0, 400))),
    `status ${r.status}`,
  );
}
for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) {
  const r = await fetch(base + '/', { method: m });
  add(xid(), 'security', `Метод ${m} отклоняется (405)`, r.status === 405, `status ${r.status}`);
}
const nul = await raw('/%00');
add(xid(), 'security', 'Нулевой байт в адресе даёт 4xx, сервер жив', nul.status >= 400 && nul.status < 500, `status ${nul.status}`);
const longUrl = await raw('/' + 'a'.repeat(8000));
add(xid(), 'security', 'Очень длинный адрес даёт 4xx, сервер жив', longUrl.status >= 400 && longUrl.status < 500, `status ${longUrl.status}`);
const hidden = await raw('/.git/config');
add(xid(), 'security', 'Служебные файлы (.git) недоступны', hidden.status === 404 || hidden.status === 403, `status ${hidden.status}`);

const san = files.find((f) => /sanitiz/i.test(f) && f.endsWith('.js'));
if (san) {
  const mod = await import(pathToFileURL(san).href).catch(() => ({}));
  const fn = Object.values(mod).find((v) => typeof v === 'function');
  const dirty =
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect onclick="alert(2)" width="5" height="5"/><a href="javascript:alert(3)"><text>x</text></a><foreignObject><div>x</div></foreignObject></svg>';
  let clean = '';
  try {
    clean = String(fn(dirty));
  } catch (e) {
    clean = `ошибка: ${e.message}`;
  }
  add(
    xid(),
    'security',
    `Очистка SVG (${rel(san)}) убирает script, onclick, javascript: и foreignObject`,
    !!clean && !/<script|onclick|javascript:|foreignObject/i.test(clean),
    clean.slice(0, 120),
  );
}

let k = 0;
const pid = () => `PF-${String(++k).padStart(2, '0')}`;
const perfRows = [];
for (const p of ['/', '/app/editor.html', '/app/dashboard.html', '/en/']) {
  const file = join(ROOT, p.endsWith('/') ? `${p}index.html` : p);
  const html = read(file);
  let total = Buffer.byteLength(html);
  for (const m of html.matchAll(/(?:href|src)="([^":#?]+\.(?:css|js|svg|png|jpg|webp))"/g)) {
    const f = m[1].startsWith('/') ? join(ROOT, m[1]) : resolve(dirname(file), m[1]);
    if (existsSync(f)) total += statSync(f).size;
  }
  perfRows.push({ page: p, kb: +(total / 1024).toFixed(1) });
  add(
    pid(),
    'performance',
    `Вес страницы ${p} со стилями, скриптами и картинками ≤ 1500 КБ (сейчас ${(total / 1024).toFixed(0)} КБ)`,
    total <= 1500 * 1024,
    `${(total / 1024).toFixed(0)} КБ`,
  );
}
const big = files.filter((f) => statSync(f).size > 500 * 1024).map((f) => `${rel(f)} ${(statSync(f).size / 1024).toFixed(0)} КБ`);
add(pid(), 'performance', 'Ни один файл сайта не больше 500 КБ', !big.length, big);
const lat = [];
for (let n = 0; n < 20; n++) {
  const t = performance.now();
  await (await fetch(`${base}/app/editor.html`)).arrayBuffer();
  lat.push(performance.now() - t);
}
lat.sort((a, b) => a - b);
const p95 = lat[18];
add(pid(), 'performance', `Редактор отдаётся быстро: p95 из 20 запросов ≤ 100 мс (сейчас ${p95.toFixed(1)} мс)`, p95 <= 100, `${p95.toFixed(1)} мс`);
const t0 = performance.now();
const rs = await Promise.all(Array.from({ length: 200 }, () => fetch(`${base}/`).then((r) => r.status)));
add(
  pid(),
  'performance',
  `Нагрузка: 200 параллельных запросов к главной, все 200 OK (за ${(performance.now() - t0).toFixed(0)} мс)`,
  rs.every((s) => s === 200),
  `${rs.filter((s) => s !== 200).length} ошибок`,
);
const cache = await raw('/css/style.css');
add(
  pid(),
  'performance',
  'Для статики задан Cache-Control или ETag/Last-Modified',
  !!(cache.headers.get('cache-control') || cache.headers.get('etag') || cache.headers.get('last-modified')),
  'нет заголовков кэша',
);
server.close();

writeFileSync(new URL('./static-sec-perf.json', import.meta.url), JSON.stringify({ results, perfRows }, null, 2));
const failed = results.filter((r) => r.status === 'Failed');
for (const r of failed) console.log(r.id, 'Failed', r.title, '|', r.note);
console.log({ total: results.length, passed: results.length - failed.length, failed: failed.length });
process.exitCode = failed.length ? 1 : 0;
