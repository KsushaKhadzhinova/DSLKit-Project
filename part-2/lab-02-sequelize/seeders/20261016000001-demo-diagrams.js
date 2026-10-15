const titles = ['Order processing', 'Billing schema', 'Login flow'];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('Diagrams', [
      { title: titles[0], notation: 'BPMN', sourceCode: 'start -> check -> pay -> ship', priority: 'high', owner: 'anna', createdAt: now, updatedAt: now },
      { title: titles[1], notation: 'ERD', sourceCode: 'entity Invoice { id; total }', priority: 'normal', owner: 'boris', createdAt: now, updatedAt: now },
      { title: titles[2], notation: 'UML', sourceCode: 'user -> server: login', priority: 'low', owner: 'anna', createdAt: now, updatedAt: now },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Diagrams', { title: { [Sequelize.Op.in]: titles } });
  },
};
