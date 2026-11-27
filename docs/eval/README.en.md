# Accuracy harness of the automation

Russian: [README.md](README.md)

The harness measures three modules: auto-build from a description (`site/js/automation/`), notation choice by the expert system (`site/js/expert/`) and diagram checks (`site/js/utils/diagram-review.js`, `diagram-questions.js`), plus import of Mermaid, PlantUML and DOT. It needs no network and no AI key, is deterministic and does not change the product: product code is called only from `tools/eval/adapters.js`. AI mode is not measured.

## Commands

| Command                 | What it does                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run eval`          | runs the set and prints the numbers, writes nothing                                                            |
| `npm run eval:baseline` | the same, and writes `baseline.json`, `BASELINE.md`, `BASELINE.en.md` (run it when an improvement is accepted) |
| `npm run eval:check`    | compares a run with `baseline.json` using the tolerances of `ratchet.json`; exit code 1 when worse             |

In CI the `accuracy-eval` job does not block merging (`continue-on-error`) and is not a required check.

## What is in the set

- `descriptions.ru.json`, `descriptions.en.json`: 150 descriptions each (30 per `BUILDABLE` notation: bpmn, gost, erd, uml-sequence, dfd). Fields: `text`, expected `notation`, `el` (elements), `rel` (relations), `level` (easy, medium, hard), `tags` (cond, loop, parallel, roles, negation, list, numbered, coref, store), `contested` (the gold is debatable).
- `check.json`: 102 DSLKit diagrams with one seeded defect (categories: syntax, dangling, unreachable, deadend, notation-rule, level-balance) and 116 clean ones. The defect and its line are known from how a case is made, not from the answer of the checker.
- `import.json`: 45 codes (Mermaid 29, PlantUML 10, DOT 6) with expected elements and relations.
- `ratchet.json`: the tolerances. `baseline.json`: the published numbers. `src/`: the scripts that make the set (`make-*.mjs`, `desc-*.mjs`), run by hand.

Gold format: an element is `"Label"` (a step), `"d:…"` (a decision), `"a:…"` (participant, entity, external actor), `"s:…"` (store); relations are `"0-1-2 1-3"` (chains of element indexes). Start and end marks are ignored. In ERD the direction of a relation does not matter.

## Rules of the gold (honesty)

1. The expectation comes from the meaning of the text, not from what the code outputs. Never edit the gold to raise a metric; only an obvious mistake in the gold may be fixed, in a separate commit with an explanation.
2. Debatable cases are marked `contested: true` and stay in the set.
3. Label comparison is written apart from the product (`tools/eval/text.js`: word stems, share of common stems at least 0.5).

## How to add an example

Add an entry to the right `docs/eval/src/desc-*.mjs` (or to `make-import.mjs`, `make-check.mjs`), run `node docs/eval/src/make-descriptions.mjs` (and the other `make-*.mjs`), then `npm run eval:baseline`. The size of the set changed, so `eval:check` asks to renew the baseline. `tools/eval/gold.test.js` keeps the set from falling below the minimum.

## How to read the metrics

- **top-1, top-3**: the share of descriptions whose right notation is first or among the best three (of five buildable). **macro-F1**: the mean F1 over classes.
- **ECE**: expected calibration error over 10 confidence bins (smaller is better).
- **Element and relation F1**: the built result matched to the gold by labels and types; "notation detected" uses the product's own choice, "notation given" measures the builder alone.
- **No validator errors**: the share of results that `parseDiagram` accepts without errors.
- **Round trip (build, export to Mermaid, import)**: the share of results whose graph is unchanged after the loop.
- **Check recall**: the share of seeded defects found by a rule of the right category (`CATEGORY_RULES` in `tools/eval/config.js`); also with the line matching. **False alarms**: the share of clean diagrams with an error or a warning.
- **Questions**: the share of seeded defects for which `buildQuestions` asked something, and how many clean diagrams got a question.
- **Stability**: the share of identical answers of two runs. Time is printed but is not part of the baseline or the comparison.

## Limits

Descriptions and clean diagrams are short and uniform; false alarms on complex real diagrams are not yet measured. IDEF0 levels are checked inside one diagram (the product has no cross-level balance). AI mode is not measured. The gold has a single author.
