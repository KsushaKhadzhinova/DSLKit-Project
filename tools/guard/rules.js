// Pure rules of the repository guard. The command-line wrappers live in .github/scripts.
const FORBIDDEN_ATTRIBUTION = [
  /^\s*co-authored-by:.*(claude|anthropic|copilot|openai|chatgpt|gpt|gemini|cursor|codex|bot)/im,
  /generated (with|by)\b.*(claude|anthropic|copilot|chatgpt|gemini|cursor|ai\b)/i,
  /noreply@anthropic\.com/i,
];

export const problemsOf = (message) => {
  const found = [];
  const subject = message.split('\n')[0].trim();
  if (subject === '') found.push('the subject line is empty');
  if (subject.length > 120 && !/^Merge /.test(subject)) found.push('the subject line is longer than 120 characters');
  for (const pattern of FORBIDDEN_ATTRIBUTION) if (pattern.test(message)) found.push(`forbidden attribution (${pattern})`);
  return found;
};

const FORBIDDEN_PATHS = [
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$)[^/]+$/,
  /^\.claude\/admin-test-account\.txt$/,
  /^\.claude\/worktrees\//,
  /^\.playwright-mcp\//,
  /^\.accelerator\/(profile|registry)\.user\.json$/,
  /(^|\/)node_modules\//,
  /\.(pem|key|p12|pfx)$/i,
  /(^|\/)id_(rsa|ed25519)$/,
];
const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{35}/,
  /sk-ant-[0-9A-Za-z_-]{20,}/,
  /ghp_[0-9A-Za-z]{36}/,
  /github_pat_[0-9A-Za-z_]{40,}/,
  /mongodb(\+srv)?:\/\/[^:\s/<]+:[^@\s<]{3,}@(?!localhost|127\.0\.0\.1|mongo)/,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export const MAX_BYTES = 5 * 1024 * 1024;
// Large files that belong to the repository on purpose (measured network captures of lab 1).
export const LARGE_FILE_ALLOWED = [/^labs\/01-network\/data\/[^/]+\.har$/];
export const sizeProblem = (path, size) => (size > MAX_BYTES && !LARGE_FILE_ALLOWED.some((pattern) => pattern.test(path)) ? `larger than 5 MB (${(size / 1048576).toFixed(1)} MB)` : undefined);
export const pathProblems = (path) => FORBIDDEN_PATHS.filter((pattern) => pattern.test(path)).map((pattern) => `forbidden path (${pattern})`);
export const secretProblems = (text) => SECRET_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => `looks like a secret (${pattern})`);
export const scansForSecrets = (path) => /\.(js|mjs|cjs|jsx|json|md|yml|yaml|html|css|toml|env|txt|py|sh|ps1|ejs|tpl)$/i.test(path) && !/(^|\/)(package-lock\.json|\.gitleaks\.toml)$/.test(path) && !/^tools\/guard\//.test(path);
