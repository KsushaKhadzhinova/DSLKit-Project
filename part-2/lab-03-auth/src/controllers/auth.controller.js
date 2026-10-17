const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { unauthorized, conflict, tooManyRequests } = require('../errors');
const { ISSUER } = require('../settings');

const createAuthController = ({ User }, { jwtSecret, jwtExpiresIn, bcryptRounds }, loginGuard) => {
  // Compared when the email is unknown, so a missing account costs the same time as a wrong password.
  const dummyHash = bcrypt.hashSync('not-a-real-password', bcryptRounds);

  return {
    register: async (req, res, next) => {
      const { email, password } = req.credentials;
      const passwordHash = await bcrypt.hash(password, bcryptRounds);
      try {
        const user = await User.create({ email, passwordHash });
        res.status(201).location('/profile').json(user.toPublic());
      } catch (error) {
        if (error.name !== 'SequelizeUniqueConstraintError') throw error;
        next(conflict('A user with this email already exists'));
      }
    },

    login: async (req, res, next) => {
      const { email, password } = req.credentials;
      // A locked email is refused before the password is looked at, so guessing cannot continue and the answer does not depend on the account.
      const wait = loginGuard.retryAfter(email);
      if (wait > 0) return next(tooManyRequests('Too many failed logins, try again later', wait));
      const user = await User.findOne({ where: { email } });
      const matches = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
      if (!user || !matches) {
        loginGuard.fail(email);
        return next(unauthorized('Invalid email or password'));
      }
      loginGuard.succeed(email);
      // The role in the token is only a hint for the client: the server asks the database on every request.
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, {
        algorithm: 'HS256',
        expiresIn: jwtExpiresIn,
        issuer: ISSUER,
        subject: String(user.id),
      });
      return res.json({ token, tokenType: 'Bearer', expiresIn: jwtExpiresIn });
    },
  };
};

module.exports = { createAuthController };
