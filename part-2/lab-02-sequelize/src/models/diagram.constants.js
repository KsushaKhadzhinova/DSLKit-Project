const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];
const PRIORITIES = ['low', 'normal', 'high'];
const DEFAULT_PRIORITY = 'normal';
// Limits live in limits.json and match the column types in the migrations, so the database never sees a longer value.
const LIMITS = require('../../limits.json');
const MAX_ID = 2147483647;

module.exports = { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS, MAX_ID };
