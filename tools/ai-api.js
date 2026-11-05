import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTATION_KEYS, formatProblem, parseDiagram } from '../site/js/notations/index.js';
import { listNotations } from './render-api.js';

// The AI endpoints of DSLKit: a description, a piece of code in another language or a picture becomes DSLKit code through the Claude API.
// The key is read only from the environment of the server (ANTHROPIC_API_KEY). It is never written to a file, a log or an answer.
// Every result is checked by parseDiagram; a result with errors goes back to the model with the list of problems, at most twice.
export const MODES = ['idea', 'code', 'image'];
export const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp', 'image/gif': 'gif' };
export const MAX_TEXT = 20_000;
export const MAX_RETRIES = 2;
export const DEFAULT_MODEL = 'claude-sonnet-5-5';
const DEFAULT_DAILY = 200;
const DEFAULT_IMAGE_MB = 5;
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60_000;
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const TIMEOUT_MS = 60_000;
const MAX_TOKENS = 4096;
const LANGS = ['ru', 'en'];
const REFERENCE_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'DSL-REFERENCE.en.md');
const MAX_REFERENCE = 40_000;

// The first bytes of a real picture of each kind: the declared type must match the content.
const SIGNATURES = {
  'image/png': (bytes) => bytes.length > 8 && bytes[0] === 0x89 && bytes.subarray(1, 4).toString('latin1') === 'PNG',
  'image/jpeg': (bytes) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/webp': (bytes) => bytes.length > 12 && bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP',
  'image/gif': (bytes) => bytes.length > 6 && /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('latin1')),
};

const positive = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const TASKS = {
  idea: 'Turn the description of the user into a diagram. Choose the most fitting notation unless one is named.',
  code: 'Convert the given code (Mermaid, PlantUML, Graphviz DOT, or plain text) into DSLKit code. Keep every element and link that DSLKit can express.',
  image: 'Read the picture of a diagram (or a sketch) and rebuild it as DSLKit code. Keep the labels as they are written in the picture.',
};

export const buildSystemPrompt = (reference, lang) => {
  const notations = listNotations('en')
    .map((item) => `- ${item.header}  (${item.name})`)
    .join('\n');
  return [
    'You write diagrams in DSLKit, a text language for diagrams. You answer with DSLKit code ONLY: no explanation, no Markdown fence, no comments about the work.',
    'The first line is the header `diagram <notation> ["Title"]` (UML adds the kind: `diagram uml class "Shop"`). One line is one element or one link.',
    `Use only these notations:\n${notations}`,
    `Write the labels in ${lang === 'en' ? 'English' : 'Russian'} unless the input uses another language. Identifiers may be Latin or Cyrillic letters, digits, "_" and "-"; labels go in double quotes.`,
    'Every link must point to declared elements. Give every diagram a start and an end where the notation has them.',
    `Language reference:\n${reference.slice(0, MAX_REFERENCE)}`,
  ].join('\n\n');
};

// The code of the model's answer: a fenced block when there is one, the whole text otherwise.
export const extractCode = (text) => {
  const fenced = /```[\w-]*\r?\n([\s\S]*?)```/.exec(text);
  return (fenced ? fenced[1] : text).trim();
};

const problemsOf = (code, lang) => {
  const model = parseDiagram(code);
  const problems = model.problems.map((item) => ({ line: item.line, severity: item.severity, code: item.code, message: formatProblem(item, lang) }));
  return { notation: model.notation ?? null, problems, errors: problems.filter((item) => item.severity === 'error') };
};

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
  return true;
};
const fail = (res, status, code, message, extra = {}, headers) => json(res, status, { error: { code, message }, ...extra }, headers);

// Reads the body up to a limit; a bigger body ends the read with status 413.
const readBody = (req, limit) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) return reject(Object.assign(new Error('too large'), { status: 413 }));
      return chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// The handler keeps its own counters, so a test (or a second server) never shares the limits of another.
export const createAiHandler = ({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now, readReference } = {}) => {
  const hits = new Map();
  const day = { key: '', count: 0 };
  const reference = readReference ?? (() => readFileSync(REFERENCE_FILE, 'utf8'));
  const settings = () => ({
    key: typeof env.ANTHROPIC_API_KEY === 'string' ? env.ANTHROPIC_API_KEY.trim() : '',
    model: (typeof env.AI_MODEL === 'string' && env.AI_MODEL.trim()) || DEFAULT_MODEL,
    daily: positive(env.AI_DAILY_LIMIT, DEFAULT_DAILY),
    imageBytes: positive(env.AI_MAX_IMAGE_MB, DEFAULT_IMAGE_MB) * 1024 * 1024,
  });

  // A sliding window per address: the times of the latest requests are kept, the old ones are forgotten.
  const rateLimited = (ip) => {
    const time = now();
    const recent = (hits.get(ip) ?? []).filter((at) => time - at < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) {
      hits.set(ip, recent);
      return Math.ceil((RATE_WINDOW_MS - (time - recent[0])) / 1000);
    }
    hits.set(ip, [...recent, time]);
    return 0;
  };
  const dayExhausted = (limit) => {
    const key = new Date(now()).toISOString().slice(0, 10);
    if (day.key !== key) Object.assign(day, { key, count: 0 });
    if (day.count >= limit) return true;
    day.count += 1;
    return false;
  };

  const ask = async ({ key, model }, system, messages) => {
    const answer = await fetchImpl(API_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': API_VERSION, 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!answer.ok) throw new Error('upstream status');
    const body = await answer.json();
    const text = (body.content ?? []).find((block) => block.type === 'text')?.text;
    if (typeof text !== 'string' || text.trim() === '') throw new Error('upstream empty');
    return text;
  };

  const firstMessage = ({ mode, text, notation, image, mediaType }) => {
    const parts = [];
    if (mode === 'image') parts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: image } });
    const wanted = notation ? `Notation: ${notation}.\n` : '';
    parts.push({ type: 'text', text: `${TASKS[mode]}\n${wanted}${text ? `\nInput:\n${text}` : ''}` });
    return { role: 'user', content: parts };
  };

  const generate = async (settingsNow, input, lang) => {
    const system = buildSystemPrompt(safeReference(), lang);
    const messages = [firstMessage(input)];
    let result = null;
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
      const text = await ask(settingsNow, system, messages);
      const code = extractCode(text);
      result = { code, attempts: attempt, ...problemsOf(code, lang) };
      if (result.errors.length === 0) return result;
      messages.push(
        { role: 'assistant', content: text },
        {
          role: 'user',
          content: `The code has errors. Fix them and answer with the whole corrected DSLKit code only.\n${result.errors.map((item) => `line ${item.line}: ${item.message}`).join('\n')}`,
        },
      );
    }
    return result;
  };
  const safeReference = () => {
    try {
      return reference();
    } catch {
      return '';
    }
  };

  // Validates the body; the answer is { input } or { status, code, message }.
  const check = (body, limits) => {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return { status: 400, code: 'body', message: 'The body must be a JSON object' };
    if (!MODES.includes(body.mode)) return { status: 400, code: 'mode', message: `The mode must be one of: ${MODES.join(', ')}` };
    if (body.lang !== undefined && !LANGS.includes(body.lang))
      return { status: 400, code: 'lang', message: `The language must be one of: ${LANGS.join(', ')}` };
    if (body.text !== undefined && typeof body.text !== 'string') return { status: 400, code: 'text', message: 'The "text" must be a string' };
    if (body.notation !== undefined && !(typeof body.notation === 'string' && (body.notation === 'auto' || NOTATION_KEYS.includes(body.notation))))
      return { status: 400, code: 'notation', message: 'Unknown notation' };
    const text = body.text ?? '';
    if (text.length > MAX_TEXT) return { status: 413, code: 'too-large', message: `The text is longer than ${MAX_TEXT} characters` };
    const input = { mode: body.mode, text: text.trim(), notation: body.notation === 'auto' ? undefined : body.notation };
    if (body.mode !== 'image') {
      if (input.text === '') return { status: 400, code: 'text', message: 'The "text" is required' };
      return { input };
    }
    if (!Object.hasOwn(IMAGE_TYPES, body.mediaType)) return { status: 415, code: 'media-type', message: 'Use a png, jpeg, webp or gif picture' };
    if (typeof body.image !== 'string' || !BASE64.test(body.image)) return { status: 400, code: 'image', message: 'The "image" must be base64 data' };
    const bytes = Buffer.from(body.image, 'base64');
    if (bytes.length > limits.imageBytes) return { status: 413, code: 'image-too-large', message: 'The picture is too large' };
    if (!SIGNATURES[body.mediaType](bytes)) return { status: 415, code: 'media-type', message: 'The file is not the picture it claims to be' };
    return { input: { ...input, image: body.image, mediaType: body.mediaType } };
  };

  return async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      if (pathname !== '/api/ai' && !pathname.startsWith('/api/ai/')) return false;
      const config = settings();
      if (pathname === '/api/ai/status') {
        if (req.method !== 'GET') return fail(res, 405, 'method', 'Use GET', {}, { Allow: 'GET' });
        return json(res, 200, { available: config.key !== '', model: config.model, maxImageMb: config.imageBytes / 1024 / 1024 });
      }
      if (pathname !== '/api/ai/generate') return fail(res, 404, 'not-found', `Unknown endpoint ${pathname}`);
      if (req.method !== 'POST') return fail(res, 405, 'method', 'Use POST', {}, { Allow: 'POST' });
      if (config.key === '') return fail(res, 503, 'no-key', 'The AI is not connected: the server has no key');
      let body;
      try {
        body = JSON.parse(await readBody(req, Math.ceil(config.imageBytes * 1.4) + MAX_TEXT * 4 + 4096));
      } catch (error) {
        if (error.status === 413) return fail(res, 413, 'too-large', 'The request is too large');
        return fail(res, 400, 'json', 'The body is not valid JSON');
      }
      const checked = check(body, config);
      if (checked.input === undefined) return fail(res, checked.status, checked.code, checked.message);
      const wait = rateLimited(req.socket?.remoteAddress ?? 'unknown');
      if (wait > 0) return fail(res, 429, 'rate-limit', 'Too many requests, try again later', {}, { 'Retry-After': String(wait) });
      if (dayExhausted(config.daily)) return fail(res, 429, 'daily-limit', 'The daily limit of AI requests is used up');
      let result;
      try {
        result = await generate(config, checked.input, body.lang ?? 'ru');
      } catch {
        return fail(res, 502, 'upstream', 'The AI service failed, try again later');
      }
      if (result.errors.length > 0) {
        return fail(res, 422, 'invalid-dsl', 'The AI did not return correct DSLKit code', {
          code: result.code,
          problems: result.problems,
          attempts: result.attempts,
        });
      }
      return json(res, 200, {
        code: result.code,
        notation: result.notation,
        warnings: result.problems.filter((item) => item.severity !== 'error'),
        attempts: result.attempts,
        model: config.model,
      });
    } catch {
      return fail(res, 500, 'internal', 'The request could not be processed');
    }
  };
};

export const handleAi = createAiHandler();
