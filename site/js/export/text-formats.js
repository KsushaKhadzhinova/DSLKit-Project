import { NOTATIONS, parseDiagram } from '../notations/index.js';
import { isColor, normalizeColor } from '../utils/color.js';

// The text formats the editor can export a diagram to. The converters are the generators that every notation already owns
// (the same ones that feed Kroki), put behind a gate: a diagram is exported only where the mapping loses nothing, never as a guess.
export const TEXT_FORMATS = {
  plantuml: { extension: 'puml', mime: 'text/plain;charset=utf-8' },
  mermaid: { extension: 'mmd', mime: 'text/plain;charset=utf-8' },
};

// Notations with a faithful mapping to both languages: flowchart and activity style (GOST, UML activity, BPMN, IDEF3, DFD),
// sequence, class, entity-relationship (ERD, which has no categories) and state machines. IDEF1X is left out: its dependent entities and categories have no counterpart. Everything else is refused with a reason.
export const SUPPORTED_NOTATIONS = ['gost', 'uml-activity', 'bpmn', 'idef3', 'dfd', 'uml-sequence', 'uml-class', 'erd', 'uml-state'];

// What the importer of the editor reads back from the produced text (the round trip). Mermaid flowcharts, sequence and state diagrams
// come back; PlantUML sequence and state diagrams come back; class and ER diagrams and the node-link PlantUML of flowcharts are export only.
export const ROUND_TRIP = {
  mermaid: ['gost', 'uml-activity', 'bpmn', 'idef3', 'dfd', 'uml-sequence', 'uml-state'],
  plantuml: ['uml-sequence', 'uml-state'],
};

// A refusal always carries a reason code; the page turns it into a sentence in its language.
const refuse = (reason, extra = {}) => ({ ok: false, reason, ...extra });

// The text of a diagram in a format, or a refusal: 'format', 'empty', 'errors', 'notation' (no faithful mapping).
export const exportText = (source, format) => {
  if (!Object.hasOwn(TEXT_FORMATS, format)) return refuse('format');
  const model = parseDiagram(source);
  if (model.empty || !model.notation) return refuse('empty');
  if (!SUPPORTED_NOTATIONS.includes(model.notation)) return refuse('notation', { notation: model.notation });
  if (model.problems.some((item) => item.severity === 'error')) return refuse('errors', { notation: model.notation });
  const text = NOTATIONS[model.notation].generators[format](model);
  const colored = model.nodes?.filter((node) => isColor(node.attrs?.color)) ?? [];
  const colorIgnored = colored.some((node) => !text.includes(normalizeColor(node.attrs.color)));
  return { ok: true, colorIgnored, text: `${text}\n`, notation: model.notation, extension: TEXT_FORMATS[format].extension, mime: TEXT_FORMATS[format].mime };
};
