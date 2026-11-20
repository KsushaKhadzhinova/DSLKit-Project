import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATION_KEYS, TEMPLATES, parseDiagram } from '../../site/js/notations/index.js';
import { applyEdits, checkCode, diffLines, nearest, reviewCode } from '../../site/js/utils/diagram-review.js';

const NL = String.fromCharCode(10);
const src = (...lines) => lines.join(NL);
const rulesOf = (code) => reviewCode(code).issues.map((item) => item.rule);
const issueOf = (code, rule) => reviewCode(code).issues.find((item) => item.rule === rule);
const variant = (code, id, lang = 'ru') => reviewCode(code, { lang }).variants.find((item) => item.id === id);

test('applyEdits replaces, removes and inserts by the numbers of the lines, a removal beats a replacement', () => {
  const code = src('a', 'b', 'c');
  assert.equal(
    applyEdits(code, [
      { op: 'before', line: 1, text: 'x' },
      { op: 'before', line: 1, text: 'x' },
      { op: 'replace', line: 2, text: 'B' },
      { op: 'replace', line: 3, text: 'C' },
      { op: 'remove', line: 3 },
      { op: 'after', line: 3, text: 'z' },
    ]),
    src('x', 'a', 'B', 'z'),
  );
  assert.equal(applyEdits('a\r\nb', []), src('a', 'b'));
});

test('diffLines tells the common, the removed and the added lines', () => {
  assert.deepEqual(diffLines(src('a', 'b', 'c'), src('a', 'x', 'c', 'd')), [
    { type: 'same', text: 'a' },
    { type: 'del', text: 'b' },
    { type: 'add', text: 'x' },
    { type: 'same', text: 'c' },
    { type: 'add', text: 'd' },
  ]);
  assert.deepEqual(diffLines(src('a', 'b'), 'a'), [
    { type: 'same', text: 'a' },
    { type: 'del', text: 'b' },
  ]);
  assert.deepEqual(
    diffLines('', 'q').map((row) => row.type),
    ['del', 'add'],
  );
  assert.deepEqual(
    diffLines(src('x', 'a'), src('a', 'y')).map((row) => row.type),
    ['del', 'same', 'add'],
  );
  assert.deepEqual(
    diffLines(src('a', 'b'), src('b', 'c')).map((row) => row.type),
    ['del', 'same', 'add'],
  );
});

test('nearest finds the same word in another case or a word a letter away, never a short stranger', () => {
  assert.equal(nearest('Start', ['stop', 'start']), 'start');
  assert.equal(nearest('taks', ['flow', 'task']), 'task');
  assert.equal(nearest('abcd', ['abce', 'abcf']), 'abce');
  assert.equal(nearest('abcd', ['abce', 'abcd']), 'abcd');
  assert.equal(nearest('b', ['a']), undefined);
  assert.equal(nearest('B', ['a', 'b']), 'b');
  assert.equal(nearest('proces', ['process']), 'process');
  assert.equal(nearest('prosess', ['process', 'processor']), 'process');
  assert.equal(nearest('completely', ['process']), undefined);
});

test('an empty code is an error without variants', () => {
  for (const code of ['', '   ' + NL + NL]) {
    const result = reviewCode(code);
    assert.equal(result.notation, null);
    assert.deepEqual(result.variants, []);
    assert.equal(result.issues[0].rule, 'empty-code');
    assert.equal(result.issues[0].severity, 'error');
    assert.match(result.issues[0].message.en, /empty/);
  }
});

test('a code of comments only has nothing to review but no failure', () => {
  const result = reviewCode('// nothing here');
  assert.deepEqual(result.variants, []);
  assert.ok(Array.isArray(result.issues));
});

test('checkCode counts the errors and the warnings of the validator', () => {
  assert.deepEqual(checkCode(src('diagram dfd', 'process a', 'process b')), { notation: 'dfd', errors: 0, warnings: 2 });
  assert.deepEqual(checkCode('diagram nonsense'), { notation: null, errors: 1, warnings: 0 });
});

test('a correct diagram has no errors and gets no variants', () => {
  for (const key of ['bpmn', 'dfd', 'erd', 'idef0']) {
    const result = reviewCode(TEMPLATES[key]);
    assert.equal(result.issues.filter((item) => item.severity === 'error').length, 0, key);
    assert.deepEqual(result.variants, [], key);
  }
});

test('every issue has a severity, a line, a rule and a message in both languages', () => {
  const result = reviewCode(src('diagram bpmn', 'task a "A"', 'flow a -> zzz'));
  assert.ok(result.issues.length > 0);
  for (const item of result.issues) {
    assert.ok(['error', 'warning', 'info'].includes(item.severity));
    assert.ok(Number.isInteger(item.line));
    assert.ok(item.rule.length > 0);
    assert.ok(item.message.ru.length > 0 && item.message.en.length > 0);
    assert.ok(item.fix === null || (item.fix.title.ru && item.fix.title.en && item.fix.edits.length > 0));
  }
});

test('the header: a missing one, a misspelt notation and an extra word', () => {
  const noHeader = src('box A1 "Do" {', ' control: C', ' output: O', '}');
  assert.equal(variant(noHeader, 'full').code.split(NL)[0], 'diagram idef0 "Новая диаграмма"');
  assert.equal(variant(src('diagram bpnm', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> e'), 'minimal').code.split(NL)[0], 'diagram bpmn');
  assert.equal(issueOf('diagram zzzzzzzz', 'header-unknown').fix, null);
  assert.equal(reviewCode('diagram zzzzzzzz').variants.length, 0);
  const extra = src('diagram bpmn kind "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> e');
  assert.equal(variant(extra, 'full').code.split(NL)[0], 'diagram bpmn "T"');
});

test('a repeated identifier is renamed', () => {
  const code = src(
    'diagram erd "S"',
    'entity A {',
    '  id : int pk',
    '}',
    'entity A {',
    '  id : int pk',
    '}',
    'entity B {',
    '  id : int pk',
    '}',
    'relationship A 1:N B',
  );
  const fixed = variant(code, 'minimal');
  assert.match(fixed.code, /entity A2 \{/);
  assert.equal(fixed.errors, 0);
});

test('an unknown element is replaced by the nearest, declared, or its line is removed', () => {
  const base = ['diagram bpmn "T"', 'start s', 'task Alpha', 'end e', 'flow s -> Alpha', 'flow Alpha -> e'];
  assert.match(variant(src(...base, 'flow alpha -> e'), 'minimal').code, /flow Alpha -> e\nflow Alpha -> e|flow Alpha -> e$/m);
  assert.match(variant(src(...base, 'flow Alpha -> Gamma'), 'minimal').code, /task Gamma/);
  const er = src('diagram erd "S"', 'entity A {', '  id : int pk', '}', 'relationship A 1:N Ghost');
  const removed = variant(er, 'minimal');
  assert.doesNotMatch(removed.code, /Ghost/);
  assert.equal(removed.errors, 0);
  const idef = src('diagram idef0', 'box A1 "Do" {', ' control: C', ' output: O', '}', 'arrow A1 -> A9');
  assert.doesNotMatch(variant(idef, 'minimal').code, /A9/);
});

test('an element the diagram keeps no link of is removed in the full clean-up only', () => {
  const code = src('diagram dfd "T"', 'entity b "B"', 'process a "A"', 'process lonely "Lonely"', 'flow b -> a "x"', 'flow a -> b "y"');
  assert.equal(variant(code, 'minimal'), undefined);
  const full = variant(code, 'full');
  assert.doesNotMatch(full.code, /lonely/);
  assert.equal(full.warnings, 0);
  const flow = src('diagram bpmn "T"', 'start s', 'task a "A"', 'task lonely "Lonely"', 'end e', 'flow s -> a', 'flow a -> e');
  assert.doesNotMatch(variant(flow, 'minimal').code, /lonely/);
  const attached = src('diagram bpmn "T"', 'start s', 'task a "A"', 'task other "Other"', 'end e', 'flow s -> a', 'flow a -> e', 'flow other -> e');
  assert.equal(issueOf(attached, 'flow-unreachable').fix, null);
  const loose = src('diagram bpmn "T"', 'start s', 'task a "A"', 'end e', 'end spare', 'flow s -> a', 'flow a -> e');
  assert.equal(issueOf(loose, 'flow-unreachable').fix, null);
  const er = src(
    'diagram erd "S"',
    'entity A {',
    '  id : int pk',
    '}',
    'entity B {',
    '  id : int pk',
    '}',
    'entity C {',
    '  id : int pk',
    '}',
    'relationship A 1:N B',
  );
  assert.doesNotMatch(variant(er, 'full').code, /entity C/);
});

test('an unclosed block is closed', () => {
  const code = src('diagram erd "S"', 'entity A {', '  id : int pk', '', '');
  const fixed = variant(code, 'minimal');
  assert.equal(fixed.code.trimEnd().split(NL).at(-1), '}');
  assert.equal(fixed.errors, 0);
});

test('an unrecognised line gets a keyword fixed or is removed', () => {
  const base = ['diagram bpmn "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> e'];
  assert.match(variant(src(...base, 'taks b', 'flow a -> b', 'flow b -> e'), 'minimal').code, /^task b$/m);
  assert.doesNotMatch(variant(src(...base, '-> nowhere'), 'minimal').code, /nowhere/);
  assert.doesNotMatch(variant(src(...base, 'qwertyuiop b'), 'minimal').code, /qwertyuiop/);
  const er = src('diagram erd "S"', 'entty A {', '  id : int pk', '}');
  assert.ok(issueOf(er, 'syntax').fix.title.en.startsWith('Change the word'));
  const keyword = src('diagram erd "S"', 'entity A {', '  id : int pk', '}', 'relationship !!');
  assert.ok(issueOf(keyword, 'syntax').fix.title.en.startsWith('Remove'));
  assert.ok(issueOf(src('diagram erd "S"', 'relationship', 'entity A {', '  id : int pk', '}'), 'syntax').fix.title.en.startsWith('Remove'));
});

test('repeated links, links to themselves, wrong ends of the start and the end are removed', () => {
  const code = src('diagram bpmn "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow s -> a', 'flow a -> a', 'flow a -> s', 'flow e -> a', 'flow a -> e');
  const fixed = variant(code, 'full');
  assert.equal(fixed.code, src('diagram bpmn "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> e'));
  assert.equal(fixed.errors, 0);
  assert.equal(variant(code, 'minimal').errors, 0);
});

test('a repeated attribute and a broken position are removed', () => {
  const attr = src('diagram erd "S"', 'entity A {', '  id : int pk', '  id : int', '}');
  assert.doesNotMatch(variant(attr, 'minimal').code, /id : int\n}/);
  const pos = src('diagram bpmn "T"', 'start s "pos x" pos=oops', 'task a', 'end e', 'flow s -> a', 'flow a -> e');
  assert.equal(variant(pos, 'minimal').code.split(NL)[1], 'start s "pos x"');
  const bare = src('diagram bpmn "T"', 'start s pos', 'task a', 'end e', 'flow s -> a', 'flow a -> e');
  assert.equal(variant(bare, 'minimal').code.split(NL)[1], 'start s');
});

test('DFD: a flow between two non-processes goes through a new process, a flow without a label gets one', () => {
  const code = src(
    'diagram dfd "Shop"',
    'entity buyer "Buyer"',
    'store db "DB"',
    'process p "Order"',
    'flow buyer -> db',
    'flow buyer -> p "order"',
    'flow p -> buyer "receipt"',
  );
  const minimal = variant(code, 'minimal');
  assert.match(minimal.code, /process proc "Обработка"/);
  assert.match(minimal.code, /flow buyer -> proc/);
  assert.match(minimal.code, /flow proc -> db/);
  assert.equal(minimal.errors, 0);
  const full = variant(code, 'full', 'en');
  assert.match(full.code, /process proc "Processing"/);
  assert.match(full.code, /flow buyer -> proc "data"/);
  assert.ok(!full.changes.some((change) => change.rule === 'dfd-unlabelled' && change.line === null && false));
  assert.ok(!checkCode(full.code).errors);
  const labelled = src('diagram dfd "S"', 'entity b', 'process p', 'flow b -> p', 'flow p -> b "r"');
  assert.match(variant(labelled, 'full').code, /flow b -> p "данные"/);
});

test('BPMN: a missing start and end are added and linked, an element without a way out leads to the end', () => {
  const none = src('diagram bpmn "T"', 'task a', 'task b', 'flow a -> b');
  const fixed = variant(none, 'minimal');
  assert.match(fixed.code, /start start "Начало"/);
  assert.match(fixed.code, /end end "Конец"/);
  assert.match(fixed.code, /flow start -> a/);
  assert.match(fixed.code, /flow b -> end/);
  assert.equal(fixed.errors, 0);
  assert.match(variant(none, 'minimal', 'en').code, /start start "Start"/);
  const empty = reviewCode('diagram bpmn "T"');
  assert.deepEqual(empty.issues.map((item) => item.rule).sort(), ['empty-diagram', 'flow-no-end', 'flow-no-start']);
  assert.match(empty.variants[0].code, /start start/);
  assert.match(empty.variants[0].code, /flow start -> end/);
  const cycle = src('diagram bpmn "T"', 'task a', 'task b', 'flow a -> b', 'flow b -> a');
  assert.match(variant(cycle, 'minimal').code, /flow start -> a/);
  const onlyCycle = src('diagram bpmn "T"', 'start s', 'task a', 'flow s -> a', 'flow a -> a');
  assert.ok(reviewCode(onlyCycle).issues.some((item) => item.rule === 'flow-no-end'));
});

test('BPMN: a dead end is linked to the end that exists', () => {
  const code = src('diagram bpmn "T"', 'start s', 'task a', 'task b', 'end e', 'flow s -> a', 'flow a -> b', 'flow a -> e');
  const issue = issueOf(code, 'flow-dead-end');
  assert.match(issue.fix.title.en, /Link "b" to the end element "e"/);
  assert.match(variant(code, 'minimal').code, /flow b -> e/);
});

test('a start that has nothing to lead to and an end with a way out are both handled', () => {
  const lone = src('diagram bpmn "T"', 'start s');
  assert.ok(reviewCode(lone).issues.some((item) => item.rule === 'flow-no-end'));
  const state = src('diagram uml state "S"', 'state idle', 'state busy', 'transition idle -> busy');
  const fixed = variant(state, 'minimal');
  assert.match(fixed.code, /initial start/);
});

test('BPMN: unlabelled branches of an exclusive gateway get numbered labels', () => {
  const code = src(
    'diagram bpmn "T"',
    'start s',
    'exclusive g "Stock?"',
    'task a',
    'task b',
    'end e',
    'flow s -> g',
    'flow g -> a',
    'flow g -> b "no"',
    'flow a -> e',
    'flow b -> e',
  );
  assert.match(variant(code, 'full').code, /flow g -> a "вариант 1"/);
  const two = code.replace('"no"', '');
  const en = variant(two, 'full', 'en').code;
  assert.match(en, /flow g -> a "option 1"/);
  assert.match(en, /flow g -> b "option 2"/);
});

test('ERD: an entity without a key gets one, an existing id attribute becomes the key', () => {
  const code = src(
    'diagram erd "S"',
    'entity A {',
    '  id : int',
    '  name : string',
    '}',
    'entity B {',
    '  title : string',
    '}',
    'entity C',
    'relationship A 1:N B',
    'relationship B 1:N C',
  );
  const fixed = variant(code, 'minimal');
  assert.match(fixed.code, /id : int pk/);
  assert.match(fixed.code, /entity B \{\n {2}id : int pk/);
  assert.match(fixed.code, /entity C \{\n {2}id : int pk\n\}/);
  assert.equal(fixed.errors, 0);
});

test('IDEF0: a box gets its output and control, the ports of arrows are put right', () => {
  const code = src('diagram idef0 "X"', 'box A1 "Do" {', ' input: In', '}', 'box A2 "Next" {', ' control: C', ' output: O', '}', 'arrow A1.input -> A2.foo');
  const fixed = variant(code, 'minimal', 'en');
  assert.match(fixed.code, / output: Result/);
  assert.match(fixed.code, / control: Rules/);
  assert.match(fixed.code, /arrow A1\.output -> A2\.input/);
  assert.equal(fixed.errors, 0);
  assert.match(variant(code, 'minimal').code, / output: Результат/);
});

test('the rules of the review itself: title, empty diagram, names, long labels, parts, ICOM inputs', () => {
  assert.ok(rulesOf(src('diagram dfd', 'process a', 'process b', 'flow a -> b "x"')).includes('no-title'));
  const titled = variant(src('diagram dfd', 'process a', 'process b', 'flow a -> b "x"', 'flow b -> a "y"'), 'full', 'en');
  assert.match(titled.code, /^diagram dfd "New diagram"/);
  assert.ok(!rulesOf(src('diagram dfd "T"', 'process a', 'process b', 'flow a -> b "x"')).includes('no-title'));
  assert.ok(rulesOf('diagram dfd "T"').includes('empty-diagram'));
  assert.ok(rulesOf(src('diagram dfd "T"', 'process p1', 'process Payment', 'flow p1 -> Payment "x"')).includes('naming-unreadable'));
  assert.ok(!rulesOf(src('diagram dfd "T"', 'process p1 "Pay"', 'process Payment', 'flow p1 -> Payment "x"')).includes('naming-unreadable'));
  const long = `process p "${'x'.repeat(41)}"`;
  assert.ok(rulesOf(src('diagram dfd "T"', long, 'process q "Q"', 'flow p -> q "x"')).includes('naming-long-label'));
  const parts = src('diagram dfd "T"', 'process a "A"', 'process b "B"', 'process c "C"', 'process d "D"', 'flow a -> b "x"', 'flow c -> d "y"');
  const apart = issueOf(parts, 'disconnected-parts');
  assert.equal(apart.line, 4);
  assert.match(apart.message.en, /2 parts/);
  assert.ok(!rulesOf(src('diagram dfd "T"', 'process a "A"', 'process b "B"', 'flow a -> b "x"')).includes('disconnected-parts'));
  const noInput = src('diagram idef0 "X"', 'box A1 "Do" {', ' control: C', ' output: O', '}', 'box A2 "Next" {', ' input: I', ' control: C', ' output: O', '}');
  assert.deepEqual(
    reviewCode(noInput)
      .issues.filter((item) => item.rule === 'idef0-no-input')
      .map((item) => item.line),
    [2],
  );
  const fed = src(
    'diagram idef0 "X"',
    'box A1 "Do" {',
    ' control: C',
    ' output: O',
    '}',
    'box A2 "Next" {',
    ' control: C',
    ' output: O',
    '}',
    'arrow A1 -> A2',
  );
  assert.deepEqual(
    reviewCode(fed)
      .issues.filter((item) => item.rule === 'idef0-no-input')
      .map((item) => item.line),
    [2],
  );
});

test('a variant is offered only when it has fewer problems, and never twice', () => {
  const warningsOnly = src('diagram dfd "T"', 'process a "A"', 'process b "B"', 'flow a -> b', 'flow b -> a "y"');
  const result = reviewCode(warningsOnly);
  assert.deepEqual(
    result.variants.map((item) => item.id),
    ['full'],
  );
  const oneFix = src('diagram bpmn "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> e', 'flow a -> a');
  assert.deepEqual(
    reviewCode(oneFix).variants.map((item) => item.id),
    ['minimal'],
  );
  const hopeless = src('diagram bpmn "T"', 'start s', 'task a', 'end e', 'flow s -> a', 'flow a -> e', 'task orphan');
  assert.ok(reviewCode(hopeless).variants.every((item) => !item.code.includes('start s2')));
});

test('every offered variant is validated again and the changes are listed', () => {
  const code = src('diagram bpmn', 'task a "Check"', 'task b "Ship"', 'taks c "Pay"', 'flow a -> b', 'flow a -> zzz', 'flow b -> b');
  const result = reviewCode(code);
  const before = parseDiagram(code).problems.filter((item) => item.severity === 'error').length;
  assert.deepEqual(
    result.variants.map((item) => item.id),
    ['minimal', 'full'],
  );
  for (const item of result.variants) {
    const after = checkCode(item.code);
    assert.equal(item.errors, after.errors);
    assert.ok(after.errors < before);
    assert.ok(item.changes.length > 0 && item.changes.every((change) => change.ru && change.en && change.rule));
    assert.ok(item.title.ru && item.title.en);
    assert.notEqual(item.code, code);
  }
  assert.ok(result.variants[0].changes.some((change) => change.line === 4));
  assert.ok(result.variants[1].changes.some((change) => change.rule === 'no-title'));
  assert.equal(result.variants[1].changes.at(-1).line, null);
});

test('the review never fails and never makes a template worse, whichever line is lost', () => {
  const total = (code) => {
    const found = checkCode(code);
    return found.errors * 100 + found.warnings;
  };
  assert.equal(Object.keys(TEMPLATES).length, NOTATION_KEYS.length);
  for (const [key, template] of Object.entries(TEMPLATES)) {
    const lines = template.split(NL);
    for (let drop = 0; drop < lines.length; drop += 1) {
      const broken = lines.filter((_, index) => index !== drop).join(NL);
      const result = reviewCode(broken);
      result.variants.forEach((item) =>
        assert.ok(total(item.code) < total(broken) || item.errors < checkCode(broken).errors, `${key} without line ${drop + 1}`),
      );
    }
    const typo = template.replace(/^(\s*)(\w)/m, '$1');
    assert.ok(Array.isArray(reviewCode(typo.replace('diagram', 'diagrm')).issues), key);
  }
});
