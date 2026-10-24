// A return address must be a path on this site. "//host", "https://host" and the login or register pages themselves are not followed.
// A backslash, a space or a control character anywhere is refused too: browsers drop tabs and line breaks from an address and read a backslash as a slash,
// so "/\t/host" or "/a\\b" could turn into "//host".
const UNSAFE_PATH_CHARACTER = /[\u0000- \u007f-\u009f\\]/;
const AUTH_PAGES = /^\/(login|register|401)([?#]|$)/;

export function safeReturnPath(value, fallback = '/diagrams') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || UNSAFE_PATH_CHARACTER.test(value)) return fallback;
  return AUTH_PAGES.test(value) ? fallback : value;
}
