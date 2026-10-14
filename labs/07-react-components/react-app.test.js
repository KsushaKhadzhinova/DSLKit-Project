import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { test } from 'node:test';
import { mockNotations } from '../../react-app/src/data/notations.js';
import { mockPlans } from '../../react-app/src/data/plans.js';
import { mockProjects } from '../../react-app/src/data/projects.js';

const SRC = 'react-app/src';
const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const files = walk(SRC);
const read = (path) => readFileSync(path, 'utf8');
const components = files.filter((path) => path.endsWith('.jsx') && !path.endsWith('main.jsx') && !path.endsWith('App.jsx') && !/\.test\./.test(path));

test('the folder structure from the assignment exists', () => {
  for (const dir of ['components/ui', 'components/layout', 'components/features', 'pages', 'data']) {
    assert.equal(statSync(join(SRC, dir)).isDirectory(), true, dir);
  }
  for (const file of ['App.jsx', 'main.jsx', 'index.css']) assert.equal(statSync(join(SRC, file)).isFile(), true, file);
});

test('there are at least five components, in the ui, layout and features groups', () => {
  assert.ok(components.length >= 5, `components: ${components.length}`);
  const inGroup = (path, group) => path.split(sep).join('/').includes(`/${group}/`);
  for (const group of ['ui', 'layout', 'features'])
    assert.ok(
      components.some((path) => inGroup(path, group)),
      group,
    );
  assert.ok(components.filter((path) => inGroup(path, 'ui')).length >= 3);
});

test('every component is a function component with a default export', () => {
  for (const path of components) assert.match(read(path), /^function [A-Z]\w*\(/m, path);
  for (const path of components) assert.match(read(path), /export default [A-Z]\w*;/, path);
});

test('the lab rule holds: no useState and no useEffect anywhere in the source', () => {
  for (const path of files.filter((item) => /\.(jsx?|css)$/.test(item))) assert.doesNotMatch(read(path), /useState|useEffect/, path);
});

test('mock data holds between 5 and 10 records in every collection used by a list', () => {
  for (const data of [mockNotations, mockProjects]) assert.ok(data.length >= 5 && data.length <= 10, `records: ${data.length}`);
  assert.equal(mockPlans.length, 3);
  for (const record of [...mockNotations, ...mockProjects, ...mockPlans]) assert.equal(typeof record.id, 'number');
});

test('every record has a unique id inside its collection', () => {
  for (const data of [mockNotations, mockProjects, mockPlans]) assert.equal(new Set(data.map((record) => record.id)).size, data.length);
});

test('lists are rendered with map and a key', () => {
  for (const name of ['NotationList', 'ProjectList', 'PlanCard']) {
    const text = read(files.find((path) => path.endsWith(`${name}.jsx`)));
    assert.match(text, /\.map\(/, name);
    assert.match(text, /key=\{/, name);
  }
});

test('children, props and composition are used', () => {
  assert.match(read(join(SRC, 'components/ui/Card.jsx')), /\{children\}/);
  assert.match(read(join(SRC, 'components/ui/Button.jsx')), /\.\.\.props/);
  assert.match(read(join(SRC, 'components/features/NotationCard.jsx')), /import Card from/);
  assert.match(read(join(SRC, 'components/features/NotationCard.jsx')), /import Badge from/);
});

test('event handlers are console stubs in the root component', () => {
  const app = read(join(SRC, 'App.jsx'));
  assert.ok((app.match(/console\.log\(/g) ?? []).length >= 3);
  assert.match(app, /onOpen=\{handleOpen\}/);
});

test('components are styled with CSS modules and the global stylesheet', () => {
  const modules = files.filter((path) => path.endsWith('.module.css'));
  assert.ok(modules.length >= 4);
  assert.match(read(join(SRC, 'main.jsx')), /import '\.\/index\.css'/);
  for (const path of modules) assert.match(read(path), /\{[\s\S]*\}/, path);
});

test('React Router is installed but not used in this lab', () => {
  const pkg = JSON.parse(read('react-app/package.json'));
  assert.ok(pkg.dependencies['react-router-dom']);
  assert.ok(pkg.dependencies.react && pkg.dependencies['react-dom']);
  assert.ok(pkg.devDependencies.vite);
  for (const path of files.filter((item) => /\.jsx?$/.test(item))) assert.doesNotMatch(read(path), /react-router/, path);
});

test('node_modules and the build output are not committed', () => {
  const ignore = read('.gitignore');
  assert.match(ignore, /node_modules\//);
  assert.match(ignore, /dist/);
});
