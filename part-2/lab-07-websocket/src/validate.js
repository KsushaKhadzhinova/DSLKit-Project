const limits = require('../limits.json');

const NAME_RE = new RegExp(String.raw`^[\p{L}\p{N}_.-]{1,${limits.nameMaxLength}}$`, 'u');
const ROOM_RE = new RegExp(`^[a-z0-9][a-z0-9_-]{0,${limits.roomMaxLength - 1}}$`, 'i');

const cleanName = (value) => (typeof value === 'string' && NAME_RE.test(value.trim()) ? value.trim() : null);

const cleanRoom = (value) => (typeof value === 'string' && ROOM_RE.test(value) ? value : null);

// A whitespace-only text trims to an empty string and is rejected like an empty one.
const cleanText = (value) => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= limits.textMaxLength ? text : null;
};

module.exports = { cleanName, cleanRoom, cleanText, limits };
