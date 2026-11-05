import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classesInHtml,
  colorMixWithoutFallback,
  contrastPairs,
  darkTokens,
  desktopFirstQueries,
  duplicateMediaQueries,
  fibonacciProblems,
  goldenProblems,
  hardcodedColors,
  importedFiles,
  lightTokens,
  mediaBreakpoints,
  missingVariables,
  designPixels,
  pixels,
  selectorClasses,
  smallFonts,
  spacingProblems,
  stripComments,
  typeScaleProblems,
  unstyledClasses,
} from './css-checks.js';

test('stripComments removes block comments', () => {
  assert.equal(stripComments('a/* x */b/*\ny*/c'), 'abc');
});

test('classesInHtml collects every class token', () => {
  assert.deepEqual([...classesInHtml('<a class="a  b"><i class="b c"></i><p></p></a>')].sort(), ['a', 'b', 'c']);
});

test('selectorClasses reads class selectors and ignores comments and numbers', () => {
  const css = '/* .hidden */ .a, .b__c--d:hover { margin: 0.5rem; } .e:not(.f) {}';
  assert.deepEqual([...selectorClasses(css)].sort(), ['a', 'b__c--d', 'e', 'f']);
});

test('unstyledClasses lists classes that have no selector', () => {
  assert.deepEqual(unstyledClasses('<i class="a b c"></i>', '.a {} .c {}'), ['b']);
  assert.deepEqual(unstyledClasses('<i class="a"></i>', '.a {}'), []);
});

const LIGHT = `
:root {
  --phi: 1.618;
  --phi-root: 1.272;
  --columns-golden: 1fr 1.618fr;
  --columns-golden-reverse: 1.618fr 1fr;
  --step--1: calc(1rem / var(--phi-root));
  --step-0: 1rem;
  --step-1: calc(1rem * var(--phi-root));
  --step-2: calc(1rem * var(--phi));
  --step-3: calc(1rem * var(--phi) * var(--phi-root));
  --step-4: calc(1rem * var(--phi) * var(--phi));
  --step-5: calc(1rem * var(--phi) * var(--phi) * var(--phi-root));
  --step-6: calc(1rem * var(--phi) * var(--phi) * var(--phi));
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 40px;
  --space-5: 64px;
  --space-6: 104px;
  --color-text: #000000;
  --color-background: #ffffff;
}
:root:has(.theme__input:checked) {
  --color-text: #ffffff;
  --color-background: #000000;
}`;

test('lightTokens and darkTokens read the two token blocks', () => {
  assert.equal(lightTokens(LIGHT)['--color-text'], '#000000');
  assert.equal(darkTokens(LIGHT)['--color-text'], '#ffffff');
  assert.deepEqual(lightTokens('a { color: red }'), {});
  assert.deepEqual(darkTokens('a { color: red }'), {});
});

test('pixels parses px values only', () => {
  assert.equal(pixels('16px'), 16);
  assert.equal(pixels('-1.5px'), -1.5);
  assert.equal(pixels('1rem'), null);
});

test('designPixels reads px and rem', () => {
  assert.equal(designPixels('1.5rem'), 24);
  assert.equal(designPixels('8px'), 8);
  assert.equal(designPixels('1em'), null);
});

test('spacing tokens must be multiples of 8 px', () => {
  assert.deepEqual(spacingProblems(lightTokens(LIGHT)), []);
  assert.deepEqual(spacingProblems({ '--space-1': '12px', '--space-2': '1.25rem', '--other': '5px' }), [
    '--space-1: 12px is not a multiple of 8 px',
    '--space-2: 1.25rem is not a multiple of 8 px',
  ]);
});

test('spacing tokens follow the Fibonacci numbers', () => {
  assert.deepEqual(fibonacciProblems(lightTokens(LIGHT)), []);
  assert.deepEqual(
    fibonacciProblems({ '--space-1': '8px', '--space-2': '16px', '--space-3': '32px', '--space-4': '48px', '--space-5': '80px', '--space-6': '128px' }),
    ['--space-3'],
  );
});

test('golden ratio tokens are exact', () => {
  assert.deepEqual(goldenProblems(lightTokens(LIGHT)), []);
  assert.deepEqual(goldenProblems({ '--phi': '1.5', '--phi-root': '1.3', '--columns-golden': '1fr 2fr', '--columns-golden-reverse': '2fr 1fr' }), [
    '--phi is not 1.618',
    '--phi-root is not the square root of phi',
    '--columns-golden is not 1fr 1.618fr',
    '--columns-golden-reverse is not 1.618fr 1fr',
  ]);
});

test('the type scale grows by the square root of phi at every step', () => {
  assert.deepEqual(typeScaleProblems(lightTokens(LIGHT)), []);
  const broken = { ...lightTokens(LIGHT), '--step-3': 'calc(1rem * var(--phi) * var(--phi))' };
  delete broken['--step-5'];
  assert.ok(typeScaleProblems(broken).length > 0);
});

test('hardcodedColors finds hex colours outside comments', () => {
  assert.deepEqual(hardcodedColors('a { color: #fff; } /* #000 */ b { fill: #1c1f2e; background: #fff }'), ['#fff', '#1c1f2e']);
  assert.deepEqual(hardcodedColors('a { color: red }'), []);
});

test('smallFonts finds px and rem font sizes under 12 px', () => {
  assert.deepEqual(
    smallFonts('a { font-size: 11px } b { font-size: 12px } c { font-size: 9.5px } d { font-size: 1rem } e { font-size: 0.5rem }'),
    [11, 9.5, 8],
  );
});

test('importedFiles and mediaBreakpoints read @import and @media rules', () => {
  assert.deepEqual(importedFiles("@import url('a.css'); /* @import url('x.css'); */ @import url('b.css');"), ['a.css', 'b.css']);
  assert.deepEqual(
    mediaBreakpoints(
      '@media (max-width: 1023.98px) {} @media (min-width: 576px) {} @media (max-width: 767.98px) {} @media (max-width: 1023.98px) {} @media (pointer: coarse) {}',
    ),
    [576, 768, 1024],
  );
  assert.deepEqual(mediaBreakpoints('a {}'), []);
});

test('contrastPairs reports pairs below the required ratio', () => {
  const tokens = { '--color-text': '#000000', '--color-background': '#ffffff', '--grey': '#777777' };
  assert.deepEqual(contrastPairs(tokens, [['--color-text', '--color-background']]), []);
  assert.deepEqual(contrastPairs(tokens, [['--grey', '--color-background']]), ['--grey on --color-background: 4.48 < 4.5']);
  assert.deepEqual(contrastPairs(tokens, [['--grey', '--color-background', 3]]), []);
  assert.deepEqual(contrastPairs(tokens, [['--grey', '--color-background']], 3), []);
});

test('desktopFirstQueries finds max-width media queries only', () => {
  assert.deepEqual(desktopFirstQueries('@media (max-width: 600px) { a {} } @media (min-width: 600px) { a {} } /* @media (max-width: 1px) */'), [
    '@media (max-width: 600px)',
  ]);
  assert.deepEqual(desktopFirstQueries('a {}'), []);
});

test('duplicateMediaQueries lists queries that appear more than once', () => {
  assert.deepEqual(duplicateMediaQueries('@media (min-width: 576px) { a {} } @media (min-width:  576px) { b {} } @media (min-width: 768px) { a {} }'), [
    '(min-width: 576px)',
  ]);
  assert.deepEqual(duplicateMediaQueries('@media print { a {} } /* @media print { a {} } */'), []);
});

test('colorMixWithoutFallback wants an earlier declaration of the same property', () => {
  const mixed = 'color: color-mix(in srgb, red, blue);';
  assert.deepEqual(colorMixWithoutFallback(`a {\n  color: red;\n  ${mixed}\n}`), []);
  assert.deepEqual(colorMixWithoutFallback(`a {\r\n  color: red;\r\n  ${mixed}\r\n}`), []);
  assert.deepEqual(colorMixWithoutFallback(`a {\n  ${mixed}\n}`), [mixed]);
  assert.deepEqual(colorMixWithoutFallback(`a {\n  background: red;\n  ${mixed}\n}`), [mixed]);
  assert.deepEqual(colorMixWithoutFallback('a {\n  background-image: linear-gradient(color-mix(in srgb, red, blue) 1px, red);\n}'), []);
});

test('missingVariables lists names that are not defined', () => {
  assert.deepEqual(missingVariables({ '--a': '1', '--b': '2' }, ['--a', '--c']), ['--c']);
  assert.deepEqual(missingVariables({ '--a': '1' }, ['--a']), []);
});
