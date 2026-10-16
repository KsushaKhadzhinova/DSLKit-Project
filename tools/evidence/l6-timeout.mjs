// Lab 6 evidence: a timeout is one request, a 5xx is retried. Run: node tools/evidence/l6-timeout.mjs
import http from 'node:http';
import { createApi } from '../../site/js/api/apiService.js';
import { API_CONFIG } from '../../site/js/api/config.js';

const MERMAID = 'graph TD; A[Editor] --> B[Kroki]; B --> C[SVG]';
const counted = () => {
  const log = [];
  const fetchImpl = (url, init) => {
    log.push({ url, at: Date.now() });
    return fetch(url, init);
  };
  return { log, fetchImpl };
};
const show = (name, data) => console.log(`${name}: ${JSON.stringify(data)}`);

const runCase = async (config, status) => {
  const { log, fetchImpl } = counted();
  const sleeps = [];
  const api = createApi({ config, fetchImpl, sleep: async (ms) => sleeps.push(ms) });
  const started = Date.now();
  let outcome;
  try {
    const svg = await api.renderDiagram(MERMAID, { type: 'mermaid' });
    outcome = { ok: true, svgBytes: svg.length };
  } catch (e) {
    outcome = { ok: false, kind: e.kind, status: e.status, message: e.message };
  }
  return { requests: log.length, sleeps, ms: Date.now() - started, ...outcome, status };
};

// 1. Real kroki.io
let reachable = false;
try {
  const r = await runCase({ ...API_CONFIG, timeoutMs: 20000 });
  show('real: success', r);
  reachable = r.ok;
} catch {}
if (reachable) {
  show('real: timeout 1 ms', await runCase({ ...API_CONFIG, timeoutMs: 1 }));
} else {
  console.log('kroki.io unreachable from this machine, stub only');
}

// 2. Local stub: hangs, or answers 503 a given number of times, then 200.
const stub = (mode) => {
  let hits = 0;
  const server = http.createServer((req, res) => {
    req.resume();
    hits++;
    if (mode === 'hang') return; // never answers
    if (mode === 'always503' || hits <= Number(mode)) {
      res.writeHead(503);
      return res.end('busy');
    }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, hits: () => hits, port: server.address().port })));
};
const cases = [
  ['stub: hang, timeout 300 ms', 'hang', { timeoutMs: 300 }],
  ['stub: 503 twice then 200', '2', {}],
  ['stub: 503 always (retries exhausted)', 'always503', {}],
];
for (const [name, mode, extra] of cases) {
  const s = await stub(mode);
  const config = { ...API_CONFIG, baseUrl: `http://127.0.0.1:${s.port}`, retryDelayMs: 50, ...extra };
  const result = await runCase(config);
  show(name, { ...result, serverHits: s.hits() });
  s.server.closeAllConnections();
  s.server.close();
}
