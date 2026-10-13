import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MICRODATA_REQUIRED,
  SEMANTIC_TAGS,
  alternateProblems,
  bemProblems,
  documentProblems,
  duplicateIds,
  headingProblems,
  imagesWithoutAlt,
  microdataProblems,
  missingIdReferences,
  parityProblems,
  parse,
  skipLinkProblems,
  structureSignature,
  unlabeledFields,
  unnamedControls,
  usedSemanticTags,
  vagueLinks,
} from './site-checks.js';

const body = (inner) => parse(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>t</title></head><body>${inner}</body></html>`);

test('the list of semantic tags covers the landmarks required by the lab', () => {
  for (const tag of ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer', 'figure', 'figcaption', 'time']) assert.ok(SEMANTIC_TAGS.includes(tag));
});

test('usedSemanticTags lists only the tags present in the document', () => {
  assert.deepEqual(usedSemanticTags(body('<header></header><footer></footer><div></div>')), ['header', 'footer']);
  assert.deepEqual(usedSemanticTags(body('<div></div>')), []);
});

test('documentProblems reports each missing basic element', () => {
  assert.deepEqual(documentProblems(parse('<html><body></body></html>')), [
    'html has no lang',
    'title is missing or empty',
    'meta charset is missing',
    'meta viewport is missing',
  ]);
  assert.deepEqual(documentProblems(parse('<html lang="ru"><head><title> </title></head></html>')), [
    'title is missing or empty',
    'meta charset is missing',
    'meta viewport is missing',
  ]);
  const good = parse('<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page</title></head></html>');
  assert.deepEqual(documentProblems(good), []);
});

test('headingProblems requires one h1 and no skipped levels', () => {
  assert.deepEqual(headingProblems(body('<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2>')), []);
  assert.deepEqual(headingProblems(body('<h2>a</h2>')), ['expected exactly one h1, found 0', 'heading level jumps from h0 to h2']);
  assert.deepEqual(headingProblems(body('<h1>a</h1><h1>b</h1>')), ['expected exactly one h1, found 2']);
  assert.deepEqual(headingProblems(body('<h1>a</h1><h3>b</h3>')), ['heading level jumps from h1 to h3']);
});

test('imagesWithoutAlt allows an empty alt and reports a missing attribute', () => {
  assert.deepEqual(imagesWithoutAlt(body('<img src="a.png"><img><img src="b.png" alt=""><img src="c.png" alt="c">')), ['a.png', '(no src)']);
});

test('skipLinkProblems checks the first link and its target', () => {
  assert.deepEqual(skipLinkProblems(body('<p>no links</p>')), ['the first link is not a skip-link']);
  assert.deepEqual(skipLinkProblems(body('<a href="/">home</a><a class="skip-link" href="#main">skip</a>')), ['the first link is not a skip-link']);
  assert.deepEqual(skipLinkProblems(body('<a class="skip-link" href="#content">skip</a><main id="main"></main>')), [
    'skip-link points to #content, expected #main',
  ]);
  assert.deepEqual(skipLinkProblems(body('<a class="skip-link" href="#main">skip</a><div id="main"></div>')), ['skip-link target main#main does not exist']);
  assert.deepEqual(skipLinkProblems(body('<a class="skip-link" href="#main">skip</a><main id="main"></main>')), []);
});

test('duplicateIds lists every repeated id once', () => {
  assert.deepEqual(duplicateIds(body('<i id="a"></i><i id="a"></i><i id="a"></i><i id="b"></i>')), ['a']);
  assert.deepEqual(duplicateIds(body('<i id="a"></i><i id="b"></i>')), []);
});

test('missingIdReferences finds broken anchors, labels and aria references', () => {
  const doc = body(`
    <a href="#">top</a><a href="#ok">ok</a><a href="#gone">gone</a>
    <i id="ok"></i><i id="one"></i>
    <label for="nothing">x</label><label for="ok">y</label>
    <p aria-describedby="one two" aria-controls="ok" aria-labelledby="missing"></p>`);
  assert.deepEqual(missingIdReferences(doc), [
    'anchor #gone has no target',
    'label for="nothing" has no control',
    'aria-labelledby points to missing id missing',
    'aria-describedby points to missing id two',
  ]);
  assert.deepEqual(missingIdReferences(body('<a href="#a">a</a><i id="a"></i>')), []);
});

test('unlabeledFields accepts label, wrapping label and aria names', () => {
  const doc = body(`
    <input id="a" name="a"><label for="a">A</label>
    <label>B <input name="b"></label>
    <input name="c" aria-label="C">
    <input name="d" aria-labelledby="a">
    <input type="hidden" name="h"><input type="submit"><input type="button"><input type="reset"><input type="image">
    <input name="bad">
    <select></select>`);
  assert.deepEqual(unlabeledFields(doc), ['bad', 'select']);
});

test('bemProblems accepts blocks, elements and modifiers only', () => {
  const doc = body('<i class="card card__title card__title--big button--primary header__logo-image a1"></i><i class="Bad a__b__c a_b -x 1a"></i>');
  assert.deepEqual(bemProblems(doc).sort(), ['-x', '1a', 'Bad', 'a__b__c', 'a_b']);
});

test('unnamedControls finds links and buttons without an accessible name', () => {
  const doc = body(`
    <a href="/a">text</a><a href="/b" aria-label="named"></a><a href="/c" aria-labelledby="x"></a><button>ok</button>
    <button aria-label="b"></button><a href="/long-address-that-must-be-cut-because-it-exceeds-sixty-characters-in-total"></a><button></button>`);
  const result = unnamedControls(doc);
  assert.equal(result.length, 2);
  assert.equal(result[0].length, 60);
  assert.equal(result[1], '<button></button>');
});

test('vagueLinks reports non-descriptive link text', () => {
  assert.deepEqual(vagueLinks(body('<a href="/a">здесь</a><a href="/b">Click here</a><a href="/c">Получить шаблон IDEF0</a>')), ['здесь', 'Click here']);
});

test('microdataProblems checks itemtype and the required properties of each type', () => {
  assert.deepEqual(microdataProblems(body('<div itemscope></div>')), ['itemscope without itemtype']);
  assert.deepEqual(microdataProblems(body('<div itemscope itemtype="https://schema.org/Offer"><meta itemprop="price" content="0"></div>')), [
    'https://schema.org/Offer lacks property priceCurrency',
  ]);
  assert.deepEqual(microdataProblems(body('<div itemscope itemtype="https://schema.org/Unknown"></div>')), []);
  const good = body(`
    <section itemscope itemtype="https://schema.org/SoftwareApplication">
      <meta itemprop="name" content="n"><meta itemprop="applicationCategory" content="c"><meta itemprop="operatingSystem" content="Web">
      <p itemprop="offers" itemscope itemtype="https://schema.org/Offer"><meta itemprop="price" content="0"><meta itemprop="priceCurrency" content="USD"></p>
    </section>`);
  assert.deepEqual(microdataProblems(good), []);
  const nested = body(
    '<div itemscope itemtype="https://schema.org/Question"><b itemprop="name">q</b><div itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer"></div></div>',
  );
  assert.deepEqual(microdataProblems(nested), ['https://schema.org/Answer lacks property text']);
  assert.deepEqual(microdataProblems(body('<div itemscope itemtype="https://example.org/Thing"></div>'), { 'https://example.org/Thing': ['label'] }), [
    'https://example.org/Thing lacks property label',
  ]);
  assert.ok(MICRODATA_REQUIRED['https://schema.org/FAQPage'].includes('mainEntity'));
});

test('alternateProblems requires canonical and ru, en, x-default alternates over https', () => {
  assert.deepEqual(alternateProblems(parse('<html><head></head></html>')), [
    'canonical link is missing',
    'hreflang ru is missing',
    'hreflang en is missing',
    'hreflang x-default is missing',
  ]);
  const insecure = parse(`<html><head><link rel="canonical" href="/a">
    <link rel="alternate" hreflang="ru" href="http://x/"><link rel="alternate" hreflang="en" href="https://x/en/"><link rel="alternate" hreflang="x-default" href="https://x/"></head></html>`);
  assert.deepEqual(alternateProblems(insecure), ['canonical is not an absolute https URL', 'hreflang ru is not an absolute https URL']);
  const good = parse(`<html><head><link rel="canonical" href="https://x/">
    <link rel="alternate" hreflang="ru" href="https://x/"><link rel="alternate" hreflang="en" href="https://x/en/"><link rel="alternate" hreflang="x-default" href="https://x/"></head></html>`);
  assert.deepEqual(alternateProblems(good), []);
});

test('structureSignature and parityProblems compare the element trees of two pages', () => {
  const a = body('<main id="main"><h1>Привет</h1></main>');
  const b = body('<main id="main"><h1>Hello</h1></main>');
  assert.deepEqual(structureSignature(a), ['main#main', 'h1']);
  assert.deepEqual(parityProblems(a, b), []);
  assert.deepEqual(parityProblems(a, body('<main id="main"></main>')), ['element count differs: 2 and 1']);
  assert.deepEqual(parityProblems(a, body('<main id="main"><h2>x</h2></main>')), ['element 1 differs: h1 and h2']);
});
