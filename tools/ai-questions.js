import { buildQuestions, checkCompletion, completeFromAnswers, describeQuestion } from '../site/js/utils/diagram-questions.js';

// The mode "clarify" of the AI endpoints: extra questions about a diagram and the completion of the diagram from the answers.
// The rules of site/js/utils/diagram-questions.js work without a key; the model only adds questions the rules do not know and
// refines the code with the answers to them. Every code the model returns goes through the project parser and is dropped when it is worse
// than the code it started from; the answer is then the result of the rules.
export const CLARIFY_LIMITS = { body: 120_000, code: 20_000, answers: 60, answer: 500, extra: 3, retries: 1 };
const STEPS = ['questions', 'complete'];
const KINDS = ['choice', 'text', 'yesno'];

const both = (value) => ({ ru: value, en: value });

// The first JSON array in the text of the model; anything else gives an empty list.
export const parseExtra = (raw) => {
  const text = /```[\w-]*\r?\n([\s\S]*?)```/.exec(raw)?.[1] ?? raw;
  const from = text.indexOf('[');
  const to = text.lastIndexOf(']');
  let list = [];
  try {
    list = JSON.parse(text.slice(from, to + 1));
  } catch {
    return [];
  }
  return list
    .filter((item) => item !== null && typeof item === 'object' && typeof item.text === 'string' && item.text.trim() !== '')
    .slice(0, CLARIFY_LIMITS.extra)
    .map((item, index) => {
      const options = (Array.isArray(item.options) ? item.options : []).filter((value) => typeof value === 'string' && value.trim() !== '').slice(0, 8);
      const kind = item.kind === 'choice' && options.length >= 2 ? 'choice' : item.kind === 'yesno' ? 'yesno' : 'text';
      return {
        id: `ai-${index + 1}`,
        kind,
        text: both(item.text.trim().slice(0, 300)),
        options: kind === 'choice' ? options.map((value) => ({ value, label: both(value) })) : [],
        target: { line: 0, id: '' },
        priority: 5,
      };
    });
};

// Checks the body; the answer is a message or null.
export const checkClarify = (body) => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { code: 'body', message: 'The body must be a JSON object' };
  if (!STEPS.includes(body.step)) return { code: 'step', message: `The step must be one of: ${STEPS.join(', ')}` };
  if (body.lang !== undefined && !['ru', 'en'].includes(body.lang)) return { code: 'lang', message: 'The language must be ru or en' };
  if (typeof body.code !== 'string' || body.code.trim() === '') return { code: 'code', message: 'The "code" is required' };
  if (body.code.length > CLARIFY_LIMITS.code) return { code: 'too-large', message: `The code is longer than ${CLARIFY_LIMITS.code} characters` };
  if (body.step === 'complete') {
    const list = body.answers;
    const fine =
      Array.isArray(list) &&
      list.length <= CLARIFY_LIMITS.answers &&
      list.every(
        (item) =>
          item !== null &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.answer === 'string' &&
          item.answer.length <= CLARIFY_LIMITS.answer,
      );
    if (!fine) return { code: 'answers', message: 'The "answers" must be a short list of { id, answer }' };
  }
  return null;
};

const rulesAnswer = (body) => {
  if (body.step === 'questions') return { questions: buildQuestions(body.code, body.notation).map(describeQuestion), source: 'rules' };
  return { ...completeFromAnswers(body.code, body.answers, body.notation), source: 'rules' };
};

const extraQuestions = async (c, body) => {
  const task = [
    'Read the DSLKit diagram and write up to 3 short clarifying questions about what is still missing or ambiguous in it.',
    'Do not repeat what the syntax checker finds (names, start, end, unlabeled links). Answer ONLY a JSON array of objects',
    `{"text": "...", "kind": "choice" | "text" | "yesno", "options": ["..."]}, no Markdown fence, written in ${body.lang === 'en' ? 'English' : 'Russian'}.`,
    `\nDiagram:\n${body.code}`,
  ].join(' ');
  const text = await c.ask(c.config, c.system(body.lang ?? 'ru'), [{ role: 'user', content: task }]);
  return parseExtra(text);
};

const refine = async (c, body, base, answers) => {
  const system = c.system(body.lang ?? 'ru');
  const pairs = answers.map((item) => `Q: ${item.text ?? item.id}\nA: ${item.answer}`).join('\n');
  const messages = [
    {
      role: 'user',
      content: `Complete the DSLKit diagram using the answers of the user. Keep everything that is correct. Answer with the whole code only.\n\nDiagram:\n${base}\n\nAnswers:\n${pairs}`,
    },
  ];
  for (let attempt = 1; attempt <= CLARIFY_LIMITS.retries + 1; attempt += 1) {
    const text = await c.ask(c.config, system, messages);
    const fenced = /```[\w-]*\r?\n([\s\S]*?)```/.exec(text);
    const code = (fenced ? fenced[1] : text).trim();
    const verdict = checkCompletion(base, code);
    if (verdict.ok) return { ...verdict, code, attempts: attempt };
    messages.push(
      { role: 'assistant', content: text },
      {
        role: 'user',
        content: `The code has more errors than before:\n${verdict.problems
          .filter((item) => item.severity === 'error')
          .map((item) => `line ${item.line}: ${item.message.en}`)
          .join('\n')}\nAnswer with the whole corrected code only.`,
      },
    );
  }
  return null;
};

// ctx: { req, res, config, ask, system, readBody, json, fail, rateLimited, dayExhausted } from the handler of ai-api.js.
export const handleClarify = async (c) => {
  const { req, res, config } = c;
  if (req.method !== 'POST') return c.fail(res, 405, 'method', 'Use POST', {}, { Allow: 'POST' });
  let body;
  try {
    body = JSON.parse(await c.readBody(req, CLARIFY_LIMITS.body));
  } catch (error) {
    if (error.status === 413) return c.fail(res, 413, 'too-large', 'The request is too large');
    return c.fail(res, 400, 'json', 'The body is not valid JSON');
  }
  const bad = checkClarify(body);
  if (bad) return c.fail(res, bad.code === 'too-large' ? 413 : 400, bad.code, bad.message);
  const rules = rulesAnswer(body);
  const aiAnswers = body.step === 'complete' ? body.answers.filter((item) => item.id.startsWith('ai-') && item.answer.trim() !== '') : [];
  const needsAi = body.step === 'questions' || aiAnswers.length > 0;
  if (config.key === '' || !needsAi) return c.json(res, 200, rules);
  const wait = c.rateLimited(req.socket?.remoteAddress ?? 'unknown');
  if (wait > 0) return c.fail(res, 429, 'rate-limit', 'Too many requests, try again later', {}, { 'Retry-After': String(wait) });
  if (c.dayExhausted(config.daily)) return c.fail(res, 429, 'daily-limit', 'The daily limit of AI requests is used up');
  try {
    if (body.step === 'questions')
      return c.json(res, 200, { ...rules, questions: [...rules.questions, ...(await extraQuestions(c, body))], source: 'ai', model: config.model });
    const base = rules.ok ? rules.code : body.code;
    const refined = await refine(c, body, base, aiAnswers);
    if (refined === null) return c.json(res, 200, { ...rules, fallback: true });
    return c.json(res, 200, {
      ...refined,
      ok: true,
      reason: '',
      applied: [...rules.applied, ...aiAnswers.map((item) => item.id)],
      source: 'ai',
      model: config.model,
    });
  } catch {
    return c.json(res, 200, { ...rules, fallback: true });
  }
};
