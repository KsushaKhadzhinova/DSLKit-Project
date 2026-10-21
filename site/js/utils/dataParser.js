const PORTS = ['input', 'control', 'output', 'mechanism'];
const BOX_PATTERN = /^box\s+(\S+)\s+"([^"]*)"(?:\s*\{)?\s*$/;
const PORT_PATTERN = /^(input|control|output|mechanism)\s*:\s*(.+)$/;
const ARROW_PATTERN = /^arrow\s+(\S+?)(?:\.(\w+))?\s*->\s*(\S+?)(?:\.(\w+))?$/;
const DIAGRAM_PATTERN = /^diagram\s+(\S+)(?:\s+"([^"]*)")?$/;

// Reads the DSL shown in the editor. Lines it does not understand are reported instead of stopping the run.
export const parseDsl = (source) => {
  const model = { type: 'diagram', title: '', boxes: [], arrows: [], skipped: [], boxLines: [], arrowLines: [] };
  let box = null;
  String(source)
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = raw.trim();
      if (line === '') return;
      let match;
      if ((match = DIAGRAM_PATTERN.exec(line))) {
        model.type = match[1];
        model.title = match[2] ?? '';
      } else if ((match = BOX_PATTERN.exec(line))) {
        box = { id: match[1], name: match[2], ports: Object.fromEntries(PORTS.map((port) => [port, []])) };
        model.boxes.push(box);
        model.boxLines.push(index + 1);
      } else if ((match = PORT_PATTERN.exec(line)) && box) {
        box.ports[match[1]].push(match[2].trim());
      } else if ((match = ARROW_PATTERN.exec(line))) {
        model.arrows.push({ from: match[1], fromPort: match[2] ?? '', to: match[3], toPort: match[4] ?? '' });
        model.arrowLines.push(index + 1);
      } else if (line !== '}') {
        model.skipped.push(index + 1);
      }
    });
  return model;
};

const quote = (text) => `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;

const portLabel = (port, side) => (port ? `${side}: ${port}` : '');

// Turns the parsed model into Graphviz DOT, the format the Kroki endpoint accepts.
export const toDot = (model) => {
  const lines = [
    'digraph diagram {',
    '  rankdir=LR;',
    '  node [shape=box, style=rounded, fontname="Helvetica"];',
    '  edge [fontname="Helvetica", fontsize=10];',
  ];
  if (model.title) lines.push(`  label=${quote(model.title)};`, '  labelloc=t;');
  model.boxes.forEach((box) => {
    const details = PORTS.filter((port) => box.ports[port].length > 0).map((port) => `${port}: ${box.ports[port].join(', ')}`);
    lines.push(`  ${quote(box.id)} [label=${quote([`${box.id} ${box.name}`, ...details].join('\n'))}];`);
  });
  model.arrows.forEach((arrow) => {
    const label = [portLabel(arrow.fromPort, 'from'), portLabel(arrow.toPort, 'to')].filter(Boolean).join(' ');
    lines.push(`  ${quote(arrow.from)} -> ${quote(arrow.to)}${label ? ` [label=${quote(label)}]` : ''};`);
  });
  lines.push('}');
  return lines.join('\n');
};

const detailLines = (box) => PORTS.filter((port) => box.ports[port].length > 0).map((port) => `${port}: ${box.ports[port].join(', ')}`);

const edgeLabel = (arrow) => [portLabel(arrow.fromPort, 'from'), portLabel(arrow.toPort, 'to')].filter(Boolean).join(' ');

// Arrows that point at boxes missing from the model are left out of formats that need every node declared.
const knownArrows = (model) => model.arrows.filter(({ from, to }) => model.boxes.some((box) => box.id === from) && model.boxes.some((box) => box.id === to));

// Mermaid flowchart text for the Kroki mermaid endpoint. Node names are numbered because Mermaid ids cannot hold arbitrary characters.
export const toMermaid = (model) => {
  const name = (id) => `n${model.boxes.findIndex((box) => box.id === id)}`;
  const text = (value) => String(value).replace(/"/g, '#quot;');
  const lines = ['flowchart LR'];
  model.boxes.forEach((box, index) => lines.push(`  n${index}["${[text(`${box.id} ${box.name}`), ...detailLines(box).map(text)].join('<br/>')}"]`));
  knownArrows(model).forEach((arrow) => {
    const label = edgeLabel(arrow);
    lines.push(`  ${name(arrow.from)} -->${label ? `|"${text(label)}"|` : ''} ${name(arrow.to)}`);
  });
  return lines.join('\n');
};

// PlantUML text for the Kroki plantuml endpoint.
export const toPlantUml = (model) => {
  const name = (id) => `n${model.boxes.findIndex((box) => box.id === id)}`;
  const text = (value) => String(value).replace(/"/g, "'").replace(/\r?\n/g, ' ');
  const lines = ['@startuml', 'left to right direction'];
  if (model.title) lines.push(`title ${text(model.title)}`);
  model.boxes.forEach((box, index) => lines.push(`rectangle "${[text(`${box.id} ${box.name}`), ...detailLines(box).map(text)].join('\\n')}" as n${index}`));
  knownArrows(model).forEach((arrow) => {
    const label = edgeLabel(arrow);
    lines.push(`${name(arrow.from)} --> ${name(arrow.to)}${label ? ` : ${text(label)}` : ''}`);
  });
  lines.push('@enduml');
  return lines.join('\n');
};

// A stable key for the cache: two independent 32-bit hashes make an accidental collision very unlikely.
export const sourceKey = (source) => {
  let first = 5381;
  let second = 2166136261;
  for (const char of String(source)) {
    const code = char.codePointAt(0);
    first = ((first * 33) ^ code) >>> 0;
    second = Math.imul(second ^ code, 16777619) >>> 0;
  }
  return `dot-${first.toString(16)}${second.toString(16)}`;
};

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const BLOCKED_TAGS = [
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'style',
  'use',
  'image',
  'feImage',
  'set',
  'animate',
  'animateTransform',
  'animateMotion',
];
const SAFE_LINK = /^(?:#|https?:\/\/)/i;

// The SVG comes from another server, so scripts, animations, external loads, event handlers and unsafe links are removed before it enters the page.
export const sanitizeSvg = (svgText, parser) => {
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.localName !== 'svg' || doc.querySelector('parsererror')) return null;
  BLOCKED_TAGS.forEach((tag) => svg.querySelectorAll(tag).forEach((node) => node.remove()));
  // Elements from other namespaces (for example XHTML meta, base or form) have no place in a drawing.
  [...svg.querySelectorAll('*')].filter((node) => node.namespaceURI !== SVG_NAMESPACE).forEach((node) => node.remove());
  [svg, ...svg.querySelectorAll('*')].forEach((node) => {
    [...node.attributes].forEach(({ name, value }) => {
      // Control characters inside a scheme are ignored by browsers, so they are removed before the link is judged.
      const link = value.replace(new RegExp('[\u0000-\u0020\u007f-\u009f]', 'g'), '');
      const unsafeLink = /(?:^|:)href$/i.test(name) && !SAFE_LINK.test(link);
      // CSS escapes hide a function name from a text check, so a style that contains a backslash is dropped as well.
      const unsafeStyle = name === 'style' && (/url\(|expression\(|javascript:/i.test(value) || value.includes(String.fromCharCode(92)));
      if (/^on/i.test(name) || unsafeLink || unsafeStyle) node.removeAttribute(name);
    });
  });
  return svg;
};
