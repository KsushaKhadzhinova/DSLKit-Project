import { translate } from '../i18n.js';

export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

const seed = () => [
  {
    id: 1,
    title: 'Order service sequence',
    notation: 'UML',
    description: 'Sequence diagram of a checkout request passing through the API gateway.',
    code: 'sequenceDiagram\n  Client->>API: POST /orders\n  API->>DB: insert order\n  API-->>Client: 201 Created',
    revision: 3,
    createdAt: '2026-10-01T09:00:00.000Z',
  },
  {
    id: 2,
    title: 'Approval workflow',
    notation: 'BPMN',
    description: 'Business process: a diagram goes from draft to review to published.',
    code: 'start -> draft -> review -> published',
    revision: 1,
    createdAt: '2026-10-02T10:30:00.000Z',
  },
  {
    id: 3,
    title: 'Project database',
    notation: 'ERD',
    description: 'Entities user, project and diagram with one-to-many links.',
    code: 'user 1--* project\nproject 1--* diagram',
    revision: 0,
    createdAt: '2026-10-03T14:15:00.000Z',
  },
];

// Nothing deletes a record on its own, so without a ceiling the store would grow for as long as the
// server runs; one write every few seconds, forever, is still only a few megabytes a year, but a cap
// keeps that true instead of assumed. The oldest record is dropped first, like a ring buffer.
const MAX_ITEMS = 5000;

// Data lives in memory only, as the practical requires: no database for the diagrams.
// Every record gets its own creation time: it is always later than the previous one, even within one millisecond.
export const createDiagramStore = (now = Date.now) => {
  const items = seed();
  let nextId = items.length + 1;
  let last = Math.max(...items.map((item) => Date.parse(item.createdAt)));
  return {
    all: () => [...items],
    find: (id) => items.find((item) => item.id === id),
    add: ({ title, notation, description, code, revision }) => {
      last = Math.max(now(), last + 1);
      const item = { id: nextId, title, notation, description, code, revision, createdAt: new Date(last).toISOString() };
      nextId += 1;
      items.push(item);
      if (items.length > MAX_ITEMS) items.shift();
      return item;
    },
    // Edit keeps the id and the creation time, only the form fields change.
    update: (id, { title, notation, description, code, revision }) => {
      const item = items.find((one) => one.id === id);
      if (!item) return undefined;
      Object.assign(item, { title, notation, description, code, revision });
      return item;
    },
    remove: (id) => {
      const index = items.findIndex((one) => one.id === id);
      if (index < 0) return false;
      items.splice(index, 1);
      return true;
    },
  };
};

const CONTROL = /[\p{Cc}\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
// Code keeps its line breaks and tabs (code is written on more than one line); every other control
// character and direction override is refused, the same as for the title and the description.
const CONTROL_IN_CODE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
// Zero-width and filler characters look like nothing: a title made only of them would be an empty-looking line in every list.
const INVISIBLE_ONLY = /^[\p{Z}\p{Cf}\u115f\u1160\u3164\uffa0]*$/u;

// The default translator is plain English, byte-for-byte the text this module always returned before
// the translation layer existed, so a caller that does not pass `t` (every existing test, for one) sees
// no change at all.
const defaultT = (key, vars) => translate('en', key, vars);

const required = (t, field, value, max) => {
  if (value === '') return t(`validation.${field}.required`);
  if (value.length > max) return t(`validation.${field}.maxLength`, { max });
  return null;
};

// Values arrive already trimmed, so a whitespace-only value is an empty one.
// Returns an object of field errors, empty when the input is valid. Limits come from limits.json.
// `t` is the translator of the request (res.locals.t); callers that omit it get English, as before.
export const validateDiagram = (input, limits, t = defaultT) => {
  const errors = {};
  const set = (field, message) => message && (errors[field] = message);
  set('title', required(t, 'title', input.title, limits.title.maxLength));
  // Control characters (NUL, escape) and text-direction overrides are not part of a title: they break lists and can flip the text around it.
  if (!errors.title && CONTROL.test(input.title)) errors.title = t('validation.title.control');
  if (!errors.title && INVISIBLE_ONLY.test(input.title)) errors.title = t('validation.title.invisible');
  set('description', required(t, 'description', input.description, limits.description.maxLength));
  if (!errors.description && CONTROL.test(input.description)) errors.description = t('validation.description.control');
  if (input.code.length > limits.code.maxLength) errors.code = t('validation.code.maxLength', { max: limits.code.maxLength });
  if (!errors.code && CONTROL_IN_CODE.test(input.code)) errors.code = t('validation.code.control');
  if (!NOTATIONS.includes(input.notation)) errors.notation = t('validation.notation.invalid');
  const { min, max } = limits.revision;
  if (input.revision === '') errors.revision = t('validation.revision.required');
  else if (!/^\d+$/.test(input.revision) || Number(input.revision) < min || Number(input.revision) > max) {
    errors.revision = t('validation.revision.range', { min, max });
  }
  return errors;
};
