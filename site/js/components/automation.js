import { NOTATIONS } from '../notations/index.js';
import { BUILDABLE } from '../automation/builders.js';
import { buildFromCode, buildFromDescription } from '../automation/build.js';
import { createRequestHistory } from '../automation/history.js';
import { expertStore } from '../expert/bases.js';
import { reviewDiagram, traceLines } from '../expert/review.js';
import { currentUser } from '../storage/accounts.js';
import { readCode, showCode } from './code-lines.js';
import { notify } from './toast.js';

const TEXTS = {
  ru: {
    title: 'Автоматическое построение',
    close: 'Закрыть',
    source: 'Источник',
    idea: 'Описание',
    code: 'Код или файл',
    image: 'Картинка',
    notation: 'Нотация',
    auto: 'Определить автоматически',
    offline: 'Без ИИ: по правилам',
    build: 'Построить',
    cancel: 'Отмена',
    working: 'Строим диаграмму…',
    ideaLabel: 'Опишите идею словами',
    ideaHint: 'Например: «Сначала клиент оформляет заказ, затем менеджер проверяет наличие. Если товар есть, то отправить заказ, иначе сообщить клиенту.»',
    codeLabel: 'Код Mermaid, PlantUML или DSLKit (или перетащите файл .dsl, .mmd, .puml, .txt)',
    imageLabel: 'Картинка схемы (png, jpeg, webp, gif) и пояснение',
    file: 'Выбрать файл',
    preview: 'Код',
    problems: 'Проверка',
    noProblems: 'Ошибок и предупреждений нет.',
    insert: 'Вставить в редактор',
    inserted: 'Код вставлен в редактор.',
    review: 'Рецензия экспертной системы',
    reviewEmpty: 'Замечаний нет.',
    history: 'Последние запросы',
    historyEmpty: 'Запросов пока не было.',
    historyClear: 'Очистить историю',
    historyCleared: 'История очищена.',
    why: 'Почему такая нотация',
    chosen: 'Нотация: {name}, уверенность {cf} %.',
    ai: 'ИИ подключён (модель {model}): описание, код и картинки строятся через Claude. Результат проверяется парсером DSLKit. Важно: введённый текст, код и картинка отправляются в Anthropic (сторонний сервис), не вводите персональные и секретные данные.',
    noAi: 'ИИ не подключён: добавьте ключ в .env сервера. Доступен упрощённый режим по правилам, а не нейросеть, и импорт Mermaid и PlantUML.',
    rules: 'Режим по правилам: это упрощённый разбор по шаблонам фраз, а не нейросеть. Проверьте результат.',
    empty: 'Введите текст.',
    imageNoAi: 'Картинки без ключа не поддерживаются: опишите схему текстом или загрузите код, Mermaid или PlantUML.',
    imageType: 'Нужна картинка png, jpeg, webp или gif.',
    imageBig: 'Картинка больше {mb} МБ.',
    imageEmpty: 'Выберите картинку.',
    unreadable: 'Не удалось прочитать файл.',
    nothing:
      'В описании не нашлось фраз для этой нотации. Опишите шаги («сначала… затем…»), связи («у клиента много заказов») или участников («пользователь отправляет…»).',
    unknownNotation: 'Не удалось определить нотацию: выберите её вручную.',
    offlineOnly: 'Без ИИ можно построить только: BPMN, блок-схему ГОСТ, ERD, DFD и диаграмму последовательности.',
    unknown: 'Формат не распознан: нужен текст Mermaid, PlantUML или DSLKit. Описание словами выберите на вкладке «Описание».',
    unsupported: 'Диаграмма «{name}» без ИИ не импортируется: поддерживаются блок-схемы, последовательности и состояния.',
    'too-long': 'Текст слишком большой для импорта.',
    done: 'Диаграмма построена ({source}).',
    sourceAi: 'ИИ, попыток: {n}',
    sourceRules: 'по правилам',
    sourceImport: 'импорт',
    noKey: 'ИИ не подключён: добавьте ключ в .env сервера.',
    limit: 'Лимит запросов к ИИ исчерпан, попробуйте позже.',
    invalid: 'ИИ не смог получить корректный код. Уточните описание.',
    failed: 'Сбой ИИ-сервиса, попробуйте позже.',
    network: 'Нет связи с сервером.',
    cancelled: 'Построение отменено.',
    tooLarge: 'Запрос слишком велик.',
    media: 'Этот тип картинки не поддерживается.',
    badRequest: 'Запрос отклонён сервером.',
    line: 'стр. {lines}',
  },
  en: {
    title: 'Automatic build',
    close: 'Close',
    source: 'Source',
    idea: 'Description',
    code: 'Code or file',
    image: 'Picture',
    notation: 'Notation',
    auto: 'Detect automatically',
    offline: 'Without AI: by rules',
    build: 'Build',
    cancel: 'Cancel',
    working: 'Building the diagram…',
    ideaLabel: 'Describe the idea in words',
    ideaHint:
      'For example: "First the customer places an order, then the manager checks the stock. If the goods are in stock then ship the order, otherwise tell the customer."',
    codeLabel: 'Mermaid, PlantUML or DSLKit code (or drop a .dsl, .mmd, .puml, .txt file)',
    imageLabel: 'A picture of a diagram (png, jpeg, webp, gif) and a note',
    file: 'Choose a file',
    preview: 'Code',
    problems: 'Check',
    noProblems: 'No errors and no warnings.',
    insert: 'Insert into the editor',
    inserted: 'The code is inserted into the editor.',
    review: 'Review by the expert system',
    reviewEmpty: 'No remarks.',
    history: 'Latest requests',
    historyEmpty: 'No requests yet.',
    historyClear: 'Clear the history',
    historyCleared: 'The history is cleared.',
    why: 'Why this notation',
    chosen: 'Notation: {name}, confidence {cf} %.',
    ai: 'AI is connected (model {model}): descriptions, code and pictures are built through Claude. The result is checked by the DSLKit parser. Note: the text, the code and the picture you enter are sent to Anthropic (a third-party service), so do not enter personal or secret data.',
    noAi: 'AI is not connected: add the key to the .env of the server. The simplified mode by rules (not a neural network) and the import of Mermaid and PlantUML are available.',
    rules: 'Mode by rules: this is a simplified reading by phrase patterns, not a neural network. Check the result.',
    empty: 'Enter a text.',
    imageNoAi: 'Pictures are not supported without a key: describe the diagram in text or load code, Mermaid or PlantUML.',
    imageType: 'A png, jpeg, webp or gif picture is needed.',
    imageBig: 'The picture is larger than {mb} MB.',
    imageEmpty: 'Choose a picture.',
    unreadable: 'The file could not be read.',
    nothing:
      'The description has no phrases for this notation. Describe steps ("first… then…"), relations ("a customer has many orders") or participants ("the user sends…").',
    unknownNotation: 'The notation could not be detected: choose it by hand.',
    offlineOnly: 'Without AI only these can be built: BPMN, GOST flowchart, ERD, DFD and sequence diagram.',
    unknown: 'The format is not recognised: Mermaid, PlantUML or DSLKit text is needed. Choose "Description" for a text in words.',
    unsupported: 'The diagram "{name}" cannot be imported without AI: flowcharts, sequence and state diagrams are supported.',
    'too-long': 'The text is too large to import.',
    done: 'The diagram is built ({source}).',
    sourceAi: 'AI, attempts: {n}',
    sourceRules: 'by rules',
    sourceImport: 'import',
    noKey: 'AI is not connected: add the key to the .env of the server.',
    limit: 'The limit of AI requests is used up, try later.',
    invalid: 'The AI could not get correct code. Make the description clearer.',
    failed: 'The AI service failed, try later.',
    network: 'The server is not reachable.',
    cancelled: 'The build is cancelled.',
    tooLarge: 'The request is too large.',
    media: 'This kind of picture is not supported.',
    badRequest: 'The server refused the request.',
    line: 'line {lines}',
  },
};
const MODES = ['idea', 'code', 'image'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const CODE_ACCEPT = '.dsl,.mmd,.mermaid,.puml,.plantuml,.pu,.md,.txt';
const STATUS_ERRORS = { 503: 'noKey', 429: 'limit', 422: 'invalid', 413: 'tooLarge', 415: 'media' };

// The wizard "Automatic build": the source (description, code, picture), the notation, the build through the AI of the server or by rules,
// the preview of the code, the check, the review of the expert system, the insertion into the editor and the history of requests.
export const initAutomation = ({ root = document, storage, fetchImpl } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const codeLines = page?.querySelector('.code__lines');
  if (!codeLines) return null;
  const view = root.defaultView;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = (key, params = {}) => TEXTS[lang][key].replace(/\{(\w+)\}/g, (_, name) => params[name]);
  const call = fetchImpl ?? ((...args) => view.fetch(...args));
  const store = expertStore(storage);
  const history = createRequestHistory({ storage });
  const el = (tag, className, text) => {
    const node = root.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, className = 'button button--quiet') => {
    const node = el('button', className, text);
    node.type = 'button';
    return node;
  };

  let mode = 'idea';
  let ai = { available: false, model: '', maxImageMb: 5 };
  let result = null;
  let controller = null;
  let imageData = null;

  // ----- the panel
  const panel = el('section', 'auto');
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'auto-title');
  const head = el('div', 'auto__head');
  const title = el('h2', 'auto__title', t('title'));
  title.id = 'auto-title';
  const closeButton = button('×', 'button button--icon');
  closeButton.setAttribute('aria-label', t('close'));
  head.append(title, closeButton);
  const note = el('p', 'auto__note');
  const sources = el('div', 'auto__sources');
  sources.setAttribute('role', 'group');
  sources.setAttribute('aria-label', t('source'));
  const sourceButtons = MODES.map((name) => {
    const node = button(t(name));
    node.dataset.autoSource = name;
    return node;
  });
  sources.append(...sourceButtons);
  const notationLabel = el('label', 'auto__label', t('notation'));
  notationLabel.htmlFor = 'auto-notation';
  const notationBox = el('select', 'auto__select');
  notationBox.id = 'auto-notation';
  notationBox.append(
    Object.assign(el('option', '', t('auto')), { value: 'auto' }),
    ...Object.keys(NOTATIONS).map((key) => Object.assign(el('option', '', NOTATIONS[key].name[lang]), { value: key })),
  );
  const offlineLabel = el('label', 'auto__check');
  const offlineBox = el('input');
  offlineBox.type = 'checkbox';
  offlineLabel.append(offlineBox, ` ${t('offline')}`);
  const textLabel = el('label', 'auto__label');
  textLabel.htmlFor = 'auto-text';
  const textBox = el('textarea', 'auto__text');
  textBox.id = 'auto-text';
  textBox.rows = 6;
  const hint = el('p', 'auto__hint');
  const fileRow = el('div', 'auto__file');
  const fileButton = button(t('file'));
  const fileInput = el('input', 'auto__file-input');
  fileInput.type = 'file';
  fileInput.hidden = true;
  fileInput.setAttribute('aria-label', t('file'));
  const fileName = el('span', 'auto__file-name');
  fileRow.append(fileButton, fileInput, fileName);
  const actions = el('div', 'auto__actions');
  const buildButton = button(t('build'), 'button button--primary');
  const cancelButton = button(t('cancel'));
  cancelButton.hidden = true;
  actions.append(buildButton, cancelButton);
  const progress = el('progress', 'auto__progress');
  progress.hidden = true;
  progress.setAttribute('aria-label', t('working'));
  const status = el('p', 'auto__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const output = el('div', 'auto__output');
  output.hidden = true;
  const previewTitle = el('h3', 'auto__subtitle', t('preview'));
  const preview = el('pre', 'auto__preview');
  const chosen = el('p', 'auto__chosen');
  const why = el('details', 'auto__why');
  const problems = el('ul', 'auto__list');
  const outputActions = el('div', 'auto__actions');
  const insertButton = button(t('insert'), 'button button--primary');
  outputActions.append(insertButton);
  const reviewTitle = el('h3', 'auto__subtitle', t('review'));
  const reviewList = el('ul', 'auto__list');
  output.append(previewTitle, preview, chosen, why, el('h3', 'auto__subtitle', t('problems')), problems, outputActions, reviewTitle, reviewList);
  const historyTitle = el('h3', 'auto__subtitle', t('history'));
  const historyList = el('ul', 'auto__list');
  const clearButton = button(t('historyClear'));
  panel.append(
    head,
    note,
    sources,
    notationLabel,
    notationBox,
    offlineLabel,
    textLabel,
    hint,
    textBox,
    fileRow,
    actions,
    progress,
    status,
    output,
    historyTitle,
    historyList,
    clearButton,
  );
  page.append(panel);

  // ----- state
  const say = (text, kind) => {
    status.textContent = text;
    if (text !== '') notify(root, text, kind);
    return text;
  };
  const setMode = (name) => {
    mode = name;
    sourceButtons.forEach((node) => node.setAttribute('aria-pressed', String(node.dataset.autoSource === name)));
    textLabel.textContent = t(`${name}Label`);
    hint.textContent = name === 'idea' ? t('ideaHint') : '';
    fileRow.hidden = name === 'idea';
    fileInput.accept = name === 'image' ? IMAGE_TYPES.join(',') : CODE_ACCEPT;
    offlineLabel.hidden = name !== 'idea' || !ai.available;
    return name;
  };
  const setNote = () => {
    note.textContent = ai.available ? t('ai', { model: ai.model }) : t('noAi');
    offlineLabel.hidden = mode !== 'idea' || !ai.available;
    return ai.available;
  };
  const refreshStatus = async () => {
    try {
      const answer = await call('/api/ai/status');
      const body = answer.ok ? await answer.json() : {};
      ai = { available: body.available === true, model: String(body.model ?? ''), maxImageMb: Number(body.maxImageMb) || 5 };
    } catch {
      ai = { available: false, model: '', maxImageMb: 5 };
    }
    return setNote();
  };

  const renderHistory = () => {
    const rows = history.list(currentUser(storage)).map((entry) => {
      const item = el('li');
      const reuse = button(`${t(entry.mode)}: ${entry.text.slice(0, 60)}`, 'button button--quiet auto__reuse');
      reuse.dataset.autoReuse = '';
      reuse.addEventListener('click', () => {
        setMode(entry.mode);
        textBox.value = entry.text;
        notationBox.value = NOTATIONS[entry.notation] ? entry.notation : 'auto';
      });
      item.append(reuse);
      return item;
    });
    historyList.replaceChildren(...(rows.length > 0 ? rows : [el('li', 'auto__empty', t('historyEmpty'))]));
  };

  const rulesOf = (kb) => store.rules(kb);
  const listItems = (list, items) => list.replaceChildren(...items.map((text) => el('li', '', text)));

  const show = (built, sourceLabel) => {
    result = built;
    output.hidden = false;
    preview.textContent = built.dsl;
    const found = built.problems ?? [];
    listItems(problems, found.length > 0 ? found.map((item) => `${item.line}: ${item.message}`) : [t('noProblems')]);
    const ranked = built.ranking?.find((item) => item.key === built.notation);
    chosen.hidden = built.source !== 'rules' || !ranked;
    why.hidden = chosen.hidden;
    if (!chosen.hidden) {
      chosen.textContent = t('chosen', { name: NOTATIONS[built.notation].name[lang], cf: Math.round(ranked.cf * 100) });
      const summary = el('summary', '', t('why'));
      const lines = el('ul', 'auto__list');
      listItems(lines, traceLines(built.trace, rulesOf('notation'), lang));
      why.replaceChildren(summary, lines);
    }
    const review = reviewDiagram(built.dsl, lang, rulesOf('review'));
    listItems(
      reviewList,
      review.recommendations.length > 0
        ? review.recommendations.map(
            (item) => `[${item.priority}] ${item.text}${item.lines.length > 0 ? ` (${t('line', { lines: item.lines.join(', ') })})` : ''}`,
          )
        : [t('reviewEmpty')],
    );
    return say(t('done', { source: sourceLabel }), 'success');
  };

  const fail = (key, params) => say(t(key, params), 'error');

  // ----- calls to the server with the AI
  const askAi = async (body) => {
    controller = new view.AbortController();
    let answer;
    try {
      answer = await call('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, lang }),
        signal: controller.signal,
      });
    } catch (error) {
      return { error: error.name === 'AbortError' ? 'cancelled' : 'network' };
    }
    const data = await answer.json().catch(() => ({}));
    if (!answer.ok) return { error: STATUS_ERRORS[answer.status] ?? (answer.status >= 500 ? 'failed' : 'badRequest'), data };
    return { data };
  };
  const fromAi = (data) => ({
    ok: true,
    source: 'ai',
    dsl: data.code,
    notation: data.notation,
    problems: data.warnings,
    attempts: data.attempts,
  });

  const setBusy = (busy) => {
    buildButton.disabled = busy;
    cancelButton.hidden = !busy;
    progress.hidden = !busy;
    panel.setAttribute('aria-busy', String(busy));
  };

  const offlineMessage = (built) => {
    if (built.reason === 'nothing-found') return t('nothing');
    if (built.reason === 'unknown-notation') return t('unknownNotation');
    if (built.reason === 'unsupported') return t('unsupported', { name: built.name });
    return t(built.reason);
  };

  const build = async () => {
    const text = textBox.value.trim();
    const wanted = notationBox.value;
    if (mode === 'image') {
      if (!ai.available) return fail('imageNoAi');
      if (imageData === null) return fail('imageEmpty');
    } else if (text === '') return fail('empty');
    if (mode !== 'image') history.add(currentUser(storage), { mode, text, notation: wanted });
    else history.add(currentUser(storage), { mode, text: text || fileName.textContent, notation: wanted });
    renderHistory();
    say('');
    setBusy(true);
    try {
      let built = null;
      if (mode === 'code') {
        const imported = buildFromCode(text, { fileName: fileName.textContent, lang });
        if (imported.ok) built = imported;
        else if (!ai.available) return say(offlineMessage(imported), 'error');
      } else if (mode === 'idea' && (!ai.available || offlineBox.checked)) {
        if (wanted !== 'auto' && !BUILDABLE.includes(wanted)) return fail('offlineOnly');
        const ruled = buildFromDescription(text, { notation: wanted, lang, rules: rulesOf('notation') });
        if (!ruled.ok) return say(offlineMessage(ruled), 'error');
        built = ruled;
      }
      if (built !== null) return show(built, t(built.source === 'rules' ? 'sourceRules' : 'sourceImport'));
      const body = mode === 'image' ? { mode, text, image: imageData.data, mediaType: imageData.type, notation: wanted } : { mode, text, notation: wanted };
      const answer = await askAi(body);
      if (answer.error) return fail(answer.error);
      return show(fromAi(answer.data), t('sourceAi', { n: answer.data.attempts }));
    } finally {
      controller = null;
      setBusy(false);
    }
  };

  cancelButton.addEventListener('click', () => controller?.abort());

  const insert = () => {
    if (result === null) return false;
    showCode(root, codeLines, result.dsl);
    page.dispatchEvent(new view.CustomEvent('dslkit:run', { bubbles: true }));
    say(t('inserted'), 'success');
    return true;
  };

  // ----- files: a text file fills the box, a picture is kept as base64
  const toBase64 = async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
    return view.btoa(binary);
  };
  const takeFile = async (file) => {
    fileName.textContent = file.name;
    try {
      if (mode === 'image') {
        if (!IMAGE_TYPES.includes(file.type)) return fail('imageType');
        if (file.size > ai.maxImageMb * 1024 * 1024) return fail('imageBig', { mb: ai.maxImageMb });
        imageData = { type: file.type, data: await toBase64(file) };
        return true;
      }
      textBox.value = await file.text();
      return true;
    } catch {
      return fail('unreadable');
    }
  };

  // ----- wiring
  sourceButtons.forEach((node) => node.addEventListener('click', () => setMode(node.dataset.autoSource)));
  fileButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const [file] = fileInput.files;
    if (file) await takeFile(file);
    fileInput.value = '';
  });
  panel.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  panel.addEventListener('drop', async (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer?.files ?? [];
    if (file) await takeFile(file);
  });
  buildButton.addEventListener('click', build);
  insertButton.addEventListener('click', insert);
  clearButton.addEventListener('click', () => {
    history.clear(currentUser(storage));
    renderHistory();
    say(t('historyCleared'), 'info');
  });
  const open = async () => {
    panel.hidden = false;
    textBox.focus();
    renderHistory();
    return refreshStatus();
  };
  const close = () => {
    panel.hidden = true;
    return false;
  };
  closeButton.addEventListener('click', close);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  root.querySelectorAll('[data-auto-open]').forEach((node) => node.addEventListener('click', open));
  setMode('idea');
  setNote();
  renderHistory();
  if (new view.URLSearchParams(view.location.search).get('auto') === '1') open();
  return { open, close, build, insert, setMode, refreshStatus, takeFile, code: () => readCode(codeLines), result: () => result };
};
