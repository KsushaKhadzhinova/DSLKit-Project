// Compares structure of RU and EN pages: ids, data-* attributes, tag counts, duplicate ids, links to missing files.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
const root = process.argv[2] ?? 'E:/DSLKit-Project/site';
const pages = ['index.html', 'app/dashboard.html', 'app/editor.html', 'app/settings.html', 'app/login.html', 'app/register.html', 'app/welcome.html'];
const feats = (h) => ({
  ids: [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]),
  data: [...h.matchAll(/\s(data-[a-z-]+)/g)].map((m) => m[1]),
  tags: Object.fromEntries(['button', 'a', 'input', 'img', 'li', 'section', 'h2', 'h3', 'svg'].map((t) => [t, (h.match(new RegExp('<' + t + '[\s>]', 'g')) ?? []).length])),
});
for (const p of pages) {
  const ru = readFileSync(join(root, p), 'utf8'), en = readFileSync(join(root, 'en', p), 'utf8');
  const a = feats(ru), b = feats(en);
  const dup = (ids) => ids.filter((x, i) => ids.indexOf(x) !== i);
  const sdiff = (x, y) => [...new Set(x)].filter((v) => !y.includes(v));
  console.log(`== ${p}`);
  console.log(' dup ids ru/en:', dup(a.ids), dup(b.ids));
  console.log(' ids only ru:', sdiff(a.ids, b.ids), 'only en:', sdiff(b.ids, a.ids));
  console.log(' data-* only ru:', sdiff(a.data, b.data), 'only en:', sdiff(b.data, a.data));
  for (const t in a.tags) if (a.tags[t] !== b.tags[t]) console.log(` tag <${t}> ru ${a.tags[t]} en ${b.tags[t]}`);
  for (const [name, h, dir] of [['ru', ru, dirname(join(root, p))], ['en', en, dirname(join(root, 'en', p))]])
    for (const m of h.matchAll(/(?:href|src)="([^"#?:]+)(?:[#?][^"]*)?"/g)) { const f = join(dir, m[1]); if (!existsSync(f)) console.log(` dead link ${name}:`, m[1]); }
  const cyr = en.replace(/<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, '').match(/[А-Яа-яЁё]{3,}[А-Яа-яЁё \-]*/g); if (cyr) console.log(' cyrillic in EN html:', [...new Set(cyr)].slice(0, 8));
  const lat = ru.match(/<html lang="([^"]+)"/)?.[1] + '/' + en.match(/<html lang="([^"]+)"/)?.[1]; console.log(' lang', lat);
}
