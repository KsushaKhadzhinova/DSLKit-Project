import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAll } from './design-gen.js';
import { TOKENS } from './tokens.js';

const OUT = 'site/design/mockups';
rmSync(OUT, { recursive: true, force: true });
const assets = buildAll(TOKENS);
for (const { group, name, svg } of assets) {
  mkdirSync(join(OUT, group), { recursive: true });
  writeFileSync(join(OUT, group, `${name}.svg`), svg);
}
const groups = Object.groupBy(assets, (asset) => asset.group);
const lines = [
  '# Макеты DSLKit',
  '',
  'Файлы создаёт `npm run design:build` из `tools/design-gen.js`. Русский и английский варианты, светлая и тёмная темы.',
  '',
];
for (const [group, items] of Object.entries(groups)) lines.push(`- \`${group}/\`: ${items.length} файлов`);
writeFileSync(join(OUT, 'README.md'), `${lines.join('\n')}\n`);
console.log(`${assets.length} SVG files in ${OUT}`);
