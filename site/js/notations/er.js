import { ID, STR, escapeXml, parseAttrs, problem, quoteDot, unquote } from './common.js';
import { INK, MUTED, renderLayout, text } from './svg.js';

const ENTITY = new RegExp(`^entity\\s+(${ID})(?:\\s+${STR})?((?:\\s+[\\w-]+)*?)\\s*(\\{)?\\s*$`);
const ATTRIBUTE = new RegExp(`^(${ID})\\s*:?\\s*([\\w()\\[\\],.]+)((?:\\s+(?:pk|fk|ak\\d*|unique|notnull))*)(?:\\s*->\\s*(${ID}))?\\s*$`, 'i');

// Relationship ends: SVG marker, Mermaid/PlantUML tokens for the left and right side of `--`.
export const ENDS = {
  one: { marker: 'one', left: '||', right: '||' },
  many: { marker: 'many', left: '}o', right: 'o{' },
  'zero-one': { marker: 'zero-one', left: 'o|', right: '|o' },
  'one-many': { marker: 'one-many', left: '}|', right: '|{' },
};

export const keysOf = (entity) => entity.attrs.filter((attr) => attr.pk);
const mark = (attr) => `${attr.pk ? 'PK ' : ''}${attr.fk ? 'FK ' : ''}${attr.ak.map((name) => `(${name.toUpperCase()}) `).join('')}`;
const rowText = (attr) => `${mark(attr)}${attr.name} : ${attr.type}`;
const word = (value) => String(value).replace(/\W+/g, '_');

// Reads `entity` blocks and hands every other statement to cfg.statement. Shared by ERD, IDEF1 and IDEF1X.
export const parseEr = (lines, header, cfg) => {
  const model = { notation: cfg.notation, kind: '', title: header.title, entities: [], relations: [], categories: [], problems: [] };
  let open = null;
  lines.forEach(({ n, text: line }) => {
    let match;
    if (open && line === '}') {
      open = null;
    } else if (open) {
      if ((match = ATTRIBUTE.exec(line))) {
        const flags = match[3].toLowerCase().split(/\s+/).filter(Boolean);
        open.attrs.push({
          name: match[1],
          type: match[2],
          pk: flags.includes('pk'),
          fk: flags.includes('fk') || Boolean(match[4]),
          ak: flags.filter((flag) => flag.startsWith('ak')),
          unique: flags.includes('unique'),
          notnull: flags.includes('notnull'),
          ref: match[4] ?? '',
          line: n,
        });
      } else model.problems.push(problem(n, 'error', 'syntax', { text: line }));
    } else if ((match = ENTITY.exec(line))) {
      const flags = match[3].split(/\s+/).filter(Boolean);
      const known = model.entities.find((entity) => entity.id === match[1]);
      const entity = { id: match[1], label: unquote(match[2] ?? match[1]), attrs: [], dependent: flags.includes('dependent'), line: n };
      if (flags.some((flag) => !cfg.flags.includes(flag))) model.problems.push(problem(n, 'error', 'syntax', { text: line }));
      else if (known) model.problems.push(problem(n, 'error', 'duplicate', { id: match[1], first: known.line }));
      else {
        model.entities.push(entity);
        if (match[4]) open = entity;
      }
      if (match[4] && open !== entity) open = { attrs: [], line: n, id: match[1] };
    } else if (!cfg.statement(line, n, model)) model.problems.push(problem(n, 'error', 'syntax', { text: line }));
  });
  if (open) model.problems.push(problem(open.line, 'error', 'unclosed', { id: open.id }));
  model.entities.forEach((entity) => {
    const names = new Set();
    entity.attrs.forEach((attr) => {
      if (names.has(attr.name)) model.problems.push(problem(attr.line, 'error', 'erd-dup-attr', { id: entity.id, name: attr.name }));
      names.add(attr.name);
      if (attr.ref && !model.entities.some((other) => other.id === attr.ref))
        model.problems.push(problem(attr.line, 'error', 'erd-fk-unknown', { id: entity.id, name: attr.name, ref: attr.ref }));
    });
  });
  model.relations.forEach((relation) => {
    [relation.from, relation.to]
      .filter((id) => !model.entities.some((entity) => entity.id === id))
      .forEach((id) => model.problems.push(problem(relation.line, 'error', 'unknown-ref', { id })));
  });
  model.relations = model.relations.filter((relation) => [relation.from, relation.to].every((id) => model.entities.some((entity) => entity.id === id)));
  model.categories.forEach((category) => {
    category.links = category.links.filter((link) =>
      [link.from, link.to].every((id) => id === category.id || model.entities.some((entity) => entity.id === id)),
    );
  });
  model.problems.push(...cfg.validate(model));
  model.empty = model.entities.length === 0;
  return model;
};

export const noKey = (model, severity) =>
  model.entities.filter((entity) => keysOf(entity).length === 0).map((entity) => problem(entity.line, severity, 'erd-no-pk', { id: entity.id }));

export const idle = (model) => {
  const used = new Set([...model.relations, ...model.categories.flatMap((c) => c.links)].flatMap((relation) => [relation.from, relation.to]));
  return model.entities.length > 1
    ? model.entities.filter((entity) => !used.has(entity.id)).map((entity) => problem(entity.line, 'warning', 'isolated', { id: entity.id }))
    : [];
};

const names = (model) => new Map([...model.entities, ...model.categories].map((node, index) => [node.id, `e${index}`]));

// ---------- generators ----------
const toDot = (model) => {
  const alias = names(model);
  const lines = ['digraph diagram {', '  rankdir=LR;', '  node [shape=none, fontname="Helvetica"];', '  edge [fontname="Helvetica", fontsize=10];'];
  if (model.title) lines.push(`  label=${quoteDot(model.title)};`, '  labelloc=t;');
  model.entities.forEach((entity) => {
    const rows = entity.attrs.map((attr) => `<TR><TD ALIGN="LEFT">${escapeXml(rowText(attr))}</TD></TR>`).join('');
    const style = entity.dependent ? ' STYLE="ROUNDED"' : '';
    lines.push(
      `  ${alias.get(entity.id)} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0"${style}><TR><TD BGCOLOR="#e2e8f0"><B>${escapeXml(entity.label)}</B></TD></TR>${rows}</TABLE>>];`,
    );
  });
  model.categories.forEach((category) => lines.push(`  ${alias.get(category.id)} [label=${quoteDot(category.label)}, shape=circle, width=0.3];`));
  const arrow = (end) => ({ one: 'teetee', many: 'crow', 'zero-one': 'teeodot', 'one-many': 'crowtee' })[end];
  model.relations.forEach((relation) => {
    const label = relation.label ? `, label=${quoteDot(relation.label)}` : '';
    lines.push(
      `  ${alias.get(relation.from)} -> ${alias.get(relation.to)} [dir=both, arrowtail=${arrow(relation.fromEnd)}, arrowhead=${arrow(relation.toEnd)}${relation.dashed ? ', style=dashed' : ''}${label}];`,
    );
  });
  model.categories.forEach((category) => category.links.forEach((link) => lines.push(`  ${alias.get(link.from)} -> ${alias.get(link.to)} [arrowhead=none];`)));
  return [...lines, '}'].join('\n');
};

const toMermaid = (model) => {
  const lines = ['erDiagram'];
  model.entities.forEach((entity) => {
    lines.push(`  ${word(entity.id)} {`);
    entity.attrs.forEach((attr) => {
      const keys = [attr.pk && 'PK', attr.fk && 'FK', (attr.unique || attr.ak.length > 0) && 'UK'].filter(Boolean).join(', ');
      lines.push(`    ${word(attr.type)} ${word(attr.name)}${keys ? ` ${keys}` : ''}`);
    });
    lines.push('  }');
  });
  model.relations.forEach((relation) => {
    const link = relation.dashed ? '..' : '--';
    lines.push(
      `  ${word(relation.from)} ${ENDS[relation.fromEnd].left}${link}${ENDS[relation.toEnd].right} ${word(relation.to)} : "${(relation.label || 'has').replace(/"/g, "'")}"`,
    );
  });
  return lines.join('\n');
};

const toPlantUml = (model) => {
  const alias = names(model);
  const lines = ['@startuml', 'hide circle', 'left to right direction'];
  if (model.title) lines.push(`title ${model.title.replace(/\r?\n/g, ' ')}`);
  model.entities.forEach((entity) => {
    lines.push(`entity "${entity.label.replace(/"/g, "'")}" as ${alias.get(entity.id)} {`);
    keysOf(entity).forEach((attr) => lines.push(`  * ${attr.name} : ${attr.type}${attr.fk ? ' <<FK>>' : ''}`));
    lines.push('  --');
    entity.attrs
      .filter((attr) => !attr.pk)
      .forEach((attr) => lines.push(`  ${attr.notnull ? '* ' : ''}${attr.name} : ${attr.type}${attr.fk ? ' <<FK>>' : ''}`));
    lines.push('}');
  });
  model.categories.forEach((category) => lines.push(`circle "${category.label.replace(/"/g, "'")}" as ${alias.get(category.id)}`));
  model.relations.forEach((relation) => {
    const link = relation.dashed ? '..' : '--';
    lines.push(
      `${alias.get(relation.from)} ${ENDS[relation.fromEnd].left}${link}${ENDS[relation.toEnd].right} ${alias.get(relation.to)}${relation.label ? ` : ${relation.label.replace(/\r?\n/g, ' ')}` : ''}`,
    );
  });
  model.categories.forEach((category) => category.links.forEach((link) => lines.push(`${alias.get(link.from)} -- ${alias.get(link.to)}`)));
  return [...lines, '@enduml'].join('\n');
};

// ---------- SVG ----------
const ROW = 18;
const HEAD = 30;
const sizeOf = (node) => {
  if (node.links) return { lines: [node.label], outline: 'ellipse', w: 34, h: 34 };
  const rows = node.attrs.map(rowText);
  return {
    lines: rows,
    outline: 'box',
    w: Math.max(node.label.length, ...rows.map((row) => row.length)) * 7 + 28,
    h: HEAD + Math.max(rows.length, 1) * ROW + 10,
  };
};

const left = (x, y, value, weight) => `<text x="${x}" y="${y}" dy="0.35em" font-size="12" font-weight="${weight}" fill="${INK}">${escapeXml(value)}</text>`;

// A category circle: two letters inside, a second line under it when the category is complete.
const drawCategory = (item) => {
  const { node, x, y, w, h } = item;
  const double = node.complete ? `<path d="M${x + 2} ${y + h + 4}H${x + w - 2}M${x + 2} ${y + h + 7}H${x + w - 2}" stroke="${INK}" stroke-width="1.2"/>` : '';
  return `<circle cx="${item.cx}" cy="${item.cy}" r="${w / 2}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>${text(item.cx, item.cy, [node.label.slice(0, 2)], 11, 700, INK)}${double}`;
};

// An entity: the key attributes first (bold), a divider, then the rest.
const drawEntity = (item) => {
  const { node, x, y, w, h } = item;
  const keys = keysOf(node);
  const rest = node.attrs.filter((attr) => !attr.pk);
  const rows = [...keys, ...rest].map((attr, index) => left(x + 10, y + HEAD + 6 + index * ROW + ROW / 2, rowText(attr), attr.pk ? 700 : 400)).join('');
  const divider = keys.length > 0 && rest.length > 0 ? `<path d="M${x} ${y + HEAD + 6 + keys.length * ROW}H${x + w}" stroke="${INK}" stroke-width="1.2"/>` : '';
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${node.dependent ? 14 : 0}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>` +
    `<path d="M${x} ${y + HEAD}H${x + w}" stroke="${MUTED}" stroke-width="1"/>${text(item.cx, y + HEAD / 2, [node.label], 13, 700, '#0f172a')}${rows}${divider}`
  );
};

const draw = (item) => (item.node.links ? drawCategory(item) : drawEntity(item));

const lookOf = (edge) => (edge.fromEnd ? { start: ENDS[edge.fromEnd].marker, end: ENDS[edge.toEnd].marker, dash: edge.dashed } : {});

export const renderEr = (model) =>
  renderLayout({
    title: model.title,
    nodes: [...model.entities, ...model.categories],
    edges: [...model.relations, ...model.categories.flatMap((category) => category.links)],
    size: sizeOf,
    draw,
    style: lookOf,
    labelOf: (edge) => edge.label,
  });

export const erGenerators = { graphviz: toDot, mermaid: toMermaid, plantuml: toPlantUml };

// ---------- the three notations ----------
const CARD = /^(1:1|1:N|N:1|N:M|M:N)$/i;
const CARD_ENDS = { 1: 'one', N: 'many', M: 'many' };
const relationRe = new RegExp(`^relationship\\s+(${ID})\\s+(\\S+)\\s+(${ID})(?:\\s+${STR})?\\s*$`, 'i');

const erStatement = (line, n, model) => {
  const match = relationRe.exec(line);
  if (!match) return false;
  if (!CARD.test(match[2])) {
    model.problems.push(problem(n, 'error', 'erd-cardinality', { value: match[2] }));
    return true;
  }
  const [a, b] = match[2].toUpperCase().split(':');
  model.relations.push({
    from: match[1],
    to: match[3],
    label: unquote(match[4] ?? ''),
    card: ['N:M', 'M:N'].includes(`${a}:${b}`) ? 'N:M' : `${a}:${b}`,
    fromEnd: CARD_ENDS[a],
    toEnd: CARD_ENDS[b],
    dashed: false,
    line: n,
  });
  return true;
};

export const erd = (lines, header) =>
  parseEr(lines, header, {
    notation: 'erd',
    flags: [],
    statement: erStatement,
    validate: (model) => [...noKey(model, 'error'), ...idle(model)],
  });

// IDEF1 keeps the information model light: keys are advised, not required.
export const idef1 = (lines, header) =>
  parseEr(lines, header, {
    notation: 'idef1',
    flags: [],
    statement: erStatement,
    validate: (model) => [
      ...noKey(model, 'warning'),
      ...model.entities.filter((entity) => entity.attrs.length === 0).map((entity) => problem(entity.line, 'warning', 'idef1-no-attrs', { id: entity.id })),
      ...idle(model),
    ],
  });

// ---------- IDEF1X ----------
const LINK = new RegExp(`^(identifying|nonidentifying)\\s+(${ID})\\s*->\\s*(${ID})(?:\\s+${STR})?((?:\\s+[\\w.-]+(?:=[\\w.-]+)?)*)\\s*$`);
const SPECIFIC = new RegExp(`^nonspecific\\s+(${ID})\\s*--\\s*(${ID})(?:\\s+${STR})?\\s*$`);
const CATEGORY = new RegExp(`^category\\s+(${ID})\\s+(complete|incomplete)\\s+(${ID})\\s*:\\s*(${ID}(?:\\s*,\\s*${ID})*)\\s*$`);
const CHILD_END = { P: 'one-many', Z: 'zero-one' };

const idef1xStatement = (line, n, model) => {
  let match;
  if ((match = LINK.exec(line))) {
    const attrs = parseAttrs(match[5]);
    const identifying = match[1] === 'identifying';
    const card = ['P', 'Z'].find((flag) => flag in attrs) ?? 'N';
    model.relations.push({
      from: match[2],
      to: match[3],
      label: unquote(match[4] ?? ''),
      identifying,
      optional: 'optional' in attrs,
      card,
      fromEnd: 'one',
      toEnd: CHILD_END[card] ?? 'many',
      dashed: !identifying,
      line: n,
    });
  } else if ((match = SPECIFIC.exec(line))) {
    model.relations.push({
      from: match[1],
      to: match[2],
      label: unquote(match[3] ?? ''),
      nonspecific: true,
      fromEnd: 'many',
      toEnd: 'many',
      dashed: true,
      line: n,
    });
  } else if ((match = CATEGORY.exec(line))) {
    const subtypes = match[4].split(/\s*,\s*/);
    const id = `category:${match[1]}:${n}`;
    model.categories.push({
      id,
      label: match[3],
      parent: match[1],
      subtypes,
      complete: match[2] === 'complete',
      links: [match[1], ...subtypes].map((entity, index) => ({ from: index === 0 ? entity : id, to: index === 0 ? id : entity, label: '', line: n })),
      line: n,
    });
  } else return false;
  return true;
};

const idef1xValidate = (model) => {
  const out = [...noKey(model, 'error'), ...idle(model)];
  const find = (id) => model.entities.find((entity) => entity.id === id);
  model.relations
    .filter((relation) => !relation.nonspecific)
    .forEach((relation) => {
      const parent = find(relation.from);
      const child = find(relation.to);
      if (relation.identifying && !child.dependent) out.push(problem(relation.line, 'error', 'idef1x-child-independent', { id: child.id }));
      keysOf(parent).forEach((key) => {
        const migrated = child.attrs.find((attr) => attr.fk && (attr.ref === parent.id || attr.name === key.name));
        if (!migrated) out.push(problem(relation.line, 'error', 'idef1x-fk-missing', { id: child.id, parent: parent.id, name: key.name }));
        else if (relation.identifying && !migrated.pk)
          out.push(problem(migrated.line, 'error', 'idef1x-fk-identifying', { id: child.id, name: migrated.name }));
        else if (!relation.identifying && migrated.pk)
          out.push(problem(migrated.line, 'error', 'idef1x-fk-nonidentifying', { id: child.id, name: migrated.name }));
      });
    });
  model.relations
    .filter((relation) => relation.nonspecific)
    .forEach((relation) => out.push(problem(relation.line, 'warning', 'idef1x-nonspecific', { from: relation.from, to: relation.to })));
  model.entities
    .filter((entity) => entity.dependent && !model.relations.some((relation) => relation.identifying && relation.to === entity.id))
    .forEach((entity) => out.push(problem(entity.line, 'error', 'idef1x-dependent-orphan', { id: entity.id })));
  model.categories.forEach((category) => {
    [category.parent, ...category.subtypes].filter((id) => !find(id)).forEach((id) => out.push(problem(category.line, 'error', 'unknown-ref', { id })));
    if (category.subtypes.includes(category.parent)) out.push(problem(category.line, 'error', 'idef1x-category-self', { id: category.parent }));
  });
  return out;
};

export const idef1x = (lines, header) =>
  parseEr(lines, header, { notation: 'idef1x', flags: ['dependent', 'independent'], statement: idef1xStatement, validate: idef1xValidate });
