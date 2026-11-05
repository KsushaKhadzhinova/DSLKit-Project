import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initExport } from '../../site/js/components/export-menu.js';
import { drawioFile, fileName, htmlFile, rasterize, serializeSvg, sizeOf } from '../../site/js/utils/exporters.js';

const editorHtml = readFileSync('site/app/editor.html', 'utf8');
const editorHtmlEn = readFileSync('site/en/app/editor.html', 'utf8');
const svgOf = (window, attributes = 'viewBox="0 0 200 100"') => {
  const holder = window.document.createElement('div');
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}><rect width="10" height="10"/></svg>`;
  return holder.firstChild;
};
const blank = () => new JSDOM('<!doctype html><html><body></body></html>').window;

// A window whose images load at once and whose canvas remembers what was drawn on it.
const imageWindow = ({ fail = false, noBlob = false } = {}) => {
  const window = blank();
  const drawn = {};
  window.Image = class {
    set src(value) {
      drawn.src = value;
      queueMicrotask(() => (fail ? this.onerror() : this.onload()));
    }
  };
  const createElement = window.document.createElement.bind(window.document);
  window.document.createElement = (name) => {
    if (name !== 'canvas') return createElement(name);
    const context = {
      fillRect: (...args) => (drawn.fill = args),
      drawImage: (...args) => (drawn.image = args),
    };
    const canvas = {
      getContext: () => context,
      toBlob: (callback, type, quality) => {
        drawn.type = type;
        drawn.quality = quality;
        callback(noBlob ? null : new window.Blob(['x'], { type }));
      },
    };
    drawn.canvas = canvas;
    drawn.context = context;
    return canvas;
  };
  return { window, drawn };
};

test('file names come from the title in any language', () => {
  assert.equal(fileName('Order process', 'svg'), 'order-process.svg');
  assert.equal(fileName('Процесс заказа №1', 'png'), 'процесс-заказа-1.png');
  assert.equal(fileName('  --  ', 'html'), 'diagram.html');
  assert.equal(fileName(undefined, 'drawio'), 'diagram.drawio');
  assert.equal(fileName('x'.repeat(100), 'svg'), `${'x'.repeat(60)}.svg`);
});

test('the size comes from the view box, then from the attributes, then from the default', () => {
  const window = blank();
  assert.deepEqual(sizeOf(svgOf(window, 'viewBox="0 0 300 120"')), { width: 300, height: 120 });
  assert.deepEqual(sizeOf(svgOf(window, 'viewBox="0,0,50,40"')), { width: 50, height: 40 });
  assert.deepEqual(sizeOf(svgOf(window, 'width="640" height="480pt"')), { width: 640, height: 480 });
  assert.deepEqual(sizeOf(svgOf(window, 'viewBox="0 0 0 0" width="10" height="20"')), { width: 10, height: 20 });
  assert.deepEqual(sizeOf(svgOf(window, 'viewBox="a b c d"')), { width: 800, height: 600 });
  assert.deepEqual(sizeOf(svgOf(window, 'width="-5" height="x"')), { width: 800, height: 600 });
  assert.deepEqual(sizeOf(svgOf(window, '')), { width: 800, height: 600 });
});

test('a serialized SVG is a stand-alone file with namespace, size and view box', () => {
  const window = blank();
  const text = serializeSvg(svgOf(window, 'width="300" height="150"'), window);
  assert.match(text, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<svg /);
  assert.match(text, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(text, /width="300" height="150"/);
  assert.match(text, /viewBox="0 0 300 150"/);
  const own = serializeSvg(svgOf(window, 'viewBox="0 0 200 100"'), window);
  assert.match(own, /viewBox="0 0 200 100"/);
  assert.match(own, /width="200" height="100"/);
});

test('a raster image is drawn on a canvas with a white background at the chosen scale', async () => {
  const { window, drawn } = imageWindow();
  const blob = await rasterize({ svg: svgOf(window, 'viewBox="0 0 200 100"'), window });
  assert.equal(blob.type, 'image/png');
  assert.deepEqual([drawn.canvas.width, drawn.canvas.height], [400, 200]);
  assert.deepEqual(drawn.fill, [0, 0, 400, 200]);
  assert.equal(drawn.context.fillStyle, '#ffffff');
  assert.deepEqual(drawn.image.slice(1), [0, 0, 400, 200]);
  assert.match(drawn.src, /^data:image\/svg\+xml;charset=utf-8,%3C%3Fxml/);
  const jpeg = await rasterize({ svg: svgOf(window), window, type: 'image/jpeg', scale: 1, background: '#eeeeee' });
  assert.equal(jpeg.type, 'image/jpeg');
  assert.equal(drawn.quality, 0.92);
  assert.deepEqual([drawn.canvas.width, drawn.canvas.height], [200, 100]);
  assert.equal(drawn.context.fillStyle, '#eeeeee');
});

test('a drawing that cannot be loaded or a canvas without a result is an error', async () => {
  const bad = imageWindow({ fail: true });
  await assert.rejects(rasterize({ svg: svgOf(bad.window), window: bad.window }), /could not be converted/);
  const empty = imageWindow({ noBlob: true });
  await assert.rejects(rasterize({ svg: svgOf(empty.window), window: empty.window }), /gave no image/);
});

test('a draw.io file holds the drawing as an image and escapes the name', () => {
  const svgText = `<svg>${'я'.repeat(9000)}</svg>`;
  const text = drawioFile({ title: 'A & "B" <C>', svgText, width: 200.4, height: 100.6 });
  assert.match(text, /<mxfile host="DSLKit">/);
  assert.match(text, /name="A &amp; &quot;B&quot; &lt;C&gt;"/);
  assert.match(text, /width="200" height="101" as="geometry"/);
  assert.match(text, /pageWidth="280" pageHeight="181"/);
  const encoded = /image=data:image\/svg\+xml,([A-Za-z0-9+/=]+);/.exec(text)[1];
  assert.equal(Buffer.from(encoded, 'base64').toString('utf8'), svgText);
  assert.match(drawioFile({ title: '', svgText: '<svg/>', width: 1, height: 1 }), /name="Diagram"/);
});

test('an HTML file is self-contained, shows the drawing and the escaped code', () => {
  const page = htmlFile({ title: 'Order <1>', svgText: '<?xml version="1.0"?>\n<svg id="x"></svg>', source: 'a < b & "c"' });
  assert.match(page, /<html lang="ru">/);
  assert.match(page, /<title>Order &lt;1&gt;<\/title>/);
  assert.match(page, /<figure><svg id="x"><\/svg><\/figure>/);
  assert.doesNotMatch(page, /<\?xml/);
  assert.match(page, /<h2>Код диаграммы<\/h2>/);
  assert.match(page, /<pre>a &lt; b &amp; &quot;c&quot;<\/pre>/);
  assert.doesNotMatch(page, /<script|https?:\/\//);
  const english = htmlFile({ title: '', svgText: '<svg/>', source: '', lang: 'en' });
  assert.match(english, /<html lang="en">/);
  assert.match(english, /<title>DSLKit<\/title>/);
  assert.match(english, /<h2>Diagram code<\/h2>/);
});

const editor = (page = editorHtml, extra = {}) => {
  const { window } = extra.imageWindow ?? { window: new JSDOM(page, { url: 'http://localhost/' }).window };
  if (extra.imageWindow) window.document.documentElement.innerHTML = new JSDOM(page).window.document.documentElement.innerHTML;
  const { document } = window;
  const saved = [];
  const api = initExport({ root: document, save: (blob, name) => saved.push({ blob, name }) });
  const remote = document.querySelector('.canvas__remote');
  return { window, document, api, saved, remote, status: document.querySelector('.canvas__status') };
};
const draw = ({ window, remote }) => {
  remote.hidden = false;
  remote.replaceChildren(svgOf(window, 'viewBox="0 0 200 100"'));
};
test('a page without export buttons gets no export', () => {
  const window = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initExport({ root: window.document }), null);
  const bare = new JSDOM('<!doctype html><html><body><div class="app-page--editor"></div></body></html>').window;
  assert.equal(initExport({ root: bare.document }), null);
});

test('without a diagram on the canvas the export says what to do', async () => {
  const { api, saved, status, remote } = editor();
  remote.hidden = true;
  assert.equal(await api.exportAs('svg'), false);
  assert.equal(status.textContent, 'Нет диаграммы для экспорта: сначала нажмите «Запустить».');
  remote.hidden = false;
  assert.equal(await api.exportAs('svg'), false, 'an empty canvas has no drawing either');
  assert.equal(saved.length, 0);
  draw({ window: remote.ownerDocument.defaultView, remote });
  assert.equal(await api.exportAs('pdf'), false, 'an unknown format');
  assert.equal(saved.length, 0);
});

test('every vector and document format becomes a file with a title based name', async () => {
  const context = editor();
  draw(context);
  const title = 'Order process';
  for (const [format, extension, type] of [
    ['svg', 'svg', 'image/svg+xml'],
    ['drawio', 'drawio', 'application/vnd.jgraph.mxfile'],
    ['html', 'html', 'text/html'],
  ]) {
    assert.equal(await context.api.exportAs(format), true, format);
    const { blob, name } = context.saved.at(-1);
    assert.equal(name, `${fileName(title, extension)}`);
    assert.equal(blob.type, type);
    assert.match(context.status.textContent, new RegExp(`Файл ${name.replace('.', '\\.')} сохранён`));
  }
});

test('PNG and JPEG are made by the canvas and named after the title', async () => {
  const image = imageWindow();
  const context = editor(editorHtml, { imageWindow: image });
  draw(context);
  assert.equal(await context.api.exportAs('png'), true);
  assert.equal(context.saved.at(-1).name, 'order-process.png');
  assert.equal(context.saved.at(-1).blob.type, 'image/png');
  assert.equal(await context.api.exportAs('jpeg'), true);
  assert.equal(context.saved.at(-1).name, 'order-process.jpg');
  assert.equal(context.saved.at(-1).blob.type, 'image/jpeg');
});

test('a failure while the file is prepared is shown, not thrown', async () => {
  const image = imageWindow({ fail: true });
  const context = editor(editorHtml, { imageWindow: image });
  draw(context);
  assert.equal(await context.api.exportAs('png'), false);
  assert.equal(context.status.textContent, 'Не удалось подготовить файл. Попробуйте ещё раз.');
  assert.equal(context.saved.length, 0);
});

test('the buttons of the menu start the export and the English page speaks English', async () => {
  const context = editor(editorHtml);
  draw(context);
  context.document.querySelector('[data-export="svg"]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(context.saved.length, 1);
  assert.equal(context.document.querySelectorAll('[data-export]').length, 5);
  const english = editor(editorHtmlEn);
  english.remote.hidden = true;
  await english.api.exportAs('svg');
  assert.equal(english.status.textContent, 'There is no diagram to export: press Run first.');
  draw(english);
  await english.api.exportAs('svg');
  assert.match(english.status.textContent, /^File .*\.svg saved\.$/);
  assert.equal(english.document.querySelectorAll('[data-export]').length, 5);
});

test('the file is handed to the browser as a download link', () => {
  const window = new JSDOM(editorHtml, { url: 'http://localhost/' }).window;
  const calls = [];
  window.URL.createObjectURL = (blob) => {
    calls.push(['create', blob.type]);
    return 'blob:test/1';
  };
  window.URL.revokeObjectURL = (url) => calls.push(['revoke', url]);
  window.HTMLAnchorElement.prototype.click = function click() {
    calls.push(['click', this.download, this.href]);
  };
  const api = initExport({ root: window.document });
  const remote = window.document.querySelector('.canvas__remote');
  remote.hidden = false;
  remote.replaceChildren(svgOf(window));
  return api.exportAs('svg').then(() => {
    assert.deepEqual(calls, [
      ['create', 'image/svg+xml'],
      ['click', 'order-process.svg', 'blob:test/1'],
      ['revoke', 'blob:test/1'],
    ]);
    assert.equal(window.document.querySelector('a[download]'), null, 'the link is removed again');
  });
});

test('the export works on a page without a status line', async () => {
  const window = new JSDOM(
    '<!doctype html><html lang="ru"><body><div class="app-page--editor"><button data-export="svg"></button><ol class="code__lines"><li class="code__line"><code>diagram graph "A"</code></li></ol><div class="canvas__remote"></div></div></body></html>',
  ).window;
  const saved = [];
  const api = initExport({ root: window.document, save: (blob, name) => saved.push(name) });
  assert.equal(await api.exportAs('svg'), false);
  window.document.querySelector('.canvas__remote').replaceChildren(svgOf(window));
  assert.equal(await api.exportAs('svg'), true);
  assert.deepEqual(saved, ['a.svg']);
});
