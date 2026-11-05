import { createExpertStore } from '../storage/expert.js';
import { KB_NOTATION } from './kb-notation.js';
import { KB_REVIEW } from './kb-review.js';

// Both knowledge bases by their ids, and the store that gives their rules as they work now (originals or edited by a developer).
export const BASES = { notation: KB_NOTATION, review: KB_REVIEW };
export const expertStore = (storage) => createExpertStore({ storage, bases: BASES });
