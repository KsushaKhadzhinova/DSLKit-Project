// Simulated authorization: ?auth=1 means "signed in as the owner", anything else is a guest.
export const fakeAuth = (req, res, next) => {
  const signedIn = req.query.auth === '1';
  req.user = signedIn ? { name: 'Owner', guest: false } : { name: 'Guest', guest: true };
  res.locals.user = req.user;
  res.locals.authQuery = signedIn ? '?auth=1' : '';
  next();
};

// Guards a single route: guests are redirected to /login.
export const requireAuth = (req, res, next) => (req.user.guest ? res.redirect('/login') : next());
