// Сериализация графа в JSON для трёх представлений: размер, время записи и чтения.
// Запуск: node --expose-gc serialize.mjs
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRaw(n, seed) {
  const r = rng(seed);
  const side = Math.round(Math.sqrt(n) * 90);
  const ids = [], labels = [], xs = [], ys = [], es = [], et = [];
  for (let i = 0; i < n; i++) { ids.push('n' + i); labels.push('Узел ' + i); xs.push(Math.round(r() * side)); ys.push(Math.round(r() * side)); }
  const m = Math.round(n * 1.5);
  for (let e = 0; e < m; e++) { const a = Math.floor(r() * n); let b = Math.floor(r() * n); if (a === b) b = (b + 1) % n; es.push(a); et.push(b); }
  return { ids, labels, xs, ys, es, et };
}

// Строчный JSON (объекты и списки смежности): узлы и рёбра как массивы объектов.
function rowJSON(raw) {
  return JSON.stringify({
    nodes: raw.ids.map((id, i) => ({ id, label: raw.labels[i], x: raw.xs[i], y: raw.ys[i] })),
    edges: raw.es.map((s, e) => ({ s, t: raw.et[e] })),
  });
}
function rowLoad(text) {
  const d = JSON.parse(text);
  const nodes = d.nodes.map((o) => ({ ...o, incoming: [], outgoing: [] }));
  for (const e of d.edges) { const ed = { source: nodes[e.s], target: nodes[e.t] }; ed.source.outgoing.push(ed); ed.target.incoming.push(ed); }
  return nodes.length;
}
// Колоночный JSON (типизированные массивы): по одному массиву на поле.
function colJSON(raw) {
  return JSON.stringify({ id: raw.ids, label: raw.labels, x: raw.xs, y: raw.ys, s: raw.es, t: raw.et });
}
function colLoad(text) {
  const d = JSON.parse(text);
  const x = Float32Array.from(d.x), y = Float32Array.from(d.y), s = Uint32Array.from(d.s), t = Uint32Array.from(d.t);
  return x.length + y.length + s.length + t.length;
}

function med(a) { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; }
const RUNS = 11;
const out = ['n,format,sizeKB,stringifyMs,parseMs'];
for (const n of [500, 2000, 10000, 50000]) {
  const raw = makeRaw(n, 42);
  for (const [name, ser, load] of [['row', rowJSON, rowLoad], ['column', colJSON, colLoad]]) {
    const ts = [], tp = []; let size = 0, sink = 0;
    for (let k = 0; k < RUNS; k++) {
      global.gc?.();
      let t0 = performance.now(); const text = ser(raw); const a = performance.now() - t0;
      t0 = performance.now(); sink += load(text); const b = performance.now() - t0;
      size = Buffer.byteLength(text, 'utf8') / 1024;
      if (k > 0) { ts.push(a); tp.push(b); }
    }
    out.push([n, name, size.toFixed(1), med(ts).toFixed(2), med(tp).toFixed(2)].join(','));
    if (sink < 0) console.log(sink);
  }
}
fs.writeFileSync(path.join(HERE, 'results-serialize.csv'), out.join('\n'));
console.log(out.join('\n'));
