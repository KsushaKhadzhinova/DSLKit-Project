// Checks the relative links and the anchors of the Markdown files: docs/**/*.md and every README*.md of the repository.
// External links (http, https, mailto) are not fetched: the check works without a network.
// Usage: node ci/check-links.mjs [root]
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';

const root = resolve(process.argv[2] || '.');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.claude', '.playwright-mcp', 'generated']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const all = walk(root);
const rel = (f) => relative(root, f).split(sep).join('/');
const files = all.filter((f) => {
  const r = rel(f);
  return f.endsWith('.md') && (r.startsWith('docs/') || /(^|\/)README[^/]*\.md$/i.test(r));
});

// GitHub slug of a heading: lower case, no punctuation, spaces to hyphens.
function slug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/`|\*|_|~/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

function stripCode(text) {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '');
}

const anchorCache = new Map();
function anchors(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const set = new Set();
  const seen = new Map();
  const text = stripCode(readFileSync(file, 'utf8'));
  const add = (base) => {
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    set.add(n ? `${base}-${n}` : base);
  };
  for (const m of text.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) add(slug(m[1]));
  for (const m of text.matchAll(/<a\s+(?:name|id)="([^"]+)"/g)) set.add(m[1]);
  anchorCache.set(file, set);
  return set;
}

const problems = [];
let checked = 0;
for (const file of files) {
  const text = stripCode(readFileSync(file, 'utf8'));
  for (const m of text.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    const target = m[1];
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
    checked += 1;
    const [pathPart, hash] = target.split('#');
    let decoded = pathPart;
    try {
      decoded = decodeURIComponent(pathPart);
    } catch {
      // keep the raw path
    }
    const dest = decoded ? resolve(dirname(file), decoded) : file;
    if (!existsSync(dest)) {
      problems.push(`${rel(file)}: missing file ${target}`);
      continue;
    }
    if (hash && dest.endsWith('.md') && statSync(dest).isFile()) {
      let h = hash;
      try {
        h = decodeURIComponent(hash);
      } catch {
        // keep the raw hash
      }
      if (!anchors(dest).has(h.toLowerCase()) && !/^L\d+/.test(h)) problems.push(`${rel(file)}: missing anchor ${target}`);
    }
  }
}

console.log(`Checked ${checked} relative links in ${files.length} Markdown files.`);
if (problems.length) {
  console.error(`${problems.length} broken links:\n${problems.join('\n')}`);
  process.exit(1);
}
