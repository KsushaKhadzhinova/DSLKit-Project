import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The sources a screenshot of the running application depends on: change one of them and the figures are stale.
export const SOURCES = ['src', 'views', 'public', 'test', 'limits.json'];
const BINARY = /\.(png|ico|jpg|jpeg|gif|webp|woff2?|ttf)$/i;

const walk = (dir, entry) => {
  const full = join(dir, entry);
  if (statSync(full).isFile()) return [entry];
  return readdirSync(full)
    .sort()
    .flatMap((name) => walk(dir, `${entry}/${name}`));
};

// One hash over the paths and the contents (line ends do not count) of the sources of a work folder.
export const sourceHash = (dir, entries = SOURCES) => {
  const hash = createHash('sha256');
  for (const file of entries.flatMap((entry) => walk(dir, entry))) {
    const data = readFileSync(join(dir, file));
    hash.update(file);
    hash.update(BINARY.test(file) ? data : data.toString('utf8').replace(/\r\n/g, '\n'));
  }
  return hash.digest('hex');
};

// The figures are made by shots/shots.mjs, which writes the hash of the sources it used into figures/manifest.json.
export const staleFigures = (dir, readText = (p) => readFileSync(p, 'utf8')) => {
  let manifest;
  try {
    manifest = JSON.parse(readText(join(dir, 'figures/manifest.json')));
  } catch {
    return 'figures/manifest.json is missing or broken: run node shots/shots.mjs in the work folder';
  }
  return manifest.sourceHash === sourceHash(dir)
    ? ''
    : 'The code, the templates or the tests changed after the screenshots were made: run node shots/shots.mjs in the work folder';
};
