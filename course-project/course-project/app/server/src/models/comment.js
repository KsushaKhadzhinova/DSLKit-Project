const { DataTypes } = require('sequelize');
const { LIMITS } = require('./diagram.constants');

// The table is created by migrations. The keys diagramId and authorId are set by the controller, never taken from a request body.
const defineComment = (sequelize) =>
  sequelize.define('Comment', {
    diagramId: { type: DataTypes.INTEGER, allowNull: false },
    authorId: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false, validate: { len: [1, LIMITS.comment] } },
  });

module.exports = { defineComment };
