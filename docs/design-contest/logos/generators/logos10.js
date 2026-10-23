const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-10/';
fs.mkdirSync(out, { recursive: true });

// The palette of the site: primary blue, accent green, warning amber, error red, secondary light blue, text ink.
const LIGHT = { a: '#2563eb', b: '#16a34a', c: '#d97706', d: '#dc2626', e: '#e8efff', t: '#1c1f2e', bg: '#ffffff' };
const DARK = { a: '#8bb0ff', b: '#16a34a', c: '#fab387', d: '#f38ba8', e: '#27304d', t: '#cdd6f4', bg: '#1e1e2e' };
const MONO = { a: '#111111', b: '#111111', c: '#111111', d: '#111111', e: '#ffffff', t: '#111111', bg: '#ffffff' };
const MONOW = { a: '#ffffff', b: '#ffffff', c: '#ffffff', d: '#ffffff', e: '#111111', t: '#ffffff', bg: '#111111' };
const APP = { ...LIGHT, bg: '#e8efff' };

const r2 = (n) => Math.round(n * 100) / 100;
const line = (d, c, w = 5) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const head = (x, y, deg, c, w = 4, s = 8) => {
  const rad = (deg * Math.PI) / 180;
  const arm = (off) => [r2(x - s * Math.cos(rad + off)), r2(y - s * Math.sin(rad + off))];
  const [x1, y1] = arm(0.7);
  const [x2, y2] = arm(-0.7);
  return line(`M${x1} ${y1}L${x} ${y}L${x2} ${y2}`, c, w);
};
const FLASK = 'M24 5h16v5h-3v14l15 26c2.5 4.5-.5 9-5.5 9h-29c-5 0-8-4.5-5.5-9L27 24V10h-3z';

const concepts = [
  {
    name: 'Муравей из блоков в цвете',
    idea: 'Твой муравей: голова синяя, грудь зелёная, брюшко янтарное, усики заканчиваются красными узлами. Все цвета палитры в одном силуэте',
    mark: ({ a, b, c, d, t, bg }) =>
      `<rect x="3" y="14" width="19" height="16" rx="6" fill="${a}"/><rect x="25" y="26" width="15" height="13" rx="5" fill="${b}"/><rect x="43" y="32" width="19" height="18" rx="7" fill="${c}"/>${line('M22 23L26 31', t, 3)}${line('M40 35L44 39', t, 3)}${line('M31 39L24 53M33 39L35 56M36 39L46 54', t, 3.5)}${line('M7 15Q3 8 10 4M15 14Q17 6 25 6', t, 3)}<circle cx="10" cy="4" r="3.2" fill="${d}"/><circle cx="25" cy="6" r="3.2" fill="${d}"/><circle cx="11" cy="22" r="2.4" fill="${bg}"/>`,
  },
  {
    name: 'Колба со слоями',
    idea: 'Лаборатория, в которой налиты три слоя цвета, а в жидкости виден граф. Красный пузырёк сверху как точка внимания',
    mark: ({ a, b, c, d, e, t, bg }) =>
      `<defs><clipPath id="fl"><path d="${FLASK}"/></clipPath></defs><path d="${FLASK}" fill="${e}"/><g clip-path="url(#fl)"><rect x="0" y="34" width="64" height="30" fill="${c}"/><rect x="0" y="42" width="64" height="22" fill="${a}"/><rect x="0" y="52" width="64" height="12" fill="${b}"/></g><path d="${FLASK}" fill="none" stroke="${t}" stroke-width="3" stroke-linejoin="round"/>${line('M25 49L32 40L39 49Z', bg, 2.2)}<circle cx="32" cy="40" r="3.2" fill="${bg}"/><circle cx="25" cy="49" r="3.2" fill="${bg}"/><circle cx="39" cy="49" r="3.2" fill="${bg}"/><circle cx="47" cy="13" r="3.6" fill="${d}"/><circle cx="53" cy="22" r="2.4" fill="${c}"/>`,
  },
  {
    name: 'Светофор-вертушка',
    idea: 'Четыре блока по кругу в цветах палитры, на каждом стрелка. Вертушка читается и как автоматизация, и как набор состояний',
    mark: ({ a, b, c, d, bg }) =>
      `<rect x="3" y="3" width="31" height="23" rx="6" fill="${a}"/><rect x="38" y="3" width="23" height="31" rx="6" fill="${b}"/><rect x="30" y="38" width="31" height="23" rx="6" fill="${c}"/><rect x="3" y="30" width="23" height="31" rx="6" fill="${d}"/>${line('M13 14.5H24M20 10.5L24 14.5L20 18.5', bg, 3.5)}${line('M49.5 12V25M45.5 21L49.5 25L53.5 21', bg, 3.5)}${line('M51 49.5H40M44 45.5L40 49.5L44 53.5', bg, 3.5)}${line('M14.5 52V39M10.5 43L14.5 39L18.5 43', bg, 3.5)}`,
  },
  {
    name: 'Лестница процесса в цвете',
    idea: 'Четыре ступени: синяя, зелёная, янтарная и красная (финал). Ступенчатые стрелки показывают путь вверх, силуэт-диагональ',
    mark: ({ a, b, c, d, t }) =>
      `<rect x="2" y="44" width="16" height="16" rx="5" fill="${a}"/><rect x="16" y="30" width="16" height="16" rx="5" fill="${b}"/><rect x="30" y="16" width="16" height="16" rx="5" fill="${c}"/><rect x="46" y="2" width="16" height="16" rx="5" fill="${d}"/>${line('M10 44V37H14', t, 3.2)}${head(16, 37, 0, t, 3.2, 6)}${line('M24 30V23H28', t, 3.2)}${head(30, 23, 0, t, 3.2, 6)}${line('M38 16V9H44', t, 3.2)}${head(46, 9, 0, t, 3.2, 6)}`,
  },
  {
    name: 'Код и схема в цвете',
    idea: 'Круг пополам: сверху строки кода цветами палитры, снизу граф из цветных узлов. Продукт целиком в одной печати',
    mark: ({ a, b, c, d, e, t, bg }) =>
      `<path d="M3 32A29 29 0 0 1 61 32Z" fill="${t}"/><path d="M3 32A29 29 0 0 0 61 32Z" fill="${e}"/><circle cx="32" cy="32" r="28.5" fill="none" stroke="${t}" stroke-width="3"/><rect x="15" y="10" width="14" height="4" rx="2" fill="${a}"/><rect x="31" y="10" width="14" height="4" rx="2" fill="${c}"/><rect x="21" y="17" width="26" height="4" rx="2" fill="${b}"/><rect x="15" y="24" width="11" height="4" rx="2" fill="${bg}"/>${line('M19 43L32 53L45 43M19 43L45 43', t, 2.2)}<circle cx="19" cy="43" r="4.5" fill="${a}"/><circle cx="45" cy="43" r="4.5" fill="${d}"/><circle cx="32" cy="53" r="4.5" fill="${b}"/>`,
  },
  {
    name: 'Закладка-лента',
    idea: 'Высокая закладка: сверху лента из четырёх цветов палитры, ниже вырезанная стрелка. Вертикальный силуэт для шапки и корешка',
    mark: ({ a, b, c, d, bg }) =>
      `<path d="M14 3h36v58L32 47 14 61z" fill="${a}"/><rect x="14" y="3" width="9" height="11" fill="${d}"/><rect x="23" y="3" width="9" height="11" fill="${c}"/><rect x="32" y="3" width="9" height="11" fill="${b}"/><path d="M22 28h14v-7l12 11-12 11v-7H22z" fill="${bg}"/>`,
  },
  {
    name: 'Улыбающийся блок в цвете',
    idea: 'Любимый знак: блок с глазами и дуга-улыбка со стрелками. Блок синий, улыбка зелёная, стрелки янтарные, на щеке красная точка',
    mark: ({ a, b, c, d, bg }) =>
      `<rect x="12" y="4" width="40" height="34" rx="9" fill="${a}"/><circle cx="24" cy="19" r="3.5" fill="${bg}"/><circle cx="40" cy="19" r="3.5" fill="${bg}"/><circle cx="46" cy="27" r="2.6" fill="${d}"/>${line('M11 46Q32 65 53 46', b, 6)}${head(9, 43.5, 230, c, 5, 8)}${head(55, 43.5, -50, c, 5, 8)}`,
  },
  {
    name: 'Курсор тащит блок',
    idea: 'Твоя неожиданность: курсор перетаскивает блок, и код меняется. Стопка цветных блоков, красная пунктирная тень там, откуда блок взят',
    mark: ({ a, b, c, d, t, bg }) =>
      `<rect x="8" y="30" width="30" height="24" rx="7" fill="none" stroke="${d}" stroke-width="2.6" stroke-dasharray="4 3"/><rect x="6" y="6" width="34" height="14" rx="5" fill="${a}"/><rect x="14" y="16" width="34" height="14" rx="5" fill="${b}"/><rect x="22" y="26" width="34" height="14" rx="5" fill="${c}"/><path d="M34 34L34 62L41.500 54.500L47 64L53 61L47.500 51L58 51z" fill="${t}" stroke="${bg}" stroke-width="3" stroke-linejoin="round"/>`,
  },
];

const svg = (c, pal, size = 64, cls = '') => `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${c.name}">${c.mark(pal)}</svg>`;
const lock = (c, pal) => `<span class="lock" style="color:${pal.t}"><span class="m">${svg(c, pal, 48)}</span><span class="w"><b>DSL</b><b style="color:${pal.a}">K</b><span>it</span></span></span>`;

concepts.forEach((c, i) => {
  const n = String(i + 1).padStart(2, '0');
  fs.writeFileSync(out + `icon-${n}-light.svg`, svg(c, LIGHT));
  fs.writeFileSync(out + `icon-${n}-dark.svg`, svg(c, DARK));
  fs.writeFileSync(out + `icon-${n}-mono.svg`, svg(c, MONO));
});

const swatch = (name, hex) => `<span class="sw"><i style="background:${hex}"></i>${name}<br><small>${hex}</small></span>`;
const palette = `<section class="card"><h2>Цвета знаков: палитра сайта</h2><p class="idea">Основной синий, акцентный зелёный, предупреждение янтарное, ошибка красная, дополнительный светло-синий и цвет текста. Для тёмной темы взяты их тёмные пары.</p><div class="swr">${[['синий', LIGHT.a], ['зелёный', LIGHT.b], ['янтарный', LIGHT.c], ['красный', LIGHT.d], ['светло-синий', LIGHT.e], ['текст', LIGHT.t]].map(([n, h]) => swatch(n, h)).join('')}</div><div class="swr dk">${[['синий', DARK.a], ['зелёный', DARK.b], ['янтарный', DARK.c], ['красный', DARK.d], ['фон', DARK.e], ['текст', DARK.t]].map(([n, h]) => swatch(n, h)).join('')}</div></section>`;
const card = (c, i) => {
  const n = String(i + 1).padStart(2, '0');
  return `<section class="card"><h2>${n}. ${c.name}</h2><p class="idea">${c.idea}</p>
<div class="r"><div class="p l">${lock(c, LIGHT)}</div><div class="p d">${lock(c, DARK)}</div></div>
<div class="r"><div class="p l">${lock(c, MONO)}<small>чёрно-белая печать</small></div><div class="p k">${lock(c, MONOW)}<small>белый на чёрном</small></div></div>
<div class="r s"><div class="p l"><span class="sz">${svg(c, LIGHT, 16)}${svg(c, LIGHT, 32)}${svg(c, LIGHT, 48)}</span><small>16, 32, 48 пикселей</small></div><div class="p l"><span class="app">${svg(c, APP, 64)}</span><small>иконка приложения</small></div><div class="p l"><span class="blur">${svg(c, LIGHT, 32)}</span><small>издалека</small></div></div></section>`;
};
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Логотипы DSLKit, вариант 10</title><style>
:root{--bg:#f8f9fc;--surface:#fff;--text:#1c1f2e;--muted:#4a5068;--border:#dde1e9}
@media (prefers-color-scheme:dark){:root{--bg:#10131c;--surface:#1a1f2e;--text:#eef0f6;--muted:#aab0c4;--border:#2d3448}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:1.6rem}h2{margin:0;font-size:1.15rem}p.lead{margin:0 0 20px;color:var(--muted);max-width:66ch}.idea{margin:2px 0 12px;color:var(--muted);font-size:.9rem}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:18px}
.r{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.r.s{grid-template-columns:repeat(3,1fr)}
.p{border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;justify-content:center;min-height:80px}
.p.l{background:#fff;color:#1c1f2e}.p.d{background:#1e1e2e}.p.k{background:#111}.p small{font-size:.75rem;opacity:.7}
.lock{display:inline-flex;align-items:center;gap:10px}.w{font:800 1.7rem 'Cascadia Mono',Consolas,monospace;letter-spacing:-.03em}.w span{font-weight:500}
.sz{display:inline-flex;align-items:flex-end;gap:12px}.app{display:inline-flex;width:84px;height:84px;border-radius:19px;align-items:center;justify-content:center;background:#e8efff}.app svg{width:60px;height:60px}.blur{display:inline-flex;filter:blur(1.4px)}
.swr{display:flex;gap:12px;flex-wrap:wrap;padding:12px;border-radius:10px;background:#fff;margin-bottom:8px;color:#1c1f2e}.swr.dk{background:#1e1e2e;color:#cdd6f4}.sw{font-size:.8rem;line-height:1.3}.sw i{display:block;width:56px;height:36px;border-radius:8px;border:1px solid rgba(128,128,128,.4);margin-bottom:4px}
@media (max-width:620px){.r,.r.s{grid-template-columns:1fr}}
</style></head><body><h1>Логотипы DSLKit, вариант 10: цвета сайта</h1><p class="lead">Знаки собраны из палитры сайта: синий, зелёный, янтарный, красный и светло-синий. Здесь развиты любимые идеи: муравей, колба, улыбающийся блок, курсор и блоки, а также цветные вертушка, лестница, закладка и круг код-схема. Для каждого знака: светлая и тёмная версии, чёрно-белая печать, размеры, иконка и взгляд издалека.</p>${palette}${concepts.map(card).join('')}</body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(concepts.length);
