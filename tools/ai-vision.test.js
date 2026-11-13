import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VISION_SIGNATURES, VISION_TASK, VISION_TYPES, retryMessage, visionBlock, visionIssues } from './ai-vision.js';

test('a PDF is a document block, a picture is an image block', () => {
  assert.equal(visionBlock('application/pdf', 'QQ==').type, 'document');
  assert.equal(visionBlock('image/png', 'QQ==').type, 'image');
  assert.equal(VISION_TYPES['application/pdf'], 'pdf');
  assert.equal(VISION_SIGNATURES['application/pdf'](Buffer.from('%PDF-1.7 data')), true);
  assert.equal(VISION_SIGNATURES['application/pdf'](Buffer.from('nope nope')), false);
  assert.match(VISION_TASK, /pos=XxY/);
});

test('only a recognised picture is checked for a header and for elements', () => {
  assert.deepEqual(visionIssues({ code: 'anything' }, 'idea'), []);
  assert.match(visionIssues({ code: 'Sorry, I cannot read it' }, 'image')[0].message, /header/);
  assert.match(visionIssues({ code: '' }, 'image')[0].message, /header/);
  assert.match(visionIssues({ code: '// c\ndiagram graph\n' }, 'image')[0].message, /no elements/);
  assert.deepEqual(visionIssues({ code: 'diagram graph\nvertex a' }, 'image'), []);
});

test('the retry message lists the errors and, for a picture, asks to look again', () => {
  const errors = [{ line: 2, message: 'bad' }];
  assert.equal(retryMessage(errors, 'idea').includes('line 2: bad'), true);
  assert.equal(retryMessage(errors, 'idea').includes('picture'), false);
  assert.match(retryMessage(errors, 'image'), /picture again/);
});
