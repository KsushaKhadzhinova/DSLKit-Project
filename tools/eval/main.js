// The command line of the harness, with every effect passed in: `npm run eval` (print), `npm run eval:baseline` (write the baseline), `npm run eval:check` (compare).
import { CONFIG } from './config.js';
import { describeComparison, compareToBaseline } from './ratchet.js';
import { renderReport } from './report.js';
import { runEval } from './run.js';

const FILES = ['descriptions.ru.json', 'descriptions.en.json', 'check.json', 'import.json'];

const summary = (report) =>
  [
    `descriptions: ${Object.entries(report.sizes.descriptions)
      .map(([code, n]) => `${code}=${n}`)
      .join(' ')}, seeded=${report.sizes.seeded}, clean=${report.sizes.clean}, imports=${report.sizes.imports}`,
    ...Object.entries(report.detection).map(
      ([code, item]) => `detection ${code}: top1=${item.top1} top${item.k}=${item.topK} macroF1=${item.macroF1} ece=${item.calibration.ece}`,
    ),
    ...Object.entries(report.build).map(
      ([code, item]) =>
        `build ${code}: auto elementF1=${item.auto.elements.f1} relationF1=${item.auto.relations.f1} valid=${item.auto.validRate}; given notation elementF1=${item.gold.elements.f1} relationF1=${item.gold.relations.f1}`,
    ),
    `check: recall=${report.check.seeded.recall} falseAlarms=${report.check.clean.rate}`,
    `import: elementF1=${report.import.elements.f1} relationF1=${report.import.relations.f1}`,
    `stability: ${report.stability.rate}`,
    `time (ms, median): detect=${report.timing.detect.medianMs} build=${report.timing.build.medianMs} check=${report.timing.check.medianMs} import=${report.timing.import.medianMs}`,
  ].join('\n');

// io: { readJson(name), writeText(name, text), log(text) } with names relative to docs/eval. The result is the exit code.
export const main = ({ argv, io, adapters, clock }) => {
  const [first, second, check, imports] = FILES.map((name) => io.readJson(name));
  const report = runEval({ descriptions: [first, second], check, imports }, adapters, CONFIG, clock);
  io.log(summary(report));
  if (argv.includes('--write')) {
    // The time is left out of the baseline: it depends on the machine and would change the file on every run.
    const stable = { ...report, timing: undefined };
    io.writeText('baseline.json', `${JSON.stringify(stable, null, 2)}\n`);
    io.writeText('BASELINE.md', renderReport(stable, 'ru'));
    io.writeText('BASELINE.en.md', renderReport(stable, 'en'));
    io.log('baseline written');
  }
  if (argv.includes('--check')) {
    const result = compareToBaseline(report, io.readJson('baseline.json'), io.readJson('ratchet.json'));
    io.log(describeComparison(result));
    return result.ok ? 0 : 1;
  }
  return 0;
};
