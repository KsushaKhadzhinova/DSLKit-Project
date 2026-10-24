// Stage 1: every source is read by the parser of the service and drawn by its local engine. Any problem reported by the service is printed.
// Usage: node docs/diagrams/check.mjs   (from the root of the repository)
import { DIAGRAMS } from './diagrams.mjs';
import { formatProblem, parseDiagram, renderNotation } from '../../site/js/notations/index.js';

let bad = 0;
for (const lang of ['ru', 'en']) {
  const L = (ru, en) => (lang === 'ru' ? ru : en);
  for (const d of DIAGRAMS) {
    const source = d.source(L);
    const model = parseDiagram(source);
    const all = model.problems ?? [];
    // Information messages (the summary of a graph, the critical path of a DAG) are results of the service, not problems.
    const problems = all.filter((p) => p.severity !== 'info');
    let svg = '';
    try {
      svg = renderNotation(model);
    } catch (error) {
      problems.push({ severity: 'error', code: 'render', message: error.message });
    }
    const empty = model.notation === null || model.empty;
    const expected = d.notation.startsWith('uml-') ? d.notation : d.notation;
    const status = problems.length === 0 && !empty && svg.startsWith('<svg') ? 'ok' : 'PROBLEM';
    if (status !== 'ok') bad += 1;
    console.log(`${lang} ${d.id} ${expected.padEnd(18)} ${model.notation ?? 'null'}`.padEnd(48), status, svg.length, 'bytes');
    for (const p of problems)
      console.log(
        '     ',
        p.severity,
        p.code,
        p.line ?? '',
        (() => {
          try {
            return formatProblem(p, lang);
          } catch {
            return p.message ?? '';
          }
        })(),
      );
  }
}
console.log(bad === 0 ? 'ALL OK' : `${bad} diagrams with problems`);
process.exit(bad === 0 ? 0 : 1);
