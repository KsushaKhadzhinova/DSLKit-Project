import { readCode, showCode } from './code-lines.js';
import { pointInDrawing } from './canvas-drag.js';
import { parseDiagram } from '../notations/index.js';
import { addElement, connectElements, gate, linksFor, paletteFor } from '../utils/palette.js';

const TEXTS = {
  heading: { ru: 'Элементы', en: 'Elements' },
  hint: { ru: 'Перетащите элемент на доску или нажмите на него.', en: 'Drag an element onto the board or press it.' },
  connect: { ru: 'Соединить', en: 'Connect' },
  linkKind: { ru: 'Тип связи', en: 'Link type' },
  added: { ru: 'Добавлено: {id}.', en: 'Added: {id}.' },
  refused: { ru: 'Не добавлено: {reason}', en: 'Not added: {reason}' },
  pickFrom: { ru: 'Выберите блок, из которого идёт связь.', en: 'Pick the block the link starts from.' },
  pickTo: { ru: 'Теперь выберите блок, в который идёт связь ({from} →).', en: 'Now pick the block the link goes to ({from} →).' },
  linked: { ru: 'Связь {from} → {to} добавлена.', en: 'The link {from} → {to} is added.' },
  refusedLink: { ru: 'Связь {from} → {to} отклонена: {reason}', en: 'The link {from} → {to} is refused: {reason}' },
  cancelled: { ru: 'Соединение отменено.', en: 'Connecting is cancelled.' },
};
const NODE = '.notation__node[data-id]';
const MOVE_TO_DRAG = 4;

// The elements the user can put on the board by hand: drag an item of the palette onto the drawing, or press it.
// The Connect mode joins two blocks. Every change passes the strict gate: the notation must not report a new error.
export const initEditorPalette = ({ root = document } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const sidebar = page?.querySelector('.editor-sidebar');
  const codeLines = page?.querySelector('.code__lines');
  const remote = page?.querySelector('.canvas__remote');
  if (!sidebar || !codeLines || !remote) return null;
  const view = root.defaultView;
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = (key, params = {}) => TEXTS[key][lang].replace(/\{(\w+)\}/g, (_, name) => params[name]);
  const el = (tag, className, text) => {
    const node = root.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const heading = el('h2', 'editor-sidebar__heading', t('heading'));
  const hint = el('p', 'palette__hint', t('hint'));
  const list = el('ul', 'palette');
  const connectRow = el('div', 'palette__connect');
  const mode = el('button', 'button button--quiet palette__mode', t('connect'));
  mode.type = 'button';
  mode.setAttribute('aria-pressed', 'false');
  const linkSelect = el('select', 'settings-row__select palette__link');
  linkSelect.setAttribute('aria-label', t('linkKind'));
  connectRow.append(mode, linkSelect);
  const message = el('p', 'palette__message');
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  sidebar.append(heading, hint, list, connectRow, message);

  const code = () => readCode(codeLines);
  const write = (text) => {
    showCode(root, codeLines, text);
    page.dispatchEvent(new view.CustomEvent('dslkit:run', { bubbles: true }));
  };
  const say = (text) => {
    message.textContent = text;
    return text;
  };

  let notation = null;
  let items = [];
  let links = [];
  const refresh = () => {
    const key = parseDiagram(code()).notation ?? 'idef0';
    if (key === notation) return notation;
    notation = key;
    items = paletteFor(key);
    links = linksFor(key);
    list.replaceChildren(
      ...items.map((item, index) => {
        const li = el('li');
        const button = el('button', 'button button--quiet palette__item', item.label[lang === 'en' ? 1 : 0]);
        button.type = 'button';
        button.dataset.index = String(index);
        button.dataset.keyword = item.keyword;
        li.append(button);
        return li;
      }),
    );
    linkSelect.replaceChildren(
      ...links.map((link, index) => {
        const option = el('option', '', link.id);
        option.value = String(index);
        return option;
      }),
    );
    connectRow.hidden = links.length === 0;
    return notation;
  };

  const add = (index, at) => {
    const item = items[index];
    const before = code();
    const result = addElement(before, notation, item, at);
    const verdict = gate(before, result.code, lang);
    if (!verdict.ok) return say(t('refused', { reason: verdict.message }));
    write(result.code);
    return say(t('added', { id: result.id }));
  };

  // Press: the item is added without a place, the layout puts it.
  let justDragged = false;
  list.addEventListener('click', (event) => {
    const button = event.target.closest('.palette__item');
    if (!button) return;
    if (justDragged) {
      justDragged = false;
      return;
    }
    add(Number(button.dataset.index), null);
  });

  // Drag: the item follows the pointer and is dropped on the drawing at the place where the pointer is released.
  let drag = null;
  list.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('.palette__item');
    if (!button || event.button > 0) return;
    drag = { index: Number(button.dataset.index), x: event.clientX, y: event.clientY, ghost: null, label: button.textContent };
  });
  root.addEventListener('pointermove', (event) => {
    if (!drag) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= MOVE_TO_DRAG) {
      drag.ghost = el('div', 'palette__ghost', drag.label);
      root.body.append(drag.ghost);
    }
    if (drag.ghost) {
      drag.ghost.style.left = `${event.clientX + 8}px`;
      drag.ghost.style.top = `${event.clientY + 8}px`;
    }
  });
  const inside = (svg, x, y) => {
    const rect = svg.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };
  root.addEventListener('pointerup', (event) => {
    if (!drag) return;
    const { index, ghost } = drag;
    drag = null;
    if (!ghost) return;
    ghost.remove();
    justDragged = true;
    const svg = remote.querySelector('svg');
    if (svg && inside(svg, event.clientX, event.clientY)) add(index, pointInDrawing(svg, event.clientX, event.clientY));
    else say(t('hint'));
  });
  root.addEventListener('pointercancel', () => {
    drag?.ghost?.remove();
    drag = null;
  });

  // Connect: pick the block the link starts from, then the block it goes to.
  let from = null;
  const clearSelection = () => remote.querySelectorAll('.notation__node--selected').forEach((node) => node.classList.remove('notation__node--selected'));
  const stopConnect = () => {
    from = null;
    clearSelection();
    mode.setAttribute('aria-pressed', 'false');
    remote.classList.remove('canvas__remote--connect');
  };
  mode.addEventListener('click', () => {
    if (mode.getAttribute('aria-pressed') === 'true') {
      stopConnect();
      say(t('cancelled'));
      return;
    }
    mode.setAttribute('aria-pressed', 'true');
    remote.classList.add('canvas__remote--connect');
    say(t('pickFrom'));
  });
  const pick = (node) => {
    const id = node.dataset.id;
    if (from === null) {
      from = id;
      clearSelection();
      node.classList.add('notation__node--selected');
      return say(t('pickTo', { from: id }));
    }
    const start = from;
    stopConnect();
    mode.setAttribute('aria-pressed', 'true');
    remote.classList.add('canvas__remote--connect');
    const before = code();
    const after = connectElements(before, links[Number(linkSelect.value) || 0], start, id);
    const verdict = gate(before, after, lang);
    if (!verdict.ok) return say(t('refusedLink', { from: start, to: id, reason: verdict.message }));
    write(after);
    return say(t('linked', { from: start, to: id }));
  };
  // The capture listener runs before the dragging of blocks, so in the Connect mode a press picks a block and does not move it.
  const connecting = () => mode.getAttribute('aria-pressed') === 'true';
  remote.addEventListener(
    'pointerdown',
    (event) => {
      const node = event.target.closest?.(NODE);
      if (!connecting() || !node) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      pick(node);
    },
    true,
  );
  remote.addEventListener(
    'keydown',
    (event) => {
      const node = event.target.closest?.(NODE);
      if (connecting() && node && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        pick(node);
      }
    },
    true,
  );
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && connecting()) {
      stopConnect();
      say(t('cancelled'));
    }
  });

  page.addEventListener('dslkit:run', () => {
    clearSelection();
    refresh();
  });
  refresh();
  return { refresh, add, notation: () => notation, connecting };
};
