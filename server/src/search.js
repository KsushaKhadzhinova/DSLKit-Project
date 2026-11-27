'use strict';
const { Sequelize } = require('sequelize');

// Search text is normalised in code (NFC + lower case), because SQL lower() in SQLite handles only ASCII.
// ё is folded into е: Russian text is often typed without the dots.
const normalize = (s) => s.normalize('NFC').toLowerCase().replaceAll('\u0451', '\u0435');

// Lower-casing can lengthen text (one letter may become two), so the stored value is cut to the column size.
const fit = (s, max) => (s.length <= max ? s : [...s].slice(0, max).join('').slice(0, max));

// LIKE needs an explicit escape character: sqlite has none by default. "!" avoids backslash quoting differences.
const escapeLike = (s) => s.replace(/[!%_]/g, (c) => `!${c}`);

// "Contains" over the precomputed searchText column; `sequelize.escape` quotes the value for the dialect.
function containsText(sequelize, column, q) {
  const pattern = sequelize.escape(`%${escapeLike(normalize(q))}%`);
  return Sequelize.literal(`${column} LIKE ${pattern} ESCAPE '!'`);
}

module.exports = { containsText, escapeLike, normalize, fit };
