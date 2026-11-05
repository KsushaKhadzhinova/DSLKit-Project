// A small, safe Markdown reader for the documentation: it builds DOM nodes with textContent, never innerHTML, so a text cannot bring markup in.
// Supported: ## and ### headings, paragraphs, - and 1. lists, ``` code blocks, **bold**, `code` and [text](address) links to this site or to https.
const SAFE_LINK = /^(?:https:\/\/|\.{1,2}\/|[\w-]+\.html)/;

const inline = (root, parent, text) => {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  text.split(pattern).forEach((part) => {
    if (part === '') return;
    let node;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      node = root.createElement('strong');
      node.textContent = part.slice(2, -2);
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      node = root.createElement('code');
      node.textContent = part.slice(1, -1);
    } else if (/^\[[^\]]+\]\([^)\s]+\)$/.test(part)) {
      const [, label, address] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      if (SAFE_LINK.test(address)) {
        node = root.createElement('a');
        node.href = address;
        node.textContent = label;
        if (address.startsWith('https://')) node.rel = 'noopener noreferrer';
      } else node = root.createTextNode(label);
    } else node = root.createTextNode(part);
    parent.append(node);
  });
};

// Returns a DocumentFragment for the text.
export const renderMarkdown = (root, source) => {
  const fragment = root.createDocumentFragment();
  const lines = String(source ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  let paragraph = [];
  let list = null;
  const flush = () => {
    if (paragraph.length > 0) {
      const node = root.createElement('p');
      inline(root, node, paragraph.join(' '));
      fragment.append(node);
      paragraph = [];
    }
    list = null;
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    let match;
    if (line.trim().startsWith('```')) {
      flush();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      const pre = root.createElement('pre');
      const inner = root.createElement('code');
      inner.textContent = code.join('\n');
      pre.append(inner);
      fragment.append(pre);
    } else if ((match = /^(#{2,3})\s+(.+)$/.exec(line))) {
      flush();
      const node = root.createElement(`h${match[1].length + 1}`);
      inline(root, node, match[2]);
      fragment.append(node);
    } else if ((match = /^(?:(-)|\d+\.)\s+(.+)$/.exec(line))) {
      const tag = match[1] ? 'ul' : 'ol';
      if (list?.tag !== tag) {
        flush();
        list = { tag, node: root.createElement(tag) };
        fragment.append(list.node);
      }
      const item = root.createElement('li');
      inline(root, item, match[2]);
      list.node.append(item);
    } else if (line.trim() === '') flush();
    else {
      if (list) list = null;
      paragraph.push(line.trim());
    }
  }
  flush();
  return fragment;
};
