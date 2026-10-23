const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-7/';
fs.mkdirSync(out, { recursive: true });

const LIGHT = { a: '#111827', b: '#2563eb', bg: '#ffffff' };
const DARK = { a: '#f8fafc', b: '#60a5fa', bg: '#0b1020' };
const MONO = { a: '#111111', b: '#111111', bg: '#ffffff' };
const MONOW = { a: '#ffffff', b: '#ffffff', bg: '#111111' };

const r2 = (n) => Math.round(n * 100) / 100;
// Arrow head as an open chevron with the tip at (x, y), pointing in direction deg (0 = right, 90 = down).
const head = (x, y, deg, c, w = 5, s = 9) => {
  const rad = (deg * Math.PI) / 180;
  const arm = (off) => [r2(x - s * Math.cos(rad + off)), r2(y - s * Math.sin(rad + off))];
  const [x1, y1] = arm(0.7);
  const [x2, y2] = arm(-0.7);
  return `<path d="M${x1} ${y1}L${x} ${y}L${x2} ${y2}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const line = (d, c, w = 6) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const concepts = [
  {
    name: 'Блок и улыбка-стрелка',
    idea: 'Чёрный блок диаграммы, под ним дуга-улыбка со стрелками на обоих концах: правка идёт и от кода к схеме, и обратно. Дружелюбно и вежливо, как ты описала продукт',
    mark: ({ a, b }) => `<rect x="14" y="5" width="36" height="30" rx="8" fill="${a}"/>${line('M11 44Q32 64 53 44', b, 6)}${head(9, 41.5, 230, b)}${head(55, 41.5, -50, b)}`,
  },
  {
    name: 'Туда и обратно',
    idea: 'Блок слева и круг справа, между ними две стрелки в разные стороны. Буквально: код и холст, которые меняют друг друга',
    mark: ({ a, b }) => `<rect x="3" y="16" width="20" height="32" rx="6" fill="${a}"/><circle cx="52" cy="32" r="11" fill="${b}"/>${line('M27 25H36', a, 5)}${head(38, 25, 0, a, 5, 8)}${line('M37 39H28', a, 5)}${head(26, 39, 180, a, 5, 8)}`,
  },
  {
    name: 'D-петля',
    idea: 'Буква D собрана как блок и стрелка: стойка и дуга, которая возвращается обратно к стойке. Буква, поток и двусторонняя связь в одной фигуре',
    mark: ({ a, b }) => `<rect x="7" y="6" width="12" height="52" rx="4" fill="${a}"/>${line('M19 10H28C47 10 56 20 56 32S47 54 28 54H25', b, 10)}${head(21, 54, 180, b, 7, 10)}`,
  },
  {
    name: 'Курсор и узел',
    idea: 'Мигающий текстовый курсор (код) и рядом блок (диаграмма), от курсора к блоку идёт стрелка. Два способа правки в одном знаке',
    mark: ({ a, b }) => `<g class="blink"><rect x="11" y="6" width="8" height="52" rx="3" fill="${a}"/><rect x="5" y="6" width="20" height="7" rx="2.5" fill="${a}"/><rect x="5" y="51" width="20" height="7" rx="2.5" fill="${a}"/></g>${line('M28 32H34', b, 5)}${head(36, 32, 0, b, 5, 8)}<rect x="38" y="17" width="22" height="30" rx="7" fill="${b}"/>`,
  },
  {
    name: 'Наклейка-блок',
    idea: 'Чёрный блок с небольшим наклоном и толстая синяя стрелка, которая выходит из него. Простой знак как на наклейке или футболке группы',
    mark: ({ a, b }) => `<rect x="5" y="15" width="36" height="36" rx="9" fill="${a}" transform="rotate(-8 23 33)"/>${line('M32 40L54 17', b, 10)}${head(57, 14, -46, b, 9, 15)}`,
  },
];

const svg = (c, pal, size = 64, cls = '') => `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${c.name}">${c.mark(pal)}</svg>`;
const lock = (c, pal, text) => `<span class="lock" style="color:${text}"><span class="m">${svg(c, pal, 48)}</span><span class="w"><b style="color:${pal.a}">DSL</b><b style="color:${pal.b}">K</b><span>it</span></span></span>`;

concepts.forEach((c, i) => {
  const n = String(i + 1).padStart(2, '0');
  fs.writeFileSync(out + `icon-${n}-light.svg`, svg(c, LIGHT));
  fs.writeFileSync(out + `icon-${n}-dark.svg`, svg(c, DARK));
  fs.writeFileSync(out + `icon-${n}-mono.svg`, svg(c, MONO));
});

const appIcon = (c) => `<span class="app" style="background:#111827">${svg(c, { a: '#ffffff', b: '#93c5fd', bg: '#111827' }, 64)}</span>`;
const card = (c, i) => {
  const n = String(i + 1).padStart(2, '0');
  return `<section class="card"><h2>${n}. ${c.name}</h2><p class="idea">${c.idea}</p>
<div class="r"><div class="p l">${lock(c, LIGHT, '#111827')}</div><div class="p d">${lock(c, DARK, '#f8fafc')}</div></div>
<div class="r"><div class="p l">${lock(c, MONO, '#111')}<small>чёрно-белая печать</small></div><div class="p k">${lock(c, MONOW, '#fff')}<small>белый на чёрном</small></div></div>
<div class="r s"><div class="p l"><span class="sz">${svg(c, LIGHT, 16)}${svg(c, LIGHT, 32)}${svg(c, LIGHT, 48)}</span><small>16, 32, 48 пикселей</small></div><div class="p l">${appIcon(c)}<small>иконка приложения</small></div><div class="p l load"><span class="spinner">${svg(c, LIGHT, 64)}</span><small>загрузка</small></div></div></section>`;
};
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Логотипы DSLKit, вариант 7</title><style>
:root{--bg:#f8f9fc;--surface:#fff;--text:#1c1f2e;--muted:#4a5068;--border:#dde1e9}
@media (prefers-color-scheme:dark){:root{--bg:#10131c;--surface:#1a1f2e;--text:#eef0f6;--muted:#aab0c4;--border:#2d3448}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:1.6rem}h2{margin:0;font-size:1.15rem}p.lead{margin:0 0 20px;color:var(--muted);max-width:66ch}.idea{margin:2px 0 12px;color:var(--muted);font-size:.9rem}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:18px}
.r{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.r.s{grid-template-columns:repeat(3,1fr)}
.p{border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;justify-content:center;min-height:80px}
.p.l{background:#fff;color:#111827}.p.d{background:#0b1020}.p.k{background:#111}.p small{font-size:.75rem;opacity:.7}
.lock{display:inline-flex;align-items:center;gap:10px}.w{font:800 1.7rem 'Cascadia Mono',Consolas,monospace;letter-spacing:-.03em}.w span{font-weight:500}
.sz{display:inline-flex;align-items:flex-end;gap:12px}.app{display:inline-flex;width:84px;height:84px;border-radius:19px;align-items:center;justify-content:center}.app svg{width:56px;height:56px}
.load .blink{animation:blink 1.1s steps(2,start) infinite}@keyframes blink{50%{opacity:.1}}
@media (prefers-reduced-motion:reduce){.load *{animation:none!important}}
@media (max-width:620px){.r,.r.s{grid-template-columns:1fr}}
</style></head><body><h1>Логотипы DSLKit, вариант 7: чисто, по твоим ответам</h1><p class="lead">Белый фон, чёрный и один акцент, никаких кружков с кучей деталей. В основе твоя картинка: блок и стрелка к нему или от него, правка идёт в обе стороны, а знак слегка улыбается. Для каждого знака: светлая и тёмная версии, чёрно-белая печать, размеры 16, 32, 48, иконка и загрузка.</p>${concepts.map(card).join('')}</body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(concepts.length);
