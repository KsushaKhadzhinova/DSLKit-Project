import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initAutomation } from '../../site/js/components/automation.js';
import { initEditor } from '../../site/js/components/editor.js';
import { initToasts } from '../../site/js/components/toast.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const page = readFileSync('site/app/editor.html', 'utf8');
const pageEn = readFileSync('site/en/app/editor.html', 'utf8');
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GRAPH = JSON.stringify({
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  edges: [{ from: 'a', to: 'b' }],
});

const setup = ({ available = false, source = page } = {}) => {
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    json: async () => (url === '/api/ai/status' ? { available, model: 'm', maxImageMb: 1 } : {}),
  });
  const window = new JSDOM(source, { url: 'http://localhost/app/editor.html' }).window;
  const storage = createStorage(createMemoryBackend());
  initEditor({ root: window.document, storage, setTimer: () => 0, clearTimer: () => {} });
  initToasts({ root: window.document, storage });
  const api = initAutomation({ root: window.document, storage, fetchImpl });
  const $ = (selector) => window.document.querySelector(selector);
  return { api, window, $, status: () => $('.auto__status').textContent };
};

// A zip with one stored entry, enough for the reader of .vsdx.
const zip = (name, text) => {
  const nameBytes = Buffer.from(name);
  const data = Buffer.from(text);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(nameBytes.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt16LE(nameBytes.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 10);
  const head = Buffer.concat([local, nameBytes, data]);
  end.writeUInt32LE(head.length, 16);
  return Buffer.concat([head, central, nameBytes, end]);
};

test('the hint of the code tab lists the formats and the file input accepts them', async () => {
  const { api, $ } = setup();
  await api.refreshStatus();
  api.setMode('code');
  assert.match($('.auto__hint').textContent, /draw\.io/);
  assert.match($('.auto__hint').textContent, /10 МБ/);
  assert.match($('.auto__file-input').accept, /\.drawio/);
  const en = setup({ source: pageEn });
  en.api.setMode('image');
  assert.match(en.$('.auto__hint').textContent, /Up to 10 MB/);
});

test('a diagram file dropped in the picture tab moves to the code tab and is built without a key', async () => {
  const { api, window, $, status } = setup();
  api.setMode('image');
  assert.equal(await api.takeFile(new window.File([GRAPH], 'g.json', { type: 'application/json' })), true);
  assert.equal($('[data-auto-source="code"]').getAttribute('aria-pressed'), 'true');
  await api.build();
  assert.match($('.auto__preview').textContent, /^diagram graph/);
  assert.match(status(), /Диаграмма построена \(импорт\)/);
});

test('a file with no structure gets the clear reason', async () => {
  const { api, window, status } = setup();
  api.setMode('code');
  await api.takeFile(new window.File(['<svg><rect/></svg>'], 'x.svg'));
  await api.build();
  assert.match(status(), /не нашлось элементов/);
});

test('a picture in the code tab moves to the picture tab and says it needs the key', async () => {
  const { api, window, $, status } = setup();
  api.setMode('code');
  assert.equal(await api.takeFile(new window.File([PNG], 'a.png', { type: 'image/png' })), true);
  assert.equal($('[data-auto-source="image"]').getAttribute('aria-pressed'), 'true');
  assert.match(status(), /читает только ИИ/);
  const keyed = setup({ available: true });
  await keyed.api.refreshStatus();
  assert.equal(await keyed.api.takeFile(new keyed.window.File([PNG], 'a.pdf')), true);
  assert.equal(keyed.status(), '');
});

test('BMP, huge and unknown files are refused', async () => {
  const { api, window, status } = setup();
  await api.takeFile(new window.File([PNG], 'a.bmp'));
  assert.match(status(), /BMP/);
  await api.takeFile({ name: 'big.drawio', size: 11 * 1024 * 1024 });
  assert.match(status(), /больше 10 МБ/);
  api.setMode('image');
  await api.takeFile(new window.File(['x'], 'a.bin'));
  assert.match(status(), /Нужна картинка/);
});

test('a .vsdx file is unpacked to the XML of its first page', async () => {
  const { api, window, $, status } = setup();
  const xml = '<PageContents><Shapes><Shape ID="1"><Text>A</Text></Shape></Shapes></PageContents>';
  const file = new window.File([zip('visio/pages/page1.xml', xml)], 'v.vsdx');
  file.arrayBuffer = async () => new Uint8Array(zip('visio/pages/page1.xml', xml)).buffer;
  assert.equal(await api.takeFile(file), true);
  assert.match($('.auto__text').value, /PageContents/);
  await api.takeFile({ name: 'bad.vsdx', size: 5, arrayBuffer: async () => new ArrayBuffer(40) });
  assert.match(status(), /Не удалось прочитать файл/);
});
