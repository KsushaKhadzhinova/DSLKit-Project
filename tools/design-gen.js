/* node:coverage disable */
// Generator of the DSLKit design assets: screens of the site and the app (Russian and English, light and dark),
// device mockups, low-fidelity wireframes and component sheets. It has no imports, so the same file runs in Node
// (tools/build-design.js writes the SVG files) and in a browser page.
const SANS = 'Inter, Arial, sans-serif';
const MONO = "'JetBrains Mono', Consolas, monospace";
const GRAY = {
  primary: '#9ca3af',
  secondary: '#e5e7eb',
  accent: '#6b7280',
  background: '#f3f4f6',
  surface: '#ffffff',
  border: '#9ca3af',
  text: '#374151',
  'text-light': '#6b7280',
  muted: '#9ca3af',
  link: '#4b5563',
  error: '#6b7280',
  warning: '#6b7280',
};
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

export const STRINGS = {
  ru: {
    nav: ['Нотации', 'Как это работает', 'Для кого', 'Тарифы', 'FAQ'],
    langSwitch: 'English',
    themeToLight: 'Светлая тема',
    themeToDark: 'Тёмная тема',
    cta: 'В бету',
    badge: 'Скоро: закрытая бета',
    h1: ['Пишите код —', 'получайте диаграмму'],
    lead: 'Веб-редактор диаграмм как кода: опишите схему текстом на DSL, а DSLKit проверит её по правилам нотации и нарисует.',
    hero: 'Создать диаграмму',
    heroNote: 'Откроется редактор: слева код, справа диаграмма',
    join: 'Записаться в бету',
    how: 'Как это работает',
    notationsTitle: 'Шесть нотаций в одном редакторе',
    notations: [
      ['UML', 'в бете'],
      ['BPMN', 'в бете'],
      ['ERD', 'в бете'],
      ['DFD', 'в планах'],
      ['IDEF0', 'в планах'],
      ['Сети Петри', 'в планах'],
    ],
    notationText: 'Шаблон с примером кода',
    steps: [
      ['1. Пишете код', 'Описываете диаграмму на DSL'],
      ['2. Видите схему', 'Холст обновляется сразу'],
      ['3. Экспортируете', 'SVG, PNG, PlantUML, Mermaid'],
    ],
    audienceTitle: 'Для кого',
    audience: [
      ['Студентам', 'Лабораторные и дипломы'],
      ['Разработчикам', 'Схемы рядом с кодом'],
      ['Аналитикам', 'Процессы без рисования'],
    ],
    pricingTitle: 'Тарифы',
    plans: [
      ['Free', 'До 5 диаграмм в день в бете'],
      ['Pro', 'Без лимитов, история версий, совместная работа'],
    ],
    faqTitle: 'Частые вопросы',
    faq: ['Что такое DSLKit?', 'Нужно ли уметь программировать?', 'Какие нотации поддерживаются?', 'Сколько это стоит?'],
    formTitle: 'Записаться в бету',
    name: 'Имя',
    email: 'Эл. почта',
    notation: 'Нотация',
    consent: 'Согласен на обработку данных',
    submit: 'Отправить',
    errorField: 'Введите имя от 2 символов',
    footer: '© 2026 DSLKit. Дипломный проект БГУИР.',
    privacyTitle: 'Политика конфиденциальности',
    privacyUpdated: 'Обновлено 13 октября 2026',
    privacy: ['Какие данные мы собираем', 'Зачем мы используем данные', 'Срок хранения', 'Передача третьим лицам', 'Ваши права', 'Контакт'],
    thanksTitle: 'Спасибо, вы в списке беты',
    thanksText: 'Заявка сохранена в вашем браузере, мы свяжемся с вами, когда откроется доступ.',
    toHome: 'На главную',
    toPrivacy: 'Политика конфиденциальности',
    errTitle: 'Страница не найдена',
    errText: 'Возможно, адрес набран с ошибкой или страница переехала.',
    appNav: ['Мои проекты', 'Шаблоны', 'Общие', 'Корзина'],
    newDiagram: 'Новая диаграмма',
    welcome: 'Добро пожаловать в DSLKit',
    welcomeText: 'Выберите шаблон или начните с пустого файла.',
    quota: 'Бета: 3 из 5 сегодня',
    dashTitle: 'Мои проекты',
    chips: ['Все', 'BPMN', 'ERD', 'DFD', 'IDEF0'],
    search: 'Поиск проектов',
    sort: 'Сначала новые',
    found: 'Найдено проектов: 8',
    projects: [
      'Обработка заказов',
      'Оформление покупки',
      'Схема базы магазина',
      'Потоки данных склада',
      'Классы доставки',
      'Платёжный процесс',
      'Сеть обработки заявок',
      'Последовательность входа',
    ],
    updated: 'Обновлён',
    settingsTitle: 'Настройки редактора',
    settingsNav: ['Редактор', 'Холст', 'Тема', 'Горячие клавиши', 'AI и интеграции', 'Аккаунт и тариф'],
    settingsRows: ['Номера строк', 'Перенос строк', 'Автосохранение', 'Направляющие'],
    themeNames: ['Светлая', 'Тёмная', 'Как в системе'],
    run: 'Запустить',
    files: 'Проводник',
    problems: 'Проблемы',
    problemText: 'Неизвестное свойство «contro»',
    status: 'Автосохранение: вкл',
    renderEngine: 'Движок: Kroki · Graphviz',
    compButtons: 'Кнопки',
    compInputs: 'Поля и переключатели',
    compBadges: 'Метки и фильтры',
    compCards: 'Карточки',
    compNav: 'Навигация и вкладки',
    compFeedback: 'Сообщения и состояния',
    disabled: 'Недоступна',
    placeholder: 'Введите текст',
    error: 'Ошибка проверки',
    toast: 'Диаграмма сохранена',
    dialog: 'Несохранённые изменения',
    loading: 'Загрузка диаграммы…',
    empty: 'Проектов не найдено',
    wireframe: 'Каркас',
    mockup: 'Макет',
  },
  en: {
    nav: ['Notations', 'How it works', 'Audience', 'Pricing', 'FAQ'],
    langSwitch: 'Русский',
    themeToLight: 'Light theme',
    themeToDark: 'Dark theme',
    cta: 'Join beta',
    badge: 'Soon: closed beta',
    h1: ['Write code,', 'get a diagram'],
    lead: 'A web editor for diagrams as code: describe a scheme in text in the DSL, and DSLKit checks it against the notation rules and draws it.',
    hero: 'Create a diagram',
    heroNote: 'The editor opens: code on the left, the diagram on the right',
    join: 'Join the beta',
    how: 'How it works',
    notationsTitle: 'Six notations in one editor',
    notations: [
      ['UML', 'in beta'],
      ['BPMN', 'in beta'],
      ['ERD', 'in beta'],
      ['DFD', 'planned'],
      ['IDEF0', 'planned'],
      ['Petri nets', 'planned'],
    ],
    notationText: 'A template with sample code',
    steps: [
      ['1. Write code', 'Describe the diagram in the DSL'],
      ['2. See the scheme', 'The canvas updates at once'],
      ['3. Export', 'SVG, PNG, PlantUML, Mermaid'],
    ],
    audienceTitle: 'Who it is for',
    audience: [
      ['Students', 'Lab works and theses'],
      ['Developers', 'Diagrams next to code'],
      ['Analysts', 'Processes without drawing'],
    ],
    pricingTitle: 'Pricing',
    plans: [
      ['Free', 'Up to 5 diagrams a day in the beta'],
      ['Pro', 'No limits, version history, teamwork'],
    ],
    faqTitle: 'Frequently asked questions',
    faq: ['What is DSLKit?', 'Do I need to program?', 'Which notations are supported?', 'How much does it cost?'],
    formTitle: 'Join the beta',
    name: 'Name',
    email: 'Email',
    notation: 'Notation',
    consent: 'I agree to data processing',
    submit: 'Send',
    errorField: 'Enter a name of 2 characters or more',
    footer: '© 2026 DSLKit. BSUIR diploma project.',
    privacyTitle: 'Privacy policy',
    privacyUpdated: 'Updated 13 October 2026',
    privacy: ['What data we collect', 'Why we use the data', 'Retention period', 'Sharing with third parties', 'Your rights', 'Contact'],
    thanksTitle: 'Thank you, you are on the beta list',
    thanksText: 'Your request is saved in your browser, and we will contact you when access opens.',
    toHome: 'Back to home',
    toPrivacy: 'Privacy policy',
    errTitle: 'Page not found',
    errText: 'The address may be mistyped or the page has moved.',
    appNav: ['My projects', 'Templates', 'Shared', 'Trash'],
    newDiagram: 'New diagram',
    welcome: 'Welcome to DSLKit',
    welcomeText: 'Pick a template or start from an empty file.',
    quota: 'Beta: 3 of 5 today',
    dashTitle: 'My projects',
    chips: ['All', 'BPMN', 'ERD', 'DFD', 'IDEF0'],
    search: 'Search projects',
    sort: 'Newest first',
    found: 'Projects found: 8',
    projects: [
      'Order processing',
      'Checkout',
      'Shop database schema',
      'Warehouse data flows',
      'Delivery classes',
      'Payment process',
      'Request handling net',
      'Sign-in sequence',
    ],
    updated: 'Updated',
    settingsTitle: 'Editor settings',
    settingsNav: ['Editor', 'Canvas', 'Theme', 'Shortcuts', 'AI and integrations', 'Account and plan'],
    settingsRows: ['Line numbers', 'Line wrap', 'Autosave', 'Guides'],
    themeNames: ['Light', 'Dark', 'System'],
    run: 'Run',
    files: 'Explorer',
    problems: 'Problems',
    problemText: 'Unknown property "contro"',
    status: 'Autosave: on',
    renderEngine: 'Engine: Kroki · Graphviz',
    compButtons: 'Buttons',
    compInputs: 'Fields and switches',
    compBadges: 'Badges and filters',
    compCards: 'Cards',
    compNav: 'Navigation and tabs',
    compFeedback: 'Messages and states',
    disabled: 'Disabled',
    placeholder: 'Type text',
    error: 'Validation error',
    toast: 'Diagram saved',
    dialog: 'Unsaved changes',
    loading: 'Loading the diagram…',
    empty: 'No projects found',
    wireframe: 'Wireframe',
    mockup: 'Mockup',
  },
};

const CODE = [
  'diagram idef0 "Order process"',
  'box A0 "Process order" {',
  '  input: Order',
  '  output: Invoice',
  '}',
  'box A1 "Ship goods" {',
  '  input: Invoice',
  '}',
];

const makeCanvas = (width, theme, wire) => {
  const t = wire ? GRAY : theme;
  const out = [];
  const defs = `<defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="${t.border}"/></pattern></defs>`;
  const textWidth = (s, size) => Math.round(String(s).length * size * 0.56);
  const c = {
    t,
    wire,
    width,
    textWidth,
    rect: (x, y, w, h, fill, o = {}) =>
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 0}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}"` : ''}/>`),
    text: (x, y, s, o = {}) => {
      const size = o.size ?? 14;
      if (wire && size < 20 && !o.mono) {
        const w = textWidth(s, size);
        const left = o.anchor === 'middle' ? x - w / 2 : o.anchor === 'end' ? x - w : x;
        out.push(`<rect x="${left}" y="${y - size * 0.75}" width="${w}" height="${Math.round(size * 0.5)}" rx="3" fill="#d1d5db"/>`);
        return;
      }
      out.push(
        `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : SANS}" font-size="${size}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? t.text}" text-anchor="${o.anchor ?? 'start'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${esc(s)}</text>`,
      );
    },
    card: (x, y, w, h, o = {}) => c.rect(x, y, w, h, o.fill ?? t.surface, { rx: o.rx ?? 12, stroke: o.stroke ?? t.border }),
    button: (x, y, label, o = {}) => {
      const size = o.size ?? 14;
      const w = o.w ?? textWidth(label, size) + 40;
      const h = o.h ?? 44;
      const v = o.variant ?? 'primary';
      if (v === 'primary') c.rect(x, y, w, h, t.primary, { rx: 8 });
      else if (v === 'secondary') c.rect(x, y, w, h, t.surface, { rx: 8, stroke: t.border });
      else if (v === 'hero') c.rect(x, y, w, h, '#ffffff', { rx: 24 });
      else if (v === 'disabled') c.rect(x, y, w, h, t.border, { rx: 8 });
      const fill = v === 'primary' ? '#ffffff' : v === 'hero' ? (wire ? '#374151' : '#1d4ed8') : v === 'disabled' ? t.muted : t.text;
      c.text(x + w / 2, y + h / 2 + size * 0.35, label, { size, weight: v === 'hero' ? 700 : 600, fill, anchor: 'middle' });
      return w;
    },
    chip: (x, y, label, o = {}) => {
      const w = textWidth(label, 13) + 28;
      c.rect(x, y, w, 30, o.active ? t.primary : t.surface, { rx: 15, stroke: o.active ? t.primary : t.border });
      c.text(x + w / 2, y + 20, label, { size: 13, weight: 600, fill: o.active ? '#ffffff' : t.text, anchor: 'middle' });
      return w;
    },
    badge: (x, y, label, color) => {
      const w = textWidth(label, 12) + 20;
      c.rect(x, y, w, 22, t.secondary, { rx: 11 });
      c.text(x + w / 2, y + 15, label, { size: 12, weight: 600, fill: color ?? t.link, anchor: 'middle' });
      return w;
    },
    input: (x, y, w, label, value, o = {}) => {
      c.text(x, y, label, { size: 14, weight: 600 });
      c.rect(x, y + 8, w, 40, t.surface, { rx: 8, stroke: o.error ? t.error : t.border });
      if (value) c.text(x + 12, y + 33, value, { size: 14, fill: o.error ? t.text : t.muted });
      if (o.error) c.text(x, y + 68, o.error, { size: 12, fill: t.error });
    },
    toggle: (x, y, on) => {
      c.rect(x, y, 44, 24, on ? t.primary : t.border, { rx: 12 });
      c.rect(on ? x + 22 : x + 2, y + 2, 20, 20, '#ffffff', { rx: 10 });
    },
    icon: (x, y, size, fill) => out.push(`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fill ?? t.secondary}"/>`),
    logo: (x, y, label) => {
      c.rect(x, y, 28, 28, t.primary, { rx: 7 });
      c.text(x + 14, y + 19, '</>', { size: 12, weight: 700, fill: '#ffffff', anchor: 'middle', mono: true });
      c.text(x + 38, y + 21, label, { size: 18, weight: 700 });
    },
    line: (x1, y1, x2, y2, stroke, wd = 1) => out.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="${wd}" fill="none"/>`),
    dots: (x, y, w, h) => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#dots)"/>`),
    gradPanel: (x, y, w, h) => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${t.primary}"/>`),
    raw: (s) => out.push(s),
    done: (h) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">${defs}<rect width="${width}" height="${h}" fill="${t.background}"/>${out.join('')}</svg>\n`,
  };
  return c;
};

const header = (c, s, W, device, themeName) => {
  const t = c.t;
  const pad = device === 'mobile' ? 16 : 48;
  c.rect(0, 0, W, 64, t.surface, { stroke: t.border });
  c.logo(pad, 18, 'DSLKit');
  if (device === 'mobile') {
    c.rect(W - 56, 24, 24, 2, t.text);
    c.rect(W - 56, 30, 24, 2, t.text);
    c.rect(W - 56, 36, 24, 2, t.text);
    c.rect(W - 156, 16, 88, 32, t.surface, { rx: 16, stroke: t.border });
    c.text(W - 112, 37, themeName, { size: 11, weight: 600, fill: t['text-light'], anchor: 'middle' });
    return;
  }
  let x = device === 'desktop' ? 220 : 190;
  const nav = device === 'desktop' ? s.nav : s.nav.slice(0, 4);
  for (const item of nav) {
    c.text(x, 38, item, { size: 14, fill: t['text-light'] });
    x += c.textWidth(item, 14) + 28;
  }
  let right = W - pad;
  const w = c.textWidth(s.cta, 14) + 32;
  c.button(right - w, 16, s.cta, { w, h: 32 });
  right -= w + 12;
  const tw = c.textWidth(themeName, 12) + 28;
  c.rect(right - tw, 16, tw, 32, t.surface, { rx: 16, stroke: t.border });
  c.text(right - tw / 2, 37, themeName, { size: 12, weight: 600, fill: t['text-light'], anchor: 'middle' });
  right -= tw + 12;
  if (device === 'desktop') c.text(right - c.textWidth(s.langSwitch, 13), 37, s.langSwitch, { size: 13, weight: 600, fill: t['text-light'] });
};

const footer = (c, s, W, y, device) => {
  const t = c.t;
  const pad = device === 'mobile' ? 16 : 48;
  c.rect(0, y, W, 96, t.surface, { stroke: t.border });
  c.text(pad, y + 54, s.footer, { size: 14, fill: t['text-light'] });
  if (device !== 'mobile') c.text(W - pad, y + 54, s.toPrivacy, { size: 14, fill: t.link, anchor: 'end' });
  return y + 96;
};

const codeCard = (c, x, y, w, h, withDiagram) => {
  const t = c.t;
  c.card(x, y, w, h, { rx: 16 });
  CODE.slice(0, withDiagram ? 5 : 8).forEach((line, i) => c.text(x + 24, y + 38 + i * 24, line, { size: 13, mono: true }));
  if (withDiagram) {
    const by = y + h - 76;
    c.rect(x + 24, by, 96, 48, t.secondary, { rx: 6, stroke: t.primary });
    c.text(x + 72, by + 29, 'A0', { size: 14, weight: 600, anchor: 'middle' });
    c.rect(x + w - 120, by, 96, 48, t.secondary, { rx: 6, stroke: t.primary });
    c.text(x + w - 72, by + 29, 'A1', { size: 14, weight: 600, anchor: 'middle' });
    c.rect(x + 120, by + 23, w - 240, 2, t.primary);
  }
};

const cols = (c, x, y, W, n, gap, count, h, draw) => {
  const w = Math.floor((W - gap * (n - 1)) / n);
  for (let i = 0; i < count; i += 1) {
    const cx = x + (i % n) * (w + gap);
    const cy = y + Math.floor(i / n) * (h + gap);
    c.card(cx, cy, w, h);
    draw(cx, cy, w, i);
  }
  return y + Math.ceil(count / n) * (h + gap) - gap;
};

const landing = (c, s, device, themeName, variant = 'a') => {
  const t = c.t;
  const W = c.width;
  const pad = device === 'mobile' ? 16 : 48;
  const inner = W - pad * 2;
  header(c, s, W, device, themeName);
  const b = variant === 'b';
  if (b) c.dots(0, 64, W, device === 'desktop' ? 520 : 460);
  let y = 112;
  const badgeW = c.textWidth(s.badge, 13) + 36;
  c.rect(pad, y - 22, badgeW, 30, t.surface, { rx: 15, stroke: t.border });
  c.text(pad + badgeW / 2, y - 2, s.badge, { size: 13, weight: 600, fill: t['text-light'], anchor: 'middle' });
  y += 68;
  const big = device === 'desktop' ? 56 : device === 'tablet' ? 40 : 32;
  s.h1.forEach((line, i) => c.text(pad, y + i * (big + 8), line, { size: big, weight: 700, ls: b ? -big * 0.02 : 0 }));
  y += s.h1.length * (big + 8) + 8;
  const leadW = device === 'desktop' ? 640 : inner;
  const maxChars = Math.floor(leadW / 9.6);
  const words = s.lead.split(' ');
  const lines = words.reduce((acc, word) => {
    if (!acc.length || `${acc[acc.length - 1]} ${word}`.length > maxChars) acc.push(word);
    else acc[acc.length - 1] += ` ${word}`;
    return acc;
  }, []);
  lines.forEach((line, i) => c.text(pad, y + i * 28, line, { size: 18, fill: t['text-light'] }));
  y += lines.length * 28 + 24;
  const panelW = device === 'desktop' ? 420 : inner;
  if (b) {
    c.button(pad, y, s.hero, { w: Math.min(panelW, 320), h: 56, size: 18 });
    c.text(pad, y + 84, s.heroNote.slice(0, device === 'mobile' ? 38 : 60), { size: 12, fill: t['text-light'] });
    if (device === 'desktop') codeCard(c, 720, 140, W - 720 - pad, 320, true);
    y += 112;
    const bw = c.button(pad, y, s.join, { variant: 'secondary', h: 48 });
    c.button(pad + bw + 16, y, s.how, { variant: 'secondary', h: 48 });
    y += 88;
  } else {
    c.gradPanel(pad, y, panelW, 136);
    c.button(pad + 24, y + 24, s.hero, { variant: 'hero', w: panelW - 48, h: 65, size: 20 });
    c.text(pad + panelW / 2, y + 112, s.heroNote.slice(0, device === 'mobile' ? 38 : 60), { size: 12, fill: '#ffffff', anchor: 'middle' });
    if (device === 'desktop') codeCard(c, 720, 140, W - 720 - pad, 320, true);
    y += 160;
    const bw = c.button(pad, y, s.join, { h: 48 });
    c.button(pad + bw + 16, y, s.how, { variant: 'secondary', h: 48 });
    y += 88;
  }
  if (device !== 'desktop') {
    codeCard(c, pad, y, inner, 260, true);
    y += 308;
  } else y = Math.max(y, 520);
  let x = pad;
  let row = y;
  s.notations.forEach(([name]) => {
    const w = c.textWidth(name, 13) + 28;
    if (x + w > W - pad) {
      x = pad;
      row += 42;
    }
    c.chip(x, row, name);
    x += w + 10;
  });
  y = row + 80;
  c.text(pad, y, s.notationsTitle, { size: device === 'mobile' ? 24 : 32, weight: 700 });
  y += 32;
  const n = device === 'desktop' ? 3 : device === 'tablet' ? 2 : 1;
  y = cols(c, pad, y, inner, n, 16, 6, 110, (cx, cy, w, i) => {
    c.text(cx + 20, cy + 36, s.notations[i][0], { size: 18, weight: 600 });
    c.badge(cx + 20, cy + 50, s.notations[i][1], i < 3 ? t.accent : t.warning);
    c.text(cx + 20, cy + 96, s.notationText, { size: 14, fill: t['text-light'] });
  });
  y += 72;
  c.text(pad, y, s.how, { size: device === 'mobile' ? 24 : 32, weight: 700 });
  y += 32;
  y = cols(c, pad, y, inner, device === 'mobile' ? 1 : 3, 16, 3, 96, (cx, cy, w, i) => {
    c.text(cx + 20, cy + 40, s.steps[i][0], { size: 18, weight: 600 });
    c.text(cx + 20, cy + 68, s.steps[i][1], { size: 14, fill: t['text-light'] });
  });
  y += 72;
  c.text(pad, y, s.audienceTitle, { size: device === 'mobile' ? 24 : 32, weight: 700 });
  y += 32;
  y = cols(c, pad, y, inner, device === 'mobile' ? 1 : 3, 16, 3, 96, (cx, cy, w, i) => {
    c.text(cx + 20, cy + 40, s.audience[i][0], { size: 18, weight: 600 });
    c.text(cx + 20, cy + 68, s.audience[i][1], { size: 14, fill: t['text-light'] });
  });
  y += 72;
  c.text(pad, y, s.pricingTitle, { size: device === 'mobile' ? 24 : 32, weight: 700 });
  y += 32;
  y = cols(c, pad, y, inner, device === 'mobile' ? 1 : 2, 16, 2, 116, (cx, cy, w, i) => {
    c.text(cx + 20, cy + 40, s.plans[i][0], { size: 20, weight: 700 });
    c.text(cx + 20, cy + 70, s.plans[i][1], { size: 14, fill: t['text-light'] });
    if (i === 1) c.badge(cx + w - 90, cy + 16, 'Pro', t.link);
  });
  y += 72;
  c.text(pad, y, s.faqTitle, { size: device === 'mobile' ? 24 : 32, weight: 700 });
  y += 32;
  y = cols(c, pad, y, inner, device === 'desktop' ? 2 : 1, 16, 4, 68, (cx, cy, w, i) => {
    c.text(cx + 20, cy + 40, s.faq[i], { size: 16, weight: 600 });
    c.text(cx + w - 32, cy + 40, '+', { size: 20, weight: 600, fill: t['text-light'] });
  });
  y += 72;
  c.text(pad, y, s.formTitle, { size: device === 'mobile' ? 24 : 32, weight: 700 });
  y += 40;
  const fw = Math.min(480, inner);
  c.input(pad, y, fw, s.name, '', { error: s.errorField });
  c.input(pad, y + 96, fw, s.email, 'name@example.com');
  c.input(pad, y + 184, fw, s.notation, 'IDEF0');
  c.rect(pad, y + 264, 20, 20, t.surface, { rx: 4, stroke: t.border });
  c.text(pad + 32, y + 280, s.consent, { size: 14 });
  c.button(pad, y + 304, s.submit, { h: 48, w: 160 });
  y += 392;
  return footer(c, s, W, y, device);
};

const privacy = (c, s, device, themeName) => {
  const t = c.t;
  const W = c.width;
  header(c, s, W, device, themeName);
  const pad = 48;
  let y = 130;
  c.text(pad, y, s.privacyTitle, { size: 40, weight: 700 });
  c.text(pad, y + 32, s.privacyUpdated, { size: 14, fill: t.muted });
  y += 88;
  s.privacy.forEach((title) => {
    c.text(pad, y, title, { size: 22, weight: 700 });
    for (let i = 0; i < 3; i += 1) c.text(pad, y + 32 + i * 24, s.lead.slice(0, 110 - i * 14), { size: 15, fill: t['text-light'] });
    y += 136;
  });
  return footer(c, s, W, y, device);
};

const thanks = (c, s, device, themeName) => {
  const t = c.t;
  const W = c.width;
  header(c, s, W, device, themeName);
  c.icon(W / 2 - 36, 150, 72, t.accent);
  c.text(W / 2, 198, '✓', { size: 40, weight: 700, fill: '#ffffff', anchor: 'middle' });
  c.text(W / 2, 290, s.thanksTitle, { size: 36, weight: 700, anchor: 'middle' });
  c.text(W / 2, 330, s.thanksText.slice(0, 70), { size: 16, fill: t['text-light'], anchor: 'middle' });
  c.text(W / 2, 354, s.thanksText.slice(70), { size: 16, fill: t['text-light'], anchor: 'middle' });
  const bw = c.textWidth(s.toHome, 14) + 40;
  c.button(W / 2 - bw - 8, 400, s.toHome, { h: 48 });
  c.button(W / 2 + 8, 400, s.toPrivacy, { variant: 'secondary', h: 48 });
  return footer(c, s, W, 560, device);
};

const error404 = (c, s, device, themeName) => {
  const t = c.t;
  const W = c.width;
  header(c, s, W, device, themeName);
  c.text(W / 2, 270, '404', { size: 140, weight: 700, fill: t.primary, anchor: 'middle' });
  c.text(W / 2, 330, s.errTitle, { size: 32, weight: 700, anchor: 'middle' });
  c.text(W / 2, 368, s.errText, { size: 16, fill: t['text-light'], anchor: 'middle' });
  const bw = c.textWidth(s.toHome, 14) + 40;
  c.button(W / 2 - bw / 2, 410, s.toHome, { h: 48 });
  return footer(c, s, W, 560, device);
};

const appShell = (c, s, W, active) => {
  const t = c.t;
  c.rect(0, 0, W, 64, t.surface, { stroke: t.border });
  c.logo(24, 18, 'DSLKit');
  c.rect(260, 14, 360, 36, t.background, { rx: 8, stroke: t.border });
  c.text(278, 37, s.search, { size: 14, fill: t.muted });
  const bw = c.textWidth(s.newDiagram, 14) + 32;
  c.button(W - 96 - bw, 14, s.newDiagram, { h: 36, w: bw });
  c.icon(W - 56, 16, 32, t.secondary);
  c.rect(0, 64, 232, 856, t.surface, { stroke: t.border });
  s.appNav.forEach((item, i) => {
    if (i === active) c.rect(12, 84 + i * 48, 208, 40, t.secondary, { rx: 8 });
    c.icon(24, 94 + i * 48, 20, i === active ? t.primary : t.border);
    c.text(56, 110 + i * 48, item, { size: 14, weight: i === active ? 700 : 500, fill: i === active ? t.link : t['text-light'] });
  });
  c.card(12, 800, 208, 92);
  c.text(28, 830, s.quota, { size: 13, weight: 600 });
  c.rect(28, 848, 176, 8, t.border, { rx: 4 });
  c.rect(28, 848, 106, 8, t.primary, { rx: 4 });
};

const welcome = (c, s, device, themeName) => {
  const t = c.t;
  appShell(c, s, c.width, 0);
  c.text(280, 150, s.welcome, { size: 36, weight: 700 });
  c.text(280, 188, s.welcomeText, { size: 16, fill: t['text-light'] });
  cols(c, 280, 232, 1100, 3, 16, 3, 140, (cx, cy, w, i) => {
    c.rect(cx + 20, cy + 20, w - 40, 56, t.secondary, { rx: 8 });
    c.text(cx + 20, cy + 108, s.notations[i][0], { size: 16, weight: 700 });
    c.badge(cx + 20, cy + 114, s.notations[i][1]);
  });
  c.button(280, 450, s.newDiagram, { h: 48 });
  return 920;
};

const dashboard = (c, s, device, themeName) => {
  const t = c.t;
  appShell(c, s, c.width, 0);
  c.text(280, 130, s.dashTitle, { size: 32, weight: 700 });
  let x = 280;
  s.chips.forEach((chip, i) => {
    x += c.chip(x, 156, chip, { active: i === 0 }) + 8;
  });
  c.rect(1040, 156, 150, 30, t.surface, { rx: 8, stroke: t.border });
  c.text(1052, 176, s.sort, { size: 13, fill: t['text-light'] });
  c.text(280, 224, s.found, { size: 13, fill: t['text-light'] });
  cols(c, 280, 244, 1100, 4, 16, 8, 188, (cx, cy, w, i) => {
    c.rect(cx + 12, cy + 12, w - 24, 80, t.secondary, { rx: 8 });
    c.text(cx + 16, cy + 120, s.projects[i], { size: 15, weight: 700 });
    c.badge(cx + 16, cy + 132, ['IDEF0', 'BPMN', 'ERD', 'DFD', 'UML', 'BPMN', 'Petri', 'UML'][i]);
    c.text(cx + 16, cy + 172, `${s.updated} 12.10.2026`, { size: 12, fill: t.muted });
  });
  return 920;
};

const settings = (c, s, device, themeName) => {
  const t = c.t;
  appShell(c, s, c.width, 0);
  c.text(280, 130, s.settingsTitle, { size: 32, weight: 700 });
  s.settingsNav.forEach((item, i) => {
    c.text(280, 190 + i * 40, item, { size: 14, weight: i === 0 ? 700 : 500, fill: i === 0 ? t.link : t['text-light'] });
  });
  c.card(520, 160, 800, 320);
  s.settingsRows.forEach((row, i) => {
    c.text(552, 210 + i * 64, row, { size: 15, weight: 600 });
    c.toggle(1236, 192 + i * 64, i !== 1);
    c.line(552, 232 + i * 64, 1288, 232 + i * 64, t.border);
  });
  c.text(520, 540, s.themeNames.join(' · '), { size: 14, fill: t['text-light'] });
  s.themeNames.forEach((name, i) => {
    c.card(520 + i * 268, 560, 252, 140, { stroke: i === 0 ? t.primary : t.border });
    c.rect(536 + i * 268, 576, 220, 68, i === 1 ? '#1e1e2e' : t.secondary, { rx: 8 });
    c.text(536 + i * 268, 676, name, { size: 14, weight: 600 });
  });
  return 920;
};

const editor = (c, s, device, themeName) => {
  const t = c.t;
  const W = c.width;
  c.rect(0, 0, W, 56, t.surface, { stroke: t.border });
  c.logo(16, 14, 'DSLKit');
  c.button(260, 10, `▶ ${s.run}`, { h: 36, w: 120 });
  c.text(W - 24, 33, s.renderEngine, { size: 12, fill: t['text-light'], anchor: 'end' });
  c.rect(0, 56, 240, 780, t.surface, { stroke: t.border });
  c.text(20, 92, s.files, { size: 12, weight: 700, fill: t.muted });
  ['order.dsl', 'rules.dsl', 'invoice.dsl'].forEach((f, i) => {
    if (i === 0) c.rect(8, 106, 224, 32, t.secondary, { rx: 6 });
    c.text(24, 128 + i * 36, f, { size: 14, weight: i === 0 ? 700 : 500, fill: i === 0 ? t.link : t.text });
  });
  c.rect(240, 56, 520, 40, t.surface, { stroke: t.border });
  c.text(264, 82, 'order.dsl ●', { size: 13, weight: 600 });
  c.text(420, 82, 'rules.dsl', { size: 13, fill: t['text-light'] });
  c.rect(240, 96, 520, 520, '#11111b');
  [CODE[0], CODE[1], CODE[2], '  contro: Rules', CODE[3], CODE[4], CODE[5], CODE[6], 'arrow A0.output -> A1.input'].forEach((line, i) => {
    c.text(262, 134 + i * 26, String(i + 1), { size: 13, mono: true, fill: '#6c7086' });
    c.text(300, 134 + i * 26, line, { size: 13, mono: true, fill: '#cdd6f4' });
  });
  c.rect(300, 134 + 3 * 26 - 18, 440, 24, '#f38ba833');
  c.rect(760, 56, W - 760, 560, t.background, { stroke: t.border });
  c.rect(800, 160, 170, 70, t.secondary, { rx: 4, stroke: t.primary });
  c.text(885, 190, 'A0', { size: 14, weight: 700, anchor: 'middle' });
  c.text(885, 212, 'Process order', { size: 13, anchor: 'middle' });
  c.rect(1100, 280, 170, 70, t.secondary, { rx: 4, stroke: t.primary });
  c.text(1185, 310, 'A1', { size: 14, weight: 700, anchor: 'middle' });
  c.text(1185, 332, 'Ship goods', { size: 13, anchor: 'middle' });
  c.line(970, 195, 1030, 195, t.primary, 2);
  c.line(1030, 195, 1030, 315, t.primary, 2);
  c.line(1030, 315, 1100, 315, t.primary, 2);
  c.rect(240, 616, W - 240, 220, t.surface, { stroke: t.border });
  c.text(264, 650, s.problems, { size: 14, weight: 700 });
  c.icon(264, 672, 18, t.error);
  c.text(292, 686, `${s.problemText} · order.dsl:4`, { size: 14 });
  c.rect(0, 836, W, 36, t.primary);
  c.text(16, 859, s.status, { size: 12, fill: '#ffffff' });
  return 872;
};

const SCREENS = {
  landing: { draw: landing, devices: ['desktop', 'tablet', 'mobile'], group: 'site' },
  privacy: { draw: privacy, devices: ['desktop'], group: 'site' },
  thanks: { draw: thanks, devices: ['desktop'], group: 'site' },
  error404: { draw: error404, devices: ['desktop'], group: 'site' },
  welcome: { draw: welcome, devices: ['desktop'], group: 'app' },
  dashboard: { draw: dashboard, devices: ['desktop'], group: 'app' },
  settings: { draw: settings, devices: ['desktop'], group: 'app' },
  editor: { draw: editor, devices: ['desktop'], group: 'app' },
};
const WIDTH = { desktop: 1440, tablet: 768, mobile: 390 };

export const screen = (name, { lang, theme, device, wire, variant }, tokens) => {
  const spec = SCREENS[name];
  const s = STRINGS[lang];
  const c = makeCanvas(WIDTH[device], tokens[theme], wire);
  const themeName = theme === 'light' ? s.themeToDark : s.themeToLight;
  const h = spec.draw(c, s, device, themeName, variant);
  return c.done(h);
};

const sheet = (lang, theme, tokens) => {
  const s = STRINGS[lang];
  const c = makeCanvas(960, tokens[theme], false);
  const t = c.t;
  let y = 48;
  const title = (label) => {
    c.text(40, y, label, { size: 20, weight: 700 });
    y += 28;
  };
  title(s.compButtons);
  let x = 40;
  x += c.button(x, y, s.join, {}) + 12;
  x += c.button(x, y, s.how, { variant: 'secondary' }) + 12;
  x += c.button(x, y, s.cta, { variant: 'primary', h: 32 }) + 12;
  c.gradPanel(x, y - 6, 300, 76);
  c.button(x + 16, y + 2, s.hero, { variant: 'hero', w: 268, h: 60, size: 18 });
  y += 96;
  c.button(40, y, s.disabled, { variant: 'disabled' });
  y += 80;
  title(s.compInputs);
  c.input(40, y + 8, 280, s.name, s.placeholder);
  c.input(340, y + 8, 280, s.email, '', { error: s.error });
  c.rect(660, y + 16, 20, 20, t.surface, { rx: 4, stroke: t.border });
  c.rect(692, y + 16, 20, 20, t.surface, { rx: 10, stroke: t.border });
  c.toggle(730, y + 14, true);
  c.toggle(790, y + 14, false);
  y += 124;
  title(s.compBadges);
  x = 40;
  s.chips.forEach((chip, i) => {
    x += c.chip(x, y, chip, { active: i === 0 }) + 8;
  });
  x += 16;
  x += c.badge(x, y + 4, s.notations[0][1], t.accent) + 8;
  c.badge(x, y + 4, s.notations[3][1], t.warning);
  y += 72;
  title(s.compCards);
  cols(c, 40, y, 880, 3, 16, 3, 110, (cx, cy, w, i) => {
    c.text(cx + 20, cy + 36, s.notations[i][0], { size: 18, weight: 600 });
    c.badge(cx + 20, cy + 50, s.notations[i][1], i < 3 ? t.accent : t.warning);
    c.text(cx + 20, cy + 96, s.notationText, { size: 14, fill: t['text-light'] });
  });
  y += 150;
  title(s.compNav);
  s.nav.forEach((item, i) => c.text(40 + i * 150, y + 12, item, { size: 14, weight: i === 0 ? 700 : 500, fill: i === 0 ? t.link : t['text-light'] }));
  c.rect(40, y + 24, 140, 3, t.primary);
  y += 56;
  c.rect(40, y, 880, 40, t.surface, { stroke: t.border });
  c.text(64, y + 26, 'order.dsl ●', { size: 13, weight: 600 });
  c.text(200, y + 26, 'rules.dsl', { size: 13, fill: t['text-light'] });
  y += 80;
  title(s.compFeedback);
  c.card(40, y, 280, 56, { stroke: t.accent });
  c.text(60, y + 34, `✓ ${s.toast}`, { size: 14, weight: 600 });
  c.card(340, y, 280, 120, { rx: 16 });
  c.text(360, y + 36, s.dialog, { size: 16, weight: 700 });
  c.button(360, y + 64, s.run, { h: 36 });
  c.card(640, y, 280, 56);
  c.text(660, y + 34, s.loading, { size: 14, fill: t['text-light'] });
  y += 150;
  c.text(40, y, s.empty, { size: 14, fill: t.muted });
  return c.done(y + 48);
};

const palette = (tokens, lang) => {
  const s = STRINGS[lang];
  const c = makeCanvas(960, tokens.light, false);
  let y = 40;
  for (const theme of ['light', 'dark']) {
    const t = tokens[theme];
    c.rect(0, y - 24, 960, 340, t.background);
    c.text(
      40,
      y,
      `${lang === 'ru' ? 'Палитра' : 'Palette'}: ${theme === 'light' ? (lang === 'ru' ? 'светлая тема' : 'light theme') : lang === 'ru' ? 'тёмная тема' : 'dark theme'}`,
      { size: 20, weight: 700, fill: t.text },
    );
    Object.entries(t).forEach(([name, hex], i) => {
      const x = 40 + (i % 4) * 224;
      const top = y + 24 + Math.floor(i / 4) * 96;
      c.rect(x, top, 200, 48, hex, { rx: 8, stroke: t.border });
      c.text(x, top + 66, `--color-${name}`, { size: 12, weight: 600, fill: t.text });
      c.text(x, top + 82, hex, { size: 12, fill: t['text-light'] });
    });
    y += 340;
  }
  c.text(40, y, s.wireframe === 'Каркас' ? 'Тема SaaS · золотое сечение 1 : 1,618' : 'SaaS theme · golden ratio 1 : 1.618', {
    size: 14,
    fill: tokens.light.muted,
  });
  return c.done(y + 24);
};

const typography = (tokens, lang) => {
  const s = STRINGS[lang];
  const c = makeCanvas(960, tokens.light, false);
  const rows = [
    ['H1 · Inter Bold 48/56', 48, 700, `${s.h1[0]} ${s.h1[1]}`],
    ['H2 · Inter Bold 32/40', 32, 700, s.notationsTitle],
    ['H3 · Inter SemiBold 20/28', 20, 600, s.how],
    ['Body · Inter Regular 16/24', 16, 400, s.lead.slice(0, 80)],
    ['Small · Inter Regular 14/20', 14, 400, s.steps[1][1]],
  ];
  c.text(40, 48, lang === 'ru' ? 'Типографика' : 'Typography', { size: 20, weight: 700 });
  let y = 96;
  rows.forEach(([label, size, weight, sample]) => {
    c.text(40, y, label, { size: 12, fill: tokens.light.muted });
    c.text(40, y + size + 16, sample, { size, weight });
    y += size + 64;
  });
  c.text(40, y, 'Code · JetBrains Mono 14/20', { size: 12, fill: tokens.light.muted });
  c.text(40, y + 28, 'box A0 "Process order" { input: Order }', { size: 14, mono: true });
  return c.done(y + 64);
};

const REFERENCES = [
  ['Продуктовый сайт', 'сайты продуктовых компаний', 'тёплая сдержанность, крупная типографика'],
  ['Innowise', 'innowise.com', 'деловая подача, блоки услуг'],
  ['Mermaid', 'mermaid.js.org, mermaid.ai', 'код слева, схема справа'],
  ['draw.io / diagrams.net', 'drawio.com, app.diagrams.net', 'крупная кнопка «Start Diagramming»'],
  ['PlantUML', 'plantuml.com', 'редактор прямо на главной'],
  ['Attio', 'attio.com', 'точечная сетка, строка продукта'],
  ['Framer', 'framer.com', 'градиентные панели, карточки'],
  ['Lovable', 'lovable.dev/templates', 'шаблоны SaaS'],
  ['Галереи SaaS', 'onepagelove.com, minimal.gallery, dribbble.com', 'примеры героев и тарифов'],
  ['Статьи о SaaS-сайтах', 'wisepops.com, webflow.com, thatwebflowagency.com', 'структура страниц'],
];
const REFERENCES_EN = [
  'warm restraint, large type',
  'business tone, service blocks',
  'code left, diagram right',
  'big "Start Diagramming" button',
  'editor right on the home page',
  'dot grid, product line',
  'gradient panels, cards',
  'SaaS templates',
  'hero and pricing examples',
  'page structure',
];

const moodboard = (tokens, lang) => {
  const c = makeCanvas(1200, tokens.light, false);
  const t = tokens.light;
  c.text(40, 56, lang === 'ru' ? 'Мудборд DSLKit' : 'DSLKit moodboard', { size: 28, weight: 700 });
  c.card(40, 88, 360, 240, { rx: 16 });
  c.text(64, 150, lang === 'ru' ? 'Минимализм' : 'Minimalism', { size: 32, weight: 700 });
  c.text(64, 190, lang === 'ru' ? 'Воздух, тонкие линии, мало цвета' : 'Air, thin lines, little colour', { size: 16, fill: t['text-light'] });
  c.card(424, 88, 360, 240, { rx: 16 });
  Object.values(t)
    .slice(0, 8)
    .forEach((hex, i) => c.rect(448 + (i % 4) * 80, 112 + Math.floor(i / 4) * 96, 64, 80, hex, { rx: 8, stroke: t.border }));
  c.card(808, 88, 352, 240, { rx: 16 });
  c.text(832, 150, lang === 'ru' ? 'Золотое сечение' : 'Golden ratio', { size: 24, weight: 700 });
  c.rect(832, 176, 118, 120, t.secondary, { rx: 8 });
  c.rect(958, 176, 190, 120, t.primary, { rx: 8 });
  c.text(1053, 242, '1 : 1,618', { size: 18, weight: 600, fill: '#ffffff', anchor: 'middle' });
  c.card(40, 352, 544, 280, { rx: 16 });
  CODE.slice(0, 5).forEach((line, i) => c.text(64, 400 + i * 28, line, { size: 16, mono: true }));
  c.rect(608, 352, 552, 280, t.primary, { rx: 16 });
  c.text(884, 520, 'Aa', { size: 96, weight: 700, fill: '#ffffff', anchor: 'middle' });
  c.text(884, 570, 'Inter · JetBrains Mono', { size: 18, fill: '#ffffff', anchor: 'middle' });
  c.text(40, 688, lang === 'ru' ? 'Образцы и идеи, взятые за основу' : 'References and ideas taken as a basis', { size: 22, weight: 700 });
  REFERENCES.forEach(([name, url, note], i) => {
    const x = 40 + (i % 2) * 580;
    const y = 712 + Math.floor(i / 2) * 92;
    c.card(x, y, 560, 76);
    c.text(x + 20, y + 30, name, { size: 16, weight: 700 });
    c.text(x + 20, y + 50, url, { size: 12, fill: t.link });
    c.text(x + 20, y + 68, lang === 'ru' ? note : REFERENCES_EN[i], { size: 12, fill: t['text-light'] });
  });
  return c.done(712 + 5 * 92 + 24);
};

const deviceFrame = (inner, w, h, kind, theme, tokens) => {
  const t = tokens[theme];
  const body = inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const shell = (x, y, tw, th, extra) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}"><rect width="${tw}" height="${th}" fill="${t.border}"/>${extra}</svg>\n`;
  if (kind === 'desktop') {
    const outer = `<rect x="40" y="40" width="${w + 0}" height="${Math.min(h, 1100) + 48}" rx="14" fill="#111827"/><rect x="40" y="40" width="${w}" height="48" rx="14" fill="#1f2937"/><circle cx="68" cy="64" r="6" fill="#ef4444"/><circle cx="90" cy="64" r="6" fill="#f59e0b"/><circle cx="112" cy="64" r="6" fill="#22c55e"/><rect x="160" y="50" width="420" height="28" rx="14" fill="#374151"/><text x="180" y="69" font-family="${SANS}" font-size="13" fill="#9ca3af">dslkit.io</text><svg x="40" y="88" width="${w}" height="${Math.min(h, 1100)}" viewBox="0 0 ${w} ${Math.min(h, 1100)}" preserveAspectRatio="xMidYMin slice">${body}</svg>`;
    return shell(0, 0, w + 80, Math.min(h, 1100) + 128, outer);
  }
  const outer = `<rect x="40" y="40" width="${w + 28}" height="${Math.min(h, 844) + 28}" rx="48" fill="#111827"/><svg x="54" y="54" width="${w}" height="${Math.min(h, 844)}" viewBox="0 0 ${w} ${Math.min(h, 844)}" preserveAspectRatio="xMidYMin slice">${body}</svg><rect x="${40 + (w + 28) / 2 - 48}" y="62" width="96" height="6" rx="3" fill="#374151"/>`;
  return shell(0, 0, w + 108, Math.min(h, 844) + 108, outer);
};

const heightOf = (svg) => Number(/height="(\d+)"/.exec(svg)[1]);

// Every asset: { group, name, svg }. Groups map to Figma pages.
export const buildAll = (tokens) => {
  const assets = [];
  const push = (group, name, svg) => assets.push({ group, name, svg });
  for (const [name, spec] of Object.entries(SCREENS)) {
    for (const device of spec.devices) {
      for (const lang of ['ru', 'en']) {
        for (const theme of ['light', 'dark']) {
          const label = `${name}-${device}-${lang}-${theme}`;
          const svg = screen(name, { lang, theme, device }, tokens);
          push(`mockups-${spec.group}`, label, svg);
          if (name === 'landing' && theme === 'light' && device !== 'tablet')
            push('device-mockups', `device-${label}`, deviceFrame(svg, WIDTH[device], heightOf(svg), device, theme, tokens));
        }
        push('wireframes', `wire-${name}-${device}-${lang}`, screen(name, { lang, theme: 'light', device, wire: true }, tokens));
      }
    }
  }
  for (const lang of ['ru', 'en'])
    for (const device of ['desktop', 'mobile'])
      for (const variant of ['a', 'b'])
        push('ab-tests', `ab-landing-${device}-${lang}-${variant}`, screen('landing', { lang, theme: 'light', device, variant }, tokens));
  for (const lang of ['ru', 'en']) {
    for (const theme of ['light', 'dark']) push('components', `components-${lang}-${theme}`, sheet(lang, theme, tokens));
    push('foundations', `palette-${lang}`, palette(tokens, lang));
    push('foundations', `typography-${lang}`, typography(tokens, lang));
    push('moodboard', `moodboard-${lang}`, moodboard(tokens, lang));
  }
  return assets;
};
