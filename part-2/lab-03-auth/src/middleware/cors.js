// A browser app on another origin (the React client) may call the API only when the server allows that origin.
// origin: a single allowed origin such as http://localhost:5178. The preflight request gets 204 without reaching the routes.
const createCors = (origin) => (req, res, next) => {
  res.set('Access-Control-Allow-Origin', origin);
  res.vary('Origin');
  if (req.method !== 'OPTIONS') return next();
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '600');
  return res.status(204).end();
};

module.exports = { createCors };
