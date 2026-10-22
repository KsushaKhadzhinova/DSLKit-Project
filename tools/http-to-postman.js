// Converts a VS Code REST Client file (requests.http) into a Postman collection (v2.1).
// Command line: node tools/make-postman.js part-2/lab-01-node-server "DSLKit lab 1"
// The .http file stays the single source: the collection is generated, not edited by hand.
const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';
const METHODS = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) (\S+)/;

const toUrl = (raw) => {
  const [path, query] = raw.split('?');
  const [host, ...segments] = path.replace(/^(\{\{\w+\}\}|https?:\/\/[^/]+)/, '$1\u0000').split('\u0000');
  const rest = segments.join('').split('/').filter(Boolean);
  return {
    raw,
    host: [host],
    path: rest,
    ...(query && { query: query.split('&').map((pair) => ({ key: pair.split('=')[0], value: pair.split('=').slice(1).join('=') })) }),
  };
};

// "@token = {{login.response.body.token}}" means: after the request named "login" store body.token in the variable "token".
export const parseHttp = (text) => {
  const variables = {};
  const captures = {};
  const requests = [];
  for (const block of text.replace(/\r\n/g, '\n').split(/^###/m)) {
    const lines = block.split('\n');
    const title = lines[0].trim();
    let name = null;
    const rest = [];
    for (const line of lines.slice(1)) {
      const named = /^#\s*@name\s+(\w+)/.exec(line);
      const variable = /^@(\w+)\s*=\s*(.*)$/.exec(line);
      if (named) name = named[1];
      else if (variable) {
        const captured = /^\{\{(\w+)\.response\.body\.(\w+)\}\}$/.exec(variable[2].trim());
        if (captured) captures[captured[1]] = { variable: variable[1], field: captured[2] };
        else variables[variable[1]] = variable[2].trim();
      } else rest.push(line);
    }
    rest.push('');
    const start = rest.findIndex((line) => METHODS.test(line));
    if (start < 0) continue;
    const [, method, url] = METHODS.exec(rest[start]);
    const headers = [];
    let i = start + 1;
    for (; rest[i].trim(); i += 1) {
      const [key, ...value] = rest[i].split(':');
      headers.push({ key: key.trim(), value: value.join(':').trim() });
    }
    const body = rest
      .slice(i + 1)
      .join('\n')
      .trim();
    requests.push({ title, name, method, url, headers, body });
  }
  return { variables, captures, requests };
};

const testScript = (request, captures) => {
  const lines = [];
  const status = /->\s*(\d{3})/.exec(request.title);
  if (status) lines.push(`pm.test('status is ${status[1]}', () => pm.response.to.have.status(${status[1]}));`);
  const capture = request.name && captures[request.name];
  if (capture) lines.push(`pm.collectionVariables.set('${capture.variable}', pm.response.json().${capture.field});`);
  return lines;
};

export const toPostman = (text, name) => {
  const { variables, captures, requests } = parseHttp(text);
  return {
    info: { name, description: 'Generated from requests.http by tools/make-postman.js. Start the server first.', schema: SCHEMA },
    variable: [
      ...Object.entries(variables).map(([key, value]) => ({ key, value })),
      ...Object.values(captures).map(({ variable }) => ({ key: variable, value: '' })),
    ],
    item: requests.map((request) => {
      const exec = testScript(request, captures);
      return {
        name: request.title,
        ...(exec.length && { event: [{ listen: 'test', script: { type: 'text/javascript', exec } }] }),
        request: {
          method: request.method,
          header: request.headers,
          ...(request.body && { body: { mode: 'raw', raw: request.body, options: { raw: { language: 'json' } } } }),
          url: toUrl(request.url),
        },
      };
    }),
  };
};
