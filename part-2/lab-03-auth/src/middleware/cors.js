// A browser app on another origin (the React client) may call the API only when the server allows that origin.
// origin: the single allowed origin such as http://localhost:5178. It is compared with the Origin header of the request:
// only an equal value gets the Access-Control-Allow-* headers, every other origin gets none and the browser blocks the answer.
// Vary: Origin is always sent so a shared cache never gives the answer for one origin to another.
// The preflight request (OPTIONS) is answered with 204 here and never reaches the routes or the token check.
const createCors = (origin) => {
  if (!origin || origin === '*') throw new Error('corsOrigin must be one exact origin, not * (see .env.example)');
  return (req, res, next) => {
    res.vary('Origin');
    const allowed = req.get('Origin') === origin;
    if (allowed) res.set('Access-Control-Allow-Origin', origin);
    if (req.method !== 'OPTIONS') return next();
    if (allowed) {
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '600');
    }
    return res.status(204).end();
  };
};

module.exports = { createCors };
