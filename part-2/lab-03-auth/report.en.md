# Lab 3. Authentication and Authorization

## 1 Purpose of the Work

To learn the mechanisms of authentication and authorization in web applications: user registration and login with JWT tokens, password hashing with bcrypt, and route protection with middleware. The work continues labs 1 and 2 for DSLKit, a web editor for diagrams as code that fits the SaaS direction. Role-based access control (RBAC) is chosen as the additional security mechanism.

## 2 Brief Theory

**Authentication and authorization.** Authentication answers who is making a request, and authorization answers what that user may do. Wrong credentials give a 401 response, and missing rights of a known user give 403.

**JWT.** A token has three parts separated by dots: a header with the algorithm, a payload with claims, and a signature. The signature is computed with the server secret, so the payload cannot be changed unnoticed, and only the holder of the key can verify authenticity. The payload is not encrypted, so passwords and other secrets never go into it. The lifetime is set by the `exp` claim, and an expired token is rejected.

**Password hashing.** A password is stored only as a hash. The bcrypt algorithm adds a random salt to every password and is deliberately slow, which makes guessing from a stolen database expensive. The cost parameter 10 means 2 to the power of 10 iterations. The algorithm only uses the first 72 bytes of a password.

**Bearer token.** The client sends the token in the `Authorization: Bearer <token>` header. The server checks the signature and the expiry, and then decides whether the request may reach the route.

## 3 Work Progress

### 3.1 User model and migration

The `Users` table is created by the third migration: `id`, `email` with a unique index, `passwordHash`, `role` with the default `user`, and the Sequelize service fields. The `User` model restricts the role to `user` and `admin` and has a `toPublic` method that returns the user without the hash. Every response is built through this method, so the hash cannot slip into a response by accident. The packages `bcrypt` and `jsonwebtoken` are installed with `npm install`.

### 3.2 Registration and login

The `POST /auth/register` route lowercases the email, checks its format and the password, hashes the password with `bcrypt.hash` and stores the user. The 201 response holds `id`, `email`, `role` and the creation date. Uniqueness is guaranteed by the database index: a violation turns into a 409 response, including for simultaneous requests with the same email. The role at registration is always `user`, and a `role` field in the body is ignored. A password must have at least 8 characters and at most 72 bytes, otherwise bcrypt would silently truncate it.

The `POST /auth/login` route finds the user, compares the password with the hash and issues a token signed with HS256 and a lifetime from the `JWT_EXPIRES_IN` variable, one hour by default. The payload holds `id`, `email` and `role`. A wrong password and an unknown email get the same 401 response, and when the user does not exist the server compares the password with a spare hash, so the response time does not reveal whether an account exists. The `JWT_SECRET` secret is required and must have at least 32 characters, otherwise the server does not start. Only the `.env.example` template is committed.

### 3.3 Middleware and protected routes

The `authenticate` middleware reads the `Authorization` header, checks the `Bearer` scheme, verifies the signature and the expiry, and accepts only the HS256 algorithm, so tokens with the `none` algorithm or HS512 are rejected. Then it reads the user from the database and puts `id`, `email` and `role` into `req.user`. Reading from the database is deliberate: a deleted account and a changed role take effect at once instead of after the old token expires. The price is one extra query per protected call.

The `GET /profile` route, which returns the current user, and all `/diagrams` routes are protected. The results for a missing and a bad token are listed in table 1.

Table 1 – Responses of protected routes for different tokens

| Token                                                       | Status | Message               |
| ----------------------------------------------------------- | ------ | --------------------- |
| No header, another scheme, extra words                      | 401    | Missing Bearer token  |
| Changed payload, foreign signature, algorithm none or HS512 | 401    | Invalid token         |
| Lifetime ended                                              | 401    | Token expired         |
| User deleted                                                | 401    | User no longer exists |
| Valid token                                                 | 200    | requested data        |

### 3.4 Additional mechanism: roles

Role-based access control is chosen because a SaaS editor needs an administrator and an ordinary user. The `requireRole('admin')` middleware returns 403 to everyone except administrators. Administrators get the three routes listed in table 2. In addition, a diagram can be changed and deleted only by its owner or an administrator: the owner becomes the calling user, and an `ownerId` field in the request body is ignored. Any logged-in user can read diagrams.

Table 2 – Routes and access rights

| Route                                                  | Who may call it | Responses                 |
| ------------------------------------------------------ | --------------- | ------------------------- |
| `POST /auth/register`, `POST /auth/login`              | everyone        | 201 or 200, 400, 401, 409 |
| `GET /profile`                                         | logged-in user  | 200, 401                  |
| `GET /diagrams`, `GET /diagrams/:id`, `POST /diagrams` | logged-in user  | 200 or 201, 400, 401, 404 |
| `PUT /diagrams/:id`, `DELETE /diagrams/:id`            | owner or admin  | 200 or 204, 403, 404      |
| `GET /users`                                           | admin           | 200, 401, 403             |
| `PATCH /users/:id/role`                                | admin           | 200, 400, 404             |
| `DELETE /users/:id`                                    | admin           | 204, 400, 404             |

An administrator cannot change their own role or delete themselves, so the system never ends up without administrators. The first administrator is created by a seed from the `ADMIN_EMAIL` and `ADMIN_PASSWORD` variables, so no password is stored in the repository. If the variables are not set, the seed is skipped.

### 3.5 Verification

The work is verified by automated tests on a temporary SQLite database with the real migrations and real HTTP requests. The tests start the server on a free port, and bcrypt uses four rounds for speed. They cover: registration with email normalization, no hash in the response and a check that the database holds a bcrypt hash rather than the password, duplicate emails in any letter case, data validation errors, login and the token contents, the same response for a wrong password and an unknown email, tampered, unsigned, expired and foreign-signed tokens, user deletion and a role change with an old token, the rights of an administrator, an owner and an outsider, migrations with rollback and the admin seed. There are 39 tests. A run on a real PostgreSQL has not been done yet.

### 3.6 Limitations

Logout does not revoke a token: it stays valid until it expires, which is why the lifetime is short. There is no limit on login attempts. In practice it is added at the proxy level or as a separate lockout mechanism. The token is kept on the client side, and the choice between localStorage and an httpOnly cookie is made in the client lab.

Listing of user.js is given in appendix A. Listing of the Users table migration is given in appendix B. Listing of auth.js is given in appendix C. Listing of auth.controller.js is given in appendix D. Listing of validate-auth.js is given in appendix E. Listing of users.routes.js is given in appendix F. Listing of diagrams.controller.js is given in appendix G.

## Conclusion

DSLKit now has users with bcrypt password hashes, registration, login with a JWT token, a token-checking middleware and protected routes, including the profile of the current user. The additional role-based mechanism separates the rights of an administrator, a diagram owner and an outsider. The tests confirm both the successful scenarios and the rejections of tampered, expired and foreign tokens. A run on a real PostgreSQL, screenshots of Postman requests and answers to the control questions, if the teacher requires them, are still to be done.

## Appendix A (mandatory) Listing of user.js

```js
const { DataTypes } = require('sequelize');

const ROLES = ['user', 'admin'];

const defineUser = (sequelize) => {
  const User = sequelize.define('User', {
    // Lowercased on the way in, the database also checks it, so one address is one account.
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('email', typeof value === 'string' ? value.trim().toLowerCase() : value);
      },
    },
    passwordHash: { type: DataTypes.STRING(100), allowNull: false },
    role: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'user', validate: { isIn: [ROLES] } },
  });

  // The hash must never leave the server, so the public view is built in one place.
  User.prototype.toPublic = function toPublic() {
    return { id: this.id, email: this.email, role: this.role, createdAt: this.createdAt };
  };
  return User;
};

module.exports = { defineUser, ROLES };
```

## Appendix B (mandatory) Listing of the Users table migration

```js
// A migration is a snapshot, so the allowed values are copied here instead of imported.
const ROLES = ['user', 'admin'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      email: { allowNull: false, unique: true, type: Sequelize.STRING(254) },
      // A bcrypt hash is 60 characters; 100 leaves room for a stronger variant.
      passwordHash: { allowNull: false, type: Sequelize.STRING(100) },
      role: { allowNull: false, type: Sequelize.STRING(10), defaultValue: 'user' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('Users', {
      type: 'check',
      fields: ['role'],
      name: 'users_role_check',
      where: { role: { [Sequelize.Op.in]: ROLES } },
    });
    // Emails are stored lowercased, so the unique index cannot be dodged with another letter case.
    await queryInterface.addConstraint('Users', {
      type: 'check',
      fields: ['email'],
      name: 'users_email_lowercase_check',
      where: Sequelize.where(Sequelize.fn('lower', Sequelize.col('email')), Sequelize.col('email')),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Users');
  },
};
```

## Appendix C (mandatory) Listing of auth.js

```js
const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../errors');

const bearerToken = (req) => {
  const [scheme, token, ...rest] = (req.get('Authorization') || '').split(' ');
  return scheme === 'Bearer' && token && rest.length === 0 ? token : undefined;
};

// Verifies the Bearer token, then loads the user so a deleted account or a changed role takes effect at once.
// req.user holds { id, email, role } taken from the database, not from the token.
const createAuthenticate =
  ({ User }, { jwtSecret }) =>
  async (req, _res, next) => {
    const token = bearerToken(req);
    if (!token) return next(unauthorized('Missing Bearer token'));
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    } catch (error) {
      return next(unauthorized(error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'));
    }
    const user = await User.findByPk(payload.id);
    if (!user) return next(unauthorized('User no longer exists'));
    req.user = { id: user.id, email: user.email, role: user.role };
    return next();
  };

const requireRole = (role) => (req, _res, next) => (req.user.role === role ? next() : next(forbidden(`Requires the ${role} role`)));

module.exports = { createAuthenticate, requireRole };
```

## Appendix D (mandatory) Listing of auth.controller.js

```js
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
```

## Appendix E (mandatory) Listing of validate-auth.js

```js
const { badRequest } = require('../errors');
const { ROLES } = require('../models/user');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
// bcrypt ignores everything after the 72nd byte, so longer passwords would silently weaken.
const MAX_PASSWORD_BYTES = 72;

const objectBody = (body) => body !== null && typeof body === 'object' && !Array.isArray(body);
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : email);

const validEmail = (email) => typeof email === 'string' && email.length <= 254 && EMAIL.test(email);

const passwordProblem = (password) => {
  if (typeof password !== 'string') return 'must be a string';
  if (password.length < MIN_PASSWORD) return `must be at least ${MIN_PASSWORD} characters`;
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) return `must be at most ${MAX_PASSWORD_BYTES} bytes`;
  return undefined;
};

const reject = (next, details) => next(badRequest('Invalid credentials data', details));

const validateRegistration = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const email = normalizeEmail(req.body.email);
  const details = [];
  if (!validEmail(email)) details.push({ field: 'email', message: 'must be a valid email address' });
  const problem = passwordProblem(req.body.password);
  if (problem) details.push({ field: 'password', message: problem });
  if (details.length > 0) return reject(next, details);
  req.credentials = { email, password: req.body.password };
  return next();
};

// Login only needs the two values to exist; the rules above would leak which part of a wrong password is fine.
const validateLogin = (req, _res, next) => {
  if (!objectBody(req.body)) return next(badRequest('Request body must be a JSON object'));
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return reject(next, [{ field: 'email, password', message: 'both are required strings' }]);
  }
  req.credentials = { email: normalizeEmail(email), password };
  return next();
};

const validateRole = (req, _res, next) => {
  const role = objectBody(req.body) ? req.body.role : undefined;
  if (!ROLES.includes(role)) return next(badRequest('Invalid role data', [{ field: 'role', message: `must be one of ${ROLES.join(', ')}` }]));
  req.newRole = role;
  return next();
};

module.exports = { validateRegistration, validateLogin, validateRole };
```

## Appendix F (mandatory) Listing of users.routes.js

```js
const { Router } = require('express');
const { requireRole } = require('../middleware/auth');
const { parseId } = require('../middleware/validate');
const { validateRole } = require('../middleware/validate-auth');

// Every route here needs a valid token; the /users routes also need the admin role.
const createUsersRouter = (controller, authenticate) => {
  const router = Router();
  const admin = [authenticate, requireRole('admin')];
  router.get('/profile', authenticate, controller.profile);
  router.get('/users', ...admin, controller.list);
  router.patch('/users/:id/role', ...admin, parseId('userId', 'User'), validateRole, controller.setRole);
  router.delete('/users/:id', ...admin, parseId('userId', 'User'), controller.remove);
  return router;
};

module.exports = { createUsersRouter };
```

## Appendix G (mandatory) Listing of diagrams.controller.js

```js
const { Op } = require('sequelize');
const { notFound, forbidden, badRequest } = require('../errors');
const { LIMITS } = require('../models/diagram.constants');

const missing = (id) => notFound(`Diagram ${id} not found`);

// Only the owner or an admin may change or delete a diagram.
const mayChange = (user, diagram) => user.role === 'admin' || diagram.ownerId === user.id;

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  // ?search=text keeps diagrams whose title contains the text. The value is a bound parameter, so it cannot change the query.
  list: async (req, res, next) => {
    const { search } = req.query;
    if (search !== undefined && (typeof search !== 'string' || search.trim().length > LIMITS.title)) {
      return next(badRequest(`search must be a string of at most ${LIMITS.title} characters`));
    }
    const term = (search ?? '').trim();
    const where = term ? { title: { [Op.like]: `%${term}%` } } : undefined;
    return res.json(await Diagram.findAll({ where, order: [['id', 'ASC']] }));
  },

  get: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: async (req, res) => {
    const diagram = await Diagram.create({ ...req.diagramFields, ownerId: req.user.id });
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    if (!diagram) return next(missing(req.diagramId));
    if (!mayChange(req.user, diagram)) return next(forbidden('Only the owner or an admin can change this diagram'));
    return res.json(await diagram.update(req.diagramFields));
  },

  remove: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    if (!diagram) return next(missing(req.diagramId));
    if (!mayChange(req.user, diagram)) return next(forbidden('Only the owner or an admin can delete this diagram'));
    await diagram.destroy();
    return res.status(204).end();
  },
});

module.exports = { createDiagramsController };
```
