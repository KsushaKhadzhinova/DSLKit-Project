import { fileURLToPath } from 'node:url';
import { reportSuite } from '../../tools/report-suite.js';

// The suite reads files relative to the repository root, so `npm test` works from this folder too.
process.chdir(fileURLToPath(new URL('../..', import.meta.url)));
reportSuite('part-2/pz-03-routing-v6');
