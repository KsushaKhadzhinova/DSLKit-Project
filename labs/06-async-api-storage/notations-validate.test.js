import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiagram } from '../../site/js/notations/index.js';

const codes = (source) => parseDiagram(source).problems.map((item) => item.code);
const find = (source, code) => parseDiagram(source).problems.find((item) => item.code === code);
const has = (source, ...wanted) => wanted.forEach((code) => assert.ok(codes(source).includes(code), `${code} in ${JSON.stringify(codes(source))}\n${source}`));
const lacks = (source, ...unwanted) => unwanted.forEach((code) => assert.ok(!codes(source).includes(code), `${code} must not appear\n${source}`));
const lineOf = (source, code) => find(source, code).line;

test('IDEF0: syntax, duplicates, numbering and arrow ports are checked', () => {
  const box = (id) => `box ${id} "x" {\n input: i\n control: c\n output: o\n}`;
  assert.equal(lineOf('diagram idef0\nbox A1 "x" {\n}\nfoo', 'syntax-short'), 4);
  has(`diagram idef0\n${box('A1')}\n${box('A1')}`, 'duplicate');
  has(`diagram idef0\n${box('Z9')}`, 'idef0-id');
  lacks(`diagram idef0\n${box('A-0')}`, 'idef0-id', 'idef0-context', 'idef0-count');
  has(`diagram idef0\n${box('A1')}\narrow A1 -> Nope`, 'unknown-ref');
  has(`diagram idef0\n${box('A1')}\n${box('A2')}\narrow A1.input -> A2.input`, 'idef0-arrow-from');
  has(`diagram idef0\n${box('A1')}\n${box('A2')}\narrow A1.output -> A2.output`, 'idef0-arrow-to');
  lacks(`diagram idef0\n${box('A1')}\n${box('A2')}\narrow A1.output -> A2.mechanism\narrow A1 -> A2.control`, 'idef0-arrow-from', 'idef0-arrow-to');
});

test('IDEF0: every box needs an output and a control, arrows may supply them', () => {
  has('diagram idef0\nbox A1 "x" {\n input: i\n}', 'idef0-no-output', 'idef0-no-control');
  lacks('diagram idef0\nbox A1 "x" {\n}\nbox A2 "y" {\n}\narrow A2 -> A1.control\narrow A1.output -> A2.input', 'idef0-no-output');
  const noControl = parseDiagram('diagram idef0\nbox A1 "x" {\n}\nbox A2 "y" {\n}\narrow A2 -> A1.control');
  assert.equal(noControl.problems.filter((item) => item.code === 'idef0-no-control').length, 1);
});

test('IDEF0: context diagram A-0 is alone, a decomposition has 3 to 6 boxes', () => {
  const box = (id) => `box ${id} "x" {\n input: i\n control: c\n output: o\n}`;
  const many = (n) => ['diagram idef0', ...Array.from({ length: n }, (_, index) => box(`A${index + 1}`))].join('\n');
  has(`diagram idef0\n${box('A-0')}\n${box('A1')}`, 'idef0-context');
  has(many(2), 'idef0-count');
  has(many(7), 'idef0-count');
  lacks(many(3), 'idef0-count');
  lacks(many(6), 'idef0-count');
  assert.equal(find(many(7), 'idef0-count').params.n, 7);
});

test('DFD: a flow must touch a process and be labelled; processes need inputs and outputs', () => {
  const base = 'diagram dfd\nentity A\nentity B\nstore S\nstore T\nprocess 1\n';
  has(`${base}flow A -> B "x"\nflow 1 -> A "y"\nflow A -> 1 "z"`, 'dfd-no-process');
  has(`${base}flow A -> S "x"\nflow S -> T "y"\nflow S -> A "z"\nflow 1 -> S "q"\nflow A -> 1 "r"`, 'dfd-no-process');
  lacks(`${base}flow A -> 1 "x"\nflow 1 -> S "y"`, 'dfd-no-process');
  has(`${base}flow A -> 1`, 'dfd-unlabelled');
  has(`${base}flow 1 -> A "x"`, 'dfd-miracle');
  has(`${base}flow A -> 1 "x"`, 'dfd-black-hole');
  has(base, 'isolated');
  lacks(`${base}flow 1 -> 1 "loop"`, 'dfd-miracle', 'dfd-black-hole');
  has('diagram dfd\nprocess 1\nprocess 1', 'duplicate');
  has('diagram dfd\nprocess 1\nflow 1 -> Nope "x"', 'unknown-ref');
  assert.equal(parseDiagram('diagram dfd\nprocess p1 "Long name here"').nodes[0].label, 'Long name here');
});

test('ERD: keys, attributes, relationships and blocks are checked', () => {
  const customer = 'entity Customer {\n id: int pk\n}\n';
  has('diagram erd\nentity A {\n x: int\n}', 'erd-no-pk');
  has('diagram erd\nentity A {\n id: int pk\n id: int\n}', 'erd-dup-attr');
  has('diagram erd\nentity A {\n id: int pk\n c: int fk -> Missing\n}', 'erd-fk-unknown');
  has(`diagram erd\n${customer}relationship Customer 1:N Missing`, 'unknown-ref');
  has(`diagram erd\n${customer}relationship Customer 2:5 Customer`, 'erd-cardinality');
  has('diagram erd\nentity A {\n id: int pk', 'unclosed');
  has('diagram erd\nentity A {\n ???\n}', 'syntax');
  has('diagram erd\nentity A {\n id: int pk\n}\nentity A {\n id: int pk\n x: int\n}', 'duplicate');
  has('diagram erd\nentity A weird {\n id: int pk\n}', 'syntax');
  has(`diagram erd\n${customer}entity Lonely {\n id: int pk\n}`, 'isolated');
  lacks(`diagram erd\n${customer}`, 'isolated');
  has('diagram erd\nbogus', 'syntax');
  const model = parseDiagram(
    `diagram erd\n${customer}entity O {\n id: int pk\n c: int fk -> Customer\n}\nrelationship Customer M:N O\nrelationship O N:1 Customer "x"`,
  );
  assert.deepEqual(
    model.relations.map((relation) => relation.card),
    ['N:M', 'N:1'],
  );
  assert.equal(model.entities[1].attrs[1].fk, true);
  assert.equal(model.entities[0].label, 'Customer');
  assert.equal(parseDiagram('diagram erd\nentity A "Alpha" {\n id: int pk\n}').entities[0].label, 'Alpha');
  assert.equal(parseDiagram('diagram erd\nentity Solo').entities.length, 1);
});

test('IDEF1: keys are advised and entities should have attributes', () => {
  const found = parseDiagram('diagram idef1\nentity A {\n x: int\n}\nentity B');
  assert.equal(
    found.problems.some((item) => item.code === 'erd-no-pk' && item.severity === 'warning'),
    true,
  );
  has('diagram idef1\nentity A {\n x: int\n}\nentity B', 'idef1-no-attrs');
});

test('IDEF1X: key migration, dependent entities, relationship kinds and categories', () => {
  const parent = 'entity P {\n pid: int pk\n}\n';
  has(`diagram idef1x\n${parent}entity C {\n id: int pk\n}\nidentifying P -> C`, 'idef1x-fk-missing', 'idef1x-child-independent');
  has(`diagram idef1x\n${parent}entity C dependent {\n id: int pk\n pid: int fk\n}\nidentifying P -> C`, 'idef1x-fk-identifying');
  has(`diagram idef1x\n${parent}entity C {\n id: int pk\n pid: int pk fk\n}\nnonidentifying P -> C`, 'idef1x-fk-nonidentifying');
  has(`diagram idef1x\n${parent}entity C {\n id: int pk\n}\nnonspecific P -- C`, 'idef1x-nonspecific');
  has(`diagram idef1x\n${parent}entity C dependent {\n id: int pk\n}`, 'idef1x-dependent-orphan');
  has(`diagram idef1x\n${parent}category P complete k: P`, 'idef1x-category-self');
  has(`diagram idef1x\n${parent}category P incomplete k: Ghost`, 'unknown-ref');
  has(`diagram idef1x\n${parent}nonidentifying P -> Ghost`, 'unknown-ref');
  lacks(
    `diagram idef1x\n${parent}entity C {\n id: int pk\n pid: int fk -> P\n}\nnonidentifying P -> C "owns" Z optional`,
    'idef1x-fk-missing',
    'idef1x-fk-nonidentifying',
  );
  const model = parseDiagram(
    `diagram idef1x\n${parent}entity C {\n id: int pk\n pid: int fk\n}\nentity D independent {\n id: int pk\n k1: int ak1\n}\nnonidentifying P -> C Z optional\nnonidentifying P -> D P`,
  );
  assert.deepEqual(
    model.relations.map((relation) => [relation.card, relation.toEnd, relation.optional]),
    [
      ['Z', 'zero-one', true],
      ['P', 'one-many', false],
    ],
  );
  assert.deepEqual(model.entities[2].attrs[1].ak, ['ak1']);
});

test('BPMN: one start, an end, no flows into start or out of end, no dead ends or unreachable nodes', () => {
  const ok = 'diagram bpmn\nstart s\ntask t\nend e\nflow s -> t\nflow t -> e';
  assert.deepEqual(parseDiagram(ok).problems, []);
  has('diagram bpmn\ntask t\nend e\nflow t -> e', 'flow-no-start');
  has(`${ok}\nstart s2\nflow s2 -> t`, 'flow-multi-start');
  has('diagram bpmn\nstart s\ntask t\nflow s -> t', 'flow-no-end', 'flow-dead-end');
  has(`${ok}\nflow t -> s`, 'flow-start-incoming');
  has(`${ok}\nflow e -> t`, 'flow-end-outgoing');
  has(`${ok}\ntask lost\nflow lost -> e`, 'flow-unreachable');
  has(`${ok}\nexclusive g\nflow t -> g\nflow g -> e`, 'gateway-neither');
  has(
    'diagram bpmn\nstart s\nexclusive a\nexclusive b\nparallel c\nparallel d\nend e\nflow s -> a\nflow s -> b\nflow a -> c\nflow b -> c\nflow c -> d\nflow c -> d\nflow d -> e',
    'gateway-mixed',
  );
  has(
    'diagram bpmn\nstart s\nexclusive g\ntask a\ntask b\nend e\nflow s -> g\nflow g -> a "x"\nflow g -> b\nflow a -> e\nflow b -> e',
    'flow-unlabelled-branch',
  );
  lacks('diagram bpmn\nstart s\nparallel g\ntask a\ntask b\nend e\nflow s -> g\nflow g -> a\nflow g -> b\nflow a -> e\nflow b -> e', 'flow-unlabelled-branch');
  has('diagram bpmn\nstart s\ntask t\ntask a\nend e\nflow s -> t\nflow t -> a\nflow t -> e\nflow a -> e', 'bpmn-implicit-split');
  assert.deepEqual(parseDiagram('diagram bpmn\nstart s\nintermediate m\nend e\nflow s -> m\nflow m -> e').problems, []);
});

test('Petri nets: bipartite arcs, positive weights, integer tokens', () => {
  const ok = 'diagram petri\nplace p tokens=2\ntransition t\narc p -> t weight=3\narc t -> p';
  assert.deepEqual(parseDiagram(ok).problems, []);
  has('diagram petri\nplace a\nplace b\narc a -> b', 'petri-bipartite');
  has('diagram petri\ntransition a\ntransition b\narc a -> b', 'petri-bipartite');
  has('diagram petri\nplace p\ntransition t\narc p -> t weight=0', 'petri-weight');
  has('diagram petri\nplace p\ntransition t\narc p -> t weight=x', 'petri-weight');
  has('diagram petri\nplace p tokens=-1\ntransition t\narc p -> t', 'petri-tokens');
  has('diagram petri\nplace p tokens\ntransition t\narc p -> t', 'petri-tokens');
  has('diagram petri\nplace p\nplace q\ntransition t\narc p -> t', 'isolated');
  const model = parseDiagram(ok);
  assert.equal(model.nodes[0].tokens, 2);
  assert.equal(parseDiagram('diagram petri\nplace p tokens=x').nodes[0].tokens, 0);
});

test('UML use case: links join actors and cases, include and extend join cases', () => {
  const base = 'diagram uml usecase\nactor a\nactor b\nusecase u\nusecase v\n';
  has(`${base}link a -> b`, 'uc-link');
  has(`${base}link u -> v`, 'uc-link');
  lacks(`${base}link a -> u`, 'uc-link');
  has(`${base}include a -> u`, 'uc-include');
  has(`${base}extend u -> b`, 'uc-include');
  lacks(`${base}include u -> v`, 'uc-include');
  has(`${base}generalize a -> u`, 'uc-generalize');
  lacks(`${base}generalize a -> b\ngeneralize u -> v`, 'uc-generalize');
  has(`${base}link a -> u`, 'isolated');
});

test('UML activity and overview: start, end, decisions, forks and joins', () => {
  has('diagram uml activity\naction a', 'flow-no-start', 'flow-no-end');
  has(
    'diagram uml activity\nstart s\ndecision d\naction a\naction b\nend e\nflow s -> d\nflow d -> a\nflow d -> b "x"\nflow a -> e\nflow b -> e',
    'flow-unlabelled-branch',
  );
  has('diagram uml activity\nstart s\nfork f\nend e\nflow s -> f\nflow f -> e', 'gateway-neither');
  has('diagram uml overview\ninteraction i\nstart s\nflow s -> i', 'flow-no-end', 'flow-dead-end');
  assert.equal(lineOf('diagram uml activity\nstart s\nend e\nflow s -> e\nflow e -> s', 'flow-end-outgoing'), 5);
});

test('UML state: one initial state, no transitions out of final, no unreachable states, deterministic events', () => {
  const ok = 'diagram uml state\ninitial i\nstate a\nfinal f\ntransition i -> a\ntransition a -> f "stop"';
  assert.deepEqual(parseDiagram(ok).problems, []);
  has('diagram uml state\nstate a', 'flow-no-start');
  has(`${ok}\ninitial j\ntransition j -> a`, 'flow-multi-start');
  has(`${ok}\ntransition f -> a`, 'flow-end-outgoing');
  has(`${ok}\ntransition a -> i`, 'flow-start-incoming');
  has(`${ok}\nstate lost`, 'flow-unreachable');
  has(`${ok}\nstate b\ntransition a -> b "stop"`, 'state-nondeterministic');
  lacks('diagram uml state\ninitial i\nstate a\ntransition i -> a', 'flow-no-end');
  assert.equal(parseDiagram(ok).problems.length, 0);
});

test('IDEF3: referents, junction shape and pairing, reachability', () => {
  const ok =
    'diagram idef3\nuob a\nand j\nuob b\nuob c\nand k\nuob d\nprecedence a -> j\nprecedence j -> b\nprecedence j -> c\nprecedence b -> k\nprecedence c -> k\nprecedence k -> d';
  assert.deepEqual(parseDiagram(ok).problems, []);
  has('diagram idef3\nuob a\nreferent r\nprecedence r -> a', 'idef3-referent');
  lacks('diagram idef3\nuob a\nreferent r\nrelational r -> a', 'idef3-referent');
  has('diagram idef3\nuob a\nxor j\nprecedence a -> j', 'idef3-junction');
  has('diagram idef3\nuob a\nor j\nuob b\nuob c\nprecedence a -> j\nprecedence j -> b\nprecedence j -> c', 'idef3-unpaired');
  has('diagram idef3\nuob a\nuob b\nprecedence a -> b\nprecedence b -> a', 'idef3-no-start');
  has('diagram idef3\nuob a\nuob b\nuob c\nprecedence a -> b\nprecedence c -> b\nuob d\nuob e\nprecedence d -> e\nprecedence e -> d', 'flow-unreachable');
  assert.equal(
    parseDiagram('diagram idef3\nand j sync\nxor k\nor m')
      .nodes.map((node) => node.label)
      .join(' '),
    '&& X O',
  );
  assert.equal(parseDiagram('diagram idef3\nreferent r').problems.length, 0);
  lacks('diagram idef3', 'idef3-no-start');
});

test('GOST flowchart: one start, an end, decisions with labelled branches, paired connectors', () => {
  const ok = 'diagram gost\nstart s\nprocess p\ndecision d\nprocess a\nend e\nflow s -> p\nflow p -> d\nflow d -> a "Да"\nflow d -> e "Нет"\nflow a -> e';
  assert.deepEqual(parseDiagram(ok).problems, []);
  has('diagram gost\nprocess p\nend e\nflow p -> e', 'flow-no-start');
  has('diagram gost\nstart s\ndecision d\nend e\nflow s -> d\nflow d -> e "Да"', 'gost-decision');
  has('diagram gost\nstart s\ndecision d\nend e\nend f\nflow s -> d\nflow d -> e\nflow d -> f "Нет"', 'gost-decision-label');
  has(`${ok}\ncomment c "note"\nflow c -> a`, 'gost-comment-flow');
  has(`${ok}\nnote p -> a`, 'gost-note');
  lacks(`${ok}\ncomment c "note"\nnote c -> a`, 'gost-note', 'gost-comment-flow', 'flow-unreachable');
  has(`${ok}\nconnector c1 "A"`, 'gost-connector');
  const linked = 'diagram gost\nstart s\nconnector c1 "A"\nconnector c2 "A"\nprocess p\nend e\nflow s -> c1\nflow c2 -> p\nflow p -> e';
  assert.deepEqual(parseDiagram(linked).problems, []);
  assert.deepEqual(
    parseDiagram('diagram gost\nstart s\noffpage o1 "B"\noffpage o2 "B"\nprocess p\nend e\nflow s -> p\nflow p -> o1\nflow o2 -> e').problems,
    [],
  );
  assert.deepEqual(
    parseDiagram('diagram gost\nstart s\nconnector c1 "A"\nconnector c2 "A"\nprocess p\nend e\nflow s -> c2\nflow c1 -> p\nflow p -> e').problems,
    [],
  );
});

test('UML class: relations, multiplicities, inheritance cycles, members', () => {
  const classes = 'diagram uml class\nclass A\nclass B\ninterface I\n';
  has(`${classes}A --|> Missing`, 'unknown-ref');
  has(`${classes}A "x" --> "1" B`, 'class-mult');
  has(`${classes}A ..|> B`, 'class-realization');
  lacks(`${classes}A ..|> I`, 'class-realization');
  has(`${classes}A --|> B\nB --|> A`, 'class-cycle');
  has(`${classes}A --|> A`, 'class-cycle');
  has('diagram uml class\nclass A {\n + x: int\n + x: int\n}', 'class-dup-member');
  lacks('diagram uml class\nclass A {\n + x: int\n + x(): int\n}', 'class-dup-member');
  has('diagram uml class\ninterface I {\n + x: int\n}', 'class-iface-attr');
  has('diagram uml class\nclass A {\n + x: int', 'unclosed');
  has('diagram uml class\nclass A {\n %%%\n}', 'syntax');
  has('diagram uml class\nclass A\nclass A', 'duplicate');
  has('diagram uml class\nclass A\nclass A {\n + x: int\n}', 'duplicate');
  const model = parseDiagram(`${classes}B <|-- A\nI <|.. B\nA -- B : x\nA o-- B\nA *-- B\nA ..> B\nA --> B`);
  assert.deepEqual(
    model.relations.map((relation) => [relation.from, relation.to, relation.kind, relation.directed]),
    [
      ['A', 'B', 'inheritance', true],
      ['B', 'I', 'realization', true],
      ['A', 'B', 'association', false],
      ['A', 'B', 'aggregation', true],
      ['A', 'B', 'composition', true],
      ['A', 'B', 'dependency', true],
      ['A', 'B', 'association', true],
    ],
  );
  const member = parseDiagram('diagram uml class\nabstract class A "Alpha" {\n - n: int\n # m(a: int, b: int): void\n ~ k()\n z\n}').classes[0];
  assert.equal(member.label, 'Alpha');
  assert.equal(member.stereotype, 'abstract class');
  assert.deepEqual(
    member.members.map((item) => [item.vis, item.name, item.method, item.params, item.type]),
    [
      ['-', 'n', false, '', 'int'],
      ['#', 'm', true, 'a: int, b: int', 'void'],
      ['~', 'k', true, '', ''],
      ['+', 'z', false, '', ''],
    ],
  );
  const swapped = parseDiagram('diagram uml class\nclass A\nclass B\nB "1" <|-- "2" A').relations[0];
  assert.deepEqual([swapped.from, swapped.fromMult, swapped.toMult], ['A', '2', '1']);
});

test('IDEF4 reuses the class machinery and flags UML-only constructs', () => {
  assert.equal(parseDiagram('diagram idef4\nclass A\nclass B\nA --|> B').notation, 'idef4');
  has('diagram idef4\ninterface I\nclass A\nA ..|> I', 'idef4-construct');
  assert.equal(parseDiagram('diagram idef4\ninterface I\nclass A\nA ..|> I').problems.filter((item) => item.code === 'idef4-construct').length, 2);
});

test('UML sequence: participants must exist and replies need calls', () => {
  has('diagram uml sequence\nparticipant A\nA -> B : x', 'unknown-ref');
  has('diagram uml sequence\nparticipant A\nparticipant B\nB --> A : late', 'seq-return');
  lacks('diagram uml sequence\nparticipant A\nparticipant B\nA -> B : call\nB --> A : back', 'seq-return');
  has('diagram uml sequence\nparticipant A\nparticipant B\nparticipant C\nA -> B : x', 'isolated');
  has('diagram uml sequence\nparticipant A\nparticipant A', 'duplicate');
  const model = parseDiagram('diagram uml sequence\nactor A "Alice"\nparticipant B\nA -> B : sync\nA ->> B : async\nB --> A : ret\nA -> A\nB -> A');
  assert.deepEqual(
    model.messages.map((message) => message.kind),
    ['sync', 'async', 'return', 'sync', 'sync'],
  );
  assert.equal(model.messages[3].text, '');
  assert.equal(model.participants[0].label, 'Alice');
  assert.equal(model.participants[0].kind, 'actor');
});

test('UML object, component, composite, deployment, package, profile, communication', () => {
  has('diagram uml object\nobject a "alice"\nobject b "bob : B"\nlink a -> b', 'uml-object-label');
  lacks('diagram uml object\nobject a "a : A"', 'isolated');

  const comp = 'diagram uml component\ncomponent c\ncomponent d\ninterface i\n';
  has(`${comp}provide c -> d`, 'uml-comp-iface');
  has(`${comp}require i -> c`, 'uml-comp-iface');
  has(`${comp}delegate c -> c\ndelegate c -> d`, 'isolated');
  lacks(`${comp}delegate c -> i`, 'uml-comp-iface');
  has(`${comp}depend c -> i`, 'uml-comp-depend');
  lacks(`${comp}depend c -> d`, 'uml-comp-depend');

  has('diagram uml composite\npart p\nport q', 'uml-cs-port');
  has('diagram uml composite\nport q of=ghost', 'unknown-ref');
  has('diagram uml composite\npart p in=ghost', 'unknown-ref');
  lacks('diagram uml composite\nclassifier c\npart p in=c\nport q of=p', 'uml-cs-port', 'unknown-ref');
  has('diagram uml composite\nclassifier c\npart p in=c\nport q of=p\nconnect c -> q', 'uml-cs-connect');
  lacks('diagram uml composite\nclassifier c\npart p in=c\nport q of=p\nport r of=p\nconnect q -> r', 'uml-cs-connect');

  const dep = 'diagram uml deployment\nnode n\ndevice d\nenvironment e\nartifact a\n';
  has(`${dep}deploy n -> d`, 'uml-deploy');
  has(`${dep}deploy a -> a`, 'uml-deploy');
  lacks(`${dep}deploy a -> e\ndeploy a -> d\ndeploy a -> n`, 'uml-deploy');
  has(`${dep}communicate n -> a`, 'uml-communicate');
  lacks(`${dep}communicate n -> d`, 'uml-communicate');

  const pkg = 'diagram uml package\npackage p\npackage q\nelement e\n';
  has(`${pkg}import p -> e`, 'uml-pkg-edge');
  has(`${pkg}access p -> e`, 'uml-pkg-edge');
  has(`${pkg}merge e -> p`, 'uml-pkg-edge');
  has(`${pkg}contains e -> p`, 'uml-pkg-contains');
  has(`${pkg}contains p -> e\ncontains q -> e`, 'uml-pkg-owner');
  has(`${pkg}contains p -> q\ncontains q -> p`, 'uml-pkg-cycle');
  lacks(`${pkg}contains p -> q\ncontains q -> e\nimport p -> q`, 'uml-pkg-cycle', 'uml-pkg-owner', 'uml-pkg-edge');

  const prof = 'diagram uml profile\nprofile pr\nmetaclass m\nstereotype s\nstereotype t\n';
  has(`${prof}extend m -> s`, 'uml-profile-extend');
  has(`${prof}generalize m -> s`, 'uml-profile-generalize');
  has(`${prof}extend s -> m`, 'uml-stereotype-idle');
  lacks(`${prof}extend s -> m\ngeneralize t -> s`, 'uml-stereotype-idle');

  has('diagram uml communication\nobject a\nobject b\nmessage a -> b "no number"', 'uml-comm-number');
  lacks('diagram uml communication\nobject a\nobject b\nmessage a -> b "1.2: ok"', 'uml-comm-number');
});

test('UML timing: states, order and references', () => {
  const base = 'diagram uml timing\nlifeline l "Light" states Red, Green\n';
  has('diagram uml timing\nlifeline l states Red', 'uml-timing-states');
  has('diagram uml timing\nlifeline l states A, B\nlifeline l states A, B', 'duplicate');
  has(`${base}at 0 ghost Red`, 'unknown-ref');
  has(`${base}at 0 l Blue`, 'uml-timing-state');
  has(`${base}at 5 l Red\nat 3 l Green`, 'uml-timing-order');
  lacks(`${base}at 3 l Red\nat 3 l Green\nat 4 l Red`, 'uml-timing-order');
  has(base, 'isolated');
  const model = parseDiagram(`${base}at 1.5 l Red`);
  assert.equal(model.events[0].time, 1.5);
  assert.equal(model.lifelines[0].label, 'Light');
  assert.equal(parseDiagram('diagram uml timing\nlifeline l states A, B').lifelines[0].label, 'l');
});

test('IDEF5: isa, instanceof, partof and cycles', () => {
  const base = 'diagram idef5\nkind a\nkind b\nindividual i\nprocess p\nprocess q\n';
  has(`${base}isa i -> a`, 'idef5-isa');
  has(`${base}isa a -> p`, 'idef5-isa');
  lacks(`${base}isa a -> b\nisa p -> q`, 'idef5-isa');
  has(`${base}instanceof a -> b`, 'idef5-instanceof');
  has(`${base}instanceof i -> i`, 'idef5-instanceof');
  lacks(`${base}instanceof i -> a`, 'idef5-instanceof', 'idef5-individual');
  has(`${base}partof a -> p`, 'idef5-partof');
  has(`${base}isa a -> b\nisa b -> a`, 'idef5-cycle');
  has(`${base}partof a -> b\npartof b -> a`, 'idef5-cycle');
  has(base, 'idef5-individual', 'isolated');
  lacks(`${base}relation a -> b "x"`, 'idef5-isa');
});

test('graphs: modes, weights, references, queries and the computed properties', () => {
  const g = 'diagram graph\nvertex A\nvertex B\nvertex C\n';
  has(`${g}mode directed\nedge A -- B`, 'graph-arrow-mode');
  has(`${g}mode undirected\nedge A -> B`, 'graph-arrow-mode');
  has(`${g}edge A -> B\nedge B -- C`, 'graph-arrow-mode');
  has(`${g}edge A -- B weight=x`, 'graph-weight');
  has(`${g}edge A -- Z`, 'unknown-ref');
  has(`${g}path A -> Z`, 'unknown-ref');
  has('diagram graph\nvertex A\nvertex A', 'duplicate');
  has(`${g}edge A -- B\npath A -> C`, 'graph-path-none');
  has(`${g}edge A -- B weight=-1\npath A -> B`, 'graph-negative');
  has(`${g}edge A -- B weight=2\npath A -> B`, 'graph-path');
  has(g, 'graph-summary', 'graph-structure', 'graph-degrees', 'graph-matrix', 'graph-mst');
  has(`${g}edge A -> B\nedge B -> C`, 'graph-order');
  lacks(`${g}edge A -> B\nedge B -> C`, 'graph-mst');
  assert.deepEqual(parseDiagram('diagram graph').problems, []);
  assert.equal(parseDiagram('diagram graph').empty, true);
  assert.equal(parseDiagram(`${g}edge A -> B "road"`).edges[0].label, 'road');
  assert.equal(parseDiagram(`${g}edge A -- B weight=2.5`).weighted, true);
  assert.equal(parseDiagram(`${g}edge A -- B`).weighted, false);
});

test('DAG: durations, cycles with line numbers, order, layers, critical path and redundant edges', () => {
  const d = 'diagram dag\ntask a duration=2\ntask b duration=3\ntask c\n';
  has(`${d}task e duration=x`, 'dag-duration');
  const cycle = find(`${d}depend a -> b\ndepend b -> c\ndepend c -> a`, 'dag-cycle');
  assert.equal(cycle.params.path, 'a -> b -> c -> a');
  assert.equal(cycle.params.lines, '5, 6, 7');
  assert.equal(cycle.line, 5);
  has(`${d}depend a -> a`, 'dag-cycle');
  has(`${d}depend a -> b\ndepend b -> c`, 'dag-order', 'dag-layers', 'dag-roots', 'dag-critical');
  assert.equal(find(`${d}depend a -> b\ndepend b -> c`, 'dag-critical').params.length, 6);
  assert.equal(find(`${d}depend a -> b\ndepend b -> c`, 'dag-critical').params.path, 'a -> b -> c');
  assert.equal(find(`${d}depend a -> b\ndepend b -> c\ndepend a -> c`, 'dag-redundant').line, 7);
  lacks(`${d}depend a -> b\ndepend b -> c`, 'dag-redundant');
  assert.deepEqual(parseDiagram('diagram dag').problems, []);
  assert.equal(parseDiagram(`${d}depend a -> b`).nodes[0].label, 'a (2)');
  assert.equal(
    parseDiagram('diagram dag\ntask x duration=bad').problems.some((item) => item.code === 'dag-duration'),
    true,
  );
});
