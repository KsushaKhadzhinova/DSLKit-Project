const limits = require('../limits.json');

const NAME_RE = new RegExp(String.raw`^[\p{L}\p{N}_.-]{1,${limits.nameMaxLength}}$`, 'u');
const ROOM_RE = new RegExp(`^[a-z0-9][a-z0-9_-]{0,${limits.roomMaxLength - 1}}$`, 'i');
// C0/C1 control characters except new line and tab, plus the bidirectional overrides that can flip the text around a name.
const HIDDEN_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;

const cleanName = (value) => (typeof value === 'string' && NAME_RE.test(value.trim()) ? value.trim() : null);

// Room names are case-insensitive: "Diagram-1" and "diagram-1" are the same room.
const cleanRoom = (value) => (typeof value === 'string' && ROOM_RE.test(value) ? value.toLowerCase() : null);

// A whitespace-only text trims to an empty string and is rejected like an empty one.
const cleanText = (value) => {
  if (typeof value !== 'string' || value.length > limits.textMaxLength * 2) return null;
  const text = value.replace(HIDDEN_RE, '').trim();
  return text.length > 0 && text.length <= limits.textMaxLength ? text : null;
};

module.exports = { cleanName, cleanRoom, cleanText, limits };
