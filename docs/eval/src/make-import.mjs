// Makes docs/eval/import.json: codes in Mermaid, PlantUML and Graphviz DOT with the elements and relations that a reader sees in them.
// The gold is read off each code by meaning (what boxes and arrows it draws), not off the answer of the importer.
// Elements: "label", "d:label" (decision), "a:label" (participant); relations: chains of indexes "0-1-2 1-3".
// Run: node docs/eval/src/make-import.mjs
import { writeFileSync } from 'node:fs';

const NL = '\n';
const cases = [];
const c = (format, lines, el, rel, note) =>
  cases.push({ id: `import-${String(cases.length + 1).padStart(3, '0')}`, format, code: lines.join(NL), el, rel, ...(note ? { note } : {}) });

// ----- Mermaid flowcharts
c('mermaid', ['graph TD', 'A[Start] --> B[Read order]', 'B --> C[Ship goods]'], ['Start', 'Read order', 'Ship goods'], '0-1-2');
c(
  'mermaid',
  ['flowchart LR', 'A[Receive] --> B{In stock?}', 'B -->|yes| C[Ship]', 'B -->|no| D[Backorder]'],
  ['Receive', 'd:In stock?', 'Ship', 'Backorder'],
  '0-1 1-2 1-3',
);
c('mermaid', ['graph TD', 'A(Login) --> B(Dashboard)', 'B --> C(Settings)', 'B --> D(Reports)'], ['Login', 'Dashboard', 'Settings', 'Reports'], '0-1 1-2 1-3');
c(
  'mermaid',
  [
    'flowchart TB',
    'S([Begin]) --> P1[Check input]',
    'P1 --> Q{Valid?}',
    'Q -- yes --> P2[Save record]',
    'Q -- no --> P3[Show error]',
    'P2 --> E([Finish])',
    'P3 --> E',
  ],
  ['Begin', 'Check input', 'd:Valid?', 'Save record', 'Show error', 'Finish'],
  '0-1-2 2-3-5 2-4-5',
);
c('mermaid', ['graph LR', 'A --> B --> C --> D'], ['A', 'B', 'C', 'D'], '0-1-2-3');
c(
  'mermaid',
  ['graph TD', 'A[Client] --> B[Server]', 'A --> C[Cache]', 'B --> D[(Database)]', 'C --> D'],
  ['Client', 'Server', 'Cache', 'Database'],
  '0-1 0-2 1-3 2-3',
);
c(
  'mermaid',
  ['flowchart TD', 'A[Idea] --> B[Design]', 'B --> C[Build]', 'C --> D[Test]', 'D -->|fail| C', 'D -->|pass| E[Release]'],
  ['Idea', 'Design', 'Build', 'Test', 'Release'],
  '0-1-2-3 3-2 3-4',
);
c(
  'mermaid',
  ['graph TD', 'subgraph Front', 'A[Form] --> B[Validate]', 'end', 'B --> C[API]'],
  ['Form', 'Validate', 'API'],
  '0-1-2',
  'a subgraph must not hide its nodes',
);
c(
  'mermaid',
  ['graph TD', 'A[Start] --> B[Step one]', '%% a comment', 'B --> C[Step two]', 'classDef green fill:#9f6', 'class A green'],
  ['Start', 'Step one', 'Step two'],
  '0-1-2',
  'comments and styles are not elements',
);
c('mermaid', ['graph LR', 'A["Pay by card"] --> B["Print receipt"]'], ['Pay by card', 'Print receipt'], '0-1', 'quoted labels');
c(
  'mermaid',
  ['graph TD', 'A[Оформить заказ] --> B{Товар есть?}', 'B -->|да| C[Отправить]', 'B -->|нет| D[Уведомить клиента]'],
  ['Оформить заказ', 'd:Товар есть?', 'Отправить', 'Уведомить клиента'],
  '0-1 1-2 1-3',
);
c('mermaid', ['graph TD', 'A[Source] -.-> B[Mirror]', 'A ==> C[Primary]'], ['Source', 'Mirror', 'Primary'], '0-1 0-2', 'dotted and thick links');
c('mermaid', ['graph TD', 'A[Task] --- B[Note]'], ['Task', 'Note'], '0-1', 'a link without an arrow still joins two nodes');
c(
  'mermaid',
  ['graph TD', 'A[Intake] --> B[Review] & C[Archive]', 'B --> D[Done]', 'C --> D'],
  ['Intake', 'Review', 'Archive', 'Done'],
  '0-1 0-2 1-3 2-3',
  'an ampersand joins several nodes',
);
c('mermaid', ['graph TD', 'A[Plan] -->|approve| B[Execute]', 'B -->|report| C[Close]'], ['Plan', 'Execute', 'Close'], '0-1-2');
c(
  'mermaid',
  ['graph TD', 'start{Is it raining?}', 'start -->|yes| umbrella[Take umbrella]', 'start -->|no| walk[Go outside]'],
  ['d:Is it raining?', 'Take umbrella', 'Go outside'],
  '0-1 0-2',
);
c(
  'mermaid',
  ['flowchart LR', 'id1[Collect data] --> id2[Clean data] --> id3[Train model] --> id4[Deploy model]'],
  ['Collect data', 'Clean data', 'Train model', 'Deploy model'],
  '0-1-2-3',
);
c('mermaid', ['graph TD', 'A[Node A]', 'B[Node B]', 'C[Node C]', 'A --> B', 'A --> C', 'C --> B'], ['Node A', 'Node B', 'Node C'], '0-1 0-2 2-1');
c(
  'mermaid',
  ['graph TD', 'A[Request] --> B{Authorized?}', 'B -->|yes| C[Serve]', 'B -->|no| D{Retry?}', 'D -->|yes| A', 'D -->|no| E[Reject]'],
  ['Request', 'd:Authorized?', 'Serve', 'd:Retry?', 'Reject'],
  '0-1 1-2 1-3 3-0 3-4',
);
c('mermaid', ['graph TD', 'A[One] --> B[Two]', 'direction LR', 'B --> C[Three]'], ['One', 'Two', 'Three'], '0-1-2', 'a direction line is skipped');

// ----- Mermaid sequence and state
c(
  'mermaid',
  ['sequenceDiagram', 'participant U as User', 'participant S as Shop', 'U->>S: place order', 'S-->>U: confirmation'],
  ['a:User', 'a:Shop'],
  '0-1 1-0',
);
c(
  'mermaid',
  [
    'sequenceDiagram',
    'actor Client',
    'participant Server',
    'participant DB',
    'Client->>Server: request',
    'Server->>DB: query',
    'DB-->>Server: rows',
    'Server-->>Client: response',
  ],
  ['a:Client', 'a:Server', 'a:DB'],
  '0-1 1-2 2-1 1-0',
);
c('mermaid', ['sequenceDiagram', 'Alice->>Bob: Hello', 'Bob-->>Alice: Hi'], ['a:Alice', 'a:Bob'], '0-1 1-0');
c(
  'mermaid',
  ['sequenceDiagram', 'participant A', 'participant B', 'participant C', 'A->>B: first', 'B->>C: second', 'C->>A: third'],
  ['a:A', 'a:B', 'a:C'],
  '0-1 1-2 2-0',
);
c(
  'mermaid',
  ['sequenceDiagram', 'participant Клиент', 'participant Банк', 'Клиент->>Банк: оплата', 'Банк-->>Клиент: подтверждение'],
  ['a:Клиент', 'a:Банк'],
  '0-1 1-0',
);
c('mermaid', ['sequenceDiagram', 'A->>B: ping', 'Note right of B: wait', 'B-->>A: pong'], ['a:A', 'a:B'], '0-1 1-0', 'a note is not a message');
c('mermaid', ['stateDiagram-v2', '[*] --> Idle', 'Idle --> Running : start', 'Running --> Idle : stop', 'Running --> [*]'], ['Idle', 'Running'], '0-1 1-0');
c('mermaid', ['stateDiagram', '[*] --> Draft', 'Draft --> Review', 'Review --> Published', 'Published --> [*]'], ['Draft', 'Review', 'Published'], '0-1-2');
c('mermaid', ['stateDiagram-v2', '[*] --> Off', 'Off --> On : switch', 'On --> Off : switch', 'On --> Broken : fault'], ['Off', 'On', 'Broken'], '0-1 1-0 1-2');

// ----- PlantUML
c('plantuml', ['@startuml', 'actor User', 'participant Shop', 'User -> Shop : order', 'Shop --> User : receipt', '@enduml'], ['a:User', 'a:Shop'], '0-1 1-0');
c(
  'plantuml',
  ['@startuml', 'participant A', 'participant B', 'participant C', 'A -> B : call', 'B -> C : forward', 'C --> B : result', 'B --> A : result', '@enduml'],
  ['a:A', 'a:B', 'a:C'],
  '0-1 1-2 2-1 1-0',
);
c(
  'plantuml',
  ['@startuml', 'Client -> Gateway : request', 'Gateway -> Service : route', 'Service --> Gateway : data', 'Gateway --> Client : response', '@enduml'],
  ['a:Client', 'a:Gateway', 'a:Service'],
  '0-1 1-2 2-1 1-0',
);
c(
  'plantuml',
  [
    '@startuml',
    'title Login',
    'actor Visitor',
    'participant Site',
    'database Users',
    'Visitor -> Site : credentials',
    'Site -> Users : find user',
    'Users --> Site : user',
    'Site --> Visitor : session',
    '@enduml',
  ],
  ['a:Visitor', 'a:Site', 'a:Users'],
  '0-1 1-2 2-1 1-0',
);
c(
  'plantuml',
  ['@startuml', 'participant "Order service" as O', 'participant "Payment service" as P', 'O -> P : charge', 'P --> O : paid', '@enduml'],
  ['a:Order service', 'a:Payment service'],
  '0-1 1-0',
);
c(
  'plantuml',
  ['@startuml', '[*] --> Waiting', 'Waiting --> Active : begin', 'Active --> Waiting : pause', 'Active --> [*]', '@enduml'],
  ['Waiting', 'Active'],
  '0-1 1-0',
);
c('plantuml', ['@startuml', '[*] --> New', 'New --> Paid : pay', 'Paid --> Shipped : ship', 'Shipped --> [*]', '@enduml'], ['New', 'Paid', 'Shipped'], '0-1-2');
c(
  'plantuml',
  ['@startuml', 'actor Админ', 'participant Система', 'Админ -> Система : создать пользователя', 'Система --> Админ : готово', '@enduml'],
  ['a:Админ', 'a:Система'],
  '0-1 1-0',
);
c('plantuml', ['@startuml', 'A -> B : one', "' a comment", 'B -> A : two', '@enduml'], ['a:A', 'a:B'], '0-1 1-0', 'comments are skipped');
c(
  'plantuml',
  ['@startuml', 'participant X', 'participant Y', 'X -> Y : go', 'Y -> Y : think', 'Y --> X : back', '@enduml'],
  ['a:X', 'a:Y'],
  '0-1 1-1 1-0',
  'a message to oneself',
);

// ----- Graphviz DOT (the product has no DOT importer: the gold is what a reader sees)
c('dot', ['digraph G {', '  A -> B;', '  B -> C;', '}'], ['A', 'B', 'C'], '0-1-2');
c('dot', ['digraph flow {', '  start [label="Start"];', '  check [label="Check order" shape=box];', '  start -> check;', '}'], ['Start', 'Check order'], '0-1');
c(
  'dot',
  ['digraph G {', '  rankdir=LR;', '  a [label="Parse"];', '  b [label="Analyze"];', '  c [label="Emit"];', '  a -> b -> c;', '}'],
  ['Parse', 'Analyze', 'Emit'],
  '0-1-2',
);
c(
  'dot',
  [
    'digraph G {',
    '  user [label="User"];',
    '  app [label="App"];',
    '  db [label="Database" shape=cylinder];',
    '  user -> app [label="request"];',
    '  app -> db [label="query"];',
    '}',
  ],
  ['User', 'App', 'Database'],
  '0-1-2',
);
c('dot', ['graph G {', '  A -- B;', '  B -- C;', '  A -- C;', '}'], ['A', 'B', 'C'], '0-1 1-2 0-2', 'an undirected graph');
c(
  'dot',
  ['digraph G {', '  node [shape=box];', '  "Read" -> "Decide";', '  "Decide" -> "Act";', '  "Decide" -> "Skip";', '}'],
  ['Read', 'Decide', 'Act', 'Skip'],
  '0-1 1-2 1-3',
);

const out = { version: 1, note: 'Generated by docs/eval/src/make-import.mjs. The gold is what the code draws, read by meaning.', cases };
writeFileSync(new URL('../import.json', import.meta.url), JSON.stringify(out, null, 2) + NL);
console.log(cases.length, 'import codes');
