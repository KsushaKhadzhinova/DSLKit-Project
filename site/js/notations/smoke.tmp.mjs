import * as m from './index.js';
for (const k of m.NOTATION_KEYS) {
  const r = m.parseDiagram(m.TEMPLATES[k]);
  const bad = r.problems.filter((p) => p.severity !== 'info');
  let svg = '',
    out = '';
  try {
    svg = r.notation === 'idef0' ? '-' : m.renderNotation(r);
    out = Object.keys(m.NOTATIONS[k].generators)
      .map((f) => m.generate(r, f).length)
      .join(',');
  } catch (e) {
    out = 'ERR ' + e.stack.split('\n').slice(0, 3).join(' / ');
  }
  console.log(k, r.notation, r.empty, svg.length, out, bad.map((p) => p.line + p.code + JSON.stringify(p.params)).join(' | '));
}
