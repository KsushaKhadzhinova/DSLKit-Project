# Practical Session 1. Middleware and Template Engines

## 1 Purpose of the Work

To learn the middleware concept in Express.js, to write custom middleware for request logging, simulated authorization and error handling, and to study the EJS template engine for generating dynamic pages on the server, using the DSLKit project, a diagram-as-code web editor whose theme matches the SaaS direction and the future course project.

## 2 Brief Theory

**Middleware.** A middleware is a function with the parameters `req`, `res` and `next`. It sees the request and the response and either ends the response or passes control on by calling `next()`. Functions run in the order in which they are mounted, so the mounting order defines the behaviour of the application. An error handler differs by its four parameters and is mounted last.

**EJS template engine.** A template holds HTML with inserted JavaScript. The tag `<%= value %>` prints a value with escaping, the tag `<% code %>` runs code, and the tag `<%- include() %>` inserts a partial template. Data is passed as the second argument of `res.render()`.

**Data storage.** The task keeps data in an array in the process memory, so it disappears when the server restarts.

## 3 Course of the Work

### 3.1 Project structure

The project lives in `part-2/pz-01-middleware-ejs` and runs on Express 5 with the EJS template engine. Table 1 shows the structure.

Table 1 – Structure of the practical session 1 project

| File                              | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| `src/app.js`                      | Application assembly, middleware order and routes |
| `src/server.js`                   | Starts the server on a port                       |
| `src/middleware/requestLogger.js` | Request log                                       |
| `src/middleware/fakeAuth.js`      | Simulated authorization                           |
| `src/middleware/errorHandlers.js` | 404 and 500 error handlers                        |
| `src/data/diagrams.js`            | In-memory store and field validation              |
| `views/`                          | EJS templates and partial templates               |

EJS is configured in `src/app.js`, where the view engine and the views folder are set. The common page frame is moved into the partial templates `header` and `footer`, which are included at the start and at the end of every page (Appendix E).

### 3.2 Request log

The logging middleware is mounted first after the static files. When a response finishes it writes the method, the URL, the status and the duration to the console and adds the same row to an in-memory table. The table is shown on the `/log` page. The task forbids a database, so the log is kept in an array behind the function `createRequestLog` and is limited to one hundred rows. Appendix A holds the listing.

### 3.3 Simulated authorization

The `fakeAuth` middleware checks the parameter `?auth=1`. When it is present, the owner is placed in `req.user`, otherwise a guest, and the templates receive the user name and the query tail for links. The `/add` routes are guarded by `requireAuth`: a guest is redirected to the `/login` page, which explains how to "sign in". Appendix B holds the listing.

### 3.4 Routes and pages

The four routes from the task and three service routes are implemented, and Table 2 lists them.

Table 2 – Application routes

| Route           | Result                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /`         | List of diagrams from the array                                                                                                  |
| `GET /item/:id` | Detail page, an unknown id leads to the 404 page                                                                                 |
| `GET /add`      | Add form, available with `?auth=1`                                                                                               |
| `POST /add`     | Field validation, adding to the array and redirect to the home page, on an error status 400 and the form with the entered values |
| `GET /login`    | Hint page                                                                                                                        |
| `GET /log`      | Table of the request log                                                                                                         |
| `GET /boom`     | Deliberate failure for the 500 page                                                                                              |

The templates print every value with escaping, so markup typed into the form is shown as text. Appendix D holds the list template.

### 3.5 Error handling

Two handlers are mounted after all routes. The first renders `404.ejs` for any URL without a match. The second has four parameters, writes the error to the error log and renders `500.ejs`; when the headers are already sent it simply closes the response. Appendix C holds the listing.

### 3.6 Verification

Automatic tests on the built-in `node:test` start the server on a free port and check the pages, the guest redirect, adding an item, field validation, escaping, the log and both error pages. Line, branch and function coverage is 100 percent. The command is `npm test` in the project folder.

## Conclusion

For the DSLKit project an Express application with EJS templates was built: the list of diagrams, the detail page and the add form take data from an array in memory. The request log writes to the console and to an in-memory table, the simulated authorization with the parameter `?auth=1` closes the form to guests, and separate 404 and 500 pages handle errors. Automatic tests cover all the code. Screenshots of the pages taken in a browser remain to be attached.

## Appendix A – Listing of the file requestLogger.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/requestLogger.js}}

## Appendix B – Listing of the file fakeAuth.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/fakeAuth.js}}

## Appendix C – Listing of the file errorHandlers.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/errorHandlers.js}}

## Appendix D – Listing of the template index.ejs

{{code:part-2/pz-01-middleware-ejs/views/index.ejs}}

## Appendix E – Listing of the file app.js

{{code:part-2/pz-01-middleware-ejs/src/app.js}}
