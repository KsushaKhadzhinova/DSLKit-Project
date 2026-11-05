// Writes <folder>/postman_collection.json from <folder>/requests.http. Usage: node tools/make-postman.js <folder> "<collection name>"
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toPostman } from './http-to-postman.js';

const [dir, name = dir] = process.argv.slice(2);
const collection = toPostman(readFileSync(join(dir, 'requests.http'), 'utf8'), name);
writeFileSync(join(dir, 'postman_collection.json'), `${JSON.stringify(collection, null, 2)}\n`);
