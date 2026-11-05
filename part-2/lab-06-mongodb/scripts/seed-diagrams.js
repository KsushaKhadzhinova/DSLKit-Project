// Demo rows for the seed script: the three original diagrams first, then four per notation and a few awkward ones.
// The awkward rows are data that a real user could type, they must be stored and shown as plain text.

const BASE = [
  { title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> check -> pay -> ship', priority: 2 },
  { title: 'Billing schema', notation: 'ERD', sourceCode: 'entity Invoice { id; total }', priority: 1 },
  { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', priority: 0 },
];

const SAMPLES = {
  UML: [
    ['Class model of a shop', 'class Order { id; total }\nclass Item { sku; price }\nOrder "1" -- "*" Item'],
    ['Sequence of a payment', 'client -> shop: pay\nshop -> bank: charge\nbank --> shop: ok\nshop --> client: receipt'],
    ['States of a ticket', 'new -> open -> resolved -> closed\nresolved -> open: reopen'],
    ['Use cases of a library', 'reader -> (borrow a book)\nlibrarian -> (register a reader)'],
  ],
  BPMN: [
    ['Leave request', 'start -> fill form -> manager review -> approved? -> end'],
    ['Refund', 'start -> check order -> refund? -> pay back -> end'],
    ['Hiring', 'start -> screen CV -> interview -> offer -> end'],
    ['Incident handling', 'start -> triage -> fix -> verify -> close'],
  ],
  ERD: [
    ['Users and projects', 'entity User { id; email }\nentity Project { id; title }\nUser 1..* Project'],
    ['Warehouse', 'entity Product { sku; stockQuantity }\nentity Shelf { code }\nShelf 1..* Product'],
    ['School', 'entity Student { id; name }\nentity Course { id; title }\nStudent *..* Course'],
    ['Blog', 'entity Post { id; title }\nentity Comment { id; text }\nPost 1..* Comment'],
  ],
  DFD: [
    ['Context of an online shop', 'external Customer -> process Shop: order\nprocess Shop -> store Orders: save'],
    ['Payment flow', 'external Buyer -> process Pay: card data\nprocess Pay -> external Bank: charge'],
    ['Support desk', 'external User -> process Desk: question\nprocess Desk -> store Tickets: save'],
    ['Report export', 'store Sales -> process Export: rows\nprocess Export -> external Manager: file'],
  ],
  IDEF0: [
    ['A0 Process order', 'diagram idef0 "Process order"\nbox A0 "Process order" { input: Order\n control: Rules\n output: Invoice }'],
    ['A1 Ship goods', 'diagram idef0 "Ship goods"\nbox A1 "Ship goods" { input: Invoice\n control: Carrier rules\n output: Parcel }'],
    ['A2 Produce item', 'diagram idef0 "Produce item"\nbox A2 "Produce item" { input: Material\n control: Drawing\n output: Item\n mechanism: Machine }'],
    ['A3 Check quality', 'diagram idef0 "Check quality"\nbox A3 "Check quality" { input: Item\n control: Standard\n output: Verdict }'],
  ],
  Petri: [
    ['Producer and consumer', 'place buffer = 0\ntransition produce\ntransition consume\nproduce -> buffer\nbuffer -> consume'],
    ['Traffic light', 'place red = 1\nplace green = 0\ntransition go\ntransition stop\nred -> go -> green\ngreen -> stop -> red'],
    ['Mutual exclusion', 'place free = 1\nplace busy = 0\ntransition enter\ntransition leave\nfree -> enter -> busy\nbusy -> leave -> free'],
    ['Deadlock demo', 'place a = 1\nplace b = 0\ntransition t1\nt1 -> b\na -> t1'],
  ],
};

const generated = Object.entries(SAMPLES).flatMap(([notation, items], n) =>
  items.map(([name, sourceCode], i) => ({ title: `${notation}: ${name}`, notation, sourceCode, priority: (n + i) % 3 })),
);

const AWKWARD = [
  { title: 'Юникод: диаграмма заказа ✓ — 订单', notation: 'BPMN', sourceCode: 'начало -> проверка -> оплата -> доставка ✓', priority: 1 },
  { title: '<img src=x onerror=alert(1)>', notation: 'UML', sourceCode: '<script>alert("not run")</script>\n"quotes" \'apostrophes\' & ampersands', priority: 0 },
  { title: "'; DROP TABLE Diagrams; --", notation: 'ERD', sourceCode: "entity T { id }\n-- ' OR 1=1 --", priority: 0 },
  { title: 'T'.repeat(80), notation: 'DFD', sourceCode: 'the longest allowed title', priority: 2 },
  { title: 'A long source', notation: 'IDEF0', sourceCode: Array.from({ length: 300 }, (_, i) => `// line ${i + 1}`).join('\n'), priority: 1 },
];

const OWNERS = ['anna', 'boris', 'carol', 'dave'];
const TAGS = [['shop', 'process'], ['auth'], ['database', 'shop'], ['docs'], ['demo', 'edge']];
const COMMENTS = [
  [{ author: 'boris', text: 'Add a refund branch' }],
  [],
  [{ author: 'anna', text: 'Looks right' }, { author: 'carol', text: '<b>not bold</b> & "quoted"' }],
];

// Owners, tags and comments are spread over the rows in turn, so filters, sorting and the text index have something to work on.
const ROWS = [...BASE, ...generated, ...AWKWARD].map((row, i) => ({
  ...row,
  owner: OWNERS[i % OWNERS.length],
  tags: TAGS[i % TAGS.length],
  comments: COMMENTS[i % COMMENTS.length],
}));

module.exports = { ROWS };
