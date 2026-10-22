import { NOTATIONS } from '../data/initialDiagrams';
import limits from '../limits.json';

// Returns an error text for a diagram title or null when the title is valid.
// A whitespace-only value counts as empty. The limits live in limits.json.
export function validateTitle(value) {
  if (typeof value !== 'string') return 'Введите название диаграммы';
  const length = value.trim().length;
  if (length < limits.title.minLength) return 'Введите название диаграммы';
  if (length > limits.title.maxLength) return `Название не длиннее ${limits.title.maxLength} символов`;
  return null;
}

// The list is capped, so that an endless clicking cannot fill localStorage and slow the page down.
export const canAddMore = (count) => count < limits.diagrams.maxCount;

// "2026-10-16 12:30:05" in local time, the same look in every locale.
export const formatTime = (iso) => new Date(iso).toLocaleString('sv-SE');

const isIsoDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

const isDiagram = (d) =>
  Boolean(d) &&
  typeof d === 'object' &&
  (typeof d.id === 'string' || typeof d.id === 'number') &&
  validateTitle(d.title) === null &&
  NOTATIONS.includes(d.notation) &&
  typeof d.published === 'boolean' &&
  isIsoDate(d.createdAt) &&
  isIsoDate(d.updatedAt);

// localStorage can hold anything (edited by hand, an old format, another script): trust only a well-formed list.
export const isDiagramList = (value) =>
  Array.isArray(value) && value.length <= limits.diagrams.maxCount && value.every(isDiagram) && new Set(value.map((d) => d.id)).size === value.length;

// A list with some bad records is not thrown away: the good records stay, bad ones, repeated ids and records over the cap are dropped.
// Nothing usable (not a list, or no record passes) gives null, then the initial data is used.
export const repairDiagramList = (value) => {
  if (!Array.isArray(value)) return null;
  const seen = new Set();
  const good = value.filter((d) => {
    if (!isDiagram(d) || seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
  return good.length > 0 ? good.slice(0, limits.diagrams.maxCount) : null;
};
