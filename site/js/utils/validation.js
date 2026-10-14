export const NOTATIONS = ['idef0', 'dfd', 'erd', 'bpmn', 'uml', 'petri'];

const NAME_PATTERN = /^\p{L}[\p{L}' ’-]{1,59}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 120;
const MAX_COMMENT_LENGTH = 500;
const MAX_TEAM_SIZE = 500;

export function isValidName(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return NAME_PATTERN.test(String(value).trim());
}

export function isValidEmail(value) {
  const trimmed = String(value).trim();
  return trimmed.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(trimmed);
}

export function isValidTeamSize(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= MAX_TEAM_SIZE;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const number = Number(value.trim());
    return number <= MAX_TEAM_SIZE;
  }
  return false;
}

export function isValidNotation(value) {
  return NOTATIONS.includes(value);
}

export function isValidComment(value = '') {
  return String(value).length <= MAX_COMMENT_LENGTH;
}

export function validateWaitlist({ name, email, notation, team, comment, consent } = {}) {
  const invalid = [];
  if (!isValidName(name)) {
    invalid.push('name');
  }
  if (!isValidEmail(email)) {
    invalid.push('email');
  }
  if (!isValidNotation(notation)) {
    invalid.push('notation');
  }
  if (!isValidTeamSize(team)) {
    invalid.push('team');
  }
  if (!isValidComment(comment)) {
    invalid.push('comment');
  }
  if (consent !== true) {
    invalid.push('consent');
  }
  return invalid;
}
