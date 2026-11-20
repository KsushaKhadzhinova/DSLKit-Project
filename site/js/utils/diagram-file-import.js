// The key-free importer of diagram FILES: draw.io, SVG (draw.io, Graphviz, Mermaid), JSON graphs (also Excalidraw, Cytoscape, Lucid), BPMN 2.0 XML,
// XMI (UML classes), GraphML, GEXF, Visio (VDX and the XML of VSDX), Graphviz DOT and CSV/TSV edge lists become DSLKit code.
// Everything is deterministic: a small XML reader of our own (no DOMParser, so it runs in Node too), no network, no AI.
// Result: { ok, notation, code, warnings } or { ok: false, reason, warnings }.
import { parseDiagram } from '../notations/index.js';
import { normalizeLanguage } from './lang.js';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_LABEL = 80;
const MAX_DEPTH = 200;
const MAX_NODES = 2000;

const WORDS = {
  ru: {
    'skipped-links': 'Связей пропущено (нет начала или конца): {n}.',
    'skipped-containers': 'Контейнеров и групп пропущено: {n}.',
    'skipped-text': 'Свободных надписей пропущено: {n}.',
    'fallback-graph': 'Правила блок-схемы не выполнены (нет начала или конца), диаграмма нарисована как граф.',
    'cut-nodes': 'Элементов слишком много, оставлено {n}.',
    'csv-directed': 'Строки таблицы прочитаны как направленные связи.',
    'no-inflate': 'Сжатое содержимое draw.io не удалось распаковать: сохраните файл без сжатия (Файл, Свойства, Сжатый XML выключить).',
    'too-large-inflate': 'Сжатое содержимое draw.io после распаковки больше 8 МБ, файл отклонён: сохраните файл без сжатия или уменьшите диаграмму.',
    'class-members': 'Из UML-классов взяты имена, атрибуты и операции без типов.',
  },
  en: {
    'skipped-links': 'Links skipped (no start or end): {n}.',
    'skipped-containers': 'Containers and groups skipped: {n}.',
    'skipped-text': 'Free text labels skipped: {n}.',
    'fallback-graph': 'The flowchart rules are not met (no start or end), so the diagram is drawn as a graph.',
    'cut-nodes': 'Too many elements, {n} are kept.',
    'csv-directed': 'The table rows are read as directed links.',
    'no-inflate': 'The compressed content of draw.io could not be unpacked: save the file uncompressed (File, Properties, turn Compressed XML off).',
    'too-large-inflate':
      'The compressed content of draw.io is larger than 8 MB when unpacked, the file is refused: save the file uncompressed or make the diagram smaller.',
    'class-members': 'From the UML classes the names, attributes and operations are taken, without types.',
  },
};
const say = (lang, key, params = {}) => WORDS[normalizeLanguage(lang)][key].replace(/\{(\w+)\}/g, (_, name) => params[name]);

// ---------- a small XML reader ----------
const ENTITY = /&(?:#x([0-9a-f]+)|#(\d+)|(lt|gt|amp|quot|apos));/gi;
const NAMED = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const decode = (text) =>
  text.replace(ENTITY, (_, hex, dec, name) => {
    if (name) return NAMED[name.toLowerCase()];
    const code = hex ? parseInt(hex, 16) : Number(dec);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
const local = (name) => name.slice(name.lastIndexOf(':') + 1);
const XML_TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!(?:[^>[]|\[[\s\S]*?\])*>|<(\/?)([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

// A tree { name, attrs, children, text }. Names lose their prefix (bpmn:task is task); a broken tag is skipped, never guessed.
export const parseXml = (source) => {
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  for (const match of String(source).matchAll(XML_TOKEN)) {
    const [, cdata, closing, tag, attrText, selfClosing, text] = match;
    const top = stack[stack.length - 1];
    if (cdata !== undefined) top.text += cdata;
    else if (text !== undefined) top.text += decode(text);
    else if (closing === '/') {
      const at = stack.findLastIndex((item) => item.name === local(tag));
      if (at > 0) stack.length = at;
    } else if (tag !== undefined) {
      const node = { name: local(tag), attrs: {}, children: [], text: '' };
      for (const [, key, double, single] of attrText.matchAll(ATTR)) node.attrs[local(key)] = decode(double ?? single);
      top.children.push(node);
      if (selfClosing !== '/') {
        if (stack.length > MAX_DEPTH) throw new Error('too deep');
        stack.push(node);
      }
    }
  }
  return root;
};
const all = (node, name, found = []) => {
  node.children.forEach((child) => {
    if (child.name === name) found.push(child);
    all(child, name, found);
  });
  return found;
};
const kids = (node, name) => node.children.filter((child) => child.name === name);
const kid = (node, name) => node.children.find((child) => child.name === name);
const textOf = (node) => node.text + node.children.map(textOf).join(' ');

// ---------- the common model ----------
const HTML_ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"' };
export const cleanLabel = (raw) =>
  decode(
    String(raw ?? '')
      .replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/&(nbsp|amp|lt|gt|quot);/g, (_, name) => HTML_ENTITIES[name])
    .replace(/[\\"]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL);

const newModel = (hint = null) => ({ hint, title: '', nodes: new Map(), edges: [], warnings: [], directed: true });
const addNode = (model, id, props = {}) => {
  const key = String(id);
  if (!model.nodes.has(key) && model.nodes.size < MAX_NODES) model.nodes.set(key, { id: key, label: '', kind: undefined, ...props });
  return model.nodes.get(key);
};
const addEdge = (model, from, to, label = '', directed = true) => {
  model.edges.push({ from: String(from), to: String(to), label: cleanLabel(label), directed });
};
const number = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// The kind of a node from the words of its style or shape name.
const KIND_RULES = [
  ['decision', /rhombus|decision|diamond|condition/],
  ['start', /\b(start|begin)\b/],
  ['end', /\b(end|stop)\b/],
  ['offpage', /off-?page/],
  ['connector', /connector|on-page/],
  ['storage', /cylinder|database|storage|datastore/],
  ['document', /document/],
  ['preparation', /hexagon|preparation/],
  ['manual', /trapezoid|manual/],
  ['predefined', /predefined|shape=process|subroutine/],
  ['io', /parallelogram|flowchart\.data|flowchart\.display|input_output|\bdata\b|\binput\b|\boutput\b/],
  ['terminal', /ellipse|terminator|oval|circle/],
];
export const classify = (style) => {
  const text = String(style ?? '').toLowerCase();
  return KIND_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? 'process';
};
const bpmnKind = (style) => {
  if (/gateway/i.test(style)) return /gwType=parallel/i.test(style) ? 'parallel' : 'exclusive';
  if (/outline=end/i.test(style)) return 'end';
  if (/outline=standard/i.test(style)) return 'start';
  if (/ellipsePerimeter|bpmn\.event|outline=/i.test(style)) return 'intermediate';
  return 'task';
};
const toBpmn = {
  process: 'task',
  decision: 'exclusive',
  io: 'task',
  document: 'task',
  predefined: 'task',
  preparation: 'task',
  manual: 'task',
  storage: 'task',
};
const toGost = { task: 'process', exclusive: 'decision', parallel: 'process', intermediate: 'process', terminal: 'process' };

// ---------- the emitter ----------
const uniqueIds = (nodes) => {
  const used = new Set();
  return new Map(
    nodes.map((node) => {
      const base =
        String(node.id)
          .replace(/[^\w\u00C0-\u024F\u0400-\u04FF.-]+/g, '_')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'n';
      let id = base;
      for (let n = 2; used.has(id); n += 1) id = `${base}_${n}`;
      used.add(id);
      return [node.id, id];
    }),
  );
};
const quoted = (text) => (text === '' ? '' : ` "${text}"`);

const emitFlow = (notation, nodes, edges, ids, model) => {
  const kindMap = notation === 'bpmn' ? toBpmn : toGost;
  const withPos = nodes.filter((node) => node.x !== undefined && node.y !== undefined);
  const dx = withPos.length > 0 ? Math.min(...withPos.map((node) => node.x)) - 100 : 0;
  const dy = withPos.length > 0 ? Math.min(...withPos.map((node) => node.y)) - 100 : 0;
  const lines = [`diagram ${notation}${quoted(model.title)}`];
  nodes.forEach((node) => {
    const pos = node.x !== undefined && node.y !== undefined ? ` pos=${Math.round(node.x - dx)}x${Math.round(node.y - dy)}` : '';
    lines.push(`${kindMap[node.final] ?? node.final} ${ids.get(node.id)}${quoted(node.label)}${pos}`);
  });
  edges.forEach((edge) => lines.push(`flow ${ids.get(edge.from)} -> ${ids.get(edge.to)}${quoted(edge.label)}`));
  return lines.join('\n');
};
const emitGraph = (nodes, edges, ids, model) => {
  const directed = edges.length === 0 || edges.some((edge) => edge.directed);
  const lines = [`diagram graph${quoted(model.title)}`, `mode ${directed ? 'directed' : 'undirected'}`];
  nodes.forEach((node) => lines.push(`vertex ${ids.get(node.id)}${quoted(node.label)}`));
  edges.forEach((edge) => lines.push(`edge ${ids.get(edge.from)} ${directed ? '->' : '--'} ${ids.get(edge.to)}${quoted(edge.label)}`));
  return lines.join('\n');
};

export const emitModel = (model, lang) => {
  const warnings = [...model.warnings];
  const nodes = [...model.nodes.values()];
  if (nodes.length === 0) return { ok: false, reason: 'no-structure', warnings };
  const edges = model.edges.filter((edge) => model.nodes.has(edge.from) && model.nodes.has(edge.to));
  if (edges.length < model.edges.length) warnings.push(say(lang, 'skipped-links', { n: model.edges.length - edges.length }));
  if (model.nodes.size >= MAX_NODES) warnings.push(say(lang, 'cut-nodes', { n: MAX_NODES }));
  const ids = uniqueIds(nodes);
  const ins = new Map();
  const outs = new Map();
  edges.forEach((edge) => {
    ins.set(edge.to, (ins.get(edge.to) ?? 0) + 1);
    outs.set(edge.from, (outs.get(edge.from) ?? 0) + 1);
  });
  nodes.forEach((node) => {
    const kind = node.kind ?? 'process';
    if (kind !== 'terminal') node.final = kind;
    else if (!ins.has(node.id)) node.final = 'start';
    else node.final = outs.has(node.id) ? 'intermediate' : 'end';
  });
  const explicit = model.hint;
  const flowLike = nodes.some((node) => node.kind !== undefined && node.kind !== 'process');
  const notation = explicit ?? (flowLike ? 'gost' : 'graph');
  if (notation === 'graph') return { ok: true, notation, code: emitGraph(nodes, edges, ids, model), warnings };
  const code = emitFlow(notation, nodes, edges, ids, model);
  if (explicit === null && parseDiagram(code).problems.some((item) => item.severity === 'error' && item.code !== 'gost-decision-label')) {
    return { ok: true, notation: 'graph', code: emitGraph(nodes, edges, ids, model), warnings: [...warnings, say(lang, 'fallback-graph')] };
  }
  return { ok: true, notation, code, warnings };
};

// ---------- draw.io ----------
const styleMap = (style) => {
  const map = {};
  String(style ?? '')
    .split(';')
    .forEach((part) => {
      const at = part.indexOf('=');
      if (at > 0) map[part.slice(0, at)] = part.slice(at + 1);
      else if (part !== '') map[part] = '';
    });
  return map;
};

const cellsOf = (graph) => {
  const wrapped = new Set();
  const cells = [];
  [...all(graph, 'object'), ...all(graph, 'UserObject')].forEach((wrap) => {
    const cell = kid(wrap, 'mxCell');
    if (!cell) return;
    wrapped.add(cell);
    cells.push({ ...cell.attrs, id: wrap.attrs.id, value: wrap.attrs.label ?? wrap.attrs.value ?? '', node: cell });
  });
  all(graph, 'mxCell')
    .filter((cell) => !wrapped.has(cell))
    .forEach((cell) => cells.push({ ...cell.attrs, node: cell }));
  return cells;
};

const fromMxGraph = (graph, lang) => {
  const cells = cellsOf(graph);
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const bpmn = cells.some((cell) => /mxgraph\.bpmn/i.test(cell.style ?? ''));
  const model = newModel(bpmn ? 'bpmn' : null);
  const absolute = (cell) => {
    let x = 0;
    let y = 0;
    for (let at = cell, depth = 0; at && depth < 50; at = byId.get(at.parent), depth += 1) {
      const geo = kid(at.node, 'mxGeometry');
      x += number(geo?.attrs.x) ?? 0;
      y += number(geo?.attrs.y) ?? 0;
    }
    return { x, y };
  };
  let containers = 0;
  let texts = 0;
  const edgeLabels = new Map();
  cells
    .filter((cell) => cell.vertex === '1' && /edgeLabel/.test(cell.style ?? '') && byId.get(cell.parent)?.edge === '1')
    .forEach((cell) => edgeLabels.set(cell.parent, cleanLabel(cell.value)));
  cells
    .filter((cell) => cell.vertex === '1' && !/edgeLabel/.test(cell.style ?? ''))
    .forEach((cell) => {
      const style = styleMap(cell.style);
      if ('swimlane' in style || 'group' in style || style.shape === 'table' || 'pool' in style) {
        containers += 1;
        return;
      }
      if ('text' in style || style.shape === 'text') {
        texts += 1;
        return;
      }
      const geo = kid(cell.node, 'mxGeometry');
      const { x, y } = absolute(cell);
      addNode(model, cell.id, {
        label: cleanLabel(cell.value),
        kind: bpmn ? bpmnKind(cell.style) : classify(cell.style),
        x: x + (number(geo?.attrs.width) ?? 0) / 2,
        y: y + (number(geo?.attrs.height) ?? 0) / 2,
      });
    });
  if (containers > 0) model.warnings.push(say(lang, 'skipped-containers', { n: containers }));
  if (texts > 0) model.warnings.push(say(lang, 'skipped-text', { n: texts }));
  cells
    .filter((cell) => cell.edge === '1')
    .forEach((cell) => {
      const style = styleMap(cell.style);
      const startArrow = style.startArrow ?? 'none';
      const reverse = style.endArrow === 'none' && startArrow !== 'none';
      const directed = style.endArrow !== 'none' || startArrow !== 'none';
      const [from, to] = reverse ? [cell.target, cell.source] : [cell.source, cell.target];
      addEdge(model, from, to, edgeLabels.get(cell.id) ?? cell.value, directed);
    });
  return model;
};

// The content of a compressed <diagram>: base64, raw deflate, URL-encoded XML.
// The unpacked size is capped (a small file may unpack to hundreds of megabytes): the stream is read in parts and stopped at the limit.
export const MAX_INFLATED_BYTES = 8 * 1024 * 1024;
export const inflateRaw = async (bytes, limit = MAX_INFLATED_BYTES) => {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const parts = [];
  let total = 0;
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    total += part.value.length;
    if (total > limit) {
      await reader.cancel();
      throw Object.assign(new Error('inflate limit'), { code: 'inflate-limit' });
    }
    parts.push(part.value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  parts.forEach((part) => {
    out.set(part, at);
    at += part.length;
  });
  return out;
};
const fromBase64 = (text) => Uint8Array.from(atob(text.replace(/\s+/g, '')), (char) => char.charCodeAt(0));

const drawio = async (root, { lang, inflate }) => {
  const direct = all(root, 'mxGraphModel')[0];
  if (direct) return fromMxGraph(direct, lang);
  const page = all(root, 'diagram')[0];
  const packed = page ? page.text.trim() : '';
  if (packed === '') return null;
  try {
    const xml = decodeURIComponent(new TextDecoder().decode(await inflate(fromBase64(packed))));
    const graph = all(parseXml(xml), 'mxGraphModel')[0];
    return graph ? fromMxGraph(graph, lang) : null;
  } catch (error) {
    const model = newModel();
    model.warnings.push(say(lang, error?.code === 'inflate-limit' ? 'too-large-inflate' : 'no-inflate'));
    return model;
  }
};

// ---------- SVG ----------
const translateOf = (node) => {
  const found = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(node.attrs.transform ?? '');
  return found ? { x: Number(found[1]), y: Number(found[2]) } : {};
};
const classes = (node) => (node.attrs.class ?? '').split(/\s+/);

const graphvizSvg = (svg) => {
  const model = newModel('graph');
  const groups = all(svg, 'g');
  groups
    .filter((group) => classes(group).includes('node') && kid(group, 'title'))
    .forEach((group) => {
      const texts = kids(group, 'text').map((item) => cleanLabel(textOf(item)));
      addNode(model, textOf(kid(group, 'title')).trim(), { label: texts.join(' ') });
    });
  groups
    .filter((group) => classes(group).includes('edge') && kid(group, 'title'))
    .forEach((group) => {
      const found = /^(.+?)(?::\w+)?\s*(->|--)\s*(.+?)(?::\w+)?$/.exec(textOf(kid(group, 'title')).trim());
      if (found) addEdge(model, found[1], found[3], kids(group, 'text').map(textOf).join(' '), found[2] === '->');
    });
  return model.nodes.size > 0 ? model : null;
};

// Mermaid 10 names a node "flowchart-A-0", Mermaid 11 puts the container id before it ("container-flowchart-A-0") and keeps the edge label under data-id.
const MERMAID_NODE = /(?:^|-)flowchart-(.+)-\d+$/;
const mermaidSvg = (svg) => {
  const model = newModel();
  const nodes = all(svg, 'g').filter((group) => MERMAID_NODE.test(group.attrs.id ?? ''));
  nodes.forEach((group) => {
    const id = MERMAID_NODE.exec(group.attrs.id)[1];
    const shape = all(group, 'polygon').length > 0 ? 'decision' : all(group, 'circle').length > 0 ? 'terminal' : 'process';
    addNode(model, id, { label: cleanLabel(textOf(group)), kind: shape, ...translateOf(group) });
  });
  const labels = new Map(
    all(svg, 'g')
      .filter((group) => /^L[-_]/.test(group.attrs['data-id'] ?? ''))
      .map((group) => [group.attrs['data-id'], cleanLabel(textOf(group))]),
  );
  all(svg, 'path').forEach((path) => {
    const rest = /(?:^|-)L[-_](.+)[-_]\d+$/.exec(path.attrs.id ?? '')?.[1];
    if (!rest) return;
    const cuts = [...rest.matchAll(/[-_]/g)].map((hit) => hit.index);
    const cut = cuts.find((at) => model.nodes.has(rest.slice(0, at)) && model.nodes.has(rest.slice(at + 1)));
    if (cut !== undefined) addEdge(model, rest.slice(0, cut), rest.slice(cut + 1), labels.get(path.attrs.id.replace(/^.*?(?=L[-_])/, '')) ?? '');
  });
  return model.nodes.size > 0 ? model : null;
};

const svgFile = async (root, options) => {
  const svg = all(root, 'svg')[0];
  const embedded = svg.attrs.content ?? '';
  if (/<(mxfile|mxGraphModel)\b/.test(embedded)) return drawio(parseXml(embedded), options);
  return graphvizSvg(svg) ?? mermaidSvg(svg);
};

// ---------- JSON ----------
const refOf = (value) => (value !== null && typeof value === 'object' ? (value.id ?? value.key) : value);
const first = (object, names) => {
  for (const name of names) if (object[name] !== undefined && object[name] !== null && object[name] !== '') return object[name];
  return undefined;
};
const HINTS = { bpmn: 'bpmn', flowchart: 'gost', gost: 'gost', graph: 'graph' };

const excalidraw = (elements) => {
  const model = newModel();
  const texts = new Map();
  elements.filter((item) => item.type === 'text' && item.containerId).forEach((item) => texts.set(item.containerId, item.text));
  const shapes = elements.filter((item) => ['rectangle', 'diamond', 'ellipse'].includes(item.type) && !item.isDeleted);
  shapes.forEach((item) => {
    const kind = { rectangle: 'process', diamond: 'decision', ellipse: 'terminal' }[item.type];
    addNode(model, item.id, { label: cleanLabel(texts.get(item.id)), kind, x: item.x + (item.width ?? 0) / 2, y: item.y + (item.height ?? 0) / 2 });
  });
  elements
    .filter((item) => item.type === 'arrow' && !item.isDeleted)
    .forEach((item) => addEdge(model, item.startBinding?.elementId, item.endBinding?.elementId, texts.get(item.id) ?? ''));
  return model;
};

const lucid = (page) => {
  const model = newModel();
  page.shapes.forEach((shape) => {
    const box = shape.boundingBox ?? {};
    addNode(model, shape.id, {
      label: cleanLabel(shape.text ?? shape.textAreas?.[0]?.text),
      kind: classify(shape.type),
      x: box.x + (box.w ?? 0) / 2,
      y: box.y + (box.h ?? 0) / 2,
    });
  });
  (page.lines ?? []).forEach((line) => addEdge(model, line.endpoint1?.connectedTo, line.endpoint2?.connectedTo, line.text ?? ''));
  return model;
};

const jsonFile = (data) => {
  const elements = Array.isArray(data) ? data : data?.elements;
  if (data?.type === 'excalidraw' || (Array.isArray(elements) && elements.some((item) => item?.type === 'arrow' || item?.type === 'rectangle')))
    return excalidraw(elements);
  const page = data?.pages?.find((item) => Array.isArray(item?.shapes));
  if (page) return lucid(page);
  const cy =
    data?.elements && !Array.isArray(data.elements)
      ? data.elements
      : Array.isArray(data?.elements)
        ? { nodes: data.elements.filter((item) => item.group === 'nodes'), edges: data.elements.filter((item) => item.group === 'edges') }
        : null;
  const nodes = (cy ? cy.nodes : data?.nodes) ?? [];
  const edges = (cy ? cy.edges : (data?.edges ?? data?.links)) ?? [];
  if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.length === 0) return null;
  const hint = HINTS[String(first(data, ['notation', 'diagram', 'type']) ?? '').toLowerCase()] ?? null;
  const model = newModel(hint);
  model.title = cleanLabel(first(data, ['title', 'name']));
  model.directed = data.directed !== false;
  nodes.forEach((raw, index) => {
    const item = raw?.data ?? raw ?? {};
    const shape = first(item, ['shape', 'type', 'kind']);
    addNode(model, first(item, ['id', 'key', 'name']) ?? index, {
      label: cleanLabel(first(item, ['label', 'text', 'name', 'title']) ?? ''),
      kind: shape === undefined ? undefined : classify(shape),
      x: number(item.x ?? item.position?.x ?? raw?.position?.x),
      y: number(item.y ?? item.position?.y ?? raw?.position?.y),
    });
  });
  edges.forEach((raw) => {
    const item = raw?.data ?? raw ?? {};
    addEdge(
      model,
      refOf(first(item, ['from', 'source', 'start'])),
      refOf(first(item, ['to', 'target', 'end'])),
      first(item, ['label', 'text', 'name']) ?? '',
      model.directed,
    );
  });
  return model;
};

// ---------- BPMN 2.0 XML ----------
const BPMN_KINDS = {
  startEvent: 'start',
  endEvent: 'end',
  intermediateCatchEvent: 'intermediate',
  intermediateThrowEvent: 'intermediate',
  boundaryEvent: 'intermediate',
  exclusiveGateway: 'exclusive',
  inclusiveGateway: 'exclusive',
  eventBasedGateway: 'exclusive',
  complexGateway: 'exclusive',
  parallelGateway: 'parallel',
  subProcess: 'task',
  callActivity: 'task',
  transaction: 'task',
};
const NESTED_BPMN = new Set(['subProcess', 'transaction', 'adHocSubProcess']);
const bpmnFile = (root) => {
  const model = newModel('bpmn');
  const found = all(root, 'process');
  const processes = found.length > 0 ? found : [root];
  const bounds = new Map();
  all(root, 'BPMNShape').forEach((shape) => {
    const box = kid(shape, 'Bounds');
    if (box) bounds.set(shape.attrs.bpmnElement, box.attrs);
  });
  const flowNodes = [];
  const visit = (node) =>
    node.children.forEach((child) => {
      const kind = BPMN_KINDS[child.name] ?? (/Task$/.test(child.name) || child.name === 'task' ? 'task' : undefined);
      if (kind) flowNodes.push([child, kind]);
      // The inside of a sub-process is a separate flow: it stays one task, otherwise its start and end events break the outer process.
      if (!NESTED_BPMN.has(child.name)) visit(child);
    });
  processes.forEach(visit);
  flowNodes.forEach(([item, kind]) => {
    const box = bounds.get(item.attrs.id) ?? {};
    addNode(model, item.attrs.id, {
      label: cleanLabel(item.attrs.name),
      kind,
      x: number(box.x) === undefined ? undefined : number(box.x) + (number(box.width) ?? 0) / 2,
      y: number(box.y) === undefined ? undefined : number(box.y) + (number(box.height) ?? 0) / 2,
    });
  });
  const known = new Set(flowNodes.map(([item]) => item.attrs.id));
  processes
    .flatMap((process) => all(process, 'sequenceFlow'))
    .filter((flow) => known.has(flow.attrs.sourceRef) && known.has(flow.attrs.targetRef))
    .forEach((flow) => addEdge(model, flow.attrs.sourceRef, flow.attrs.targetRef, flow.attrs.name));
  return model;
};

// ---------- XMI / UML classes ----------
const xmiFile = (root, lang) => {
  const elements = all(root, 'packagedElement');
  const classes_ = elements.filter((item) => ['uml:Class', 'uml:Interface', 'Class', 'Interface'].includes(item.attrs.type) && item.attrs.name);
  if (classes_.length === 0) return null;
  const names = new Map(classes_.map((item) => [item.attrs.id, item.attrs.name]));
  const idOf = new Map();
  const taken = new Set();
  const code = (item) => {
    const base = cleanLabel(item.attrs.name).replace(/[^\w\u00C0-\u024F\u0400-\u04FF.]+/g, '_') || 'C';
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = `${base}_${n}`;
    taken.add(id);
    idOf.set(item.attrs.id, id);
    return id;
  };
  const lines = ['diagram uml class'];
  const relations = [];
  classes_.forEach((item) => {
    const id = code(item);
    const keyword = /Interface$/.test(item.attrs.type) ? 'interface' : item.attrs.isAbstract === 'true' ? 'abstract class' : 'class';
    lines.push(`${keyword} ${id} {`);
    kids(item, 'ownedAttribute').forEach((attr) => {
      if (attr.attrs.association && names.has(attr.attrs.type)) relations.push([item.attrs.id, attr.attrs.type, attr.attrs.name ?? '']);
      else if (attr.attrs.name) lines.push(`  + ${cleanLabel(attr.attrs.name).replace(/[^\w\u00C0-\u024F\u0400-\u04FF]+/g, '_')}`);
    });
    kids(item, 'ownedOperation').forEach((operation) => {
      if (operation.attrs.name) lines.push(`  + ${cleanLabel(operation.attrs.name).replace(/[^\w\u00C0-\u024F\u0400-\u04FF]+/g, '_')}()`);
    });
    lines.push('}');
    kids(item, 'generalization').forEach((general) => relations.push([item.attrs.id, general.attrs.general, '', '--|>']));
    kids(item, 'interfaceRealization').forEach((real) => relations.push([item.attrs.id, real.attrs.contract, '', '..|>']));
  });
  // An association of Enterprise Architect and Papyrus is its own element with two ends that point at the classes.
  elements
    .filter((item) => /Association$/.test(item.attrs.type ?? ''))
    .forEach((item) => {
      const ends = [...kids(item, 'ownedEnd'), ...kids(item, 'ownedAttribute')].map((end) => end.attrs.type);
      if (ends.length === 2) relations.push([ends[0], ends[1], item.attrs.name ?? '']);
    });
  relations
    .filter(([from, to]) => idOf.has(from) && idOf.has(to))
    .forEach(([from, to, label, arrow = '-->']) => lines.push(`${idOf.get(from)} ${arrow} ${idOf.get(to)}${label ? ` : ${cleanLabel(label)}` : ''}`));
  return { notation: 'uml class', code: lines.join('\n'), warnings: [say(lang, 'class-members')] };
};

// ---------- GraphML and GEXF ----------
const graphml = (root) => {
  const graph = all(root, 'graph')[0];
  if (!graph) return null;
  const keys = new Map(all(root, 'key').map((key) => [key.attrs.id, key.attrs['attr.name'] ?? key.attrs.name ?? '']));
  const labelOf = (item) => {
    const data = kids(item, 'data').find((entry) => ['label', 'name', 'text', 'title'].includes(keys.get(entry.attrs.key)) && textOf(entry).trim() !== '');
    const yfiles = all(item, 'NodeLabel')[0] ?? all(item, 'EdgeLabel')[0];
    return data ? textOf(data) : yfiles ? textOf(yfiles) : '';
  };
  const model = newModel('graph');
  const defaultDirected = graph.attrs.edgedefault !== 'undirected';
  all(graph, 'node').forEach((node) => addNode(model, node.attrs.id, { label: cleanLabel(labelOf(node)) }));
  all(graph, 'edge').forEach((edge) =>
    addEdge(model, edge.attrs.source, edge.attrs.target, labelOf(edge), edge.attrs.directed ? edge.attrs.directed === 'true' : defaultDirected),
  );
  return model;
};
const gexf = (root) => {
  const graph = all(root, 'graph')[0];
  if (!graph) return null;
  const model = newModel('graph');
  all(graph, 'node').forEach((node) => addNode(model, node.attrs.id, { label: cleanLabel(node.attrs.label) }));
  all(graph, 'edge').forEach((edge) =>
    addEdge(model, edge.attrs.source, edge.attrs.target, edge.attrs.label, (edge.attrs.type ?? graph.attrs.defaultedgetype) === 'directed'),
  );
  return model;
};

// ---------- Visio (VDX and the pages of VSDX) ----------
const visioFile = (root) => {
  const model = newModel();
  const cellOf = (shape, name) => {
    const child = kid(shape, name) ?? kids(shape, 'Cell').find((cell) => cell.attrs.N === name);
    return number(child ? (child.attrs.V ?? child.text) : undefined);
  };
  const scope = all(root, 'Pages')[0] ?? root;
  const shapes = all(scope, 'Shape');
  const connectors = new Map();
  all(scope, 'Connect').forEach((link) => {
    const list = connectors.get(link.attrs.FromSheet) ?? {};
    if (/^Begin/.test(link.attrs.FromCell ?? '')) list.from = link.attrs.ToSheet;
    else list.to = link.attrs.ToSheet;
    connectors.set(link.attrs.FromSheet, list);
  });
  shapes.forEach((shape) => {
    const id = shape.attrs.ID;
    const label = cleanLabel(textOf(kid(shape, 'Text') ?? { text: '', children: [] }));
    const connector = connectors.get(id);
    if (connector) return addEdge(model, connector.from, connector.to, label);
    if (kid(shape, 'Shapes')) return undefined;
    const x = cellOf(shape, 'PinX');
    const y = cellOf(shape, 'PinY');
    return addNode(model, id, {
      label,
      kind: classify(`${shape.attrs.NameU ?? ''} ${shape.attrs.Name ?? ''}`),
      x: x === undefined ? undefined : x * 96,
      y: y === undefined ? undefined : -y * 96,
    });
  });
  return model;
};

// A .vsdx is a zip: the first page is read, stored or deflated. Returns its XML text.
export const vsdxToXml = async (bytes, inflate = inflateRaw) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error('not a zip');
  let at = view.getUint32(end + 16, true);
  const count = view.getUint16(end + 10, true);
  const entries = [];
  for (let n = 0; n < count && view.getUint32(at, true) === 0x02014b50; n += 1) {
    const nameLength = view.getUint16(at + 28, true);
    entries.push({
      method: view.getUint16(at + 10, true),
      size: view.getUint32(at + 20, true),
      offset: view.getUint32(at + 42, true),
      name: new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength)),
    });
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  const page = entries.find((entry) => /^visio\/pages\/page\d+\.xml$/.test(entry.name));
  if (!page) throw new Error('no page');
  const start = page.offset + 30 + view.getUint16(page.offset + 26, true) + view.getUint16(page.offset + 28, true);
  const data = bytes.subarray(start, start + page.size);
  return new TextDecoder().decode(page.method === 0 ? data : await inflate(data));
};

// ---------- DOT ----------
const DOT_TOKEN = /"((?:[^"\\]|\\.)*)"|(->|--)|([\w\u00C0-\u024F\u0400-\u04FF.]+)|([{}[\];,=:])/g;
const dotFile = (source) => {
  const text = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*#.*$/gm, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/<(<[\s\S]*?>)>/g, (_, html) => `"${html.replace(/<[^>]*>/g, '')}"`);
  const tokens = [...text.matchAll(DOT_TOKEN)].map((hit) => ({
    value: hit[1] !== undefined ? hit[1].replace(/\\(["\\])/g, '$1').replace(/\\n/g, ' ') : hit[0],
    word: hit[1] === undefined,
  }));
  let at = 0;
  const peek = () => tokens[at]?.word && tokens[at].value;
  const model = newModel('graph');
  const head = tokens.findIndex((token) => token.word && token.value === '{');
  const kind = tokens.slice(0, head).find((token) => token.word && /^(di)?graph$/i.test(token.value));
  if (head < 0 || !kind) return null;
  model.directed = /^digraph$/i.test(kind.value);
  const title = tokens
    .slice(0, head)
    .filter((token) => !/^(strict|(di)?graph)$/i.test(token.value))
    .map((token) => token.value)[0];
  model.title = cleanLabel(title ?? '');
  at = head + 1;
  const attrs = () => {
    const found = {};
    while (peek() === '[') {
      at += 1;
      while (at < tokens.length && peek() !== ']') {
        const key = tokens[at].value;
        if (peek() !== undefined && tokens[at + 1]?.value === '=' && tokens[at + 1].word) {
          found[key] = tokens[at + 2]?.value;
          at += 3;
        } else at += 1;
      }
      at += 1;
    }
    return found;
  };
  // A group of endpoints: a single id or a { a b } subgraph.
  const endpoint = () => {
    if (peek() === 'subgraph') at += tokens[at + 1]?.value === '{' ? 1 : 2;
    if (peek() === '{') {
      at += 1;
      const members = [];
      while (at < tokens.length && peek() !== '}') members.push(...statement());
      at += 1;
      return members;
    }
    const name = tokens[at].value;
    at += 1;
    if (peek() === ':') at += 2;
    addNode(model, name, { label: name });
    return [name];
  };
  function statement() {
    if (['graph', 'node', 'edge'].includes(String(peek()).toLowerCase()) && tokens[at + 1]?.value === '[') {
      at += 1;
      attrs();
      return [];
    }
    if (tokens[at + 1]?.value === '=' && tokens[at + 1].word) {
      if (tokens[at].value === 'label') model.title = model.title || cleanLabel(tokens[at + 2]?.value);
      at += 3;
      return [];
    }
    const groups = [endpoint()];
    const operators = [];
    while (peek() === '->' || peek() === '--') {
      operators.push(tokens[at].value);
      at += 1;
      groups.push(endpoint());
    }
    const props = attrs();
    if (groups.length === 1 && props.label !== undefined) addNode(model, groups[0][0], { label: props.label }).label = cleanLabel(props.label);
    groups
      .slice(0, -1)
      .forEach((from, index) => from.forEach((a) => groups[index + 1].forEach((b) => addEdge(model, a, b, props.label ?? '', operators[index] === '->'))));
    return groups.flat();
  }
  while (at < tokens.length && peek() !== '}') {
    if (peek() === ';' || peek() === ',') at += 1;
    else statement();
  }
  return model;
};

// ---------- CSV / TSV edge lists ----------
export const splitRow = (line, delimiter) => {
  const cells = [];
  let cell = '';
  let quoted_ = false;
  for (let at = 0; at < line.length; at += 1) {
    const char = line[at];
    if (char === '"' && quoted_ && line[at + 1] === '"') {
      cell += '"';
      at += 1;
    } else if (char === '"') quoted_ = !quoted_;
    else if (char === delimiter && !quoted_) {
      cells.push(cell.trim());
      cell = '';
    } else cell += char;
  }
  return [...cells, cell.trim()];
};
export const delimiterOf = (text, fileName = '') => {
  if (/\.tsv$/i.test(fileName)) return '\t';
  const head = text.split(/\r?\n/)[0];
  return ['\t', ';', ','].find((char) => head.includes(char)) ?? ',';
};
const csvFile = (text, fileName, lang) => {
  const delimiter = delimiterOf(text, fileName);
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => splitRow(line, delimiter));
  const names = rows[0]?.map((cell) => cell.toLowerCase()) ?? [];
  const find = (words) => names.findIndex((name) => words.includes(name));
  const from = find(['source', 'from', 'src', 'start', 'parent', 'откуда']);
  const to = find(['target', 'to', 'dst', 'end', 'child', 'куда']);
  const header = from >= 0 && to >= 0;
  const columns = header ? [from, to, find(['label', 'name', 'text', 'подпись'])] : [0, 1, 2];
  const model = newModel('graph');
  rows.slice(header ? 1 : 0).forEach((row) => {
    if (row.length < 2 || row[columns[0]] === '' || row[columns[1]] === undefined || row[columns[1]] === '') return;
    addNode(model, row[columns[0]], { label: cleanLabel(row[columns[0]]) });
    addNode(model, row[columns[1]], { label: cleanLabel(row[columns[1]]) });
    addEdge(model, row[columns[0]], row[columns[1]], columns[2] >= 0 ? (row[columns[2]] ?? '') : '');
  });
  model.warnings.push(say(lang, 'csv-directed'));
  return model;
};

// ---------- the front door ----------
const SNIFF = [
  ['drawio', /<(?:\w+:)?(mxfile|mxGraphModel)\b/],
  ['svg', /<svg\b/],
  ['bpmn', /<(?:\w+:)?definitions\b[^>]*(bpmn|BPMN)/],
  ['xmi', /<(?:\w+:)?XMI\b/],
  ['graphml', /<graphml\b/],
  ['gexf', /<gexf\b/],
  ['visio', /<(?:VisioDocument|PageContents)\b/],
  ['dot', /^\s*(?:strict\s+)?(?:di)?graph\b[^{\n]*\{/im],
];
const BY_EXTENSION = {
  drawio: 'drawio',
  dio: 'drawio',
  svg: 'svg',
  json: 'json',
  excalidraw: 'json',
  lucid: 'json',
  bpmn: 'bpmn',
  xmi: 'xmi',
  uml: 'xmi',
  graphml: 'graphml',
  gexf: 'gexf',
  vdx: 'visio',
  vsdx: 'visio',
  dot: 'dot',
  gv: 'dot',
  csv: 'csv',
  tsv: 'csv',
  mmd: 'code',
  mermaid: 'code',
  puml: 'code',
  plantuml: 'code',
  pu: 'code',
  wsd: 'code',
  dsl: 'code',
  txt: 'code',
  md: 'markdown',
};
export const FORMAT_LIST = ['draw.io', 'SVG', 'JSON', 'BPMN', 'XMI', 'GraphML', 'GEXF', 'Visio', 'DOT', 'CSV', 'Mermaid', 'PlantUML', 'DSLKit'];

const looksLikeTable = (text) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2 || lines.length > 100000) return false;
  const delimiter = ['\t', ';', ','].find((char) => lines[0].includes(char));
  if (!delimiter) return false;
  const count = lines[0].split(delimiter).length;
  return count <= 3 && lines.every((line) => line.length < 200 && line.split(delimiter).length === count);
};

// The format of a file from its content first, from its extension when the content does not tell:
// 'drawio', 'svg', 'json', 'bpmn', 'xmi', 'graphml', 'gexf', 'visio', 'dot', 'csv', 'markdown', 'code' (Mermaid, PlantUML, DSLKit, text) or 'unknown'.
export const sniffFormat = (text, fileName = '') => {
  const head = String(text).slice(0, 4096);
  if (/^```[ \t]*(mermaid|plantuml|puml|dot|graphviz)\b/im.test(String(text))) return 'markdown';
  const found = SNIFF.find(([, pattern]) => pattern.test(head));
  if (found) return found[0];
  const trimmed = head.trimStart();
  if (/^[{[]/.test(trimmed)) return 'json';
  if (/^\s*diagram\s|@startuml|^\s*(graph|flowchart|sequenceDiagram|stateDiagram|erDiagram|classDiagram)\b/im.test(head)) return 'code';
  const extension = /\.([^.]+)$/.exec(String(fileName).toLowerCase())?.[1];
  if (BY_EXTENSION[extension]) return BY_EXTENSION[extension];
  return looksLikeTable(String(text)) ? 'csv' : 'unknown';
};

const BUILDERS_XML = {
  bpmn: (root) => bpmnFile(root),
  graphml: (root) => graphml(root),
  gexf: (root) => gexf(root),
  visio: (root) => visioFile(root),
};

// The importer. `format` may be passed (from sniffFormat); `inflate` can be replaced (tests, other runtimes).
export const importDiagramFile = async (source, { fileName = '', lang = 'ru', format, inflate = inflateRaw } = {}) => {
  const text = String(source ?? '').replace(/^\uFEFF/, '');
  const kind = format ?? sniffFormat(text, fileName);
  try {
    let model = null;
    if (kind === 'json') model = jsonFile(JSON.parse(text));
    else if (kind === 'dot') model = dotFile(text);
    else if (kind === 'csv') model = csvFile(text, fileName, lang);
    else if (kind === 'drawio') model = await drawio(parseXml(text), { lang, inflate });
    else if (kind === 'svg') model = await svgFile(parseXml(text), { lang, inflate });
    else if (kind === 'xmi') {
      const direct = xmiFile(parseXml(text), lang);
      return direct ? { ok: true, ...direct } : { ok: false, reason: 'no-structure', warnings: [] };
    } else if (BUILDERS_XML[kind]) model = BUILDERS_XML[kind](parseXml(text));
    else return { ok: false, reason: 'unknown', warnings: [] };
    return model ? emitModel(model, lang) : { ok: false, reason: 'no-structure', warnings: [] };
  } catch (error) {
    return { ok: false, reason: error?.code === 'inflate-limit' ? 'too-large' : 'bad-file', warnings: [] };
  }
};
