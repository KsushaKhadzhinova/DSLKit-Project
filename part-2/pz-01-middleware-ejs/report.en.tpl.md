# Practical Session 1. Middleware and Template Engines

## 1 Purpose of the Work

To learn the middleware concept in Express.js, to write custom middleware for request logging, simulated authorization and error handling, and to study the EJS template engine for generating dynamic pages on the server, using the DSLKit project, a diagram-as-code web editor whose theme matches the SaaS direction and the future course project. Variant 26 is even, so the request log is kept not in a file but in a database table.

## 2 Brief Theory

**Middleware.** A middleware is a function with the parameters `req`, `res` and `next`. It sees the request and the response and either ends the response or passes control on by calling `next()`. Functions run in the order in which they are mounted, so the mounting order defines the behaviour of the application. An error handler differs by its four parameters and is mounted last.

**EJS template engine.** A template holds HTML with inserted JavaScript. The tag `<%= value %>` prints a value with escaping, the tag `<% code %>` runs code, and the tag `<%- include() %>` inserts a partial template. Data is passed as the second argument of `res.render()`.

**Data storage.** The catalogue records live in an array in the process memory and disappear when the server restarts. The request log is stored in a SQLite database table provided by the built-in module `node:sqlite`, so no extra package is needed for it.

## 3 Course of the Work

### 3.1 Project structure

The project lives in `part-2/pz-01-middleware-ejs` and runs on Express 5 with the EJS template engine. The structure is shown in table 1.

Table 1 – Structure of the practical session 1 project

| File | Purpose |
|---|---|
| `src/app.js` | Application assembly, middleware order and routes |
| `src/server.js` | Starts the server on a port |
| `src/middleware/requestLogger.js` | Writes every request into the log table |
| `src/middleware/fakeAuth.js` | Simulated authorization |
| `src/middleware/errorHandlers.js` | 404 and 500 error handlers |
| `src/data/requestLog.js` | The `request_log` table in SQLite |
| `src/data/diagrams.js` | In-memory record store and form field validation |
| `limits.json` | All length and number limits |
| `views/` | EJS templates and partial templates |

EJS is configured in `src/app.js`, where the view engine and the views folder are set. The common page frame is moved into the partial templates `header` and `footer`, which are included at the start and at the end of every page. Appendix G holds the list template, and Appendix H holds the application assembly.

### 3.2 Request log in a database table

The logging middleware is mounted after the static files and the simulated authorization. Before the route runs it inserts a row with the time, the method and the URL into the `request_log` table, and when the response finishes it adds the status code and the duration to the same row. The same result goes to the console. This order is deliberate: the write happens before the route, so its failure can still be shown to the user as a 500 page, while after the response is sent that is no longer possible. The table is created on first use if it does not exist, and the database connection opens lazily, so an unavailable database does not stop the server from starting and shows up as a request error instead. The `/log` page shows the latest rows of the table, and `limits.json` sets how many. Appendix A holds the listing and Appendix B holds the table description.

### 3.3 Simulated authorization

The `fakeAuth` middleware checks the parameter `?auth=1`. When it is present, the owner is placed in `req.user`, otherwise a guest, and the templates receive the user name and the query tail for links. The `/add` routes are guarded by `requireAuth`: a guest is redirected to the `/login` page, which explains how to "sign in". Appendix C holds the listing.

### 3.4 Routes and pages

The four routes from the task and three service routes are implemented, and Table 2 lists them.

Table 2 – Application routes

| Route | Result |
|---|---|
| `GET /` | List of diagrams from the array with the creation time of every record |
| `GET /item/:id` | Detail page, an unknown id leads to the 404 page |
| `GET /add` | Add form, available with `?auth=1` |
| `POST /add` | Field validation, adding to the array and redirect to the home page, on an error status 400 and the form with the entered values |
| `GET /login` | Hint page |
| `GET /log` | Table of the request log |

The templates print every value with escaping, so markup typed into the form is shown as text. Every record has a "creation time" field. It is set when the record is added and is always later than the previous one, even if two records are created in the same millisecond, so records never look identical.

### 3.5 The 500 page and the order of handlers

The 500 page is shown when a request ends with a server error. The error handler has four parameters and is mounted after all routes and all middleware, so any exception, whether a log write failure, a route error or a broken request body, reaches it. The handler writes the error to the error log, chooses the status code and renders the `500.ejs` template in the common site design: with the header, the footer and the style sheet. When the error carries its own code, for example 413 for an oversized form, the code is kept and the page gets the heading "bad request". When the error comes from an unavailable log database, the page shows a clear explanation. For a failure before the simulated authorization the handler supplies a guest itself so that the header can be drawn. If even the 500 template fails to render, a fallback page with the same styling is sent, so the user never sees bare text on a black background. The 500 page is caused by a real failure, not by a button. To show it at the defence, start the server with `DB_FILE=package.json/blocked/log.db npm start`: the database file cannot be created, so every request ends with the 500 page. The second way is to stop the database while the server is running. The 404 page works the same way and is mounted before the 500 handler. Appendix D holds the listing.

### 3.6 Form field checks

The add form is validated on the server, and the same limits are passed to the markup as the attributes `maxlength`, `min` and `max`. Values are trimmed first, so a field of only spaces counts as empty. The rules are listed in table 3.

Table 3 – Checks of the add form fields

| Field | Rule |
|---|---|
| Title | Required, not empty after trimming, not longer than the limit in `limits.json` |
| Description | Required, not empty after trimming, not longer than the limit in `limits.json` |
| Notation | One value from the list |
| Diagram code | Optional, not longer than the limit in `limits.json` |
| Revision | Required, a whole number from 0 to the limit in `limits.json`, negative and fractional values are rejected |

On an error the server answers with status 400, shows the form again, keeps the entered values and prints a message under every wrong field. A missing request body and repeated form keys give status 400 instead of 500. All limits live in the file `limits.json`, not in the code. Appendix E holds the validation listing and appendix F holds the limits file.

### 3.7 Automatic verification

Automatic tests on the built-in `node:test` start the server on a free port and check the pages, the guest redirect, adding an item, field validation, escaping, the log table, an unavailable database, the unique creation time and both error pages. The command is `npm test` in the project folder.

## 4 Answers to Control Questions

@@ANSWERS@@

## Conclusion

For the DSLKit project an Express application with EJS templates was built: the list of diagrams, the detail page and the add form take data from an array in memory. By the rules of the even variant the request log is written to a SQLite table, and its failure is shown with a styled 500 page. The form rejects empty and whitespace values, text that is too long and negative numbers using limits from a separate file, and every record has a unique creation time. Automatic tests cover all the code. Screenshots of the pages taken in a browser remain to be attached.

## Appendix A (mandatory) Listing of the file requestLogger.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/requestLogger.js}}

## Appendix B (mandatory) Listing of the file requestLog.js with the log table

{{code:part-2/pz-01-middleware-ejs/src/data/requestLog.js}}

## Appendix C (mandatory) Listing of the file fakeAuth.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/fakeAuth.js}}

## Appendix D (mandatory) Listing of the file errorHandlers.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/errorHandlers.js}}

## Appendix E (mandatory) Listing of the file diagrams.js with the form checks

{{code:part-2/pz-01-middleware-ejs/src/data/diagrams.js}}

## Appendix F (mandatory) The limits file limits.json

{{code:part-2/pz-01-middleware-ejs/limits.json}}

## Appendix G (mandatory) Listing of the template index.ejs

{{code:part-2/pz-01-middleware-ejs/views/index.ejs}}

## Appendix H (mandatory) Listing of the file app.js

{{code:part-2/pz-01-middleware-ejs/src/app.js}}
