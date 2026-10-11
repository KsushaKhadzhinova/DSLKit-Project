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
