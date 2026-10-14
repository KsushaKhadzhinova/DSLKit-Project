import { toDot, toMermaid, toPlantUml } from '../utils/dataParser.js';
import { renderLocal } from './local-engine.js';

// `type` is the Kroki endpoint; an engine without it draws in the browser and returns the SVG itself.
export const ENGINES = [
  { id: 'graphviz', label: 'Kroki · Graphviz', type: 'graphviz', build: toDot },
  { id: 'mermaid', label: 'Kroki · Mermaid', type: 'mermaid', build: toMermaid },
  { id: 'plantuml', label: 'Kroki · PlantUML', type: 'plantuml', build: toPlantUml },
  { id: 'local', label: 'Собственный движок (в браузере)', type: null, build: renderLocal },
];

export const findEngine = (id) => ENGINES.find((engine) => engine.id === id) ?? ENGINES[0];
