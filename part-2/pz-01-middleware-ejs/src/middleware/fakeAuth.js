// Simulated authorization: ?auth=1 means "signed in as the owner", anything else is a guest.
export const fakeAuth = (req, res, next) => {
  const signedIn = req.query.auth === '1';
  req.user = signedIn ? { name: 'Owner', guest: false } : { name: 'Guest', guest: true };
  res.locals.user = req.user;
  res.locals.authQuery = signedIn ? '?auth=1' : '';
  next();
};

// Guards a single route: guests are redirected to /login.
// Every page behind this guard can hold another visitor's data (the request log) or only makes sense for
// one visitor at one moment (an edit form), so it must never be kept by a shared cache or the browser's own.
export const requireAuth = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  return req.user.guest ? res.redirect('/login') : next();
};
