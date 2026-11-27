// The settings of the harness. They describe how the measure works, never what the product answers.
export const CONFIG = {
  // Two labels are the same element when their shared stems reach this share (see text.js).
  matchThreshold: 0.5,
  // The bins of the calibration table.
  calibrationBins: 10,
  // The k of the top-k of notation detection.
  topK: 3,
  // How many frequent mistakes the report lists.
  topErrors: 20,
  // How many times the whole run is repeated to measure stability.
  stabilityRuns: 2,
};

// Which rule codes of the checker answer which seeded defect, by the meaning of the defect (a rule code is the `rule` of an issue).
export const CATEGORY_RULES = {
  syntax: ['syntax', 'syntax-short', 'no-header', 'header-unknown', 'header-kind', 'header-kind-unknown', 'header-extra', 'unclosed'],
  dangling: ['unknown-ref', 'idef0-arrow-from', 'idef0-arrow-to', 'erd-fk-unknown', 'idef1x-fk-missing', 'idef3-referent'],
  unreachable: ['flow-unreachable', 'isolated', 'mm-unreachable', 'disconnected-parts'],
  deadend: ['flow-dead-end', 'flow-no-end', 'dfd-black-hole', 'strict-store-write-only', 'idef0-no-output'],
  'notation-rule': [
    ...['flow-no-start', 'flow-multi-start', 'flow-start-incoming', 'flow-end-outgoing', 'gateway-mixed', 'gateway-neither'],
    ...['flow-unlabelled-branch', 'bpmn-implicit-split', 'erd-no-pk', 'erd-dup-attr', 'erd-cardinality', 'dfd-no-process', 'dfd-unlabelled'],
    ...['dfd-miracle', 'gost-decision', 'gost-decision-label', 'gost-connector', 'strict-self-loop', 'strict-dup-edge', 'strict-id-case'],
    ...['duplicate', 'class-cycle', 'seq-return', 'state-nondeterministic', 'idef0-id', 'idef0-no-control', 'strict-store-read-only'],
  ],
  'level-balance': ['idef0-count', 'idef0-context', 'strict-idef0-gap', 'strict-idef0-feedback', 'strict-idef0-port-dup', 'idef0-no-input', 'idef0-no-control'],
};

// Issues of these severities count as "the checker reported something" on a clean diagram.
export const FLAGGING = ['error', 'warning'];
