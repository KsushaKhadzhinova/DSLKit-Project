import { readCode, showCode } from './code-lines.js';
import { pointInDrawing } from './canvas-drag.js';
import { parseDiagram } from '../notations/index.js';
import { addElement, connectElements, gate, linksFor, paletteFor, removeElement } from '../utils/palette.js';
import { setNodePosition } from '../utils/node-position.js';

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
  remove: { ru: 'Удалить выбранный', en: 'Delete the selected' },
  picked: {
    ru: 'Выбран блок {id}. Delete или кнопка «Удалить выбранный» уберёт его вместе со связями.',
    en: 'Block {id} is selected. Delete or the button removes it with its links.',
  },
  removed: { ru: 'Удалено: {id}, связей: {links}.', en: 'Removed: {id}, links: {links}.' },
  nothingPicked: { ru: 'Сначала нажмите на блок на доске.', en: 'Press a block on the board first.' },
};
const NODE = '.notation__node[data-id]';
const MOVE_TO_DRAG = 4;
const NEW_WIDTH = 100;
const NEW_HEIGHT = 60;
const MAX_NUDGES = 8;

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
  const removeButton = el('button', 'button button--quiet palette__remove', t('remove'));
  removeButton.type = 'button';
  const message = el('p', 'palette__message');
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  sidebar.append(heading, hint, list, connectRow, removeButton, message);

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

  // A block put on the board by hand must not make the others jump: before it comes, every block keeps the place where it stands now.
  const freeze = (text) =>
    [...remote.querySelectorAll(NODE)].reduce((current, node) => {
      const { id, cx, cy } = node.dataset;
      return (cx !== undefined && setNodePosition(current, id, Number(cx), Number(cy))) || current;
    }, text);

  const add = (index, at) => {
    const item = items[index];
    const before = at ? freeze(code()) : code();
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

  // A block dropped onto another block would hide under it, so the new one moves down to the first free place.
  // The size of a new block is taken as about 200 by 120 units of the drawing, whatever the zoom is.
  const freeSpot = (svg, x, y) => {
    const box = svg.getBoundingClientRect();
    const scale = box.width / Number((svg.getAttribute('viewBox') ?? '').split(/\s+/)[2] || box.width);
    const halfWidth = NEW_WIDTH * scale;
    const halfHeight = NEW_HEIGHT * scale;
    const rects = [...remote.querySelectorAll(NODE)].map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0);
    const hit = (py) =>
      rects.find((rect) => x >= rect.left - halfWidth && x <= rect.right + halfWidth && py >= rect.top - halfHeight && py <= rect.bottom + halfHeight);
    let at = y;
    for (let tries = 0; tries < MAX_NUDGES && hit(at); tries += 1) {
      const lowest = Math.max(
        ...rects
          .filter((rect) => at >= rect.top - halfHeight && at <= rect.bottom + halfHeight && x >= rect.left - halfWidth && x <= rect.right + halfWidth)
          .map((rect) => rect.bottom),
      );
      at = lowest + halfHeight + 1;
    }
    return { x, y: Math.min(at, box.bottom - halfHeight) };
  };

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
    if (svg && inside(svg, event.clientX, event.clientY)) {
      const spot = freeSpot(svg, event.clientX, event.clientY);
      add(index, pointInDrawing(svg, spot.x, spot.y));
    } else say(t('hint'));
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

  // Delete: a block pressed on the board is selected, Delete or the button removes it with the links that touch it.
  let picked = null;
  const markPicked = () => {
    remote.querySelectorAll('.notation__node--picked').forEach((node) => node.classList.remove('notation__node--picked'));
    [...remote.querySelectorAll(NODE)].find((node) => node.dataset.id === picked)?.classList.add('notation__node--picked');
  };
  const removeSelected = (id) => {
    if (id === null) return say(t('nothingPicked'));
    const result = removeElement(code(), id);
    picked = null;
    if (result === null) return say(t('nothingPicked'));
    write(result.code);
    return say(t('removed', { id, links: result.links }));
  };
  remote.addEventListener('click', (event) => {
    if (connecting()) return;
    const node = event.target.closest(NODE);
    picked = node ? node.dataset.id : null;
    markPicked();
    if (node) say(t('picked', { id: picked }));
  });
  remote.addEventListener('keydown', (event) => {
    const node = event.target.closest?.(NODE);
    if (!connecting() && node && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      removeSelected(node.dataset.id);
    }
  });
  removeButton.addEventListener('click', () => removeSelected(picked));

  page.addEventListener('dslkit:run', () => {
    clearSelection();
    refresh();
    markPicked();
  });
  refresh();
  return { refresh, add, notation: () => notation, connecting, picked: () => picked };
};
