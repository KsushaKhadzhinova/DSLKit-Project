import { checkCode, reviewCode } from '../site/js/utils/diagram-review.js';

// The AI layer of the review "Check and fix" (the mode "review" of /api/ai/generate).
// The deterministic review (site/js/utils/diagram-review.js) is always done first and always returned; the model only adds variants on top of it.
// Every variant of the model goes through the same validator as the code of the user and is dropped unless it has fewer problems than the original.
// Without a key, with a failing service or with an answer that is not usable the result is the deterministic review alone.
export const MAX_AI_VARIANTS = 2;
const MAX_CODE = 20_000;
const MAX_TITLE = 120;
const MAX_CHANGE = 200;
const MAX_CHANGES = 8;

export const buildReviewSystem = (reference, lang) =>
  [
    'You review diagrams written in DSLKit, a text language for diagrams, and you offer corrected variants of the code.',
    'Answer with JSON ONLY, no Markdown fence and no comment: {"variants":[{"title":"short name","code":"the whole corrected DSLKit code","changes":["what was changed"]}]}.',
    `Offer at most ${MAX_AI_VARIANTS} variants. Each variant is the WHOLE code, starts with the header \`diagram <notation> ["Title"]\` and keeps the notation of the original.`,
    'Fix the listed problems first, then anything else that is wrong by the rules of the notation. Keep the meaning, the labels and the language of the original; do not invent new content.',
    `Write the titles and the changes in ${lang === 'en' ? 'English' : 'Russian'}.`,
    `Language reference:\n${String(reference).slice(0, 40_000)}`,
  ].join('\n\n');

export const buildReviewTask = (code, issues, lang) => {
  const listed = issues
    .filter((item) => item.severity !== 'info')
    .map((item) => `- line ${item.line} [${item.severity}] ${item.message[lang === 'en' ? 'en' : 'ru']}`)
    .join('\n');
  return `Review this DSLKit code.\nProblems found by the parser:\n${listed || '- none'}\n\nCode:\n${code}`;
};

// The variants of an answer: the JSON object or array inside the text, however the model wrapped it.
export const parseVariants = (text) => {
  const start = String(text).search(/[[{]/);
  const end = Math.max(String(text).lastIndexOf('}'), String(text).lastIndexOf(']'));
  if (start < 0 || end < start) return [];
  try {
    const data = JSON.parse(String(text).slice(start, end + 1));
    return Array.isArray(data) ? data : (data.variants ?? []);
  } catch {
    return [];
  }
};

const words = (value, limit) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');

// The variants that are usable: whole code, different from the original and from each other, with fewer problems than the original.
export const acceptVariants = (list, original, taken = []) => {
  const before = checkCode(original);
  const seen = new Set([original.trim(), ...taken.map((code) => code.trim())]);
  const accepted = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const code = words(item?.code, MAX_CODE);
    if (accepted.length >= MAX_AI_VARIANTS || code === '' || seen.has(code)) return;
    const after = checkCode(code);
    const better = after.errors < before.errors || (after.errors === before.errors && after.warnings < before.warnings);
    if (!better) return;
    seen.add(code);
    const title = words(item.title, MAX_TITLE);
    const changes = (Array.isArray(item.changes) ? item.changes : [])
      .map((change) => words(change, MAX_CHANGE))
      .filter(Boolean)
      .slice(0, MAX_CHANGES);
    accepted.push({
      id: `ai-${accepted.length + 1}`,
      source: 'ai',
      title: { ru: title || 'Вариант ИИ', en: title || 'AI variant' },
      code,
      changes: changes.map((text) => ({ rule: 'ai', line: null, ru: text, en: text })),
      errors: after.errors,
      warnings: after.warnings,
    });
  });
  return accepted;
};

// `ask(system, messages)` returns the text of the model; without it (no key) only the deterministic review is returned.
export const reviewWithAi = async ({ code, lang = 'ru', ask, reference = '', model = '' }) => {
  const base = reviewCode(code, { lang });
  const result = { ...base, ai: false, model };
  if (typeof ask !== 'function') return result;
  try {
    const answer = await ask(buildReviewSystem(reference, lang), [{ role: 'user', content: buildReviewTask(code, base.issues, lang) }]);
    const extra = acceptVariants(
      parseVariants(answer),
      code,
      base.variants.map((variant) => variant.code),
    );
    return { ...result, ai: true, variants: [...base.variants, ...extra] };
  } catch {
    return { ...result, aiError: 'upstream' };
  }
};
