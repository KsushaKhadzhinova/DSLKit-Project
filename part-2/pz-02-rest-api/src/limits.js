import { readFileSync } from 'node:fs';

// All sizes live in limits.json, not in the code: field lengths, page sizes, body size, rate limit, quota.
export const LIMITS = JSON.parse(readFileSync(new URL('../limits.json', import.meta.url), 'utf8'));
