import { ID, STR, escapeXml, findCycle, problem, quoteDot, unquote } from './common.js';
import { INK, MUTED, renderLayout, text } from './svg.js';

const CLASS = new RegExp(`^(class|abstract class|interface)\\s+(${ID})(?:\\s+${STR})?\\s*(\\{)?\\s*$`);
const MEMBER = /^([+\-#~])?\s*([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s*(?::\s*(.+?))?\s*$/;
const REL = new RegExp(
  `^(${ID})(?:\\s+"([^"]*)")?\\s+(--\\|>|\\.\\.\\|>|<\\|--|<\\|\\.\\.|-->|--|o--|\\*--|\\.\\.>)\\s+(?:"([^"]*)"\\s+)?(${ID})(?:\\s*:\\s*(.+?))?\\s*$`,
);
const MULTIPLICITY = /^(\d+|\*|\d+\.\.(\d+|\*))$/;

// Arrow token -> relationship kind. `swap` marks the two forms that are written parent-first.
const TOKENS = {
  '--|>': { kind: 'inheritance', swap: false },
  '<|--': { kind: 'inheritance', swap: true },
  '..|>': { kind: 'realization', swap: false },
  '<|..': { kind: 'realization', swap: true },
  '-->': { kind: 'association', swap: false, directed: true },
  '--': { kind: 'association', swap: false, directed: false },
  'o--': { kind: 'aggregation', swap: false },
  '*--': { kind: 'composition', swap: false },
  '..>': { kind: 'dependency', swap: false },
};

const LOOK = {
  inheritance: { end: 'triangle' },
  realization: { end: 'triangle', dash: true },
  association: { end: 'open' },
  aggregation: { start: 'diamond' },
  composition: { start: 'diamond-filled' },
  dependency: { end: 'open', dash: true },
};
const DOT_EDGE = {
  inheritance: 'arrowhead=empty',
  realization: 'style=dashed, arrowhead=empty',
  association: 'arrowhead=vee',
  aggregation: 'dir=both, arrowtail=odiamond, arrowhead=none',
  composition: 'dir=both, arrowtail=diamond, arrowhead=none',
  dependency: 'style=dashed, arrowhead=vee',
};
const PLANT = { inheritance: '--|>', realization: '..|>', association: '-->', aggregation: 'o--', composition: '*--', dependency: '..>' };
const MERMAID = { inheritance: '--|>', realization: '..|>', association: '-->', aggregation: 'o--', composition: '*--', dependency: '..>' };

const signature = (member) => `${member.vis}${member.name}${member.method ? `(${member.params})` : ''}${member.type ? `: ${member.type}` : ''}`;
const stereotype = (cls) => ({ interface: '«interface»', 'abstract class': '«abstract»', class: '' })[cls.stereotype];
const word = (value) => String(value).replace(/\W+/g, '_');

export const parseClassModel = (lines, header, notation) => {
  const model = { notation, kind: 'class', title: header.title, classes: [], relations: [], problems: [] };
  let open = null;
  lines.forEach(({ n, text: line }) => {
    let match;
    if (open && line === '}') {
      open = null;
    } else if (open) {
      if ((match = MEMBER.exec(line))) {
        const member = { vis: match[1] ?? '+', name: match[2], method: match[3] !== undefined, params: (match[3] ?? '').trim(), type: match[4] ?? '', line: n };
        open.members.push(member);
      } else model.problems.push(problem(n, 'error', 'syntax', { text: line }));
    } else if ((match = CLASS.exec(line))) {
      const known = model.classes.find((cls) => cls.id === match[2]);
      const cls = { id: match[2], label: unquote(match[3] ?? match[2]), stereotype: match[1], members: [], line: n };
      if (known) model.problems.push(problem(n, 'error', 'duplicate', { id: match[2], first: known.line }));
      else model.classes.push(cls);
      if (match[4]) open = known ? { members: [], id: match[2], line: n } : cls;
    } else if ((match = REL.exec(line))) {
      const token = TOKENS[match[3]];
      const [from, to, fromMult, toMult] = token.swap
        ? [match[5], match[1], match[4] ?? '', match[2] ?? '']
        : [match[1], match[5], match[2] ?? '', match[4] ?? ''];
      model.relations.push({ from, to, kind: token.kind, directed: token.directed ?? true, fromMult, toMult, label: match[6] ?? '', line: n });
    } else model.problems.push(problem(n, 'error', 'syntax', { text: line }));
  });
  if (open) model.problems.push(problem(open.line, 'error', 'unclosed', { id: open.id }));

  model.relations.forEach((relation) => {
    [relation.from, relation.to]
      .filter((id) => !model.classes.some((cls) => cls.id === id))
      .forEach((id) => model.problems.push(problem(relation.line, 'error', 'unknown-ref', { id })));
    [relation.fromMult, relation.toMult]
      .filter((value) => value !== '' && !MULTIPLICITY.test(value))
      .forEach((value) => model.problems.push(problem(relation.line, 'error', 'class-mult', { value })));
  });
  model.relations = model.relations.filter((relation) => [relation.from, relation.to].every((id) => model.classes.some((cls) => cls.id === id)));

  const kindOf = (id) => model.classes.find((cls) => cls.id === id).stereotype;
  model.relations
    .filter((relation) => relation.kind === 'realization' && kindOf(relation.to) !== 'interface')
    .forEach((relation) => model.problems.push(problem(relation.line, 'warning', 'class-realization', { id: relation.to })));
  const cycle = findCycle(model.relations.filter((relation) => relation.kind === 'inheritance'));
  if (cycle.length > 0)
    model.problems.push(
      problem(cycle[0].line, 'error', 'class-cycle', {
        path: cycle
          .map((edge) => edge.from)
          .concat(cycle[0].from)
          .join(' -> '),
      }),
    );
  model.classes.forEach((cls) => {
    const seen = new Set();
    cls.members.forEach((member) => {
      const key = `${member.method}${member.name}`;
      if (seen.has(key)) model.problems.push(problem(member.line, 'warning', 'class-dup-member', { id: cls.id, name: member.name }));
      seen.add(key);
    });
    cls.members
      .filter((member) => cls.stereotype === 'interface' && !member.method)
      .forEach((member) => model.problems.push(problem(member.line, 'warning', 'class-iface-attr', { id: cls.id, name: member.name })));
  });
  model.empty = model.classes.length === 0;
  return model;
};

const attrsOf = (cls) => cls.members.filter((member) => !member.method);
const methodsOf = (cls) => cls.members.filter((member) => member.method);
const mults = (relation) => `${relation.fromMult ? `${relation.fromMult} ` : ''}${relation.label}${relation.toMult ? ` ${relation.toMult}` : ''}`.trim();

const toDot = (model) => {
  const alias = new Map(model.classes.map((cls, index) => [cls.id, `c${index}`]));
  const lines = ['digraph diagram {', '  rankdir=BT;', '  node [shape=none, fontname="Helvetica"];', '  edge [fontname="Helvetica", fontsize=10];'];
  if (model.title) lines.push(`  label=${quoteDot(model.title)};`, '  labelloc=t;');
  const rows = (members) => members.map((member) => `${escapeXml(signature(member))}<BR ALIGN="LEFT"/>`).join('') || ' ';
  model.classes.forEach((cls) => {
    const head = `${stereotype(cls) ? `${escapeXml(stereotype(cls))}<BR/>` : ''}<B>${escapeXml(cls.label)}</B>`;
    lines.push(
      `  ${alias.get(cls.id)} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0"><TR><TD>${head}</TD></TR><HR/><TR><TD ALIGN="LEFT">${rows(attrsOf(cls))}</TD></TR><HR/><TR><TD ALIGN="LEFT">${rows(methodsOf(cls))}</TD></TR></TABLE>>];`,
    );
  });
  model.relations.forEach((relation) => {
    const extra = [
      relation.label && `label=${quoteDot(relation.label)}`,
      relation.fromMult && `taillabel=${quoteDot(relation.fromMult)}`,
      relation.toMult && `headlabel=${quoteDot(relation.toMult)}`,
    ].filter(Boolean);
    const arrow = relation.kind === 'association' && !relation.directed ? 'arrowhead=none' : DOT_EDGE[relation.kind];
    lines.push(`  ${alias.get(relation.from)} -> ${alias.get(relation.to)} [${[arrow, ...extra].join(', ')}];`);
  });
  return [...lines, '}'].join('\n');
};

const toMermaid = (model) => {
  const lines = ['classDiagram'];
  model.classes.forEach((cls) => {
    lines.push(`  class ${word(cls.id)}["${cls.label.replace(/"/g, "'")}"] {`);
    if (stereotype(cls)) lines.push(`    <<${cls.stereotype === 'interface' ? 'interface' : 'abstract'}>>`);
    cls.members.forEach((member) =>
      lines.push(
        `    ${member.vis}${member.method ? `${member.name}(${member.params})${member.type ? ` ${member.type}` : ''}` : `${member.type ? `${word(member.type)} ` : ''}${member.name}`}`,
      ),
    );
    lines.push('  }');
  });
  model.relations.forEach((relation) => {
    const quoted = (value) => (value ? `"${value}" ` : '');
    const arrow = relation.kind === 'association' && !relation.directed ? '--' : MERMAID[relation.kind];
    const head = ['inheritance', 'realization'].includes(relation.kind)
      ? `${word(relation.to)} ${quoted(relation.toMult)}${relation.kind === 'inheritance' ? '<|--' : '<|..'} ${quoted(relation.fromMult)}${word(relation.from)}`
      : `${word(relation.from)} ${quoted(relation.fromMult)}${arrow} ${quoted(relation.toMult)}${word(relation.to)}`;
    lines.push(`  ${head}${relation.label ? ` : ${relation.label.replace(/[:\n]/g, ' ')}` : ''}`);
  });
  return lines.join('\n');
};

const toPlantUml = (model) => {
  const lines = ['@startuml', 'skinparam classAttributeIconSize 0'];
  if (model.title) lines.push(`title ${model.title}`);
  model.classes.forEach((cls) => {
    lines.push(`${cls.stereotype} "${cls.label.replace(/"/g, "'")}" as ${word(cls.id)} {`);
    cls.members.forEach((member) => lines.push(`  ${signature(member)}`));
    lines.push('}');
  });
  model.relations.forEach((relation) => {
    const quoted = (value) => (value ? `"${value}" ` : '');
    const arrow = relation.kind === 'association' && !relation.directed ? '--' : PLANT[relation.kind];
    lines.push(
      `${word(relation.from)} ${quoted(relation.fromMult)}${arrow} ${quoted(relation.toMult)}${word(relation.to)}${relation.label ? ` : ${relation.label}` : ''}`,
    );
  });
  return [...lines, '@enduml'].join('\n');
};

const ROW = 17;
const sizeOf = (cls) => {
  const rows = [...attrsOf(cls), ...methodsOf(cls)].map(signature);
  const head = stereotype(cls) ? 2 : 1;
  return {
    lines: rows,
    outline: 'box',
    w: Math.max(...[cls.label, stereotype(cls), ...rows].map((row) => row.length), 10) * 7 + 28,
    h: head * 20 + 12 + (Math.max(attrsOf(cls).length, 1) + Math.max(methodsOf(cls).length, 1)) * ROW,
  };
};

// One line of a compartment: attribute or method, vertically centred in its row.
const memberRow = (member, x, top, index) =>
  `<text x="${x + 8}" y="${top + index * ROW + ROW / 2}" dy="0.35em" font-size="12" fill="${INK}">${escapeXml(signature(member))}</text>`;

// The name (and the stereotype above it) of a class.
const classTitle = (cls, cx, y) => {
  const head = stereotype(cls) ? 2 : 1;
  return `${stereotype(cls) ? text(cx, y + 11, [stereotype(cls)], 11, 400, MUTED) : ''}${text(cx, y + (head - 1) * 20 + 14, [cls.label], 13, 700, '#0f172a')}`;
};

const drawClass = (item) => {
  const { node: cls, x, y, w, cx } = item;
  const head = stereotype(cls) ? 2 : 1;
  const first = y + head * 20 + 6;
  const attrs = attrsOf(cls);
  const second = first + Math.max(attrs.length, 1) * ROW;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${item.h}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>` +
    classTitle(cls, cx, y) +
    `<path d="M${x} ${first}H${x + w}M${x} ${second}H${x + w}" stroke="${INK}" stroke-width="1"/>` +
    attrs.map((member, index) => memberRow(member, x, first, index)).join('') +
    methodsOf(cls)
      .map((member, index) => memberRow(member, x, second, index))
      .join('')
  );
};

const render = (model) =>
  renderLayout({
    title: model.title,
    nodes: model.classes,
    edges: model.relations.map((relation) => ({ ...relation, from: relation.to, to: relation.from })),
    size: sizeOf,
    draw: drawClass,
    style: (edge) => (edge.kind === 'association' && !edge.directed ? {} : swapSides(LOOK[edge.kind])),
    labelOf: mults,
  });

// The layout puts parents on the left, so edges are reversed for layering; markers swap sides with them.
const swapSides = (look) => ({ start: look.end, end: look.start, dash: look.dash });

export const generators = { graphviz: toDot, mermaid: toMermaid, plantuml: toPlantUml };
export { render };
