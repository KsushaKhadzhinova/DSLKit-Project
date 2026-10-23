const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-6/';
fs.mkdirSync(out, { recursive: true });

const LIGHT = { a: '#2563eb', b: '#16a34a', c: '#f59e0b', bg: '#ffffff' };
const DARK = { a: '#60a5fa', b: '#4ade80', c: '#fbbf24', bg: '#0f172a' };
const MONO = { a: '#111111', b: '#111111', c: '#111111', bg: '#ffffff' };
const MONOW = { a: '#ffffff', b: '#ffffff', c: '#ffffff', bg: '#111111' };

// Compact icons in a 64 x 64 box. Classes (spin, pulse, chev, draw, guide) animate only inside .load.
const concepts = [
{name:"K из трёх узлов",idea:"Стойка и две ветви заканчиваются цветными точками: синяя, зелёная, янтарная. Как граф, как твои инициалы, тёплый акцент вместо холодной «технарской» гаммы",mark:({a,b,c,bg})=>`<rect x="8" y="6" width="13" height="52" rx="5" fill="${a}"/><path d="M21 32L46 13M21 32L46 51" fill="none" stroke="${a}" stroke-width="9" stroke-linecap="round"/><circle class="hop" cx="50" cy="12" r="9" fill="${b}"/><circle class="hop" cx="50" cy="52" r="9" fill="${c}"/>`},
{name:"K и галочка",idea:"Стойка K и зелёная галочка «сделано»: автоматизация, которая закрывает задачу за тебя",mark:({a,b,c,bg})=>`<rect x="8" y="6" width="13" height="52" rx="5" fill="${a}"/><path class="draw" d="M24 38l12 12L56 14" fill="none" stroke="${b}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`},
{name:"Штамп-K",idea:"Круглая печать с зубчатым краем, как наклейка в планере или трекере. Личная вещь, а не корпоративный знак",mark:({a,b,c,bg})=>`${[...Array(12)].map((_,k)=>`<circle cx="${32+26*Math.cos(k*Math.PI/6)}" cy="${32+26*Math.sin(k*Math.PI/6)}" r="6.500" fill="${a}"/>`).join("")}<circle cx="32" cy="32" r="26" fill="${a}"/><rect x="21" y="17" width="8" height="30" rx="3" fill="${bg}"/><path d="M29 32L43 18M29 32L43 46" fill="none" stroke="${bg}" stroke-width="7" stroke-linecap="round"/><circle class="hop" cx="50" cy="12" r="6" fill="${b}"/>`},
{name:"Закладка-K",idea:"Закладка с вырезом, внутри K и зелёная точка: «моё», сохранённое, как в планере или читалке",mark:({a,b,c,bg})=>`<path d="M12 4h40v56L32 46 12 60z" fill="${a}"/><rect x="22" y="14" width="8" height="24" rx="3" fill="${bg}"/><path d="M30 26L42 16M30 26L42 36" fill="none" stroke="${bg}" stroke-width="6" stroke-linecap="round"/><circle class="hop" cx="32" cy="46" r="0" fill="${b}"/><circle class="hop" cx="47" cy="12" r="5" fill="${c}"/>`}
];

const svg = (c, pal, size = 64, cls = '') => `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${c.name}">${c.mark(pal)}</svg>`;
const lock = (c, pal, text) => `<span class="lock" style="color:${text}"><span class="m">${svg(c, pal, 48)}</span><span class="w"><b style="color:${pal.a}">DSL</b><b style="color:${pal.b}">K</b><span>it</span></span></span>`;

concepts.forEach((c, i) => {
  const n = String(i + 1).padStart(2, '0');
  fs.writeFileSync(out + `icon-${n}-light.svg`, svg(c, LIGHT));
  fs.writeFileSync(out + `icon-${n}-dark.svg`, svg(c, DARK));
  fs.writeFileSync(out + `icon-${n}-mono.svg`, svg(c, MONO));
});

const appIcon = (c) => `<span class="app" style="background:#2563eb">${svg(c, { a: '#fff', b: '#bbf7d0', c: '#fde68a', bg: '#2563eb' }, 64)}</span>`;
const card = (c, i) => {
  const n = String(i + 1).padStart(2, '0');
  return `<section class="card"><h2>${n}. ${c.name}</h2><p class="idea">${c.idea}</p>
<div class="r"><div class="p l">${lock(c, LIGHT, '#1c1f2e')}</div><div class="p d">${lock(c, DARK, '#eef0f6')}</div></div>
<div class="r"><div class="p l">${lock(c, MONO, '#111')}<small>чёрно-белая печать</small></div><div class="p k">${lock(c, MONOW, '#fff')}<small>белый на чёрном</small></div></div>
<div class="r s"><div class="p l"><span class="sz">${svg(c, LIGHT, 16)}${svg(c, LIGHT, 32)}${svg(c, LIGHT, 48)}</span><small>16, 32, 48 пикселей</small></div><div class="p l">${appIcon(c)}<small>иконка приложения</small></div><div class="p l load"><span class="spinner">${svg(c, LIGHT, 64)}</span><small>загрузка</small></div></div></section>`;
};
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Логотипы DSLKit, вариант 4</title><style>
:root{--bg:#f8f9fc;--surface:#fff;--text:#1c1f2e;--muted:#4a5068;--border:#dde1e9}
@media (prefers-color-scheme:dark){:root{--bg:#10131c;--surface:#1a1f2e;--text:#eef0f6;--muted:#aab0c4;--border:#2d3448}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:1.6rem}h2{margin:0;font-size:1.15rem}p.lead{margin:0 0 20px;color:var(--muted);max-width:66ch}.idea{margin:2px 0 12px;color:var(--muted);font-size:.9rem}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:18px}
.r{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.r.s{grid-template-columns:repeat(3,1fr)}
.p{border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;justify-content:center;min-height:80px}
.p.l{background:#fff;color:#1c1f2e}.p.d{background:#0f172a}.p.k{background:#111}.p small{font-size:.75rem;opacity:.7}
.lock{display:inline-flex;align-items:center;gap:10px}.w{font:800 1.7rem 'Cascadia Mono',Consolas,monospace;letter-spacing:-.03em}.w span{font-weight:500}
.sz{display:inline-flex;align-items:flex-end;gap:12px}.app{display:inline-flex;width:84px;height:84px;border-radius:19px;align-items:center;justify-content:center}.app svg{width:56px;height:56px}
.spin{transform-origin:32px 32px}.load .spin{animation:spin 3s linear infinite}.load .pulse{animation:pulse 1.6s ease-in-out infinite}
.load .chev{animation:blink 1.2s ease-in-out infinite}.load .c2{animation-delay:.25s}.load .draw{stroke-dasharray:40;animation:draw 1.6s ease-in-out infinite}
.load .guide{stroke-dasharray:60;animation:draw2 2s ease-in-out infinite}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:0;transform:scale(1)}50%{opacity:.5}}
@keyframes blink{0%,100%{opacity:.2}50%{opacity:1}}@keyframes draw{0%{stroke-dashoffset:40}60%,100%{stroke-dashoffset:0}}@keyframes draw2{0%{stroke-dashoffset:60}60%,100%{stroke-dashoffset:0}}
.pulse{transform-origin:32px 27px}@media (prefers-reduced-motion:reduce){.load *{animation:none!important}}
.load .hop{animation:hop 1.4s ease-in-out infinite}@keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@media (max-width:620px){.r,.r.s{grid-template-columns:1fr}}
</style></head><body><h1>Логотипы DSLKit, вариант 6: личный, не шаблонный</h1><p class="lead">Бриф: пользователи сервиса, знак слева сверху в шапке, фавикон, иконка приложения и анимация загрузки. Слова: изобретательность, автоматизация, чёткость. Буквы DSL в названии, K выделена зелёным как отражение имени. Для каждого знака: светлая и тёмная версии, одноцветная печать, размеры 16, 32, 48 и анимированная загрузка.</p>${concepts.map(card).join('')}</body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(concepts.length);
