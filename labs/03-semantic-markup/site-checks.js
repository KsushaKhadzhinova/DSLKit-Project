import { JSDOM } from 'jsdom';

export const SEMANTIC_TAGS = [
  'header',
  'nav',
  'main',
  'article',
  'section',
  'aside',
  'footer',
  'figure',
  'figcaption',
  'time',
  'address',
  'details',
  'summary',
  'fieldset',
  'legend',
];

export const MICRODATA_REQUIRED = {
  'https://schema.org/SoftwareApplication': ['name', 'applicationCategory', 'operatingSystem'],
  'https://schema.org/Offer': ['price', 'priceCurrency'],
  'https://schema.org/FAQPage': ['mainEntity'],
  'https://schema.org/Question': ['name', 'acceptedAnswer'],
  'https://schema.org/Answer': ['text'],
};

const BEM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$/;
const VAGUE_LINK_TEXT = /^(здесь|тут|ссылка|подробнее|here|click here|link|more)$/i;
const FIELD_SELECTOR = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea';
const IDREF_ATTRIBUTES = ['aria-controls', 'aria-labelledby', 'aria-describedby'];

export const parse = (html) => new JSDOM(html).window.document;

const all = (doc, selector) => [...doc.querySelectorAll(selector)];
const text = (element) => element.textContent.replace(/\s+/g, ' ').trim();
const hasId = (doc, id) => doc.getElementById(id) !== null;

export const usedSemanticTags = (doc) => SEMANTIC_TAGS.filter((tag) => doc.querySelector(tag) !== null);

export const documentProblems = (doc) => {
  const problems = [];
  if (!doc.documentElement.getAttribute('lang')) problems.push('html has no lang');
  if (!text(doc.querySelector('title') ?? doc.createElement('title'))) problems.push('title is missing or empty');
  if (!doc.querySelector('meta[charset]')) problems.push('meta charset is missing');
  if (!doc.querySelector('meta[name="viewport"]')) problems.push('meta viewport is missing');
  return problems;
};

export const headingProblems = (doc) => {
  const levels = all(doc, 'h1, h2, h3, h4, h5, h6').map((heading) => Number(heading.tagName[1]));
  const problems = [];
  const h1Count = levels.filter((level) => level === 1).length;
  if (h1Count !== 1) problems.push(`expected exactly one h1, found ${h1Count}`);
  levels.forEach((level, index) => {
    const previous = levels[index - 1] ?? 0;
    if (level > previous + 1) problems.push(`heading level jumps from h${previous} to h${level}`);
  });
  return problems;
};

export const imagesWithoutAlt = (doc) => all(doc, 'img:not([alt])').map((img) => img.getAttribute('src') ?? '(no src)');

export const skipLinkProblems = (doc) => {
  const first = doc.querySelector('body a[href]');
  if (!first?.classList.contains('skip-link')) return ['the first link is not a skip-link'];
  const target = first.getAttribute('href');
  if (target !== '#main') return [`skip-link points to ${target}, expected #main`];
  return doc.querySelector('main#main') ? [] : ['skip-link target main#main does not exist'];
};

export const duplicateIds = (doc) => {
  const seen = new Set();
  const duplicates = new Set();
  all(doc, '[id]').forEach(({ id }) => (seen.has(id) ? duplicates.add(id) : seen.add(id)));
  return [...duplicates];
};

export const missingIdReferences = (doc) => {
  const problems = [];
  all(doc, 'a[href^="#"]').forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    if (id && !hasId(doc, id)) problems.push(`anchor #${id} has no target`);
  });
  all(doc, 'label[for]').forEach((label) => {
    if (!hasId(doc, label.getAttribute('for'))) problems.push(`label for="${label.getAttribute('for')}" has no control`);
  });
  IDREF_ATTRIBUTES.forEach((attribute) => {
    all(doc, `[${attribute}]`).forEach((element) => {
      element
        .getAttribute(attribute)
        .split(/\s+/)
        .forEach((id) => {
          if (!hasId(doc, id)) problems.push(`${attribute} points to missing id ${id}`);
        });
    });
  });
  return problems;
};

export const unlabeledFields = (doc) =>
  all(doc, FIELD_SELECTOR)
    .filter((field) => {
      const labelled = field.id && doc.querySelector(`label[for="${field.id}"]`);
      return !labelled && !field.closest('label') && !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby');
    })
    .map((field) => field.getAttribute('name') ?? field.tagName.toLowerCase());

export const bemProblems = (doc) => {
  const names = new Set();
  all(doc, '[class]').forEach((element) => element.classList.forEach((name) => names.add(name)));
  return [...names].filter((name) => !BEM.test(name));
};

export const unnamedControls = (doc) =>
  all(doc, 'a[href], button')
    .filter((control) => !text(control) && !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby'))
    .map((control) => control.outerHTML.slice(0, 60));

export const vagueLinks = (doc) =>
  all(doc, 'a[href]')
    .filter((link) => VAGUE_LINK_TEXT.test(text(link)))
    .map((link) => text(link));

const ownProperties = (scope) => all(scope, '[itemprop]').filter((property) => property.parentElement.closest('[itemscope]') === scope);

export const microdataProblems = (doc, required = MICRODATA_REQUIRED) => {
  const problems = [];
  all(doc, '[itemscope]').forEach((scope) => {
    const type = scope.getAttribute('itemtype');
    if (!type) {
      problems.push('itemscope without itemtype');
      return;
    }
    const present = new Set(ownProperties(scope).map((property) => property.getAttribute('itemprop')));
    (required[type] ?? []).forEach((name) => {
      if (!present.has(name)) problems.push(`${type} lacks property ${name}`);
    });
  });
  return problems;
};

export const alternateProblems = (doc) => {
  const problems = [];
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) problems.push('canonical link is missing');
  else if (!canonical.getAttribute('href').startsWith('https://')) problems.push('canonical is not an absolute https URL');
  ['ru', 'en', 'x-default'].forEach((lang) => {
    const alternate = doc.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
    if (!alternate) problems.push(`hreflang ${lang} is missing`);
    else if (!alternate.getAttribute('href').startsWith('https://')) problems.push(`hreflang ${lang} is not an absolute https URL`);
  });
  return problems;
};

export const structureSignature = (doc) =>
  all(doc, 'body *').map((element) => (element.id ? `${element.tagName.toLowerCase()}#${element.id}` : element.tagName.toLowerCase()));

export const parityProblems = (first, second) => {
  const a = structureSignature(first);
  const b = structureSignature(second);
  if (a.length !== b.length) return [`element count differs: ${a.length} and ${b.length}`];
  const index = a.findIndex((item, position) => item !== b[position]);
  return index === -1 ? [] : [`element ${index} differs: ${a[index]} and ${b[index]}`];
};
