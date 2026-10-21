# Laboratory Work No. 6. Working with Browser APIs and Asynchronous Operations

## 1 Purpose of the Work

To master asynchronous programming in JavaScript, the Fetch API, the JSON format and client-side data storage on the example of integrating an external API into the DSLKit project, a web editor for diagrams as code that belongs to the SaaS direction and matches the future course project.

## 2 Brief Theoretical Background

**Asynchrony.** JavaScript runs in a single thread, and long operations (network, timers) are handed to the browser. When an operation finishes, the event loop puts its handler into a queue and calls it when the call stack is empty.

**Promise and async/await.** A Promise represents a result that will appear later and is in one of the states: pending, fulfilled or rejected. The `async/await` syntax lets asynchronous code read like sequential code, and errors are caught by a `try/catch` block.

**Fetch API.** The `fetch` function sends an HTTP request and returns a Promise with a `Response` object. It rejects only on a network error, so the response status must be checked through `response.ok`. The body is read with `json()` and `text()`, and a request is cancelled through `AbortController`.

**JSON and LocalStorage.** Objects become strings with `JSON.stringify` and are restored with `JSON.parse`. LocalStorage keeps strings under keys, works synchronously and holds a few megabytes, so a cache needs a time to live and a size limit.

**Security.** Keys in client code are visible to everyone, so secrets are not kept in a repository, and a foreign response is treated as untrusted. The browser allows a request to another domain only when the server answers with CORS headers.

## 3 Work Progress

### 3.1 Choosing the API and File Structure

The work is done in the branch `feature/async-api-storage`. The open Kroki API (`https://kroki.io`) is chosen for the project: it draws diagrams from text, which is the same task DSLKit solves, so it can be used in the course project too. No key or registration is needed. Two requests are used: `GET /health` checks that the service is available, and `POST /graphviz/svg` accepts Graphviz DOT text and returns an SVG image. The file structure matches the assignment and is shown in table 1.

Table 1 – Structure of the API integration code in the DSLKit project

| File | Purpose |
|---|---|
| `js/api/config.js` | Service address, response format, timeout, number of retries, cache lifetime |
| `js/api/apiService.js` | Requests `fetchData`, `postData`, `checkHealth`, `renderDiagram` and the `ApiError` class |
| `js/storage/localStorage.js` | Read and write wrappers, a cache with a lifetime, the run history |
| `js/utils/dataParser.js` | DSL parsing, DOT building, cache key, SVG cleaning |
| `js/engines/engines.js`, `js/engines/local-engine.js` | The list of generation engines and the own engine that draws in the browser |
| `js/components/diagram-runner.js` | Engine choice from the settings, buttons, loading indicator, error messages, offline mode |
| `js/script.js` | Entry point that starts the component together with the others |

### 3.2 Request Service

The function `createApi` takes a configuration, a `fetch` function and a pause function, so tests replace the network with fake responses. Every request attempt gets its own `AbortController`: it fires on a ten-second timeout or on a signal from the calling code. Errors are turned into the `ApiError` class with the kind `network`, `timeout`, `aborted`, `http` or `invalid`, and the code picks the user message by the kind.

Network errors, code 429 and codes 5xx are retried up to three times with a pause that doubles after each attempt, and for code 429 the `Retry-After` header is respected. A timeout is not retried: the attempt has already used the whole time limit, so an error of the kind `timeout` is returned at once. Client errors such as 400 and 404 are not retried. Identical parallel requests without an abort signal share one Promise. The function `renderDiagram` additionally checks that the response contains `svg` markup and otherwise returns an error of the kind `invalid`.

### 3.3 Storage

The diagram cache keeps the save time together with the data, so the lifetime of 24 hours is checked on reading, and when the cache is full the oldest entries are removed. The run history keeps the last five results without repeats. Both modules work through the shared `storage.js` layer from laboratory work 5, which wraps reads and writes in `try/catch` and returns a fallback value for corrupted data. The keys are named `diagram_cache`, `run_history` and `favorites`.

### 3.4 Data Conversion

The module `dataParser.js` reads the code from the editor: the `diagram` header, `box` blocks with the ports `input`, `control`, `output`, `mechanism`, and `arrow` lines. Unknown lines do not stop a run and go to a list of skipped lines. The model is turned into Graphviz DOT text with quotes, backslashes and line breaks escaped. The server response is treated as untrusted, so before showing it the tags `script`, `foreignObject`, `style`, `use`, `image` and animations, the `on*` attributes, unsafe styles and every `href` link except internal and `http(s)` ones are removed from the SVG. Before a link is checked, control characters are stripped from it because browsers ignore them.

Generation is not limited to a picture from a server. The engine is chosen on the settings page (the field "Diagram generation engine") and read again on every run. Three engines work through Kroki (Graphviz, Mermaid, PlantUML), and the own engine `local-engine.js` places the boxes in columns itself, draws arrows, labels and tooltips, and returns live SVG with separate `g`, `rect` and `text` elements. It sends no requests, so it works without the internet. For the other engines the same model is turned into DOT, Mermaid and PlantUML text, and the choice is kept in the site settings in LocalStorage.

### 3.5 Interface Integration

The editor canvas gets the buttons "Draw with Kroki" and "Refresh from server", a status line with `aria-live`, a line about service availability and a list of the last runs. While a request runs, the canvas has `aria-busy` and the status line shows the loading text; the buttons stay available so keyboard focus is not lost, and a new run cancels the previous request. The page starts a diagram by itself when it opens, and a new engine chosen in the settings is applied from the next run. A successful result is shown in figure 1.

![Diagram received from Kroki](figures/kroki-diagram.jpg)

Figure 1 – Editor: the diagram is received from the Kroki service and saved, and a history entry has appeared

A repeated run with the same code takes the saved copy without a request, and the "Refresh from server" button ignores the cache. When a request fails and a copy exists, the canvas shows it with the label "Cached data". Without a copy the user sees a clear message: the server is unavailable, the waiting time is over, too many requests or an unexpected response. Offline mode is shown in figure 2.

![Saved copy without a connection](figures/offline-cache.jpg)

Figure 2 – Offline mode: the diagram is shown from LocalStorage with the label "Cached data"

A new run cancels the previous request through `AbortController`, and a cancelled request neither shows an error nor removes the loading indicator of the new one.

### 3.6 Security and Errors

Kroki needs no key, so the repository holds no secrets. For future APIs the files `.env.local` and `site/js/api/config.local.js` are added to `.gitignore`. All requests are wrapped in error handling, details go to the console, and the user gets a short message. The browser request to Kroki is allowed by the CORS policy of the service itself, and the page checks availability through `GET /health`.

### 3.7 Testing

Automated tests are written for the request service, the storage, the data parsing and the component. The network is replaced by a fake `fetch`, so the tests check success, codes 404, 429 and 503, retries with pauses, a timeout, cancellation, merging of identical requests, a wrong response and corrupted storage. Coverage of all JavaScript files is 100 percent for lines, branches and functions. The integration is additionally checked in Chrome with the real Kroki service: the diagram is received, the entry lands in LocalStorage, and offline mode shows the saved copy. The timeout behaviour was checked without a browser by the script `tools/evidence/l6-timeout.mjs`: it calls the `createApi` client with a Mermaid diagram and counts `fetch` calls. The kroki.io service was reachable: a normal request took one call, and a request with a 1 ms timeout made exactly one call and returned the error `timeout` with the text "Request timed out" after 13 ms. The real service cannot be made to return a 5xx on demand, so the other cases ran against a local stub: with a hanging response and a 300 ms timeout there was one request and a `timeout` error after 335 ms; with two 503 answers followed by 200 the client sent three requests with pauses of 50 and 100 ms and the result arrived; with a permanent 503 the client sent four requests (the first plus three retries) with pauses of 50, 100 and 200 ms, then an `http` error with status 503. Screenshots of the Network and Application tabs and testing in Firefox and Edge remain a task for the acceptance stage.

### 3.8 Committing the Changes

The commit with the implementation: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/2102742. The commit message: `feat: integrate external API, caching and localStorage for SaaS diagram editor`.

### 3.9 Checking in DevTools

The work was checked in Chrome 155: requests in the Network tab and storage in the Application panel. The storage keys are named after the data (`diagram_cache`, `run_history`) instead of `cached_products` and `search_history` from the assignment example, because the project stores diagrams, not products.

The request to the service is shown in Figure 3: the POST method to kroki.io/graphviz/svg, status 200 and the response type image/svg+xml.

![DevTools screenshot](figures/devtools-01-kroki-request.png)

Figure 3 – The Network tab: the request to Kroki

The sent request body is shown in Figure 4: it is the DOT text built from the DSL.

![DevTools screenshot](figures/devtools-02-kroki-payload.png)

Figure 4 – The Payload tab: the DOT text sent to Kroki

The storage is shown in Figure 5: the diagram cache dslkit.diagram_cache and the run log dslkit.run_history, as well as the editor tab and view.

![DevTools screenshot](figures/devtools-03-local-storage.png)

Figure 5 – The Application panel: the editor LocalStorage

The error state is shown in Figure 6: with the service unavailable and an empty cache the editor reports the problem and keeps the work area.

![DevTools screenshot](figures/error-no-cache.png)

Figure 6 – The editor with the service unavailable and an empty cache

## Conclusion

The open Kroki API is connected to the DSLKit project: the diagram code from the editor becomes Graphviz DOT, is sent with a `POST` request, and the received SVG is cleaned and drawn on the canvas. Requests run with a timeout, retries and cancellation, results are saved in LocalStorage for 24 hours, and without a connection a saved copy is shown with a label. Automated tests cover all the code, and the integration is confirmed in a browser with the real service. What remains is to attach screenshots of the developer tools and to check the pages in Firefox and Edge.

## Appendix A – Listing of config.js

```js
// Kroki renders diagrams from text and needs no API key, so nothing secret lives in the repository.
export const API_CONFIG = {
  baseUrl: 'https://kroki.io',
  diagramType: 'graphviz',
  outputFormat: 'svg',
  timeoutMs: 10000,
  retries: 3,
  retryDelayMs: 300,
  maxRetryDelayMs: 5000,
  cacheTtlMs: 24 * 60 * 60 * 1000,
};
```

## Appendix B – Listing of apiService.js

```js
import { API_CONFIG } from './config.js';

export class ApiError extends Error {
  constructor(message, { kind, status = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error) => error.kind === 'network' || error.status === 429 || (error.status !== null && error.status >= 500);

const retryAfterMs = (response, fallback, max) => {
  const seconds = Number(response?.headers?.get?.('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, max) : fallback;
};

export const createApi = ({ config = API_CONFIG, fetchImpl = globalThis.fetch?.bind(globalThis), sleep = defaultSleep } = {}) => {
  const inflight = new Map();

  // One attempt: the caller's signal and the timeout both abort the same fetch.
  const attempt = async (url, { method, body, headers, signal, timeoutMs }) => {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    let response;
    try {
      response = await fetchImpl(url, { method, body, headers, signal: controller.signal });
    } catch {
      cleanup();
      if (timedOut) throw new ApiError('Request timed out', { kind: 'timeout' });
      if (signal?.aborted) throw new ApiError('Request was cancelled', { kind: 'aborted' });
      throw new ApiError('Network error', { kind: 'network' });
    }
    cleanup();
    if (!response.ok) {
      const error = new ApiError(`HTTP ${response.status}`, { kind: 'http', status: response.status });
      error.response = response;
      throw error;
    }
    return response;
  };

  // Retries network failures, 429 and 5xx (a timeout is final, it already took the whole time limit) up to `retries` times with exponential backoff.
  const send = async (path, { method = 'GET', body, headers = {}, signal, timeoutMs = config.timeoutMs, retries = config.retries, parse = 'text' } = {}) => {
    const url = `${config.baseUrl}${path}`;
    const tryOnce = async (attemptNumber) => {
      try {
        const response = await attempt(url, { method, body, headers, signal, timeoutMs });
        try {
          return parse === 'json' ? await response.json() : await response.text();
        } catch {
          throw new ApiError('The response could not be read', { kind: 'invalid' });
        }
      } catch (error) {
        if (!isRetryable(error) || attemptNumber >= retries) throw error;
        const backoff = Math.min(config.retryDelayMs * 2 ** attemptNumber, config.maxRetryDelayMs);
        await sleep(retryAfterMs(error.response, backoff, config.maxRetryDelayMs));
        if (signal?.aborted) throw new ApiError('Request was cancelled', { kind: 'aborted' });
        return tryOnce(attemptNumber + 1);
      }
    };
    return tryOnce(0);
  };

  // Identical parallel requests without a signal share one promise; requests with a signal stay separate so cancelling one cannot break another.
  const request = (path, options = {}) => {
    if (options.signal) return send(path, options);
    const key = `${options.method ?? 'GET'} ${options.parse ?? 'text'} ${path} ${options.body ?? ''}`;
    if (!inflight.has(key)) {
      const promise = send(path, options).finally(() => inflight.delete(key));
      inflight.set(key, promise);
    }
    return inflight.get(key);
  };

  const fetchData = (path, { params = {}, ...options } = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(query ? `${path}?${query}` : path, options);
  };

  const postData = (path, body, { headers = {}, ...options } = {}) => request(path, { ...options, method: 'POST', body, headers });

  const checkHealth = (options = {}) => fetchData('/health', { ...options, parse: 'json' });

  // Sends diagram source (Graphviz DOT) and returns the SVG text; anything else is rejected as an unexpected answer.
  const renderDiagram = async (source, { type = config.diagramType, format = config.outputFormat, ...options } = {}) => {
    const svg = await postData(`/${type}/${format}`, source, { ...options, headers: { 'Content-Type': 'text/plain' } });
    if (!/<svg[\s>]/i.test(svg)) throw new ApiError('The service did not return a diagram', { kind: 'invalid' });
    return svg;
  };

  return { fetchData, postData, checkHealth, renderDiagram };
};

export const { fetchData, postData, checkHealth, renderDiagram } = createApi();
```

## Appendix C – Listing of localStorage.js

```js
import { createMemoryBackend, createStorage, getStorage } from '../utils/storage.js';

export const STORAGE_KEYS = {
  diagramCache: 'diagram_cache',
  history: 'run_history',
};

const MAX_CACHE_ENTRIES = 20;
const MAX_HISTORY = 5;

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// Thin wrappers named in the lab assignment; the storage object already handles JSON and write errors.
export const saveToLocalStorage = (key, data, storage = getStorage()) => storage.set(key, data);
export const loadFromLocalStorage = (key, storage = getStorage()) => storage.get(key, null);

// Cache with a time-to-live: every entry keeps the moment it was saved, the oldest entries go first when the cache is full.
export const createCache = ({ storage = createStorage(createMemoryBackend()), ttlMs, now = () => Date.now(), maxEntries = MAX_CACHE_ENTRIES } = {}) => {
  const readAll = () => {
    const saved = storage.get(STORAGE_KEYS.diagramCache, {});
    return isPlainObject(saved) ? saved : {};
  };

  return {
    get(key) {
      const entry = readAll()[key];
      if (!isPlainObject(entry) || !Number.isFinite(entry.savedAt)) return null;
      return { data: entry.data, savedAt: entry.savedAt, expired: now() - entry.savedAt > ttlMs };
    },
    set(key, data) {
      const entries = { ...readAll(), [key]: { data, savedAt: now() } };
      const keys = Object.keys(entries).sort((a, b) => entries[a].savedAt - entries[b].savedAt);
      keys.slice(0, Math.max(0, keys.length - maxEntries)).forEach((old) => delete entries[old]);
      return storage.set(STORAGE_KEYS.diagramCache, entries);
    },
    clear() {
      return storage.remove(STORAGE_KEYS.diagramCache);
    },
  };
};

// The last runs, newest first, without repeats.
export const createHistory = ({ storage = createStorage(createMemoryBackend()), limit = MAX_HISTORY } = {}) => {
  const read = () => {
    const saved = storage.get(STORAGE_KEYS.history, []);
    return Array.isArray(saved) ? saved.filter(isPlainObject) : [];
  };
  return {
    list: read,
    add(entry) {
      if (!isPlainObject(entry)) return read();
      const next = [entry, ...read().filter((item) => item.key !== entry.key)].slice(0, limit);
      storage.set(STORAGE_KEYS.history, next);
      return next;
    },
    clear() {
      storage.remove(STORAGE_KEYS.history);
    },
  };
};
```

## Appendix D – Listing of dataParser.js

```js
const PORTS = ['input', 'control', 'output', 'mechanism'];
const BOX_PATTERN = /^box\s+(\S+)\s+"([^"]*)"(?:\s*\{)?\s*$/;
const PORT_PATTERN = /^(input|control|output|mechanism)\s*:\s*(.+)$/;
const ARROW_PATTERN = /^arrow\s+(\S+?)(?:\.(\w+))?\s*->\s*(\S+?)(?:\.(\w+))?$/;
const DIAGRAM_PATTERN = /^diagram\s+(\S+)(?:\s+"([^"]*)")?$/;

// Reads the DSL shown in the editor. Lines it does not understand are reported instead of stopping the run.
export const parseDsl = (source) => {
  const model = { type: 'diagram', title: '', boxes: [], arrows: [], skipped: [], boxLines: [], arrowLines: [] };
  let box = null;
  String(source)
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = raw.trim();
      if (line === '') return;
      let match;
      if ((match = DIAGRAM_PATTERN.exec(line))) {
        model.type = match[1];
        model.title = match[2] ?? '';
      } else if ((match = BOX_PATTERN.exec(line))) {
        box = { id: match[1], name: match[2], ports: Object.fromEntries(PORTS.map((port) => [port, []])) };
        model.boxes.push(box);
        model.boxLines.push(index + 1);
      } else if ((match = PORT_PATTERN.exec(line)) && box) {
        box.ports[match[1]].push(match[2].trim());
      } else if ((match = ARROW_PATTERN.exec(line))) {
        model.arrows.push({ from: match[1], fromPort: match[2] ?? '', to: match[3], toPort: match[4] ?? '' });
        model.arrowLines.push(index + 1);
      } else if (line !== '}') {
        model.skipped.push(index + 1);
      }
    });
  return model;
};

const quote = (text) => `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;

const portLabel = (port, side) => (port ? `${side}: ${port}` : '');

// Turns the parsed model into Graphviz DOT, the format the Kroki endpoint accepts.
export const toDot = (model) => {
  const lines = [
    'digraph diagram {',
    '  rankdir=LR;',
    '  node [shape=box, style=rounded, fontname="Helvetica"];',
    '  edge [fontname="Helvetica", fontsize=10];',
  ];
  if (model.title) lines.push(`  label=${quote(model.title)};`, '  labelloc=t;');
  model.boxes.forEach((box) => {
    const details = PORTS.filter((port) => box.ports[port].length > 0).map((port) => `${port}: ${box.ports[port].join(', ')}`);
    lines.push(`  ${quote(box.id)} [label=${quote([`${box.id} ${box.name}`, ...details].join('\n'))}];`);
  });
  model.arrows.forEach((arrow) => {
    const label = [portLabel(arrow.fromPort, 'from'), portLabel(arrow.toPort, 'to')].filter(Boolean).join(' ');
    lines.push(`  ${quote(arrow.from)} -> ${quote(arrow.to)}${label ? ` [label=${quote(label)}]` : ''};`);
  });
  lines.push('}');
  return lines.join('\n');
};

const detailLines = (box) => PORTS.filter((port) => box.ports[port].length > 0).map((port) => `${port}: ${box.ports[port].join(', ')}`);

const edgeLabel = (arrow) => [portLabel(arrow.fromPort, 'from'), portLabel(arrow.toPort, 'to')].filter(Boolean).join(' ');

// Arrows that point at boxes missing from the model are left out of formats that need every node declared.
const knownArrows = (model) => model.arrows.filter(({ from, to }) => model.boxes.some((box) => box.id === from) && model.boxes.some((box) => box.id === to));

// Mermaid flowchart text for the Kroki mermaid endpoint. Node names are numbered because Mermaid ids cannot hold arbitrary characters.
export const toMermaid = (model) => {
  const name = (id) => `n${model.boxes.findIndex((box) => box.id === id)}`;
  const text = (value) => String(value).replace(/"/g, '#quot;');
  const lines = ['flowchart LR'];
  model.boxes.forEach((box, index) => lines.push(`  n${index}["${[text(`${box.id} ${box.name}`), ...detailLines(box).map(text)].join('<br/>')}"]`));
  knownArrows(model).forEach((arrow) => {
    const label = edgeLabel(arrow);
    lines.push(`  ${name(arrow.from)} -->${label ? `|"${text(label)}"|` : ''} ${name(arrow.to)}`);
  });
  return lines.join('\n');
};

// PlantUML text for the Kroki plantuml endpoint.
export const toPlantUml = (model) => {
  const name = (id) => `n${model.boxes.findIndex((box) => box.id === id)}`;
  const text = (value) => String(value).replace(/"/g, "'").replace(/\r?\n/g, ' ');
  const lines = ['@startuml', 'left to right direction'];
  if (model.title) lines.push(`title ${text(model.title)}`);
  model.boxes.forEach((box, index) => lines.push(`rectangle "${[text(`${box.id} ${box.name}`), ...detailLines(box).map(text)].join('\\n')}" as n${index}`));
  knownArrows(model).forEach((arrow) => {
    const label = edgeLabel(arrow);
    lines.push(`${name(arrow.from)} --> ${name(arrow.to)}${label ? ` : ${text(label)}` : ''}`);
  });
  lines.push('@enduml');
  return lines.join('\n');
};

// A stable key for the cache: two independent 32-bit hashes make an accidental collision very unlikely.
export const sourceKey = (source) => {
  let first = 5381;
  let second = 2166136261;
  for (const char of String(source)) {
    const code = char.codePointAt(0);
    first = ((first * 33) ^ code) >>> 0;
    second = Math.imul(second ^ code, 16777619) >>> 0;
  }
  return `dot-${first.toString(16)}${second.toString(16)}`;
};

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const BLOCKED_TAGS = [
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'style',
  'use',
  'image',
  'feImage',
  'set',
  'animate',
  'animateTransform',
  'animateMotion',
];
const SAFE_LINK = /^(?:#|https?:\/\/)/i;

// The SVG comes from another server, so scripts, animations, external loads, event handlers and unsafe links are removed before it enters the page.
export const sanitizeSvg = (svgText, parser) => {
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.localName !== 'svg' || doc.querySelector('parsererror')) return null;
  BLOCKED_TAGS.forEach((tag) => svg.querySelectorAll(tag).forEach((node) => node.remove()));
  // Elements from other namespaces (for example XHTML meta, base or form) have no place in a drawing.
  [...svg.querySelectorAll('*')].filter((node) => node.namespaceURI !== SVG_NAMESPACE).forEach((node) => node.remove());
  [svg, ...svg.querySelectorAll('*')].forEach((node) => {
    [...node.attributes].forEach(({ name, value }) => {
      // Control characters inside a scheme are ignored by browsers, so they are removed before the link is judged.
      const link = value.replace(new RegExp('[\u0000-\u0020\u007f-\u009f]', 'g'), '');
      const unsafeLink = /(?:^|:)href$/i.test(name) && !SAFE_LINK.test(link);
      // CSS escapes hide a function name from a text check, so a style that contains a backslash is dropped as well.
      const unsafeStyle = name === 'style' && (/url\(|expression\(|javascript:/i.test(value) || value.includes(String.fromCharCode(92)));
      if (/^on/i.test(name) || unsafeLink || unsafeStyle) node.removeAttribute(name);
    });
  });
  return svg;
};
```

## Appendix E – Listing of diagram-runner.js

```js
import { renderDiagram, checkHealth } from '../api/apiService.js';
import { API_CONFIG } from '../api/config.js';
import { createCache, createHistory } from '../storage/localStorage.js';
import { engineForFormat, findEngine } from '../engines/engines.js';
import { notationShort, parseDiagram, pickFormat } from '../notations/index.js';
import { ui } from '../notations/messages.js';
import { sanitizeSvg, sourceKey } from '../utils/dataParser.js';
import { createTranslator } from '../utils/i18n.js';
import { showProblems } from './problems-panel.js';

const MESSAGES = {
  empty: 'В редакторе нет кода диаграммы.',
  offline: 'Нет соединения с интернетом.',
  timeout: 'Сервер не ответил вовремя. Попробуйте ещё раз.',
  network: 'Сервер временно недоступен. Проверьте соединение.',
  invalid: 'Сервис вернул неожиданный ответ.',
  rejected: 'Сервис не принял код диаграммы.',
  limit: 'Слишком много запросов. Подождите немного и повторите.',
  server: (status) => `Сервер вернул ошибку (код ${status}).`,
};

const errorMessage = (error) => {
  if (error.kind === 'http') {
    if (error.status === 429) return MESSAGES.limit;
    if (error.status === 400) return MESSAGES.rejected;
    return MESSAGES.server(error.status);
  }
  return MESSAGES[error.kind] ?? MESSAGES.network;
};

const formatTime = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

export const initDiagramRunner = ({
  root = document,
  storage,
  api = { renderDiagram, checkHealth },
  now = () => Date.now(),
  logger = console,
  isOnline = () => root.defaultView.navigator.onLine,
  autoRun = true,
} = {}) => {
  const page = root.querySelector('.app-page--editor');
  const renderButton = page?.querySelector('.canvas__render');
  if (!renderButton) return null;

  const refreshButton = page.querySelector('.canvas__refresh');
  const status = page.querySelector('.canvas__status');
  const remote = page.querySelector('.canvas__remote');
  const local = page.querySelector('.canvas__diagram');
  const service = page.querySelector('.canvas__service');
  const historyList = page.querySelector('.canvas__history');
  const canvas = page.querySelector('.canvas');
  const parser = new root.defaultView.DOMParser();
  const cache = createCache({ storage, ttlMs: API_CONFIG.cacheTtlMs, now });
  const history = createHistory({ storage });
  let controller = null;

  const tr = createTranslator(root);
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const setStatus = (text) => {
    status.textContent = tr(text);
  };
  const setBusy = (busy) => {
    canvas.setAttribute('aria-busy', String(busy));
  };

  const source = () => [...page.querySelectorAll('.code__line code')].map((line) => line.textContent).join('\n');

  // The engine is chosen on the settings page and read again on every run.
  const currentEngine = () => {
    const saved = storage.get('settings', {});
    return findEngine(saved !== null && typeof saved === 'object' ? saved['diagram-engine'] : undefined);
  };

  const showAction = () => {
    renderButton.textContent = tr(currentEngine().action);
  };

  const show = (svgText, note, engine = currentEngine()) => {
    const svg = sanitizeSvg(svgText, parser);
    if (!svg) return false;
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', tr(`Диаграмма: ${tr(engine.label)}`));
    remote.replaceChildren(root.importNode(svg, true));
    remote.hidden = false;
    local?.setAttribute('hidden', '');
    setStatus(note);
    return true;
  };

  const renderHistory = () => {
    if (!historyList) return;
    const items = history.list();
    historyList.replaceChildren(
      ...items.map((entry) => {
        const item = root.createElement('li');
        const button = root.createElement('button');
        button.type = 'button';
        button.className = 'button button--quiet canvas__history-item';
        button.dataset.key = entry.key;
        button.textContent = `${entry.title || tr('Без названия')} · ${formatTime(entry.at)}`;
        item.append(button);
        return item;
      }),
    );
    historyList.hidden = items.length === 0;
  };

  const run = async ({ refresh = false } = {}) => {
    showAction();
    const model = parseDiagram(source());
    const short = model.notation ? notationShort(model) : '?';
    showProblems({ root, page, problems: model.problems, lang, file: page.querySelector('.editor-tabs__tab--active span')?.textContent.trim() ?? 'order.dsl' });
    page.querySelectorAll('.editor-status__type').forEach((node) => (node.textContent = short));
    page.querySelectorAll('[data-notation-label]').forEach((node) => (node.textContent = ui('notation', { name: short }, lang)));
    if (model.empty) {
      setStatus(MESSAGES.empty);
      return false;
    }
    const wanted = currentEngine();
    const format = wanted.type ? pickFormat(model, wanted.type) : null;
    const engine = wanted.type && format !== wanted.type ? engineForFormat(format) : wanted;
    const fallback = engine === wanted ? '' : ` ${ui('fallback', { label: tr(engine.label) }, lang)}`;
    const input = engine.build(model);
    controller?.abort();
    // The own engine draws in the browser: no request, no cache, and it works offline.
    if (!engine.type) {
      setBusy(false);
      const drawn = show(input, 'Диаграмма построена собственным движком в браузере.', engine);
      if (!drawn) status.textContent = ui('drawFailed', {}, lang);
      return drawn;
    }
    const key = sourceKey(`${engine.id}
${input}`);
    const cached = cache.get(key);

    if (cached && !cached.expired && !refresh && show(cached.data, `Показана сохранённая копия от ${formatTime(cached.savedAt)}.`, engine)) {
      status.textContent += fallback;
      setBusy(false);
      return true;
    }

    controller = new AbortController();
    const { signal } = controller;
    setBusy(true);
    setStatus('Загрузка диаграммы…');
    let succeeded = false;
    try {
      if (!isOnline()) throw Object.assign(new Error('offline'), { kind: 'offline' });
      const svgText = await api.renderDiagram(input, { signal, type: engine.type });
      if (signal.aborted) throw Object.assign(new Error('cancelled'), { kind: 'aborted' });
      if (!show(svgText, `Диаграмма получена от сервиса Kroki (${engine.type}).`, engine)) throw Object.assign(new Error('invalid'), { kind: 'invalid' });
      status.textContent += fallback;
      cache.set(key, svgText);
      history.add({ key, title: model.title, at: now() });
      renderHistory();
      succeeded = true;
    } catch (error) {
      if (error.kind !== 'aborted') {
        logger.error('DSLKit: не удалось получить диаграмму', error.kind, error.status ?? '');
        const shown = cached && show(cached.data, `Кэшированные данные от ${formatTime(cached.savedAt)}. ${errorMessage(error)}`, engine);
        if (!shown) setStatus(error.kind === 'offline' ? `${errorMessage(error)} Сохранённой копии этой диаграммы нет.` : errorMessage(error));
      }
    }
    // A cancelled run belongs to an older request, so only the newest one may release the buttons.
    if (signal === controller.signal) setBusy(false);
    return succeeded;
  };

  renderButton.addEventListener('click', () => run());
  refreshButton?.addEventListener('click', () => run({ refresh: true }));
  page.addEventListener('dslkit:run', () => run());
  historyList?.addEventListener('click', (event) => {
    const button = event.target.closest('.canvas__history-item');
    if (!button) return;
    const cached = cache.get(button.dataset.key);
    controller?.abort();
    setBusy(false);
    if (cached) show(cached.data, `Показана сохранённая копия от ${formatTime(cached.savedAt)}.`);
    else setStatus('Сохранённая копия этой диаграммы уже удалена из кэша.');
  });

  if (service) {
    Promise.resolve()
      .then(() => api.checkHealth())
      .then(() => {
        service.textContent = tr('Сервис Kroki доступен');
      })
      .catch(() => {
        service.textContent = tr('Сервис Kroki недоступен, будут использованы сохранённые копии');
      });
  }

  showAction();
  renderHistory();
  if (autoRun) run();
  return { run, cache, history };
};
```
