const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-9/';
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
    name: 'Муравей из блоков',
    idea: 'Твой выбор в тесте проекций: муравей, маленький трудяга-автоматизатор. Он собран из трёх блоков диаграммы, соединённых связями, с усиками-стрелками и шестью ногами. Узнаётся по силуэту и вызывает улыбку',
    mark: ({ a, b, bg }) => `<rect x="4" y="14" width="18" height="15" rx="6" fill="${a}"/><rect x="25" y="26" width="15" height="13" rx="5" fill="${a}"/><rect x="43" y="32" width="19" height="17" rx="7" fill="${a}"/>${line('M22 23L26 31', b, 3.5)}${line('M40 35L44 38', b, 3.5)}${line('M31 39L24 52M33 39L35 55M36 39L46 53', a, 3.5)}${line('M8 15Q4 8 11 4', b, 3.5)}${line('M15 14Q17 6 25 6', b, 3.5)}<circle cx="11" cy="4" r="2.6" fill="${b}"/><circle cx="25" cy="6" r="2.6" fill="${b}"/><circle cx="10" cy="21" r="2.4" fill="${bg}"/><path d="M49 41H57" stroke="${bg}" stroke-width="3" stroke-linecap="round"/>`,
  },
  {
    name: 'Колба-лаборатория',
    idea: 'Твоя «лаборатория»: колба, внутри которой граф из узлов вместо жидкости, наверху пузырьки-акценты. Силуэт колбы ни с чем не спутать, а граф говорит о диаграммах',
    mark: ({ a, b, bg }) => `<path d="M24 5h16v5h-3v14l15 26c2.500 4.500-.5 9-5.500 9H17.500c-5 0-8-4.500-5.500-9L27 24V10h-3z" fill="${a}"/><path d="M26 47L32 36L38 47Z" fill="none" stroke="${bg}" stroke-width="2.500" stroke-linejoin="round"/><circle cx="32" cy="36" r="3.800" fill="${bg}"/><circle cx="26" cy="47" r="3.800" fill="${bg}"/><circle cx="38" cy="47" r="3.800" fill="${bg}"/><circle cx="46" cy="14" r="3.500" fill="${b}"/><circle cx="53" cy="22" r="2.500" fill="${b}"/><circle cx="50" cy="7" r="2" fill="${b}"/>`,
  },
  {
    name: 'Вертушка',
    idea: 'Четыре разных блока, сложенные вертушкой, в каждом стрелка по кругу: цикл автоматизации. Силуэт-пропеллер, не квадрат',
    mark: ({ a, b, bg }) => `<rect x="3" y="3" width="31" height="23" rx="6" fill="${a}"/><rect x="38" y="3" width="23" height="31" rx="6" fill="${b}"/><rect x="30" y="38" width="31" height="23" rx="6" fill="${a}"/><rect x="3" y="30" width="23" height="31" rx="6" fill="${a}"/>${line('M13 14.500H24M20 10.500L24 14.500L20 18.500', bg, 3.500)}${line('M49.500 12V25M45.500 21L49.500 25L53.500 21', bg, 3.500)}${line('M51 49.500H40M44 45.500L40 49.500L44 53.500', bg, 3.500)}${line('M14.500 52V39M10.500 43L14.500 39L18.500 43', bg, 3.500)}`,
  },
  {
    name: 'Лестница процесса',
    idea: 'Три блока ступенями по диагонали и ступенчатые стрелки между ними: процесс идёт вверх, последний шаг подсвечен. Силуэт-диагональ',
    mark: ({ a, b }) => `<rect x="3" y="41" width="20" height="20" rx="6" fill="${a}"/><rect x="22" y="22" width="20" height="20" rx="6" fill="${a}"/><rect x="41" y="3" width="20" height="20" rx="6" fill="${b}"/>${line('M13 41V32H19', a, 4)}${head(21, 32, 0, a, 4, 7)}${line('M32 22V13H38', a, 4)}${head(40, 13, 0, a, 4, 7)}`,
  },
  {
    name: 'Код и схема',
    idea: 'Круг, разделённый пополам: сверху строки кода, снизу граф-схема. Весь продукт в одной печати: правка в любой половине отражается в другой',
    mark: ({ a, b, bg }) => `<path d="M3 32A29 29 0 0 1 61 32Z" fill="${a}"/><circle cx="32" cy="32" r="27" fill="none" stroke="${a}" stroke-width="5"/><rect x="17" y="11" width="16" height="4" rx="2" fill="${bg}"/><rect x="23" y="18" width="26" height="4" rx="2" fill="${b}"/><rect x="17" y="25" width="12" height="4" rx="2" fill="${bg}"/>${line('M20 43L32 53L44 43', a, 3)}<circle cx="20" cy="43" r="4.500" fill="${b}"/><circle cx="44" cy="43" r="4.500" fill="${a}"/><circle cx="32" cy="53" r="4.500" fill="${a}"/>`,
  },
  {
    name: 'Закладка-стрелка',
    idea: 'Высокая закладка с синей шапкой и вырезанной стрелкой. Вертикальный силуэт, не квадратный, хорошо смотрится в шапке и на корешке',
    mark: ({ a, b, bg }) => `<path d="M14 3h36v58L32 47 14 61z" fill="${a}"/><path d="M14 3h36v10H14z" fill="${b}"/><path d="M22 27h14v-7l12 11-12 11v-7H22z" fill="${bg}"/>`,
  },
  {
    name: 'Ячейка',
    idea: 'Толстое шестигранное кольцо, как ячейка конструктора, в нём блок и стрелка вниз, а синий узел сидит на вершине',
    mark: ({ a, b }) => `<path d="M32 4L56 18V46L32 60L8 46V18Z" fill="none" stroke="${a}" stroke-width="6" stroke-linejoin="round"/><rect x="23" y="20" width="18" height="15" rx="5" fill="${a}"/>${line('M32 38V47', b, 5)}${head(32, 49, 90, b, 5, 8)}<circle cx="32" cy="4" r="5.500" fill="${b}"/>`,
  },
  {
    name: 'Две ленты',
    idea: 'Две скошенные ленты в форме буквы Z, чёрная и синяя, со стрелками навстречу друг другу. Динамичный силуэт, не похож ни на один из прошлых',
    mark: ({ a, b, bg }) => `<path d="M14 6H61L51 27H4Z" fill="${a}"/><path d="M13 37H60L50 58H3Z" fill="${b}" transform="translate(0 0)"/>${line('M24 16.500H46M42 11.500L47 16.500L42 21.500', bg, 4)}${line('M42 47.500H20M24 42.500L19 47.500L24 52.500', bg, 4)}`,
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
const strip = `<section class="card"><h2>Силуэты издалека</h2><p class="idea">Все знаки чёрным, размытие как с большого расстояния</p><div style="display:flex;gap:18px;flex-wrap:wrap;background:#fff;padding:16px;border-radius:10px;filter:blur(1.2px)">${concepts.map((c) => svg(c, MONO, 56)).join('')}</div></section>`;
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
</style></head><body><h1>Логотипы DSLKit, вариант 9: разные силуэты</h1><p class="lead">Восемь знаков с принципиально разными силуэтами: муравей, колба, вертушка, лестница, круг, закладка, ячейка, ленты. Полоса вверху: те же знаки чёрным и размытыми, как издалека. Если силуэты различимы, значит, знак не спутать с соседями.</p>${strip}${concepts.map(card).join('')}</body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(concepts.length);
