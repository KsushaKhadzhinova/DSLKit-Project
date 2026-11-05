// Demo tags for the seeder. Each row names a diagram by title and lists its tags, so the data holds no ids and the seed can run twice.
const ROWS = [
  { diagram: 'Order processing', tags: ['shop', 'process', 'draft'] },
  { diagram: 'Billing schema', tags: ['shop', 'database'] },
  { diagram: 'Login flow', tags: ['security', 'process'] },
];

const NAMES = [...new Set(ROWS.flatMap((row) => row.tags))];

module.exports = { ROWS, NAMES };
