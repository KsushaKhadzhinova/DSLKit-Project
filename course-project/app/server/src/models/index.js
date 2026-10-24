const { Sequelize } = require('sequelize');
const { defineDiagram } = require('./diagram');
const { defineUser } = require('./user');
const { defineRequestLog } = require('./request-log');
const { defineComment } = require('./comment');
const allConfigs = require('../../config/config');

// Builds the connection from config/config.js; NODE_ENV picks the block.
const createModels = (config = allConfigs[process.env.NODE_ENV || 'development']) => {
  const { use_env_variable: urlVariable, ...options } = config;
  const sequelize = urlVariable ? new Sequelize(process.env[urlVariable], options) : new Sequelize(options);
  const Diagram = defineDiagram(sequelize);
  const User = defineUser(sequelize);
  // RESTRICT matches the foreign key in the migration: a user with diagrams cannot be deleted.
  User.hasMany(Diagram, { foreignKey: 'ownerId', onDelete: 'RESTRICT' });
  Diagram.belongsTo(User, { foreignKey: 'ownerId', onDelete: 'RESTRICT' });
  // Comments cascade: a deleted diagram or user takes their comments along (same rule as the foreign keys in the migration).
  const Comment = defineComment(sequelize);
  Diagram.hasMany(Comment, { foreignKey: 'diagramId', onDelete: 'CASCADE' });
  Comment.belongsTo(Diagram, { foreignKey: 'diagramId', onDelete: 'CASCADE' });
  User.hasMany(Comment, { foreignKey: 'authorId', onDelete: 'CASCADE' });
  Comment.belongsTo(User, { foreignKey: 'authorId', onDelete: 'CASCADE' });
  return { sequelize, Diagram, User, Comment, RequestLog: defineRequestLog(sequelize) };
};

module.exports = { createModels };
