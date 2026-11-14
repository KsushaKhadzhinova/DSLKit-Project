import { readFileSync } from 'node:fs';

// All size limits live in limits.json, not in the code.
export const loadLimits = (path = new URL('../limits.json', import.meta.url)) => JSON.parse(readFileSync(path, 'utf8'));
