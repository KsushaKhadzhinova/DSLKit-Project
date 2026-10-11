import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assets } from './figma-assets.js';

const dir = process.argv[2];
mkdirSync(dir, { recursive: true });
for (const [name, svg] of Object.entries(assets())) writeFileSync(join(dir, name), svg);
