const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-2/';
fs.mkdirSync(out, { recursive: true });
const B = '#2563eb', D = '#14213d', G = '#16a34a', W = '#ffffff', L = '#e8efff';
const ln = (c, w = 2) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const tile = (c = D) => `<rect width="64" height="64" rx="10" fill="${c}"/>`;
// small arrow head at (x,y) pointing in direction d (r right, l left, u up, d down)
const head = (x, y, d, c, s = 4) => {
  const p = { r: `M${x - s} ${y - s}L${x} ${y}L${x - s} ${y + s}`, l: `M${x + s} ${y - s}L${x} ${y}L${x + s} ${y + s}`, u: `M${x - s} ${y + s}L${x} ${y}L${x + s} ${y + s}`, d: `M${x - s} ${y - s}L${x} ${y}L${x + s} ${y - s}` }[d];
  return `<path d="${p}" ${ln(c, 2)}/>`;
};
const corners = (c) => `<path d="M6 14V6h8M50 6h8v8M58 50v8h-8M14 58H6v-8" ${ln(c, 1.5)}/>`;

const marks = [
  ['Функциональный блок IDEF0', 'Блок с четырьмя стрелками ICOM: вход, выход, управление, механизм. Знак нотации, с которой работает редактор', `${tile()}<rect x="18" y="20" width="28" height="24" rx="2" ${ln(W)}/>${'<path d="M6 32h12" ' + ln(G) + '/>'}${head(18, 32, 'r', G)}<path d="M46 32h12" ${ln(W)}/>${head(58, 32, 'r', W)}<path d="M32 6v14" ${ln(B, 2.5)}/>${head(32, 20, 'd', B)}<path d="M32 58V44" ${ln(W)}/>${head(32, 44, 'u', W)}<path d="M27 28h10M27 34h6" ${ln(W, 1.5)}/>`],
  ['Чертёжная рамка', 'Угловые метки как на чертеже, внутри контур D и скобка кода', `${tile()}${corners(G)}<path d="M20 18v28h8c9 0 14-6 14-14s-5-14-14-14z" ${ln(W, 2.5)}/><path d="M46 24l6 8-6 8" ${ln(B, 2.5)}/><circle cx="20" cy="18" r="2.2" fill="${G}"/><circle cx="20" cy="46" r="2.2" fill="${G}"/>`],
  ['Вилка ER', 'Две сущности и связь «один ко многим» с «вороньей лапкой»', `${tile()}<rect x="7" y="22" width="16" height="20" rx="2" ${ln(W)}/><path d="M7 29h16" ${ln(W, 1.5)}/><path d="M23 32h14" ${ln(G, 2.5)}/><path d="M37 32l8-9M37 32l8 0M37 32l8 9" ${ln(G, 2.5)}/><rect x="45" y="14" width="13" height="36" rx="2" ${ln(W)}/><path d="M45 21h13M45 28h13" ${ln(W, 1.5)}/><path d="M26 26v12" ${ln(G, 2.5)}/>`],
  ['Класс UML', 'Блок из трёх секций: имя, поля, методы. Зелёный маркер у метода', `${tile(B)}<rect x="14" y="10" width="36" height="44" rx="3" ${ln(W)}/><path d="M14 23h36M14 38h36" ${ln(W, 1.8)}/><path d="M20 17h14" ${ln(W, 2)}/><path d="M20 30h20" ${ln(W, 1.6)}/><circle cx="21" cy="46" r="2.6" fill="${G}"/><path d="M27 46h16" ${ln(W, 1.6)}/>`],
  ['Циркуль', 'Чертёжный циркуль вычерчивает окружность, на ней узел графа', `${tile()}<path d="M32 10v8" ${ln(W, 3)}/><path d="M32 18L20 52M32 18l12 34" ${ln(W, 2.5)}/><path d="M26 38h12" ${ln(W, 1.8)}/><path d="M12 52a22 22 0 0 0 40 0" ${ln(B, 2)} stroke-dasharray="3 3"/><circle cx="20" cy="52" r="2.5" fill="${G}"/><circle cx="44" cy="52" r="2.5" fill="${W}"/>`],
  ['Линии жизни', 'Диаграмма последовательности: две линии жизни и стрелка-сообщение', `${tile()}<rect x="8" y="8" width="18" height="9" rx="2" fill="${B}"/><rect x="38" y="8" width="18" height="9" rx="2" fill="${W}"/><path d="M17 17v39M47 17v39" ${ln(W, 1.8)} stroke-dasharray="3 3"/><path d="M17 28h28" ${ln(G, 2.5)}/>${head(45, 28, 'r', G)}<path d="M47 42H19" ${ln(W, 2)} stroke-dasharray="4 3"/>${head(19, 42, 'l', W)}`],
  ['Автомат', 'Начальная точка, состояние и конечное состояние диаграммы состояний', `${tile()}<circle cx="11" cy="32" r="4" fill="${G}"/><path d="M15 32h8" ${ln(G, 2.2)}/>${head(23, 32, 'r', G)}<rect x="24" y="22" width="18" height="20" rx="6" ${ln(W, 2.2)}/><path d="M42 32h6" ${ln(W, 2.2)}/><circle cx="54" cy="32" r="5.5" ${ln(W, 2)}/><circle cx="54" cy="32" r="2.6" fill="${B}"/><path d="M29 32h8" ${ln(W, 1.6)}/>`],
  ['Сеть Петри', 'Позиции-круги, переход-черта, фишка и дуги со стрелками', `${tile()}<circle cx="14" cy="32" r="8" ${ln(W)}/><circle cx="14" cy="32" r="3" fill="${G}"/><rect x="31" y="18" width="4" height="28" fill="${B}"/><circle cx="52" cy="20" r="6" ${ln(W)}/><circle cx="52" cy="44" r="6" ${ln(W)}/><path d="M22 32h9" ${ln(W, 1.8)}/><path d="M35 26L46 22M35 38l11 4" ${ln(W, 1.8)}/>${head(46, 22, 'r', W, 3)}${head(46, 42, 'r', W, 3)}`],
  ['Монограмма с размерной линией', 'Буквы D и K из чертёжных линий и размерная стрелка снизу', `${tile()}<path d="M12 12v32M12 12h7c9 0 12 6 12 16s-3 16-12 16h-7" ${ln(W, 3)}/><path d="M38 12v32M38 28l14-16M42 25l11 19" ${ln(W, 3)}/><path d="M10 54h44" ${ln(G, 1.8)}/><path d="M14 51l-4 3 4 3M50 51l4 3-4 3" ${ln(G, 1.8)}/>`],
  ['Каркасный куб', 'Изометрический куб-конструктор, узлы на вершинах', `${tile()}<path d="M32 8l20 11v22L32 52 12 41V19zM32 30v22M12 19l20 11 20-11" ${ln(W, 2)}/><circle cx="32" cy="30" r="3.5" fill="${G}"/><circle cx="32" cy="8" r="2.4" fill="${B}"/><circle cx="52" cy="19" r="2.4" fill="${B}"/><circle cx="12" cy="19" r="2.4" fill="${B}"/><circle cx="32" cy="52" r="2.4" fill="${B}"/>`],
  ['Выноска размера', 'Прямоугольный блок с размерными стрелками, как на чертеже детали', `${tile(L)}<rect x="14" y="16" width="36" height="24" rx="2" fill="${B}"/><path d="M14 44v6M50 44v6M14 48h36" ${ln(D, 1.6)}/><path d="M18 45l-4 3 4 3M46 45l4 3-4 3" ${ln(D, 1.6)}/><path d="M54 16h4M54 40h4M56 16v24" ${ln(D, 1.6)}/><path d="M22 28h20" ${ln(W, 2.2)}/><circle cx="32" cy="34" r="2" fill="${G}"/>`],
  ['Поток данных', 'Процесс-круг с входящей и исходящей стрелкой и хранилище DFD', `${tile()}<circle cx="32" cy="26" r="12" ${ln(W)}/><text x="32" y="30" text-anchor="middle" font-family="Consolas,monospace" font-size="11" font-weight="700" fill="${W}">DS</text><path d="M4 26h16" ${ln(G, 2.4)}/>${head(20, 26, 'r', G)}<path d="M44 26h14" ${ln(W, 2)}/>${head(58, 26, 'r', W)}<path d="M32 38v8" ${ln(B, 2.4)}/>${head(32, 46, 'd', B)}<path d="M14 56h36M14 50h36" ${ln(W, 1.8)}/>`],
  ['Блок-схема', 'Терминатор, процесс и решение, собранные в вертикальную цепочку', `${tile()}<rect x="21" y="5" width="22" height="10" rx="5" ${ln(W, 1.8)}/><path d="M32 15v5" ${ln(W, 1.8)}/><rect x="20" y="20" width="24" height="11" rx="2" fill="${B}"/><path d="M32 31v4" ${ln(W, 1.8)}/><path d="M32 35l12 9-12 9-12-9z" ${ln(G, 2.2)}/><path d="M44 44h10v-34" ${ln(W, 1.8)}/><path d="M32 53v3" ${ln(W, 1.8)}/>`],
  ['Прицел точности', 'Скобки и перекрестие: точка регистрации, символ чертёжного знака', `${tile()}<path d="M20 10h-8v44h8M44 10h8v44h-8" ${ln(W, 3)}/><circle cx="32" cy="32" r="9" ${ln(G, 2.2)}/><path d="M32 18v10M32 36v10M18 32h10M36 32h10" ${ln(W, 2)}/><circle cx="32" cy="32" r="2.4" fill="${B}"/>`],
  ['Граф DAG', 'Узлы три на три, подсвечен путь через граф', `${tile()}<path d="M14 14L32 14 50 14M14 14l0 18M32 14l0 18 18 18M14 32h18M14 32l0 18M32 32l18 18M50 14l0 36M14 50h36" ${ln('#3a4a6b', 1.6)}/><path d="M14 14h18v18l18 18" ${ln(G, 3)}/><circle cx="14" cy="14" r="4" fill="${G}"/><circle cx="32" cy="14" r="3.2" fill="${W}"/><circle cx="32" cy="32" r="3.2" fill="${W}"/><circle cx="50" cy="50" r="4" fill="${B}"/><circle cx="14" cy="32" r="3.2" fill="${W}"/><circle cx="14" cy="50" r="3.2" fill="${W}"/><circle cx="50" cy="14" r="3.2" fill="${W}"/><circle cx="32" cy="50" r="3.2" fill="${W}"/><circle cx="50" cy="32" r="3.2" fill="${W}"/>`],
];

const files = marks.map(([title, idea, body], i) => {
  const n = String(i + 1).padStart(2, '0');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${title}">${body}</svg>`;
  fs.writeFileSync(out + `logo-${n}.svg`, svg);
  return { n, title, idea, svg };
});
const font = "'Consolas','Cascadia Mono',monospace";
const card = (f) => `<figure class="card"><div class="stage"><span class="mark">${f.svg}</span><span class="word">DSLKit</span></div><div class="small"><span class="mark s32">${f.svg}</span><span class="mark s16">${f.svg}</span><span class="dark"><span class="mark s32">${f.svg}</span><span class="word">DSLKit</span></span></div><figcaption><b>${f.n}. ${f.title}</b><br>${f.idea}</figcaption></figure>`;
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Логотипы DSLKit, вариант 2</title><style>
:root{--bg:#f8f9fc;--surface:#fff;--text:#1c1f2e;--muted:#4a5068;--border:#dde1e9}
@media (prefers-color-scheme:dark){:root{--bg:#10131c;--surface:#1a1f2e;--text:#eef0f6;--muted:#aab0c4;--border:#2d3448}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:1.6rem}p.lead{margin:0 0 20px;color:var(--muted);max-width:62ch}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.card{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
.stage{display:flex;align-items:center;gap:12px;min-height:80px}.stage .mark svg{width:72px;height:72px}.word{font:700 1.8rem ${font};letter-spacing:-.02em}
.small{display:flex;align-items:center;gap:12px;margin:12px 0;padding:10px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.s32 svg{width:32px;height:32px}.s16 svg{width:16px;height:16px}.mark{display:inline-flex}.dark{display:inline-flex;align-items:center;gap:8px;background:#0b0e16;color:#fff;padding:6px 10px;border-radius:8px;margin-left:auto}.dark .word{font-size:1rem}
figcaption{font-size:.9rem;color:var(--muted)}figcaption b{color:var(--text)}
</style></head><body><h1>Логотипы DSLKit, вариант 2: строгий технический стиль</h1><p class="lead">Знаки собраны из элементов нотаций и чертежа: блок IDEF0, «воронья лапка» ER, линии жизни, сеть Петри, размерные стрелки. Линия везде одной толщины, цвета те же, что на сайте.</p><div class="grid">${files.map(card).join('')}</div></body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(files.length);
