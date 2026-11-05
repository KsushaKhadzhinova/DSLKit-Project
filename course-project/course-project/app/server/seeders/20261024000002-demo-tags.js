const { ROWS, NAMES } = require('../seed-data/tags');

// Tags need the demo diagrams. A row whose diagram is missing is skipped. Idempotent per tag and per link: nothing is duplicated, a deleted row comes back.
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const ids = new Map();
    for (const name of NAMES) {
      let id = await queryInterface.rawSelect('Tags', { where: { name } }, ['id']);
      if (!id) {
        await queryInterface.bulkInsert('Tags', [{ name, createdAt: now, updatedAt: now }]);
        id = await queryInterface.rawSelect('Tags', { where: { name } }, ['id']);
      }
      ids.set(name, id);
    }
    let added = 0;
    for (const row of ROWS) {
      const diagramId = await queryInterface.rawSelect('Diagrams', { where: { title: row.diagram } }, ['id']);
      if (!diagramId) continue;
      for (const name of row.tags) {
        const tagId = ids.get(name);
        if (await queryInterface.rawSelect('DiagramTags', { where: { diagramId, tagId } }, ['tagId'])) continue;
        await queryInterface.bulkInsert('DiagramTags', [{ diagramId, tagId, createdAt: now, updatedAt: now }]);
        added += 1;
      }
    }
    if (!added) console.log('No demo tags were linked (the demo diagrams are missing, or the links exist)');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Tags', { name: { [Sequelize.Op.in]: NAMES } });
  },
};
