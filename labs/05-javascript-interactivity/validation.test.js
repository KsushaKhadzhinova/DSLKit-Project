import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NOTATIONS, isValidComment, isValidEmail, isValidName, isValidNotation, isValidTeamSize, validateWaitlist } from '../../site/js/utils/validation.js';

const validForm = {
  name: 'Ксения',
  email: 'ksenia@example.com',
  notation: 'bpmn',
  team: 12,
  comment: 'Looking forward to it',
  consent: true,
};

describe('NOTATIONS', () => {
  it('lists the six supported notations in order', () => {
    assert.deepEqual(NOTATIONS, ['idef0', 'dfd', 'erd', 'bpmn', 'uml', 'petri']);
  });
});

describe('isValidName', () => {
  it('accepts Cyrillic, Belarusian and Latin letters', () => {
    assert.equal(isValidName('Ксения'), true);
    assert.equal(isValidName('Іван'), true);
    assert.equal(isValidName('Ўладзімір'), true);
    assert.equal(isValidName('Anna'), true);
  });

  it('accepts apostrophes, hyphens, spaces and double hyphens', () => {
    assert.equal(isValidName("O'Brien"), true);
    assert.equal(isValidName('Anna’Marie'), true);
    assert.equal(isValidName('Anna-Maria'), true);
    assert.equal(isValidName('Anna Maria'), true);
    assert.equal(isValidName('Anna--Maria'), true);
  });

  it('trims surrounding whitespace', () => {
    assert.equal(isValidName('  Ksenia  '), true);
  });

  it('rejects single letters, digits and symbols', () => {
    assert.equal(isValidName('A'), false);
    assert.equal(isValidName('Ann3'), false);
    assert.equal(isValidName('Ann@'), false);
    assert.equal(isValidName('-Anna'), false);
    assert.equal(isValidName(''), false);
    assert.equal(isValidName('   '), false);
  });

  it('accepts a 60 letter name and rejects 61 letters', () => {
    assert.equal(isValidName('a'.repeat(60)), true);
    assert.equal(isValidName('a'.repeat(61)), false);
  });

  it('rejects missing values', () => {
    assert.equal(isValidName(undefined), false);
    assert.equal(isValidName(null), false);
  });
});

describe('isValidEmail', () => {
  it('rejects empty domain labels and accepts subdomains', () => {
    assert.equal(isValidEmail('a@.com'), false);
    assert.equal(isValidEmail('a@b..com'), false);
    assert.equal(isValidEmail('a@mail.example.com'), true);
  });

  it('accepts a normal address and trims whitespace', () => {
    assert.equal(isValidEmail('ksenia@example.com'), true);
    assert.equal(isValidEmail('  ksenia@example.com  '), true);
  });

  it('rejects addresses without a domain or with spaces', () => {
    assert.equal(isValidEmail('ksenia@'), false);
    assert.equal(isValidEmail('ksenia@example'), false);
    assert.equal(isValidEmail('ksenia@example.c'), false);
    assert.equal(isValidEmail('ksenia example@test.com'), false);
    assert.equal(isValidEmail('ksenia@exa mple.com'), false);
    assert.equal(isValidEmail('no-at-sign.com'), false);
    assert.equal(isValidEmail(''), false);
  });

  it('accepts a 120 character address and rejects 121 characters', () => {
    const local = 'a'.repeat(120 - '@example.com'.length);
    const exact = `${local}@example.com`;
    assert.equal(exact.length, 120);
    assert.equal(isValidEmail(exact), true);
    assert.equal(isValidEmail(`a${exact}`), false);
  });

  it('rejects missing values', () => {
    assert.equal(isValidEmail(undefined), false);
    assert.equal(isValidEmail(null), false);
  });
});

describe('isValidTeamSize', () => {
  it('accepts integers from 0 to 500 as numbers', () => {
    assert.equal(isValidTeamSize(0), true);
    assert.equal(isValidTeamSize(1), true);
    assert.equal(isValidTeamSize(500), true);
  });

  it('accepts integer strings from 0 to 500', () => {
    assert.equal(isValidTeamSize('0'), true);
    assert.equal(isValidTeamSize('25'), true);
    assert.equal(isValidTeamSize(' 25 '), true);
    assert.equal(isValidTeamSize('500'), true);
  });

  it('rejects 501 both as number and string', () => {
    assert.equal(isValidTeamSize(501), false);
    assert.equal(isValidTeamSize('501'), false);
  });

  it('rejects negative numbers and strings', () => {
    assert.equal(isValidTeamSize(-1), false);
    assert.equal(isValidTeamSize('-1'), false);
  });

  it('rejects fractions and fractional strings', () => {
    assert.equal(isValidTeamSize(1.5), false);
    assert.equal(isValidTeamSize('1.5'), false);
  });

  it('rejects empty, blank and non-numeric strings', () => {
    assert.equal(isValidTeamSize(''), false);
    assert.equal(isValidTeamSize(' '), false);
    assert.equal(isValidTeamSize('abc'), false);
  });

  it('rejects NaN, null, undefined and other types', () => {
    assert.equal(isValidTeamSize(NaN), false);
    assert.equal(isValidTeamSize(null), false);
    assert.equal(isValidTeamSize(undefined), false);
    assert.equal(isValidTeamSize(true), false);
    assert.equal(isValidTeamSize({}), false);
  });
});

describe('isValidNotation', () => {
  it('accepts every supported notation', () => {
    for (const notation of NOTATIONS) {
      assert.equal(isValidNotation(notation), true);
    }
  });

  it('rejects unknown, differently cased and missing notations', () => {
    assert.equal(isValidNotation('flowchart'), false);
    assert.equal(isValidNotation('BPMN'), false);
    assert.equal(isValidNotation(''), false);
    assert.equal(isValidNotation(undefined), false);
  });
});

describe('isValidComment', () => {
  it('accepts a comment of exactly 500 characters', () => {
    assert.equal(isValidComment('x'.repeat(500)), true);
  });

  it('rejects a comment of 501 characters', () => {
    assert.equal(isValidComment('x'.repeat(501)), false);
  });

  it('accepts an empty comment by default', () => {
    assert.equal(isValidComment(), true);
    assert.equal(isValidComment(''), true);
  });

  it('accepts Cyrillic text within the limit', () => {
    assert.equal(isValidComment('Дзякуй, цікава!'), true);
  });
});

describe('validateWaitlist', () => {
  it('returns an empty array for a fully valid form', () => {
    assert.deepEqual(validateWaitlist(validForm), []);
  });

  it('returns the invalid fields in the documented order', () => {
    assert.deepEqual(
      validateWaitlist({
        name: '1',
        email: 'bad',
        notation: 'nope',
        team: 900,
        comment: 'x'.repeat(501),
        consent: false,
      }),
      ['name', 'email', 'notation', 'team', 'comment', 'consent'],
    );
  });

  it('reports a single invalid field', () => {
    assert.deepEqual(validateWaitlist({ ...validForm, email: 'ksenia@example' }), ['email']);
    assert.deepEqual(validateWaitlist({ ...validForm, notation: 'uml1' }), ['notation']);
    assert.deepEqual(validateWaitlist({ ...validForm, team: 501 }), ['team']);
    assert.deepEqual(validateWaitlist({ ...validForm, comment: 'x'.repeat(501) }), ['comment']);
  });

  it('treats consent as valid only when strictly true', () => {
    assert.deepEqual(validateWaitlist({ ...validForm, consent: false }), ['consent']);
    assert.deepEqual(validateWaitlist({ ...validForm, consent: 'true' }), ['consent']);
    assert.deepEqual(validateWaitlist({ ...validForm, consent: 1 }), ['consent']);
    assert.deepEqual(validateWaitlist({ ...validForm, consent: undefined }), ['consent']);
  });

  it('accepts an empty comment and a team size given as a string', () => {
    assert.deepEqual(validateWaitlist({ ...validForm, comment: undefined, team: '0' }), []);
  });

  it('reports every field when called without arguments', () => {
    assert.deepEqual(validateWaitlist(), ['name', 'email', 'notation', 'team', 'consent']);
  });
});
