const { DataTypes } = require('sequelize');
const { LIMITS } = require('./diagram.constants');

// A project groups diagrams: one project has many diagrams, a diagram belongs to at most one project.
// The table is created by migrations, never by sequelize.sync().
const defineProject = (sequelize) =>
  sequelize.define('Project', {
    name: { type: DataTypes.STRING(LIMITS.projectName), allowNull: false, unique: true, validate: { len: [1, LIMITS.projectName] } },
  });

module.exports = { defineProject };
