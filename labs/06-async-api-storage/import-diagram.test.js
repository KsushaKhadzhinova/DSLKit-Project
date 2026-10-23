import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiagram } from '../../site/js/notations/index.js';
import { importDiagram } from '../../site/js/utils/import-diagram.js';

const lines = (result) => result.dsl.split('\n');
// Whatever is imported must be code that the editor itself accepts.
const accepted = (result) => {
  assert.equal(result.ok, true, JSON.stringify(result));
  const errors = parseDiagram(result.dsl).problems.filter((problem) => problem.severity === 'error');
  assert.deepEqual(errors, [], result.dsl);
  return result;
};

test('empty text, unknown text and diagram kinds that DSLKit does not have are reported', () => {
  assert.deepEqual(importDiagram(''), { ok: false, reason: 'empty' });
  assert.deepEqual(importDiagram(undefined), { ok: false, reason: 'empty' });
  assert.deepEqual(importDiagram('   \n%% only a comment\n'), { ok: false, reason: 'empty' });
  assert.deepEqual(importDiagram('hello world'), { ok: false, reason: 'unknown' });
  assert.deepEqual(importDiagram('classDiagram\n  Animal <|-- Duck'), { ok: false, reason: 'unsupported', name: 'classDiagram' });
  assert.deepEqual(importDiagram('erDiagram\n  A ||--o{ B : has'), { ok: false, reason: 'unsupported', name: 'erDiagram' });
  assert.deepEqual(importDiagram('@startuml\nclass Animal\nAnimal <|-- Duck\n@enduml'), { ok: false, reason: 'unsupported', name: 'class' });
  assert.deepEqual(importDiagram('flowchart TD'), { ok: false, reason: 'empty' });
  assert.deepEqual(importDiagram('sequenceDiagram'), { ok: false, reason: 'empty' });
  assert.deepEqual(importDiagram('stateDiagram-v2'), { ok: false, reason: 'empty' });
});

test('code that is already DSLKit code is returned as it is', () => {
  const result = importDiagram('  diagram graph "X"\nvertex A\n');
  assert.deepEqual(result, { ok: true, kind: 'dsl', dsl: 'diagram graph "X"\nvertex A', skipped: [] });
});

test('a Mermaid flowchart becomes a directed graph with labels', () => {
  const result = accepted(
    importDiagram(`flowchart TD
  %% a comment
  A[Start] --> B{Is it ok?};
  B -->|Yes| C[Go<br/>now]
  B -- No --> D((End))
  C & D --> E
  A -.-> E
  B ==> E
  F:::hot --- G
  X
  subgraph one
  end
  classDef hot fill:#f00
  !!!`),
  );
  assert.equal(result.kind, 'flowchart');
  assert.deepEqual(lines(result).slice(0, 2), ['diagram graph "Imported flowchart"', 'mode directed']);
  const text = result.dsl;
  assert.match(text, /vertex A "Start"/);
  assert.match(text, /vertex B "Is it ok\?"/);
  assert.match(text, /vertex C "Go now"/);
  assert.match(text, /vertex D "End"/);
  assert.match(text, /^vertex E$/m);
  assert.match(text, /edge A -> B$/m);
  assert.match(text, /edge B -> C "Yes"/);
  assert.match(text, /edge B -> D "No"/);
  assert.match(text, /edge C -> E$/m);
  assert.match(text, /edge D -> E$/m);
  assert.match(text, /edge A -> E$/m);
  assert.match(text, /edge B -> E$/m);
  assert.match(text, /edge F -> G$/m);
  assert.match(text, /^vertex X$/m);
  assert.deepEqual(result.skipped, ['subgraph', 'classDef', '!!!']);
});

test('a node keeps the first label it gets and a later label fills an empty one', () => {
  const result = accepted(importDiagram('graph LR\nA --> B\nB[Second]\nA[First]\nA[Other]'));
  assert.match(result.dsl, /vertex A "First"/);
  assert.match(result.dsl, /vertex B "Second"/);
});

test('ids with strange characters are made valid and quotes in labels cannot break the code', () => {
  const result = accepted(importDiagram('graph TD\n  a-b["He said \\"hi\\""] --> c.d["x\\y"]'));
  assert.match(result.dsl, /vertex a-b "He said 'hi'"/);
  assert.match(result.dsl, /vertex c.d "xy"/);
});

test('a Mermaid sequence diagram keeps participants, aliases and the arrow kinds', () => {
  const result = accepted(
    importDiagram(`sequenceDiagram
  participant C as Customer
  actor S as Shop
  participant Bank
  C->>S: place order
  S->>+Bank: charge
  Bank-->>-S: approved
  S-)C: email
  S-->C: accepted
  Note over C,S: hidden
  loop every day
  end
  C->>Cashier: pay`),
  );
  assert.equal(result.kind, 'sequence');
  const text = result.dsl;
  assert.match(text, /^diagram uml sequence "Imported sequence"/);
  assert.match(text, /^participant C "Customer"$/m);
  assert.match(text, /^actor S "Shop"$/m);
  assert.match(text, /^participant Bank$/m);
  assert.match(text, /^participant Cashier$/m);
  assert.match(text, /^C -> S : place order$/m);
  assert.match(text, /^S -> Bank : charge$/m);
  assert.match(text, /^Bank --> S : approved$/m);
  assert.match(text, /^S ->> C : email$/m);
  assert.match(text, /^S --> C : accepted$/m);
  assert.deepEqual(result.skipped, ['Note', 'loop']);
});

test('a PlantUML sequence diagram understands titles, quoted names, reversed arrows and the frame', () => {
  const result = accepted(
    importDiagram(`@startuml
title Checkout & pay
actor Customer
participant "Online shop" as Shop
database Bank
participant Plain as "Shown name"
participant Solo
Customer -> Shop : place order
Shop ->> Bank : charge
Bank --> Shop : approved
Shop <- Customer : thanks
Shop <-- Bank : late
"Online shop" -> Bank
activate Shop
@enduml`),
  );
  const text = result.dsl;
  assert.match(text, /^diagram uml sequence "Checkout & pay"/);
  assert.match(text, /^actor Customer$/m);
  assert.match(text, /^participant Shop "Online shop"$/m);
  assert.match(text, /^participant Bank$/m);
  assert.match(text, /^participant Plain "Shown name"$/m);
  assert.match(text, /^Customer -> Shop : place order$/m);
  assert.match(text, /^Shop ->> Bank : charge$/m);
  assert.match(text, /^Bank --> Shop : approved$/m);
  assert.match(text, /^Customer -> Shop : thanks$/m);
  assert.match(text, /^Bank --> Shop : late$/m);
  assert.match(text, /^Shop -> Bank$/m);
  assert.deepEqual(result.skipped, ['activate']);
});

test('a title that is empty falls back to the default name', () => {
  const result = accepted(importDiagram('@startuml\ntitle <br/>\nactor A\nA -> B\n@enduml'));
  assert.match(result.dsl, /^diagram uml sequence "Imported sequence"/);
});

test('a Mermaid state diagram has a start, an end and labelled transitions', () => {
  const result = accepted(
    importDiagram(`stateDiagram-v2
  direction LR
  state "Waiting for input" as Wait
  [*] --> Wait
  Wait --> Running: start
  Running --> Wait : pause
  Running --> [*]
  Running : doing work
  note right of Wait: hidden`),
  );
  assert.equal(result.kind, 'state');
  const text = result.dsl;
  assert.match(text, /^diagram uml state "Imported state diagram"/);
  assert.match(text, /^initial start$/m);
  assert.match(text, /^state Wait "Waiting for input"$/m);
  assert.match(text, /^state Running$/m);
  assert.match(text, /^final end$/m);
  assert.match(text, /^transition start -> Wait$/m);
  assert.match(text, /^transition Wait -> Running "start"$/m);
  assert.match(text, /^transition Running -> Wait "pause"$/m);
  assert.match(text, /^transition Running -> end$/m);
  assert.deepEqual(result.skipped, ['direction', 'note']);
});

test('a PlantUML state diagram is found by the star or the state keyword', () => {
  const result = accepted(importDiagram('@startuml\ntitle Player\nstate Idle\nstate "Long name" as L\nIdle --> L\nstate Big {\n}\n--\n[*] --> Idle\n@enduml'));
  assert.match(result.dsl, /^diagram uml state "Player"/);
  assert.match(result.dsl, /^state L "Long name"$/m);
  assert.match(result.dsl, /^transition Idle -> L$/m);
  assert.deepEqual(result.skipped, ['state', '--']);
  const reversed = importDiagram('@startuml\nstate A as "Alias"\nA --> B\n@enduml');
  assert.match(reversed.dsl, /^state A "Alias"$/m);
  const unknown = importDiagram('@startuml\nstate Only\n@enduml');
  assert.equal(unknown.ok, true);
  assert.equal(importDiagram('@startuml\n!!!\n@enduml').reason, 'unknown');
  assert.equal(importDiagram('stateDiagram\nnote x').reason, 'empty');
  assert.equal(importDiagram('stateDiagram\n[*] --> [*]').ok, true);
  assert.equal(importDiagram('stateDiagram\nweird ~ line').reason, 'empty');
});

test('Mermaid kinds without a counterpart are named in the answer', () => {
  for (const name of ['gantt', 'pie', 'journey', 'mindmap']) assert.deepEqual(importDiagram(`${name}\n  x`), { ok: false, reason: 'unsupported', name });
});

test('odd input does not break the import: a node without an id, an id without letters, an arrow that the language has no word for', () => {
  const flow = importDiagram('graph TD\n[x] --> B\nA --> B');
  assert.match(flow.dsl, /edge A -> B/);
  assert.doesNotMatch(flow.dsl, /vertex x/);
  assert.deepEqual(importDiagram('graph TD\nsubgraph one\nsubgraph two\nA --> B').skipped, ['subgraph'], 'a skipped word is named once');
  const nameless = importDiagram('@startuml\nparticipant "---"\n@enduml');
  assert.match(nameless.dsl, /^participant n "---"$/m);
  const reversed = importDiagram('sequenceDiagram\nparticipant A\nparticipant B\nA<-B: back');
  assert.match(reversed.dsl, /^B -> A : back$/m);
});
