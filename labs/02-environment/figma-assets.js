import { contrast } from '../../tools/contrast.js';
import { TOKENS } from '../../tools/tokens.js';

const SANS = 'Inter, Arial, sans-serif';
const MONO = "'JetBrains Mono', Consolas, monospace";
export const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export const wrap = (text, max) =>
  text.split(' ').reduce((lines, word) => {
    const last = lines[lines.length - 1];
    if (last === undefined || `${last} ${word}`.length > max) lines.push(word);
    else lines[lines.length - 1] = `${last} ${word}`;
    return lines;
  }, []);

const canvas = (w, t) => {
  const out = [];
  const api = {
    rect: (x, y, ww, hh, fill, o = {}) =>
      out.push(`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="${o.rx ?? 0}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}"` : ''}/>`),
    text: (x, y, s, o) =>
      out.push(
        `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : SANS}" font-size="${o.size}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? t.text}" text-anchor="${o.anchor ?? 'start'}">${esc(s)}</text>`,
      ),
    block: (x, y, s, max, o) => {
      const lines = wrap(s, max);
      lines.forEach((line, i) => api.text(x, y + i * o.lh, line, o));
      return lines.length * o.lh;
    },
    done: (h) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${t.background}"/>${out.join('')}</svg>\n`,
  };
  return api;
};

export const palette = () => {
  const c = canvas(960, TOKENS.light);
  let y = 40;
  for (const [name, t] of Object.entries(TOKENS)) {
    c.rect(0, y - 24, 960, 340, t.background);
    c.text(40, y, `Палитра: ${name === 'light' ? 'светлая тема' : 'тёмная тема'}`, { size: 20, weight: 700, fill: t.text });
    Object.entries(t).forEach(([token, hex], i) => {
      const x = 40 + (i % 4) * 224;
      const top = y + 24 + Math.floor(i / 4) * 96;
      c.rect(x, top, 200, 48, hex, { rx: 8, stroke: t.border });
      c.text(x, top + 66, `--color-${token}`, { size: 12, weight: 600, fill: t.text });
      c.text(x, top + 82, `${hex} · ${contrast(hex, t.background).toFixed(1)}:1`, { size: 12, fill: t['text-light'] });
    });
    y += 340;
  }
  return c.done(y - 20);
};

export const typography = () => {
  const t = TOKENS.light;
  const c = canvas(960, t);
  const rows = [
    ['H1 · Inter Bold 48/56', 48, 700, 'Пишите код — получайте диаграмму'],
    ['H2 · Inter Bold 32/40', 32, 700, 'Шесть нотаций в одном редакторе'],
    ['H3 · Inter SemiBold 20/28', 20, 600, 'Как это работает'],
    ['Body · Inter Regular 16/24', 16, 400, 'Опишите диаграмму текстом, и холст обновится сразу.'],
    ['Small · Inter Regular 14/20', 14, 400, 'Бесплатно в бета-версии, до пяти диаграмм в день.'],
    ['Code · JetBrains Mono 14/20', 14, 400, 'box A0 "Process order" { input: Order }'],
  ];
  c.text(40, 48, 'Типографика', { size: 20, weight: 700 });
  let y = 96;
  for (const [label, size, weight, sample] of rows) {
    c.text(40, y, label, { size: 12, fill: t.muted });
    c.text(40, y + size + 12, sample, { size, weight, mono: label.startsWith('Code') });
    y += size + 64;
  }
  return c.done(y);
};

export const moodboard = () => {
  const t = TOKENS.light;
  const c = canvas(1200, t);
  const tile = (x, y, w, h, fill = t.surface) => c.rect(x, y, w, h, fill, { rx: 16, stroke: t.border });
  c.text(40, 56, 'Мудборд DSLKit', { size: 28, weight: 700 });
  tile(40, 88, 360, 240);
  c.text(64, 150, 'Минимализм', { size: 32, weight: 700 });
  c.text(64, 190, 'Воздух, тонкие линии,', { size: 16, fill: t['text-light'] });
  c.text(64, 214, 'мало цвета в интерфейсе', { size: 16, fill: t['text-light'] });
  tile(424, 88, 360, 240);
  Object.values(TOKENS.light)
    .slice(0, 8)
    .forEach((hex, i) => c.rect(448 + (i % 4) * 80, 112 + Math.floor(i / 4) * 96, 64, 80, hex, { rx: 8, stroke: t.border }));
  tile(808, 88, 352, 240);
  c.text(832, 150, 'Золотое сечение', { size: 24, weight: 700 });
  c.rect(832, 176, 118, 120, t.secondary, { rx: 8 });
  c.rect(958, 176, 190, 120, t.primary, { rx: 8 });
  c.text(1053, 242, '1 : 1,618', { size: 18, weight: 600, fill: '#ffffff', anchor: 'middle' });
  tile(40, 352, 544, 280);
  ['diagram idef0 "Order"', 'box A0 "Process order" {', '  input: Order', '  control: Rules', '}'].forEach((line, i) =>
    c.text(64, 400 + i * 28, line, { mono: true, size: 16 }),
  );
  tile(608, 352, 552, 280, t.primary);
  c.text(884, 520, 'Aa', { size: 96, weight: 700, fill: '#ffffff', anchor: 'middle' });
  c.text(884, 570, 'Inter · JetBrains Mono', { size: 18, fill: '#ffffff', anchor: 'middle' });
  return c.done(672);
};

const COPY = {
  nav: ['Возможности', 'Нотации', 'Как это работает', 'Тарифы', 'FAQ'],
  notations: ['IDEF0', 'DFD', 'ERD', 'BPMN', 'UML', 'Сети Петри'],
  steps: [
    ['1', 'Пишете код', 'Описываете диаграмму на DSL'],
    ['2', 'Видите схему', 'Холст обновляется сразу'],
    ['3', 'Экспортируете', 'SVG, PNG, PlantUML, Mermaid'],
  ],
  audience: [
    ['Студентам', 'Лабораторные и дипломы'],
    ['Разработчикам', 'Схемы рядом с кодом'],
    ['Аналитикам', 'Процессы без рисования'],
  ],
  faq: ['Что такое DSLKit?', 'Нужно ли уметь программировать?', 'Какие нотации поддерживаются?', 'Сколько это стоит?'],
};

export const home = (width, theme = 'light') => {
  const t = TOKENS[theme];
  const c = canvas(width, t);
  const wide = width >= 1024;
  const pad = width >= 576 ? 48 : 16;
  const inner = width - pad * 2;
  const chars = (size, w) => Math.floor(w / (size * 0.56));
  const columns = (n) => (width >= 576 ? n : 1);
  c.rect(0, 0, width, 64, t.surface, { stroke: t.border });
  c.text(pad, 40, 'DSLKit', { size: 20, weight: 700 });
  if (width >= 768) {
    const size = wide ? 14 : 12;
    COPY.nav.reduce((x, label) => {
      c.text(x, 38, label, { size, fill: t['text-light'] });
      return x + label.length * size * 0.56 + 28;
    }, pad + 140);
    c.rect(width - pad - 120, 16, 120, 32, t.primary, { rx: 8 });
    c.text(width - pad - 60, 37, 'Попробовать', { size: 14, weight: 600, fill: '#ffffff', anchor: 'middle' });
  } else {
    [0, 6, 12].forEach((dy) => c.rect(width - pad - 24, 24 + dy, 24, 2, t.text));
  }
  let y = 112;
  const heroW = wide ? inner * 0.5 : inner;
  y += c.block(pad, y + 32, 'Пишите код — получайте диаграмму', chars(wide ? 48 : 32, heroW), { size: wide ? 48 : 32, weight: 700, lh: wide ? 56 : 40 });
  y += c.block(pad, y + 48, 'Веб-редактор диаграмм как кода: IDEF0, DFD, ERD, BPMN, UML и сети Петри.', chars(18, heroW), {
    size: 18,
    fill: t['text-light'],
    lh: 28,
  });
  c.rect(pad, y + 72, 200, 48, t.primary, { rx: 8 });
  c.text(pad + 100, y + 102, 'Попробовать бесплатно', { size: 14, weight: 600, fill: '#ffffff', anchor: 'middle' });
  if (width >= 576) c.rect(pad + 216, y + 72, 140, 48, t.surface, { rx: 8, stroke: t.border });
  if (width >= 576) c.text(pad + 286, y + 102, 'Демо', { size: 14, weight: 600, anchor: 'middle' });
  const previewX = wide ? pad + inner * 0.55 : pad;
  const previewY = wide ? 112 : y + 152;
  const previewW = wide ? inner * 0.45 : inner;
  c.rect(previewX, previewY, previewW, 280, t.surface, { rx: 16, stroke: t.border });
  ['diagram idef0 "Order"', 'box A0 "Process" {', '  input: Order', '}'].forEach((line, i) =>
    c.text(previewX + 24, previewY + 48 + i * 28, line, { mono: true, size: 14 }),
  );
  c.rect(previewX + 24, previewY + 180, 96, 48, t.secondary, { rx: 6, stroke: t.primary });
  c.text(previewX + 72, previewY + 210, 'A0', { size: 14, weight: 600, anchor: 'middle' });
  c.rect(previewX + previewW - 120, previewY + 180, 96, 48, t.secondary, { rx: 6, stroke: t.primary });
  c.text(previewX + previewW - 72, previewY + 210, 'A1', { size: 14, weight: 600, anchor: 'middle' });
  c.rect(previewX + 120, previewY + 203, previewW - 240, 2, t.primary);
  y = Math.max(y + 152, wide ? 112 + 320 : previewY + 320);
  const section = (title) => {
    y += 64;
    c.text(pad, y, title, { size: wide ? 32 : 24, weight: 700 });
    y += 32;
  };
  const cards = (items, cols) => {
    const cardW = (inner - (cols - 1) * 16) / cols;
    const laid = items.map((item) => {
      const [head, sub] = [].concat(item);
      const headLines = wrap(head, chars(18, cardW - 40));
      const subLines = sub ? wrap(sub, chars(14, cardW - 40)) : [];
      return { headLines, subLines, h: 28 + headLines.length * 24 + (subLines.length ? 8 + subLines.length * 20 : 0) + 16 };
    });
    const h = Math.max(...laid.map((l) => l.h));
    laid.forEach(({ headLines, subLines }, i) => {
      const x = pad + (i % cols) * (cardW + 16);
      const top = y + Math.floor(i / cols) * (h + 16);
      c.rect(x, top, cardW, h, t.surface, { rx: 12, stroke: t.border });
      headLines.forEach((line, j) => c.text(x + 20, top + 36 + j * 24, line, { size: 18, weight: 600 }));
      subLines.forEach((line, j) => c.text(x + 20, top + 36 + (headLines.length - 1) * 24 + 28 + j * 20, line, { size: 14, fill: t['text-light'] }));
    });
    y += Math.ceil(items.length / cols) * (h + 16);
  };
  section('Нотации');
  cards(
    COPY.notations.map((n) => [n, 'Шаблон с примером']),
    wide ? 3 : columns(2),
  );
  section('Как это работает');
  cards(
    COPY.steps.map(([n, a, b]) => [`${n}. ${a}`, b]),
    columns(3),
  );
  section('Для кого');
  cards(COPY.audience, columns(3));
  section('Тарифы');
  cards(
    [
      ['Free', 'До 5 диаграмм в день в бета-версии'],
      ['Pro', 'Без лимитов, история версий, совместная работа'],
    ],
    columns(2),
  );
  section('FAQ');
  cards(
    COPY.faq.map((q) => [q]),
    columns(2),
  );
  section('Записаться в бету');
  ['Имя', 'Эл. почта'].forEach((label, i) => {
    c.text(pad, y + i * 72, label, { size: 14, weight: 600 });
    c.rect(pad, y + 8 + i * 72, Math.min(inner, 480), 40, t.surface, { rx: 8, stroke: t.border });
  });
  y += 160;
  c.rect(pad, y - 16, 160, 44, t.primary, { rx: 8 });
  c.text(pad + 80, y + 12, 'Отправить', { size: 14, weight: 600, fill: '#ffffff', anchor: 'middle' });
  y += 72;
  c.rect(0, y, width, 96, t.surface, { stroke: t.border });
  c.text(pad, y + 52, '© 2026 DSLKit', { size: 14, fill: t['text-light'] });
  return c.done(y + 96);
};

export const assets = () => ({
  'palette.svg': palette(),
  'typography.svg': typography(),
  'moodboard.svg': moodboard(),
  'home-desktop.svg': home(1440),
  'home-tablet.svg': home(768),
  'home-mobile.svg': home(390),
  'home-desktop-dark.svg': home(1440, 'dark'),
  'home-tablet-dark.svg': home(768, 'dark'),
  'home-mobile-dark.svg': home(390, 'dark'),
});
