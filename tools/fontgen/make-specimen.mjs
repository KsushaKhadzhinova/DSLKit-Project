// Writes specimen.html next to the built fonts: every glyph, sample texts and a code sample, to look at the fonts in a browser.
import { writeFileSync } from 'node:fs';
import { GLYPH_TABLE } from './glyphs.mjs';

const out = process.argv[2] ?? new URL('./out/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const chars = Object.keys(GLYPH_TABLE).filter((c) => GLYPH_TABLE[c].draw && c !== ' ');
const groups = {
  'Latin capitals': chars.filter((c) => /[A-Z]/.test(c)),
  'Latin small': chars.filter((c) => /[a-z]/.test(c)),
  'Cyrillic capitals': chars.filter((c) => /[А-ЯЁ]/.test(c)),
  'Cyrillic small': chars.filter((c) => /[а-яё]/.test(c)),
  'Digits and signs': chars.filter((c) => !/[A-Za-zА-Яа-яЁё]/.test(c)),
};
const grid = (family, weight, list) => `<div class="grid" style="font-family:'${family}';font-weight:${weight}">${list.map((c) => `<span>${c.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join('')}</div>`;
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Kubik specimen</title><style>
@font-face{font-family:'Kubik Sans';font-weight:400;src:url(KubikSans-Regular.woff2) format('woff2')}
@font-face{font-family:'Kubik Sans';font-weight:700;src:url(KubikSans-Bold.woff2) format('woff2')}
@font-face{font-family:'Kubik Mono';font-weight:400;src:url(KubikMono-Regular.woff2) format('woff2')}
@font-face{font-family:'Kubik Mono';font-weight:700;src:url(KubikMono-Bold.woff2) format('woff2')}
body{margin:24px;background:#fff;color:#111;font:14px Arial}h2{font:700 15px Arial;margin:22px 0 6px;color:#555}
.grid{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:54px;line-height:1.2}.grid span{display:inline-block;min-width:36px;text-align:center}
.sample{margin:4px 0}.s1{font:400 56px 'Kubik Sans'}.s2{font:700 56px 'Kubik Sans'}.s3{font:400 24px/1.4 'Kubik Sans'}.s4{font:400 16px/1.5 'Kubik Sans'}.s5{font:400 13px/1.4 'Kubik Sans'}
.m1{font:400 28px/1.35 'Kubik Mono'}.m2{font:700 28px/1.35 'Kubik Mono'}.m3{font:400 14px/1.5 'Kubik Mono'}
pre{margin:0}
</style></head><body>
<h2>Sans, regular and bold, big</h2>
<div class="sample s1">DSLKit: диаграммы как код 0123456789</div>
<div class="sample s2">DSLKit: диаграммы как код 0123456789</div>
<h2>Sans, text sizes</h2>
<div class="sample s3">Съешь же ещё этих мягких французских булок, да выпей чаю. The quick brown fox jumps over the lazy dog. «Кавычки» — тире, (скобки), 1:1,618 № 5 @ # % & ? !</div>
<div class="sample s4">Редактор диаграмм «как код»: слева текст, справа рисунок. Ошибки и предупреждения показаны в списке проблем. A diagram editor where the text is on the left and the drawing on the right; errors and warnings are in the list of problems.</div>
<div class="sample s5">Мелкий текст 13 px: Автосохранение через секунду, «Сохранено 22:30». Small text: Saved 22:30, Export to SVG, PNG, JPEG, drawio.</div>
<h2>Mono</h2>
<div class="m1">diagram bpmn "Заказ" 0O 1lI i j<br>start s -> task t1 // Привет, мир!</div>
<div class="m2">diagram bpmn "Заказ" 0O 1lI i j</div>
<pre class="m3">diagram uml sequence "Checkout"
actor Customer
participant Shop "Online shop"
Customer -> Shop : place order   // Съешь ещё этих мягких булок
Shop --> Customer : { "id": 42, "ok": true } [1, 2, 3] ~ ^ | \ / @ # $ % &amp; * + = &lt; &gt;</pre>
${Object.entries(groups).map(([name, list]) => `<h2>${name}: Sans Regular</h2>${grid('Kubik Sans', 400, list)}<h2>${name}: Sans Bold</h2>${grid('Kubik Sans', 700, list)}<h2>${name}: Mono Regular</h2>${grid('Kubik Mono', 400, list)}`).join('')}
</body></html>`;
writeFileSync(`${out}specimen.html`, html);
console.log('specimen written');
