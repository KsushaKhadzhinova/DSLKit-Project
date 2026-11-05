import { NOTATIONS, NOTATION_KEYS, formatProblem, generate, parseDiagram, pickFormat, renderNotation } from '../site/js/notations/index.js';

// The own rendering API of DSLKit: the same parsers and renderers as the editor, served over HTTP, so no outside service is needed.
export const MAX_SOURCE = 100_000;
// A source with more lines than this is refused: parsing and drawing run in the one thread of the server, a huge diagram would stop every other request.
export const MAX_LINES = 2000;

// Other diagram languages are drawn by an external Kroki-compatible service, reached through this server so the page keeps one origin.
export const EXTERNAL_TYPES = [
  'graphviz',
  'mermaid',
  'plantuml',
  'c4plantuml',
  'd2',
  'nomnoml',
  'ditaa',
  'svgbob',
  'blockdiag',
  'seqdiag',
  'actdiag',
  'nwdiag',
  'packetdiag',
  'rackdiag',
  'bytefield',
  'erd',
  'pikchr',
  'structurizr',
  'vega',
  'vegalite',
  'wavedrom',
  'dbml',
  'excalidraw',
  'bpmn',
];
// A source of MAX_SOURCE characters may take six bytes per character once it is escaped in JSON.
const MAX_BODY = MAX_SOURCE * 6 + 1024;
// What an outside service may send back: a drawing up to 5 million characters, with no script, no event handler and no javascript: address.
const MAX_EXTERNAL = 5_000_000;
const UNSAFE_SVG = /<script|\son[a-z]+\s*=|javascript:/i;
const EXTERNAL_TIMEOUT_MS = 10_000;

export const GRAMMAR = [
  'source     = header , { line } ;',
  'header     = "diagram" , notation , [ kind ] , [ string ] ;',
  'notation   = "idef0" | "dfd" | "erd" | "bpmn" | "uml" | ... ;  (GET /api/notations lists all)',
  'kind       = word ;                      (only after "uml": class, sequence, state, ...)',
  'line       = comment | declaration | relation | block-end ;',
  'comment    = "//" , { any } ;',
  'declaration= keyword , id , [ string ] , { attribute } ;',
  'relation   = id , [ "." , port ] , arrow , id , [ "." , port ] , [ string ] ;',
  'attribute  = word , [ "=" , value ] ;',
  'id         = letter-or-digit , { letter-or-digit | "." | "-" } ;',
  'string     = \'"\' , { char | "\\\\" , any } , \'"\' ;',
].join('\n');

const LANGS = ['ru', 'en'];
const FORMATS = ['graphviz', 'mermaid', 'plantuml'];
const langOf = (value) => (LANGS.includes(value) ? value : 'ru');

export const listNotations = (lang = 'ru') =>
  NOTATION_KEYS.map((id) => {
    const entry = NOTATIONS[id];
    const header = id.startsWith('uml-') ? `diagram uml ${id.slice(4)}` : `diagram ${id}`;
    return {
      id,
      short: entry.short,
      name: entry.name[langOf(lang)],
      header,
      formats: Object.keys(entry.generators),
      nodes: entry.nodes ?? null,
      edges: entry.edges ?? null,
    };
  });

// Reads a source and reports every problem with its line, severity and a ready message.
export const analyze = (source, lang = 'ru') => {
  const model = parseDiagram(source);
  const problems = model.problems.map((item) => ({ line: item.line, severity: item.severity, code: item.code, message: formatProblem(item, langOf(lang)) }));
  return { model, problems, valid: !problems.some((item) => item.severity === 'error') };
};

export const renderSource = (source, lang = 'ru') => {
  const { model, problems, valid } = analyze(source, lang);
  return { notation: model.notation ?? null, valid, problems, svg: model.notation === null ? null : renderNotation(model) };
};

export const generateSource = (source, format, lang = 'ru') => {
  const { model, problems, valid } = analyze(source, lang);
  if (model.notation === null) return { notation: null, valid, problems, format: null, text: null };
  const chosen = pickFormat(model, format);
  return { notation: model.notation, valid, problems, format: chosen, text: generate(model, chosen) };
};

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
  return true;
};
const fail = (res, status, code, message, headers) => json(res, status, { error: { code, message } }, headers);

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) return reject(Object.assign(new Error('too large'), { status: 413 }));
      return chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

// Accepts {"source": "..."} as JSON or the bare source as text/plain.
const readInput = async (req) => {
  const raw = await readBody(req);
  if (!String(req.headers['content-type'] ?? '').includes('application/json')) return { source: raw };
  try {
    const body = JSON.parse(raw);
    return body !== null && typeof body === 'object' ? body : {};
  } catch {
    throw Object.assign(new Error('invalid json'), { status: 400 });
  }
};

const POST_ROUTES = {
  '/api/validate': ({ source, lang }) => {
    const { model, problems, valid } = analyze(source, lang);
    return { notation: model.notation ?? null, valid, problems };
  },
  '/api/parse': ({ source, lang }) => {
    const { model, problems, valid } = analyze(source, lang);
    return { notation: model.notation ?? null, valid, problems, model };
  },
  '/api/generate': ({ source, lang, format }) => generateSource(source, format, lang),
};

const external = async (res, { fetchImpl, krokiUrl, type, source }) => {
  let answer;
  try {
    answer = await fetchImpl(`${krokiUrl}/${type}/svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: source,
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    });
  } catch (error) {
    return error.name === 'TimeoutError'
      ? fail(res, 504, 'upstream-timeout', 'The drawing service did not answer in time')
      : fail(res, 502, 'upstream', 'The drawing service is not reachable');
  }
  const text = await answer.text();
  if (!answer.ok) return fail(res, answer.status === 400 ? 422 : 502, 'upstream-error', `The drawing service answered ${answer.status}`);
  if (text.length > MAX_EXTERNAL || UNSAFE_SVG.test(text))
    return fail(res, 502, 'upstream-unsafe', 'The drawing service answered with a diagram that is too large or not safe');
  if (!/^\s*(<\?xml[^>]*>\s*)?(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(text))
    return fail(res, 502, 'upstream-invalid', 'The drawing service did not return a diagram');
  res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
  return true;
};

// Returns true when the request belongs to the API (and was answered), false for any other path.
export const handleApi = async (req, res, { fetchImpl = globalThis.fetch, krokiUrl = process.env.KROKI_URL ?? 'https://kroki.io' } = {}) => {
  try {
    const { pathname, searchParams } = new URL(req.url, 'http://localhost');
    if (pathname !== '/api' && !pathname.startsWith('/api/')) return false;
    if (pathname === '/api/notations' || pathname === '/api/grammar') {
      if (req.method !== 'GET') return fail(res, 405, 'method', 'Use GET', { Allow: 'GET' });
      json(
        res,
        200,
        pathname === '/api/grammar'
          ? { grammar: GRAMMAR, header: 'diagram <notation> ["Title"]' }
          : { notations: listNotations(searchParams.get('lang') ?? 'ru') },
      );
      return true;
    }
    if (pathname === '/api/engines') {
      if (req.method !== 'GET') return fail(res, 405, 'method', 'Use GET', { Allow: 'GET' });
      return json(res, 200, {
        own: { id: 'dslkit', endpoint: '/api/render', notations: NOTATION_KEYS.length },
        external: EXTERNAL_TYPES.map((type) => ({ id: type, endpoint: `/api/external/${type}` })),
      });
    }
    if (pathname.startsWith('/api/external/')) {
      const type = pathname.slice('/api/external/'.length);
      if (!EXTERNAL_TYPES.includes(type)) return fail(res, 404, 'not-found', `Unknown language ${type}`);
      if (req.method !== 'POST') return fail(res, 405, 'method', 'Use POST', { Allow: 'POST' });
      const input = await readInput(req);
      if (typeof input.source !== 'string' || input.source.trim() === '') return fail(res, 400, 'source', 'The "source" text is required');
      if (input.source.length > MAX_SOURCE) return fail(res, 413, 'too-large', `The source is longer than ${MAX_SOURCE} characters`);
      return await external(res, { fetchImpl, krokiUrl, type, source: input.source });
    }
    if (pathname !== '/api/render' && !(pathname in POST_ROUTES)) return fail(res, 404, 'not-found', `Unknown endpoint ${pathname}`);
    if (req.method !== 'POST') return fail(res, 405, 'method', 'Use POST', { Allow: 'POST' });
    const input = await readInput(req);
    if (typeof input.source !== 'string' || input.source.trim() === '') return fail(res, 400, 'source', 'The "source" text is required');
    if (input.source.length > MAX_SOURCE) return fail(res, 413, 'too-large', `The source is longer than ${MAX_SOURCE} characters`);
    if (input.source.split('\n').length > MAX_LINES) return fail(res, 422, 'too-complex', `The source has more than ${MAX_LINES} lines`);
    // A wrong language or format is an error of the caller, not something to hide behind a default.
    if (input.lang !== undefined && !LANGS.includes(input.lang)) return fail(res, 400, 'lang', `The language must be one of: ${LANGS.join(', ')}`);
    if (pathname === '/api/generate' && input.format !== undefined && !FORMATS.includes(input.format))
      return fail(res, 400, 'format', `The format must be one of: ${FORMATS.join(', ')}`);
    const lang = langOf(input.lang);
    if (pathname === '/api/render') {
      const result = renderSource(input.source, lang);
      if (result.svg === null) return json(res, 422, { error: { code: 'unknown-notation', message: result.problems[0].message }, problems: result.problems });
      if (String(req.headers.accept ?? '').includes('image/svg+xml')) {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(result.svg);
      } else json(res, 200, result);
      return true;
    }
    json(res, 200, POST_ROUTES[pathname]({ source: input.source, lang, format: input.format }));
    return true;
  } catch (error) {
    if (error.status === 413) return fail(res, 413, 'too-large', `The request is longer than ${MAX_SOURCE} characters`);
    if (error.status === 400) return fail(res, 400, 'json', 'The body is not valid JSON');
    return fail(res, 500, 'internal', 'The source could not be processed');
  }
};
