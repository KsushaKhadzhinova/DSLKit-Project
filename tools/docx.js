import { zip, unzip } from './zip.js';

// Converts a built report (the Markdown subset the report templates use) into a DOCX package laid out by STP 01-2024
// and the samples of the owner: A4, margins 20/15/20/30 mm, Times New Roman 14, one line spacing of 1.15, an indent of
// 1.25 cm set by the paragraph style, a title page without a number, a TOC field (update it with F9), every part on a
// new page, the page number bottom right, captions under figures and above tables, listings in Courier New 12.
// No italics, no tab characters in the text and no spaces used as indents.
const TEXT_WIDTH = 9355; // twips: 21 cm minus 3 cm and 1.5 cm
const MAX_EMU_WIDTH = 5940000; // 16.5 cm
const MAX_EMU_HEIGHT = 7920000; // 22 cm
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
    done: 'Выполнил(а):',
    checked: 'Проверил:',
    city: 'Минск 2026',
    contents: 'СОДЕРЖАНИЕ',
    unnumbered: /^(Заключение)$/,
    appendix: /^Приложение (\S) \(обязательное\) (.+)$/,
    appendixWord: 'ПРИЛОЖЕНИЕ',
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
    done: 'Completed by:',
    checked: 'Checked by:',
    city: 'Minsk 2026',
    contents: 'CONTENTS',
    unnumbered: /^(Conclusion)$/,
    appendix: /^Appendix (\S) \(mandatory\) (.+)$/,
    appendixWord: 'APPENDIX',
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
const run = (text, { mono = false, bold = false, size } = {}) =>
  `<w:r><w:rPr>${mono ? '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>' : ''}${bold ? '<w:b/>' : ''}${mono ? '<w:sz w:val="24"/>' : size ? `<w:sz w:val="${size}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

// `code` becomes Courier New 12 and **text** bold; nothing else is interpreted.
const inline = (text, base = {}) =>
  text
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('`')
        ? run(part.slice(1, -1), { ...base, mono: true })
        : part.startsWith('**')
          ? run(part.slice(2, -2), { ...base, bold: true })
          : run(part, base),
    )
    .join('');

const para = (style, content, extra = '') => `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr>${content}</w:p>`;
const center = (text, { bold = false, size, after = 0, before = 0 } = {}) =>
  `<w:p><w:pPr><w:pStyle w:val="Plain"/><w:spacing w:before="${before}" w:after="${after}"/><w:jc w:val="center"/></w:pPr>${run(text, { bold, size })}</w:p>`;
const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

export const markdownToDocx = (md, { lang = 'ru', variant, read }) => {
  const t = T[lang];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const media = {};
  const rels = [];
  const body = [];
  const toc = [];
  let docPr = 0;
  let listing = 0;
  let letter = '';

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
    const width = Math.floor(TEXT_WIDTH / cells[0].length);
    const grid = cells[0].map(() => `<w:gridCol w:w="${width}"/>`).join('');
    const tr = cells
      .map(
        (row, i) =>
          `<w:tr><w:trPr><w:cantSplit/>${i === 0 ? '<w:tblHeader/>' : ''}</w:trPr>${row
            .map(
              (c) =>
                `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>${para('TableText', inline(c, { bold: i === 0 }), i < cells.length - 1 ? '<w:keepNext/>' : '')}</w:tc>`,
            )
            .join('')}</w:tr>`,
      )
      .join('');
    const b = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_WIDTH}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${tr}</w:tbl><w:p><w:pPr><w:pStyle w:val="Plain"/></w:pPr></w:p>`;
  };

  const h1 = (text, lines3, centered) => {
    toc.push([1, lines3 ? lines3.join(' ') : text]);
    const content = lines3 ? lines3.map((l, i) => (i ? '<w:r><w:br/></w:r>' : '') + run(l)).join('') : run(text);
    return para('Heading1', content, lines3 || centered ? '<w:jc w:val="center"/>' : '');
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
        body.push(h1(text, [`${t.appendixWord} ${letter}`, t.mandatory, ap[2]]));
      } else body.push(h1(text.toUpperCase(), null, t.unnumbered.test(text)));
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
      body.push(para('ListingCaption', run(`${t.listing} ${letter}.${listing} – ${name}`)));
      code.forEach((c) =>
        body.push(
          para(
            'Code',
            run(
              c.replace(/^ +/, (s) => ' '.repeat(s.length)),
              { mono: true },
            ),
          ),
        ),
      );
      body.push(para('Plain', ''));
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
      else body.push(para('Normal', inline(joined)));
    }
  }

  const n = t.number.exec(title)?.[1] ?? '1';
  const name = title.includes('. ') ? title.slice(title.indexOf('. ') + 2) : title;
  const titlePage = [
    ...t.lines.map((l, k) => center(l, { after: k === 2 ? 240 : 0 })),
    center(t.faculty),
    center(t.department, { after: 600 }),
    center(t.discipline, { after: 1200 }),
    center(t.report, { bold: true, size: 32, after: 120 }),
    center(t.on(n), { after: 240 }),
    center(`«${name}»`, { after: 480 }),
    center(t.variant(variant), { after: 1200 }),
    `<w:p><w:pPr><w:pStyle w:val="Plain"/><w:spacing w:after="240"/></w:pPr>${run(`${t.done} ______________________`)}</w:p>`,
    `<w:p><w:pPr><w:pStyle w:val="Plain"/><w:spacing w:after="2400"/></w:pPr>${run(`${t.checked} ______________________`)}</w:p>`,
    center(t.city),
    pageBreak,
  ].join('');

  const tocField =
    para('TOCHeading', run(t.contents)) +
    `<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${run(toc[0][1])}</w:p>` +
    toc
      .slice(1)
      .map(
        ([level, text], k, all) =>
          `<w:p><w:pPr><w:pStyle w:val="TOC${level}"/></w:pPr>${run(text)}${k === all.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : ''}</w:p>`,
      )
      .join('');

  const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:footerReference w:type="first" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="709" w:footer="567" w:gutter="0"/><w:titlePg/></w:sectPr>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${titlePage}${tocField}${body.join('')}${sect}</w:body></w:document>`;

  const font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>';
  const ps = (id, name, ppr, rpr = '', extra = '') =>
    `<w:style w:type="paragraph" w:styleId="${id}"${extra}><w:name w:val="${name}"/><w:basedOn w:val="Plain"/><w:qFormat/><w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  const toc1 = `<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${TEXT_WIDTH}"/></w:tabs>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="${lang === 'ru' ? 'ru-RU' : 'en-US'}"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Plain"><w:name w:val="Plain"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal Text"/><w:basedOn w:val="Plain"/><w:qFormat/><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="709"/><w:jc w:val="both"/></w:pPr></w:style>
${ps('Heading1', 'heading 1', '<w:keepNext/><w:pageBreakBefore/><w:spacing w:after="360" w:line="276" w:lineRule="auto"/><w:outlineLvl w:val="0"/>', '<w:b/><w:sz w:val="32"/>')}
${ps('Heading2', 'heading 2', '<w:keepNext/><w:spacing w:before="240" w:after="240" w:line="276" w:lineRule="auto"/><w:outlineLvl w:val="1"/>', '<w:b/>')}
${ps('Heading3', 'heading 3', '<w:keepNext/><w:spacing w:before="120" w:after="0" w:line="276" w:lineRule="auto"/><w:outlineLvl w:val="2"/>', '<w:b/>')}
${ps('Figure', 'Figure', '<w:keepNext/><w:keepLines/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>')}
${ps('Caption', 'caption', '<w:spacing w:before="120" w:after="240" w:line="276" w:lineRule="auto"/><w:jc w:val="center"/>')}
${ps('TableCaption', 'Table caption', '<w:keepNext/><w:spacing w:before="240" w:after="120" w:line="276" w:lineRule="auto"/>')}
${ps('ListingCaption', 'Listing caption', '<w:keepNext/><w:spacing w:before="240" w:after="120" w:line="276" w:lineRule="auto"/>')}
${ps('Question', 'Question', '<w:keepNext/><w:spacing w:before="120" w:after="0" w:line="276" w:lineRule="auto"/><w:jc w:val="both"/>')}
${ps('TableText', 'Table text', '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>', '<w:sz w:val="24"/>')}
${ps('Code', 'Code', '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>', '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="24"/>')}
${ps('TOCHeading', 'TOC Heading', '<w:spacing w:after="360"/><w:jc w:val="center"/>', '<w:b/><w:sz w:val="32"/>')}
${ps('TOC1', 'toc 1', `${toc1}<w:spacing w:after="0" w:line="276" w:lineRule="auto"/>`)}
${ps('TOC2', 'toc 2', `${toc1}<w:spacing w:after="0" w:line="276" w:lineRule="auto"/><w:ind w:left="284"/>`)}
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
    'word/settings.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${NS}><w:updateFields w:val="true"/></w:settings>`,
    'word/footer1.xml': footer(page),
    'word/footer2.xml': footer('<w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr></w:p>'),
    ...media,
  });
};

// Checks a DOCX package against the rules a reader can verify in the XML.
export const lintDocx = (buf) => {
  const files = unzip(buf);
  const xml = files['word/document.xml'].toString('utf8');
  const styles = files['word/styles.xml'].toString('utf8');
  const errors = [];
  const check = (bad, msg) => bad && errors.push(msg);
  check(/<w:i[ />]/.test(xml + styles), 'Italic text');
  check(/<w:tab\/>/.test(xml), 'Tab characters in the text');
  check(!/<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/.test(xml), 'Margins must be 20/15/20/30 mm');
  check(!xml.includes('<w:titlePg/>'), 'The title page must have no page number');
  check(!xml.includes('TOC \\o'), 'No table of contents field');
  check(/Calibri|Arial/.test(xml + styles), 'Fonts other than Times New Roman and Courier New');
  check(!/w:styleId="Heading1">[\s\S]*?<w:pageBreakBefore\/>/.test(styles), 'Parts must start on a new page');
  const texts = [...xml.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g)].map((m) => [...m[1].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join(''));
  check(
    texts.some((x) => !x.startsWith(' ') && /^ | $| {2}/.test(x)),
    'Spaces used as indents, double or trailing spaces',
  );
  return errors;
};
