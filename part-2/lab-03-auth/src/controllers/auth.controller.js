const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { unauthorized, conflict } = require('../errors');

const createAuthController = ({ User }, { jwtSecret, jwtExpiresIn, bcryptRounds }) => {
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
      const user = await User.findOne({ where: { email } });
      const matches = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
      if (!user || !matches) return next(unauthorized('Invalid email or password'));
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { algorithm: 'HS256', expiresIn: jwtExpiresIn });
      return res.json({ token, tokenType: 'Bearer', expiresIn: jwtExpiresIn });
    },
  };
};

module.exports = { createAuthController };
