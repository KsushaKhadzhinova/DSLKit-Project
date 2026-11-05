import { setNodePosition } from '../utils/node-position.js';
import { readCode, showCode } from './code-lines.js';

const NODE = '.notation__node[data-cx]';
const MIN_MOVE = 3;
const STEP = 10;
const BIG_STEP = 50;
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// Converts a point of the screen into the units of the drawing, whatever the zoom of the canvas is.
export const pointInDrawing = (svg, clientX, clientY) => {
  const rect = svg.getBoundingClientRect();
  const [, , width, height] = (svg.getAttribute('viewBox') ?? `0 0 ${rect.width} ${rect.height}`).split(/\s+/).map(Number);
  return { x: ((clientX - rect.left) * width) / (rect.width || 1), y: ((clientY - rect.top) * height) / (rect.height || 1) };
};

// Blocks of the drawing of the own engine can be moved with the mouse, a finger or the arrow keys.
// The new place is written into the code as pos=XxY and the diagram is drawn again, so the code and the picture never differ.
export const initCanvasDrag = ({ root = document } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const remote = page?.querySelector('.canvas__remote');
  const codeLines = page?.querySelector('.code__lines');
  if (!remote || !codeLines) return null;
  let drag = null;
  let refocus = null;

  const move = (id, x, y) => {
    const next = setNodePosition(readCode(codeLines), id, x, y);
    if (next === null) return false;
    showCode(root, codeLines, next);
    page.dispatchEvent(new root.defaultView.CustomEvent('dslkit:run', { bubbles: true }));
    return true;
  };
  const centre = (node) => ({ x: Number(node.dataset.cx), y: Number(node.dataset.cy) });

  // Every block can be reached with the keyboard after each drawing.
  const prepare = () =>
    remote.querySelectorAll(NODE).forEach((node) => {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', `${node.dataset.id}`);
      if (node.dataset.id === refocus) node.focus();
    });
  new root.defaultView.MutationObserver(() => {
    prepare();
    refocus = null;
  }).observe(remote, { childList: true });
  prepare();

  remote.addEventListener('pointerdown', (event) => {
    const node = event.target.closest?.(NODE);
    const svg = node?.closest('svg');
    if (!node || !svg || event.button > 0) return;
    drag = { node, svg, start: pointInDrawing(svg, event.clientX, event.clientY), from: centre(node), dx: 0, dy: 0, id: node.dataset.id };
    node.classList.add('notation__node--dragging');
    node.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  remote.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = pointInDrawing(drag.svg, event.clientX, event.clientY);
    drag.dx = point.x - drag.start.x;
    drag.dy = point.y - drag.start.y;
    drag.node.setAttribute('transform', `translate(${drag.dx} ${drag.dy})`);
  });
  const finish = (commit) => {
    if (!drag) return;
    const { node, id, from, dx, dy } = drag;
    drag = null;
    node.classList.remove('notation__node--dragging');
    node.removeAttribute('transform');
    if (commit && Math.hypot(dx, dy) >= MIN_MOVE) move(id, from.x + dx, from.y + dy);
  };
  remote.addEventListener('pointerup', () => finish(true));
  remote.addEventListener('pointercancel', () => finish(false));

  remote.addEventListener('keydown', (event) => {
    const node = event.target.closest?.(NODE);
    const direction = ARROWS[event.key];
    if (!node || !direction) return;
    const step = event.shiftKey ? BIG_STEP : STEP;
    const from = centre(node);
    event.preventDefault();
    refocus = node.dataset.id;
    move(node.dataset.id, from.x + direction[0] * step, from.y + direction[1] * step);
  });
  return { move, isDragging: () => drag !== null };
};
