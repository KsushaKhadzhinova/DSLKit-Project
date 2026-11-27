import { similarity } from './text.js';

// The pure functions of the accuracy harness: no input and output, no clock, no randomness.
const ratio = (top, bottom) => (bottom === 0 ? 0 : top / bottom);
const round = (value, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

// A share rounded to four digits; an empty denominator gives 0.
export const rate = (top, bottom) => round(ratio(top, bottom));

export const prf = ({ tp, fp, fn }) => {
  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  return { tp, fp, fn, precision: round(precision), recall: round(recall), f1: round(ratio(2 * precision * recall, precision + recall)) };
};

export const sumCounts = (list) => ({
  tp: list.reduce((sum, item) => sum + item.tp, 0),
  fp: list.reduce((sum, item) => sum + item.fp, 0),
  fn: list.reduce((sum, item) => sum + item.fn, 0),
});

// ----- notation detection
// cases: [{ gold, ranking: [keys, best first] }] (an empty ranking is "no answer"). The result has top-1, top-k, per-class P/R/F1 and the confusion matrix.
export const classification = (cases, classes, k = 3) => {
  const top = (item) => item.ranking[0] ?? null;
  const names = [...classes, null].map(String);
  const matrix = Object.fromEntries(names.map((row) => [row, Object.fromEntries(names.map((col) => [col, 0]))]));
  cases.forEach((item) => {
    matrix[String(item.gold)][String(top(item))] += 1;
  });
  const perClass = Object.fromEntries(
    classes.map((name) => {
      const tp = cases.filter((item) => item.gold === name && top(item) === name).length;
      const fp = cases.filter((item) => item.gold !== name && top(item) === name).length;
      const fn = cases.filter((item) => item.gold === name && top(item) !== name).length;
      return [name, { ...prf({ tp, fp, fn }), support: tp + fn }];
    }),
  );
  const present = classes.filter((name) => perClass[name].support > 0);
  const macro = ratio(
    present.reduce((sum, name) => sum + perClass[name].f1, 0),
    present.length,
  );
  return {
    total: cases.length,
    top1: round(ratio(cases.filter((item) => top(item) === item.gold).length, cases.length)),
    topK: round(ratio(cases.filter((item) => item.ranking.slice(0, k).includes(item.gold)).length, cases.length)),
    k,
    macroF1: round(macro),
    perClass,
    matrix,
  };
};

// ----- calibration: samples [{ confidence (0..1), correct }]; the expected calibration error is the weighted gap between confidence and accuracy per bin.
export const calibration = (samples, binCount = 10) => {
  const bins = Array.from({ length: binCount }, (_, at) => ({ from: at / binCount, to: (at + 1) / binCount, n: 0, confidence: 0, accuracy: 0 }));
  samples.forEach((sample) => {
    const bin = bins[Math.min(binCount - 1, Math.floor(sample.confidence * binCount))];
    bin.n += 1;
    bin.confidence += sample.confidence;
    bin.accuracy += sample.correct ? 1 : 0;
  });
  const filled = bins.map((bin) => ({ ...bin, confidence: round(ratio(bin.confidence, bin.n)), accuracy: round(ratio(bin.accuracy, bin.n)) }));
  const ece = filled.reduce((sum, bin) => sum + (bin.n / samples.length) * Math.abs(bin.confidence - bin.accuracy), 0);
  return { ece: samples.length === 0 ? 0 : round(ece), n: samples.length, bins: filled.filter((bin) => bin.n > 0) };
};

// ----- graph comparison
// One-to-one matching of built elements to gold ones: the best similarity first, the same type, similarity not below the threshold.
// The result maps the index of a built element to the index of a gold element.
export const matchElements = (gold, built, threshold = 0.5) => {
  const pairs = gold
    .flatMap((g, gi) => built.map((b, bi) => ({ gi, bi, score: g.type === b.type ? similarity(g.label, b.label) : 0 })))
    .filter((pair) => pair.score >= threshold)
    .sort((a, b) => b.score - a.score || a.gi - b.gi || a.bi - b.bi);
  const usedGold = new Set();
  const map = new Map();
  pairs.forEach((pair) => {
    if (usedGold.has(pair.gi) || map.has(pair.bi)) return;
    usedGold.add(pair.gi);
    map.set(pair.bi, pair.gi);
  });
  return map;
};

const key = (from, to, undirected = false) => (undirected && from > to ? `${to}>${from}` : `${from}>${to}`);

// Elements and relations of a built graph against the gold one. A relation counts only when both ends are matched; relations are a multiset.
// With `undirected` the order of the two ends of a relation does not matter (a data model, where "one to many" is a property of the line).
export const compareGraphs = (gold, built, threshold = 0.5, undirected = false) => {
  const map = matchElements(gold.elements, built.elements, threshold);
  const elements = { tp: map.size, fp: built.elements.length - map.size, fn: gold.elements.length - map.size };
  const left = new Map();
  gold.relations.forEach(([from, to]) => left.set(key(from, to, undirected), (left.get(key(from, to, undirected)) ?? 0) + 1));
  let tp = 0;
  built.relations.forEach(([from, to]) => {
    const id = key(map.get(from), map.get(to), undirected);
    if ((left.get(id) ?? 0) > 0) {
      left.set(id, left.get(id) - 1);
      tp += 1;
    }
  });
  const relations = { tp, fp: built.relations.length - tp, fn: gold.relations.length - tp };
  return { elements, relations, exact: elements.fp + elements.fn + relations.fp + relations.fn === 0 };
};

// ----- checks of diagrams
// results: [{ category, detected }] for seeded diagrams. Recall per category and overall.
export const checkRecall = (results) => {
  const categories = [...new Set(results.map((item) => item.category))].sort();
  const perCategory = Object.fromEntries(
    categories.map((name) => {
      const own = results.filter((item) => item.category === name);
      const found = own.filter((item) => item.detected).length;
      return [name, { n: own.length, found, recall: round(ratio(found, own.length)) }];
    }),
  );
  const found = results.filter((item) => item.detected).length;
  return { n: results.length, found, recall: round(ratio(found, results.length)), perCategory };
};

// clean: [{ flagged }]: the share of clean diagrams on which the checker reported something.
export const falsePositiveRate = (clean) => {
  const flagged = clean.filter((item) => item.flagged).length;
  return { n: clean.length, flagged, rate: round(ratio(flagged, clean.length)) };
};

// ----- time and stability
export const timing = (milliseconds) => {
  const sorted = [...milliseconds].sort((a, b) => a - b);
  const at = (share) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0;
  return { n: sorted.length, medianMs: round(at(0.5), 3), p95Ms: round(at(0.95), 3), maxMs: round(sorted.at(-1) ?? 0, 3) };
};

// The share of items that two runs answered in the same way.
export const stability = (first, second) => {
  const same = first.filter((item, at) => JSON.stringify(item) === JSON.stringify(second[at])).length;
  return { n: first.length, same, rate: round(ratio(same, first.length)) };
};

// The most frequent reasons of mistakes: [{ reason, count, example }] by count, then by name.
export const topErrors = (errors, limit = 20) => {
  const groups = new Map();
  errors.forEach((error) => {
    const entry = groups.get(error.reason) ?? { reason: error.reason, count: 0, example: error.example };
    entry.count += 1;
    groups.set(error.reason, entry);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)).slice(0, limit);
};
