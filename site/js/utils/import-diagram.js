// Turns PlantUML and Mermaid text into DSLKit code. Three kinds of diagram are understood:
// flowcharts (Mermaid), sequence diagrams and state diagrams (both languages). Anything else is reported, never guessed.

const MAX_LABEL = 80;
const SKIPPED_FLOW = /^(subgraph|end|classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/;
const SKIPPED_STATE = /^(note|direction|hide|skinparam|--|state\s+\S+\s*\{|.*<<.*>>)/i;
const PARTICIPANT_WORD = '(participant|actor|boundary|control|entity|database|collections|queue)';

const sanitizeId = (raw) => {
  const id = String(raw)
    .replace(/^"|"$/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^-+|-+$/g, '');
  return id === '' ? 'n' : id;
};
const cleanText = (raw) =>
  String(raw ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\\/g, '')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL);
const unquoted = (value) => value.trim().replace(/^"(.*)"$/, '$1');

// The lines of the code without comments, empty lines and the PlantUML frame.
const linesOf = (source) =>
  source
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/;$/, ''))
    .filter((line) => line !== '' && !line.startsWith('%%') && !line.startsWith("'") && !/^@(startuml|enduml)/i.test(line));

const titleOf = (lines, fallback) => {
  const line = lines.find((item) => /^title\s+/i.test(item));
  return line ? cleanText(line.replace(/^title\s+/i, '')) || fallback : fallback;
};

const addUnique = (list, value) => {
  if (!list.includes(value)) list.push(value);
};

// Mermaid flowchart: nodes with a shape and a label, links with an optional label.
const importFlowchart = (lines) => {
  const nodes = new Map();
  const edges = [];
  const skipped = [];
  const touch = (token) => {
    const [head] = token.trim().split(':::');
    const found = /^([\w.-]+)(.*)$/.exec(head.trim());
    if (!found) return null;
    const id = sanitizeId(found[1]);
    const label = cleanText(unquoted(found[2].replace(/^[[\](){}/\\>|]+/, '').replace(/[[\](){}/\\|]+$/, '')));
    if (!nodes.has(id) || (nodes.get(id) === '' && label !== '')) nodes.set(id, label);
    return id;
  };
  lines.forEach((line) => {
    if (/^(graph|flowchart)\b/.test(line) || line === 'end') return;
    if (SKIPPED_FLOW.test(line)) return addUnique(skipped, line.split(/\s+/)[0]);
    const normal = line.replace(/--\s+([^->|][^>]*?)\s+-->/g, '-->|$1|').replace(/==\s+([^=>|][^>]*?)\s+==>/g, '==>|$1|');
    const parts = normal.split(/\s*(-->|---|==>|===|-\.->|-\.-)(?:\|([^|]*)\|)?\s*/);
    const groups = [];
    for (let at = 0; at < parts.length; at += 3)
      groups.push(
        parts[at]
          .split(/\s+&\s+/)
          .map(touch)
          .filter(Boolean),
      );
    for (let at = 0; at + 1 < groups.length; at += 1) {
      const label = cleanText(parts[at * 3 + 2]);
      groups[at].forEach((from) => groups[at + 1].forEach((to) => edges.push({ from, to, label })));
    }
    if (parts.length === 1 && groups[0].length === 0) addUnique(skipped, line.split(/\s+/)[0]);
  });
  const out = ['diagram graph "Imported flowchart"', 'mode directed'];
  nodes.forEach((label, id) => out.push(label && label !== id ? `vertex ${id} "${label}"` : `vertex ${id}`));
  edges.forEach(({ from, to, label }) => out.push(`edge ${from} -> ${to}${label ? ` "${label}"` : ''}`));
  return { kind: 'flowchart', dsl: out.join('\n'), skipped, empty: nodes.size === 0 };
};

const ARROWS = {
  mermaid: { '->>': 'sync', '-->>': 'return', '->': 'sync', '-->': 'return', '-)': 'async', '--)': 'async', '-x': 'sync', '--x': 'return' },
  plantuml: { '->': 'sync', '->>': 'async', '-->': 'return', '-->>': 'return', '<-': 'sync', '<--': 'return', '<<-': 'async' },
};
const SIGNS = { sync: '->', async: '->>', return: '-->' };
const NAME = '("[^"]+"|[\\w.]+(?:-[\\w.]+)*)';
const MESSAGE = new RegExp(`^${NAME}\\s*(<<-|<--|<-|-->>|->>|--\\)|-\\)|--x|-x|-->|->)\\s*[+-]?\\s*${NAME}\\s*(?::\\s*(.*))?$`);

// Sequence diagrams: participants first, then the messages in the order of the lines.
const importSequence = (lines, dialect) => {
  const participants = new Map();
  const messages = [];
  const skipped = [];
  const declare = (id, label, kind) => {
    const known = participants.get(id);
    if (!known) participants.set(id, { label: label || id, kind });
    else if (label) known.label = label;
  };
  // A quoted name that was declared with a short name means that participant.
  const resolve = (name) => {
    const label = cleanText(unquoted(name));
    const declared = [...participants].find(([, item]) => item.label === label);
    return { id: declared ? declared[0] : sanitizeId(name), label };
  };
  lines.forEach((line) => {
    if (/^(sequenceDiagram|title\b)/i.test(line) || line === 'end') return;
    const word = new RegExp(`^${PARTICIPANT_WORD}\\s+(.+)$`, 'i').exec(line);
    if (word) {
      const kind = word[1].toLowerCase() === 'actor' ? 'actor' : 'participant';
      const rest = word[2].trim();
      const quoted = /^"([^"]+)"\s+as\s+(\S+)$/.exec(rest);
      const aliased = /^(\S+)\s+as\s+(.+)$/.exec(rest);
      if (quoted) declare(sanitizeId(quoted[2]), cleanText(quoted[1]), kind);
      else if (aliased) declare(sanitizeId(aliased[1]), cleanText(unquoted(aliased[2])), kind);
      else declare(sanitizeId(rest), cleanText(unquoted(rest)), kind);
      return;
    }
    const found = MESSAGE.exec(line);
    if (!found) return addUnique(skipped, line.split(/\s+/)[0]);
    const [, first, arrow, second, text] = found;
    const kind = ARROWS[dialect][arrow] ?? 'sync';
    const reversed = arrow.startsWith('<');
    const names = [first, second].map(resolve);
    names.forEach(({ id, label }) => declare(id, id === label.replace(/[^\w.-]+/g, '_') ? '' : label, 'participant'));
    const [from, to] = reversed ? [names[1], names[0]] : names;
    messages.push({ from: from.id, to: to.id, kind, text: cleanText(text) });
  });
  const out = [`diagram uml sequence "${titleOf(lines, 'Imported sequence')}"`];
  participants.forEach(({ label, kind }, id) => out.push(label && label !== id ? `${kind} ${id} "${label}"` : `${kind} ${id}`));
  messages.forEach(({ from, to, kind, text }) => out.push(`${from} ${SIGNS[kind]} ${to}${text ? ` : ${text}` : ''}`));
  return { kind: 'sequence', dsl: out.join('\n'), skipped, empty: participants.size === 0 };
};

// State diagrams: [*] is the start when it is on the left of an arrow and the end when it is on the right.
const importState = (lines) => {
  const states = new Map();
  const transitions = [];
  const skipped = [];
  let initial = false;
  let final = false;
  const stateId = (raw) => {
    const text = raw.trim();
    if (text === '[*]') return null;
    const id = sanitizeId(text);
    if (!states.has(id)) states.set(id, '');
    return id;
  };
  lines.forEach((line) => {
    if (line === '}' || /^(stateDiagram|title\b)/i.test(line)) return;
    if (SKIPPED_STATE.test(line)) return addUnique(skipped, line.split(/\s+/)[0]);
    const named = /^state\s+(?:"([^"]+)"\s+as\s+(\S+)|(\S+)\s+as\s+"([^"]+)")\s*$/.exec(line);
    if (named) {
      const id = sanitizeId(named[2] ?? named[3]);
      states.set(id, cleanText(named[1] ?? named[4]));
      return;
    }
    const plain = /^state\s+(\w[\w.-]*)$/i.exec(line);
    if (plain) return void stateId(plain[1]);
    const arrow = /^(\S+)\s*-->\s*(\S+?)\s*(?::\s*(.*))?$/.exec(line);
    if (!arrow) {
      const described = /^(\w[\w.-]*)\s*:\s*(.+)$/.exec(line);
      if (described) return void stateId(described[1]);
      return addUnique(skipped, line.split(/\s+/)[0]);
    }
    const from = stateId(arrow[1]);
    const to = stateId(arrow[2]);
    if (from === null) initial = true;
    if (to === null) final = true;
    transitions.push({ from: from ?? 'start', to: to ?? 'end', label: cleanText(arrow[3]) });
  });
  const out = [`diagram uml state "${titleOf(lines, 'Imported state diagram')}"`];
  if (initial) out.push('initial start');
  states.forEach((label, id) => out.push(label && label !== id ? `state ${id} "${label}"` : `state ${id}`));
  if (final) out.push('final end');
  transitions.forEach(({ from, to, label }) => out.push(`transition ${from} -> ${to}${label ? ` "${label}"` : ''}`));
  return { kind: 'state', dsl: out.join('\n'), skipped, empty: states.size === 0 && !initial && !final };
};

const UNSUPPORTED = /^(classDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|sankey|xychart|block)\b/;

// The result is { ok: true, kind, dsl, skipped } or { ok: false, reason, name }.
export const importDiagram = (source) => {
  const text = String(source ?? '');
  const lines = linesOf(text);
  if (lines.length === 0) return { ok: false, reason: 'empty' };
  const first = lines[0];
  if (/^diagram\s+/.test(first)) return { ok: true, kind: 'dsl', dsl: text.trim(), skipped: [] };
  const unsupported = UNSUPPORTED.exec(first);
  if (unsupported) return { ok: false, reason: 'unsupported', name: unsupported[1] };
  const plantuml = /@startuml/i.test(text);
  let result;
  if (/^(graph|flowchart)\b/.test(first)) result = importFlowchart(lines);
  else if (/^sequenceDiagram\b/.test(first)) result = importSequence(lines, 'mermaid');
  else if (/^stateDiagram/.test(first) || (plantuml && (lines.some((line) => line.includes('[*]')) || lines.some((line) => /^state\s/i.test(line)))))
    result = importState(lines);
  else if (plantuml && lines.some((line) => /^(class|interface|enum|abstract)\s/i.test(line))) return { ok: false, reason: 'unsupported', name: 'class' };
  else if (plantuml && lines.some((line) => new RegExp(`^${PARTICIPANT_WORD}\\s`, 'i').test(line) || MESSAGE.test(line)))
    result = importSequence(lines, 'plantuml');
  else return { ok: false, reason: 'unknown' };
  return result.empty ? { ok: false, reason: 'empty' } : { ok: true, ...result };
};
