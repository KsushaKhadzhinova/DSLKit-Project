import { readCode, showCode } from './code-lines.js';
import { notify } from './toast.js';
import { gate } from '../utils/palette.js';
import { propertiesOf, setKind, setLabel } from '../utils/node-properties.js';
import { pageLanguage } from '../utils/lang.js';

const TEXTS = {
  heading: { ru: 'Свойства блока', en: 'Block properties' },
  id: { ru: 'Идентификатор', en: 'Identifier' },
  label: { ru: 'Подпись', en: 'Label' },
  kind: { ru: 'Вид блока', en: 'Block kind' },
  position: { ru: 'Положение', en: 'Position' },
  hint: { ru: 'Изменение сразу записывается в код; «Отменить» возвращает его.', en: 'A change is written into the code at once; Undo takes it back.' },
  labelChanged: { ru: 'Подпись блока {id} изменена.', en: 'The label of {id} is changed.' },
  kindChanged: { ru: 'Вид блока {id} изменён: {kind}.', en: 'The kind of {id} is changed: {kind}.' },
  emptyLabel: { ru: 'Подпись не может быть пустой.', en: 'The label cannot be empty.' },
  refused: { ru: 'Не изменено: {reason}', en: 'Not changed: {reason}' },
  notRead: { ru: 'Не изменено: нотация не читает блок как «{kind}».', en: 'Not changed: the notation does not read the block as "{kind}".' },
};

// The names of the kinds of a block: a keyword is shown as it is written in the code, so the user finds it in the code too.
const kindName = (keyword) => keyword;

// The properties panel: the block that is selected on the board shows its properties as fields. Writing a field rewrites the line
// of the code that declares the block, through the same strict gate as the palette; the code stays the one source of truth,
// and undo and redo of the editor work because the lines are rewritten like for any other change.
export const initEditorProperties = ({ root = document } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const canvas = page?.querySelector('.canvas');
  const codeLines = page?.querySelector('.code__lines');
  if (!canvas || !codeLines) return null;
  const view = root.defaultView;
  const lang = pageLanguage(root);
  const t = (key, params = {}) => TEXTS[key][lang].replace(/\{(\w+)\}/g, (_, name) => params[name]);
  const el = (tag, className, text) => {
    const node = root.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const field = (name, control) => {
    const wrap = el('div', 'props__field');
    const label = el('label', 'props__label', t(name));
    control.id = `props-${name}`;
    label.htmlFor = control.id;
    wrap.append(label, control);
    return wrap;
  };

  const panel = el('section', 'props');
  panel.setAttribute('aria-labelledby', 'props-heading');
  panel.hidden = true;
  const heading = el('h2', 'props__heading', t('heading'));
  heading.id = 'props-heading';
  const idOutput = el('output', 'props__id');
  idOutput.id = 'props-id';
  const idRow = el('div', 'props__field');
  const idLabel = el('span', 'props__label', t('id'));
  idRow.append(idLabel, idOutput);
  const positionOutput = el('output', 'props__id');
  positionOutput.id = 'props-position';
  const positionField = el('div', 'props__field');
  positionField.append(el('span', 'props__label', t('position')), positionOutput);
  const labelInput = el('input', 'props__input');
  labelInput.type = 'text';
  labelInput.autocomplete = 'off';
  const kindSelect = el('select', 'props__input');
  const labelField = field('label', labelInput);
  const kindField = field('kind', kindSelect);
  const hint = el('p', 'props__hint', t('hint'));
  const message = el('p', 'props__message');
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  panel.append(heading, idRow, positionField, labelField, kindField, hint, message);
  canvas.append(panel);

  let current = null;
  const code = () => readCode(codeLines);
  const say = (text) => {
    message.textContent = text;
    notify(root, text);
    return text;
  };
  const write = (text) => {
    showCode(root, codeLines, text);
    page.dispatchEvent(new view.CustomEvent('dslkit:run', { bubbles: true }));
  };

  // The panel shows what the code says about the block now; with no block, or with nothing to edit, it is hidden.
  const show = (id) => {
    const properties = id === null ? null : propertiesOf(code(), id);
    current = properties ? id : null;
    panel.hidden = properties === null;
    if (properties === null) return null;
    idOutput.textContent = id;
    positionField.hidden = properties.position === null;
    positionOutput.textContent = properties.position ?? '';
    labelField.hidden = properties.label === null;
    labelInput.value = properties.label === null ? '' : properties.label.replace(/\n/g, ' ');
    kindField.hidden = properties.kinds.length === 0;
    kindSelect.replaceChildren(
      ...properties.kinds.map((keyword) => {
        const option = el('option', '', kindName(keyword));
        option.value = keyword;
        option.selected = keyword === properties.keyword;
        return option;
      }),
    );
    return properties;
  };

  const apply = (next, done) => {
    if (next === null) return false;
    const before = code();
    const verdict = gate(before, next, lang);
    if (!verdict.ok) {
      say(t('refused', { reason: verdict.message }));
      show(current);
      return false;
    }
    write(next);
    say(done);
    return true;
  };

  const changeLabel = () => {
    if (current === null) return false;
    const value = labelInput.value.trim();
    const known = propertiesOf(code(), current)?.label;
    if (value === '') {
      say(t('emptyLabel'));
      show(current);
      return false;
    }
    if (value === known?.replace(/\n/g, ' ')) return false;
    return apply(setLabel(code(), current, value), t('labelChanged', { id: current }));
  };
  const changeKind = () => {
    if (current === null) return false;
    const keyword = kindSelect.value;
    const next = setKind(code(), current, keyword);
    if (next === null) {
      say(t('notRead', { kind: keyword }));
      show(current);
      return false;
    }
    return apply(next, t('kindChanged', { id: current, kind: keyword }));
  };
  labelInput.addEventListener('change', changeLabel);
  kindSelect.addEventListener('change', changeKind);
  // Escape in a field gives the focus back to the board, so the keyboard never stays trapped in the panel.
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    /** @type {HTMLElement | null} */ (page.querySelector('.canvas__remote .notation__node--picked'))?.focus({ preventScroll: true });
  });

  // The palette announces the block that is selected; a run rewrites the lines, so the fields are read again.
  page.addEventListener('dslkit:pick', (event) => show(/** @type {CustomEvent} */ (event).detail?.id ?? null));
  page.addEventListener('dslkit:run', () => current !== null && show(current));
  return { show, changeLabel, changeKind, current: () => current };
};
