// Orientation and aspect awareness of the editor: the layout itself is CSS (orientation.css), this file does what CSS cannot.
// It tags the page with the orientation, the height class and the aspect class, adds the draggable splitter between the code and the canvas,
// keeps the cursor, the selection, the scroll positions and the manual zoom through a rotation, closes the menus that would end up in the wrong place,
// and keeps the caret above the on-screen keyboard (visualViewport).
import { pageLanguage, pick } from '../utils/lang.js';

const LABEL = { ru: 'Размер кода и холста', en: 'Resize the code and the canvas' };
const SPLIT_DEFAULT = 38.2;
const MIN_PANE = 192;
const KEY_STEP = 2;
const KEYBOARD_GAP = 120;
const SETTLE_MS = 120;
const LINE_FALLBACK = 24;

const MODES = {
  portrait: '(orientation: portrait)',
  short: '(max-height: 499.98px)',
  square: '(min-aspect-ratio: 9/10) and (max-aspect-ratio: 11/10)',
  ultrawide: '(min-aspect-ratio: 2/1)',
  tall: '(max-aspect-ratio: 9/20)',
};

export const initOrientation = ({ root = document } = {}) => {
  const main = root.querySelector('.editor-main');
  const panel = main?.querySelector('.editor-panel');
  const canvas = main?.querySelector('.canvas');
  const input = panel?.querySelector('.code__input');
  const lines = panel?.querySelector('.code__lines');
  const win = root.defaultView;
  if (!canvas || !input || !lines || !win.matchMedia) return null;

  const html = root.documentElement;
  const viewport = win.visualViewport;
  const queries = Object.fromEntries(Object.entries(MODES).map(([name, query]) => [name, win.matchMedia(query)]));
  const is = (name) => queries[name].matches;

  // The classes are tagged on <html>, so any stylesheet or test can read them.
  const classify = () => {
    const state = {
      orientation: is('portrait') ? 'portrait' : 'landscape',
      height: is('short') ? 'short' : 'regular',
      aspect: [
        ['square', 'square'],
        ['ultrawide', 'ultrawide'],
        ['tall', 'tall'],
      ].reduce((found, [name, label]) => (found === 'regular' && is(name) ? label : found), 'regular'),
    };
    Object.assign(html.dataset, state);
    return `${state.orientation}/${state.height}/${state.aspect}`;
  };
  let mode = classify();

  // The splitter between the code and the canvas; CSS shows it and sets --split-axis (x: side by side, y: stacked).
  const splitter = root.createElement('div');
  splitter.className = 'editor-splitter';
  splitter.setAttribute('role', 'separator');
  splitter.tabIndex = 0;
  splitter.setAttribute('aria-label', pick(LABEL, pageLanguage(root)));
  panel.after(splitter);

  const axis = () => win.getComputedStyle(splitter).getPropertyValue('--split-axis').trim();
  const span = () => (axis() === 'y' ? main.clientHeight : main.clientWidth);
  let ratio = SPLIT_DEFAULT;
  const limits = () => {
    const size = span();
    const min = size ? Math.min(45, (MIN_PANE / size) * 100) : 20;
    return [min, 100 - min];
  };
  const setRatio = (value) => {
    const [min, max] = limits();
    ratio = Math.min(max, Math.max(min, value));
    main.style.setProperty('--split-ratio', String(Math.round(ratio * 10) / 10));
    splitter.setAttribute('aria-orientation', axis() === 'y' ? 'horizontal' : 'vertical');
    splitter.setAttribute('aria-valuemin', String(Math.round(min)));
    splitter.setAttribute('aria-valuemax', String(Math.round(max)));
    splitter.setAttribute('aria-valuenow', String(Math.round(ratio)));
    return ratio;
  };
  setRatio(ratio);

  // The code pane takes ratio per cent of the work area (CSS: calc(var(--split-ratio) * 1%)), the pointer sets where it ends.
  let dragging = false;
  splitter.addEventListener('pointerdown', (event) => {
    dragging = true;
    splitter.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  splitter.addEventListener('pointermove', (event) => {
    if (!dragging || !span()) return;
    const rect = panel.getBoundingClientRect();
    const [start, pointer] = axis() === 'y' ? [rect.top, event.clientY] : [rect.left, event.clientX];
    setRatio(((pointer - start) / span()) * 100);
  });
  const stop = () => {
    dragging = false;
  };
  splitter.addEventListener('pointerup', stop);
  splitter.addEventListener('pointercancel', stop);
  splitter.addEventListener('dblclick', () => setRatio(SPLIT_DEFAULT));
  splitter.addEventListener('keydown', (event) => {
    const [min, max] = limits();
    const steps = { ArrowLeft: -KEY_STEP, ArrowUp: -KEY_STEP, ArrowRight: KEY_STEP, ArrowDown: KEY_STEP };
    if (Object.hasOwn(steps, event.key)) setRatio(ratio + steps[event.key]);
    else if (event.key === 'Home') setRatio(min);
    else if (event.key === 'End') setRatio(max);
    else if (event.key === 'Enter') setRatio(SPLIT_DEFAULT);
    else return;
    event.preventDefault();
  });

  // The on-screen keyboard shrinks only the visual viewport: tell CSS its height and keep the caret line above the keyboard.
  const keyboardOpen = () => Boolean(viewport) && viewport.height < win.innerHeight - KEYBOARD_GAP;
  const syncViewport = () => {
    if (viewport) html.style.setProperty('--vv-height', `${viewport.height}px`);
    if (keyboardOpen()) html.dataset.keyboard = 'open';
    else delete html.dataset.keyboard;
  };
  const revealCaret = () => {
    if (root.activeElement !== input) return false;
    const lineHeight = Number.parseFloat(win.getComputedStyle(lines).lineHeight) || LINE_FALLBACK;
    const top = (input.value.slice(0, input.selectionStart).split('\n').length - 1) * lineHeight;
    const hidden = viewport ? Math.max(0, panel.getBoundingClientRect().bottom - viewport.height) : 0;
    const visible = panel.clientHeight - hidden;
    if (top + lineHeight > panel.scrollTop + visible) panel.scrollTop = top + lineHeight - visible;
    if (top < panel.scrollTop) panel.scrollTop = top;
    return true;
  };

  // What a rotation must not lose: the cursor, the selection and the scroll of the code, the focus, the scroll centre of a zoomed drawing.
  const take = () => ({
    start: input.selectionStart,
    end: input.selectionEnd,
    direction: input.selectionDirection,
    inputTop: input.scrollTop,
    inputLeft: input.scrollLeft,
    panelTop: panel.scrollTop,
    panelLeft: panel.scrollLeft,
    focused: root.activeElement === input,
    centreX: (canvas.scrollLeft + canvas.clientWidth / 2) / (canvas.scrollWidth || 1),
    centreY: (canvas.scrollTop + canvas.clientHeight / 2) / (canvas.scrollHeight || 1),
  });
  const restore = (saved) => {
    if (input.selectionStart !== saved.start || input.selectionEnd !== saved.end) input.setSelectionRange(saved.start, saved.end, saved.direction);
    input.scrollTop = saved.inputTop;
    input.scrollLeft = saved.inputLeft;
    if (saved.focused && root.activeElement !== input) input.focus({ preventScroll: true });
    panel.scrollTop = saved.panelTop;
    panel.scrollLeft = saved.panelLeft;
    // A drawing that the user zoomed keeps its centre; a fitted drawing is fitted again, that is the top left corner of the fitted view.
    const manual = Boolean(root.querySelector('.canvas__remote[data-zoom]'));
    canvas.scrollLeft = manual ? saved.centreX * canvas.scrollWidth - canvas.clientWidth / 2 : 0;
    canvas.scrollTop = manual ? saved.centreY * canvas.scrollHeight - canvas.clientHeight / 2 : 0;
  };

  let saved = null;
  let timer = 0;
  const settle = () => {
    timer = 0;
    const next = classify();
    if (next !== mode) root.querySelectorAll('.editor-menu[open]').forEach((menu) => menu.removeAttribute('open'));
    mode = next;
    syncViewport();
    setRatio(ratio);
    if (saved) restore(saved);
    saved = null;
    revealCaret();
    root.dispatchEvent(new win.CustomEvent('dslkit:orientation', { detail: { mode } }));
    return mode;
  };
  // The first event of a burst takes the snapshot, before the layout moves the scroll positions; the last one settles it.
  const changed = () => {
    saved ??= take();
    win.clearTimeout(timer);
    timer = win.setTimeout(settle, SETTLE_MS);
  };
  win.addEventListener('resize', changed);
  win.addEventListener('orientationchange', changed);
  Object.values(queries).forEach((query) => query.addEventListener('change', changed));
  viewport?.addEventListener('resize', changed);
  viewport?.addEventListener('scroll', syncViewport);
  input.addEventListener('focus', () => win.setTimeout(revealCaret, SETTLE_MS));
  input.addEventListener('input', revealCaret);
  syncViewport();

  return { splitter, settle, classify, setRatio, ratio: () => ratio, mode: () => mode, revealCaret };
};
