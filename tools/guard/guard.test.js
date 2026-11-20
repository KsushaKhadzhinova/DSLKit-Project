import { test } from 'node:test';
import assert from 'node:assert/strict';
import { problemsOf, warningsOf, pathProblems, secretProblems, scansForSecrets, sizeProblem } from './rules.js';

test('a clean commit message passes', () => {
  assert.deepEqual(problemsOf('fix(site): report failed writes\n\nLonger text.'), []);
});

test('an empty subject is refused and a long subject only warns', () => {
  assert.equal(problemsOf('').length, 1);
  assert.equal(problemsOf('x'.repeat(121)).length, 0);
  assert.equal(warningsOf('x'.repeat(121)).length, 1);
  assert.equal(warningsOf('short').length, 0);
});

test('tool and AI attribution lines are refused', () => {
  assert.equal(problemsOf('feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>').length >= 1, true);
  assert.equal(problemsOf('feat: x\n\nGenerated with Claude Code').length, 1);
  assert.equal(problemsOf('feat: x\n\nCo-authored-by: Real Person <person@example.com>').length, 0);
});

test('secret files, personal files and dependencies are forbidden paths', () => {
  for (const path of [
    '.env',
    'part-2/lab-06-mongodb/.env',
    '.claude/admin-test-account.txt',
    '.playwright-mcp/x.png',
    'a/node_modules/b.js',
    'keys/server.pem',
  ]) {
    assert.equal(pathProblems(path).length >= 1, true, path);
  }
  for (const path of ['.env.example', 'site/js/script.js', 'docs/README.md']) assert.deepEqual(pathProblems(path), [], path);
});

test('keys and connection strings with passwords look like secrets', () => {
  const key = 'AIza' + 'A'.repeat(35);
  assert.equal(secretProblems(`const k = "${key}"`).length, 1);
  assert.equal(secretProblems('mongodb+srv://user:secretpass@cluster.example.net/db').length, 1);
  assert.equal(secretProblems('mongodb://localhost:27017/db').length, 0);
  assert.equal(secretProblems('plain text').length, 0);
});

test('only source-like files are scanned and the lock and guard files are left out', () => {
  assert.equal(scansForSecrets('site/js/script.js'), true);
  assert.equal(scansForSecrets('image.png'), false);
  assert.equal(scansForSecrets('package-lock.json'), false);
  assert.equal(scansForSecrets('tools/guard/rules.js'), false);
});

test('big files are refused unless they are the allowed network captures, and placeholders are not secrets', () => {
  assert.equal(sizeProblem('a.bin', 6 * 1048576) !== undefined, true);
  assert.equal(sizeProblem('a.bin', 1024), undefined);
  assert.equal(sizeProblem('labs/01-network/data/x.har', 20 * 1048576), undefined);
  assert.equal(secretProblems('mongodb+srv://<user>:<password>@<cluster>.mongodb.net/db').length, 0);
  assert.equal(warningsOf("Merge remote-tracking branch 'origin/" + 'x'.repeat(130) + "'").length, 0);
});
