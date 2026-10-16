# Лабораторная работа №3. Реализация системы аутентификации и авторизации

## 1 Цель работы

Освоить механизмы аутентификации и авторизации в веб-приложениях: регистрацию и вход пользователей с токенами JWT, хеширование паролей с помощью bcrypt и защиту маршрутов промежуточным обработчиком. Работа продолжает лабораторные работы 1 и 2 для проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS. В качестве дополнительного механизма безопасности выбрана ролевая модель RBAC.

## 2 Краткие теоретические сведения

**Аутентификация и авторизация.** Аутентификация отвечает на вопрос, кто делает запрос, авторизация на вопрос, что этому пользователю разрешено. Неверные учётные данные дают ответ 401, а нехватка прав у известного пользователя ответ 403.

**JWT.** Токен состоит из трёх частей, разделённых точками: заголовок с алгоритмом, полезная нагрузка с утверждениями и подпись. Подпись вычисляется секретным ключом сервера, поэтому изменить нагрузку незаметно нельзя, а проверить подлинность может только владелец ключа. Нагрузка не шифруется, поэтому пароли и другие секреты в неё не кладут. Срок жизни задаётся утверждением `exp`, и по его истечении токен отклоняется.

**Хеширование паролей.** Пароль хранят только в виде хеша. Алгоритм bcrypt добавляет к каждому паролю случайную соль и намеренно работает медленно, что делает подбор по украденной базе дорогим. Параметр стоимости 10 означает 2 в степени 10 итераций. Алгоритм учитывает только первые 72 байта пароля.

**Bearer-токен.** Клиент передаёт токен в заголовке `Authorization: Bearer <токен>`. Сервер проверяет подпись и срок, а затем решает, пускать ли запрос к маршруту.

## 3 Ход работы

### 3.1 Модель пользователя и миграция

Таблица `Users` создана третьей миграцией: `id`, `email` с уникальным индексом, `passwordHash`, `role` со значением по умолчанию `user` и служебные поля Sequelize. Модель `User` проверяет роль списком `user` и `admin` и имеет метод `toPublic`, который возвращает пользователя без хеша. Все ответы строятся через этот метод, поэтому хеш не может попасть в ответ по недосмотру. Пакеты `bcrypt` и `jsonwebtoken` установлены командой `npm install`.

### 3.2 Регистрация и вход

Маршрут `POST /auth/register` приводит email к нижнему регистру, проверяет его формат и пароль, хеширует пароль вызовом `bcrypt.hash` и сохраняет пользователя. Ответ 201 содержит `id`, `email`, `role` и дату создания. Уникальность обеспечивает индекс базы: нарушение превращается в ответ 409, в том числе при одновременных запросах с одним email. Роль при регистрации всегда `user`, поле `role` из тела запроса игнорируется. Пароль должен содержать от 8 символов и не больше 72 байт, иначе bcrypt молча обрезал бы его.

Маршрут `POST /auth/login` находит пользователя, сравнивает пароль с хешем и выдаёт токен, подписанный алгоритмом HS256, со сроком жизни из переменной `JWT_EXPIRES_IN`, по умолчанию один час. В нагрузку входят `id`, `email` и `role`. Для неверного пароля и для неизвестного email сервер возвращает одинаковый ответ 401, а при отсутствии пользователя сравнивает пароль с запасным хешем, чтобы время ответа не выдавало существование учётной записи. Секрет `JWT_SECRET` обязателен и должен содержать не меньше 32 символов, иначе сервер не запускается. В репозитории лежит только образец `.env.example`.

### 3.3 Промежуточный обработчик и защищённые маршруты

Обработчик `authenticate` читает заголовок `Authorization`, проверяет схему `Bearer`, проверяет подпись и срок токена и принимает только алгоритм HS256, поэтому токены с алгоритмом `none` или HS512 отклоняются. Затем он читает пользователя из базы и кладёт в `req.user` значения `id`, `email` и `role`. Чтение из базы выбрано сознательно: удалённая учётная запись и изменённая роль начинают действовать сразу, а не после истечения старого токена. Цена решения один дополнительный запрос на каждый защищённый вызов.

Защищены маршрут `GET /profile`, возвращающий текущего пользователя, и все маршруты `/diagrams`. Результаты проверки без токена и с неверным токеном перечислены в таблице 1.

Таблица 1 – Ответы защищённых маршрутов при разных токенах

| Токен                                                     | Код | Сообщение             |
| --------------------------------------------------------- | --- | --------------------- |
| Нет заголовка, чужая схема, лишние слова                  | 401 | Missing Bearer token  |
| Изменена нагрузка, чужая подпись, алгоритм none или HS512 | 401 | Invalid token         |
| Срок жизни истёк                                          | 401 | Token expired         |
| Пользователь удалён                                       | 401 | User no longer exists |
| Верный токен                                              | 200 | данные запроса        |

### 3.4 Дополнительный механизм: роли

Выбрана ролевая модель, потому что в SaaS-редакторе нужны администратор и обычный пользователь. Middleware `requireRole('admin')` возвращает 403 всем, кроме администраторов. Администратору доступны три маршрута, перечисленные в таблице 2. Кроме того, диаграмму может менять и удалять только её владелец или администратор: владельцем становится вызывающий пользователь, а поле `ownerId` в теле запроса игнорируется. Читать диаграммы может любой вошедший пользователь.

Таблица 2 – Маршруты и права доступа

| Маршрут                                                | Кто может             | Ответы                     |
| ------------------------------------------------------ | --------------------- | -------------------------- |
| `POST /auth/register`, `POST /auth/login`              | все                   | 201 или 200, 400, 401, 409 |
| `GET /profile`                                         | вошедший пользователь | 200, 401                   |
| `GET /diagrams`, `GET /diagrams/:id`, `POST /diagrams` | вошедший пользователь | 200 или 201, 400, 401, 404 |
| `PUT /diagrams/:id`, `DELETE /diagrams/:id`            | владелец или admin    | 200 или 204, 403, 404      |
| `GET /users`                                           | admin                 | 200, 401, 403              |
| `PATCH /users/:id/role`                                | admin                 | 200, 400, 404              |
| `DELETE /users/:id`                                    | admin                 | 204, 400, 404              |

Администратор не может изменить собственную роль или удалить себя, чтобы система не осталась без администраторов. Первый администратор создаётся сидом из переменных `ADMIN_EMAIL` и `ADMIN_PASSWORD`, поэтому пароль не хранится в репозитории. Если переменные не заданы, сид пропускается.

### 3.5 Проверка

Работа проверена автоматическими тестами на временной базе SQLite с настоящими миграциями и настоящими HTTP-запросами. Тесты запускают сервер на свободном порту, а bcrypt использует четыре раунда для скорости. Покрыто следующее: регистрация с нормализацией email, отсутствие хеша в ответе и проверка, что в базе лежит хеш bcrypt, а не пароль, дубликаты email в любом регистре, ошибки проверки данных, вход и содержимое токена, одинаковый ответ на неверный пароль и неизвестный email, подделанные, неподписанные, просроченные и подписанные чужим ключом токены, удаление пользователя и смена роли при старом токене, права администратора, владельца и постороннего пользователя, миграции с откатом и сид администратора. Выполнено 39 тестов. Проверка на настоящем PostgreSQL пока не выполнялась.

### 3.6 Ограничения

Выход из системы не отзывает токен: он действует до истечения срока, поэтому срок выбран коротким. Ограничения числа попыток входа нет, на практике его добавляют на уровне прокси или отдельным механизмом блокировки. Токен хранится на стороне клиента, и выбор между localStorage и cookie с флагом httpOnly делается в клиентской лабораторной работе.

Листинг файла user.js приведён в приложении А. Листинг миграции создания таблицы Users приведён в приложении Б. Листинг файла auth.js приведён в приложении В. Листинг файла auth.controller.js приведён в приложении Г. Листинг файла validate-auth.js приведён в приложении Д. Листинг файла users.routes.js приведён в приложении Е. Листинг файла diagrams.controller.js приведён в приложении Ж.

## Заключение

В проект DSLKit добавлены пользователи с паролями в виде хешей bcrypt, регистрация, вход с токеном JWT, промежуточный обработчик проверки токена и защищённые маршруты, включая профиль текущего пользователя. Дополнительный механизм ролевой модели разделяет права администратора, владельца диаграммы и постороннего пользователя. Тесты подтверждают как успешные сценарии, так и отказы на подделанных, просроченных и чужих токенах. Остаются проверка на настоящем PostgreSQL, скриншоты запросов из Postman и ответы на контрольные вопросы, если их потребует преподаватель.

## Приложение А (обязательное) Листинг файла user.js

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

## Приложение Б (обязательное) Листинг миграции создания таблицы Users

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

## Приложение В (обязательное) Листинг файла auth.js

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

## Приложение Г (обязательное) Листинг файла auth.controller.js

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

## Приложение Д (обязательное) Листинг файла validate-auth.js

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

## Приложение Е (обязательное) Листинг файла users.routes.js

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

## Приложение Ж (обязательное) Листинг файла diagrams.controller.js

```js
const { notFound, forbidden } = require('../errors');

const missing = (id) => notFound(`Diagram ${id} not found`);

// Only the owner or an admin may change or delete a diagram.
const mayChange = (user, diagram) => user.role === 'admin' || diagram.ownerId === user.id;

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  list: async (_req, res) => res.json(await Diagram.findAll({ order: [['id', 'ASC']] })),

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
