const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-3/';
fs.mkdirSync(out, { recursive: true });
const B = '#2563eb', B2 = '#1d4ed8', G = '#16a34a', Y = '#fbbf24', W = '#ffffff', N = '#0f172a';

// Bold marks: few big shapes, strong silhouette, no hairlines. Drawn in 64 x 64.
const marks = [
  ['D-поток', 'Сплошная D, в её просвете белая стрелка потока: буква и движение данных в одном силуэте', `<path d="M6 4h24c20 0 28 12 28 28S50 60 30 60H6z" fill="${B}"/><path d="M18 24v16h12v7l16-15-16-15v7z" fill="${W}"/><circle cx="12" cy="10" r="3.5" fill="${G}"/>`],
  ['Три примитива', 'Круг, квадрат и ромб: три базовые формы нотаций сложены плотным треугольником', `<circle cx="18" cy="18" r="14" fill="${G}"/><rect x="34" y="6" width="24" height="24" rx="3" fill="${B}"/><path d="M32 34l16 14-16 14-16-14z" fill="${B2}" transform="translate(-0 0)"/><path d="M48 36l12 12-12 12-12-12z" fill="${Y}"/>`],
  ['Скобки-колонны', 'Две толстые скобки как колонны и ромб-узел между ними', `<path d="M22 6H8v52h14v-9H17V15h5zM42 6h14v52H42v-9h5V15h-5z" fill="${B}"/><path d="M32 18l11 14-11 14-11-14z" fill="${G}"/>`],
  ['Шестигранник-D', 'Крупный шестиугольник с вырезанной D: узнаваемый силуэт значка и читаемая буква', `<path d="M32 2l26 15v30L32 62 6 47V17z" fill="${B}"/><path d="M22 18h10c10 0 14 6 14 14s-4 14-14 14H22zm9 8v12h2c3 0 5-2 5-6s-2-6-5-6z" fill="${W}" fill-rule="evenodd"/><circle cx="50" cy="52" r="6" fill="${G}"/>`],
  ['K-стрелка', 'Сплошная K, у которой верхняя ветвь стала стрелкой вверх-вправо', `<rect x="8" y="6" width="13" height="52" rx="3" fill="${B}"/><path d="M26 32l22-22h-9l5-4h17v17l-4 5v-9L30 40z" fill="${G}"/><path d="M26 30l24 28h-15L22 40z" fill="${B}"/>`],
  ['Развилка-молния', 'Толстая линия расходится на два выхода и заметна как знак издалека', `<path d="M4 28h18l14-16h14V4l12 12-12 12v-8H40L28 32l12 12h10v-8l12 12-12 12v-8H36L22 36H4z" fill="${B}"/><circle cx="10" cy="32" r="6" fill="${G}"/>`],
  ['Узел-треугольник', 'Три больших узла, соединённые толстыми линиями: сеть, граф, диаграмма', `<path d="M32 12L12 50h40z" fill="none" stroke="${B}" stroke-width="7" stroke-linejoin="round"/><circle cx="32" cy="12" r="10" fill="${G}"/><circle cx="12" cy="50" r="10" fill="${B}"/><circle cx="52" cy="50" r="10" fill="${Y}"/>`],
  ['Монолит DK', 'Буквы D и K слиты в один плотный блок с общей стойкой', `<path d="M4 6h22c14 0 20 9 20 26S40 58 26 58H4z" fill="${B}"/><path d="M13 16v32h12c8 0 12-6 12-16s-4-16-12-16z" fill="${W}"/><path d="M36 6h10v21l10-21h8L52 32l12 26H54L46 40v18H36z" fill="${G}"/>`],
  ['Ромб-решение', 'Крупный ромб из двух цветов с вырезанной стрелкой: знак решения на блок-схеме', `<path d="M32 2l30 30H32z" fill="${G}"/><path d="M62 32L32 62V32z" fill="${B}"/><path d="M32 2v30H2z" fill="${B2}"/><path d="M2 32h30v30z" fill="${B}" opacity=".0"/><path d="M26 30h14l-4-4m4 4l-4 4" fill="none" stroke="${W}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`],
  ['Двойной круг', 'Кольцо и круг: позиция сети Петри с фишкой, предельно простой и крупный знак', `<circle cx="32" cy="32" r="29" fill="none" stroke="${B}" stroke-width="9"/><circle cx="32" cy="32" r="13" fill="${G}"/><path d="M32 3v12M32 49v12" stroke="${B}" stroke-width="9"/>`],
  ['Блок и стрелка', 'Сплошной блок с белой стрелкой наружу: функциональный блок IDEF0 в виде плаката', `<rect x="4" y="12" width="44" height="40" rx="6" fill="${B}"/><path d="M14 32h26m-9-9l9 9-9 9" fill="none" stroke="${W}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 32h12m-5-5l5 5-5 5" fill="none" stroke="${G}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`],
  ['Прыгающий скобка-узел', 'Знак меньше «<» и крупная точка: курсор кода и узел схемы', `<path d="M34 8L10 32l24 24" fill="none" stroke="${B}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><circle cx="48" cy="32" r="12" fill="${G}"/>`],
  ['Слоёный квадрат', 'Три смещённых квадрата разных цветов, как стопка листов диаграммы', `<rect x="18" y="4" width="42" height="42" rx="7" fill="${Y}"/><rect x="11" y="11" width="42" height="42" rx="7" fill="${G}"/><rect x="4" y="18" width="42" height="42" rx="7" fill="${B}"/><path d="M14 40h22M14 48h12" stroke="${W}" stroke-width="4.5" stroke-linecap="round"/>`],
  ['Полукруги', 'Два полукруга, соединённых стрелкой: текст и схема, круговорот сборки', `<path d="M4 32a28 28 0 0 1 56 0z" fill="${B}"/><path d="M60 32a28 28 0 0 1-56 0z" fill="${G}"/><path d="M20 32h24m-8-8l8 8-8 8" fill="none" stroke="${W}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`],
  ['Мишень-D', 'Круг-мишень с D по центру: сильная форма, читается за несколько метров', `<circle cx="32" cy="32" r="30" fill="${B}"/><circle cx="32" cy="32" r="21" fill="${W}"/><path d="M24 20h8c9 0 13 5 13 12s-4 12-13 12h-8z" fill="${B2}"/><circle cx="32" cy="32" r="0" fill="${G}"/><circle cx="52" cy="12" r="8" fill="${G}"/>`],
];

const files = marks.map(([title, idea, body], i) => {
  const n = String(i + 1).padStart(2, '0');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${title}">${body}</svg>`;
  fs.writeFileSync(out + `logo-${n}.svg`, svg);
  return { n, title, idea, svg };
});
const font = "'Consolas','Cascadia Mono',monospace";
const card = (f) => `<figure class="card"><div class="stage"><span class="mark big">${f.svg}</span><span class="word">DSLKit</span></div><div class="small"><span class="mark s48">${f.svg}</span><span class="mark s32">${f.svg}</span><span class="mark s16">${f.svg}</span><span class="far"><span class="mark s32 blur">${f.svg}</span></span><span class="inv"><span class="mark s32">${f.svg}</span></span></div><figcaption><b>${f.n}. ${f.title}</b><br>${f.idea}</figcaption></figure>`;
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Логотипы DSLKit, вариант 3</title><style>
:root{--bg:#f8f9fc;--surface:#fff;--text:#1c1f2e;--muted:#4a5068;--border:#dde1e9}
@media (prefers-color-scheme:dark){:root{--bg:#10131c;--surface:#1a1f2e;--text:#eef0f6;--muted:#aab0c4;--border:#2d3448}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:1.6rem}p.lead{margin:0 0 20px;color:var(--muted);max-width:64ch}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.card{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
.stage{display:flex;align-items:center;gap:14px;min-height:96px}.big svg{width:88px;height:88px}.word{font:800 1.9rem ${font};letter-spacing:-.02em}
.small{display:flex;align-items:center;gap:10px;margin:12px 0;padding:10px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.s48 svg{width:48px;height:48px}.s32 svg{width:32px;height:32px}.s16 svg{width:16px;height:16px}.mark{display:inline-flex}
.blur svg{filter:blur(1.6px)}.inv{margin-left:auto;background:#fff;padding:5px;border-radius:8px;display:inline-flex}.far{display:inline-flex;margin-left:4px}
@media (prefers-color-scheme:dark){.inv{background:#fff}}
figcaption{font-size:.9rem;color:var(--muted)}figcaption b{color:var(--text)}
</style></head><body><h1>Логотипы DSLKit, вариант 3: крупно и заметно</h1><p class="lead">Сплошные заливки, толстые линии и один сильный силуэт. В каждой карточке: знак 88, 48, 32 и 16 пикселей, размытый 32 (как с большого расстояния) и вариант на белой плашке.</p><div class="grid">${files.map(card).join('')}</div></body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(files.length);
