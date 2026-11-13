import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiagram } from '../../site/js/notations/index.js';
import { MAX_ANSWER, buildQuestions, checkCompletion, completeFromAnswers, describeQuestion } from '../../site/js/utils/diagram-questions.js';

const NL = String.fromCharCode(10);
const lines = (...rows) => rows.join(NL);
const ids = (code, notation) => buildQuestions(code, notation).map((item) => item.id);
const find = (code, id) => buildQuestions(code).find((item) => item.id === id);
const errorCount = (code) => parseDiagram(code).problems.filter((item) => item.severity === 'error').length;

const BPMN = lines('diagram bpmn "x"', 'task a', 'task b "B"', 'exclusive g "ok?"', 'task c "C"', 'flow a -> b', 'flow b -> g', 'flow g -> c', 'flow g -> a');
const DFD = lines('diagram dfd "s"', 'entity buyer "Buyer"', 'process p1 "Order"', 'process p2 "Pay"', 'flow buyer -> p1', 'store s', 'foo bar');
const IDEF0 = lines('diagram idef0 "o"', 'box A1 "Receive" {', ' input: Order', '}', 'box A2 "Check"');
const ERD = lines('diagram erd "s"', 'entity A {', ' x: int', '}', 'entity B {', ' id: int pk', '}', 'relationship A 1:X B', 'relationship A 1:N B');
const SEQ = lines('diagram uml sequence "c"', 'participant U', 'participant S', 'U -> S', 'S --> Z : x');
const USECASE = lines('diagram uml usecase "u"', 'usecase a "A"', 'usecase b "B"');

test('the questions of a BPMN diagram: start, end, names and conditions, the most important first', () => {
  const list = buildQuestions(BPMN);
  assert.deepEqual(
    list.map((item) => item.id),
    ['flow-start', 'flow-end', 'name:a', 'label:g->c', 'label:g->a'],
  );
  assert.deepEqual(
    list.map((item) => item.kind),
    ['yesno', 'yesno', 'text', 'text', 'text'],
  );
  assert.match(list[0].text.ru, /нет начала/);
  assert.match(list[0].text.en, /no start/);
  assert.equal(list[2].target.id, 'a');
  assert.equal(list[2].target.line, 2);
});

test('the answers complete the BPMN diagram and the result passes the parser', () => {
  const done = completeFromAnswers(BPMN, { 'flow-start': 'yes', 'flow-end': 'yes', 'name:a': 'Receive', 'label:g->c': 'yes', 'label:g->a': 'no "quote"' });
  assert.equal(done.ok, true);
  assert.equal(done.valid, true);
  assert.deepEqual(done.applied, ['flow-start', 'flow-end', 'name:a', 'label:g->c', 'label:g->a']);
  assert.match(done.code, /^diagram bpmn "x"\nstart start "Start"\ntask a "Receive"/);
  assert.match(done.code, /flow g -> c "yes"/);
  assert.match(done.code, /flow g -> a "no \\"quote\\""/);
  assert.match(done.code, /end end "End"\nflow c -> end$/);
  assert.equal(errorCount(done.code) < errorCount(BPMN), true);
  assert.equal(done.errorsAfter, errorCount(done.code));
});

test('the answers can come as a list and the diagram can be completed until it is valid', () => {
  const code = lines('diagram bpmn "x"', 'task a "A"', 'task b "B"', 'flow a -> b');
  const done = completeFromAnswers(code, [
    { id: 'flow-start', answer: 'yes' },
    { id: 'flow-end', answer: 'yes' },
  ]);
  assert.equal(done.ok, true);
  assert.equal(done.valid, true);
  assert.equal(done.errorsAfter, 0);
  assert.equal(done.reason, '');
});

test('a trailing line break is kept and "no" or an empty answer changes nothing', () => {
  const code = lines('diagram bpmn "x"', 'task a "A"', 'task b "B"', 'flow a -> b', '');
  const done = completeFromAnswers(code, { 'flow-start': 'yes', 'flow-end': 'yes' });
  assert.equal(done.code.endsWith('\n'), true);
  const nothing = completeFromAnswers(code, { 'flow-start': 'no', 'flow-end': '   ', 'name:zzz': 'x', missing: null, other: undefined });
  assert.equal(nothing.ok, false);
  assert.equal(nothing.reason, 'nothing');
  assert.equal(nothing.code, code);
  assert.deepEqual(nothing.applied, []);
  assert.equal(nothing.valid, false);
  assert.ok(nothing.problems.length > 0);
});

test('in a closed loop the start goes to the first step and the end after the last one', () => {
  const ring = lines('diagram bpmn "x"', 'task a "A"', 'task b "B"', 'flow a -> b', 'flow b -> a');
  assert.deepEqual(ids(ring), ['flow-start', 'flow-end']);
  const looped = completeFromAnswers(ring, { 'flow-start': 'yes', 'flow-end': 'yes' });
  assert.match(looped.code, /flow start -> a/);
  assert.match(looped.code, /flow b -> end$/);
  assert.deepEqual(ids('diagram bpmn "x"'), []);
});

test('the numbers of the new start and end do not clash with the existing identifiers', () => {
  const code = lines('diagram bpmn "x"', 'task start "S"', 'task end "E"', 'flow start -> end');
  const done = completeFromAnswers(code, { 'flow-start': 'yes', 'flow-end': 'yes' });
  assert.match(done.code, /start start2 "Start"/);
  assert.match(done.code, /end end2 "End"/);
});

test('notations without a start or an end ask nothing about them', () => {
  assert.deepEqual(ids(lines('diagram dag "d"', 'task a "A"', 'task b "B"', 'depend a -> b')), []);
});

test('a data flow diagram asks for names, labels, links and unknown words', () => {
  const list = buildQuestions(DFD);
  assert.deepEqual(
    list.map((item) => item.id),
    ['connect:p1:out', 'type:7', 'connect:p2:out', 'label:buyer->p1', 'connect:s:out', 'name:s'],
  );
  const miracle = list.find((item) => item.id === 'connect:p2:out');
  assert.deepEqual(
    miracle.options.map((item) => item.value),
    ['buyer', 'p1', 's'],
  );
  assert.equal(miracle.options[0].label.ru, 'Buyer (buyer)');
  assert.equal(miracle.text.en, 'Which element should "p2" be connected to?');
  const unknown = list.find((item) => item.id === 'type:7');
  assert.deepEqual(
    unknown.options.map((item) => item.value),
    ['entity', 'process', 'store'],
  );
  const done = completeFromAnswers(DFD, { 'connect:p1:out': 'buyer', 'type:7': 'entity', 'label:buyer->p1': 'order', 'name:s': 'Orders' });
  assert.equal(done.ok, true);
  assert.match(done.code, /flow buyer -> p1 "order"/);
  assert.match(done.code, /store s "Orders"/);
  assert.match(done.code, /^entity bar$/m);
  assert.match(done.code, /flow p1 -> buyer$/);
});

test('data that arrives in a process asks where it comes from and an unknown edge word offers the edge words', () => {
  const code = lines('diagram dfd "s"', 'entity buyer "Buyer"', 'process p1 "Order"', 'flow p1 -> buyer "x"', 'link a -> b');
  const list = buildQuestions(code);
  const source = list.find((item) => item.id === 'connect:p1:in');
  assert.match(source.text.ru, /Откуда в процесс/);
  assert.equal(source.priority, 1);
  const done = completeFromAnswers(code, { 'connect:p1:in': 'buyer' });
  assert.match(done.code, /flow buyer -> p1$/);
  const edgeWord = list.find((item) => item.id.startsWith('type:'));
  assert.deepEqual(
    edgeWord.options.map((item) => item.value),
    ['flow'],
  );
});

test('a word that is a keyword, or a line without a second word, is not asked about', () => {
  const code = lines('diagram dfd "s"', 'entity buyer "Buyer"', 'process', 'flow buyer ->');
  assert.deepEqual(ids(code), []);
  assert.deepEqual(ids(lines('diagram dfd "s"', 'entity', 'entity buyer "Buyer"')), []);
  assert.deepEqual(ids(lines('diagram dfd "s"', 'flow buyer -> p', 'entity buyer "B"', 'process p "P"', 'entity x y z')), [
    'connect:p:out',
    'label:buyer->p',
    'connect:x:out',
    'name:x',
  ]);
});

test('a connection question needs another element to connect to', () => {
  assert.deepEqual(ids(lines('diagram dfd "s"', 'process p1 "P"')), []);
  assert.deepEqual(ids(lines('diagram dfd "s"', 'entity e "E"', 'process p1 "P"', 'flow p1 -> e "x"', 'flow e -> p1 "y"')), []);
});

test('an unreachable and a dead-end node ask for the missing link', () => {
  const code = lines('diagram bpmn "x"', 'start s "S"', 'task a "A"', 'task b "B"', 'end e "E"', 'flow s -> a', 'flow a -> e', 'flow b -> e');
  const list = buildQuestions(code);
  assert.deepEqual(
    list.map((item) => item.id),
    ['connect:b:in'],
  );
  assert.match(list[0].text.en, /Which element leads to "b"/);
  const done = completeFromAnswers(code, { 'connect:b:in': 'a' });
  assert.equal(done.valid, true);
  assert.equal(done.ok, true);
  const dead = lines('diagram bpmn "x"', 'start s "S"', 'task a "A"', 'task b "B"', 'end e "E"', 'flow s -> a', 'flow a -> b', 'flow a -> e');
  assert.deepEqual(ids(dead), ['connect:b:out']);
  assert.match(completeFromAnswers(dead, { 'connect:b:out': 'e' }).code, /flow b -> e$/);
  assert.equal(completeFromAnswers(dead, { 'connect:b:out': 'nowhere' }).reason, 'nothing');
});

test('every kind of answer is checked against its options', () => {
  assert.equal(completeFromAnswers(DFD, { 'connect:p1:out': 'ghost' }).reason, 'nothing');
  assert.equal(completeFromAnswers(DFD, { 'type:7': 'ghost' }).reason, 'nothing');
  assert.equal(completeFromAnswers(ERD, { 'cardinality:8': '9:9' }).reason, 'nothing');
  assert.equal(completeFromAnswers(SEQ, { 'declare:Z': 'ghost', actor: 'ghost' }).reason, 'nothing');
  assert.equal(completeFromAnswers('task a', { header: 'ghost' }).reason, 'nothing');
  assert.equal(completeFromAnswers(DFD, { 'name:s': '   ' }).reason, 'nothing');
  assert.equal(completeFromAnswers(DFD, { 'label:buyer->p1': ' ' }).reason, 'nothing');
});

test('the answers are cut to a sane length and the line breaks are dropped', () => {
  const done = completeFromAnswers(DFD, { 'name:s': `Orders${NL}${'x'.repeat(500)}` });
  const line = done.code.split(NL).find((row) => row.startsWith('store s'));
  assert.ok(line.length <= 'store s ""'.length + MAX_ANSWER);
  assert.equal(line.includes(NL), false);
});

test('an IDEF0 box without a mechanism, an input, an output or a control raises questions with priorities', () => {
  const list = buildQuestions(IDEF0);
  assert.deepEqual(
    list.map((item) => `${item.priority}:${item.id}`),
    ['1:port:A1:output', '1:port:A1:control', '1:port:A2:output', '1:port:A2:control', '3:port:A2:input', '4:port:A1:mechanism', '4:port:A2:mechanism'],
  );
  assert.match(list[0].text.ru, /на выходе блока A1/);
  assert.match(list[1].text.en, /controls box A1/);
  assert.match(list[4].text.ru, /на вход/);
  assert.match(list[5].text.en, /carries out box A1/);
  const done = completeFromAnswers(IDEF0, { 'port:A1:output': 'Accepted order', 'port:A2:control': 'Rules', 'port:A2:output': 'Result' });
  assert.equal(done.ok, true);
  assert.match(done.code, /box A1 "Receive" \{\n input: Order\n output: Accepted order\n\}/);
  assert.match(done.code, /box A2 "Check"\n {2}output: Result\n {2}control: Rules/);
  assert.equal(done.errorsAfter < done.errorsBefore, true);
  assert.equal(completeFromAnswers(IDEF0, { 'port:A1:input': 'x' }).reason, 'nothing');
});

test('arrows into the input and the mechanism ports count as filled', () => {
  const code = lines(
    'diagram idef0 "o"',
    'box A1 "One" {',
    ' output: x',
    ' control: y',
    ' input: p',
    '}',
    'box A2 "Two" {',
    ' output: z',
    ' control: y',
    ' input: q',
    ' mechanism: m',
    '}',
    'arrow A1.output -> A2.input',
    'arrow A2.output -> A1.mechanism',
  );
  assert.deepEqual(ids(code), []);
  const bare = lines(
    'diagram idef0 "o"',
    'box A1 "One" {',
    ' output: x',
    ' control: y',
    '}',
    'box A2 "Two" {',
    ' output: z',
    ' control: y',
    '}',
    'arrow A1.output -> A2.input',
  );
  assert.deepEqual(ids(bare), ['port:A1:input', 'port:A1:mechanism', 'port:A2:mechanism']);
});

test('a box id that is not found is left alone', () => {
  const question = find(IDEF0, 'port:A2:input');
  assert.equal(question.apply('x', 'diagram idef0 "o"'), 'diagram idef0 "o"');
});

test('a code without a header offers the notations, the hint first', () => {
  const list = buildQuestions('task a', 'bpmn');
  assert.equal(list[0].id, 'header');
  assert.equal(list[0].priority, 0);
  assert.equal(list[0].options[0].value, 'bpmn');
  assert.equal(list[0].options[0].label.en, 'BPMN — business processes');
  assert.equal(buildQuestions('task a', 'nonsense')[0].options[0].value, 'idef0');
  const done = completeFromAnswers('start s "S"\nend e "E"\nflow s -> e', { header: 'gost' });
  assert.equal(done.code.startsWith('diagram gost\nstart'), true);
  assert.equal(completeFromAnswers('start s "S"\nend e "E"\nflow s -> e', { header: 'uml-activity' }).code.startsWith('diagram uml activity\n'), true);
});

test('a wrong header is replaced and keeps the title', () => {
  const unknown = lines('diagram bpm "Order"', 'start s "S"', 'end e "E"', 'flow s -> e');
  assert.equal(ids(unknown)[0], 'header');
  const fixed = completeFromAnswers(unknown, { header: 'bpmn' });
  assert.equal(fixed.ok, true);
  assert.equal(fixed.valid, true);
  assert.match(fixed.code, /^diagram bpmn "Order"\n/);
  const kind = lines('// note', '', 'diagram uml "Order"', 'start s "S"', 'end e "E"', 'flow s -> e');
  assert.equal(ids(kind)[0], 'header');
  const done = completeFromAnswers(kind, { header: 'uml-activity' });
  assert.match(done.code, /^\/\/ note\n\ndiagram uml activity "Order"\nstart/);
  assert.equal(ids(lines('diagram uml circles "Order"', 'x'))[0], 'header');
  assert.match(completeFromAnswers('diagram bpm "A \\"B\\""', { header: 'dfd' }).code, /^diagram dfd "A \\"B\\""$/);
});

test('an invalid cardinality gets a choice and a relationship without a name gets a text question', () => {
  const list = buildQuestions(ERD);
  assert.deepEqual(
    list.map((item) => item.id),
    ['cardinality:8', 'key:A', 'relation:A:B'],
  );
  assert.deepEqual(
    list[0].options.map((item) => item.value),
    ['1:1', '1:N', 'N:1', 'N:M'],
  );
  assert.equal(list[0].target.id, '1:X');
  assert.match(list[1].text.ru, /Добавить атрибут a_id/);
  const done = completeFromAnswers(ERD, { 'cardinality:8': 'N:M', 'key:A': 'yes', 'relation:A:B': 'owns' });
  assert.match(done.code, /relationship A N:M B$/m);
  assert.match(done.code, /entity A \{\n {2}a_id: int pk/);
  assert.match(done.code, /relationship A 1:N B "owns"/);
  assert.equal(completeFromAnswers(ERD, { 'key:A': 'no' }).reason, 'nothing');
  assert.equal(completeFromAnswers(ERD, { 'relation:A:B': ' ' }).reason, 'nothing');
});

test('the key attribute is named id when no entity uses that name, and a block-less entity is left alone', () => {
  const code = lines('diagram erd "s"', 'entity A {', ' x: int', '}');
  assert.match(find(code, 'key:A').text.en, /attribute id /);
  assert.match(completeFromAnswers(code, { 'key:A': 'yes' }).code, /entity A \{\n {2}id: int pk/);
  const flat = lines('diagram erd "s"', 'entity A', 'entity B {', ' id: int pk', '}');
  assert.equal(completeFromAnswers(flat, { 'key:A': 'yes' }).reason, 'nothing');
});

test('IDEF1 relationships are asked for a name, IDEF1X relationships are not', () => {
  const idef1 = lines('diagram idef1 "s"', 'entity A {', ' id: int pk', '}', 'entity B {', ' id: int pk', '}', 'relationship A 1:N B');
  assert.deepEqual(ids(idef1), ['relation:A:B']);
  const idef1x = lines('diagram idef1x "s"', 'entity A {', ' id: int pk', '}', 'entity B {', ' id: int pk', '}', 'identifying A -> B');
  assert.deepEqual(ids(idef1x), []);
});

test('a sequence diagram asks for the missing participant, the user and the text of a message', () => {
  const list = buildQuestions(SEQ);
  assert.deepEqual(
    list.map((item) => item.id),
    ['declare:Z', 'message:4', 'actor'],
  );
  assert.deepEqual(
    list[0].options.map((item) => item.value),
    ['participant', 'actor'],
  );
  assert.equal(list[2].options.at(-1).value, 'none');
  const done = completeFromAnswers(SEQ, { 'declare:Z': 'participant', 'message:4': 'request', actor: 'U' });
  assert.equal(done.valid, true);
  assert.equal(done.code, lines('diagram uml sequence "c"', 'actor U', 'participant S', 'participant Z', 'U -> S : request', 'S --> Z : x'));
  assert.equal(completeFromAnswers(SEQ, { actor: 'none' }).reason, 'nothing');
  assert.equal(completeFromAnswers(SEQ, { 'message:4': ' ' }).reason, 'nothing');
  const colon = lines('diagram uml sequence "c"', 'actor U', 'participant S', 'U ->> S :');
  assert.match(completeFromAnswers(colon, { 'message:4': 'ping' }).code, /U ->> S : ping$/);
});

test('a single participant or an existing actor raises no question about the user', () => {
  assert.deepEqual(ids(lines('diagram uml sequence "c"', 'participant U')), []);
  assert.deepEqual(ids(lines('diagram uml sequence "c"', 'actor U', 'participant S', 'U -> S : x')), []);
});

test('an undeclared element in a graph asks what it is and declares it', () => {
  const code = lines('diagram dfd "s"', 'entity buyer "Buyer"', 'flow buyer -> p1 "order"');
  const list = buildQuestions(code);
  assert.deepEqual(
    list.map((item) => item.id),
    ['declare:p1'],
  );
  assert.deepEqual(
    list[0].options.map((item) => item.value),
    ['entity', 'process', 'store'],
  );
  const done = completeFromAnswers(code, { 'declare:p1': 'process' });
  assert.equal(done.valid, false);
  assert.match(done.code, /entity buyer "Buyer"\nprocess p1\nflow buyer -> p1 "order"/);
  assert.equal(completeFromAnswers(code, { 'declare:p1': 'ghost' }).reason, 'nothing');
});

test('an undeclared element of a notation with no node list asks nothing', () => {
  const code = lines('diagram uml class "c"', 'class A', 'inherit A -> B');
  assert.deepEqual(ids(code), []);
  assert.deepEqual(ids(lines('diagram idef0 "o"', 'box A1 "One" {', ' output: x', ' control: y', ' input: p', ' mechanism: m', '}', 'arrow A1 -> A9')), []);
});

test('a use case diagram without an actor asks who uses the system', () => {
  const list = buildQuestions(USECASE);
  assert.ok(list.some((item) => item.id === 'usecase-actor'));
  const done = completeFromAnswers(USECASE, { 'usecase-actor': 'Customer' });
  assert.equal(done.valid, true);
  assert.match(done.code, /usecase b "B"/);
  assert.match(done.code, /actor user "Customer"/);
  assert.match(done.code, /link user -> a\nlink user -> b$/);
  assert.equal(completeFromAnswers(USECASE, { 'usecase-actor': ' ' }).reason, 'nothing');
  const taken = lines('diagram uml usecase "u"', 'usecase user "User case"');
  assert.match(completeFromAnswers(taken, { 'usecase-actor': 'Customer' }).code, /actor user2 "Customer"/);
  const withActor = lines('diagram uml usecase "u"', 'actor c "C"', 'usecase a "A"', 'link c -> a');
  assert.deepEqual(ids(withActor), []);
  assert.deepEqual(ids(lines('diagram uml usecase "u"', 'actor c "C"')), []);
});

test('a refused result keeps the original code and says why', () => {
  const done = completeFromAnswers(USECASE, { 'connect:a:out': 'b' });
  assert.equal(done.ok, false);
  assert.equal(done.reason, 'worse');
  assert.equal(done.code, USECASE);
  assert.deepEqual(done.applied, []);
});

test('checkCompletion accepts a code that is not worse and refuses one that is', () => {
  const same = checkCompletion(BPMN, BPMN);
  assert.equal(same.ok, true);
  assert.equal(same.valid, false);
  assert.ok(same.problems[0].message.ru);
  assert.ok(same.problems[0].message.en);
  assert.equal(checkCompletion(BPMN, 'diagram nope').ok, false);
  assert.equal(checkCompletion(BPMN, `${BPMN}${NL}flow a -> ghost`).ok, false);
  assert.equal(checkCompletion('diagram bpmn "x"', 'diagram bpmn "x"\nfoo').ok, false);
});

test('the description of a question has no function and an empty or fine diagram has no questions', () => {
  const [first] = buildQuestions(BPMN);
  const plain = describeQuestion(first);
  assert.deepEqual(Object.keys(plain), ['id', 'kind', 'text', 'options', 'target', 'priority']);
  assert.equal(JSON.parse(JSON.stringify(plain)).id, 'flow-start');
  assert.deepEqual(ids(''), []);
  const fine = lines('diagram bpmn "x"', 'start s "S"', 'task a "A"', 'end e "E"', 'flow s -> a', 'flow a -> e');
  assert.deepEqual(ids(fine), []);
});

test('a text answer that is empty changes nothing even when applied directly', () => {
  const samples = [BPMN, DFD, IDEF0, ERD, SEQ, USECASE];
  const texts = samples.flatMap((code) =>
    buildQuestions(code)
      .filter((item) => item.kind === 'text')
      .map((item) => [item, code]),
  );
  assert.ok(texts.length >= 8);
  texts.forEach(([item, code]) => assert.equal(item.apply('   ', code), code));
});

test('the same question is not asked twice', () => {
  const code = lines('diagram bpmn "x"', 'task a "A"', 'flow a -> ghost', 'flow a -> ghost');
  assert.deepEqual(ids(code).filter((id) => id === 'declare:ghost').length, 1);
});
