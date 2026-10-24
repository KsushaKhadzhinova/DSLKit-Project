const { DataTypes } = require('sequelize');
const { LIMITS } = require('./diagram.constants');

// The tables are created by migrations. Tag is a shared label, DiagramTag is the join table of the many-to-many link.
const defineTag = (sequelize) =>
  sequelize.define('Tag', {
    name: { type: DataTypes.STRING(LIMITS.tag), allowNull: false, unique: true, validate: { len: [1, LIMITS.tag] } },
  });

const defineDiagramTag = (sequelize) =>
  sequelize.define('DiagramTag', {
    diagramId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    tagId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  });

module.exports = { defineTag, defineDiagramTag };
