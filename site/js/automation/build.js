// The wizard "Automatic build": a description (by rules), a code in another language (Mermaid, PlantUML, DSLKit) or, on the server with a key, an AI answer
// becomes DSLKit code. Every result is checked by parseDiagram and the problems are returned with it.
import { formatProblem, parseDiagram } from '../notations/index.js';
import { importDiagram } from '../utils/import-diagram.js';
import { createFacts } from '../expert/engine.js';
import { factsFromDescription, rankNotations } from '../expert/review.js';
import { BUILDABLE, BUILDERS } from './builders.js';
import { detectLang, isStore, parseDescription } from './describe.js';

// Checks a code and tells its notation, the problems with ready messages, and whether it is free of errors.
export const check = (code, lang = 'ru') => {
  const model = parseDiagram(code);
  const problems = model.problems.map((item) => ({ line: item.line, severity: item.severity, code: item.code, message: formatProblem(item, lang) }));
  return { notation: model.notation ?? null, problems, valid: !problems.some((item) => item.severity === 'error') };
};

const ALGORITHM = /алгоритм|ввод|вывод|цикл|пока |input|output|loop|while |algorithm/i;
const DATAFLOW = /поток данных|data flow|хранилищ|storage|database|базе данных|базу данных/i;

// The notation for a description: the facts of its words and of its structure go through the expert system of "which notation".
// Only the notations the builders can write are offered. The answer: { key, ranking, trace }.
export const detectNotation = (text, parsed, rules) => {
  const facts = factsFromDescription(text);
  const strong = (cf) => ({ value: true, cf });
  const messageNames = parsed.messages.flatMap((message) => [message.from, message.to]);
  const hasStore = messageNames.some((name) => isStore(name));
  if (parsed.data.strong > 0) {
    facts['task:data'] = strong(0.9);
    facts.database = { value: true, cf: 1 };
  }
  const talk = parsed.messages.length >= 2 && !parsed.ordered && parsed.data.strong === 0;
  if (talk) facts['task:interaction'] = strong(0.8);
  if (DATAFLOW.test(text) || hasStore) {
    facts['task:data'] = strong(0.8);
    facts.dataflow = { value: true, cf: 1 };
  }
  if (parsed.steps.length >= 2 && parsed.data.strong === 0 && !talk) facts['task:process'] = strong(0.8);
  if (ALGORITHM.test(text)) facts.algorithm = { value: true, cf: 1 };
  const { ranking, trace } = rankNotations(createFacts(facts), rules);
  const best = ranking.find((item) => BUILDABLE.includes(item.key));
  return { key: best?.key ?? null, ranking, trace };
};

const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });

// A description becomes code by the rules. `notation` is a key of BUILDABLE or 'auto'.
export const buildFromDescription = (text, { notation = 'auto', lang, rules } = {}) => {
  const source = String(text ?? '').trim();
  if (source === '') return failure('empty');
  const language = lang ?? detectLang(source);
  const parsed = parseDescription(source, language);
  const detection = notation === 'auto' ? detectNotation(source, parsed, rules) : { key: notation, ranking: [], trace: [] };
  if (detection.key === null || !BUILDABLE.includes(detection.key)) return failure('unknown-notation', { ranking: detection.ranking });
  const dsl = BUILDERS[detection.key](parsed);
  if (dsl === null) return failure('nothing-found', { notation: detection.key, ranking: detection.ranking });
  return { ok: true, source: 'rules', notation: detection.key, dsl, ranking: detection.ranking, trace: detection.trace, ...check(dsl, language) };
};

const FORMATS = [
  [/^\s*diagram\s/m, 'dsl'],
  [/@startuml/i, 'plantuml'],
  [/^\s*(graph|flowchart|sequenceDiagram|stateDiagram|erDiagram|classDiagram)\b/m, 'mermaid'],
  [/^\s*(strict\s+)?(di)?graph\s+\S*\s*\{/m, 'dot'],
];
export const FILE_EXTENSIONS = ['.dsl', '.mmd', '.mermaid', '.puml', '.plantuml', '.pu', '.md', '.txt'];
const BY_EXTENSION = { '.dsl': 'dsl', '.mmd': 'mermaid', '.mermaid': 'mermaid', '.puml': 'plantuml', '.plantuml': 'plantuml', '.pu': 'plantuml' };

// The format of a text: from the content, or from the name of the file when the content does not tell.
export const detectFormat = (text, fileName = '') => {
  const found = FORMATS.find(([re]) => re.test(text));
  if (found) return found[1];
  const extension = /\.[^.]+$/.exec(fileName.toLowerCase())?.[0];
  return BY_EXTENSION[extension] ?? 'text';
};

// Code in another language becomes DSLKit code by the importer. Text that is not a diagram language gets the reason "text": it is a description.
export const buildFromCode = (source, { fileName = '', lang = 'ru' } = {}) => {
  const format = detectFormat(String(source ?? ''), fileName);
  const result = importDiagram(source);
  if (!result.ok) return failure(result.reason, { format, name: result.name });
  return { ok: true, source: 'import', format, kind: result.kind, skipped: result.skipped, dsl: result.dsl, ...check(result.dsl, lang) };
};
