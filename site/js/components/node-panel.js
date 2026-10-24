import { nodeKinds, parseDiagram } from '../notations/index.js';
import { editNode, readNode } from '../utils/node-edit.js';
import { readCode, showCode } from './code-lines.js';

const NODE = '.notation__node[data-id]';
const SELECTED = 'notation__node--selected';
const DEFAULT_COLOR = '#ffffff';

// The properties panel: a click (or Enter) on a block of the drawing opens it, and every change of a field is written into the line of
// that block in the code, after which the diagram is drawn again. The code stays the only source of truth, as with dragging.
export const initNodePanel = ({ root = document } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const remote = page?.querySelector('.canvas__remote');
  const form = page?.querySelector('.node-panel');
  const codeLines = page?.querySelector('.code__lines');
  if (!remote || !form || !codeLines) return null;
  const { label, color, kind, x, y } = form.elements;
  const title = form.querySelector('[data-node-id]');
  const positionRow = form.querySelector('[data-node-position]');
  let selected = null;

  const nodes = () => [...remote.querySelectorAll(NODE)];
  const nodeOf = (id) => nodes().find((node) => node.dataset.id === id) ?? null;

  const close = () => {
    selected = null;
    form.hidden = true;
    nodes().forEach((node) => node.classList.remove(SELECTED));
  };

  // Shows the values of the code for the chosen block; closes the panel when the block or the way to edit it is gone.
  const refresh = () => {
    if (selected === null) return;
    const model = parseDiagram(readCode(codeLines));
    const kinds = nodeKinds(model);
    const found = readNode(readCode(codeLines), selected);
    const node = nodeOf(selected);
    if (kinds.length === 0 || !found || !node) return close();
    nodes().forEach((item) => item.classList.toggle(SELECTED, item === node));
    title.textContent = selected;
    label.value = found.label === '' ? selected : found.label;
    color.value = found.color ?? DEFAULT_COLOR;
    kind.replaceChildren(
      ...kinds.map((word) => {
        const option = root.createElement('option');
        option.value = word;
        option.textContent = word;
        return option;
      }),
    );
    kind.value = found.keyword;
    const placed = node.dataset.cx !== undefined;
    positionRow.hidden = !placed;
    if (placed) {
      x.value = String(Math.round(Number(node.dataset.cx)));
      y.value = String(Math.round(Number(node.dataset.cy)));
    }
    form.hidden = false;
  };

  const select = (id) => {
    selected = id;
    refresh();
  };

  const apply = (changes) => {
    if (selected === null) return false;
    const next = editNode(readCode(codeLines), selected, changes);
    if (next === null || next === readCode(codeLines)) {
      refresh();
      return false;
    }
    showCode(root, codeLines, next);
    page.dispatchEvent(new root.defaultView.CustomEvent('dslkit:run', { bubbles: true }));
    return true;
  };

  // Blocks that are not draggable (a Gantt chart, for example) still need to be reachable with the keyboard.
  const prepare = () =>
    nodes().forEach((node) => {
      if (node.hasAttribute('tabindex')) return;
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', node.dataset.id);
    });
  new root.defaultView.MutationObserver(() => {
    prepare();
    refresh();
  }).observe(remote, { childList: true });
  prepare();

  remote.addEventListener('click', (event) => {
    const node = event.target.closest?.(NODE);
    if (node) select(node.dataset.id);
  });
  remote.addEventListener('keydown', (event) => {
    const node = event.target.closest?.(NODE);
    if (node && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      select(node.dataset.id);
    }
  });

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  form.addEventListener('change', (event) => {
    const changes = {
      label: () => ({ label: label.value }),
      color: () => ({ color: color.value }),
      kind: () => ({ kind: kind.value }),
      x: () => ({ x: Number.parseFloat(x.value), y: Number.parseFloat(y.value) }),
      y: () => ({ x: Number.parseFloat(x.value), y: Number.parseFloat(y.value) }),
    }[event.target.name];
    if (changes) apply(changes());
  });
  form.querySelector('[data-node-reset-colour]').addEventListener('click', () => apply({ color: null }));
  form.querySelector('[data-node-close]').addEventListener('click', close);
  return { select, close, apply, selected: () => selected };
};
