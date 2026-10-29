// Common imports and shorthands for the test parts.
import { request, post, raw, record, results, svgIssues, short, SECURITY } from './lib.mjs';
import { TEMPLATES } from '../../../site/js/notations/templates.js';

export { request, post, raw, results, svgIssues, short, SECURITY, TEMPLATES };
export const R = (id, grp, title, rq, ex, ac, ok, note) => record(id, grp, title, rq, ex, ac, ok, note);
export const st = (r) => (r.status === 0 ? `no response (${r.error})` : String(r.status));
export const isJson = (r) => { try { JSON.parse(r.body); return true; } catch { return false; } };
export const alive = async () => (await request({ path: '/api/grammar' })).status === 200;
export const J = { 'Content-Type': 'application/json' };
export const VALID = TEMPLATES.graph;
// After a client timeout the server may still be busy with the abandoned request: wait until it answers again.
export const recover = async (maxMs = 300000) => {
  const t0 = performance.now();
  while (performance.now() - t0 < maxMs) {
    if ((await request({ path: '/api/grammar', timeout: 5000 })).status === 200) return;
  }
};
