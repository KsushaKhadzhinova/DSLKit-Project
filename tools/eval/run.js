import { CATEGORY_RULES, CONFIG, FLAGGING } from './config.js';
import { goldGraph } from './graph.js';
import { calibration, checkRecall, classification, compareGraphs, falsePositiveRate, prf, rate, stability, sumCounts, timing, topErrors } from './metrics.js';

// The run of the harness: data in, numbers out. The product is reached only through `adapters`, the clock only through `clock`.
const mean = (values) => Math.round((values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)) * 10000) / 10000;

const EMPTY = { elements: [], relations: [] };

// The graph of a build result, or an empty graph when nothing was built.
const builtGraph = (result, adapters) => (result.ok ? adapters.graphOfCode(result.dsl) : EMPTY);

const compareCase = (item, result, adapters, config) => {
  const gold = goldGraph(item);
  const graph = builtGraph(result, adapters);
  return { gold, graph, ...compareGraphs(gold, graph, config.matchThreshold, item.notation === 'erd') };
};

const summarize = (rows) => {
  const elements = prf(sumCounts(rows.map((row) => row.elements)));
  const relations = prf(sumCounts(rows.map((row) => row.relations)));
  return {
    n: rows.length,
    built: rows.filter((row) => row.ok).length,
    valid: rows.filter((row) => row.valid).length,
    validRate: rate(rows.filter((row) => row.valid).length, rows.length),
    elements,
    relations,
    meanElementF1: mean(rows.map((row) => prf(row.elements).f1)),
    meanRelationF1: mean(rows.map((row) => prf(row.relations).f1)),
    exactRate: rate(rows.filter((row) => row.exact).length, rows.length),
  };
};

const groupBy = (rows, field) =>
  Object.fromEntries([...new Set(rows.map((row) => row[field]))].sort().map((name) => [name, summarize(rows.filter((row) => row[field] === name))]));

const reasonsOfBuild = (row, mode) => {
  if (!row.ok) return [{ reason: `${mode}: nothing built (${row.reason})`, example: row.id }];
  const found = [];
  if (!row.valid) found.push({ reason: `${mode}: the built code has validator errors`, example: row.id });
  if (row.elements.fn > 0) found.push({ reason: `${mode} ${row.gold}: expected elements are missing`, example: row.id });
  if (row.elements.fp > 0) found.push({ reason: `${mode} ${row.gold}: extra elements`, example: row.id });
  if (row.relations.fn > 0) found.push({ reason: `${mode} ${row.gold}: expected relations are missing`, example: row.id });
  if (row.relations.fp > 0) found.push({ reason: `${mode} ${row.gold}: extra relations`, example: row.id });
  return found;
};

// ----- descriptions: detection, calibration and build
export const evaluateDescriptions = (file, adapters, config, clock) => {
  const times = { detect: [], build: [] };
  const timed = (stage, work) => {
    const start = clock();
    const value = work();
    times[stage].push(clock() - start);
    return value;
  };
  const detections = file.cases.map((item) => ({ item, ...timed('detect', () => adapters.detect(item.text, file.lang)) }));
  const classes = adapters.notations;
  const detection = classification(
    detections.map((row) => ({ gold: row.item.notation, ranking: row.ranking })),
    classes,
    config.topK,
  );
  const calib = calibration(
    detections.map((row) => ({ confidence: row.confidence, correct: row.ranking[0] === row.item.notation })),
    config.calibrationBins,
  );
  const rowsFor = (mode) =>
    file.cases.map((item) => {
      const result = timed('build', () => adapters.build(item.text, file.lang, mode === 'auto' ? 'auto' : item.notation));
      const compared = compareCase(item, result, adapters, config);
      return {
        id: item.id,
        gold: item.notation,
        level: item.level,
        ok: result.ok,
        reason: result.reason,
        notation: result.notation,
        valid: result.ok && result.valid,
        elements: compared.elements,
        relations: compared.relations,
        exact: compared.exact,
        dsl: result.dsl,
      };
    });
  const auto = rowsFor('auto');
  const gold = rowsFor('gold');
  const trips = gold
    .filter((row) => row.ok)
    .map((row) => {
      const { first, back } = adapters.roundTrip(row.dsl);
      return { id: row.id, ok: back.ok, exact: back.ok && compareGraphs(first, back.graph, config.matchThreshold).exact };
    });
  const errors = [
    ...detections
      .filter((row) => row.ranking[0] !== row.item.notation)
      .map((row) => ({ reason: `detect ${row.item.notation} as ${row.ranking[0] ?? 'nothing'}`, example: row.item.id })),
    ...auto.flatMap((row) => reasonsOfBuild(row, 'build(auto)')),
    ...gold.flatMap((row) => reasonsOfBuild(row, 'build(gold notation)')),
  ];
  return {
    report: {
      lang: file.lang,
      detection: { ...detection, calibration: calib, byLevel: levelAccuracy(detections) },
      build: {
        auto: { ...summarize(auto), byNotation: groupBy(auto, 'gold'), byLevel: groupBy(auto, 'level') },
        gold: { ...summarize(gold), byNotation: groupBy(gold, 'gold'), byLevel: groupBy(gold, 'level') },
        roundTrip: {
          n: trips.length,
          ok: trips.filter((trip) => trip.ok).length,
          exact: trips.filter((trip) => trip.exact).length,
          exactRate: rate(trips.filter((trip) => trip.exact).length, trips.length),
        },
      },
    },
    rows: {
      detect: detections.map((row) => [row.item.id, row.ranking, row.confidence]),
      auto: auto.map((row) => [row.id, row.dsl ?? row.reason]),
      gold: gold.map((row) => [row.id, row.dsl ?? row.reason]),
    },
    errors,
    times,
  };
};

const levelAccuracy = (detections) =>
  Object.fromEntries(
    [...new Set(detections.map((row) => row.item.level))].sort().map((level) => {
      const own = detections.filter((row) => row.item.level === level);
      return [level, { n: own.length, top1: rate(own.filter((row) => row.ranking[0] === row.item.notation).length, own.length) }];
    }),
  );

// ----- checks: seeded defects and clean diagrams
export const evaluateChecks = (file, adapters, clock) => {
  const times = [];
  const rows = file.cases.map((item) => {
    const start = clock();
    const result = adapters.review(item.code);
    times.push(clock() - start);
    const raised = result.issues.filter((issue) => FLAGGING.includes(issue.severity));
    const own = result.issues.filter((issue) => (CATEGORY_RULES[item.category] ?? []).includes(issue.rule));
    return {
      item,
      raised,
      rules: [...new Set(result.issues.map((issue) => issue.rule))].sort(),
      detected: own.length > 0,
      detectedAtLine: own.some((issue) => issue.line === item.line),
      anyFinding: raised.length > 0,
      questions: result.questions,
    };
  });
  const seeded = rows.filter((row) => row.item.kind === 'seeded');
  const clean = rows.filter((row) => row.item.kind === 'clean');
  const askable = seeded.filter((row) => row.item.askable);
  const report = {
    seeded: {
      ...checkRecall(seeded.map((row) => ({ category: row.item.category, detected: row.detected }))),
      recallAtLine: checkRecall(seeded.map((row) => ({ category: row.item.category, detected: row.detectedAtLine }))).recall,
      anyFindingRate: checkRecall(seeded.map((row) => ({ category: 'all', detected: row.anyFinding }))).recall,
    },
    clean: falsePositiveRate(clean.map((row) => ({ flagged: row.anyFinding }))),
    questions: {
      askableN: askable.length,
      askedRate: checkRecall(askable.map((row) => ({ category: 'all', detected: row.questions > 0 }))).recall,
      cleanAsked: clean.filter((row) => row.questions > 0).length,
      cleanN: clean.length,
    },
  };
  const errors = [
    ...seeded
      .filter((row) => !row.detected)
      .map((row) => ({ reason: `check ${row.item.category}: seeded defect not found (${row.item.notation})`, example: row.item.id })),
    ...clean.flatMap((row) => row.raised.map((issue) => ({ reason: `check: false alarm on a clean diagram (${issue.rule})`, example: row.item.id }))),
  ];
  return { report, rows: rows.map((row) => [row.item.id, row.rules, row.questions]), errors, times };
};

// ----- import
export const evaluateImports = (file, adapters, config, clock) => {
  const times = [];
  const rows = file.cases.map((item) => {
    const start = clock();
    const result = adapters.importCode(item.code);
    times.push(clock() - start);
    const compared = result.ok
      ? compareGraphs(goldGraph(item), result.graph, config.matchThreshold)
      : compareGraphs(goldGraph(item), EMPTY, config.matchThreshold);
    return { item, result, ...compared };
  });
  const byFormat = Object.fromEntries(
    [...new Set(rows.map((row) => row.item.format))].sort().map((format) => {
      const own = rows.filter((row) => row.item.format === format);
      return [
        format,
        {
          n: own.length,
          ok: own.filter((row) => row.result.ok).length,
          elements: prf(sumCounts(own.map((row) => row.elements))),
          relations: prf(sumCounts(own.map((row) => row.relations))),
        },
      ];
    }),
  );
  const ok = rows.filter((row) => row.result.ok);
  const report = {
    n: rows.length,
    ok: ok.length,
    valid: ok.filter((row) => row.result.valid).length,
    exact: rows.filter((row) => row.exact).length,
    elements: prf(sumCounts(rows.map((row) => row.elements))),
    relations: prf(sumCounts(rows.map((row) => row.relations))),
    byFormat,
  };
  const errors = rows
    .filter((row) => !row.exact)
    .map((row) => ({
      reason: row.result.ok ? `import ${row.item.format}: elements or relations differ` : `import ${row.item.format}: refused (${row.result.reason})`,
      example: row.item.id,
    }));
  return { report, rows: rows.map((row) => [row.item.id, row.result.ok, row.result.dsl === undefined ? null : row.elements, row.relations]), errors, times };
};

// ----- the whole run
export const runOnce = (data, adapters, config = CONFIG, clock = () => 0) => {
  const langs = data.descriptions.map((file) => evaluateDescriptions(file, adapters, config, clock));
  const checks = evaluateChecks(data.check, adapters, clock);
  const imports = evaluateImports(data.imports, adapters, config, clock);
  const all = langs.flatMap((part) => part.errors).concat(checks.errors, imports.errors);
  return {
    report: {
      version: 1,
      sizes: {
        descriptions: Object.fromEntries(data.descriptions.map((file) => [file.lang, file.cases.length])),
        seeded: data.check.cases.filter((item) => item.kind === 'seeded').length,
        clean: data.check.cases.filter((item) => item.kind === 'clean').length,
        imports: data.imports.cases.length,
      },
      detection: Object.fromEntries(langs.map((part) => [part.report.lang, part.report.detection])),
      build: Object.fromEntries(langs.map((part) => [part.report.lang, part.report.build])),
      check: checks.report,
      import: imports.report,
      timing: {
        detect: timing(langs.flatMap((part) => part.times.detect)),
        build: timing(langs.flatMap((part) => part.times.build)),
        check: timing(checks.times),
        import: timing(imports.times),
      },
      topErrors: topErrors(all, config.topErrors),
    },
    rows: { descriptions: langs.map((part) => part.rows), check: checks.rows, imports: imports.rows },
  };
};

// The run repeated: the stability is the share of identical answers between the first and the last run.
export const runEval = (data, adapters, config = CONFIG, clock = () => 0) => {
  const first = runOnce(data, adapters, config, clock);
  const last = Array.from({ length: config.stabilityRuns - 1 }, () => runOnce(data, adapters, config, clock)).at(-1) ?? first;
  const flat = (run) => [...run.rows.descriptions.flatMap((part) => [...part.detect, ...part.auto, ...part.gold]), ...run.rows.check, ...run.rows.imports];
  return { ...first.report, stability: stability(flat(first), flat(last)) };
};
