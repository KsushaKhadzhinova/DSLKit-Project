import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEMPLATES, formatProblem, parseDiagram } from '../../site/js/notations/index.js';
import { strictProblems } from '../../site/js/notations/strict.js';

const codes = (source) => parseDiagram(source).problems.map((item) => item.code);
const DFD = (body) => `diagram dfd "T"\nentity e "Client"\nprocess p "Accept order"\nstore s "Orders"\n${body}`;

test('the shipped templates stay free of errors and strict warnings', () => {
  Object.entries(TEMPLATES).forEach(([name, source]) => {
    const problems = parseDiagram(source).problems.filter((item) => item.code.startsWith('strict-'));
    assert.deepEqual(problems, [], name);
  });
});

test('a malformed place is an error: the form is pos=XxY with numbers', () => {
  assert.ok(codes(DFD('flow e -> p "x"\nprocess q "Other one" pos=abc')).includes('strict-pos'));
  assert.ok(codes(DFD('flow e -> p "x"\nprocess q "Other one" pos')).includes('strict-pos'));
  assert.ok(!codes(DFD('flow e -> p "x"\nprocess q "Other one" pos=10x-20.5')).includes('strict-pos'));
});

test('an element that points at itself is an error where flows go between elements', () => {
  assert.ok(codes(DFD('flow p -> p "again"')).includes('strict-self-loop'));
  const state = 'diagram uml state "T"\ninitial i\nstate a "A"\ntransition i -> a\ntransition a -> a "tick"';
  assert.ok(!codes(state).includes('strict-self-loop'));
});

test('a repeated link, identifiers that differ in case and equal names are warned about', () => {
  const found = codes(DFD('flow e -> p "pay"\nflow e -> p "pay"\nprocess P "Accept order"'));
  assert.ok(found.includes('strict-dup-edge'));
  assert.ok(found.includes('strict-id-case'));
  assert.ok(found.includes('strict-dup-label'));
  assert.ok(!codes(DFD('flow e -> p "pay"\nflow e -> p "refund"')).includes('strict-dup-edge'));
  assert.ok(!codes(DFD('flow e -> p "pay"\nprocess q "ab"\nprocess r "ab"')).includes('strict-dup-label'));
});

test('a data store that is only written or only read is warned about', () => {
  assert.ok(codes(DFD('flow e -> p "x"\nflow p -> s "save"')).includes('strict-store-write-only'));
  assert.ok(codes(DFD('flow e -> p "x"\nflow s -> p "load"')).includes('strict-store-read-only'));
  const both = codes(DFD('flow e -> p "x"\nflow p -> s "save"\nflow s -> p "load"'));
  assert.ok(!both.includes('strict-store-write-only') && !both.includes('strict-store-read-only'));
});

test('IDEF0: repeated arrows, feedback to the same box, gaps in numbers and repeated port items', () => {
  const source = [
    'diagram idef0 "T"',
    'box A1 "One" {',
    ' input: X',
    ' input: x',
    ' control: R',
    ' output: Y',
    '}',
    'box A3 "Three" {',
    ' input: Y',
    ' control: R',
    ' output: Z',
    '}',
    'box A3 "Again" {',
    ' control: R',
    ' output: Z',
    '}',
    'arrow A1.output -> A3.input',
    'arrow A1.output -> A3.input',
    'arrow A3.output -> A3.input',
    'arrow A1 -> A3',
    'arrow A1 -> A3',
  ].join('\n');
  const found = codes(source);
  ['strict-dup-edge', 'strict-idef0-feedback', 'strict-idef0-gap', 'strict-idef0-port-dup'].forEach((code) => assert.ok(found.includes(code), code));
  assert.ok(codes('box A1 "One" {\n control: R\n output: Y\n}').every((code) => !code.startsWith('strict-idef0')));
});

test('notations with their own model are left to their own rules', () => {
  assert.deepEqual(strictProblems('erd', { entities: [] }), []);
  assert.deepEqual(strictProblems('idef0', {}), []);
});

test('every strict code has a message in both languages', () => {
  const source = DFD('flow p -> p "again"\nflow p -> s "save"\nprocess P "Accept order"\nprocess q pos=zz');
  parseDiagram(source)
    .problems.filter((item) => item.code.startsWith('strict-'))
    .forEach((item) => {
      assert.ok(formatProblem(item, 'ru').length > 5);
      assert.ok(formatProblem(item, 'en').length > 5);
    });
  ['strict-idef0-feedback', 'strict-idef0-gap', 'strict-idef0-port-dup', 'strict-store-read-only'].forEach((code) =>
    ['ru', 'en'].forEach((lang) => assert.ok(formatProblem({ code, params: { id: 'A1', previous: 'A0', port: 'input' } }, lang).length > 5)),
  );
});
