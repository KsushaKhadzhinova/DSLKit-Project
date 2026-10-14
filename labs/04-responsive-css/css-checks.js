import { contrast } from '../../tools/contrast.js';

const GOLDEN = 1.618;
const ROOT_GOLDEN = 1.272;

export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

export const classesInHtml = (html) => new Set([...html.matchAll(/\bclass="([^"]*)"/g)].flatMap((match) => match[1].split(/\s+/).filter(Boolean)));

export const selectorClasses = (css) => new Set([...stripComments(css).matchAll(/\.(-?[a-z_][a-z0-9_-]*)/gi)].map((match) => match[1]));

export const unstyledClasses = (html, css) => {
  const styled = selectorClasses(css);
  return [...classesInHtml(html)].filter((name) => !styled.has(name)).sort();
};

const declarations = (block) => [...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((match) => [match[1], match[2].trim()]);

export const lightTokens = (css) => {
  const root = stripComments(css).match(/:root\s*\{([\s\S]*?)\n\}/);
  return Object.fromEntries(root ? declarations(root[1]) : []);
};

export const darkTokens = (css) => {
  const dark = stripComments(css).match(/:root:has\([^{]*\{([\s\S]*?)\n\}/);
  return Object.fromEntries(dark ? declarations(dark[1]) : []);
};

export const pixels = (value) => {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value);
  return match ? Number(match[1]) : null;
};

export const spacingProblems = (tokens) =>
  Object.entries(tokens)
    .filter(([name]) => /^--space-\d$/.test(name))
    .filter(([, value]) => pixels(value) === null || pixels(value) % 8 !== 0)
    .map(([name, value]) => `${name}: ${value} is not a multiple of 8 px`);

export const fibonacciProblems = (tokens) => {
  const steps = [1, 2, 3, 4, 5, 6].map((index) => pixels(tokens[`--space-${index}`]) / 8);
  const wrong = [];
  for (let index = 2; index < steps.length; index += 1) {
    if (steps[index] !== steps[index - 1] + steps[index - 2]) wrong.push(`--space-${index + 1}`);
  }
  return wrong;
};

export const goldenProblems = (tokens) => {
  const problems = [];
  if (Math.abs(Number(tokens['--phi']) - GOLDEN) > 0.0005) problems.push('--phi is not 1.618');
  if (Math.abs(Number(tokens['--phi-root']) - ROOT_GOLDEN) > 0.0005) problems.push('--phi-root is not the square root of phi');
  if (tokens['--columns-golden'] !== '1fr 1.618fr') problems.push('--columns-golden is not 1fr 1.618fr');
  if (tokens['--columns-golden-reverse'] !== '1.618fr 1fr') problems.push('--columns-golden-reverse is not 1.618fr 1fr');
  return problems;
};

const scaleSteps = ['--step--1', '--step-0', '--step-1', '--step-2', '--step-3', '--step-4', '--step-5', '--step-6'];

export const typeScaleProblems = (tokens) => {
  const factors = scaleSteps.map((name) => {
    const value = tokens[name] ?? '';
    const up = (value.match(/var\(--phi-root\)/g) ?? []).length * Math.log(ROOT_GOLDEN) + (value.match(/var\(--phi\)/g) ?? []).length * Math.log(GOLDEN);
    return value.startsWith('calc(1rem /') ? -Math.log(ROOT_GOLDEN) : up;
  });
  return factors
    .slice(1)
    .map((factor, index) => ({ name: scaleSteps[index + 1], ratio: Math.exp(factor - factors[index]) }))
    .filter(({ ratio }) => Math.abs(ratio - ROOT_GOLDEN) > 0.01)
    .map(({ name, ratio }) => `${name}: ratio ${ratio.toFixed(3)}`);
};

export const hardcodedColors = (css) => [...new Set(stripComments(css).match(/#[0-9a-f]{3,8}\b/gi) ?? [])];

export const smallFonts = (css) =>
  [...stripComments(css).matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1])).filter((size) => size < 12);

export const importedFiles = (css) => [...stripComments(css).matchAll(/@import\s+url\('([^']+)'\)/g)].map((match) => match[1]);

export const mediaBreakpoints = (css) =>
  [...new Set([...stripComments(css).matchAll(/@media[^{]*\((?:max|min)-width:\s*(\d+(?:\.\d+)?)px\)/g)].map((match) => Math.ceil(Number(match[1]))))].sort(
    (a, b) => a - b,
  );

export const contrastPairs = (tokens, pairs, minimum = 4.5) =>
  pairs
    .map(([foreground, background, required = minimum]) => ({ foreground, background, ratio: contrast(tokens[foreground], tokens[background]), required }))
    .filter(({ ratio, required }) => ratio < required)
    .map(({ foreground, background, ratio, required }) => `${foreground} on ${background}: ${ratio.toFixed(2)} < ${required}`);

export const desktopFirstQueries = (css) => [...stripComments(css).matchAll(/@media[^{]*\(max-width:[^)]*\)/g)].map((match) => match[0].trim());

export const colorMixWithoutFallback = (css) => {
  const lines = stripComments(css)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .map((line, index) => ({ line, previous: lines[index - 1] ?? '' }))
    .filter(({ line }) => /^[a-z-]+:\s*color-mix\(/.test(line))
    .filter(({ line, previous }) => !previous.startsWith(`${line.split(':')[0]}:`))
    .map(({ line }) => line);
};

export const missingVariables = (tokens, names) => names.filter((name) => !(name in tokens));
