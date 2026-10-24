// Puts the chosen logo (pinwheel), mascot (white cat) and own fonts (Kubik) into the mockups a-d and the copy of the site e-current,
// and writes states.html (empty list, 404, 500, tour, loader) to each of them. Safe to run again.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const read = (f) => readFileSync(f, 'utf8');
const write = (f, s) => writeFileSync(f, s);
const FACES = [
  ['Kubik Sans', 'KubikSans', 400, 'Regular'],
  ['Kubik Sans', 'KubikSans', 700, 'Bold'],
  ['Kubik Mono', 'KubikMono', 400, 'Regular'],
  ['Kubik Mono', 'KubikMono', 700, 'Bold'],
];
const FONT_FACE = (rel) =>
  `/* Own fonts of the project: Kubik Sans (text) and Kubik Mono (code), see docs/brand/fonts */\n${FACES.map(
    ([fam, file, w, st]) => `@font-face { font-family: '${fam}'; font-weight: ${w}; font-style: normal; font-display: swap; src: url('${rel}/fonts/${file}-${st}.woff2') format('woff2'); }`,
  ).join('\n')}\n`;
const SANS = "'Kubik Sans', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Kubik Mono', ui-monospace, 'Cascadia Code', Consolas, 'Courier New', monospace";

const logoImg = (cls, size) =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="../assets/mark-dark.svg" /><img${cls ? ` class="${cls}"` : ''} src="../assets/mark-light.svg" alt="" width="${size}" height="${size}" /></picture>`;
const INLINE_LOGO = /<svg( class="topbar__mark")?[^>]*viewBox="0 0 32 32"[^>]*><rect width="32" height="32" rx="8" fill="#2563eb" \/>.*?<\/svg>/s;

for (const dir of ['a-calm', 'b-command', 'c-canvas', 'd-guided']) {
  let css = read(`${dir}/style.css`);
  if (!css.includes('Kubik Sans')) {
    css = css.replace(/--font-sans: [^;]+;/, `--font-sans: ${SANS};`).replace(/--font-mono: [^;]+;/, `--font-mono: ${MONO};`);
    css = FONT_FACE('../assets') + css;
    css += '\n/* Logo: the pinwheel mark is an image, not an inline icon */\n.logo img, .topbar__mark { width: var(--space-3); height: var(--space-3); display: block; border-radius: 6px; }\n';
    write(`${dir}/style.css`, css);
  }
  for (const page of ['editor.html', 'dashboard.html']) {
    let html = read(`${dir}/${page}`);
    if (INLINE_LOGO.test(html)) html = html.replace(INLINE_LOGO, (m, c) => logoImg(c ? 'topbar__mark' : '', 24));
    html = html.replace(/<link rel="icon"[^>]*>/, '<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml" />');
    write(`${dir}/${page}`, html);
  }
}

// e-current: the copy of the real site.
mkdirSync('e-current/fonts', { recursive: true });
for (const f of ['KubikSans-Regular', 'KubikSans-Bold', 'KubikMono-Regular', 'KubikMono-Bold']) copyFileSync(`assets/fonts/${f}.woff2`, `e-current/fonts/${f}.woff2`);
copyFileSync('assets/mark-light.svg', 'e-current/images/logo.svg');
copyFileSync('assets/favicon.svg', 'e-current/images/favicon.svg');
let vars = read('e-current/css/variables.css');
if (!vars.includes('Kubik Sans')) {
  vars = vars.replace(/--font-sans: [^;]+;/, `--font-sans: ${SANS};`).replace(/--font-mono: [^;]+;/, `--font-mono: ${MONO};`);
  write('e-current/css/variables.css', vars);
  write('e-current/css/fonts.css', FONT_FACE('..'));
  const style = read('e-current/css/style.css').replace(/(@import[^;]*variables\.css[^;]*;)/, '$1\n@import url("fonts.css");');
  write('e-current/css/style.css', style);
}

const cat = (p) => `<picture><source media="(prefers-color-scheme: dark)" srcset="${p}assets/mascot-dark.svg" /><img class="st-cat" src="${p}assets/mascot-light.svg" alt="" /></picture>`;
const STATES = (variant, p, cssHref, fontCss) => `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Состояния с маскотом: ${variant}</title>
  <link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="${cssHref}" />
  <style>
    ${fontCss}
    body { margin: 0; background: var(--color-background); color: var(--color-text); font-family: var(--font-sans); }
    .st-states { display: grid; gap: 24px; padding: 24px 16px 48px; max-width: 1180px; margin: 0 auto; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .st-states h1 { grid-column: 1 / -1; margin: 0; font-size: 1.5rem; }
    .st-state { border: 1px solid var(--color-border-strong); border-radius: 14px; background: var(--color-surface); padding: 20px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .st-state h2 { margin: 0; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-muted); }
    .st-state h3 { margin: 0; font-size: 1.25rem; }
    .st-state p, .st-state li { margin: 0; line-height: 1.5; }
    .st-state ul { margin: 0; padding-left: 20px; list-style: disc; }
    .st-state img.st-cat { width: 120px; height: 120px; }
    .st-code { font-family: var(--font-mono); color: var(--color-muted); }
    .st-pill { display: inline-block; padding: 10px 16px; border-radius: 8px; background: var(--color-primary); color: var(--color-on-primary); font-weight: 700; text-decoration: none; }
    .st-tour { display: flex; gap: 12px; align-items: flex-end; }
    .st-bubble { background: var(--color-code-background); color: var(--color-code-text); border-radius: 12px; padding: 12px 14px; max-width: 220px; }
    .st-loader { align-items: center; }
    .st-loader img { width: 72px; height: 72px; animation: spin 1.4s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .st-loader img { animation: none; } }
  </style>
</head>
<body>
  <main class="st-states">
    <h1>Состояния с маскотом: ${variant}</h1>

    <section class="st-state" aria-labelledby="s1">
      <h2 id="s1">Пустой список проектов</h2>
      ${cat(p)}
      <h3>Пока ни одной диаграммы</h3>
      <p>Опишите схему текстом, и она появится рядом. Начните с шаблона или с пустого листа.</p>
      <a class="st-pill" href="#">Создать диаграмму</a>
    </section>

    <section class="st-state" aria-labelledby="s2">
      <h2 id="s2">Ошибка 404</h2>
      ${cat(p)}
      <p class="st-code">Код ошибки: 404</p>
      <h3>Страница не найдена</h3>
      <p><b>Что это.</b> По этому адресу ничего нет, сайт при этом работает.</p>
      <p><b>Почему.</b> В адресе опечатка, или проект удалён.</p>
      <p><b>Как исправить.</b> Проверьте адрес или откройте проект из списка.</p>
      <a class="st-pill" href="#">К моим проектам</a>
    </section>

    <section class="st-state" aria-labelledby="s3">
      <h2 id="s3">Ошибка 500</h2>
      ${cat(p)}
      <p class="st-code">Код ошибки: 500</p>
      <h3>Ошибка на сервере</h3>
      <p><b>Что это.</b> Сервер не смог подготовить страницу. Ваши данные не изменены.</p>
      <ul><li>Обновите страницу: короткий сбой часто проходит.</li><li>Если повторяется, сообщите время и адрес страницы.</li></ul>
      <a class="st-pill" href="#">Обновить страницу</a>
    </section>

    <section class="st-state" aria-labelledby="s4">
      <h2 id="s4">Тур по редактору, шаг 2 из 4</h2>
      <div class="st-tour">${cat(p)}<div class="st-bubble"><b>Слева текст, справа схема.</b><br />Меняйте код: диаграмма перестроится сама.</div></div>
      <a class="st-pill" href="#">Дальше</a>
    </section>

    <section class="st-state st-loader" aria-labelledby="s5">
      <h2 id="s5">Загрузка</h2>
      <picture><source media="(prefers-color-scheme: dark)" srcset="${p}assets/mark-dark.svg" /><img src="${p}assets/mark-light.svg" alt="" /></picture>
      <p role="status">Строим диаграмму…</p>
    </section>

    <section class="st-state" aria-labelledby="s6">
      <h2 id="s6">Главная страница сайта</h2>
      <div class="st-tour"><img src="${p}assets/mark-light.svg" alt="" width="40" height="40" /><b style="font-size: 1.5rem">DSLKit</b></div>
      <h3>Диаграммы из текста</h3>
      <p>Пишете описание, получаете схему: 33 нотации, экспорт в SVG и PNG.</p>
      <div class="st-tour">${cat(p)}<a class="st-pill" href="#">Открыть редактор</a></div>
    </section>
  </main>
</body>
</html>
`;
for (const [dir, name] of [['a-calm', 'A спокойный'], ['b-command', 'B командный'], ['c-canvas', 'C холст'], ['d-guided', 'D по шагам']]) {
  write(`${dir}/states.html`, STATES(name, '../', 'style.css', ''));
}
write('e-current/states.html', STATES('E текущий сайт', '../', 'css/style.css', ''));
console.log('done');
