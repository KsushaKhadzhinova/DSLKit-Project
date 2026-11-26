'use strict';
const { Sequelize } = require('sequelize');

// Search text is normalised in code (NFC + lower case), because SQL lower() in SQLite handles only ASCII.
const normalize = (s) => s.normalize('NFC').toLowerCase();

// LIKE needs an explicit escape character: sqlite has none by default. "!" avoids backslash quoting differences.
const escapeLike = (s) => s.replace(/[!%_]/g, (c) => `!${c}`);

// "Contains" over the precomputed searchText column; `sequelize.escape` quotes the value for the dialect.
function containsText(sequelize, column, q) {
  const pattern = sequelize.escape(`%${escapeLike(normalize(q))}%`);
  return Sequelize.literal(`${column} LIKE ${pattern} ESCAPE '!'`);
}

module.exports = { containsText, escapeLike, normalize };
