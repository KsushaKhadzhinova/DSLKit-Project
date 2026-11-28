import { zip, unzip } from './zip.js';

// Converts a built report (the Markdown subset the report templates use) into a DOCX package laid out by STP 01-2024
// and the samples of the owner: A4, margins 20/15/20/30 mm, Times New Roman 14, one line spacing of 1.15, an indent of
// 1.25 cm set by the paragraph style, a title page without a number, a TOC field whose cached lines carry the page numbers
// (from report.toc.json, made with Word by tools/docx-pages.ps1), every part on a new page, the page number bottom right,
// captions under figures and above tables, listings in Courier New 10 with a hanging indent for long lines.
// Headings are 14 pt (STP 2.1.1). No italics, no tab characters in the text, no empty paragraphs, no non-breaking spaces in code.
const TEXT_WIDTH = 9355; // twips: 21 cm minus 3 cm and 1.5 cm
const MAX_EMU_WIDTH = 5940000; // 16.5 cm
const PAGE_EMU_HEIGHT = 10692000; // 29.7 cm
const MAX_EMU_HEIGHT = Math.round(PAGE_EMU_HEIGHT * 0.6); // a figure may take 60 percent of the page height
const CODE_CHAR = 120; // twips: one Courier New 10 pt character
const CODE_MAX = 78; // characters of a listing line that fit in the text width
const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

const T = {
  ru: {
    lines: [
      'Министерство образования Республики Беларусь',
      'Учреждение образования',
      '«Белорусский государственный университет информатики и радиоэлектроники»',
    ],
    faculty: 'Факультет информационных технологий и управления',
    department: 'Кафедра информационных технологий автоматизированных систем',
    discipline: 'Дисциплина: Интернет-технологии и веб-программирование',
    report: 'ОТЧЁТ',
    on: (n) => `по практическому занятию № ${n}`,
    variant: (v) => `Вариант № ${v}`,
    // The signature block follows the samples: the caption «Выполнила:» (or «Выполнил:») on the left, then «ст. гр. N» and the initials in the right column.
    done: (group, student, caption = 'Выполнила') => [`${caption}:`, `ст. гр. ${group || '________'}`, student || '______________________'],
    checked: (reviewer, caption = 'Проверил(а)') => [`${caption}:`, reviewer || '______________________'],
    inAppendix: 'к подразделу',
    inSection: 'к разделу',
    appendixRef: (l) => new RegExp(`приложени\\S* ${l}(?![А-Яа-яЁё])`, 'i'),
    city: 'Минск 2026',
    contents: 'Содержание',
    unnumbered: /^(Заключение)$/,
    appendix: /^Приложение (\S) \(обязательное\) (.+)$/,
    appendixName: 'Приложение',
    appendixWord: 'Приложение',
    mandatory: '(обязательное)',
    figure: 'Рисунок',
    table: 'Таблица',
    listing: 'Листинг',
    listingName: [
      [/^Листинг файла /, 'Файл '],
      [/^Листинг шаблона /, 'Шаблон '],
    ],
    number: /№\s*(\d+)/,
  },
  en: {
    lines: ['Ministry of Education of the Republic of Belarus', 'Educational Institution', '"Belarusian State University of Informatics and Radioelectronics"'],
    faculty: 'Faculty of Information Technologies and Control',
    department: 'Department of Information Technologies of Automated Systems',
    discipline: 'Discipline: Internet Technologies and Web Programming',
    report: 'REPORT',
    on: (n) => `on practical work No. ${n}`,
    variant: (v) => `Variant No. ${v}`,
    done: (group, student, caption = 'Completed by') => [`${caption}:`, `group ${group || '________'}`, student || '______________________'],
    checked: (reviewer, caption = 'Checked by') => [`${caption}:`, reviewer || '______________________'],
    inAppendix: 'to subsection',
    inSection: 'to section',
    appendixRef: (l) => new RegExp(`appendix ${l}\\b`, 'i'),
    city: 'Minsk 2026',
    contents: 'Contents',
    unnumbered: /^(Conclusion)$/,
    appendix: /^Appendix (\S) \(mandatory\) (.+)$/,
    appendixName: 'Appendix',
    appendixWord: 'Appendix',
    mandatory: '(mandatory)',
    figure: 'Figure',
    table: 'Table',
    listing: 'Listing',
    listingName: [
      [/^Listing of the file /, 'File '],
      [/^Listing of the template /, 'Template '],
    ],
    number: /(\d+)/,
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = (text, { bold = false, size } = {}) =>
  `<w:r><w:rPr>${bold ? '<w:b/>' : ''}${size ? `<w:sz w:val="${size}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

const NBSP = String.fromCharCode(160);

// A word that names a numbered thing stays on one line with its number.
const NAMED = /(рисун\p{L}*|таблиц\p{L}*|приложени\p{L}*|раздел\p{L}*|подраздел\p{L}*|figure|table|appendix|section) (?=\d|[А-ЯA-Z](?![\p{L}]))/giu;
const nb = (text) => text.replace(NAMED, `$1${NBSP}`);

// `code` is set as plain text in the font of the paragraph (Courier is kept for the listings) and **text** is bold.
const inline = (text, base = {}) =>
  text
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('`') ? run(part.slice(1, -1), base) : part.startsWith('**') ? run(nb(part.slice(2, -2)), { ...base, bold: true }) : run(nb(part), base),
    )
    .join('');

const center = (text, { bold = false, size, after = 0, before = 0 } = {}) =>
  `<w:p><w:pPr><w:pStyle w:val="Plain"/><w:spacing w:before="${before}" w:after="${after}"/><w:jc w:val="center"/></w:pPr>${run(text, { bold, size })}</w:p>`;

const left = (text, { after = 0 } = {}) => `<w:p><w:pPr><w:pStyle w:val="Plain"/><w:spacing w:before="0" w:after="${after}"/></w:pPr>${run(text)}</w:p>`;

const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

// The subsection (or the section) where the text first mentions an appendix: "к подразделу 3.2" in the contents.
const appendixPlace = (lines, letter, t) => {
  let place = '';
  for (const line of lines) {
    if (line.startsWith('## ') && /^## \d+ /.test(line)) place = `${t.inSection} ${/^## (\d+)/.exec(line)[1]}`;
    else if (line.startsWith('### ')) place = `${t.inAppendix} ${/^### (\d+\.\d+)/.exec(line)[1]}`;
    else if (line.startsWith('## Приложение') || line.startsWith('## Appendix')) break;
    else if (place && t.appendixRef(letter).test(line)) return place;
  }
  return '';
};

// Column widths follow the length of the text in the column, but a short column keeps room for its heading.
const columnWidths = (cells) => {
  const weights = cells[0].map((_, j) => Math.min(70, Math.max(10, cells.reduce((sum, row) => sum + row[j].length, 0) / cells.length)));
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((w / total) * TEXT_WIDTH));
  widths[widths.length - 1] += TEXT_WIDTH - widths.reduce((a, b) => a + b, 0);
  return widths;
};

// meta: { student, group } for the title page; pages: the page of every contents line (from report.toc.json), in order.
export const markdownToDocx = (md, { lang = 'ru', variant, read, meta = {}, pages }) => {
  const t = T[lang];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const media = {};
  const rels = [];
  const body = [];
  const toc = [];
  let docPr = 0;
  let listing = 0;
  let letter = '';
  let gap = false; // the next paragraph follows a table and is set apart by spacing, not by an empty paragraph

  const para = (style, content, { keepNext = false, jc = '', ind = '' } = {}) => {
    const spacing = gap ? '<w:spacing w:before="240"/>' : '';
    gap = false;
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${keepNext ? '<w:keepNext/>' : ''}${spacing}${ind}${jc ? `<w:jc w:val="${jc}"/>` : ''}</w:pPr>${content}</w:p>`;
  };

  const image = (alt, src) => {
    const data = read(src);
    const { w, h } = pngSize(data);
    const scale = Math.min(1, MAX_EMU_WIDTH / (w * 9525), MAX_EMU_HEIGHT / (h * 9525));
    const cx = Math.round(w * 9525 * scale);
    const cy = Math.round(h * 9525 * scale);
    docPr += 1;
    const name = `media/image${docPr}.png`;
    media[`word/${name}`] = data;
    rels.push(`<Relationship Id="rId${docPr + 10}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${name}"/>`);
    return para(
      'Figure',
      `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPr}" name="Picture ${docPr}" descr="${esc(alt)}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docPr}" name="${esc(src.split('/').pop())}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${docPr + 10}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`,
    );
  };

  const table = (rows) => {
    const cells = rows
      .filter((r) => !/^\|[-|\s:]+\|$/.test(r))
      .map((r) =>
        r
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim()),
      );
    const widths = columnWidths(cells);
    const grid = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
    const tr = cells
      .map(
        (row, i) =>
          `<w:tr><w:trPr><w:cantSplit/>${i === 0 ? '<w:tblHeader/>' : ''}</w:trPr>${row
            .map(
              (c, j) =>
                `<w:tc><w:tcPr><w:tcW w:w="${widths[j]}" w:type="dxa"/></w:tcPr>${para('TableText', inline(c, { bold: i === 0 }), { keepNext: i < cells.length - 1 })}</w:tc>`,
            )
            .join('')}</w:tr>`,
      )
      .join('');
    const b = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('');
    gap = true;
    return `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_WIDTH}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="85" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${tr}</w:tbl>`;
  };

  const h1 = (text, lines3, centered, entry = text) => {
    toc.push([1, lines3 ? entry : text]);
    const content = lines3 ? lines3.map((l, i) => (i ? '<w:r><w:br/></w:r>' : '') + run(l)).join('') : run(text);
    return para('Heading1', content, { jc: lines3 || centered ? 'center' : '' });
  };

  // One listing line: real spaces for the indent (a copy into an editor stays code), a hanging indent when the line wraps.
  const codeLine = (raw) => {
    const text = raw.replace(/\t/g, '  ').replaceAll(NBSP, ' ').trimEnd();
    const indent = /^ */.exec(text)[0].length;
    const wrapped = text.length > CODE_MAX ? `<w:ind w:left="${(indent + 2) * CODE_CHAR}" w:hanging="${(indent + 2) * CODE_CHAR}"/>` : '';
    // A blank line of a listing is half a line high, so blank lines do not push a few lines onto an almost empty page.
    return para('Code', text ? run(text) : '', { ind: text ? wrapped : '<w:spacing w:line="120" w:lineRule="exact"/>' });
  };

  let title = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) i += 1;
    else if (line.startsWith('# ')) {
      title = line.slice(2);
      i += 1;
    } else if (line.startsWith('## ')) {
      const text = line.slice(3);
      const ap = t.appendix.exec(text);
      if (ap) {
        [, letter] = ap;
        listing = 0;
        const place = appendixPlace(lines, letter, t);
        body.push(
          h1(
            text,
            [`${t.appendixWord} ${letter}`, t.mandatory, ap[2]],
            false,
            `${t.appendixName} ${letter} ${t.mandatory} ${ap[2]}${place ? ` (${place})` : ''}`,
          ),
        );
      } else body.push(h1(text, null, t.unnumbered.test(text)));
      i += 1;
    } else if (line.startsWith('### ')) {
      toc.push([2, line.slice(4)]);
      body.push(para('Heading2', run(line.slice(4))));
      i += 1;
    } else if (line.startsWith('```')) {
      const code = [];
      i += 1;
      while (!lines[i].startsWith('```')) code.push(lines[i++]);
      i += 1;
      listing += 1;
      const ap = t.appendix.exec(
        lines
          .slice(0, i)
          .reverse()
          .find((l) => l.startsWith('## '))
          .slice(3),
      );
      let name = ap[2];
      for (const [re, to] of t.listingName) name = name.replace(re, to);
      body.push(para('ListingCaption', run(`${t.listing} ${letter}.${listing} – ${name}`), { keepNext: true }));
      code.forEach((c) => body.push(codeLine(c)));
    } else if (line.startsWith('![')) {
      const [, alt, src] = /^!\[(.*)\]\((.*)\)$/.exec(line);
      body.push(image(alt, src));
      i += 1;
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      body.push(table(rows));
    } else {
      const text = [];
      while (i < lines.length && lines[i].trim() && !/^(#|!\[|\||```)/.test(lines[i])) text.push(lines[i++].trim());
      const joined = text.join(' ');
      const caption = new RegExp(`^(${t.figure}|${t.table}) \\d+ – `).exec(joined);
      if (caption) body.push(para(caption[1] === t.table ? 'TableCaption' : 'Caption', inline(joined)));
      else if (/^\d+\. /.test(joined)) body.push(para('Question', inline(joined, { bold: true })));
      else {
        // The sentence that introduces a figure stays on the page of the figure.
        let next = i;
        while (next < lines.length && !lines[next].trim()) next += 1;
        body.push(para('Normal', inline(joined), { keepNext: Boolean(lines[next]?.startsWith('![')) }));
      }
    }
  }

  const n = t.number.exec(title)?.[1] ?? '1';
  const name = title.includes('. ') ? title.slice(title.indexOf('. ') + 2) : title;
  // The signature block of the samples (пз1.docx): a table without borders, the caption in the left column, the group and the name in the right one.
  const signatures = ([doneCaption, group, student], [checkedCaption, reviewer]) => {
    const widths = [6522, 2833];
    const paras = (lines, before) => lines.map((text, k) => `<w:p><w:pPr><w:pStyle w:val="Plain"/><w:spacing w:before="${k === 0 ? before : 0}"/></w:pPr>${run(text)}</w:p>`).join('');
    const row = (caption, lines, before) =>
      `<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${widths[0]}" w:type="dxa"/></w:tcPr>${paras([caption], before)}</w:tc><w:tc><w:tcPr><w:tcW w:w="${widths[1]}" w:type="dxa"/></w:tcPr>${paras(lines, before)}</w:tc></w:tr>`;
    return `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_WIDTH}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${row(doneCaption, [group, student], 0)}${row(checkedCaption, [reviewer], 600)}</w:tbl>`;
  };
  const titlePage = [
    ...t.lines.map((l, k) => center(l, { after: k === 2 ? 240 : 0 })),
    // As in the samples, the faculty, the department and the discipline are left-aligned lines; only the university lines and the title are centred.
    left(t.faculty, { after: 240 }),
    left(t.department, { after: 240 }),
    left(t.discipline, { after: 1200 }),
    center(t.report, { bold: true, size: 32, after: 120 }),
    center(t.on(n), { after: 240 }),
    center(`«${name}»`, { after: 480 }),
    // the signature block stands two lines lower than the plain gap (a line is about 320 twips)
    center(t.variant(meta.titleVariant ?? variant), { after: 1850 }),
    signatures(t.done(meta.group, meta.student, meta.doneCaption), t.checked(meta.reviewer, meta.reviewerCaption)),
    `<w:p><w:pPr><w:pStyle w:val="Plain"/><w:framePr w:w="${TEXT_WIDTH}" w:hRule="auto" w:wrap="around" w:vAnchor="margin" w:hAnchor="margin" w:xAlign="center" w:yAlign="bottom"/><w:jc w:val="center"/></w:pPr>${run(t.city)}</w:p>`,
  ].join('');

  const tocLine = ([level, text], k, all) => {
    const page = pages?.[k];
    const begin =
      k === 0
        ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        : '';
    const end = k === all.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : '';
    return `<w:p><w:pPr><w:pStyle w:val="TOC${level}"/></w:pPr>${begin}${run(text)}${page ? `<w:r><w:tab/></w:r>${run(String(page))}` : ''}${end}</w:p>`;
  };
  const tocField = para('TOCHeading', run(t.contents)) + toc.map(tocLine).join('');

  const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:footerReference w:type="first" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="709" w:footer="567" w:gutter="0"/><w:titlePg/></w:sectPr>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${titlePage}${tocField}${body.join('')}${sect}</w:body></w:document>`;

  const font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>';
  const ps = (id, name, ppr, rpr = '', extra = '') =>
    `<w:style w:type="paragraph" w:styleId="${id}"${extra}><w:name w:val="${name}"/><w:basedOn w:val="Plain"/><w:qFormat/><w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  const tab = `<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${TEXT_WIDTH}"/></w:tabs>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="${lang === 'ru' ? 'ru-RU' : 'en-US'}"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Plain"><w:name w:val="Plain"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal Text"/><w:basedOn w:val="Plain"/><w:qFormat/><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="709"/><w:jc w:val="both"/></w:pPr></w:style>
${ps('Heading1', 'heading 1', '<w:keepNext/><w:pageBreakBefore/><w:spacing w:after="360" w:line="276" w:lineRule="auto"/><w:outlineLvl w:val="0"/>', '<w:b/><w:sz w:val="28"/>')}
${ps('Heading2', 'heading 2', '<w:keepNext/><w:spacing w:before="240" w:after="240" w:line="276" w:lineRule="auto"/><w:outlineLvl w:val="1"/>', '<w:b/>')}
${ps('Heading3', 'heading 3', '<w:keepNext/><w:spacing w:before="120" w:after="0" w:line="276" w:lineRule="auto"/><w:outlineLvl w:val="2"/>', '<w:b/>')}
${ps('Figure', 'Figure', '<w:keepNext/><w:keepLines/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>')}
${ps('Caption', 'caption', '<w:spacing w:before="120" w:after="240" w:line="276" w:lineRule="auto"/><w:jc w:val="center"/>')}
${ps('TableCaption', 'Table caption', '<w:keepNext/><w:spacing w:before="240" w:after="120" w:line="276" w:lineRule="auto"/>')}
${ps('ListingCaption', 'Listing caption', '<w:keepNext/><w:spacing w:before="240" w:after="120" w:line="276" w:lineRule="auto"/>')}
${ps('Question', 'Question', '<w:keepNext/><w:spacing w:before="120" w:after="0" w:line="276" w:lineRule="auto"/><w:jc w:val="both"/>')}
${ps('TableText', 'Table text', '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>', '<w:sz w:val="24"/>')}
${ps('Code', 'Code', '<w:spacing w:after="0" w:line="215" w:lineRule="exact"/>', '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="20"/>')}
${ps('TOCHeading', 'TOC Heading', '<w:pageBreakBefore/><w:spacing w:after="360"/><w:jc w:val="center"/>', '<w:b/><w:sz w:val="28"/>')}
${ps('TOC1', 'toc 1', `${tab}<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="709" w:right="567" w:hanging="709"/>`)}
${ps('TOC2', 'toc 2', `${tab}<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="1134" w:right="567" w:hanging="709"/>`)}
${ps('Footer', 'footer', '<w:jc w:val="right"/>', '<w:sz w:val="24"/>')}
</w:styles>`;

  const footer = (content) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>${content}</w:ftr>`;
  const page =
    '<w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>2</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zip({
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/footer2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/footer" Target="footer1.xml"/><Relationship Id="rId3" Type="${R}/footer" Target="footer2.xml"/><Relationship Id="rId4" Type="${R}/settings" Target="settings.xml"/>${rels.join('')}</Relationships>`,
    'word/document.xml': document,
    'word/styles.xml': styles,
    'word/settings.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${NS}><w:zoom w:percent="100"/></w:settings>`,
    'word/footer1.xml': footer(page),
    'word/footer2.xml': footer('<w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr></w:p>'),
    ...media,
  });
};

// The text of every paragraph, with the paragraphs of the contents and the field marks left out when asked to.
const paragraphs = (xml) => [...xml.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g)].map((m) => m[1]);
const textOf = (p) =>
  [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((x) => x[1])
    .join('')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// Checks a DOCX package against the rules a reader can verify in the XML.
// pages: the contents must carry page numbers; figureHeight: no figure may be squeezed by the 60 percent height limit.
export const lintDocx = (buf, { pages = true, figureHeight = true } = {}) => {
  const files = unzip(buf);
  const xml = files['word/document.xml'].toString('utf8');
  const styles = files['word/styles.xml'].toString('utf8');
  const settings = files['word/settings.xml'].toString('utf8');
  const errors = [];
  const check = (bad, msg) => bad && errors.push(msg);
  const all = paragraphs(xml);
  const inToc = (p) => /<w:pStyle w:val="TOC[12]"\/>/.test(p);
  const ordinary = all.filter((p) => !inToc(p));
  const style = (p) => /<w:pStyle w:val="(\w+)"\/>/.exec(p)?.[1];
  check(/<w:i[ />]/.test(xml + styles), 'Italic text');
  check(
    ordinary.some((p) => p.includes('<w:tab/>')),
    'Tab characters in the text',
  );
  check(!/<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/.test(xml), 'Margins must be 20/15/20/30 mm');
  check(!xml.includes('<w:titlePg/>'), 'The title page must have no page number');
  check(!xml.includes('TOC \\o'), 'No table of contents field');
  check(
    pages && all.filter(inToc).some((p) => !/<w:tab\/><\/w:r><w:r><w:rPr><\/w:rPr><w:t xml:space="preserve">\d+<\/w:t>/.test(p)),
    'A line of the table of contents has no page number',
  );
  const appendices = all
    .filter(inToc)
    .map(textOf)
    .filter((x) => /^(?:Приложение|Appendix) /.test(x));
  check(
    appendices.some((x) => !/\((?:обязательное|mandatory)\)/.test(x)),
    'An appendix line of the contents has no "(обязательное)"',
  );
  check(
    appendices.some((x) => !/\((?:к (?:под)?разделу|to (?:sub)?section) \d/.test(x)),
    'An appendix line of the contents has no "(к подразделу N.N)"',
  );
  check(settings.includes('updateFields'), 'updateFields makes Word ask to update the fields on opening');
  check(/Calibri|Arial/.test(xml + styles), 'Fonts other than Times New Roman and Courier New');
  check(!/w:styleId="Heading1">(?:(?!<\/w:style>)[\s\S])*?<w:pageBreakBefore\/>/.test(styles), 'Parts must start on a new page');
  check(
    all.some((p) => !/<w:drawing>|<w:fldChar|<w:br/.test(p) && !p.includes('<w:r>') && style(p) !== 'Code' && style(p) !== 'Footer'),
    'Empty paragraph',
  );
  check(
    ordinary.some((p) => style(p) !== 'Code' && /Courier New/.test(p)),
    'Courier New outside the listings',
  );
  check(
    all.some((p) => style(p) === 'Code' && textOf(p).includes(NBSP)),
    'Non-breaking spaces in a listing',
  );
  check(
    all.some((p) => style(p) === 'Code' && textOf(p).length > CODE_MAX && !p.includes('w:hanging=')),
    `A listing line longer than ${CODE_MAX} characters without a hanging indent`,
  );
  check(
    figureHeight &&
      [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g)].some((m) => Number(m[2]) >= MAX_EMU_HEIGHT - 2 && Number(m[1]) < MAX_EMU_WIDTH - 2),
    'A figure is taller than 60 percent of the page: crop the screenshot',
  );
  check(
    ordinary
      .filter((p) => style(p) !== 'Code')
      .map(textOf)
      .some((x) => !x.startsWith(' ') && /^ | $| {2}/.test(x)),
    'Spaces used as indents, double or trailing spaces',
  );
  return errors;
};
