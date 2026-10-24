import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './auth';

// The return address after sign-in comes from the history state. Whatever it holds, the user must stay on this site.
describe('safeReturnPath against open redirects', () => {
  it.each([
    '//evil.test',
    '///evil.test',
    '/\\evil.test',
    '/a\\evil.test',
    '\\\\evil.test',
    '\\/evil.test',
    '/\t/evil.test',
    '/\n/evil.test',
    '/\r/evil.test',
    '/ /evil.test',
    '/\u0000/evil.test',
    '/​/evil.test'.replace('​', '\u0085'),
    'https://evil.test',
    'http://evil.test/dashboard',
    'javascript:alert(1)',
    'data:text/html,x',
    '',
    'dashboard',
    '/login',
    '/logout',
    '/login?next=/x',
    null,
    undefined,
    42,
    {},
    ['/dashboard'],
  ])('%j falls back to the dashboard', (value) => {
    expect(safeReturnPath(value)).toBe('/dashboard');
  });

  it.each(['/dashboard', '/catalog/3', '/catalog?type=bpmn', '/admin#top', '/catalog/%D0%B0'])('%s is kept', (value) => {
    expect(safeReturnPath(value)).toBe(value);
  });
});
