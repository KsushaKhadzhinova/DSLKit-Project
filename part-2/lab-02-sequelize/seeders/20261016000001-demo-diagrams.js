// Every seeded row has this owner, so the seed can tell its rows from the ones users created.
const MARKER = 'demo';

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.rawSelect('Diagrams', { where: { owner: MARKER } }, ['id']);
    if (existing) return;
    const now = new Date();
    await queryInterface.bulkInsert('Diagrams', [
      {
        title: 'Order processing',
        notation: 'BPMN',
        sourceCode: 'start -> check -> pay -> ship',
        priority: 'high',
        owner: MARKER,
        createdAt: now,
        updatedAt: now,
      },
      {
        title: 'Billing schema',
        notation: 'ERD',
        sourceCode: 'entity Invoice { id; total }',
        priority: 'normal',
        owner: MARKER,
        createdAt: now,
        updatedAt: now,
      },
      { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', priority: 'low', owner: MARKER, createdAt: now, updatedAt: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Diagrams', { owner: MARKER });
  },
};
