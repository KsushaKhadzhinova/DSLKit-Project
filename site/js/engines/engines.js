import { generate } from '../notations/index.js';
import { renderLocal } from './local-engine.js';

// Mermaid draws labels as HTML inside foreignObject by default, which the page never accepts from another server.
// This directive asks for plain SVG text, so the labels survive the cleaning of the drawing.
export const MERMAID_INIT = '%%{init: {"htmlLabels": false, "flowchart": {"htmlLabels": false}, "class": {"htmlLabels": false}}}%%';

// `type` is the Kroki endpoint; an engine without it draws in the browser and returns the SVG itself.
export const ENGINES = [
  { id: 'graphviz', label: 'Kroki · Graphviz', type: 'graphviz', action: 'Нарисовать через Kroki', build: (model) => generate(model, 'graphviz') },
  {
    id: 'mermaid',
    label: 'Kroki · Mermaid',
    type: 'mermaid',
    action: 'Нарисовать через Kroki',
    build: (model) => [MERMAID_INIT, generate(model, 'mermaid')].join('\n'),
  },
  { id: 'plantuml', label: 'Kroki · PlantUML', type: 'plantuml', action: 'Нарисовать через Kroki', build: (model) => generate(model, 'plantuml') },
  { id: 'local', label: 'Собственный движок (в браузере)', type: null, action: 'Нарисовать в браузере', build: renderLocal },
];

// The default is the engine of the browser: it needs no network, the Kroki engines stay as a choice on the settings page.
export const DEFAULT_ENGINE_ID = 'local';
export const findEngine = (id) => ENGINES.find((engine) => engine.id === id) ?? ENGINES.find((engine) => engine.id === DEFAULT_ENGINE_ID);

// An engine that speaks the given Kroki format, used when the chosen one cannot draw a notation.
export const engineForFormat = (format) => ENGINES.find((engine) => engine.type === format);
