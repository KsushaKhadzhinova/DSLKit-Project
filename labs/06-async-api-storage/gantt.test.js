import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATIONS, TEMPLATES, formatProblem, generate, parseDiagram, renderNotation } from '../../site/js/notations/index.js';
import { schedule } from '../../site/js/notations/specs-gantt.js';

const codes = (source) =>
  parseDiagram(source)
    .problems.filter((item) => item.severity !== 'info')
    .map((item) => `${item.severity}:${item.code}`);
const slotsOf = (source) => Object.fromEntries([...schedule(parseDiagram(source)).slots].map(([id, slot]) => [id, [slot.start, slot.end]]));

test('the Gantt chart is registered, its template is clean, it draws and exports to PlantUML and Mermaid', () => {
  assert.ok(NOTATIONS.gantt);
  assert.deepEqual(codes(TEMPLATES.gantt), []);
  const model = parseDiagram(TEMPLATES.gantt);
  assert.equal(model.notation, 'gantt');
  assert.deepEqual(NOTATIONS.gantt.kinds, ['task', 'milestone']);
  assert.deepEqual(Object.keys(NOTATIONS.gantt.generators), ['plantuml', 'mermaid']);
  assert.match(renderNotation(model), /^<svg /);
  assert.equal(parseDiagram('diagram gantt "Empty"').empty, true);
});

test('a task starts where the latest task it depends on ends, unless the code names a start', () => {
  const source = 'diagram gantt\ntask a days=3\ntask b days=2\ntask c days=4\ntask d start=10 days=1\nmilestone m\ndepends a -> c\ndepends b -> c\ndepends c -> m\ndepends c -> d';
  assert.deepEqual(slotsOf(source), { a: [0, 3], b: [0, 2], c: [3, 7], d: [10, 11], m: [7, 7] });
  assert.deepEqual(slotsOf('diagram gantt\ntask a days=1.5\ntask b'), { a: [0, 1.5], b: [0, 1] }, 'a day is the default length, decimals are fine');
  assert.equal(schedule(parseDiagram('diagram gantt')).length, 0);
});

test('the critical path is the chain of tasks without slack', () => {
  const source = 'diagram gantt\ntask a days=3\ntask b days=2\ntask c days=4\ntask free days=1\ndepends a -> c\ndepends b -> c';
  assert.deepEqual([...schedule(parseDiagram(source)).critical].sort(), ['a', 'c']);
  const loop = 'diagram gantt\ntask a\ntask b\ndepends a -> b\ndepends b -> a';
  assert.equal(schedule(parseDiagram(loop)).critical.size, 0, 'a loop has no critical path and cannot hang the page');
  assert.match(renderNotation(parseDiagram(loop)), /^<svg /);
});

test('bad numbers, a loop and a task that starts before its predecessor ends are reported', () => {
  assert.deepEqual(codes('diagram gantt\ntask a days=x'), ['warning:gantt-number']);
  assert.deepEqual(codes('diagram gantt\ntask a start=-1'), ['warning:gantt-number']);
  assert.deepEqual(codes('diagram gantt\ntask a done=120'), ['warning:gantt-number']);
  assert.deepEqual(codes('diagram gantt\ntask a done'), ['warning:gantt-number']);
  assert.deepEqual(codes('diagram gantt\ntask a done=100 days=1 start=0'), []);
  assert.deepEqual(codes('diagram gantt\nmilestone a days=5'), [], 'a milestone has no length, so days is ignored');
  assert.deepEqual(codes('diagram gantt\ntask a\ntask b\ndepends a -> b\ndepends b -> a'), ['error:gantt-cycle']);
  assert.deepEqual(codes('diagram gantt\ntask a days=5\ntask b start=2\ndepends a -> b'), ['warning:gantt-early']);
  assert.deepEqual(codes('diagram gantt\ntask a days=5\ntask b start=5\ndepends a -> b'), []);
  assert.deepEqual(codes('diagram gantt\ntask a\ndepends a -> missing'), ['error:unknown-ref']);
  assert.match(formatProblem(parseDiagram('diagram gantt\ntask a days=x').problems[0], 'en'), /"a" has days=x/);
  assert.match(formatProblem(parseDiagram('diagram gantt\ntask a done').problems[0], 'ru'), /done=/);
  assert.match(formatProblem(parseDiagram('diagram gantt\ntask a\ntask b\ndepends a -> b\ndepends b -> a').problems[0], 'en'), /loop: a → b|loop: b → a/);
  assert.match(formatProblem(parseDiagram('diagram gantt\ntask a days=5\ntask b start=2\ndepends a -> b').problems[0], 'ru'), /день 5/);
});

test('the drawing has a bar for a task, a diamond for a milestone, arrows for dependencies and a time axis', () => {
  const svg = renderNotation(parseDiagram(TEMPLATES.gantt));
  assert.equal((svg.match(/class="notation__node"/g) ?? []).length, 5);
  assert.equal((svg.match(/class="notation__edge"/g) ?? []).length, 4);
  assert.match(svg, /data-id="release"/);
  assert.doesNotMatch(svg, /data-cx/, 'the place of a bar is its time, so it is never dragged');
  assert.match(svg, />22</, 'the axis reaches the end of the plan');
  assert.match(svg, /<title>Design: 0–5<\/title>/);
});

test('bars show progress, take the colour of the code and scale to long and short plans', () => {
  const half = renderNotation(parseDiagram('diagram gantt\ntask a days=10 done=50\ntask b days=10 color=#ff8800 done=50\ntask c days=2'));
  assert.match(half, /fill="#ff8800"/);
  assert.match(half, /fill-opacity="0.3"/);
  assert.equal((half.match(/rx="4"/g) ?? []).length, 5, 'three bars and two progress parts');
  const colouredMilestone = renderNotation(parseDiagram('diagram gantt\nmilestone m color=#00aa55'));
  assert.match(colouredMilestone, /fill="#00aa55"/);
  assert.doesNotMatch(renderNotation(parseDiagram('diagram gantt\ntask a color=red')), /fill="red"/, 'only hex colours are taken');
  const long = renderNotation(parseDiagram('diagram gantt\ntask a days=900\ntask b "A very long name of a task that goes on and on and on and on and on and on and on" days=1'));
  assert.match(long, /^<svg /);
  const huge = renderNotation(parseDiagram('diagram gantt\ntask a days=900000'));
  assert.match(huge, />900000</, 'the grid step grows with the plan, so the axis keeps a few lines');
  assert.ok((huge.match(/stroke="#cbd5e1"/g) ?? []).length < 20);
  const tiny = renderNotation(parseDiagram('diagram gantt\ntask a days=0'));
  assert.match(tiny, /width="3"/, 'a task of no length is still visible');
});

test('a dependency that goes back in time is routed between the rows, forward ones go straight', () => {
  const forward = renderNotation(parseDiagram('diagram gantt\ntask a days=1\ntask b days=1 start=5\ndepends a -> b'));
  assert.match(forward, /class="notation__edge" d="M[\d.]+ [\d.]+H[\d.]+V[\d.]+H[\d.]+"/);
  const back = renderNotation(parseDiagram('diagram gantt\ntask a days=5\ntask b days=1 start=2\ndepends a -> b\n'));
  assert.match(back, /H[\d.]+V[\d.]+H[\d.]+V[\d.]+H[\d.]+"/);
  const upward = renderNotation(parseDiagram('diagram gantt\ntask b days=1 start=2\ntask a days=5\ndepends a -> b'));
  assert.match(upward, /class="notation__edge"/);
  const milestones = renderNotation(parseDiagram('diagram gantt\nmilestone a\nmilestone b start=3\ndepends a -> b'));
  assert.match(milestones, /class="notation__edge"/);
});

test('PlantUML and Mermaid get dates, lengths, dependencies, milestones, progress and critical marks', () => {
  const model = parseDiagram(TEMPLATES.gantt);
  const puml = generate(model, 'plantuml');
  assert.match(puml, /^@startgantt\ntitle Release plan\nProject starts 2026-01-01/);
  assert.match(puml, /\[Design\] as \[t0\] lasts 5 days\n\[t0\] starts 2026-01-01\n\[t0\] is 100% completed/);
  assert.match(puml, /\[t1\] starts at \[t0\]'s end/);
  assert.match(puml, /\[t3\] starts 2026-01-05/);
  assert.match(puml, /\[Release\] as \[t4\] happens at \[t2\]'s end/);
  assert.match(puml, /@endgantt$/);
  const mmd = generate(model, 'mermaid');
  assert.match(mmd, /^gantt\n {2}title Release plan\n {2}dateFormat YYYY-MM-DD/);
  assert.match(mmd, /Design :crit, done, t0, 2026-01-01, 5d/);
  assert.match(mmd, /Build :crit, t1, after t0, 10d/);
  assert.match(mmd, /Write docs :t3, 2026-01-05, 7d/);
  assert.match(mmd, /Release :milestone, crit, t4, after t2 t3, 0d/);
  const plain = parseDiagram('diagram gantt\ntask a "A: [b]" days=0.2\nmilestone m start=3');
  assert.doesNotMatch(generate(plain, 'plantuml'), /title|completed/);
  assert.match(generate(plain, 'plantuml'), /\[A: {2}b \] as \[t0\] lasts 1 days/);
  assert.match(generate(plain, 'plantuml'), /\[m\] as \[t1\] happens 2026-01-04/);
  assert.doesNotMatch(generate(plain, 'mermaid'), /title/);
  assert.match(generate(plain, 'mermaid'), /A {2}\[b\] :t0, 2026-01-01, 1d/);
  assert.match(generate(plain, 'mermaid'), /m :milestone, crit, t1, 2026-01-04, 0d/);
});
