// The ratchet: a run is compared with the published baseline; a metric that is worse by more than its tolerance is flagged, a better one is a hint to renew the baseline.
const get = (object, path) => path.split('.').reduce((value, part) => value?.[part], object);

const HIGHER = ['top1', 'topK', 'macroF1'];

// The metrics that are watched: [path, direction]. "higher" means that a bigger number is better.
export const watched = (report) => {
  const list = [];
  Object.keys(report.detection).forEach((lang) => {
    HIGHER.forEach((name) => list.push([`detection.${lang}.${name}`, 'higher']));
    list.push([`detection.${lang}.calibration.ece`, 'lower']);
  });
  Object.keys(report.build).forEach((lang) => {
    ['auto', 'gold'].forEach((mode) => {
      ['elements.f1', 'relations.f1', 'validRate'].forEach((name) => list.push([`build.${lang}.${mode}.${name}`, 'higher']));
    });
    list.push([`build.${lang}.roundTrip.exactRate`, 'higher']);
  });
  list.push(
    ['check.seeded.recall', 'higher'],
    ['check.clean.rate', 'lower'],
    ['import.elements.f1', 'higher'],
    ['import.relations.f1', 'higher'],
    ['stability.rate', 'higher'],
  );
  Object.keys(report.check.seeded.perCategory).forEach((name) => list.push([`check.seeded.perCategory.${name}.recall`, 'higher']));
  return list;
};

// The result: { ok, regressions, improvements, missing, sizeChanged }. `config` is { tolerance, overrides: { path: tolerance } }.
export const compareToBaseline = (current, baseline, config) => {
  const regressions = [];
  const improvements = [];
  const missing = [];
  watched(baseline).forEach(([path, direction]) => {
    const before = get(baseline, path);
    const after = get(current, path);
    if (typeof after !== 'number') return missing.push(path);
    const tolerance = config.overrides?.[path] ?? config.tolerance;
    const gain = direction === 'higher' ? after - before : before - after;
    const entry = { path, baseline: before, current: after, delta: Math.round((after - before) * 10000) / 10000 };
    if (gain < -tolerance) regressions.push(entry);
    else if (gain > tolerance) improvements.push(entry);
    return undefined;
  });
  const sizeChanged = JSON.stringify(current.sizes) !== JSON.stringify(baseline.sizes);
  return { ok: regressions.length === 0 && missing.length === 0, regressions, improvements, missing, sizeChanged };
};

export const describeComparison = (result) => {
  const line = (entry) => `  ${entry.path}: ${entry.baseline} -> ${entry.current} (${entry.delta > 0 ? '+' : ''}${entry.delta})`;
  return [
    result.ok ? 'eval:check: no metric is worse than the baseline' : 'eval:check: WORSE than the baseline',
    ...(result.sizeChanged ? ['the size of the gold set changed: renew the baseline (npm run eval:baseline)'] : []),
    ...result.regressions.map((entry) => `worse:${line(entry).slice(1)}`),
    ...result.missing.map((path) => `missing in the run: ${path}`),
    ...(result.improvements.length > 0 ? ['better than the baseline (consider renewing it):', ...result.improvements.map(line)] : []),
  ].join('\n');
};
