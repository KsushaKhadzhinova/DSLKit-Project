'use strict';
// Измерение отрисовки больших графов в браузере: SVG, Canvas, Canvas с отсечением (перебор и сетка), Canvas с уровнями детализации.
// Результаты: window.__rows (FPS) и window.__ff (время до первого кадра). Запуск: runAll({...}).
const W = 800, H = 500, DPR = window.devicePixelRatio || 1, NW = 60, NH = 32, CELL = 120, LODK = 3000, BATCH = 300;
const stage = document.getElementById('stage');
const logEl = document.getElementById('log');
function log(s) { logEl.textContent = s + '\n' + logEl.textContent.slice(0, 2000); window.__status = s; }

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function gen(n, type, seed) {
  const r = rng(seed), side = Math.round(Math.sqrt(n) * 90), levels = 8, hubs = Math.max(3, Math.round(n / 200));
  const x = new Float32Array(n), y = new Float32Array(n), band = new Uint8Array(n), centers = [];
  for (let k = 0; k < hubs; k++) centers.push([r() * side, r() * side]);
  for (let i = 0; i < n; i++) {
    if (type === 'random') { x[i] = r() * side; y[i] = r() * side; }
    else if (type === 'hierarchical') { const b = i % levels; band[i] = b; x[i] = r() * side; y[i] = (b / levels) * side + r() * 20; }
    else { const c = centers[Math.floor(r() * hubs)], rad = side * 0.06 * Math.sqrt(-2 * Math.log(1 - r() * 0.999)), ang = r() * 6.283185307; x[i] = Math.min(side, Math.max(0, c[0] + rad * Math.cos(ang))); y[i] = Math.min(side, Math.max(0, c[1] + rad * Math.sin(ang))); }
  }
  const m = Math.round(n * 1.5), es = new Uint32Array(m), et = new Uint32Array(m);
  const byBand = []; if (type === 'hierarchical') { for (let b = 0; b < levels; b++) byBand.push([]); for (let i = 0; i < n; i++) byBand[band[i]].push(i); }
  for (let e = 0; e < m; e++) {
    let a, b;
    if (type === 'random') { a = Math.floor(r() * n); b = Math.floor(r() * n); }
    else if (type === 'hierarchical') { const k = Math.floor(r() * (levels - 1)), A = byBand[k], B = byBand[k + 1]; a = A[Math.floor(r() * A.length)]; b = B[Math.floor(r() * B.length)]; }
    else if (r() < 0.7) { a = Math.floor(r() * hubs); b = Math.floor(r() * n); } else { a = Math.floor(r() * n); b = Math.floor(r() * n); }
    if (a === b) b = (b + 1) % n; es[e] = a; et[e] = b;
  }
  const g = { n, m, x, y, es, et, side };
  const outOff = new Uint32Array(n + 1), deg = new Uint32Array(n);
  for (let e = 0; e < m; e++) { outOff[es[e] + 1]++; deg[es[e]]++; deg[et[e]]++; }
  for (let i = 0; i < n; i++) outOff[i + 1] += outOff[i];
  const outT = new Uint32Array(m), oc = outOff.slice(0, n);
  for (let e = 0; e < m; e++) outT[oc[es[e]]++] = et[e];
  g.outOff = outOff; g.outT = outT; g.deg = deg;
  return g;
}

// индексы и приоритет
function buildRank(g) {
  const idx = Array.from({ length: g.n }, (_, i) => i); idx.sort((a, b) => g.deg[b] - g.deg[a]);
  const rank = new Int32Array(g.n); for (let k = 0; k < g.n; k++) rank[idx[k]] = k;
  g.rank = rank; g.order = Int32Array.from(idx);
}
function buildGrid(g) {
  let maxX = 0, maxY = 0; for (let i = 0; i < g.n; i++) { if (g.x[i] + NW > maxX) maxX = g.x[i] + NW; if (g.y[i] + NH > maxY) maxY = g.y[i] + NH; }
  const cols = Math.floor(maxX / CELL) + 1, rows = Math.floor(maxY / CELL) + 1, cells = new Array(cols * rows);
  for (let i = 0; i < g.n; i++) {
    const c0 = Math.floor(g.x[i] / CELL), c1 = Math.floor((g.x[i] + NW) / CELL), r0 = Math.floor(g.y[i] / CELL), r1 = Math.floor((g.y[i] + NH) / CELL);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const k = r * cols + c; (cells[k] || (cells[k] = [])).push(i); }
  }
  g.grid = { cols, rows, cells, stamp: new Int32Array(g.n), qid: 0, out: new Int32Array(g.n) };
}
function gridCells(g, i) { const c0 = Math.floor(g.x[i] / CELL), c1 = Math.floor((g.x[i] + NW) / CELL), r0 = Math.floor(g.y[i] / CELL), r1 = Math.floor((g.y[i] + NH) / CELL), ks = []; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) ks.push(r * g.grid.cols + c); return ks; }
function gridMove(g, i, nx, ny) {
  for (const k of gridCells(g, i)) { const l = g.grid.cells[k]; if (l) { const p = l.indexOf(i); if (p >= 0) l.splice(p, 1); } }
  g.x[i] = nx; g.y[i] = ny;
  for (const k of gridCells(g, i)) { if (k >= 0 && k < g.grid.cells.length) (g.grid.cells[k] || (g.grid.cells[k] = [])).push(i); }
}
function visGrid(g, x0, y0, x1, y1, rankMax) {
  const G = g.grid, c0 = Math.max(0, Math.floor(x0 / CELL)), c1 = Math.min(G.cols - 1, Math.floor(x1 / CELL)), r0 = Math.max(0, Math.floor(y0 / CELL)), r1 = Math.min(G.rows - 1, Math.floor(y1 / CELL));
  const q = ++G.qid; let cnt = 0;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const l = G.cells[r * G.cols + c]; if (!l) continue; for (let k = 0; k < l.length; k++) { const i = l[k]; if (G.stamp[i] === q) continue; G.stamp[i] = q; if (rankMax !== undefined && g.rank[i] >= rankMax) continue; if (g.x[i] <= x1 && g.x[i] + NW >= x0 && g.y[i] <= y1 && g.y[i] + NH >= y0) G.out[cnt++] = i; } }
  return cnt;
}
function visBrute(g, x0, y0, x1, y1) { const o = g.grid ? g.grid.out : (g._out || (g._out = new Int32Array(g.n))); let cnt = 0; for (let i = 0; i < g.n; i++) if (g.x[i] <= x1 && g.x[i] + NW >= x0 && g.y[i] <= y1 && g.y[i] + NH >= y0) o[cnt++] = i; g._outRef = o; return cnt; }

function viewFor(g, mode) {
  if (mode === 'fit') { const s = Math.min(W, H) / g.side; return { s, vx: 0, vy: 0 }; }
  return { s: 1, vx: g.side / 2 - W / 2, vy: g.side / 2 - H / 2 };
}

// ---------- Canvas ----------
function makeCanvas() {
  stage.innerHTML = ''; const c = document.createElement('canvas'); c.width = W * DPR; c.height = H * DPR; c.style.width = W + 'px'; c.style.height = H + 'px'; stage.appendChild(c);
  return c.getContext('2d');
}
function canvasFrame(ctx, g, mode, v) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W * DPR, H * DPR);
  const s = v.s, x0 = v.vx, y0 = v.vy, x1 = v.vx + W / s, y1 = v.vy + H / s;
  ctx.setTransform(DPR * s, 0, 0, DPR * s, -DPR * s * v.vx, -DPR * s * v.vy);
  ctx.lineWidth = 1 / s; ctx.strokeStyle = '#888'; ctx.fillStyle = '#fff';
  let list, cnt, rm;
  if (mode === 'full') { list = null; cnt = g.n; }
  else if (mode === 'brute') { cnt = visBrute(g, x0, y0, x1, y1); list = g._outRef; }
  else if (mode === 'grid') { cnt = visGrid(g, x0, y0, x1, y1); list = g.grid.out; }
  else { rm = LODK; cnt = visGrid(g, x0, y0, x1, y1, rm); list = g.grid.out; }
  ctx.beginPath();
  for (let k = 0; k < cnt; k++) { const i = list ? list[k] : k; for (let q = g.outOff[i]; q < g.outOff[i + 1]; q++) { const j = g.outT[q]; if (rm !== undefined && g.rank[j] >= rm) continue; ctx.moveTo(g.x[i] + NW / 2, g.y[i] + NH / 2); ctx.lineTo(g.x[j] + NW / 2, g.y[j] + NH / 2); } }
  ctx.stroke();
  ctx.strokeStyle = '#000'; ctx.beginPath();
  for (let k = 0; k < cnt; k++) { const i = list ? list[k] : k; ctx.rect(g.x[i], g.y[i], NW, NH); }
  ctx.fill(); ctx.stroke();
  return cnt;
}

// ---------- SVG ----------
function svgBuild(g, v) {
  const parts = ['<g id="world" transform="scale(' + v.s + ') translate(' + (-v.vx) + ',' + (-v.vy) + ')" stroke-width="1">'];
  for (let e = 0; e < g.m; e++) { const a = g.es[e], b = g.et[e]; parts.push('<line x1="' + (g.x[a] + 30).toFixed(1) + '" y1="' + (g.y[a] + 16).toFixed(1) + '" x2="' + (g.x[b] + 30).toFixed(1) + '" y2="' + (g.y[b] + 16).toFixed(1) + '" stroke="#888"/>'); }
  for (let i = 0; i < g.n; i++) parts.push('<rect x="' + g.x[i].toFixed(1) + '" y="' + g.y[i].toFixed(1) + '" width="60" height="32" fill="#fff" stroke="#000"/>');
  parts.push('</g>');
  stage.innerHTML = ''; const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.innerHTML = parts.join(''); stage.appendChild(svg);
  return svg.firstChild;
}

const raf = () => new Promise(r => requestAnimationFrame(r));
const raf2 = async () => { await raf(); await raf(); };

// ---------- первый кадр ----------
async function firstFrame(g, config, viewMode) {
  const v = viewFor(g, viewMode), t0 = performance.now(); let tIndex = 0, tFirst, tTotal, drawn = null;
  if (config === 'svg') { svgBuild(g, v); await raf2(); tFirst = tTotal = performance.now() - t0; drawn = g.n + g.m; }
  else if (config === 'canvas') { const ctx = makeCanvas(); drawn = canvasFrame(ctx, g, 'full', v); await raf2(); tFirst = tTotal = performance.now() - t0; }
  else if (config === 'cull-brute') { const ctx = makeCanvas(); drawn = canvasFrame(ctx, g, 'brute', v); await raf2(); tFirst = tTotal = performance.now() - t0; }
  else if (config === 'cull-grid' || config === 'lod') {
    const ctx = makeCanvas(); const ti = performance.now(); g.grid = null; buildGrid(g); if (config === 'lod') buildRank(g); tIndex = performance.now() - ti;
    drawn = canvasFrame(ctx, g, config === 'lod' ? 'lod' : 'grid', v); await raf2(); tFirst = tTotal = performance.now() - t0;
  } else if (config === 'progressive') {
    const ctx = makeCanvas(); const ti = performance.now(); g.grid = null; buildGrid(g); buildRank(g); tIndex = performance.now() - ti;
    const cnt = visGrid(g, v.vx, v.vy, v.vx + W / v.s, v.vy + H / v.s); const vis = Array.from(g.grid.out.subarray(0, cnt)).sort((a, b) => g.rank[a] - g.rank[b]);
    ctx.setTransform(DPR * v.s, 0, 0, DPR * v.s, -DPR * v.s * v.vx, -DPR * v.s * v.vy); ctx.lineWidth = 1 / v.s; ctx.fillStyle = '#fff';
    let pos = 0, first = null, t20 = null;
    await new Promise(res => {
      function frame() {
        const end = Math.min(vis.length, pos + BATCH);
        ctx.strokeStyle = '#888'; ctx.beginPath();
        for (let k = pos; k < end; k++) { const i = vis[k]; for (let q = g.outOff[i]; q < g.outOff[i + 1]; q++) { const j = g.outT[q]; ctx.moveTo(g.x[i] + 30, g.y[i] + 16); ctx.lineTo(g.x[j] + 30, g.y[j] + 16); } }
        ctx.stroke(); ctx.strokeStyle = '#000'; ctx.beginPath(); for (let k = pos; k < end; k++) ctx.rect(g.x[vis[k]], g.y[vis[k]], NW, NH); ctx.fill(); ctx.stroke();
        pos = end;
        if (first === null) requestAnimationFrame(() => { first = performance.now() - t0; });
        if (t20 === null && pos >= 0.2 * vis.length) t20 = performance.now() - t0;
        if (pos < vis.length) requestAnimationFrame(frame); else requestAnimationFrame(() => { tTotal = performance.now() - t0; res(); });
      }
      requestAnimationFrame(frame);
    });
    tFirst = first; drawn = vis.length; g._t20 = t20;
  }
  return { tIndex, tFirst, tTotal, drawn, t20: g._t20 || null };
}

// ---------- FPS при взаимодействии ----------
const WARM = 5;
function runFrames(duration, minFrames, step) {
  return new Promise(res => {
    let start = null, last = null, n = 0, m = 0; const ft = [];
    function f(ts) {
      if (n === WARM) { start = ts; last = ts; }
      else if (n > WARM) { ft.push(ts - last); last = ts; }
      step(start === null ? 0 : ts - start, n); n++;
      if (n > WARM) m++;
      const el = start === null ? 0 : ts - start;
      if ((n <= WARM || el < duration || m < minFrames) && el < 30000) requestAnimationFrame(f);
      else { ft.sort((a, b) => a - b); res({ fps: el > 0 ? (m - 1) / (el / 1000) : 0, med: ft.length ? ft[Math.floor(ft.length / 2)] : 0, p95: ft.length ? ft[Math.min(ft.length - 1, Math.floor(0.95 * ft.length))] : 0, frames: m }); }
    }
    requestAnimationFrame(f);
  });
}

async function scenarios(g, config, viewMode, reps, dur) {
  const rows = []; const v0 = viewFor(g, viewMode);
  let svgWorld = null, ctx = null, mode = null, svgEls = null;
  if (config === 'svg') { svgWorld = svgBuild(g, v0); svgEls = svgWorld.children; }
  else { ctx = makeCanvas(); mode = { canvas: 'full', 'cull-brute': 'brute', 'cull-grid': 'grid', lod: 'lod' }[config]; if (mode === 'grid' || mode === 'lod') { g.grid = null; buildGrid(g); if (mode === 'lod') buildRank(g); } else if (mode === 'brute') { g.grid = null; } }
  await raf2();
  // узел для перетаскивания: ближайший к центру окна
  let d = 0, best = 1e18; const cx = v0.vx + W / v0.s / 2, cy = v0.vy + H / v0.s / 2;
  for (let i = 0; i < g.n; i++) { const dd = (g.x[i] - cx) ** 2 + (g.y[i] - cy) ** 2; if (dd < best) { best = dd; d = i; } }
  const inc = []; if (config === 'svg') for (let e = 0; e < g.m; e++) if (g.es[e] === d || g.et[e] === d) inc.push(e);
  const dx0 = g.x[d], dy0 = g.y[d];
  const render = (v) => { if (config === 'svg') svgWorld.setAttribute('transform', 'scale(' + v.s + ') translate(' + (-v.vx) + ',' + (-v.vy) + ')'); else return canvasFrame(ctx, g, mode, v); };
  for (const sc of ['pan', 'zoom', 'drag']) {
    for (let r = 0; r < reps; r++) {
      let drawn = null;
      const res = await runFrames(dur, 3, (t) => {
        let v = { s: v0.s, vx: v0.vx, vy: v0.vy };
        if (sc === 'pan') { v.vx = v0.vx + (t / 1000) * 120 / v0.s; }
        else if (sc === 'zoom') { v.s = v0.s * (1 + 0.15 * Math.sin(t / 250)); v.vx = v0.vx + (W / v0.s - W / v.s) / 2; v.vy = v0.vy + (H / v0.s - H / v.s) / 2; }
        else { const nx = dx0 + 40 * Math.sin(t / 200), ny = dy0 + 40 * Math.cos(t / 200); if (config === 'svg') { const el = svgEls[g.m + d]; el.setAttribute('x', nx); el.setAttribute('y', ny); for (const e of inc) { const ln = svgEls[e]; if (g.es[e] === d) { ln.setAttribute('x1', nx + 30); ln.setAttribute('y1', ny + 16); } else { ln.setAttribute('x2', nx + 30); ln.setAttribute('y2', ny + 16); } } } else if (g.grid) gridMove(g, d, nx, ny); else { g.x[d] = nx; g.y[d] = ny; } }
        drawn = render(v);
      });
      rows.push({ config, n: g.n, view: viewMode, scenario: sc, run: r, fps: res.fps, medMs: res.med, p95Ms: res.p95, frames: res.frames, drawn });
    }
    g.x[d] = dx0; g.y[d] = dy0; if (g.grid) { g.grid = null; buildGrid(g); }
  }
  return rows;
}

window.__rows = []; window.__ff = [];
window.runAll = async function (opt) {
  const o = Object.assign({ sizes: [500, 2000, 10000, 50000], configs: ['svg', 'canvas', 'cull-brute', 'cull-grid', 'lod'], views: ['fit', 'z100'], types: ['random'], reps: 3, dur: 1200, svgMax: 50000, ffReps: 3 }, opt || {});
  window.__done = false; window.__meta = { dpr: DPR, w: W, h: H, ua: navigator.userAgent, cores: navigator.hardwareConcurrency, opt: o };
  for (const type of o.types) for (const n of o.sizes) {
    const g = gen(n, type, 42);
    for (const view of o.views) for (const config of o.configs.concat(['progressive'])) {
      if (config === 'svg' && n > o.svgMax) continue;
      if (config === 'progressive' && type !== o.types[0]) continue;
      const heavy = config === 'svg' && n >= 50000;
      log(type + ' n=' + n + ' ' + view + ' ' + config);
      const ffN = heavy ? 1 : o.ffReps;
      for (let r = 0; r < ffN; r++) { g.x.set(gen(n, type, 42).x); const f = await firstFrame(g, config, view); window.__ff.push(Object.assign({ type, n, view, config, run: r }, f)); }
      if (config === 'progressive') continue;
      const rows = await scenarios(g, config, view, heavy ? 1 : o.reps, o.dur);
      for (const row of rows) { row.type = type; window.__rows.push(row); }
    }
  }
  stage.innerHTML = ''; window.__done = true; log('done');
};
