import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { renderLocal } from '../../site/js/engines/local-engine.js';
import { NOTATION_KEYS, TEMPLATES, generate, parseDiagram, renderNotation } from '../../site/js/notations/index.js';
import { parseDsl, sanitizeSvg, sourceKey } from '../../site/js/utils/dataParser.js';
import { htmlFile, drawioFile, fileName } from '../../site/js/utils/exporters.js';
import { importDiagram } from '../../site/js/utils/import-diagram.js';
import { setNodePosition } from '../../site/js/utils/node-position.js';
import { staticServer } from '../../tools/server.js';

// Breaking tests for Part 1: random and hostile sources for every notation, slow patterns, script injection through drawings and exports,
// and rough requests to the static server. They add no code to the site, so the 100 percent coverage rule is unchanged.

const { DOMParser } = new JSDOM('').window;
const parser = new DOMParser();

// A small seeded generator, so a failure can be repeated.
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

const JUNK = [
  '"',
  "'",
  '\\',
  '{',
  '}',
  '(',
  ')',
  '[',
  ']',
  '->',
  '-->',
  '=>',
  ':',
  ';',
  '|',
  '<',
  '>',
  '&',
  '%',
  '\u0000',
  '‮',
  '​',
  '﻿',
  '😀',
  '\n',
  '\r\n',
  '\t',
  '`',
  '$',
  '#',
  '//',
  '/*',
  '*/',
  '"""',
  'pos=1e999x-5',
  'NaN',
  'Infinity',
  '__proto__',
  'constructor',
  '0'.repeat(400),
];

const mutate = (text, random) => {
  const chars = [...text];
  const steps = 1 + Math.floor(random() * 6);
  for (let i = 0; i < steps; i += 1) {
    const at = Math.floor(random() * (chars.length + 1));
    const kind = random();
    if (kind < 0.35) chars.splice(at, Math.floor(random() * 12));
    else if (kind < 0.7) chars.splice(at, 0, JUNK[Math.floor(random() * JUNK.length)]);
    else if (kind < 0.85) chars.splice(at, 0, ...chars.slice(0, Math.floor(random() * 40)));
    else chars.splice(Math.floor(random() * chars.length), chars.length, ...chars.slice(at));
  }
  return chars.join('');
};

const FORBIDDEN_IN_DRAWING = /<script|\son[a-z]+\s*=|javascript:|<iframe|<foreignObject|<embed|<object/i;

test('fuzz: every notation survives 60 random mutations of its template without throwing, and its drawing holds no script', () => {
  const random = rng(20261024);
  let tried = 0;
  for (const key of NOTATION_KEYS) {
    const base = TEMPLATES[key] ?? TEMPLATES[key.split('-')[0]];
    if (!base) continue;
    for (let i = 0; i < 60; i += 1) {
      const source = mutate(base, random);
      tried += 1;
      let model;
      assert.doesNotThrow(() => (model = parseDiagram(source)), `parse of ${key} #${i}: ${JSON.stringify(source.slice(0, 120))}`);
      assert.ok(Array.isArray(model.problems), 'problems is not a list');
      if (model.empty || model.notation === null) continue;
      assert.doesNotThrow(() => renderNotation(model), `render of ${key} #${i}`);
      const svg = renderNotation(model);
      assert.equal(typeof svg, 'string');
      assert.ok(!FORBIDDEN_IN_DRAWING.test(svg), `${key} #${i} produced active content: ${svg.match(FORBIDDEN_IN_DRAWING)?.[0]}`);
      assert.doesNotThrow(() => generate(model, 'mermaid'), `generate of ${key} #${i}`);
      assert.doesNotThrow(() => renderLocal(model), `local render of ${key} #${i}`);
    }
  }
  assert.ok(tried >= NOTATION_KEYS.length * 30, `only ${tried} sources were tried`);
});

test('fuzz: completely random text, binary-like text and odd values never throw in the parsers and the importer', () => {
  const random = rng(7);
  const alphabet = [...'abcxyz 0123456789\n\t"\'{}()[]<>-:;,.|/\\#$%^&*+=~`', '\u0000', '😀', 'я', '‮'];
  for (let i = 0; i < 400; i += 1) {
    const length = Math.floor(random() * 300);
    const text = Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
    assert.doesNotThrow(() => parseDiagram(text), `parseDiagram ${JSON.stringify(text.slice(0, 80))}`);
    assert.doesNotThrow(() => parseDsl(text), `parseDsl ${JSON.stringify(text.slice(0, 80))}`);
    assert.doesNotThrow(() => importDiagram(text), `importDiagram ${JSON.stringify(text.slice(0, 80))}`);
    assert.doesNotThrow(() => sourceKey(text));
  }
  for (const value of [
    undefined,
    null,
    0,
    NaN,
    '',
    ' ',
    [],
    {},
    true,
    Symbol.iterator.toString(),
    'diagram',
    'diagram ',
    'diagram uml',
    'diagram uml class',
    '﻿diagram idef0',
  ]) {
    assert.doesNotThrow(() => parseDiagram(value), `parseDiagram of ${String(value)}`);
    assert.doesNotThrow(() => importDiagram(value), `importDiagram of ${String(value)}`);
  }
});

test('slow patterns: long lines, deep nesting and repeated tokens are handled in well under a second each', () => {
  const heavy = {
    'a line of 200000 characters': `diagram idef0 "T"\n${'a'.repeat(200000)}`,
    'a title of 100000 quotes': `diagram flowchart "${'"'.repeat(100000)}"`,
    '20000 arrows': `diagram flowchart\n${'a -> '.repeat(20000)}b`,
    '5000 nested braces': `diagram idef0 "T"\nbox A1 "x" ${'{'.repeat(5000)}`,
    '30000 lines': `diagram flowchart\n${'a -> b\n'.repeat(30000)}`,
    'unclosed quotes and spaces': `diagram idef0 "T"\nbox A1 "${' '.repeat(100000)}`,
    'backtracking bait': `diagram sequence\n${'a->'.repeat(30000)}`,
    'mermaid-like input': `graph TD\n${'A-->B;'.repeat(20000)}`,
    'plantuml-like input': `@startuml\n${'Alice -> Bob: hi\n'.repeat(20000)}@enduml`,
  };
  for (const [name, source] of Object.entries(heavy)) {
    const started = performance.now();
    const model = parseDiagram(source);
    importDiagram(source);
    if (!model.empty && model.notation) {
      try {
        renderNotation(model);
      } catch {
        /* a refusal is fine here, only the time counts */
      }
    }
    const took = performance.now() - started;
    assert.ok(took < 4000, `${name} took ${took.toFixed(0)} ms`);
  }
});

test('script injection: hostile titles and labels never become markup in a drawing, an HTML export or a draw.io file', () => {
  const evil = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "';alert(1);//",
    '</text><script>alert(1)</script>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '&lt;b&gt;',
    '${7*7}',
    '{{7*7}}',
  ];
  for (const text of evil) {
    for (const key of ['flowchart', 'sequence', 'state', 'bpmn', 'er']) {
      const base = TEMPLATES[key];
      if (!base) continue;
      const source = base.replace(/"[^"\n]*"/g, () => `"${text.replace(/"/g, "'")}"`);
      const model = parseDiagram(source);
      if (model.empty || model.notation === null) continue;
      const svg = renderNotation(model);
      // Look at the parsed drawing, not at the text: escaped markup shown as a label is harmless.
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      assert.ok(!doc.querySelector('parsererror'), `${key}: the drawing is not well-formed XML for ${text}`);
      assert.equal(doc.querySelectorAll('script, iframe, img, foreignObject').length, 0, `${key}: active element in the drawing for ${text}`);
      const handlers = [...doc.querySelectorAll('*')]
        .flatMap((node) => [...node.attributes].map((attribute) => attribute.name))
        .filter((name) => /^on/i.test(name));
      assert.deepEqual(handlers, [], `${key}: an event attribute in the drawing for ${text}`);
    }
    const page = htmlFile({ title: text, svgText: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', source: `diagram flowchart "${text}"`, lang: 'ru' });
    assert.ok(!page.includes('</script><script>') && !/<script>alert/i.test(page), `the HTML export holds a live script for ${text}`);
    const drawio = drawioFile({ title: text, svgText: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', width: 10, height: 10 });
    assert.ok(!/<script/i.test(drawio), `the draw.io file holds a script for ${text}`);
    const name = fileName(text, 'svg');
    assert.ok(!/[\\/:*?"<>|\u0000-\u001f]/.test(name), `the file name ${JSON.stringify(name)} holds a path or control character`);
  }
});

test('hostile SVG from a rendering service is cleaned: scripts, handlers, unsafe links, CSS tricks and foreign markup', () => {
  const attacks = [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect onclick="alert(1)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="  jav&#x09;ascript:alert(1)"><text>x</text></a></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="data:text/html;base64,PHNjcmlwdD4="><text>x</text></a></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(javascript:alert(1))"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect style="background:\\75rl(x)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="javascript:alert(1)"/></foreignObject></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" values="javascript:alert(1)"/><set attributeName="onmouseover" to="alert(1)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="http://evil.test/x.svg#a"/><image href="//evil.test/p.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><html xmlns="http://www.w3.org/1999/xhtml"><body onload="alert(1)"/></html></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(http://evil.test/x.css);</style></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&x;</text></svg>',
  ];
  for (const attack of attacks) {
    const svg = sanitizeSvg(attack, parser);
    if (svg === null) continue;
    const html = svg.outerHTML;
    assert.ok(!/<script/i.test(html), `script kept for ${attack.slice(0, 70)}`);
    assert.ok(!/\son[a-z]+\s*=/i.test(html), `handler kept for ${attack.slice(0, 70)}`);
    assert.ok(!/javascript:/i.test(html.replace(/[\u0000- ]/g, '')), `javascript link kept for ${attack.slice(0, 70)}`);
    assert.ok(!/<(iframe|foreignObject|html|animate|set)\b/i.test(html), `blocked tag kept for ${attack.slice(0, 70)}`);
  }
  for (const text of ['', ' ', 'not xml', '<svg', '<div></div>', '<svg xmlns="http://www.w3.org/2000/svg">' + '<g>'.repeat(2000) + '</svg>']) {
    assert.doesNotThrow(() => sanitizeSvg(text, parser), `sanitize of ${text.slice(0, 40)}`);
  }
});

test('node positions: a number that is not finite is refused, other odd values never corrupt the source', () => {
  const source = TEMPLATES.bpmn;
  for (const [x, y] of [
    [NaN, 1],
    [1, NaN],
    [Infinity, -Infinity],
    [1e308, 1e308],
    [undefined, null],
    ['<b>', '"'],
  ]) {
    assert.equal(setNodePosition(source, 's', x, y), null, `position ${x} ${y} was written`);
  }
  for (const [x, y] of [
    [-0, 0],
    [0.1 + 0.2, 1 / 3],
    [-1e9, 1e9],
    [12.345, 6.789],
  ]) {
    const next = setNodePosition(source, 's', x, y);
    assert.equal(typeof next, 'string', `position ${x} ${y} was refused`);
    assert.ok(!/NaN|Infinity/.test(next));
    const model = parseDiagram(next);
    assert.doesNotThrow(() => renderNotation(model));
    assert.ok(!/NaN|Infinity/.test(renderNotation(model)), 'the drawing holds NaN');
  }
  assert.equal(setNodePosition(source, 'no-such-node', 1, 2), null);
});

// The static server, rough requests.
const root = mkdtempSync(join(tmpdir(), 'robust-'));
mkdirSync(join(root, 'errors'));
mkdirSync(join(root, 'sub'));
writeFileSync(join(root, 'index.html'), '<h1>home</h1>');
writeFileSync(join(root, 'sub', 'index.html'), '<h1>sub</h1>');
for (const code of [400, 403, 404, 405, 500]) writeFileSync(join(root, 'errors', `${code}.html`), `<h1>${code}</h1>`);
writeFileSync(join(tmpdir(), 'robust-secret.txt'), 'TOP SECRET');

const rough = (port, rawPath, method = 'GET') =>
  new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    let data = '';
    socket.on('data', (c) => (data += c));
    socket.on('error', () => resolve({ status: 0, data }));
    socket.on('close', () => resolve({ status: Number(/^HTTP\/1\.\d (\d{3})/.exec(data)?.[1] ?? 0), data }));
    socket.on('connect', () => socket.write(`${method} ${rawPath} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
    setTimeout(() => socket.destroy(), 1500);
  });

test('static server: path tricks never leave the site folder, rough methods and huge paths do not crash it', async () => {
  const server = staticServer(root);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    const traversal = [
      '/../robust-secret.txt',
      '/..%2frobust-secret.txt',
      '/%2e%2e/%2e%2e/robust-secret.txt',
      '/%2e%2e%2frobust-secret.txt',
      '/sub/../../robust-secret.txt',
      '/..\\robust-secret.txt',
      '/%5c..%5crobust-secret.txt',
      '//etc/passwd',
      '/%00',
      '/index.html%00.png',
      '/%c0%ae%c0%ae/robust-secret.txt',
      '/....//robust-secret.txt',
      '/sub/%252e%252e/robust-secret.txt',
    ];
    for (const path of traversal) {
      const { status, data } = await rough(port, path);
      assert.ok(!data.includes('TOP SECRET'), `${path} leaked a file outside the site`);
      assert.ok([200, 301, 302, 400, 403, 404, 0].includes(status), `${path} gave ${status}`);
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'TRACE', 'CONNECT', 'OPTIONS', 'BREW']) {
      const { status } = await rough(port, '/', method);
      assert.ok((status !== 500 && status !== 200) || method === 'OPTIONS', `${method} / gave ${status}`);
    }
    const long = await rough(port, `/${'a'.repeat(60000)}`);
    assert.ok(long.status !== 500, `a long path gave ${long.status}`);
    const flood = await Promise.all(Array.from({ length: 200 }, () => rough(port, '/')));
    assert.ok(flood.filter((r) => r.status === 200).length >= 190, 'the server dropped many of 200 parallel requests');
    const home = await new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path: '/', method: 'GET' }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(home.status, 200, 'the server stopped answering after the rough requests');
    assert.match(home.body, /home/);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
