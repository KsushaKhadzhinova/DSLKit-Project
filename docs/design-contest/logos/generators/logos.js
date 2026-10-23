const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-1/';
fs.mkdirSync(out, { recursive: true });
const B = '#2563eb', D = '#1e3a8a', G = '#16a34a', W = '#ffffff', INK = '#1c1f2e', L = '#e8efff';
const st = (c, w = 3) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

// Each mark is drawn in a 64 x 64 box. name: [title, idea, svg body]
const marks = [
  ['Скобки и узел', 'Фигурные скобки как код, точка между ними как узел диаграммы', `<rect width="64" height="64" rx="14" fill="${B}"/><path d="M24 14c-6 0-6 4-6 8v4c0 3-2 6-5 6 3 0 5 3 5 6v4c0 4 0 8 6 8M40 14c6 0 6 4 6 8v4c0 3 2 6 5 6-3 0-5 3-5 6v4c0 4 0 8-6 8" ${st(W)}/><circle cx="32" cy="32" r="4.5" fill="${G}"/>`],
  ['Три узла', 'Два блока и ромб-решение, соединённые линиями, как схема процесса', `<rect width="64" height="64" rx="14" fill="${D}"/><rect x="10" y="12" width="18" height="14" rx="3" fill="${B}"/><rect x="36" y="38" width="18" height="14" rx="3" fill="${G}"/><path d="M28 19h12v19" ${st(W, 2.5)}/><path d="M10 45h18" ${st(W, 2.5)}/><circle cx="19" cy="45" r="3" fill="${W}"/>`],
  ['Монограмма D', 'Буква D, у которой правая дуга превращена в стрелку потока', `<rect width="64" height="64" rx="32" fill="${L}"/><path d="M20 16v32h10c10 0 16-7 16-16S40 16 30 16z" ${st(B, 5)}/><path d="M32 32h20m-6-6l6 6-6 6" ${st(G, 4)}/>`],
  ['Шестиугольник-граф', 'Шестиугольник (как значок пакета) с мини-графом внутри', `<path d="M32 4l24 14v28L32 60 8 46V18z" fill="${B}"/><circle cx="32" cy="22" r="4" fill="${W}"/><circle cx="22" cy="40" r="4" fill="${W}"/><circle cx="42" cy="40" r="4" fill="${G}"/><path d="M32 22L22 40M32 22l10 18M22 40h20" ${st(W, 2.2)}/>`],
  ['Слои', 'Три сдвинутых слоя: схема, код и результат лежат друг на друге', `<rect x="14" y="10" width="38" height="26" rx="5" fill="${L}" stroke="${B}" stroke-width="2.5"/><rect x="10" y="20" width="38" height="26" rx="5" fill="${B}" opacity=".85"/><rect x="6" y="30" width="38" height="26" rx="5" fill="${D}"/><path d="M16 43h18M16 49h10" ${st(W, 2.5)}/>`],
  ['Шеврон в ромбе', 'Угловые скобки внутри ромба-решения из блок-схем', `<path d="M32 4l28 28-28 28L4 32z" fill="${B}"/><path d="M26 22l-10 10 10 10M38 22l10 10-10 10" ${st(W, 4)}/><path d="M34 20l-4 24" ${st(G, 3.5)}/>`],
  ['Сеть Петри', 'Позиция-круг, переход-черта и метка-фишка, нотация из набора DSLKit', `<rect width="64" height="64" rx="14" fill="${L}"/><circle cx="18" cy="32" r="9" ${st(B, 3.5)}/><circle cx="18" cy="32" r="3.5" fill="${B}"/><rect x="31" y="18" width="5" height="28" rx="1.5" fill="${INK}"/><circle cx="50" cy="32" r="7" ${st(G, 3.5)}/><path d="M27 32h4M36 32h7" ${st(INK, 2.5)}/>`],
  ['Лист с диаграммой', 'Страница с загнутым уголком, на ней блок и стрелка', `<path d="M14 6h26l12 12v40H14z" fill="${W}" stroke="${B}" stroke-width="3" stroke-linejoin="round"/><path d="M40 6v12h12" fill="${L}" stroke="${B}" stroke-width="3" stroke-linejoin="round"/><rect x="20" y="28" width="12" height="9" rx="2" fill="${B}"/><rect x="34" y="44" width="12" height="9" rx="2" fill="${G}"/><path d="M26 37v7h8" ${st(INK, 2.5)}/>`],
  ['Дерево-K', 'Буква K из ветвящегося соединителя, как линия связи на схеме', `<rect width="64" height="64" rx="14" fill="${D}"/><path d="M20 12v40" ${st(W, 5)}/><path d="M20 34l22-20M26 29l18 23" ${st(W, 5)}/><circle cx="46" cy="12" r="5" fill="${G}"/><circle cx="46" cy="52" r="5" fill="${G}"/>`],
  ['Пиксельная сетка', 'Сетка из квадратов 5 на 5, из которых сложена буква D (код как пиксели)', `<rect width="64" height="64" rx="12" fill="${INK}"/>${[[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,4],[2,0],[2,4],[3,1],[3,2],[3,3]].map(([x,y],i)=>`<rect x="${12+x*11}" y="${9+y*11}" width="9" height="9" rx="2" fill="${i%5===0?G:W}"/>`).join('')}`],
  ['Код в рамке', 'Знак код-тега в рамке холста', `<rect x="6" y="10" width="52" height="44" rx="8" fill="${W}" stroke="${B}" stroke-width="4"/><path d="M6 22h52" stroke="${B}" stroke-width="4"/><circle cx="14" cy="16" r="1.8" fill="${B}"/><circle cx="21" cy="16" r="1.8" fill="${B}"/><path d="M26 33l-6 6 6 6M38 33l6 6-6 6M34 31l-4 16" ${st(G, 3.5)}/>`],
  ['Цикл текст и схема', 'Две стрелки по кругу: текст превращается в схему, схема в текст', `<circle cx="32" cy="32" r="30" fill="${B}"/><path d="M18 28a15 15 0 0 1 26-6M46 36a15 15 0 0 1-26 6" ${st(W, 4)}/><path d="M46 12v10H36M18 52V42h10" ${st(W, 4)}/><circle cx="32" cy="32" r="4" fill="${G}"/>`],
  ['Развилка', 'Один вход расходится на два выхода: ветвление и решение', `<rect width="64" height="64" rx="14" fill="${L}"/><circle cx="14" cy="32" r="6" fill="${B}"/><path d="M20 32h8c6 0 6-14 14-14M28 32c6 0 6 14 14 14" ${st(INK, 3.5)}/><rect x="42" y="12" width="12" height="12" rx="3" fill="${G}"/><rect x="42" y="40" width="12" height="12" rx="3" fill="${D}"/>`],
  ['Набор инструментов', 'Ящик с ручкой (kit), внутри уголок схемы', `<path d="M22 20v-6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6" ${st(D, 4)}/><rect x="6" y="20" width="52" height="34" rx="7" fill="${B}"/><path d="M6 34h52" stroke="${D}" stroke-width="3"/><rect x="27" y="30" width="10" height="9" rx="2" fill="${W}"/><path d="M20 46h6l3-7M44 46h-6l-3-7" ${st(W, 2.5)}/>`],
  ['Лигатура dk', 'Строчные d и k, у которых общая вертикаль, плюс точка-узел', `<rect width="64" height="64" rx="32" fill="${INK}"/><path d="M28 18v28M28 32c0-6-4-8-8-8s-8 4-8 8 4 8 8 8 8-2 8-8" ${st(W, 4.5)}/><path d="M38 18v28M38 34l12-12M42 33l10 13" ${st(G, 4.5)}/>`],
];

const wordmark = (i) => {
  const fonts = ['Inter, system-ui, sans-serif', 'Georgia, serif', 'Consolas, monospace'];
  return fonts[i % 3];
};
const files = [];
marks.forEach(([title, idea, body], i) => {
  const n = String(i + 1).padStart(2, '0');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${title}">${body}</svg>`;
  fs.writeFileSync(out + `logo-${n}.svg`, svg);
  files.push({ n, title, idea, svg, font: wordmark(i) });
});

const card = (f) => `<figure class="card"><div class="stage"><span class="mark">${f.svg}</span><span class="word" style="font-family:${f.font}">DSLKit</span></div><div class="small"><span class="mark s32">${f.svg}</span><span class="mark s16">${f.svg}</span><span class="dark"><span class="mark s32">${f.svg}</span><span class="word" style="font-family:${f.font}">DSLKit</span></span></div><figcaption><b>${f.n}. ${f.title}</b><br>${f.idea}</figcaption></figure>`;
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Варианты логотипа DSLKit</title><style>
:root{--bg:#f8f9fc;--surface:#fff;--text:#1c1f2e;--muted:#4a5068;--border:#dde1e9}
@media (prefers-color-scheme:dark){:root{--bg:#10131c;--surface:#1a1f2e;--text:#eef0f6;--muted:#aab0c4;--border:#2d3448}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:1.6rem}p.lead{margin:0 0 20px;color:var(--muted);max-width:60ch}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.card{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
.stage{display:flex;align-items:center;gap:12px;min-height:80px}.stage .mark svg{width:72px;height:72px}.word{font-size:1.9rem;font-weight:700}
.small{display:flex;align-items:center;gap:12px;margin:12px 0;padding:10px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.s32 svg{width:32px;height:32px}.s16 svg{width:16px;height:16px}.mark{display:inline-flex}.dark{display:inline-flex;align-items:center;gap:8px;background:#10131c;color:#fff;padding:6px 10px;border-radius:8px;margin-left:auto}.dark .word{font-size:1rem}
figcaption{font-size:.9rem;color:var(--muted)}figcaption b{color:var(--text)}
</style></head><body><h1>15 вариантов логотипа DSLKit</h1><p class="lead">Каждый знак нарисован вручную, цвета взяты из палитры сайта. В карточке: крупный знак с названием, размеры 32 и 16 пикселей (вкладка браузера) и вариант на тёмном фоне.</p><div class="grid">${files.map(card).join('')}</div></body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(files.length);
