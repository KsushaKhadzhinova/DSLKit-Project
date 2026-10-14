import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const scores = (dir) => {
  const { categories } = JSON.parse(read(`labs/08-frontend-testing/${dir}/report.json`));
  return Object.fromEntries(Object.entries(categories).map(([name, value]) => [name, Math.round(value.score * 100)]));
};

test('the test environment from the assignment is configured', () => {
  const pkg = JSON.parse(read('react-app/package.json'));
  assert.equal(pkg.scripts.test, 'jest');
  assert.equal(pkg.scripts['test:coverage'], 'jest --coverage');
  assert.equal(pkg.scripts['test:watch'], 'jest --watch');
  for (const name of ['jest', 'jest-environment-jsdom', '@testing-library/react', '@testing-library/jest-dom', 'identity-obj-proxy']) {
    assert.ok(pkg.devDependencies[name], name);
  }
  for (const file of ['jest.config.js', 'babel.config.cjs', 'src/setupTests.js', '__mocks__/fileMock.js']) assert.ok(existsSync(`react-app/${file}`), file);
  assert.match(read('react-app/src/setupTests.js'), /@testing-library\/jest-dom/);
});

test('coverage thresholds are at least the ones from the assignment', () => {
  const config = read('react-app/jest.config.js');
  const number = (key) => Number(new RegExp(`${key}: (\\d+)`).exec(config)[1]);
  assert.ok(number('statements') >= 70 && number('lines') >= 70 && number('functions') >= 70 && number('branches') >= 60);
  assert.match(config, /testEnvironment: 'jsdom'/);
  assert.match(config, /identity-obj-proxy/);
});

test('at least three pure functions have unit tests', () => {
  const helpers = read('react-app/src/utils/helpers.js');
  const tests = read('react-app/src/utils/helpers.test.js');
  const functions = [...helpers.matchAll(/export function (\w+)/g)].map((match) => match[1]);
  assert.ok(functions.length >= 3);
  for (const name of functions) assert.match(tests, new RegExp(`describe\\('${name}'`), name);
});

test('at least three components have tests: a simple one, a composite one and one with a handler', () => {
  const files = ['ui/Button', 'ui/Card', 'features/NotationList', 'features/ProjectList'];
  for (const file of files) assert.ok(existsSync(`react-app/src/components/${file}.test.jsx`), file);
  assert.match(read('react-app/src/components/ui/Button.test.jsx'), /fireEvent\.click/);
  assert.match(read('react-app/src/components/features/ProjectList.test.jsx'), /toHaveBeenCalledWith/);
  for (const file of files) assert.match(read(`react-app/src/components/${file}.test.jsx`), /render, screen|fireEvent, render, screen/);
});

test('the components keep the lab 7 rule and use test ids where text is not enough', () => {
  for (const file of ['App.jsx', 'components/features/ProjectList.jsx', 'components/features/NotationList.jsx'])
    assert.doesNotMatch(read(`react-app/src/${file}`), /useState|useEffect/);
  assert.match(read('react-app/src/components/features/NotationList.jsx'), /data-testid="notation-list"/);
  assert.match(read('react-app/src/App.jsx'), /console\.group/);
  assert.match(read('react-app/src/App.jsx'), /console\.table/);
});

test('Lighthouse reports exist and the audit improved after the changes', () => {
  const before = scores('lighthouse-before');
  const after = scores('lighthouse-after');
  for (const name of ['accessibility', 'best-practices', 'seo']) assert.ok(after[name] >= before[name], name);
  assert.ok(after.accessibility > before.accessibility || after.seo > before.seo);
  assert.equal(existsSync('labs/08-frontend-testing/lighthouse-after/report.html'), true);
});

test('the improvements recommended by Lighthouse are in the project', () => {
  assert.match(read('react-app/public/robots.txt'), /User-agent: \*/);
  assert.match(read('react-app/public/llms.txt'), /DSLKit/);
  assert.match(read('react-app/src/components/features/NotationCard.jsx'), /headingLevel="h2"/);
});

test('the report figures exist', () => {
  for (const name of ['coverage-report', 'lighthouse-before', 'lighthouse-after']) assert.ok(existsSync(`labs/08-frontend-testing/figures/${name}.jpg`), name);
});
