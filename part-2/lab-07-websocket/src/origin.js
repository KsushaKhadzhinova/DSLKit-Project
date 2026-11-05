// Origin check for the handshake. Browsers always send Origin on a WebSocket upgrade, and a page
// from another site could open a socket with the visitor's cookies (cross-site WebSocket hijacking).
// Requests without Origin (Node clients, curl) are not browsers and are allowed.
const parseAllowed = (value = '') =>
  String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const isOriginAllowed = (origin, host, allowed = []) => {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

module.exports = { parseAllowed, isOriginAllowed };
