'use strict';
const { Sequelize } = require('sequelize');

// LIKE needs an explicit escape character: sqlite has none by default. "!" avoids backslash quoting differences.
const escapeLike = (s) => s.replace(/[!%_]/g, (c) => `!${c}`);

// Case-insensitive "contains" over several columns; `sequelize.escape` quotes the value for the dialect.
function containsAny(sequelize, columns, q) {
  const pattern = sequelize.escape(`%${escapeLike(q.toLowerCase())}%`);
  return Sequelize.literal(`(${columns.map((c) => `lower(${c}) LIKE ${pattern} ESCAPE '!'`).join(' OR ')})`);
}

module.exports = { containsAny, escapeLike };
