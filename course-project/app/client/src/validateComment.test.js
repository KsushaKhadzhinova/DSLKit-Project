import { describe, expect, it } from 'vitest';
import { validateComment } from './utils/validation';

describe('validateComment', () => {
  it('accepts normal text, line breaks, tabs and the largest allowed length', () => {
    expect(validateComment('Looks good')).toBeNull();
    expect(validateComment('one\ntwo\tthree')).toBeNull();
    expect(validateComment('x'.repeat(1000))).toBeNull();
  });

  it('refuses an empty text, spaces only and a text over 1000 characters', () => {
    expect(validateComment('')).toBe('Введите комментарий');
    expect(validateComment('   \n ')).toBe('Введите комментарий');
    expect(validateComment('x'.repeat(1001))).toBe('Комментарий не длиннее 1000 символов');
  });

  it('refuses control characters like the server does', () => {
    for (const bad of ['a\u0000b', 'a\u001bb', 'a\u0007b', 'a\u007fb']) expect(validateComment(bad)).toBe('Уберите управляющие символы');
  });
});
