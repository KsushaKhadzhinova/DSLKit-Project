export const build = (template, read) =>
  template.replace(/\{\{(code|include):([^}]+)\}\}/g, (_, kind, path) =>
    kind === 'include' ? read(path).trimEnd() : `\`\`\`${path.split('.').pop()}\n${read(path).trimEnd()}\n\`\`\``);
