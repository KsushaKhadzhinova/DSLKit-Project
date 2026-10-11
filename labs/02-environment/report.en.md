# Laboratory Work 2. Setting Up the Web Development Environment

## 1 Purpose of the Work

Gain practical skills in setting up a modern web development environment: master version control, create and configure a project, and study the features of the integrated development environment and design tools on the example of the DSLKit project related to the future course project.

## 2 Brief Theoretical Background

**Web development process.** The life cycle covers requirements analysis, design, implementation, testing, deployment and maintenance. A working environment shortens the path from an idea to a verifiable result.

**Version control.** Git stores the project history as commits, supports branches and synchronises with a remote GitHub repository. Main commands: `git init`, `git add`, `git commit`, `git push`.

**Node.js and npm.** Node.js runs JavaScript outside the browser. The npm package manager installs dependencies from `package.json`: regular ones (`dependencies`) and those needed only for development (`devDependencies`).

**Code editor.** Visual Studio Code combines an editor, a terminal, a debugger and the Source Control panel. Extensions add formatting, a live server and Git tools.

**Figma.** A cloud interface editor where moodboards, palettes, typography and page prototypes are created before layout work.

## 3 Progress of the Work

### 3.1 Project Topic Selection

The project topic is DSLKit, a web IDE for diagrams as code. The project and repository name `DSLKit-Project` extends easily into a course project: the site lives in the `site` folder, laboratory works in `labs` and helper tools in `tools`.

### 3.2 Software Installation and Verification

The installation is verified by the `npm run check:env` script from appendix B. It runs `node --version`, `npm --version`, `git --version`, reads the Git settings and checks the project files. The results are given in the table below, and for every failed check the script prints the cause and the way to fix it.

Table 1 – Environment check results

| Check | Status | Details |
|---|---|---|
| Node.js LTS | passed | v24.13.1 |
| npm package manager | passed | 11.8.0 |
| Git | passed | git version 2.55.0.windows.3 |
| Git user name | passed | KsushaKhadzhinova |
| Git email | passed | 73707328+KsushaKhadzhinova@users.noreply.github.com |
| Project structure | passed | — |
| The .gitignore file | passed | — |
| Prettier settings | passed | {"semi":true,"singleQuote":true,"printWidth":160} |
| lodash and nodemon packages | passed | lodash ^4.18.1, nodemon ^3.1.14 |
| Format on save | passed | — |
| VS Code extensions | passed | — |
| README.md file | passed | — |
| Figma design link | passed | — |
| Remote repository | passed | https://github.com/KsushaKhadzhinova/DSLKit-Project.git |
| Commit history | passed | 5 |

All checks passed.

### 3.3 Visual Studio Code Setup

The required extensions are installed: Live Server, Auto Rename Tag, Prettier, GitLens, ES6 String HTML and Figma to Code. The recommended extensions are listed in `.vscode/extensions.json`, so the editor offers to install them when the project is opened on another computer. The `.vscode/settings.json` file enables formatting on save (`editor.formatOnSave`) and makes Prettier the default formatter.

### 3.4 Project Structure and Base Files

The structure `site/css`, `site/js`, `site/assets`, `site/images`, `site/design` was created. Base files: `site/index.html` with HTML5 markup, `site/css/style.css` with base styles and `site/js/script.js` with a simple script. Empty folders are pinned by `.gitkeep` files because Git does not store empty directories.

### 3.5 Version Control Work

The repository was created with `git init` and linked to GitHub with `git remote add origin`. The `.gitignore` file excludes `node_modules/`, `.DS_Store`, `*.log`, `coverage/` and `.env`. Changes are recorded as separate commits by stage: project structure, base files, tool setup. Each laboratory work gets its own branch and a finished work is merged into `main`. The `.gitattributes` file sets the same line endings for Windows and Linux.

### 3.6 Development Tool Integration

The project was initialised with `npm init`. The `lodash` dependency and the development tools `nodemon`, `prettier` and `jsdom` are installed. The `npm run dev` command starts the static server from `tools/server.js` under nodemon: when files in the `site` folder change, the server restarts. The server handles errors: it answers 403 for addresses outside the project, 404 for unknown files, 400 for malformed addresses, 405 for unsupported methods and 500 when reading a file fails. The `.prettierrc` file holds `semi: true` and `singleQuote: true`, and `npm run format` brings all code to one style.

### 3.7 Design in Figma

The designs are prepared as SVG files in `site/design/figma` that can be dragged onto a Figma canvas. The generator `labs/02-environment/figma-assets.js` builds them from the same design tokens. The colour palette of the light and dark themes with contrast ratios is shown in Figure 1.

![Colour palette of the light and dark themes](../../site/design/figma/palette.svg)

Figure 1 – DSLKit colour palette for the light and dark themes

The chosen fonts and sizes are shown in Figure 2: Inter for the interface and JetBrains Mono for code.

![Project typography](../../site/design/figma/typography.svg)

Figure 2 – Project typography: fonts, sizes and line heights

The general visual language is shown in Figure 3: minimalism, whitespace, the golden ratio and thin lines.

![Project moodboard](../../site/design/figma/moodboard.svg)

Figure 3 – DSLKit moodboard

The desktop prototype of the home page is shown in Figure 4.

![Desktop prototype of the home page](../../site/design/figma/home-desktop.svg)

Figure 4 – DSLKit home page prototype for a 1440 pixel wide screen

The mobile prototype is shown in Figure 5: the navigation is replaced with a menu button and the cards are in one column.

![Mobile prototype of the home page](../../site/design/figma/home-mobile.svg)

Figure 5 – DSLKit home page prototype for a 390 pixel wide screen

The Figma file link is stored in `site/design/figma-link.txt`.

### 3.8 Project Documentation

The `README.md` file in the repository root contains the project description, the list of technologies, links to the repository and the Figma design, run commands and the folder structure.

## 4 Answers to Control Questions

1. **Advantages of VS Code and useful extensions.** The editor combines syntax highlighting, a terminal, debugging and Git in one window, and extensions automate routine work. The most useful ones turned out to be Prettier (one style on save), Live Server (quick page checks) and GitLens (line history).
2. **Git integration in VS Code.** The Source Control panel shows changed files, stages them, takes a message and creates a commit. The same steps are done by `git add`, `git commit` and `git push` in the terminal. Branches are switched in the status bar.
3. **Role of Node.js and npm.** Node.js runs build tools, tests and servers, and npm installs dependencies and pins their versions in `package.json`, so the project builds the same way on any computer.
4. **Figma in the development process.** In Figma the palette, fonts and grid are agreed before layout, and sizes and spacing are handed to the developer. Components, styles and the element properties view are the most useful.
5. **Important VS Code settings.** Format on save, the default formatter, one line ending, the Live Server root folder and the list of recommended extensions in `.vscode`.
6. **Why .gitignore is needed.** The file excludes service and generated data from the repository. An example for a web project: `node_modules/`, `.DS_Store`, `*.log`, `coverage/`, `.env`.
7. **Which data to choose for later growth into a course project.** A project and repository name not tied to a work number (`DSLKit-Project`), separate `site`, `labs` and `tools` folders, and file and branch names that follow one convention.
8. **Commands for sending changes.** `git add` stages files, `git commit` creates a commit with a message and `git push` sends the commits to the remote repository.
9. **Checking the Git settings.** `git config user.name` and `git config user.email` print the values. They can be changed with `git config --global user.name "Name"`. The `npm run check:env` script checks both values.
10. **Which files are not added to Git.** Dependencies (`node_modules`), build and coverage output, logs, environment files with secrets (`.env`) and system files. They can be restored with commands or hold confidential data, and without them the repository stays small.

## Conclusion

The web development environment is set up: Node.js, npm, Git and VS Code with extensions are installed and verified, the DSLKit project structure is created, Git and GitHub are connected, and Prettier, nodemon and a static server with error handling are configured. The Figma designs are ready: palette, typography, moodboard and a home page prototype for several screen widths. A correct environment makes the project reproducible on any computer and is the basis for the next works and the course project.

## Appendix A – Listing of check-env.js

```js
import { HELP, WORDS } from './help.js';

export const DIRS = ['css', 'js', 'assets', 'images', 'design'];
export const FILES = ['index.html', 'css/style.css', 'js/script.js', 'design/figma-link.txt'];
export const IGNORE = ['node_modules/', '.DS_Store', '*.log'];
export const EXTENSIONS = [
  'ritwickdey.liveserver',
  'formulahendry.auto-rename-tag',
  'esbenp.prettier-vscode',
  'eamodio.gitlens',
  'tobermory.es6-string-html',
  'figma-to-code.figma-to-code-sync',
];
const MIN_NODE = 20;

const attempt = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const checkEnv = ({ run, exists, read }, site = 'site') => {
  const at = (p) => `${site}/${p}`;
  const json = (p) => attempt(() => JSON.parse(read(p)), {});
  const lines = (p) =>
    attempt(
      () =>
        read(p)
          .split(/\r?\n/)
          .map((l) => l.trim()),
      [],
    );
  const out = (cmd, args) => attempt(() => run(cmd, args).trim(), '');
  const result = (id, pass, detail = '') => ({ id, pass: Boolean(pass), detail });
  const node = out('node', ['--version']);
  const missing = [...DIRS, ...FILES].filter((p) => !exists(at(p)));
  const ignored = lines('.gitignore');
  const prettier = json('.prettierrc');
  const pkg = json('package.json');
  const recommended = json('.vscode/extensions.json').recommendations ?? [];
  const readme = attempt(() => read('README.md'), '');
  const commits = Number(out('git', ['rev-list', '--count', 'HEAD']));
  return [
    result('node', Number(/^v(\d+)/.exec(node)?.[1]) >= MIN_NODE, node),
    result('npm', /^\d+\.\d+/.test(out('npm', ['--version'])), out('npm', ['--version'])),
    result('git', /^git version \d/.test(out('git', ['--version'])), out('git', ['--version'])),
    result('gitName', out('git', ['config', 'user.name']), out('git', ['config', 'user.name'])),
    result('gitEmail', out('git', ['config', 'user.email']), out('git', ['config', 'user.email'])),
    result('structure', missing.length === 0, missing.join(', ')),
    result(
      'gitignore',
      IGNORE.every((l) => ignored.includes(l)),
      IGNORE.filter((l) => !ignored.includes(l)).join(', '),
    ),
    result('prettier', prettier.semi === true && prettier.singleQuote === true, JSON.stringify(prettier)),
    result(
      'packages',
      pkg.dependencies?.lodash && pkg.devDependencies?.nodemon,
      `lodash ${pkg.dependencies?.lodash ?? '—'}, nodemon ${pkg.devDependencies?.nodemon ?? '—'}`,
    ),
    result('format', json('.vscode/settings.json')['editor.formatOnSave'] === true),
    result(
      'extensions',
      EXTENSIONS.every((e) => recommended.map((r) => r.toLowerCase()).includes(e)),
      EXTENSIONS.filter((e) => !recommended.map((r) => r.toLowerCase()).includes(e)).join(', '),
    ),
    result('readme', /figma\.com/.test(readme) && /github\.com/.test(readme) && /^## (Технологии|Technologies)/m.test(readme)),
    result('figma', /^https:\/\/www\.figma\.com\/\S+$/.test(attempt(() => read(at('design/figma-link.txt')).trim(), ''))),
    result('remote', /github\.com/.test(out('git', ['remote', 'get-url', 'origin'])), out('git', ['remote', 'get-url', 'origin'])),
    result('commits', commits >= 3, String(commits || 0)),
  ];
};

export const formatResults = (results, lang = 'ru') => {
  const w = WORDS[lang];
  const rows = results.map((r) => `| ${HELP[lang][r.id][0]} | ${r.pass ? w.ok : w.fail} | ${r.detail || '—'} |`);
  const failed = results.filter((r) => !r.pass);
  const table = [`| ${w.check} | ${w.status} | ${w.detail} |`, '|---|---|---|', ...rows].join('\n');
  const help = failed.map((r) => {
    const [title, why, fix] = HELP[lang][r.id];
    return `**${title}.** ${w.why}: ${why} ${w.fix}: ${fix}`;
  });
  return [`${w.table} 1 – ${w.title}`, table, failed.length ? `${w.failed}: ${failed.length}.` : w.done, ...help].join('\n\n');
};
```

## Appendix B – Listing of check.js

```js
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { checkEnv, formatResults } from './check-env.js';

const results = checkEnv({
  run: (c, a) => execSync([c, ...a].join(' '), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
  exists: existsSync,
  read: (p) => readFileSync(p, 'utf8'),
});
console.log(formatResults(results, process.argv[2]));
process.exitCode = results.filter((r) => !r.pass).length;
```

## Appendix C – Listing of server.js

```js
import * as nodeFs from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

export const staticServer = (rootDir, fs = nodeFs) => {
  const root = resolve(rootDir);
  const send = (req, res, status, file, headers = {}) => {
    const page = join(root, 'errors', `${status}.html`);
    const target = file ?? (fs.existsSync(page) ? page : null);
    res.writeHead(status, { 'Content-Type': target ? (TYPES[extname(target)] ?? 'application/octet-stream') : 'text/plain; charset=utf-8', ...headers });
    if (req.method === 'HEAD') return res.end();
    if (!target) return res.end(String(status));
    return fs
      .createReadStream(target)
      .on('error', () => res.end())
      .pipe(res);
  };
  return createServer((req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, null, { Allow: 'GET, HEAD' });
      let path;
      try {
        path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      } catch {
        return send(req, res, 400);
      }
      let file = resolve(join(root, path));
      if (file !== root && !file.startsWith(root + sep)) return send(req, res, 403);
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = join(file, 'index.html');
      return fs.existsSync(file) ? send(req, res, 200, file) : send(req, res, 404);
    } catch {
      return send(req, res, 500);
    }
  });
};
```

## Appendix D – Listing of the tests check-env.test.js

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIRS, EXTENSIONS, FILES, checkEnv, formatResults } from './check-env.js';
import { HELP, WORDS } from './help.js';

const GOOD_FILES = {
  ...Object.fromEntries([...DIRS, ...FILES].map((p) => [`site/${p}`, ''])),
  'site/design/figma-link.txt': 'https://www.figma.com/design/abc/DSLKit\n',
  '.gitignore': 'node_modules/\r\n.DS_Store\n*.log\n',
  '.prettierrc': '{"semi":true,"singleQuote":true}',
  'package.json': '{"dependencies":{"lodash":"^4"},"devDependencies":{"nodemon":"^3"}}',
  '.vscode/settings.json': '{"editor.formatOnSave":true}',
  '.vscode/extensions.json': JSON.stringify({ recommendations: EXTENSIONS.map((e) => e.toUpperCase()) }),
  'README.md': '# DSLKit\n\n## Технологии\n\nhttps://github.com/x/y https://www.figma.com/design/abc\n',
};
const GOOD_CMDS = {
  'node --version': 'v24.1.0\n',
  'npm --version': '11.0.0\n',
  'git --version': 'git version 2.50.0\n',
  'git config user.name': 'Ксения\n',
  'git config user.email': 'k@example.com\n',
  'git remote get-url origin': 'https://github.com/x/y.git\n',
  'git rev-list --count HEAD': '5\n',
};

const env = (files = GOOD_FILES, cmds = GOOD_CMDS) => ({
  run: (c, a) => {
    const key = [c, ...a].join(' ');
    if (!(key in cmds)) throw new Error(`missing ${key}`);
    return cmds[key];
  },
  exists: (p) => p in files,
  read: (p) => {
    if (!(p in files)) throw new Error('ENOENT');
    return files[p];
  },
});
const failed = (e) =>
  checkEnv(e)
    .filter((r) => !r.pass)
    .map((r) => r.id);
const without = (obj, key) => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

test('a complete environment passes every check', () => {
  assert.deepEqual(failed(env()), []);
});

test('tool checks fail when commands are missing or old', () => {
  assert.deepEqual(failed(env(GOOD_FILES, {})), ['node', 'npm', 'git', 'gitName', 'gitEmail', 'remote', 'commits']);
  assert.deepEqual(failed(env(GOOD_FILES, { ...GOOD_CMDS, 'node --version': 'v18.0.0' })), ['node']);
  assert.deepEqual(failed(env(GOOD_FILES, { ...GOOD_CMDS, 'git remote get-url origin': 'https://example.com/x.git', 'git rev-list --count HEAD': '2' })), [
    'remote',
    'commits',
  ]);
});

test('file checks fail with details', () => {
  assert.deepEqual(failed(env(without(GOOD_FILES, 'site/js/script.js'))), ['structure']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, '.gitignore': 'node_modules/\n' })), ['gitignore']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, '.prettierrc': '{"semi":false}' })), ['prettier']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, 'package.json': '{}' })), ['packages']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, '.vscode/settings.json': '{}' })), ['format']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, '.vscode/extensions.json': '{"recommendations":[]}' })), ['extensions']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, 'README.md': '# only title' })), ['readme']);
  assert.deepEqual(failed(env({ ...GOOD_FILES, 'site/design/figma-link.txt': 'https://example.com' })), ['figma']);
});

test('unreadable or broken files do not crash the checks', () => {
  const broken = { ...without(GOOD_FILES, 'package.json'), '.prettierrc': '{oops', '.vscode/extensions.json': '{}' };
  assert.deepEqual(failed(env(broken)), ['prettier', 'packages', 'extensions']);
  assert.deepEqual(failed(env({})).length, 8);
});

test('formatResults lists failures with explanations in both languages', () => {
  const bad = checkEnv(env(without(GOOD_FILES, 'README.md')));
  const ru = formatResults(bad);
  assert.match(ru, /\| Файл README\.md \| не пройдена \|/);
  assert.match(ru, /\*\*Файл README\.md\.\*\*/);
  assert.match(ru, /Зачем это нужно: README объясняет/);
  assert.match(ru, /Как исправить: Добавьте описание/);
  const en = formatResults(bad, 'en');
  assert.match(en, /Checks failed: 1\./);
  assert.match(en, /How to fix: Add a project description/);
  assert.match(formatResults(checkEnv(env())), /Все проверки пройдены\./);
});

test('every check has help text in both languages', () => {
  const ids = checkEnv(env()).map((r) => r.id);
  assert.deepEqual(Object.keys(HELP.ru), ids);
  assert.deepEqual(Object.keys(HELP.en), ids);
  assert.deepEqual(Object.keys(WORDS.ru), Object.keys(WORDS.en));
  for (const lang of ['ru', 'en']) for (const id of ids) assert.equal(HELP[lang][id].length, 3);
});

test('cli prints the check table and exposes the number of failures as exit code', async () => {
  const lines = [];
  const log = console.log;
  console.log = (s) => lines.push(s);
  process.argv[2] = 'en';
  try {
    await import('./check.js');
  } finally {
    console.log = log;
  }
  assert.match(lines[0], /Table 1 – Environment check results/);
  assert.equal(process.exitCode, (lines[0].match(/\| failed \|/g) ?? []).length);
  process.exitCode = 0;
});
```
