const NAME_RE = /^[\p{L}\p{N}_.-]{1,24}$/u;
const ROOM_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
const MAX_TEXT = 500;

const cleanName = (value) => (typeof value === 'string' && NAME_RE.test(value.trim()) ? value.trim() : null);

const cleanRoom = (value) => (typeof value === 'string' && ROOM_RE.test(value) ? value : null);

const cleanText = (value) => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= MAX_TEXT ? text : null;
};

module.exports = { cleanName, cleanRoom, cleanText, MAX_TEXT };
