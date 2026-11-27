// The only place where the harness calls the product. Every function is read-only for the product and needs no network and no key.
import { BUILDABLE } from '../../site/js/automation/builders.js';
import { buildFromCode, buildFromDescription, detectNotation } from '../../site/js/automation/build.js';
import { parseDescription } from '../../site/js/automation/describe.js';
import { generate, parseDiagram } from '../../site/js/notations/index.js';
import { buildQuestions } from '../../site/js/utils/diagram-questions.js';
import { reviewCode } from '../../site/js/utils/diagram-review.js';
import { toGraph } from './graph.js';

export const notations = BUILDABLE;

// The notation of a description: the ranking of the notations the builders can write, best first, with the certainty of each.
export const detect = (text, lang) => {
  const detection = detectNotation(text, parseDescription(text, lang));
  const ranking = detection.ranking.filter((item) => notations.includes(item.key));
  return { ranking: ranking.map((item) => item.key), confidence: ranking[0]?.cf ?? 0, key: detection.key };
};

// A description built into code (the notation is chosen by the product), with its graph and the problems of the validator.
export const build = (text, lang, notation = 'auto') => {
  const result = buildFromDescription(text, { lang, notation });
  if (!result.ok) return { ok: false, reason: result.reason, notation: result.notation ?? null };
  return {
    ok: true,
    notation: result.notation,
    dsl: result.dsl,
    valid: result.valid,
    errors: result.problems.filter((item) => item.severity === 'error').length,
  };
};

export const graphOfCode = (code) => toGraph(parseDiagram(code));

// The findings of the checker and the questions for a code: [{ rule, severity, line }] and the number of questions.
export const review = (code) => {
  const result = reviewCode(code);
  return {
    notation: result.notation,
    issues: result.issues.map((item) => ({ rule: item.rule, severity: item.severity, line: item.line })),
    questions: buildQuestions(code, result.notation).length,
  };
};

// Code in another language into DSLKit code and its graph.
export const importCode = (code) => {
  const result = buildFromCode(code);
  if (!result.ok) return { ok: false, reason: result.reason };
  return { ok: true, kind: result.kind, valid: result.valid, graph: graphOfCode(result.dsl) };
};

// Build, parse, export to Mermaid, import again: the graph must survive. The answer tells where it was lost.
export const roundTrip = (code) => {
  const model = parseDiagram(code);
  const first = toGraph(model);
  const exported = generate(model, 'mermaid');
  const back = importCode(exported);
  return { first, back };
};
