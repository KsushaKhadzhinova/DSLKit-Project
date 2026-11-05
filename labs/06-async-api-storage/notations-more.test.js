import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATIONS, TEMPLATES, formatProblem, generate, parseDiagram, renderNotation } from '../../site/js/notations/index.js';

const NEW = ['mindmap', 'orgchart', 'c4', 'network', 'decision', 'epc'];
const codes = (source) =>
  parseDiagram(source)
    .problems.filter((item) => item.severity !== 'info')
    .map((item) => `${item.severity}:${item.code}`);

test('every new notation is registered, has a template without problems, draws and exports to three formats', () => {
  NEW.forEach((key) => {
    assert.ok(NOTATIONS[key], key);
    assert.deepEqual(codes(TEMPLATES[key]), [], key);
    const model = parseDiagram(TEMPLATES[key]);
    assert.equal(model.notation, key);
    assert.match(renderNotation(model), /^<svg /);
    assert.deepEqual(Object.keys(NOTATIONS[key].generators), ['graphviz', 'mermaid', 'plantuml']);
    ['graphviz', 'mermaid', 'plantuml'].forEach((format) => assert.ok(generate(model, format).length > 20, `${key} ${format}`));
    assert.ok(NOTATIONS[key].name.ru && NOTATIONS[key].name.en && NOTATIONS[key].short);
  });
});

test('a mind map needs one root, one parent per branch and no loops', () => {
  assert.deepEqual(codes('diagram mindmap "Empty"'), []);
  assert.equal(parseDiagram('diagram mindmap "Empty"').empty, true);
  assert.deepEqual(codes('diagram mindmap\ntopic a "A"'), ['error:mm-root']);
  assert.deepEqual(codes('diagram mindmap\nroot r\nroot s\nbranch r -> s'), ['error:mm-root']);
  assert.ok(
    codes('diagram mindmap\nroot r\ntopic a\ntopic b\ntopic c\nbranch r -> a\nbranch r -> b\nbranch a -> c\nbranch b -> c').includes('error:mm-parent'),
  );
  assert.ok(codes('diagram mindmap\nroot r\ntopic a\ntopic lost\nbranch r -> a').includes('error:mm-unreachable'));
  assert.ok(codes('diagram mindmap\nroot r\ntopic a\ntopic b\nbranch r -> a\nbranch a -> b\nbranch b -> a').includes('error:mm-cycle'));
  const message = formatProblem(
    parseDiagram('diagram mindmap\nroot r\nroot s').problems.find((item) => item.code === 'mm-root'),
    'en',
  );
  assert.match(message, /exactly one root, there are 2/);
});

test('an organisation chart warns about two managers, two tops, loops and lonely elements', () => {
  assert.deepEqual(codes('diagram orgchart\nunit a\nperson b\nleads a -> b'), []);
  assert.ok(codes('diagram orgchart\nunit a\nunit b\nperson c\nleads a -> c\nleads b -> c').includes('warning:org-many-bosses'));
  assert.ok(codes('diagram orgchart\nunit a\nunit b\nperson c\nperson d\nleads a -> c\nleads b -> d').includes('warning:org-many-tops'));
  assert.ok(codes('diagram orgchart\nunit a\nunit b\nleads a -> b\nleads b -> a').includes('error:org-cycle'));
  assert.deepEqual(codes('diagram orgchart\nunit a\nunit alone'), ['warning:isolated', 'warning:isolated']);
});

test('a C4 diagram wants labelled relations and does not let a database call anything', () => {
  assert.deepEqual(codes('diagram c4\nperson u\nsystem s\nuses u -> s "uses"'), []);
  assert.deepEqual(codes('diagram c4\nperson u\nsystem s\nuses u -> s'), ['warning:c4-unlabelled']);
  assert.ok(codes('diagram c4\ndatabase d\nsystem s\nuses d -> s "pushes"').includes('warning:c4-database-source'));
  assert.deepEqual(codes('diagram c4\nsystem s\nexternal e'), ['warning:isolated', 'warning:isolated']);
});

test('a network diagram warns when clients are linked to each other', () => {
  assert.deepEqual(codes('diagram network\nswitch sw\nclient a\nlink sw -> a'), []);
  assert.deepEqual(codes('diagram network\nclient a\nclient b\nlink a -> b'), ['warning:net-client-client']);
  assert.deepEqual(codes('diagram network\nserver s\ncloud c'), ['warning:isolated', 'warning:isolated']);
});

test('a decision tree checks answers, branches, parents, starts and loops', () => {
  assert.deepEqual(codes('diagram decision\nquestion q\noutcome a\noutcome b\nanswer q -> a "yes"\nanswer q -> b "no"'), []);
  assert.ok(codes('diagram decision\nquestion q\noutcome a\noutcome b\nanswer q -> a "yes"\nanswer a -> b "x"').includes('error:dt-outcome-out'));
  assert.ok(codes('diagram decision\nquestion q\noutcome a\noutcome b\nanswer q -> a\nanswer q -> b "no"').includes('error:dt-answer-label'));
  assert.ok(codes('diagram decision\nquestion q\noutcome a\nanswer q -> a "yes"').includes('warning:dt-branches'));
  assert.ok(codes('diagram decision\nquestion p\nquestion q\noutcome a\nanswer p -> a "x"\nanswer q -> a "y"').includes('error:dt-many-parents'));
  assert.ok(codes('diagram decision\nquestion p\nquestion q\noutcome a\noutcome b\nanswer p -> a "x"\nanswer q -> b "y"').includes('warning:dt-roots'));
  assert.ok(codes('diagram decision\nquestion p\nquestion q\nanswer p -> q "x"\nanswer q -> p "y"').includes('error:dt-cycle'));
  assert.deepEqual(codes('diagram decision\nquestion q\noutcome lost'), ['warning:isolated', 'warning:isolated']);
});

test('an eEPC alternates events and functions and starts and ends with events', () => {
  assert.deepEqual(codes('diagram epc\nevent a\nfunction f\nevent b\nand c\nflow a -> f\nflow f -> c\nflow c -> b'), []);
  assert.ok(codes('diagram epc\nevent a\nevent b\nflow a -> b').includes('error:epc-alternate'));
  assert.ok(codes('diagram epc\nfunction f\nfunction g\nflow f -> g').includes('error:epc-alternate'));
  assert.ok(codes('diagram epc\nfunction f\nevent a\nflow f -> a').includes('warning:epc-start'));
  assert.ok(codes('diagram epc\nevent a\nfunction f\nflow a -> f').includes('warning:epc-end'));
  assert.deepEqual(codes('diagram epc\nor x\nxor y'), ['warning:isolated', 'warning:isolated']);
});
