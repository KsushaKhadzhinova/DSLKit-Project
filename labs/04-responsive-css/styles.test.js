import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TOKENS } from '../../tools/tokens.js';
import {
  contrastPairs,
  darkTokens,
  colorMixWithoutFallback,
  desktopFirstQueries,
  duplicateMediaQueries,
  fibonacciProblems,
  goldenProblems,
  hardcodedColors,
  importedFiles,
  lightTokens,
  mediaBreakpoints,
  missingVariables,
  smallFonts,
  spacingProblems,
  typeScaleProblems,
  unstyledClasses,
} from './css-checks.js';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site');
const CSS_DIR = join(SITE, 'css');
const walk = (dir) =>
  readdirSync(dir)
    .filter((name) => name !== 'design')
    .flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
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
  assert.match(sheets['adaptive.css'], /\.hero\s*\{[^}]*grid-template-columns:\s*var\(--columns-golden\)/);
  assert.match(sheets['adaptive.css'], /\.plans\s*\{[^}]*grid-template-columns:\s*var\(--columns-golden\)/);
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

test('the styles are mobile first: only min-width media queries are used for layout', () => {
  assert.deepEqual(desktopFirstQueries(allCss), []);
});

test('no stylesheet repeats a media query, one query is one block', () => {
  for (const [name, css] of Object.entries(sheets)) {
    assert.deepEqual(duplicateMediaQueries(css), [], name);
  }
});

test('the variables named in the assignment exist', () => {
  const required = [
    '--color-primary',
    '--color-secondary',
    '--color-accent',
    '--color-background',
    '--color-text',
    '--color-text-light',
    '--font-family-main',
    '--font-size-base',
    '--font-size-h1',
    '--font-size-h2',
    '--spacing-small',
    '--spacing-medium',
    '--spacing-large',
    '--spacing-xlarge',
    '--container-max-width',
    '--breakpoint-mobile',
    '--breakpoint-tablet',
    '--breakpoint-desktop',
  ];
  assert.deepEqual(missingVariables(light, required), []);
});

test('the navigation is a horizontal menu from 768 px and a burger below it', () => {
  assert.match(sheets['header.css'], /\.burger__button\s*\{[^}]*display:\s*inline-flex/);
  assert.match(sheets['header.css'], /\.nav\s*\{[^}]*display:\s*none/);
  assert.match(sheets['adaptive.css'], /@media \(min-width: 768px\)\s*\{[\s\S]*?\.burger__button\s*\{[^}]*display:\s*none/);
  assert.match(sheets['adaptive.css'], /@media \(min-width: 768px\)\s*\{[\s\S]*?\.nav\s*\{[^}]*display:\s*block/);
});

test('the cards use one column on a phone, two on a tablet and three on a desktop', () => {
  assert.match(sheets['components.css'], /\.cards\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(sheets['adaptive.css'], /@media \(min-width: 576px\)\s*\{[\s\S]*?\.cards\s*\{[^}]*repeat\(2,/);
  assert.match(sheets['adaptive.css'], /@media \(min-width: 1024px\)\s*\{[\s\S]*?\.cards\s*\{[^}]*repeat\(3,/);
});

test('every colour mix has a fallback for browsers without color-mix', () => {
  const offenders = Object.entries(sheets)
    .map(([name, css]) => [name, colorMixWithoutFallback(css)])
    .filter(([, lines]) => lines.length);
  assert.deepEqual(offenders, []);
});

const ruleBody = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.notEqual(at, -1, `no rule for ${selector}`);
  return css.slice(at, css.indexOf('}', at));
};
const TOUCH_AREA = /inset:\s*calc\(\(100% - var\(--target-size-small\)\) \/ 2/;

test('rem sizes of touch targets never fall below 44 px: the root font size is 15 px on a phone', () => {
  assert.doesNotMatch(allCss, /(?:min-)?(?:block|inline)-size:\s*clamp\(2\.75rem/);
  assert.match(sheets['editor.css'], /max\(var\(--target-size-small\), clamp\(2\.75rem/);
  for (const [name, selector] of [
    ['editor.css', '.editor-segmented__button'],
    ['editor.css', '.editor-tabs__tab'],
    ['editor.css', '.editor-activity__button'],
    ['clarify.css', '.clarify__option'],
    ['clarify.css', '.clarify__nav .button'],
    ['review.css', '.review__apply'],
  ]) {
    assert.match(ruleBody(sheets[name], selector), /var\(--target-size-small\)/, `${name} ${selector}`);
  }
});

test('round buttons, switches and the toast cross keep a 44 px touch area around the drawn shape', () => {
  assert.match(ruleBody(sheets['app.css'], '.switch__input::after'), TOUCH_AREA);
  assert.match(ruleBody(sheets['editor.css'], '.toast__close::after'), TOUCH_AREA);
  assert.match(ruleBody(sheets['editor.css'], '.editor-toolbar__row .editor-toolbar__avatar::after'), TOUCH_AREA);
});

test('the panels of the editor cover the whole phone screen below 768 px, and the toolbar menu spans the phone width', () => {
  for (const [name, selector] of [
    ['expert.css', '.auto'],
    ['review.css', '.review'],
  ]) {
    assert.match(ruleBody(sheets[name], selector), /inset-block:\s*0 var\(--status-height\)/, name);
    assert.match(sheets[name], /@media \(min-width: (?:768px|48rem)\) \{\s*\.(?:auto|review) \{\s*inset-block-start: var\(--toolbar-height\)/, name);
  }
  assert.match(ruleBody(sheets['editor.css'], '\n.editor-menu__panel'), /left:\s*var\(--space-1\)/);
});

test('forced colors keep the state of switches and the focus ring visible, with system colors only', () => {
  const css = sheets['components.css'];
  const block = css.slice(css.indexOf('@media (forced-colors: active)'));
  assert.match(block, /\.switch__input:checked,[^{]*\{\s*background: Highlight/);
  assert.match(block, /\.editor-toolbar__switch\[aria-checked='true'\]/);
  assert.match(block, /:focus-visible:not\(\[tabindex='-1'\]\)\s*\{\s*outline: 2px solid Highlight/);
  assert.deepEqual(hardcodedColors(block), []);
});
