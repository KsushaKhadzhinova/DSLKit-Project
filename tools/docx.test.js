import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { lintDocx, markdownToDocx } from './docx.js';
import { crc32, unzip, zip } from './zip.js';

const png = (w, h) => {
  const b = Buffer.alloc(24);
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
};
const read = (p) => (p === 'big.png' ? png(3000, 4000) : png(400, 300));

const ru = [
  '# Практическое занятие №3. Тема работы',
  '',
  '## 1 Цель работы',
  '',
  'Изучить `code` и **важное** слово.',
  'Вторая строка абзаца.',
  '',
  '### 1.1 Подраздел',
  '',
  'Таблица описана в таблице 1.',
  '',
  'Таблица 1 – Данные',
  '',
  '| a | b |',
  '|---|---|',
  '| 1 | 2 |',
  '| 3 | 4 |',
  '',
  'Результат на рисунке 1.',
  '',
  '![Схема](a.png)',
  '',
  'Рисунок 1 – Схема',
  '',
  '![Большая](big.png)',
  '',
  '## 4 Ответы на контрольные вопросы',
  '',
  '25. Вопрос?',
  '',
  '    Ответ & <теги>.',
  '',
  '## Заключение',
  '',
  'Готово.',
  '',
  '## Приложение А (обязательное) Листинг файла app.js',
  '',
  '```js',
  'const a = 1;',
  '  if (a) {',
  '    run();',
  '  }',
  '```',
  '',
  '## Приложение Б (обязательное) Листинг шаблона index.ejs',
  '',
  '```ejs',
  '<p></p>',
  '```',
  '',
  '## Приложение В (обязательное) Прочее',
  '',
  '```txt',
  'x',
  '```',
  '',
].join('\n');

const en = ru
  .replace('# Практическое занятие №3. Тема работы', '# Practical Session 3. Work topic')
  .replace('## Заключение', '## Conclusion')
  .replace(/Приложение (.) \(обязательное\) Листинг файла/, 'Appendix $1 (mandatory) Listing of the file')
  .replace(/Приложение (.) \(обязательное\) Листинг шаблона/, 'Appendix $1 (mandatory) Listing of the template')
  .replace(/Приложение (.) \(обязательное\) Прочее/, 'Appendix $1 (mandatory) Other');

const xmlOf = (buf, name = 'word/document.xml') => unzip(buf)[name].toString('utf8');
const build = (md, lang = 'ru') => markdownToDocx(md, { lang, variant: 26, read });
const rezip = (buf, change) => {
  const files = unzip(buf);
  for (const [name, fn] of Object.entries(change)) files[name] = Buffer.from(fn(files[name].toString('utf8')));
  return zip(files);
};

test('zip round trip keeps names and content, and the checksum matches', () => {
  const files = { 'a.txt': 'привет', 'dir/b.bin': Buffer.from([1, 2, 3]) };
  const out = unzip(zip(files));
  assert.equal(out['a.txt'].toString('utf8'), 'привет');
  assert.deepEqual([...out['dir/b.bin']], [1, 2, 3]);
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('unzip reads deflated entries too', () => {
  const data = Buffer.from('hello hello hello hello');
  const packed = deflateRawSync(data);
  const name = Buffer.from('x.txt');
  const u16 = (n) => Buffer.from([n & 255, n >> 8]);
  const u32 = (n) => Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255, n >>> 24]);
  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(0),
    u32(crc32(data)),
    u32(packed.length),
    u32(data.length),
    u16(name.length),
    u16(0),
    name,
    packed,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(0),
    u32(crc32(data)),
    u32(packed.length),
    u32(data.length),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    name,
  ]);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0)]);
  assert.equal(unzip(Buffer.concat([local, central, end]))['x.txt'].toString(), 'hello hello hello hello');
});

test('the package has the parts, the page setup and the styles the rules ask for', () => {
  const buf = build(ru);
  const files = unzip(buf);
  for (const part of [
    '[Content_Types].xml',
    '_rels/.rels',
    'word/document.xml',
    'word/styles.xml',
    'word/settings.xml',
    'word/footer1.xml',
    'word/footer2.xml',
    'word/media/image1.png',
    'word/media/image2.png',
  ])
    assert.ok(files[part], part);
  const xml = xmlOf(buf);
  assert.match(xml, /<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/);
  assert.match(xml, /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.ok(xml.includes('<w:titlePg/>'));
  assert.ok(xml.includes('TOC \\o "1-2"'));
  assert.match(xml, /ПРИЛОЖЕНИЕ А/);
  assert.match(xml, /Листинг А\.1 – Файл app\.js/);
  assert.match(xml, /Листинг Б\.1 – Шаблон index\.ejs/);
  assert.match(xml, /Листинг В\.1 – Прочее/);
  assert.match(xml, /«Тема работы»/);
  assert.match(xml, /по практическому занятию № 3/);
  assert.match(xml, /Ответ &amp; &lt;теги&gt;\./);
  assert.match(xml, /ЦЕЛЬ РАБОТЫ/);
  const styles = xmlOf(buf, 'word/styles.xml');
  assert.match(styles, /w:styleId="Normal"[\s\S]*?w:firstLine="709"[\s\S]*?w:jc w:val="both"/);
  assert.match(styles, /w:styleId="Heading1"[\s\S]*?<w:pageBreakBefore\/>/);
  assert.match(styles, /Courier New/);
  assert.match(xmlOf(buf, 'word/settings.xml'), /updateFields/);
  assert.match(xmlOf(buf, 'word/footer1.xml'), / PAGE /);
  assert.ok(!xmlOf(buf, 'word/footer2.xml').includes('PAGE'));
  assert.deepEqual(lintDocx(buf), []);
});

test('the unnumbered part is centred, the images are scaled into the text area', () => {
  const xml = xmlOf(build(ru));
  assert.match(xml, /ЗАКЛЮЧЕНИЕ/);
  assert.match(xml, /<w:jc w:val="center"\/><\/w:pPr><w:r><w:rPr><\/w:rPr><w:t xml:space="preserve">ЗАКЛЮЧЕНИЕ/);
  const extents = [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.equal(extents.length, 2);
  assert.ok(extents.every(([cx, cy]) => cx <= 5940000 && cy <= 7920000));
  assert.deepEqual(extents[0], [3810000, 2857500]);
  assert.ok(xml.includes('keepNext'));
  assert.ok(xml.includes('cantSplit'));
});

test('code lines keep their indent as non-breaking spaces and the listing caption names the appendix', () => {
  const xml = xmlOf(build(ru));
  assert.ok(xml.includes('  if (a) {'));
  assert.ok(!/<w:t[^>]*> +[a-z]/.test(xml));
});

test('the English build uses the English title page and names', () => {
  const buf = build(en, 'en');
  const xml = xmlOf(buf);
  assert.match(xml, /on practical work No\. 3/);
  assert.match(xml, /Listing ..1 – File app\.js/);
  assert.match(xml, /Listing ..1 – Template index\.ejs/);
  assert.match(xml, /APPENDIX ./);
  assert.match(xml, /CONCLUSION/);
  assert.match(xml, /Variant No\. 26/);
  assert.deepEqual(lintDocx(buf), []);
});

test('a title without a number or a topic still builds', () => {
  const xml = xmlOf(build('# Работа\n\n## 1 Цель работы\n\nТекст.\n'));
  assert.match(xml, /по практическому занятию № 1/);
  assert.match(xml, /«Работа»/);
  assert.match(xmlOf(build('# Work 2\n\n## 1 Purpose of the Work\n\nText.\n', 'en')), /No\. 2/);
});

test('lintDocx reports every rule it knows', () => {
  const base = build(ru);
  const has = (buf, part) =>
    assert.ok(
      lintDocx(buf).some((e) => e.includes(part)),
      part,
    );
  has(rezip(base, { 'word/document.xml': (x) => x.replace('<w:b/>', '<w:i/>') }), 'Italic');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('Вторая строка', '<w:tab/>Вторая') }), 'Tab');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('w:left="1701"', 'w:left="1000"') }), 'Margins');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('<w:titlePg/>', '') }), 'title page');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('TOC \\o', 'XX \\o') }), 'table of contents');
  has(rezip(base, { 'word/styles.xml': (x) => x.replace('Times New Roman', 'Calibri') }), 'Fonts');
  has(rezip(base, { 'word/styles.xml': (x) => x.replace('<w:pageBreakBefore/>', '') }), 'new page');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('Вторая строка', ' Вторая  строка') }), 'Spaces');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('Вторая строка', 'Вторая строка ') }), 'Spaces');
});
