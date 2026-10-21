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
| `src/middleware/security.js` | Security headers, CSRF token, rate limit, log escaping |
| `src/data/requestLog.js` | The `request_log` table in SQLite |
| `src/data/diagrams.js` | In-memory record store and form field validation |
| `limits.json` | All length and number limits |
| `views/` | EJS templates and partial templates |
| `public/` | Styles and logo from Part 1 of the project, theme switch |

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
| `GET /item/:id/edit` | Form for editing a record with the current values, available with `?auth=1` |
| `POST /item/:id/edit` | Field validation and update of the record, the id and the creation time stay, status 400 on an error |
| `POST /item/:id/delete` | Deletes the record and goes to the home page, a repeated delete gives 404 |
| `GET /login` | Hint page |
| `GET /log` | Table of the request log, available with `?auth=1` |

The templates print every value with escaping, so markup typed into the form is shown as text. Every record has a "creation time" field. It is set when the record is added and is always later than the previous one, even if two records are created in the same millisecond, so records never look identical.

On the detail page a signed-in user sees the buttons "Edit" and "Delete". Editing opens the same form as adding, but filled with the current values, and checks the fields with the same rules. Deleting is a form with the `POST` method rather than a link, because a link opened with `GET` must not change data. Both forms carry the hidden `_csrf` field, without it the server answers 403, and a guest goes to the sign-in page. The id of a deleted record is never reused. Listing of the item.ejs template is given in appendix J.

### 3.5 The 500 page and the order of handlers

The 500 page is shown when a request ends with a server error. The error handler has four parameters and is mounted after all routes and all middleware, so any exception, whether a log write failure, a route error or a broken request body, reaches it. The handler writes the error to the error log, chooses the status code and renders the `500.ejs` template in the common site design: with the header, the footer and the style sheet. When the error carries its own code, for example 413 for an oversized form, the code is kept and the page gets its own heading, for example "Request too large". When the error comes from an unavailable log database, the page shows a clear explanation. For a failure before the simulated authorization the handler supplies a guest itself so that the header can be drawn. If even the 500 template fails to render, a fallback page with the same styling is sent, so the user never sees bare text on a black background. The 500 page is caused by a real failure, not by a button. To show it at the defence, start the server with `DB_FILE=package.json/blocked/log.db npm start`: the database file cannot be created, so every request ends with the 500 page. The second way is to stop the database while the server is running. The 404 page works the same way and is mounted before the 500 handler. Appendix D holds the listing.

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

### 3.7 Protection of the form and the server

The form and the server are protected against common attacks, all by hand and without new packages. To stop cross-site request forgery the server puts a random token into the `dslkit_csrf` cookie with the flags `HttpOnly` and `SameSite=Strict` and into a hidden form field. A request that changes data is accepted only when both values match and the `Origin` header, when present, points to this very site. Otherwise a page with status 403 is shown. Every response carries the headers `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy`, and the framework name is hidden from the headers. The policy forbids inline scripts and styles, so the templates have none. The rate limit answers with status 429, a page in the common design and the `Retry-After` header: the general limit and a stricter limit for form submissions live in `limits.json`. The size of the form body and the number of its fields are limited by the same file, so huge values give a page with status 400 or 413 instead of a crash. The request URL goes through escaping before it reaches the log: line breaks and control characters are replaced with the notation \uXXXX and the length is cut, so an attacker cannot forge log lines. The `/log` page opens only with `?auth=1`, because it shows the addresses of other requests. Appendix I holds the listing.

### 3.8 Appearance of the pages

The pages take their design from Part 1 of the project: the header with the logo and navigation, the footer, the buttons, the cards and the form fields use the same styles and markup as the DSLKit site and application. The light and dark theme switch works as in Part 1, and the header stays fixed while scrolling. Every page has one main button. The list of diagrams with the creation time of every record is shown in figure 1.

![Diagram list](figures/list.png)

Figure 1 – Home page with diagram cards and creation times

The detail page of one record with its revision and code is shown in figure 2.

![Detail page](figures/detail.png)

Figure 2 – Diagram page with the description, the revision and the source code

The form after sending a whitespace-only title and a negative revision is shown in figure 3. A message stands under every wrong field and the entered values are kept.

![Form with errors](figures/form-errors.png)

Figure 3 – Add form with messages about the empty title and the negative revision

The request log table from the database is shown in figure 4.

![Request log](figures/log.png)

Figure 4 – Log page with the latest rows of the request_log table

The 404 page for an unknown address is shown in figure 5.

![404 page](figures/not-found.png)

Figure 5 – The 404 error page in the site design

The 500 page during a real failure is shown in figure 6. The server was started with a database file that cannot be created, so the log write failed.

![500 page](figures/server-error.png)

Figure 6 – The 500 error page with an explanation about the unavailable log table

The same form with correct values saves the record, and the home page shows the new card with its own creation time, as in figure 7.

![Record after adding](figures/added.png)

Figure 7 – Home page after a diagram is added through the form

The «Edit» button on the detail page opens the edit form with the current field values, shown in figure 8.

![Edit form](figures/edit.png)

Figure 8 – Edit form of the first diagram with the current values and a new revision

After the changes are saved the detail page opens with the new revision, and the creation time stays the same, as in figure 9.

![Record after editing](figures/edited.png)

Figure 9 – Detail page of the first diagram after editing

### 3.9 Automatic verification

Automatic tests on the built-in `node:test` start the server on a free port and check the pages, the guest redirect, adding an item, field validation, escaping, the log table, an unavailable database, the unique creation time, editing and deleting a record with the CSRF token, both error pages, the CSRF token, the security headers, the rate limit, log escaping and huge values. The command is `npm test` in the project folder.

The console of the server started with `npm start` and after the requests is shown in figure 10.

![Server console](figures/console.png)

Figure 10 – Console output of the server with the request log lines (process output captured as text)

The result of the `npm test` command with the number of tests and the code coverage is shown in figure 11.

![Test result](figures/tests.png)

Figure 11 – End of the npm test output: the number of passed tests and the coverage table (process output captured as text)

## 4 Answers to Control Questions

25. How do you protect an Express application from CSRF with middleware (in theory)?

    A browser attaches cookies to a request to our site by itself, even when the form was sent by a page of another site, so a cookie alone is not enough. The middleware issues a random token and puts it into a cookie with the `HttpOnly` and `SameSite=Strict` flags and into a hidden field of every form. A request that changes data (`POST`, `PUT`, `PATCH`, `DELETE`) is accepted only when the field value matches the cookie and the `Origin` header, when present, points to this very site. A page of another site can neither read the cookie nor guess the token. The comparison uses `timingSafeEqual`. The order matters: the middleware is mounted after the form parser, because the token is in the body, and before the routes. In the work this is the `csrf` function in `security.js`, and the add, edit and delete forms carry the hidden field.

26. How do you use a helper function (for example, a date formatter) in an EJS template?

    The function is put into `app.locals` and becomes available in all templates, or into `res.locals` for one request, or it is passed as the second argument of `res.render()`. In the work `app.locals.formatTime` turns an ISO string such as `2026-10-01T09:00:00.000Z` into the readable "2026-10-01 09:00:00.000 UTC". In the template the call looks like this: `<%= formatTime(item.createdAt) %>`. The `<%=` tag escapes the result, and the exact machine value stays in the `datetime` attribute of the `time` element.

27. Why is the static files middleware usually mounted before all routes?

    A request for a style sheet or a logo should be answered at once, without passing authorization, the log, the form parser and the search through the routes. The page loads faster, and the log does not get a row for every file. If static files came after the routes, a template route or the 404 handler could grab the address of a file first. In the work `express.static` comes after the security headers, so files get them too, and before everything else. The price of this order is that static files are available without signing in, so nothing private may be put into `public`.

## Conclusion

For the DSLKit project an Express application with EJS templates was built: the list of diagrams, the detail page and the add form take data from an array in memory. By the rules of the even variant the request log is written to a SQLite table, and its failure is shown with a styled 500 page. The form rejects empty and whitespace values, text that is too long and negative numbers using limits from a separate file, and every record has a unique creation time. Records can be edited and deleted with buttons on the detail page. The form is protected by a CSRF token, and the server by security headers and a rate limit. The design is taken from Part 1 of the project. Automatic tests cover all the code, and screenshots of the pages are given in the text.

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

## Appendix I (mandatory) Listing of the file security.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/security.js}}

## Appendix J (mandatory) Listing of the template item.ejs

{{code:part-2/pz-01-middleware-ejs/views/item.ejs}}
