import en from './locales/en.js';
import ru from './locales/ru.js';

const DICTS = { en, ru };
const SUPPORTED = new Set(['en', 'ru']);
const COOKIE = 'lang';

// A plain English fallback: whenever a dictionary is missing a key (which should not happen once
// both locale files are kept in sync), the English string is shown rather than the bare key.
export const translate = (lang, key, vars) => {
  const dict = DICTS[lang] ?? DICTS.en;
  const entry = dict[key] ?? DICTS.en[key] ?? key;
  return typeof entry === 'function' ? entry(vars ?? {}) : entry;
};

const readCookie = (header = '', name) => {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
};

// Default is English and nothing is written unless a visitor actively asks for a language: a visitor
// who never touches ?lang sees the exact same page, in the exact same way, as before this module
// existed (no new cookie, no changed markup beyond the one switch link in the header).
// The query parameter wins over the cookie, so a link with ?lang=... in it always works, and it then
// updates the cookie so the choice is kept on the next visit, until the page is reached without the parameter.
export const i18n = (req, res, next) => {
  const requested = typeof req.query.lang === 'string' ? req.query.lang : undefined;
  const cookieLang = readCookie(req.headers.cookie, COOKIE);
  let lang = 'en';
  if (SUPPORTED.has(requested)) {
    lang = requested;
    res.append('Set-Cookie', `${COOKIE}=${lang}; Path=/; SameSite=Lax${req.secure ? '; Secure' : ''}`);
  } else if (SUPPORTED.has(cookieLang)) {
    lang = cookieLang;
  }
  res.locals.lang = lang;
  res.locals.t = (key, vars) => translate(lang, key, vars);
  // Hrefs for the RU/EN switch in the header: the current path and query, only the "lang" parameter changed.
  const asText = (value) => (Array.isArray(value) ? String(value[0] ?? '') : String(value ?? ''));
  const hrefFor = (target) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'lang') params.set(key, asText(value));
    }
    params.set('lang', target);
    return `${req.path}?${params.toString()}`;
  };
  res.locals.langHref = { ru: hrefFor('ru'), en: hrefFor('en') };
  next();
};
