const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-8/';
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
    name: 'Улыбающийся блок',
    idea: 'Продолжение любимого знака: блок с двумя глазами-точками и дуга-улыбка со стрелками. Блок буквально улыбается, поток идёт в обе стороны',
    mark: ({ a, b, bg }) => `<rect x="12" y="4" width="40" height="34" rx="9" fill="${a}"/><circle cx="24" cy="19" r="3.5" fill="${bg}"/><circle cx="40" cy="19" r="3.5" fill="${bg}"/>${line('M11 46Q32 65 53 46', b, 6)}${head(9, 43.5, 230, b)}${head(55, 43.5, -50, b)}`,
  },
  {
    name: 'D-блок с улыбкой',
    idea: 'Блок в форме буквы D (плоская левая сторона, круглая правая) и дуга-улыбка под ним',
    mark: ({ a, b }) => `<path d="M10 6h20c16 0 24 7 24 17S46 40 30 40H10z" fill="${a}"/>${line('M11 48Q32 66 53 48', b, 6)}${head(9, 45.5, 230, b)}${head(55, 45.5, -50, b)}`,
  },
  {
    name: 'Блок-реплика',
    idea: 'Блок как реплика в диалоге: с хвостиком, и толстая стрелка выходит из него. Вежливый системный аналитик, который объясняет, а не командует',
    mark: ({ a, b }) => `<path d="M8 8h34a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H24l-12 11V46a4 4 0 0 1-4-4z" fill="${a}"/>${line('M30 28H52', b, 8)}${head(56, 28, 0, b, 8, 13)}`,
  },
  {
    name: 'Два блока и улыбка',
    idea: 'Два блока на диагонали и дуга со стрелкой между ними: простейшая диаграмма процесса, которая сама похожа на улыбку',
    mark: ({ a, b }) => `<rect x="4" y="6" width="24" height="20" rx="6" fill="${a}"/><rect x="36" y="38" width="24" height="20" rx="6" fill="${b}"/>${line('M16 31Q18 52 32 50', a, 5)}${head(35, 49, -10, a, 5, 8)}`,
  },
  {
    name: 'Блок в кольце синхронизации',
    idea: 'Блок в центре и круговая стрелка вокруг него: код и холст синхронны, правка в любую сторону сразу видна в другой',
    mark: ({ a, b }) => `<rect x="19" y="19" width="26" height="26" rx="7" fill="${a}"/>${line('M32 6A26 26 0 0 1 58 32', b, 6)}${head(58, 33, 90, b)}${line('M32 58A26 26 0 0 1 6 32', b, 6)}${head(6, 31, -90, b)}`,
  },
  {
    name: 'Блок с вырезанной стрелкой',
    idea: 'Плотный чёрный блок, из которого стрелка вырезана насквозь, и синий уголок-метка. Читается издалека, хорошо печатается в одном цвете',
    mark: ({ a, b, bg }) => `<rect x="5" y="5" width="54" height="54" rx="14" fill="${a}"/><path d="M16 27h16v-9l18 14-18 14v-9H16z" fill="${bg}"/><path d="M42 5h17v17z" fill="${b}"/>`,
  },
  {
    name: 'Курсор тащит блок',
    idea: 'Твоя главная неожиданность: курсор мыши перетаскивает блок на холсте, и код меняется сразу. Чёрный блок и синий курсор у его угла',
    mark: ({ a, b }) => `<rect x="8" y="12" width="38" height="34" rx="9" fill="${a}"/><path d="M34 26L34 58L42 50L48 62L55 59L49 47L60 47z" fill="${b}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>`,
  },
  {
    name: 'Улыбка-стрелка',
    idea: 'Самый лаконичный вариант: только дуга-улыбка со стрелками и маленький блок над ней. Минимум деталей, максимум характера',
    mark: ({ a, b }) => `<rect x="22" y="8" width="20" height="18" rx="6" fill="${a}"/>${line('M8 36Q32 66 56 36', b, 7)}${head(6, 33, 235, b, 7, 11)}${head(58, 33, -55, b, 7, 11)}`,
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
</style></head><body><h1>Логотипы DSLKit, вариант 8: развитие любимых</h1><p class="lead">Развитие двух любимых знаков из набора 7: улыбка-стрелка и блок со стрелкой. Те же цвета, чёрный и один акцент. Для каждого знака: светлая и тёмная версии, чёрно-белая печать, размеры 16, 32, 48, иконка и загрузка.</p>${concepts.map(card).join('')}</body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(concepts.length);
