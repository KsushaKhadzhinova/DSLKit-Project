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
