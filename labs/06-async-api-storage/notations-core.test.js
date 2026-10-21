import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { findCycle, parseAttrs, parseHeader, sourceLines, unquote, wrap } from '../../site/js/notations/common.js';
import {
  KEYWORDS,
  MESSAGES,
  NOTATIONS,
  NOTATION_KEYS,
  TEMPLATES,
  formatProblem,
  generate,
  hasLocalRenderer,
  notationName,
  notationShort,
  parseDiagram,
  pickFormat,
  renderNotation,
} from '../../site/js/notations/index.js';
import { UI, ui } from '../../site/js/notations/messages.js';
import { sanitizeSvg } from '../../site/js/utils/dataParser.js';

const parser = new new JSDOM('').window.DOMParser();
const errorsOf = (source) => parseDiagram(source).problems.filter((item) => item.severity === 'error');
const codes = (source) => parseDiagram(source).problems.map((item) => item.code);

test('sourceLines drops blanks and comments and keeps real line numbers', () => {
  assert.deepEqual(sourceLines('a\n\n// note\n  b  \r\nc'), [
    { n: 1, text: 'a' },
    { n: 4, text: 'b' },
    { n: 5, text: 'c' },
  ]);
});

test('parseHeader reads the notation, the optional kind and the title', () => {
  assert.deepEqual(parseHeader('diagram DFD "My \\"flow\\""'), { notation: 'dfd', kind: '', title: 'My "flow"' });
  assert.deepEqual(parseHeader('diagram uml class'), { notation: 'uml', kind: 'class', title: '' });
  assert.equal(parseHeader('box A "x"'), null);
  assert.equal(unquote('a\\nb\\"c'), 'a\nb"c');
});

test('wrap breaks long text and keeps explicit line breaks', () => {
  assert.deepEqual(wrap('one two three', 7), ['one two', 'three']);
  assert.deepEqual(wrap('a\nb', 10), ['a', 'b']);
  assert.deepEqual(wrap('', 5), ['']);
});

test('parseAttrs reads flags and key=value pairs', () => {
  assert.deepEqual(parseAttrs(' sync weight=3 '), { sync: true, weight: '3' });
  assert.deepEqual(parseAttrs(undefined), {});
});

test('findCycle returns the edges of a cycle or nothing', () => {
  const edge = (from, to) => ({ from, to });
  assert.deepEqual(findCycle([edge('a', 'b'), edge('b', 'c')]), []);
  assert.deepEqual(
    findCycle([edge('x', 'a'), edge('a', 'b'), edge('b', 'a')]).map((item) => item.from),
    ['a', 'b'],
  );
  assert.equal(findCycle([edge('a', 'a')]).length, 1);
  assert.equal(findCycle([edge('a', 'b'), edge('c', 'b'), edge('b', 'd'), edge('d', 'c')]).length, 3);
});

test('the registry holds the IDEF family, the data and process notations, graphs and all 14 UML diagrams', () => {
  assert.equal(NOTATION_KEYS.filter((key) => key.startsWith('uml-')).length, 14);
  ['idef0', 'idef1', 'idef1x', 'idef3', 'idef4', 'idef5', 'dfd', 'erd', 'bpmn', 'petri', 'gost', 'graph', 'dag'].forEach((key) =>
    assert.ok(NOTATIONS[key], key),
  );
  NOTATION_KEYS.forEach((key) => {
    assert.ok(NOTATIONS[key].name.ru && NOTATIONS[key].name.en && NOTATIONS[key].short, key);
    assert.ok(TEMPLATES[key], `${key} has a template`);
  });
});

test('every template is valid, exports to every format it lists and draws SVG that survives the sanitizer', () => {
  NOTATION_KEYS.forEach((key) => {
    const model = parseDiagram(TEMPLATES[key]);
    assert.equal(model.notation, key);
    assert.equal(model.empty, false, key);
    assert.deepEqual(
      model.problems.filter((item) => item.severity === 'error'),
      [],
      key,
    );
    Object.keys(NOTATIONS[key].generators).forEach((format) => {
      const text = generate(model, format);
      assert.ok(text.length > 20, `${key} ${format}`);
      assert.doesNotMatch(text, /undefined|NaN|\[object/, `${key} ${format}`);
    });
    if (hasLocalRenderer(model)) {
      const svg = renderNotation(model);
      assert.doesNotMatch(svg, /undefined|NaN/, key);
      assert.ok(sanitizeSvg(svg, parser), key);
    }
  });
});

test('a template of every notation only uses keywords the editor highlights', () => {
  NOTATION_KEYS.forEach((key) => {
    const first = TEMPLATES[key].split('\n')[0].split(' ')[0];
    assert.ok(KEYWORDS.has(first), first);
  });
});

test('headers pick the notation, report unknown ones and warn about a missing header', () => {
  assert.equal(parseDiagram('diagram uml-class\nclass A').notation, 'uml-class');
  assert.equal(parseDiagram('diagram uml sequence\nparticipant A').notation, 'uml-sequence');
  assert.deepEqual(codes('diagram flowchart'), ['header-unknown']);
  assert.deepEqual(codes('diagram uml'), ['header-kind']);
  assert.deepEqual(codes('diagram uml mindmap'), ['header-kind-unknown']);
  assert.equal(parseDiagram('diagram uml mindmap').notation, null);
  assert.ok(codes('diagram dfd extra\nprocess 1').includes('header-extra'));
  const bare = parseDiagram('box A "x" {\n}\n');
  assert.equal(bare.notation, 'idef0');
  assert.equal(bare.problems[0].code, 'no-header');
  assert.equal(parseDiagram('').empty, true);
  assert.deepEqual(parseDiagram('   \n').problems, []);
  assert.equal(parseDiagram('diagram idef0 "Legacy"\nbox A0 "x"').title, 'Legacy');
});

test('problems come sorted by line', () => {
  const lines = parseDiagram('diagram dfd\nprocess 1\nentity E\nflow E -> 1 "x"\nbad\nflow 1 -> Nope').problems.map((item) => item.line);
  assert.deepEqual(
    lines,
    [...lines].sort((a, b) => a - b),
  );
});

test('pickFormat keeps a supported format and falls back for the others', () => {
  const timing = parseDiagram(TEMPLATES['uml-timing']);
  assert.equal(pickFormat(timing, 'graphviz'), 'plantuml');
  assert.equal(pickFormat(timing, 'plantuml'), 'plantuml');
  const sequence = parseDiagram(TEMPLATES['uml-sequence']);
  assert.equal(pickFormat(sequence, 'graphviz'), 'plantuml');
  assert.equal(pickFormat(sequence, 'mermaid'), 'mermaid');
  const graph = parseDiagram(TEMPLATES.graph);
  assert.equal(pickFormat(graph, 'plantuml'), 'mermaid');
  assert.match(generate(graph, 'plantuml'), /^flowchart/);
  assert.match(generate({ boxes: [], arrows: [], title: '' }, 'graphviz'), /^digraph/);
});

test('notation names exist in both languages', () => {
  const model = parseDiagram(TEMPLATES.bpmn);
  assert.match(notationName(model, 'ru'), /бизнес/);
  assert.match(notationName(model, 'en'), /business/);
  assert.equal(notationName(model, 'de'), notationName(model, 'ru'));
  assert.equal(notationShort(model), 'BPMN');
});

test('every problem code used by the notation modules has a Russian and an English text', () => {
  const dir = new URL('../../site/js/notations/', import.meta.url);
  const used = new Set();
  readdirSync(dir)
    .filter((file) => file.endsWith('.js'))
    .forEach((file) => {
      const text = readFileSync(new URL(file, dir), 'utf8');
      for (const match of text.matchAll(/'(?:error|warning|info)',\s*'([a-z0-9-]+)'/g)) used.add(match[1]);
      for (const match of text.matchAll(/'((?:uml|idef\d?x?|dfd|petri|gost|dag|graph|erd|class|seq|state|uc|flow|gateway|bpmn)-[a-z0-9-]+)'\s*\]/g))
        used.add(match[1]);
    });
  ['no-header', 'header-unknown', 'header-kind', 'header-kind-unknown', 'header-extra', 'idef4-construct', 'erd-no-pk'].forEach((code) => used.add(code));
  used.forEach((code) => assert.ok(MESSAGES[code], `missing text for ${code}`));
  Object.entries(MESSAGES).forEach(([code, text]) => {
    assert.ok(text.ru && text.en, code);
    assert.deepEqual([...text.ru.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), [...text.en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), code);
  });
});

test('formatProblem and ui fill the placeholders in both languages', () => {
  const item = { code: 'duplicate', params: { id: 'A', first: 3 } };
  assert.equal(formatProblem(item, 'ru'), 'Идентификатор «A» уже объявлен в строке 3');
  assert.equal(formatProblem(item, 'en'), 'Identifier "A" is already declared on line 3');
  assert.equal(formatProblem(item, 'xx'), formatProblem(item, 'ru'));
  assert.equal(ui('banner', { n: 2 }, 'en'), 'Errors: 2');
  assert.equal(ui('banner', { n: 2 }, 'ru'), 'Ошибок: 2');
  assert.ok(Object.values(UI).every((entry) => entry.ru && entry.en));
});

test('errorsOf helper sees an unknown line in every notation as an error', () => {
  NOTATION_KEYS.filter((key) => key !== 'idef0').forEach((key) => {
    const header = TEMPLATES[key].split('\n')[0];
    const found = errorsOf(`${header}\n???`);
    assert.ok(
      found.some((item) => item.code === 'syntax' && item.line === 2),
      key,
    );
  });
});
