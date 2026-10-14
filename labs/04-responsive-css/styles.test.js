import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TOKENS } from '../../tools/tokens.js';
import {
  contrastPairs,
  darkTokens,
  fibonacciProblems,
  goldenProblems,
  hardcodedColors,
  importedFiles,
  lightTokens,
  mediaBreakpoints,
  smallFonts,
  spacingProblems,
  typeScaleProblems,
  unstyledClasses,
} from './css-checks.js';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site');
const CSS_DIR = join(SITE, 'css');
const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const read = (file) => readFileSync(file, 'utf8');
const sheets = Object.fromEntries(readdirSync(CSS_DIR).map((name) => [name, read(join(CSS_DIR, name))]));
const allCss = Object.values(sheets).join('\n');
const light = lightTokens(sheets['variables.css']);
const dark = { ...light, ...darkTokens(sheets['variables.css']) };

test('style.css imports every stylesheet exactly once, variables first', () => {
  const imported = importedFiles(sheets['style.css']);
  assert.equal(imported[0], 'variables.css');
  assert.deepEqual(
    [...imported].sort(),
    Object.keys(sheets)
      .filter((name) => name !== 'style.css')
      .sort(),
  );
});

test('every class used on every page has a CSS rule', () => {
  const missing = {};
  for (const file of walk(SITE).filter((name) => name.endsWith('.html'))) {
    const names = unstyledClasses(read(file), allCss);
    if (names.length) missing[file.replace(SITE, '')] = names;
  }
  assert.deepEqual(missing, {});
});

test('the golden ratio is the base of the scales', () => {
  assert.deepEqual(goldenProblems(light), []);
  assert.deepEqual(typeScaleProblems(light), []);
  assert.deepEqual(spacingProblems(light), []);
  assert.deepEqual(fibonacciProblems(light), []);
});

test('the hero, the pricing and the work area are split by the golden columns', () => {
  assert.match(sheets['main.css'], /\.hero\s*\{[^}]*grid-template-columns:\s*var\(--columns-golden\)/);
  assert.match(sheets['components.css'], /\.plans\s*\{[^}]*grid-template-columns:\s*var\(--columns-golden\)/);
  assert.match(sheets['editor.css'], /\.editor-main\s*\{[^}]*grid-template-columns:\s*var\(--columns-golden\)/);
  assert.match(sheets['main.css'], /\.hero__image\s*\{[^}]*aspect-ratio:\s*1\.618/);
});

test('the colour tokens match the design tokens of the project', () => {
  const map = {
    secondary: '--color-secondary',
    background: '--color-background',
    surface: '--color-surface',
    border: '--color-border',
    text: '--color-text',
    'text-light': '--color-text-light',
  };
  assert.equal(light['--color-primary'], TOKENS.light.primary);
  assert.equal(light['--color-accent'], TOKENS.light.accent);
  for (const [name, variable] of Object.entries(map)) {
    assert.equal(light[variable], TOKENS.light[name], name);
    assert.equal(dark[variable], TOKENS.dark[name], `dark ${name}`);
  }
});

const TEXT_PAIRS = [
  ['--color-text', '--color-background'],
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-secondary'],
  ['--color-text-light', '--color-background'],
  ['--color-text-light', '--color-surface'],
  ['--color-text-light', '--color-secondary'],
  ['--color-muted', '--color-background'],
  ['--color-muted', '--color-surface'],
  ['--color-muted', '--color-secondary'],
  ['--color-link', '--color-background'],
  ['--color-link', '--color-surface'],
  ['--color-link', '--color-secondary'],
  ['--color-error', '--color-background'],
  ['--color-error', '--color-surface'],
  ['--color-warning', '--color-background'],
  ['--color-accent-text', '--color-background'],
  ['--color-accent-text', '--color-surface'],
  ['--color-on-primary', '--color-primary'],
  ['--color-code-text', '--color-code-background'],
  ['--color-border-strong', '--color-background', 3],
  ['--color-border-strong', '--color-surface', 3],
  ['--color-primary', '--color-background', 3],
];

test('text and interface colours reach WCAG AA in the light theme', () => {
  assert.deepEqual(contrastPairs(light, TEXT_PAIRS), []);
});

test('text and interface colours reach WCAG AA in the dark theme', () => {
  assert.deepEqual(contrastPairs(dark, TEXT_PAIRS), []);
});

test('no hex colours outside the token file', () => {
  const offenders = Object.entries(sheets)
    .filter(([name]) => name !== 'variables.css')
    .map(([name, css]) => [name, hardcodedColors(css)])
    .filter(([, colors]) => colors.length);
  assert.deepEqual(offenders, []);
});

test('no font size below 12 px and only the course breakpoints are used', () => {
  assert.deepEqual(smallFonts(allCss), []);
  assert.deepEqual(mediaBreakpoints(allCss), [576, 768, 1024]);
});

test('the header is sticky, focus is visible, reduced motion is respected and a dark theme exists', () => {
  assert.match(sheets['header.css'], /\.header\s*\{[^}]*position:\s*sticky/);
  assert.match(sheets['base.css'], /:focus-visible/);
  assert.match(sheets['base.css'], /prefers-reduced-motion:\s*reduce/);
  assert.ok(Object.keys(darkTokens(sheets['variables.css'])).length >= 10);
});
