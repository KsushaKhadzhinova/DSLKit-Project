import limits from '../limits.json';

// Returns an error text for a diagram title or null when the title is valid.
// A whitespace-only value counts as empty. The limits live in limits.json.
export function validateTitle(value) {
  const length = value.trim().length;
  if (length < limits.title.minLength) return 'Введите название диаграммы';
  if (length > limits.title.maxLength) return `Название не длиннее ${limits.title.maxLength} символов`;
  return null;
}

// "2026-10-16 12:30:05" in local time, the same look in every locale.
export const formatTime = (iso) => new Date(iso).toLocaleString('sv-SE');

export const isDiagramList = (value) => Array.isArray(value) && value.every((d) => d && typeof d.title === 'string' && typeof d.createdAt === 'string');
