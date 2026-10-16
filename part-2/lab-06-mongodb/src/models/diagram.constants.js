// All limits live in limits.json, so they can be changed without touching the code.
const LIMITS = require('../../limits.json');

const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];
const PRIORITY = { min: LIMITS.priorityMin, max: LIMITS.priorityMax, default: LIMITS.priorityDefault };

module.exports = { NOTATIONS, PRIORITY, LIMITS };
