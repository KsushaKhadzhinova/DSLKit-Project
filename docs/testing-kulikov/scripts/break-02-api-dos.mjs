// Server-side cost of one render request and its effect on other requests (single-threaded node). Usage: node break-02-api-dos.mjs [base]
const base = process.argv[2] ?? 'http://localhost:5197';
const graph = (n) =>
  'diagram graph "G"\nmode directed\n' +
  Array.from({ length: n }, (_, i) => `vertex v${i} "N${i}"`).join('\n') +
  '\n' +
  Array.from({ length: n - 1 }, (_, i) => `edge v${i} -> v${i + 1}`).join('\n');
const post = async (path, source) => {
  const t = Date.now();
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source }),
    signal: AbortSignal.timeout(60000),
  }).catch((e) => ({ status: String(e) }));
  return [r.status, Date.now() - t];
};
for (const n of [100, 500, 1000, 2000]) {
  const src = graph(n);
  console.log('render', n, 'nodes, bytes', src.length, await post('/api/render', src));
}
// effect on a concurrent trivial request
const src = graph(1500);
const t0 = Date.now();
const heavy = post('/api/render', src);
await new Promise((r) => setTimeout(r, 20));
const t1 = Date.now();
const light = await fetch(base + '/index.html').then((r) => r.status);
console.log('static request while heavy render runs: waited ms', Date.now() - t1, light);
console.log('heavy', await heavy);
// 100 KB of one-line garbage / of regex-unfriendly text
for (const [name, s] of [
  ['garbage 100KB', 'x'.repeat(100000)],
  ['quotes', 'diagram idef0 "' + '\\"'.repeat(49000) + '"'],
  ['spaces', 'diagram graph' + ' '.repeat(99000) + 'x'],
  ['many dots', 'vertex ' + 'a.'.repeat(49000)],
  ['many lines', 'vertex a\n'.repeat(11000)],
])
  console.log(name, await post('/api/validate', s), await post('/api/render', s));
