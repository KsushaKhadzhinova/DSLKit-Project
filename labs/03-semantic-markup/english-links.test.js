import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';

const SITE = resolve('site');
const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));

// A visitor of the English site must not land on a Russian page unless they press the language switch.
test('pages of the English site link only to English pages, except the language switch', () => {
  const stray = [];
  for (const file of walk(join(SITE, 'en')).filter((name) => name.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    for (const [, tag] of html.matchAll(/<a\b([^>]*)>/g)) {
      const href = /\bhref="([^"#?]*)/.exec(tag)?.[1];
      if (!href || /^(https?:|mailto:)/.test(href) || /hreflang="ru"/.test(tag)) continue;
      const target = resolve(dirname(file), href);
      if (!relative(join(SITE, 'en'), target).startsWith('..')) continue;
      stray.push(`${relative(SITE, file)} -> ${href}`);
    }
  }
  assert.deepEqual(stray, []);
});
