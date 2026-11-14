// The languages of the site. The first one is the source language: its texts are the fallback of every dictionary.
// To add a language: put its code here, add its dictionaries (see docs/agent-reports/i18n-audit.en.md) and its page tree.
export const LANGUAGES = ['ru', 'en'];
export const DEFAULT_LANGUAGE = LANGUAGES[0];

// A language code of a caller (a page, a request) as one of the supported ones; an unknown or missing one gives the source language.
export const normalizeLanguage = (code) => (LANGUAGES.includes(code) ? code : DEFAULT_LANGUAGE);

// The language of a page is the lang attribute of its root element.
export const pageLanguage = (root = document) => normalizeLanguage(root.documentElement?.lang);

// The position of a language in LANGUAGES: the index of a text kept in a list [ru, en].
export const languageIndex = (code) => LANGUAGES.indexOf(normalizeLanguage(code));

// The text of a dictionary { ru, en } in a language; a messages table with {name} marks gets its values from params.
export const pick = (texts, code, params = {}) => texts[normalizeLanguage(code)].replace(/\{(\w+)\}/g, (_, name) => params[name]);

// Dates and numbers for the user go through Intl with the language of the page, in the time zone of the user.
export const formatDateTime = (ms, code) => new Intl.DateTimeFormat(normalizeLanguage(code), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms));
export const formatClock = (ms, code) => new Intl.DateTimeFormat(normalizeLanguage(code), { timeStyle: 'short' }).format(new Date(ms));
export const formatTime = (ms, code) => new Intl.DateTimeFormat(normalizeLanguage(code), { timeStyle: 'medium' }).format(new Date(ms));
export const formatNumber = (value, code, options) => new Intl.NumberFormat(normalizeLanguage(code), options).format(value);
