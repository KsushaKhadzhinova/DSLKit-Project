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
const read = (p) => (p === 'big.png' ? png(3000, 2000) : p === 'tall.png' ? png(1000, 1400) : png(400, 300));
const PAGES = [3, 3, 4, 5, 6, 7, 8];
const NBSP = String.fromCharCode(160);

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
  'Таблица описана в таблице 1. Листинги приведены в приложении А, в приложении Б и в приложении В.',
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
  .replace(/Приложение (.) \(обязательное\) Прочее/, 'Appendix $1 (mandatory) Other')
  .replace('Листинги приведены в приложении А, в приложении Б и в приложении В.', 'Listings are given in appendix A, in appendix B and in appendix C.')
  .replace('Appendix А', 'Appendix A')
  .replace('Appendix Б', 'Appendix B')
  .replace('Appendix В', 'Appendix C');

const xmlOf = (buf, name = 'word/document.xml') => unzip(buf)[name].toString('utf8');
const build = (md, lang = 'ru', extra = {}) => markdownToDocx(md, { lang, variant: 26, read, pages: PAGES, ...extra });
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
  assert.match(xml, /Приложение А/);
  assert.match(xml, /Листинг А\.1 – Файл app\.js/);
  assert.match(xml, /Листинг Б\.1 – Шаблон index\.ejs/);
  assert.match(xml, /Листинг В\.1 – Прочее/);
  assert.match(xml, /«Тема работы»/);
  assert.match(xml, /по практическому занятию № 3/);
  assert.match(xml, /Ответ &amp; &lt;теги&gt;\./);
  assert.match(xml, /Цель работы/);
  const styles = xmlOf(buf, 'word/styles.xml');
  assert.match(styles, /w:styleId="Normal"[\s\S]*?w:firstLine="709"[\s\S]*?w:jc w:val="both"/);
  assert.match(styles, /w:styleId="Heading1"[\s\S]*?<w:pageBreakBefore\/>/);
  assert.match(styles, /Courier New/);
  assert.doesNotMatch(xmlOf(buf, 'word/settings.xml'), /updateFields/);
  assert.match(xmlOf(buf, 'word/footer1.xml'), / PAGE /);
  assert.ok(!xmlOf(buf, 'word/footer2.xml').includes('PAGE'));
  assert.deepEqual(lintDocx(buf), []);
});

test('the unnumbered part is centred, the images are scaled into the text area', () => {
  const xml = xmlOf(build(ru));
  assert.match(xml, /Заключение/);
  assert.match(xml, /<w:jc w:val="center"\/><\/w:pPr><w:r><w:rPr><\/w:rPr><w:t xml:space="preserve">Заключение/);
  const extents = [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.equal(extents.length, 2);
  assert.ok(extents.every(([cx, cy]) => cx <= 5940000 && cy <= 6415200));
  assert.deepEqual(extents[0], [3810000, 2857500]);
  assert.ok(xml.includes('keepNext'));
  assert.ok(xml.includes('cantSplit'));
});

test('code lines keep their indent as ordinary spaces, long lines get a hanging indent', () => {
  const xml = xmlOf(build(ru));
  assert.ok(xml.includes('  if (a) {'));
  assert.ok(!xml.includes(`${NBSP} `));
  assert.ok(!/<w:rFonts w:ascii="Courier New"/.test(xml));
  const long = `${' '.repeat(4)}${'x'.repeat(90)}`;
  assert.deepEqual(lintDocx(build(ru.replace('const a = 1;', 'const a = 1;\n\nconst b = 2;'))), []);
  const wrapped = xmlOf(build(ru.replace('const a = 1;', long)));
  assert.match(wrapped, /<w:pStyle w:val="Code"\/><w:ind w:left="720" w:hanging="720"\/>/);
  assert.match(xmlOf(build(ru.replace('const a = 1;', `a\tb${NBSP}c `)), 'word/document.xml'), /a {2}b c<\/w:t>/);
});

test('the contents carry page numbers and the appendix lines name the subsection', () => {
  const xml = xmlOf(build(ru));
  const toc = [...xml.matchAll(/<w:p><w:pPr><w:pStyle w:val="TOC([12])"\/><\/w:pPr>([\s\S]*?)<\/w:p>/g)];
  assert.equal(toc.length, 7);
  assert.match(toc[0][2], /<w:t xml:space="preserve">1 Цель работы<\/w:t><\/w:r><w:r><w:tab\/><\/w:r><w:r><w:rPr><\/w:rPr><w:t xml:space="preserve">3<\/w:t>/);
  assert.equal(toc[1][1], '2');
  assert.match(toc[4][2], /Приложение А \(обязательное\) Листинг файла app\.js \(к подразделу 1\.1\)<\/w:t>/);
  assert.match(toc[6][2], /<w:t xml:space="preserve">8<\/w:t><\/w:r><w:r><w:fldChar w:fldCharType="end"\/>/);
  const styles = xmlOf(build(ru), 'word/styles.xml');
  assert.match(styles, /w:styleId="TOC1"[\s\S]*?<w:ind w:left="709" w:right="567" w:hanging="709"\/>/);
  assert.ok(!xmlOf(build(ru, 'ru', { pages: undefined })).includes('<w:tab/>'));
  assert.match(xmlOf(build(en, 'en')), /Appendix A \(mandatory\) Listing of the file app\.js \(to subsection 1\.1\)/);
});

test('an appendix that no subsection mentions has no place in the contents', () => {
  const none = build(ru.replace(' Листинги приведены в приложении А, в приложении Б и в приложении В.', ''));
  assert.doesNotMatch(xmlOf(none), /\(к подразделу/);
  const inSection = build(
    ru
      .replace(
        '### 1.1 Подраздел\n\nТаблица описана в таблице 1. Листинги приведены в приложении А, в приложении Б и в приложении В.',
        '### 1.1 Подраздел\n\nТекст.',
      )
      .replace('## 1 Цель работы\n\n', '## 1 Цель работы\n\nПриложение А описано здесь.\n\n'),
  );
  assert.match(xmlOf(inSection), /Приложение А \(обязательное\) Листинг файла app\.js \(к разделу 1\)/);
  assert.match(
    xmlOf(build(en.replace('Listings are given in appendix A, in appendix B and in appendix C.', 'Nothing.').replace('## 1 Purpose', '## 1 Purpose'), 'en')),
    /Appendix A \(mandatory\)/,
  );
});

test('the title page takes the student and the group from the meta data, blanks stay lines', () => {
  const xml = xmlOf(build(ru, 'ru', { meta: { group: '123456', student: 'Иванов И. И.' } }));
  assert.match(xml, /Выполнила:<[^]*?>ст\. гр\. 123456<[^]*?>Иванов И\. И\./);
  assert.match(xml, /<w:tbl><w:tblPr><w:tblW w:w="9355"[^]*?Выполнила:[^]*?Проверил\(а\):/);
  assert.match(xmlOf(build(ru)), /ст\. гр\. ________<[^]*?>______________________/);
  assert.match(xmlOf(build(en, 'en', { meta: { group: 'G1', student: 'A. B.' } })), /Completed by:<[^]*?>group G1<[^]*?>A\. B\./);
  assert.match(xmlOf(build(en, 'en')), /group ________/);
  assert.match(xml, /Проверил\(а\):<[^]*?>______________________/);
  const filled = xmlOf(build(ru, 'ru', { meta: { reviewer: 'А. Б. Иванов', reviewerCaption: 'Проверила', doneCaption: 'Выполнил', titleVariant: '100' } }));
  assert.match(filled, /Проверила:<[^]*?>А\. Б\. Иванов/);
  assert.match(filled, /Выполнил:<[^]*?>ст\. гр\./);
  assert.match(filled, /Вариант № 100/);
});

test('words that name a numbered thing stay on one line with the number, the sentence before a figure stays with it', () => {
  const xml = xmlOf(build(ru));
  assert.ok(xml.includes(`рисунке${NBSP}1.`));
  assert.ok(xml.includes(`Рисунок${NBSP}1 – Схема`));
  assert.ok(xml.includes(`в таблице${NBSP}1.`));
  assert.ok(xml.includes(`в приложении${NBSP}А,`));
  assert.match(xml, new RegExp(`<w:pStyle w:val="Normal"/><w:keepNext/>[^]*?рисунке${NBSP}1\\.`));
  assert.match(xml, /<\/w:tbl><w:p><w:pPr><w:pStyle w:val="Normal"\/><w:keepNext\/><w:spacing w:before="240"\/>/);
  assert.ok(!/<w:p><w:pPr><w:pStyle w:val="\w+"\/>(?:<w:keepNext\/>)?<\/w:pPr><\/w:p>/.test(xml.replace(/<w:pStyle w:val="Code"\/><\/w:pPr><\/w:p>/g, '')));
});

test('table columns follow the length of their text and fill the text width', () => {
  const table = [
    '| Код | Название | Когда показывается |',
    '|---|---|---|',
    '| 400 | Некорректный запрос | Адрес или данные формы нельзя прочитать, потому что они не разобрались сервером |',
  ].join('\n');
  const xml = xmlOf(build(ru.replace('| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |', table)));
  // the first table is the signature block of the title page
  const widths = [...[...xml.matchAll(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/g)].at(-1)[1].matchAll(/w:w="(\d+)"/g)].map((m) => Number(m[1]));
  assert.equal(widths.length, 3);
  assert.equal(
    widths.reduce((a, b) => a + b, 0),
    9355,
  );
  assert.ok(widths[0] < widths[1] && widths[1] < widths[2]);
  const equal = [
    ...[...xmlOf(build(ru)).matchAll(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/g)]
      .at(-1)[1]
      .matchAll(/w:w="(\d+)"/g),
  ].map((m) => Number(m[1]));
  assert.deepEqual(equal, [4677, 4678]);
});
test('the English build uses the English title page and names', () => {
  const buf = build(en, 'en');
  const xml = xmlOf(buf);
  assert.match(xml, /on practical work No\. 3/);
  assert.match(xml, /Listing ..1 – File app\.js/);
  assert.match(xml, /Listing ..1 – Template index\.ejs/);
  assert.match(xml, /Appendix ./);
  assert.match(xml, /Conclusion/);
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
  has(rezip(base, { 'word/styles.xml': (x) => x.replace(/(w:styleId="Heading1">[\s\S]*?)<w:pageBreakBefore\/>/, '$1') }), 'new page');
  const noPages = build(ru, 'ru', { pages: undefined });
  has(noPages, 'page number');
  assert.deepEqual(lintDocx(noPages, { pages: false }), []);
  has(rezip(base, { 'word/settings.xml': (x) => x.replace('<w:zoom', '<w:updateFields w:val="true"/><w:zoom') }), 'updateFields');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('Приложение А (обязательное) ', 'Приложение А ') }), '(обязательное)');
  has(build(ru.replace(' Листинги приведены в приложении А, в приложении Б и в приложении В.', '')), '(к подразделу N.N)');
  has(
    rezip(base, { 'word/document.xml': (x) => x.replace('<w:sectPr>', '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr></w:p><w:sectPr>') }),
    'Empty paragraph',
  );
  has(
    rezip(base, {
      'word/document.xml': (x) =>
        x.replace('<w:rPr></w:rPr><w:t xml:space="preserve">Изучить', '<w:rPr><w:rFonts w:ascii="Courier New"/></w:rPr><w:t xml:space="preserve">Изучить'),
    }),
    'Courier New outside',
  );
  has(rezip(base, { 'word/document.xml': (x) => x.replace('const a = 1;', `const${NBSP}a = 1;`) }), 'Non-breaking');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('const a = 1;', `const a = ${'1'.repeat(90)};`) }), 'hanging indent');
  has(build(ru.replace('![Большая](big.png)', '![Высокая](tall.png)')), 'taller than 60 percent');
  assert.deepEqual(lintDocx(build(ru.replace('![Большая](big.png)', '![Высокая](tall.png)')), { figureHeight: false }), []);
  assert.deepEqual(lintDocx(build(ru.replace('![Большая](big.png)', '![Широкая](a.png)'))), []);
  has(rezip(base, { 'word/document.xml': (x) => x.replace('Вторая строка', ' Вторая  строка') }), 'Spaces');
  has(rezip(base, { 'word/document.xml': (x) => x.replace('Вторая строка', 'Вторая строка ') }), 'Spaces');
});
