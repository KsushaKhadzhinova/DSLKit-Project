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

Role-based access control is chosen because a SaaS editor needs an administrator and an ordinary user. The `requireRole('admin')` middleware returns 403 to everyone except administrators. Administrators get the three routes listed in table 2. In addition, a diagram can be changed and deleted only by its owner or an administrator: the owner becomes the calling user, and an `owner` field in the request body is ignored. Any logged-in user can read diagrams.

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

The work is verified by automated tests on a temporary SQLite database with the real migrations and real HTTP requests. The tests start the server on a free port, and bcrypt uses four rounds for speed. They cover: registration with email normalization, no hash in the response and a check that the database holds a bcrypt hash rather than the password; duplicate emails in any letter case; data validation errors; login and the token contents; the same response for a wrong password and an unknown email; tampered, unsigned, expired and foreign-signed tokens; user deletion and a role change with an old token; the rights of an administrator, an owner and an outsider; migrations with rollback and the admin seed. There are 39 tests. A run on a real PostgreSQL has not been done yet.

### 3.6 Limitations

Logout does not revoke a token: it stays valid until it expires, which is why the lifetime is short. There is no limit on login attempts; in practice it is added at the proxy level or as a separate lockout mechanism. The token is kept on the client side, and the choice between localStorage and an httpOnly cookie is made in the client lab.

## Conclusion

DSLKit now has users with bcrypt password hashes, registration, login with a JWT token, a token-checking middleware and protected routes, including the profile of the current user. The additional role-based mechanism separates the rights of an administrator, a diagram owner and an outsider. The tests confirm both the successful scenarios and the rejections of tampered, expired and foreign tokens. A run on a real PostgreSQL, screenshots of Postman requests and answers to the control questions, if the teacher requires them, are still to be done.

## Appendix A – Listing of user.js

{{code:part-2/lab-03-auth/src/models/user.js}}

## Appendix B – Listing of the Users table migration

{{code:part-2/lab-03-auth/migrations/20261016000003-create-users.js}}

## Appendix C – Listing of auth.js

{{code:part-2/lab-03-auth/src/middleware/auth.js}}

## Appendix D – Listing of auth.controller.js

{{code:part-2/lab-03-auth/src/controllers/auth.controller.js}}

## Appendix E – Listing of validate-auth.js

{{code:part-2/lab-03-auth/src/middleware/validate-auth.js}}

## Appendix F – Listing of users.routes.js

{{code:part-2/lab-03-auth/src/routes/users.routes.js}}

## Appendix G – Listing of diagrams.controller.js

{{code:part-2/lab-03-auth/src/controllers/diagrams.controller.js}}
