import { pickQuestions } from './variant.js';

const answers = (block, variant) => {
  const items = block.split(/\n(?=\d+\. )/);
  const keep = new Set(pickQuestions(variant, items.length));
  return items.filter((item) => keep.has(Number(/^(\d+)\./.exec(item)[1]))).join('\n');
};

// The title page data of one report (student, group, repository, branch) lives in report.meta.json next to the template.
// A folder without the file simply has no data: a template that asks for a key then fails loudly in build().
export const metaOf = (dir, read) => {
  try {
    return JSON.parse(read(`${dir}/report.meta.json`));
  } catch {
    return {};
  }
};

// {{code:path}} puts a whole file into a fenced block, {{code:path#12-40}} only its lines 12 to 40;
// {{include:path}} copies a file as it is; {{meta:key}} takes a value from report.meta.json.
export const build = (template, read, variant, meta = {}) =>
  template
    .replace(/\r\n/g, '\n')
    .replace(/\{\{answers\}\}\n([\s\S]*?)\n\{\{\/answers\}\}/g, (_, block) => answers(block, variant))
    .replace(/\{\{meta:(\w+)\}\}/g, (_, key) => {
      if (typeof meta[key] !== 'string' || !meta[key]) throw new Error(`report.meta.json has no value for "${key}"`);
      return meta[key];
    })
    .replace(/\{\{(code|include):([^}#]+)(?:#(\d+)-(\d+))?\}\}/g, (_, kind, path, from, to) => {
      const text = read(path).replace(/\r\n/g, '\n').trimEnd();
      const part = from
        ? text
            .split('\n')
            .slice(Number(from) - 1, Number(to))
            .join('\n')
        : text;
      return kind === 'include' ? part : `\`\`\`${path.split('.').pop()}\n${part}\n\`\`\``;
    });
