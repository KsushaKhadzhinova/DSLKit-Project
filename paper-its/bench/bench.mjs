// Стенд измерений: память и скорость представлений графа, поиск элемента под курсором, отбор видимых.
// Запуск: node --expose-gc bench.mjs [runs]
// Каждое измерение выполняется в отдельном процессе, чтобы куча не зависела от соседних замеров.
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NODE_W = 60, NODE_H = 32;
const VIEW_W = 1600, VIEW_H = 900;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- генерация текста DSL ----------
function genDSL(n, type, seed) {
  const r = rng(seed);
  const side = Math.round(Math.sqrt(n) * 90);
  const lines = ['diagram graph "bench"'];
  const levels = 8;
  const hubs = Math.max(3, Math.round(n / 200));
  const band = new Array(n);
  const centers = [];
  for (let k = 0; k < hubs; k++) centers.push([r() * side, r() * side]);
  for (let i = 0; i < n; i++) {
    let x, y;
    if (type === 'random') { x = r() * side; y = r() * side; band[i] = 0; }
    else if (type === 'hierarchical') {
      const b = i % levels; band[i] = b;
      x = r() * side; y = (b / levels) * side + r() * 20;
    } else { // hubs: неравномерная плотность вокруг центров
      const c = centers[Math.floor(r() * hubs)];
      const rad = side * 0.06 * Math.sqrt(-2 * Math.log(1 - r() * 0.999));
      const ang = r() * 6.283185307;
      x = Math.min(side, Math.max(0, c[0] + rad * Math.cos(ang)));
      y = Math.min(side, Math.max(0, c[1] + rad * Math.sin(ang)));
      band[i] = 0;
    }
    lines.push(`node n${i} "Узел ${i}" pos=${Math.round(x)}x${Math.round(y)}`);
  }
  const m = Math.round(n * 1.5);
  const byBand = [];
  if (type === 'hierarchical') for (let b = 0; b < levels; b++) byBand.push([]);
  if (type === 'hierarchical') for (let i = 0; i < n; i++) byBand[band[i]].push(i);
  for (let e = 0; e < m; e++) {
    let a, b;
    if (type === 'random') { a = Math.floor(r() * n); b = Math.floor(r() * n); }
    else if (type === 'hierarchical') {
      const k = Math.floor(r() * (levels - 1));
      const A = byBand[k], B = byBand[k + 1];
      a = A[Math.floor(r() * A.length)]; b = B[Math.floor(r() * B.length)];
    } else {
      if (r() < 0.7) { a = Math.floor(r() * hubs); b = Math.floor(r() * n); }
      else { a = Math.floor(r() * n); b = Math.floor(r() * n); }
    }
    if (a === b) b = (b + 1) % n;
    lines.push(`n${a} -> n${b}`);
  }
  return lines.join('\n');
}

// ---------- разбор DSL в «сырые» массивы ----------
function parse(text) {
  const ids = [], labels = [], xs = [], ys = [];
  const idx = new Map();
  const es = [], et = [];
  const nodeRe = /^node (\S+) "([^"]*)" pos=(\d+)x(\d+)$/;
  const edgeRe = /^(\S+) -> (\S+)$/;
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    let mt = nodeRe.exec(ln);
    if (mt) { idx.set(mt[1], ids.length); ids.push(mt[1]); labels.push(mt[2]); xs.push(+mt[3]); ys.push(+mt[4]); continue; }
    mt = edgeRe.exec(ln);
    if (mt) { es.push(idx.get(mt[1])); et.push(idx.get(mt[2])); }
  }
  return { ids, labels, xs, ys, es, et };
}

// ---------- три представления ----------
function buildObjects(raw) {
  const nodes = new Array(raw.ids.length);
  for (let i = 0; i < nodes.length; i++)
    nodes[i] = { id: raw.ids[i], label: raw.labels[i], x: raw.xs[i], y: raw.ys[i], w: NODE_W, h: NODE_H, incoming: [], outgoing: [] };
  const edges = new Array(raw.es.length);
  for (let e = 0; e < edges.length; e++) {
    const ed = { id: 'e' + e, source: nodes[raw.es[e]], target: nodes[raw.et[e]], label: '' };
    edges[e] = ed; ed.source.outgoing.push(ed); ed.target.incoming.push(ed);
  }
  return { nodes, edges };
}

function buildAdjacency(raw) {
  const n = raw.ids.length;
  const nodes = new Array(n);
  const out = new Array(n), inn = new Array(n);
  for (let i = 0; i < n; i++) {
    nodes[i] = { id: raw.ids[i], label: raw.labels[i], x: raw.xs[i], y: raw.ys[i], w: NODE_W, h: NODE_H };
    out[i] = []; inn[i] = [];
  }
  const edges = new Array(raw.es.length);
  for (let e = 0; e < edges.length; e++) {
    edges[e] = [raw.es[e], raw.et[e]];
    out[raw.es[e]].push(raw.et[e]); inn[raw.et[e]].push(raw.es[e]);
  }
  return { nodes, out, inn, edges };
}

function buildTyped(raw) {
  const n = raw.ids.length, m = raw.es.length;
  const x = new Float32Array(raw.xs), y = new Float32Array(raw.ys);
  const w = new Float32Array(n).fill(NODE_W), h = new Float32Array(n).fill(NODE_H);
  const src = Uint32Array.from(raw.es), dst = Uint32Array.from(raw.et);
  const outOff = new Uint32Array(n + 1), inOff = new Uint32Array(n + 1);
  for (let e = 0; e < m; e++) { outOff[src[e] + 1]++; inOff[dst[e] + 1]++; }
  for (let i = 0; i < n; i++) { outOff[i + 1] += outOff[i]; inOff[i + 1] += inOff[i]; }
  const outT = new Uint32Array(m), inT = new Uint32Array(m);
  const oc = outOff.slice(0, n), ic = inOff.slice(0, n);
  for (let e = 0; e < m; e++) { outT[oc[src[e]]++] = dst[e]; inT[ic[dst[e]]++] = src[e]; }
  return { n, x, y, w, h, labels: raw.labels, ids: raw.ids, src, dst, outOff, outT, inOff, inT };
}

// ---------- обход графа (DFS по всем компонентам) ----------
function traverseObjects(g) {
  const seen = new Set(); let touched = 0;
  const stack = [];
  for (const s of g.nodes) {
    if (seen.has(s)) continue;
    seen.add(s); stack.push(s);
    while (stack.length) {
      const v = stack.pop();
      for (const e of v.outgoing) { touched++; if (!seen.has(e.target)) { seen.add(e.target); stack.push(e.target); } }
    }
  }
  return touched;
}
function traverseAdjacency(g) {
  const n = g.nodes.length, seen = new Uint8Array(n); let touched = 0; const stack = [];
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue; seen[s] = 1; stack.push(s);
    while (stack.length) {
      const v = stack.pop(); const list = g.out[v];
      for (let k = 0; k < list.length; k++) { touched++; const t = list[k]; if (!seen[t]) { seen[t] = 1; stack.push(t); } }
    }
  }
  return touched;
}
function traverseTyped(g) {
  const n = g.n, seen = new Uint8Array(n), stack = new Uint32Array(n); let touched = 0, sp = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue; seen[s] = 1; stack[sp++] = s;
    while (sp) {
      const v = stack[--sp];
      for (let k = g.outOff[v]; k < g.outOff[v + 1]; k++) { touched++; const t = g.outT[k]; if (!seen[t]) { seen[t] = 1; stack[sp++] = t; } }
    }
  }
  return touched;
}

// ---------- пространственные индексы (по типизированным массивам) ----------
function buildGrid(g, cell = 120) {
  let maxX = 0, maxY = 0;
  for (let i = 0; i < g.n; i++) { maxX = Math.max(maxX, g.x[i] + g.w[i]); maxY = Math.max(maxY, g.y[i] + g.h[i]); }
  const cols = Math.floor(maxX / cell) + 1, rows = Math.floor(maxY / cell) + 1;
  const cells = new Array(cols * rows);
  for (let i = 0; i < g.n; i++) {
    const c0 = Math.floor(g.x[i] / cell), c1 = Math.floor((g.x[i] + g.w[i]) / cell);
    const r0 = Math.floor(g.y[i] / cell), r1 = Math.floor((g.y[i] + g.h[i]) / cell);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const k = r * cols + c; (cells[k] || (cells[k] = [])).push(i); }
  }
  return { cell, cols, rows, cells };
}
function gridPoint(g, ix, px, py) {
  const c = Math.floor(px / ix.cell), r = Math.floor(py / ix.cell);
  if (c < 0 || r < 0 || c >= ix.cols || r >= ix.rows) return -1;
  const list = ix.cells[r * ix.cols + c]; let hit = -1;
  if (!list) return -1;
  for (let k = 0; k < list.length; k++) { const i = list[k]; if (px >= g.x[i] && px <= g.x[i] + g.w[i] && py >= g.y[i] && py <= g.y[i] + g.h[i]) hit = i; }
  return hit;
}
function gridRange(g, ix, x0, y0, x1, y1, stamp, qid) {
  const c0 = Math.max(0, Math.floor(x0 / ix.cell)), c1 = Math.min(ix.cols - 1, Math.floor(x1 / ix.cell));
  const r0 = Math.max(0, Math.floor(y0 / ix.cell)), r1 = Math.min(ix.rows - 1, Math.floor(y1 / ix.cell));
  let count = 0;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const list = ix.cells[r * ix.cols + c]; if (!list) continue;
    for (let k = 0; k < list.length; k++) {
      const i = list[k]; if (stamp[i] === qid) continue; stamp[i] = qid;
      if (g.x[i] <= x1 && g.x[i] + g.w[i] >= x0 && g.y[i] <= y1 && g.y[i] + g.h[i] >= y0) count++;
    }
  }
  return count;
}

const QT_CAP = 8, QT_DEPTH = 12;
function qtNode(x0, y0, x1, y1) { return { x0, y0, x1, y1, items: [], kids: null }; }
function qtInsert(g, nd, i, depth) {
  if (g.x[i] > nd.x1 || g.x[i] + g.w[i] < nd.x0 || g.y[i] > nd.y1 || g.y[i] + g.h[i] < nd.y0) return;
  if (nd.kids) { for (const k of nd.kids) qtInsert(g, k, i, depth + 1); return; }
  nd.items.push(i);
  if (nd.items.length > QT_CAP && depth < QT_DEPTH) {
    const mx = (nd.x0 + nd.x1) / 2, my = (nd.y0 + nd.y1) / 2;
    nd.kids = [qtNode(nd.x0, nd.y0, mx, my), qtNode(mx, nd.y0, nd.x1, my), qtNode(nd.x0, my, mx, nd.y1), qtNode(mx, my, nd.x1, nd.y1)];
    const items = nd.items; nd.items = null;
    for (const j of items) for (const k of nd.kids) qtInsert(g, k, j, depth + 1);
  }
}
function buildQuadtree(g) {
  let maxX = 1, maxY = 1;
  for (let i = 0; i < g.n; i++) { maxX = Math.max(maxX, g.x[i] + g.w[i]); maxY = Math.max(maxY, g.y[i] + g.h[i]); }
  const root = qtNode(0, 0, maxX, maxY);
  for (let i = 0; i < g.n; i++) qtInsert(g, root, i, 0);
  return root;
}
function qtPoint(g, nd, px, py) {
  if (px < nd.x0 || px > nd.x1 || py < nd.y0 || py > nd.y1) return -1;
  if (!nd.kids) {
    let hit = -1;
    for (let k = 0; k < nd.items.length; k++) { const i = nd.items[k]; if (px >= g.x[i] && px <= g.x[i] + g.w[i] && py >= g.y[i] && py <= g.y[i] + g.h[i]) hit = i; }
    return hit;
  }
  let hit = -1;
  for (const k of nd.kids) { const r = qtPoint(g, k, px, py); if (r >= 0) hit = r; }
  return hit;
}
function qtRange(g, nd, x0, y0, x1, y1, stamp, qid) {
  if (x0 > nd.x1 || x1 < nd.x0 || y0 > nd.y1 || y1 < nd.y0) return 0;
  if (!nd.kids) {
    let count = 0;
    for (let k = 0; k < nd.items.length; k++) {
      const i = nd.items[k]; if (stamp[i] === qid) continue; stamp[i] = qid;
      if (g.x[i] <= x1 && g.x[i] + g.w[i] >= x0 && g.y[i] <= y1 && g.y[i] + g.h[i] >= y0) count++;
    }
    return count;
  }
  let c = 0; for (const k of nd.kids) c += qtRange(g, k, x0, y0, x1, y1, stamp, qid); return c;
}

// ---------- перебор ----------
function bruteObjPoint(nodes, px, py) {
  let hit = null;
  for (let k = 0; k < nodes.length; k++) { const nd = nodes[k]; if (px >= nd.x && px <= nd.x + nd.w && py >= nd.y && py <= nd.y + nd.h) hit = nd; }
  return hit;
}
function bruteObjRange(nodes, x0, y0, x1, y1) {
  let c = 0;
  for (let k = 0; k < nodes.length; k++) { const nd = nodes[k]; if (nd.x <= x1 && nd.x + nd.w >= x0 && nd.y <= y1 && nd.y + nd.h >= y0) c++; }
  return c;
}
function bruteTypedPoint(g, px, py) {
  let hit = -1;
  for (let i = 0; i < g.n; i++) if (px >= g.x[i] && px <= g.x[i] + g.w[i] && py >= g.y[i] && py <= g.y[i] + g.h[i]) hit = i;
  return hit;
}
function bruteTypedRange(g, x0, y0, x1, y1) {
  let c = 0;
  for (let i = 0; i < g.n; i++) if (g.x[i] <= x1 && g.x[i] + g.w[i] >= x0 && g.y[i] <= y1 && g.y[i] + g.h[i] >= y0) c++;
  return c;
}

// ---------- запросы ----------
function makeQueries(raw, seed) {
  const r = rng(seed ^ 0x9e3779b9);
  const n = raw.xs.length;
  let maxX = 1, maxY = 1;
  for (let i = 0; i < n; i++) { maxX = Math.max(maxX, raw.xs[i] + NODE_W); maxY = Math.max(maxY, raw.ys[i] + NODE_H); }
  const pts = [];
  for (let q = 0; q < 1000; q++) {
    if (q % 2 === 0) { const i = Math.floor(r() * n); pts.push([raw.xs[i] + r() * NODE_W, raw.ys[i] + r() * NODE_H]); }
    else pts.push([r() * maxX, r() * maxY]);
  }
  const views = [];
  for (let q = 0; q < 200; q++) { const vx = r() * Math.max(1, maxX - VIEW_W), vy = r() * Math.max(1, maxY - VIEW_H); views.push([vx, vy, vx + VIEW_W, vy + VIEW_H]); }
  return { pts, views };
}
function pct(a, p) { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
function timePoints(fn, pts) {
  for (let q = 0; q < 200; q++) fn(pts[q % pts.length][0], pts[q % pts.length][1]);
  const ts = new Array(pts.length); let sink = 0;
  for (let q = 0; q < pts.length; q++) {
    const t0 = performance.now(); const r = fn(pts[q][0], pts[q][1]); ts[q] = (performance.now() - t0) * 1000; sink += r ? 1 : 0;
  }
  return { med: pct(ts, 0.5), p95: pct(ts, 0.95), sink };
}
function timeViews(fn, views) {
  for (let q = 0; q < 20; q++) fn(views[q][0], views[q][1], views[q][2], views[q][3], q + 1);
  const ts = new Array(views.length); let sink = 0;
  for (let q = 0; q < views.length; q++) {
    const t0 = performance.now(); const c = fn(views[q][0], views[q][1], views[q][2], views[q][3], 1000 + q); ts[q] = (performance.now() - t0) * 1000; sink += c;
  }
  return { med: pct(ts, 0.5), sink, avgVisible: sink / views.length };
}

// ---------- один замер в дочернем процессе ----------
function memNow() { global.gc(); global.gc(); const m = process.memoryUsage(); return m.heapUsed + m.arrayBuffers; }

function child(rep, type, n, seed) {
  const dsl = genDSL(n, type, seed);
  const t0 = performance.now(); const raw = parse(dsl); const tParse = performance.now() - t0;
  const queries = makeQueries(raw, seed);
  const m0 = memNow();
  const t1 = performance.now();
  const g = rep === 'objects' ? buildObjects(raw) : rep === 'adjacency' ? buildAdjacency(raw) : buildTyped(raw);
  const tBuild = performance.now() - t1;
  const m1 = memNow();
  const t2 = performance.now();
  const touched = rep === 'objects' ? traverseObjects(g) : rep === 'adjacency' ? traverseAdjacency(g) : traverseTyped(g);
  const tTraverse = performance.now() - t2;
  const out = { rep, type, n, edges: raw.es.length, memMB: (m1 - m0) / 1048576, tParse, tBuild, tTraverse, touched, dslKB: dsl.length / 1024, methods: [] };
  const nodes = g.nodes;
  if (rep === 'objects' || rep === 'adjacency') {
    const p = timePoints((x, y) => bruteObjPoint(nodes, x, y), queries.pts);
    const v = timeViews((x0, y0, x1, y1) => bruteObjRange(nodes, x0, y0, x1, y1), queries.views);
    out.methods.push({ method: 'brute', tIndex: 0, hitMedUs: p.med, hitP95Us: p.p95, cullMedUs: v.med, avgVisible: v.avgVisible });
  } else {
    const p = timePoints((x, y) => bruteTypedPoint(g, x, y), queries.pts);
    const v = timeViews((x0, y0, x1, y1) => bruteTypedRange(g, x0, y0, x1, y1), queries.views);
    out.methods.push({ method: 'brute', tIndex: 0, hitMedUs: p.med, hitP95Us: p.p95, cullMedUs: v.med, avgVisible: v.avgVisible });
    const stamp = new Int32Array(g.n);
    let ta = performance.now(); const grid = buildGrid(g); ta = performance.now() - ta;
    const pg = timePoints((x, y) => gridPoint(g, grid, x, y), queries.pts);
    const vg = timeViews((x0, y0, x1, y1, q) => gridRange(g, grid, x0, y0, x1, y1, stamp, q), queries.views);
    out.methods.push({ method: 'grid', tIndex: ta, hitMedUs: pg.med, hitP95Us: pg.p95, cullMedUs: vg.med, avgVisible: vg.avgVisible });
    let tq = performance.now(); const qt = buildQuadtree(g); tq = performance.now() - tq;
    stamp.fill(0);
    const pq = timePoints((x, y) => qtPoint(g, qt, x, y), queries.pts);
    const vq = timeViews((x0, y0, x1, y1, q) => qtRange(g, qt, x0, y0, x1, y1, stamp, q), queries.views);
    out.methods.push({ method: 'quadtree', tIndex: tq, hitMedUs: pq.med, hitP95Us: pq.p95, cullMedUs: vq.med, avgVisible: vq.avgVisible });
  }
  process.stdout.write(JSON.stringify(out) + '\n');
}

// ---------- проверка корректности индексов (один раз) ----------
function selfCheck() {
  const raw = parse(genDSL(3000, 'hubs', 7));
  const g = buildTyped(raw), grid = buildGrid(g), qt = buildQuadtree(g), q = makeQueries(raw, 7);
  const stamp = new Int32Array(g.n);
  for (const [x, y] of q.pts) {
    const a = bruteTypedPoint(g, x, y), b = gridPoint(g, grid, x, y), c = qtPoint(g, qt, x, y);
    if (a !== b || a !== c) throw new Error(`hit mismatch ${a} ${b} ${c}`);
  }
  q.views.forEach((v, k) => {
    const a = bruteTypedRange(g, v[0], v[1], v[2], v[3]);
    const b = gridRange(g, grid, v[0], v[1], v[2], v[3], stamp, 10 + k * 2);
    const c = qtRange(g, qt, v[0], v[1], v[2], v[3], stamp, 11 + k * 2);
    if (a !== b || a !== c) throw new Error(`range mismatch ${a} ${b} ${c}`);
  });
  const ga = traverseObjects(buildObjects(raw)), gb = traverseAdjacency(buildAdjacency(raw)), gc = traverseTyped(g);
  if (ga !== gb || ga !== gc) throw new Error(`traverse mismatch ${ga} ${gb} ${gc}`);
  console.log('selfCheck OK');
}

// ---------- оркестратор ----------
function main() {
  const runs = +(process.argv[2] || 11);
  selfCheck();
  const sizes = [500, 2000, 10000, 50000], types = ['random', 'hierarchical', 'hubs'], reps = ['objects', 'adjacency', 'typed'];
  const rows = [];
  let done = 0; const total = sizes.length * types.length * reps.length * runs;
  for (const n of sizes) for (const type of types) for (const rep of reps) for (let run = 0; run < runs; run++) {
    const res = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), 'child', rep, type, String(n), '42'], { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (res.status !== 0) throw new Error(`child failed: ${res.stderr}`);
    const o = JSON.parse(res.stdout.trim()); o.run = run; rows.push(o);
    if (++done % 40 === 0) console.log(`${done}/${total}`);
  }
  fs.writeFileSync(path.join(HERE, 'results.json'), JSON.stringify(rows));
  const csv = ['rep,type,n,edges,run,memMB,tParseMs,tBuildMs,tTraverseMs,method,tIndexMs,hitMedUs,hitP95Us,cullMedUs,avgVisible'];
  for (const o of rows) for (const m of o.methods)
    csv.push([o.rep, o.type, o.n, o.edges, o.run, o.memMB.toFixed(3), o.tParse.toFixed(3), o.tBuild.toFixed(3), o.tTraverse.toFixed(3), m.method, m.tIndex.toFixed(3), m.hitMedUs.toFixed(3), m.hitP95Us.toFixed(3), m.cullMedUs.toFixed(3), m.avgVisible.toFixed(1)].join(','));
  fs.writeFileSync(path.join(HERE, 'results.csv'), csv.join('\n'));
  const cpu = os.cpus();
  fs.writeFileSync(path.join(HERE, 'env.json'), JSON.stringify({ node: process.version, v8: process.versions.v8, os: `${os.type()} ${os.release()}`, cpu: cpu[0].model, cores: cpu.length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1), runs, discardedFirst: true, seed: 42 }, null, 1));
  console.log('done');
}

if (process.argv[2] === 'child') child(process.argv[3], process.argv[4], +process.argv[5], +process.argv[6]);
else main();
