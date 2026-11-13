// The languages of the site. The first one is the source language: its texts are the fallback of every dictionary.
// To add a language: put its code here, add its dictionaries (see docs/agent-reports/i18n-audit.en.md) and its page tree.
export const LANGUAGES = ['ru', 'en'];
export const DEFAULT_LANGUAGE = LANGUAGES[0];

// The language of a page is the lang attribute of its root element; an unknown or missing one gives the source language.
export const pageLanguage = (root = document) => {
  const code = root.documentElement?.lang;
  return LANGUAGES.includes(code) ? code : DEFAULT_LANGUAGE;
};
