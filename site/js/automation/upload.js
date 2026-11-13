// The files of the wizard "Automatic build": what a file is (from its content first, from its name second) and how it becomes DSLKit code.
// Structured formats go through the key-free importer, Mermaid and PlantUML through the existing import, pictures and PDF only through the AI of the server.
import { buildFromCode, check } from './build.js';
import { MAX_FILE_BYTES, importDiagramFile, sniffFormat } from '../utils/diagram-file-import.js';

export { MAX_FILE_BYTES };
export const PICTURE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf' };
const TEXT_EXTENSIONS = [
  'drawio',
  'dio',
  'svg',
  'json',
  'excalidraw',
  'lucid',
  'bpmn',
  'xmi',
  'uml',
  'graphml',
  'gexf',
  'vdx',
  'xml',
  'dot',
  'gv',
  'csv',
  'tsv',
  'mmd',
  'mermaid',
  'puml',
  'plantuml',
  'pu',
  'wsd',
  'dsl',
  'md',
  'txt',
];
export const ACCEPT = [...TEXT_EXTENSIONS, 'vsdx', ...Object.keys(PICTURE_TYPES), 'bmp'].map((extension) => `.${extension}`).join(',');

const extensionOf = (name) => /\.([^.]+)$/.exec(String(name).toLowerCase())?.[1] ?? '';

// 'picture' (the AI), 'bmp' (a picture the AI cannot read), 'zip' (vsdx), 'text' (a known text format) or 'unknown'.
export const uploadKind = ({ name = '', type = '' }) => {
  const extension = extensionOf(name);
  if (Object.values(PICTURE_TYPES).includes(type) || PICTURE_TYPES[extension]) return 'picture';
  if (type === 'image/bmp' || extension === 'bmp') return 'bmp';
  if (extension === 'vsdx') return 'zip';
  return TEXT_EXTENSIONS.includes(extension) ? 'text' : 'unknown';
};
export const pictureType = ({ name = '', type = '' }) => (Object.values(PICTURE_TYPES).includes(type) ? type : (PICTURE_TYPES[extensionOf(name)] ?? null));

const MERMAID_BLOCK = /```[ \t]*(mermaid|plantuml|puml|dot|graphviz)[^\n]*\r?\n([\s\S]*?)```/i;
const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });

// A text of a file becomes { ok: true, source: 'import', format, dsl, notation, problems, valid } or { ok: false, reason }.
// Reasons: empty, too-long, unknown, unsupported (the existing import), too-big, no-structure, bad-file.
export const importUpload = async (source, { fileName = '', lang = 'ru' } = {}) => {
  const text = String(source ?? '').replace(/^﻿/, '');
  if (text.length > MAX_FILE_BYTES) return failure('too-big');
  if (text.trim() === '') return failure('empty');
  let format = sniffFormat(text, fileName);
  let body = text;
  if (format === 'markdown') {
    const block = MERMAID_BLOCK.exec(text);
    if (!block) return failure('unknown');
    body = block[2];
    format = /^(dot|graphviz)$/i.test(block[1]) ? 'dot' : 'code';
  }
  if (format === 'code' || format === 'unknown') return buildFromCode(body, { fileName, lang });
  const result = await importDiagramFile(body, { format, fileName, lang });
  if (!result.ok) return failure(result.reason, { format });
  const checked = check(result.code, lang);
  const notes = result.warnings.map((message) => ({ line: '•', severity: 'warning', code: 'import', message }));
  return { ok: true, source: 'import', format, kind: format, skipped: [], dsl: result.code, ...checked, problems: [...notes, ...checked.problems] };
};
