const { Sequelize } = require('sequelize');
const { defineDiagram } = require('./diagram');
const { defineRequestLog } = require('./request-log');
const { defineProject } = require('./project');
const allConfigs = require('../../config/config');

// Builds the connection from config/config.js; NODE_ENV picks the block.
const createModels = (config = allConfigs[process.env.NODE_ENV || 'development']) => {
  const { use_env_variable: urlVariable, ...options } = config;
  const sequelize = urlVariable ? new Sequelize(process.env[urlVariable], options) : new Sequelize(options);
  const Diagram = defineDiagram(sequelize);
  const Project = defineProject(sequelize);
  // One-to-many: a project has many diagrams, a diagram belongs to one project. Deleting a project clears projectId of its diagrams.
  Project.hasMany(Diagram, { foreignKey: 'projectId', as: 'diagrams', onDelete: 'SET NULL' });
  Diagram.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
  return { sequelize, Diagram, Project, RequestLog: defineRequestLog(sequelize) };
};

module.exports = { createModels };
