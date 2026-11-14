// The provider layer of the AI endpoints. The callers build Anthropic-shaped messages (text, image and PDF document blocks)
// and get the text of the answer back; this module sends them to the Anthropic Messages API or to any OpenAI-compatible
// Chat Completions API (Gemini, Groq, OpenRouter, Mistral). The key goes only into the request header: it is never
// logged, never put into an error and never returned.
export const PROVIDERS = ['anthropic', 'openai'];
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const TIMEOUT_MS = 60_000;
const MAX_TOKENS = 4096;
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export const PDF_MESSAGE = 'PDF needs the Anthropic provider / Для PDF нужен провайдер Anthropic';

// https only; plain http is allowed for a local server (tests, Ollama and the like).
export const checkBaseUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.username !== '' || url.password !== '') return false;
    return url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname));
  } catch {
    return false;
  }
};

const textOf = (content) =>
  (Array.isArray(content) ? content : [content])
    .map((part) => (typeof part === 'string' ? part : part?.text))
    .filter((part) => typeof part === 'string')
    .join('');

// One Anthropic block becomes one OpenAI content part.
const toPart = (block) => {
  if (block.type === 'text') return { type: 'text', text: block.text };
  if (block.type === 'image') return { type: 'image_url', image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } };
  throw Object.assign(new Error(PDF_MESSAGE), { code: 'pdf-provider' });
};

export const toOpenAiMessages = (system, messages) => [
  { role: 'system', content: system },
  ...messages.map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : message.content.map(toPart),
  })),
];

export const createAsk = ({ provider = 'anthropic', key, baseUrl = '', model, fetchImpl = globalThis.fetch }) => {
  if (provider === 'anthropic') {
    return async (system, messages) => {
      const answer = await fetchImpl(ANTHROPIC_URL, {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': API_VERSION, 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], messages }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'error',
      });
      if (!answer.ok) throw new Error('upstream status');
      const body = await answer.json();
      const text = (body.content ?? []).find((block) => block.type === 'text')?.text;
      if (typeof text !== 'string' || text.trim() === '') throw new Error('upstream empty');
      return text;
    };
  }
  if (provider !== 'openai') throw new Error('unknown provider');
  if (!checkBaseUrl(baseUrl)) throw new Error('The base URL must be https');
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  return async (system, messages) => {
    const payload = JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: toOpenAiMessages(system, messages) });
    const answer = await fetchImpl(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error',
    });
    if (!answer.ok) throw new Error('upstream status');
    const body = await answer.json();
    const text = textOf(body.choices?.[0]?.message?.content ?? '');
    if (text.trim() === '') throw new Error('upstream empty');
    return text;
  };
};
