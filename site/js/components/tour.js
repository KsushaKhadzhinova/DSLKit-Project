const STEPS = [
  {
    selector: '.code',
    ru: ['Код диаграммы', 'Пишите диаграмму текстом: одна строка описывает один элемент или связь.'],
    en: ['Diagram code', 'Write the diagram as text: one line describes one element or link.'],
  },
  {
    selector: '.editor-toolbar__run .button--run',
    ru: ['Запуск', 'Нажмите «Запустить» или Ctrl+Enter, и диаграмма будет нарисована.'],
    en: ['Run', 'Press Run or Ctrl+Enter and the diagram is drawn.'],
  },
  {
    selector: '.canvas',
    ru: ['Холст', 'Здесь видна диаграмма. Кнопки справа меняют масштаб и подгоняют рисунок под окно.'],
    en: ['Canvas', 'The diagram is shown here. The buttons on the right zoom and fit the drawing to the window.'],
  },
  {
    selector: '[data-notation-select]',
    ru: ['Шаблоны', 'Выберите нотацию, и редактор подставит готовый пример, который можно изменить.'],
    en: ['Templates', 'Choose a notation and the editor puts in a ready example that you can change.'],
  },
  {
    selector: '.editor-menu',
    ru: ['Экспорт и настройки', 'В меню «⋯» экспорт в SVG, PNG, JPEG, draw.io и HTML, автосохранение и этот тур.'],
    en: ['Export and settings', 'The "⋯" menu has export to SVG, PNG, JPEG, draw.io and HTML, autosave and this tour.'],
  },
];

const LABELS = {
  ru: { next: 'Далее', back: 'Назад', done: 'Готово', skip: 'Пропустить', step: (n, total) => `Шаг ${n} из ${total}` },
  en: { next: 'Next', back: 'Back', done: 'Done', skip: 'Skip', step: (n, total) => `Step ${n} of ${total}` },
};

export const TOUR_KEY = 'tour-done';
export const TOUR_STEPS = STEPS.length;

// A five step tour of the editor. It opens once for a new visitor, the menu can open it again, Escape or Skip closes it.
export const initTour = ({ root = document, storage } = {}) => {
  const page = root.querySelector('.app-page--editor');
  const lang = root.documentElement.lang === 'en' ? 'en' : 'ru';
  const words = LABELS[lang];
  const steps = page ? STEPS.filter((step) => page.querySelector(step.selector)) : [];
  if (steps.length === 0) return null;

  let card = null;
  let index = 0;
  const marked = () => root.querySelector('.tour__target');

  const close = (finished) => {
    marked()?.classList.remove('tour__target');
    card?.remove();
    card = null;
    root.removeEventListener('keydown', onKey);
    if (finished) storage.set(TOUR_KEY, true);
  };
  function onKey(event) {
    if (event.key === 'Escape') close(true);
  }

  const show = (position) => {
    index = position;
    marked()?.classList.remove('tour__target');
    const step = steps[index];
    const target = page.querySelector(step.selector);
    target.classList.add('tour__target');
    target.scrollIntoView?.({ block: 'nearest' });
    const [title, text] = step[lang];
    const last = index === steps.length - 1;
    card.replaceChildren();
    const heading = root.createElement('h2');
    heading.className = 'tour__title';
    heading.id = 'tour-title';
    heading.textContent = title;
    const body = root.createElement('p');
    body.className = 'tour__text';
    body.textContent = text;
    const count = root.createElement('p');
    count.className = 'tour__count';
    count.textContent = words.step(index + 1, steps.length);
    const actions = root.createElement('div');
    actions.className = 'tour__actions';
    const button = (label, className, handler) => {
      const item = root.createElement('button');
      item.type = 'button';
      item.className = `button ${className}`;
      item.textContent = label;
      item.addEventListener('click', handler);
      return item;
    };
    if (index > 0) actions.append(button(words.back, 'button--quiet', () => show(index - 1)));
    actions.append(button(words.skip, 'button--quiet', () => close(true)));
    const forward = button(last ? words.done : words.next, 'button--primary', () => (last ? close(true) : show(index + 1)));
    actions.append(forward);
    card.append(heading, body, count, actions);
    forward.focus();
  };

  const start = () => {
    if (card) close(false);
    card = root.createElement('div');
    card.className = 'tour';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'tour-title');
    root.body.append(card);
    root.addEventListener('keydown', onKey);
    show(0);
  };

  page.querySelectorAll('[data-tour-start]').forEach((button) => button.addEventListener('click', start));
  if (storage.get(TOUR_KEY, false) !== true) start();
  return {
    start,
    close: () => close(true),
    next: () => (card && index < steps.length - 1 ? show(index + 1) : close(true)),
    isOpen: () => card !== null,
    step: () => index,
  };
};
