import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATIONS, TEMPLATES, parseDiagram } from '../../site/js/notations/index.js';
import { addElement, connectElements, gate, linksFor, nextId, paletteFor, removeElement } from '../../site/js/utils/palette.js';

test('every notation gets a palette from its own statements, and an unknown one gets none', () => {
  assert.deepEqual(
    paletteFor('dfd').map((item) => item.keyword),
    ['entity', 'process', 'store'],
  );
  assert.equal(paletteFor('idef0')[0].label[0], 'Блок функции');
  assert.equal(paletteFor('uml-class').length, 2);
  assert.deepEqual(paletteFor('unknown'), []);
  assert.equal(paletteFor('gost').find((item) => item.keyword === 'offpage').label[1], 'offpage');
  Object.keys(NOTATIONS).forEach((key) => assert.ok(paletteFor(key).length >= 1, key));
});

test('links of a notation: its own statements or the edges of its spec', () => {
  assert.equal(linksFor('idef0')[0].make('A1', 'A2'), 'arrow A1.output -> A2.input');
  assert.equal(linksFor('erd')[0].make('A', 'B'), 'relationship A 1:N B');
  assert.equal(linksFor('graph')[0].make('A', 'B'), 'edge A -- B');
  assert.equal(linksFor('dfd')[0].make('a', 'b'), 'flow a -> b');
  assert.deepEqual(linksFor('unknown'), []);
  assert.equal(linksFor('uml-class').length, 6);
  assert.equal(linksFor('uml-sequence')[0].make('A', 'B'), 'A -> B : message');
  assert.deepEqual(linksFor('uml-timing'), []);
});

test('a new identifier is the first one that no line uses', () => {
  assert.equal(nextId('box A1 "x" {\nbox A2 "y" {', 'A'), 'A3');
  assert.equal(nextId('arrow A1.output -> A2.input', 'A'), 'A3');
  assert.equal(nextId('', 'E'), 'E1');
  assert.equal(nextId('process P1 "x"\nprocess P3 "y"', 'P'), 'P2');
});

test('an element is added to the end, with a place when the drawing can keep one', () => {
  const dfd = paletteFor('dfd')[1];
  const placed = addElement(TEMPLATES.dfd, 'dfd', dfd, { x: 300, y: 200 });
  assert.match(placed.code, /process P1 "Process" pos=300x200$/);
  assert.equal(placed.id, 'P1');
  assert.ok(!addElement(TEMPLATES.dfd, 'dfd', dfd, null).code.includes('pos='));
  const seq = addElement(TEMPLATES['uml-sequence'], 'uml-sequence', paletteFor('uml-sequence')[1], { x: 1, y: 2 });
  assert.ok(!seq.code.includes('pos='));
  const box = addElement(TEMPLATES.idef0, 'idef0', paletteFor('idef0')[0], { x: 400, y: 300 });
  assert.match(box.code, /box A4 "A4 function" pos=310x260 \{/);
  assert.equal(addElement('', 'dfd', dfd, null).code, '\nprocess P1 "Process"');
});

test('a port is made for the first part or classifier of the code', () => {
  const port = paletteFor('uml-composite').find((item) => item.keyword === 'port');
  assert.match(addElement(TEMPLATES['uml-composite'], 'uml-composite', port, null).code, /port P1 "Port" of=\S+/);
  assert.match(addElement('diagram uml composite "T"', 'uml-composite', port, null).code, /of=P1$/);
});

test('connecting writes the statement of the notation', () => {
  assert.equal(connectElements('code\n', linksFor('dfd')[0], 'a', 'b'), 'code\nflow a -> b');
});

test('the gate refuses a new error, tolerates unfinished work and old errors', () => {
  const before = TEMPLATES.dfd;
  const wrong = connectElements(before, linksFor('dfd')[0], 'Customer', 'Bank');
  const refused = gate(before, wrong);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /не касается процесса/);
  assert.equal(refused.problem.code, 'dfd-no-process');
  assert.match(gate(before, wrong, 'en').message, /touches no process/);
  const unfinished = addElement(before, 'dfd', paletteFor('dfd')[1], null).code;
  assert.deepEqual(gate(before, unfinished), { ok: true, message: '', problem: null });
  const brokenBefore = `${before}\nflow Customer -> Bank "old"`;
  assert.equal(gate(brokenBefore, `${brokenBefore}\nprocess P9 "ok"`).ok, true);
  assert.equal(gate(brokenBefore, `${brokenBefore}\nflow Bank -> Customer "new"`).ok, false);
});

test('an element of every notation can be added without a new hard error', () => {
  const hard = new Set(['flow-multi-start', 'mm-root']);
  Object.keys(NOTATIONS).forEach((key) => {
    paletteFor(key).forEach((item) => {
      const next = addElement(TEMPLATES[key], key, item, { x: 300, y: 200 }).code;
      const verdict = gate(TEMPLATES[key], next);
      assert.ok(verdict.ok || hard.has(verdict.problem.code), `${key} ${item.keyword}: ${verdict.message}`);
      assert.ok(
        parseDiagram(next).problems.every((problem) => problem.code !== 'syntax' && problem.code !== 'syntax-short'),
        `${key} ${item.keyword} syntax`,
      );
    });
  });
});

test('every link of every notation writes one statement that names both ends', () => {
  Object.keys(NOTATIONS).forEach((key) => {
    linksFor(key).forEach((link) => {
      const line = link.make('a1', 'b2');
      assert.ok(line.includes('a1') && line.includes('b2'), `${key} ${link.id}`);
    });
  });
});

test('a place that is not a number is dropped and the element is still added', () => {
  const result = addElement(TEMPLATES.dfd, 'dfd', paletteFor('dfd')[1], { x: Number.NaN, y: 1 });
  assert.ok(result.code.endsWith('process P1 "Process"'));
});

test('removing an element takes its block and every link that touches it', () => {
  const box = removeElement(TEMPLATES.idef0, 'A2');
  assert.equal(box.links, 2);
  assert.ok(!box.code.includes('A2'));
  assert.ok(box.code.includes('box A1') && box.code.includes('box A3'));
  assert.deepEqual(
    parseDiagram(box.code).problems.filter((item) => item.severity === 'error'),
    [],
  );
  const process = removeElement(TEMPLATES.dfd, '2');
  assert.equal(process.links, 4);
  assert.ok(process.code.includes('Customer') && !process.code.includes('process 2'));
  assert.equal(removeElement(TEMPLATES.erd, 'Customer').links, 2);
  assert.equal(removeElement(TEMPLATES['uml-class'], 'Customer').links, 2);
  assert.equal(removeElement(TEMPLATES['uml-sequence'], 'Shop').links, 5);
});

test('removing keeps comments and quoted words, and reports an unknown element', () => {
  const code = ['diagram dfd "T"', '// flow a -> b mentions a', 'entity a "flow a -> b"', 'entity b', 'process 1 "p"', 'flow a -> 1 "x"', 'flow 1 -> b'].join(
    '\n',
  );
  const result = removeElement(code, 'a');
  assert.equal(result.links, 1);
  assert.ok(result.code.includes('// flow a -> b mentions a'));
  assert.ok(!result.code.includes('entity a'));
  assert.equal(removeElement(code, 'nope'), null);
  const open = removeElement(['diagram erd "T"', 'entity A {', '  id: int pk'].join('\n'), 'A');
  assert.equal(open.code, 'diagram erd "T"');
  assert.equal(removeElement('entity X.Y', 'X.Y').code, '');
});
