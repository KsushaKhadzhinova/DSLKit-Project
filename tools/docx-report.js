import { createHash } from 'node:crypto';
import { lintDocx, markdownToDocx } from './docx.js';
import { unzip } from './zip.js';
import { metaOf } from './build-report.js';
import { variantOf } from './variant.js';

// The hash covers the text, the layout and the sizes of the figures, not the pixels: a new screenshot of the same size keeps the pages.
export const hashOf = (buf) => {
  const files = unzip(buf);
  return createHash('sha256').update(files['word/document.xml']).update(files['word/styles.xml']).digest('hex');
};

// The Russian DOCX of one report folder. The contents carry page numbers that only Word can count, so they are kept in
// report.toc.json together with the hash of the document they were counted for ("base": the document without numbers).
// A stale file (the text, a figure or the layout changed) gives no numbers and the check says to run tools/docx-cli.js.
export const reportDocx = (dir, readText, readFile) => {
  const options = { lang: 'ru', variant: variantOf(readText), meta: metaOf(dir, readText), read: (p) => readFile(`${dir}/${p}`) };
  const md = readText(`${dir}/report.md`);
  const base = markdownToDocx(md, options);
  let stored = {};
  try {
    stored = JSON.parse(readText(`${dir}/report.toc.json`));
  } catch {
    // no file yet: the contents are built without numbers
  }
  const current = stored.base === hashOf(base);
  const docx = current ? markdownToDocx(md, { ...options, pages: stored.pages }) : null;
  return { base, hash: hashOf(base), current, docx, errors: lintDocx(docx ?? base, { pages: current, figureHeight: options.meta.figureHeight !== false }) };
};
