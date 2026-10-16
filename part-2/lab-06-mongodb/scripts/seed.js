require('dotenv').config({ quiet: true });
const { Diagram } = require('../src/models');
const { connect, disconnect } = require('../src/db');

const demo = [
  {
    title: 'Order processing',
    notation: 'BPMN',
    sourceCode: 'start -> check stock -> pay -> ship -> end',
    priority: 'high',
    owner: 'anna',
    tags: ['shop', 'process'],
    comments: [{ author: 'boris', text: 'Add a refund branch' }],
  },
  { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', owner: 'carol', tags: ['auth'] },
  { title: 'Customers and orders', notation: 'ERD', sourceCode: 'Customer ||--o{ Order', priority: 'low', owner: 'anna', tags: ['shop', 'database'] },
];

// Replaces the demo documents by title, so the script can be run many times.
const seed = async () => {
  await connect();
  await Diagram.deleteMany({ title: { $in: demo.map((d) => d.title) } });
  const created = await Diagram.create(demo);
  console.log(`Seeded ${created.length} diagrams`);
  await disconnect();
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
