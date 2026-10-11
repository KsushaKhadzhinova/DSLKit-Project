import { pickQuestions } from './variant.js';

const answers = (block, variant) => {
  const items = block.split(/\n(?=\d+\. )/);
  const keep = new Set(pickQuestions(variant, items.length));
  return items.filter((item) => keep.has(Number(/^(\d+)\./.exec(item)[1]))).join('\n');
};

export const build = (template, read, variant) =>
  template
    .replace(/\r\n/g, '\n')
    .replace(/\{\{answers\}\}\n([\s\S]*?)\n\{\{\/answers\}\}/g, (_, block) => answers(block, variant))
    .replace(/\{\{(code|include):([^}]+)\}\}/g, (_, kind, path) =>
      kind === 'include' ? read(path).trimEnd() : `\`\`\`${path.split('.').pop()}\n${read(path).trimEnd()}\n\`\`\``,
    );
