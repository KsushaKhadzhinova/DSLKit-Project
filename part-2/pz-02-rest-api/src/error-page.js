import { createHash } from 'node:crypto';
import { describeError } from './error-catalog.js';

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const STYLE = 'body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;color:#1f2937}h1{margin:0 0 .25rem}.code{font-size:4rem;font-weight:700;color:#4f46e5;margin:0}dt{font-weight:600;margin-top:1rem}dd{margin:0}code{background:#f3f4f6;padding:.1rem .3rem;border-radius:4px}';
// The error page is the only HTML this API sends. Its policy allows exactly this one stylesheet (by hash), no scripts.
export const PAGE_CSP = `default-src 'none'; style-src 'sha256-${createHash('sha256').update(STYLE).digest('base64')}'; frame-ancestors 'none'`;

// Whether the client is a browser asking for a page: HTML is preferred over JSON in its Accept header.
export const wantsHtml = (req) => req.accepts(['json', 'html']) === 'html';

// The details are the problems of the request body; the Request ID lets the owner find this request in the journal.
export const renderErrorPage = ({ status, code, message, requestId, details = [] }) => {
  const { title, parts } = describeError(status, code);
  const rows = details.map((d) => `<li>${escapeHtml(d.field)}: ${escapeHtml(d.message)}</li>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${status} ${escapeHtml(title)}</title><style>${STYLE}</style></head>
<body><main><p class="code">${status}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>
<dl><dt>What happened</dt><dd>${escapeHtml(parts.what)}</dd><dt>Likely cause</dt><dd>${escapeHtml(parts.cause)}</dd><dt>What to do</dt><dd>${escapeHtml(parts.action)}</dd></dl>
${rows ? `<ul>${rows}</ul>` : ''}<p>Request ID: <code>${escapeHtml(requestId)}</code></p></main></body></html>
`;
};
