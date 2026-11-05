import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'site/design/mockups';
const TITLES = {
  moodboard: 'Мудборд и образцы',
  foundations: 'Палитра и типографика',
  'mockups-site': 'Макеты сайта',
  'mockups-app': 'Макеты приложения',
  components: 'Компоненты и элементы интерфейса',
  wireframes: 'Каркасы (wireframes)',
  'device-mockups': 'Мокапы на устройствах',
};
const AB = [
  ['desktop', 'Десктоп 1440 px'],
  ['mobile', 'Телефон 390 px'],
];
const abBlocks = AB.map(
  ([device, title]) => `<section class="ab"><h2>A/B: первый экран, ${title}</h2>
<div class="pair">
<figure><span class="tag">A</span><a href="ab-tests/ab-landing-${device}-ru-a.svg"><img src="ab-tests/ab-landing-${device}-ru-a.svg" alt="Вариант A" loading="lazy" /></a><figcaption><b>A, как сейчас на сайте.</b> Плоская синяя панель, на ней светлая кнопка «Создать диаграмму», заголовок обычного интервала, фон без рисунка.</figcaption></figure>
<figure><span class="tag">B</span><a href="ab-tests/ab-landing-${device}-ru-b.svg"><img src="ab-tests/ab-landing-${device}-ru-b.svg" alt="Вариант B" loading="lazy" /></a><figcaption><b>B, ближе к SaaS-референсам.</b> Основная синяя кнопка без панели, точечная сетка на фоне первого экрана, плотный заголовок, вторичные кнопки рядом.</figcaption></figure>
</div></section>`,
).join('\n');
const sections = Object.keys(TITLES)
  .filter((group) => statSync(join(ROOT, group), { throwIfNoEntry: false })?.isDirectory())
  .map((group) => {
    const files = readdirSync(join(ROOT, group)).filter((name) => name.endsWith('.svg'));
    const cards = files
      .map(
        (name) =>
          `<figure><a href="${group}/${name}"><img src="${group}/${name}" alt="${name}" loading="lazy" /></a><figcaption>${name.replace('.svg', '')}</figcaption></figure>`,
      )
      .join('\n');
    return `<section><h2>${TITLES[group]} <small>${files.length}</small></h2><div class="grid">\n${cards}\n</div></section>`;
  })
  .join('\n');
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Макеты DSLKit на согласование</title>
<style>
body{margin:0;padding:24px;background:#f1f3f9;color:#1c1f2e;font-family:Inter,system-ui,sans-serif}
h1{margin:0 0 8px}h2{margin:40px 0 16px}small{color:#6b7285;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
figure{margin:0;padding:12px;background:#fff;border:1px solid #dde1e9;border-radius:12px}
img{display:block;width:100%;height:auto;max-height:420px;object-fit:contain;object-position:top;border-radius:6px;background:#eee}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}
.pair figure{position:relative}
.tag{position:absolute;top:8px;left:8px;z-index:1;padding:2px 12px;border-radius:12px;background:#2563eb;color:#fff;font-weight:700}
.pair img{max-height:760px}
figcaption{margin-top:8px;font-size:13px;color:#4a5068;overflow-wrap:anywhere}
</style>
</head>
<body>
<h1>Макеты DSLKit на согласование</h1>
<p>Русский и английский варианты, светлая и тёмная темы. Нажмите на картинку, чтобы открыть макет целиком.</p>
${abBlocks}
${sections}
</body>
</html>
`;
writeFileSync(join(ROOT, 'index.html'), html);
console.log('gallery written');
