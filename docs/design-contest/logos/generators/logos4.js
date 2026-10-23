const fs = require('fs');
const out = 'E:/DSLKit-Project/docs/design-contest/logos/set-4/';
fs.mkdirSync(out, { recursive: true });

const LIGHT = { a: '#2563eb', b: '#16a34a', bg: '#ffffff' };
const DARK = { a: '#60a5fa', b: '#4ade80', bg: '#0f172a' };
const MONO = { a: '#111111', b: '#111111', bg: '#ffffff' };
const MONOW = { a: '#ffffff', b: '#ffffff', bg: '#111111' };

// Compact icons in a 64 x 64 box. Classes (spin, pulse, chev, draw, guide) animate only inside .load.
const concepts = [
  {
    name: 'Шестерня D',
    idea: 'Шестерня значит автоматизация, внутри буква D, зелёная искра сверху справа значит изобретательность',
    mark: ({ a, b, bg }) => `<g class="spin">${[0, 45, 90, 135].map((r) => `<rect x="28" y="3" width="8" height="58" rx="3" fill="${a}" transform="rotate(${r} 32 32)"/>`).join('')}<circle cx="32" cy="32" r="21" fill="${a}"/><circle cx="32" cy="32" r="13" fill="${bg}"/></g><path d="M26 25h6c5.5 0 8 3 8 7s-2.500 7-8 7h-6z" fill="${a}"/><circle cx="53" cy="11" r="6" fill="${b}"/>`,
  },
  {
    name: 'Конвейер DSL',
    idea: 'Плитка D и три стрелки вправо: данные идут по цепочке, автоматизация читается без слов',
    mark: ({ a, b, bg }) => `<rect x="3" y="9" width="36" height="46" rx="9" fill="${a}"/><path d="M14 22h8c8 0 12 4 12 10s-4 10-12 10h-8z" fill="${bg}"/><path class="chev c1" d="M43 24l7 8-7 8" fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path class="chev c2" d="M52 24l7 8-7 8" fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    name: 'K-стрела',
    idea: 'Буква K как отражение имени: стойка и две ветви, верхняя заканчивается стрелкой, нижняя узлом',
    mark: ({ a, b }) => `<rect x="10" y="6" width="11" height="52" rx="4" fill="${a}"/><path class="draw" d="M22 34L46 14" fill="none" stroke="${b}" stroke-width="10" stroke-linecap="round"/><path d="M37 11h14v14" fill="none" stroke="${b}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 34l22 20" fill="none" stroke="${a}" stroke-width="10" stroke-linecap="round"/><circle cx="52" cy="55" r="6" fill="${a}"/>`,
  },
  {
    name: 'Лампа-схема',
    idea: 'Лампочка значит идея и изобретательность, внутри мини-схема из трёх узлов',
    mark: ({ a, b, bg }) => `<circle class="pulse" cx="32" cy="27" r="22" fill="${b}" opacity=".0"/><circle cx="32" cy="27" r="20" fill="${a}"/><rect x="23" y="47" width="18" height="7" rx="3.500" fill="${a}"/><rect x="26" y="56" width="12" height="5" rx="2.500" fill="${a}"/><path d="M23 33L32 20l9 13z" fill="none" stroke="${bg}" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="20" r="4.500" fill="${b}"/><circle cx="23" cy="33" r="4" fill="${bg}"/><circle cx="41" cy="33" r="4" fill="${bg}"/>`,
  },
  {
    name: 'Направляющие D',
    idea: 'Плотная D и направляющие как в редакторе: линии выравнивания значат чёткость и точность',
    mark: ({ a, b, bg }) => `<path class="guide" d="M4 12H60M4 52H60M14 3V61" fill="none" stroke="${b}" stroke-width="3" stroke-linecap="round"/><path d="M14 12h14c14 0 22 8 22 20s-8 20-22 20H14z" fill="${a}"/><path d="M24 22v20h4c7 0 10-4 10-10s-3-10-10-10z" fill="${bg}"/><rect x="11" y="9" width="6" height="6" rx="1.500" fill="${bg}" stroke="${b}" stroke-width="2"/><rect x="11" y="49" width="6" height="6" rx="1.500" fill="${bg}" stroke="${b}" stroke-width="2"/>`,
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

const appIcon = (c) => `<span class="app" style="background:#2563eb">${svg(c, { a: '#fff', b: '#bbf7d0', bg: '#2563eb' }, 64)}</span>`;
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
@media (max-width:620px){.r,.r.s{grid-template-columns:1fr}}
</style></head><body><h1>Логотипы DSLKit, вариант 4: по брифу</h1><p class="lead">Бриф: пользователи сервиса, знак слева сверху в шапке, фавикон, иконка приложения и анимация загрузки. Слова: изобретательность, автоматизация, чёткость. Буквы DSL в названии, K выделена зелёным как отражение имени. Для каждого знака: светлая и тёмная версии, одноцветная печать, размеры 16, 32, 48 и анимированная загрузка.</p>${concepts.map(card).join('')}</body></html>`;
fs.writeFileSync(out + 'index.html', html);
console.log(concepts.length);
