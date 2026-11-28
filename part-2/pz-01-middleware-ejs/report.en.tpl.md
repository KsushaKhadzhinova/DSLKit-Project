# Practical Session 1. Middleware and Template Engines

## 1 Purpose of the Work

The purpose is to learn the middleware concept in Express.js and the EJS template engine using the DSLKit project, a diagram-as-code web editor whose theme matches the SaaS direction and the future course project. To reach it, custom middleware for request logging, simulated authorization and error handling must be written, EJS templates for four routes and the error pages must be connected, the server must check the entered values and all limits of length and numbers must be moved to a separate file. Variant 100 (number 26 in the group list) is even, so both the request log and the catalogue data are kept in database tables, not in a file. Every record must have a unique creation time so that records do not look alike. The 500 page must open on a real failure of the log, not by a button, so the report describes how to reproduce such a failure. The source code lies in the repository {{meta:repository}} in the branch {{meta:branch}}.

## 2 Brief Theory

**Middleware.** A middleware is a function with the parameters `req`, `res` and `next`. It sees the request and the response and either ends the response or passes control on by calling `next()`. Functions run in the order in which they are mounted, so the mounting order defines the behaviour of the application. An error handler differs by its four parameters and is mounted last.

**EJS template engine.** A template holds HTML with inserted JavaScript. The tag `<%= value %>` prints a value with escaping, the tag `<% code %>` runs code, and the tag `<%- include() %>` inserts a partial template. Data is passed as the second argument of `res.render()`.

**Data storage.** Variant 100 (number 26 in the group list) is even, so both the catalogue records and the request log live in an SQLite database provided by the built-in `node:sqlite` module. The records are kept in the table `diagrams` and the log in the table `request_log`, and no extra packages are needed. The tables are created on first use, and an empty table is filled with three sample records. If the database is unreachable, the request ends with the styled 500 page and the server keeps running.

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
| `src/errors.js` | Texts of the error pages: what happened, why and how to fix it |
| `src/i18n.js` | Choice of the interface language by the `lang` parameter and cookie |
| `src/locales/` | Dictionaries of English and Russian |
| `src/limits.js` | Reading the file `limits.json` |
| `src/data/requestLog.js` | The `request_log` table in SQLite |
| `src/data/diagrams.js` | The table `diagrams` in the database and form field validation |
| `src/data/logFile.js` | Export of the log to a file and sending the file with streams |
| `limits.json` | All length and number limits |
| `views/` | EJS templates and partial templates |
| `public/` | Styles and logo from Part 1 of the project, theme switch |

EJS is configured in `src/app.js`, where the view engine and the views folder are set. The common page frame is moved into the partial templates `header` and `footer`, which are included at the start and at the end of every page. Appendix A holds the list template, and Appendix B holds the application assembly.

### 3.2 Request log in a database table

The logging middleware is mounted after the static files and the simulated authorization. Before the route runs it inserts a row with the time, the method and the URL into the `request_log` table, and when the response finishes it adds the status code and the duration to the same row. The same result goes to the console. This order is deliberate: the write happens before the route, so its failure can still be shown to the user as a 500 page, while after the response is sent that is no longer possible. The table is created on first use if it does not exist, and the database connection opens lazily, so an unavailable database does not stop the server from starting and shows up as a request error instead. The `/log` page shows the latest rows of the table, and `limits.json` sets how many. Appendix C holds the listing and Appendix D holds the table description.

### 3.3 Simulated authorization

The `fakeAuth` middleware checks the parameter `?auth=1`. When it is present, the owner is placed in `req.user`, otherwise a guest, and the templates receive the user name and the query tail for links. The `/add` routes are guarded by `requireAuth`: a guest is redirected to the `/login` page, which explains how to "sign in". Appendix E holds the listing.

### 3.4 Routes and pages

The four routes from the task and three service routes are implemented, and Table 2 lists them. The code of the routes is given in appendix F.

Table 2 – Application routes

| Route | Result |
|---|---|
| `GET /` | List of diagrams from the database table with the creation time of every record |
| `GET /item/:id` | Detail page, an unknown id leads to the 404 page |
| `GET /add` | Add form, available with `?auth=1` |
| `POST /add` | Field validation, adding to the table and redirect to the home page, on an error status 400 and the form with the entered values |
| `GET /item/:id/edit` | Form for editing a record with the current values, available with `?auth=1` |
| `POST /item/:id/edit` | Field validation and update of the record, the id and the creation time stay, status 400 on an error |
| `POST /item/:id/delete` | Deletes the record and goes to the home page, a repeated delete gives 404 |
| `GET /login` | Hint page |
| `GET /log` | Table of the request log, available with `?auth=1` |

The templates print every value with escaping, so markup typed into the form is shown as text. Every record has a "creation time" field. It is set when the record is added and is always later than the previous one, even if two records are created in the same millisecond, so records never look identical.

On the detail page a signed-in user sees the buttons "Edit" and "Delete". Editing opens the same form as adding, but filled with the current values, and checks the fields with the same rules. Deleting is a form with the `POST` method rather than a link, because a link opened with `GET` must not change data. Both forms carry the hidden `_csrf` field, without it the server answers 403 even to a signed-in user. A guest who opens a protected page by a plain link goes to the sign-in page. The id of a deleted record is never reused. Listing of the item.ejs template is given in appendix G.

The request log page has a "Clear the log" button. It is a form with the POST method and a hidden CSRF field, not a link. A request without the token gets 403, a guest with a valid token is redirected to the login page, and for a signed-in user the `request_log` table is emptied.

### 3.5 The 500 page and the order of handlers

The 500 page is shown when a request ends with a server error. The error handler has four parameters and is mounted after all routes and all middleware, so any exception, whether a log write failure, a route error or a broken request body, reaches it. The handler writes the error to the error log, chooses the status code and renders the `500.ejs` template in the common site design: with the header, the footer and the style sheet. When the error carries its own code, for example 413 for an oversized form, the code is kept and the page gets its own heading, for example "Request too large". When the error comes from an unavailable log database, the page shows a clear explanation. For a failure before the simulated authorization the handler supplies a guest itself so that the header can be drawn. If even the 500 template fails to render, a fallback page with the same styling is sent, so the user never sees bare text on a black background. The 500 page is caused by a real failure, not by an action on a page of the site. To show it at the defence, start the server in PowerShell with `$env:DB_FILE='package.json/blocked/log.db'; npm start` and remove the variable afterwards with `Remove-Item Env:DB_FILE`: the database file cannot be created, so every request ends with the 500 page. The second way is to stop the database while the server is running. The 404 page works the same way and is mounted before the 500 handler. Appendix H holds the listing.

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

On an error the server answers with status 400, shows the form again, keeps the entered values and prints a message under every wrong field. A missing request body and repeated form keys give status 400 instead of 500. All limits live in the file `limits.json`, not in the code. Appendix I holds the validation listing. The record store in the `diagrams` table is in appendix J and in appendix K, and the limits file is in appendix L.

### 3.7 Protection of the form and the server

The form and the server are protected against common attacks, all by hand and without new packages. To stop cross-site request forgery the server puts a signed random token into the `dslkit_csrf` cookie with the flags `HttpOnly` and `SameSite=Strict` and into a hidden form field. A request that changes data is accepted only when both values match and the `Origin` header, when present, points to this very site. Otherwise a page with status 403 is shown. Every response carries the headers `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy`, and the framework name is hidden from the headers. The policy forbids inline scripts and styles, so the templates have none. The rate limit answers with status 429, a page in the common design and the `Retry-After` header: the general limit and a stricter limit for form submissions live in `limits.json`. The size of the form body and the number of its fields are limited by the same file, so huge values give a page with status 400 or 413 instead of a crash. The request URL goes through escaping before it reaches the log: line breaks and control characters are replaced with the notation \uXXXX and the length is cut, so an attacker cannot forge log lines. The `/log` page opens only with `?auth=1`, because it shows the addresses of other requests. Appendix M holds the headers and the CSRF check, and appendix N holds the rate limit and the log escaping.

### 3.8 Appearance of the pages

The pages take their design from Part 1 of the project: the header with the logo and navigation, the footer, the buttons, the cards and the form fields use the same styles and markup as the DSLKit site and application. The light and dark theme switch works as in Part 1, and the header stays fixed while scrolling. Every page has one main button. The list of diagrams with the creation time of every record is shown in figure 1.

![Diagram list](figures/list.png)

Figure 1 – Home page with diagram cards and creation times

The detail page of one record with its revision and code is shown in figure 2.

![Detail page](figures/detail.png)

Figure 2 – Diagram page with the description, the revision and the source code

The empty add form before any input is shown in figure 3.

![Empty add form](figures/form-empty.png)

Figure 3 – Add form with no entered values and no error messages

The form after sending a whitespace-only title and a negative revision is shown in figure 4. A message stands under every wrong field and the entered values are kept.

![Form with errors](figures/form-errors.png)

Figure 4 – Add form with messages about the empty title and the negative revision

The request log table from the database is shown in figure 5.

![Request log](figures/log.png)

Figure 5 – Log page with the latest rows of the request_log table

The 404 page for an unknown address is shown in figure 6.

![404 page](figures/not-found.png)

Figure 6 – The 404 error page in the site design

The 500 page during a real failure is shown in figure 7. The server was started with a database file that cannot be created, so the log write failed.

![500 page](figures/server-error.png)

Figure 7 – The 500 error page with an explanation about the unavailable log table

The log can be exported to a text file and downloaded. The button "Export the log to a file" writes the rows of the table through a stream (`pipeline` with `createWriteStream`) into a temporary file and renames it to the final one only when the whole file is written, so a failure in the middle does not damage the earlier file. The code of the streams is in appendix O. The button "Download the file" sends the file through `createReadStream`. If the file is deleted, moved or unreadable, the person sees a page that explains what happened, why and how to fix it, not a cut connection and not an unnamed 500 error. A failure in the middle of the transfer closes the connection and is written to the console of the server, and the server goes on working. The texts of all error pages live in one catalogue, `src/errors.js`, and each page answers three questions: what it is, why it happened and how to fix it.

The same form with correct values saves the record, and the home page shows the new card with its own creation time, as in figure 8.

![Record after adding](figures/added.png)

Figure 8 – Home page after a diagram is added through the form

The «Edit» button on the detail page opens the edit form with the current field values, shown in figure 9.

![Edit form](figures/edit.png)

Figure 9 – Edit form of the added diagram with the current values and a new revision

After the changes are saved the detail page opens with the new revision, and the creation time stays the same, as in figure 10.

![Record after editing](figures/edited.png)

Figure 10 – Detail page of the diagram after editing with the new revision

Besides the pages 404 and 500 the site shows styled pages for the codes 400, 403, 405, 413 and 429. Each page explains what happened, why and what to do, and all texts are kept in one catalogue, `src/errors.js`. The codes and the cases are listed in table 4.

Table 4 – Error pages of the site

| Code | Page heading | When it is shown |
| --- | --- | --- |
| 400 | Bad request | The address or the form data cannot be read |
| 403 | Request refused | The form has no protection token or it does not match the cookie, or the `Origin` header points to another site |
| 404 | Page not found | There is no page or record at the address |
| 405 | Method not allowed | The address exists, but not for this request method |
| 413 | Request too large | The request body is bigger than the limit in `limits.json` |
| 429 | Too many requests | One address sent more requests than allowed |
| 500 | Server error | A server failure, including an unreachable log or catalogue database |

The page 403 for a form without the protection token is shown in figure 11.

![Page 403](figures/error-403.png)

Figure 11 – The error page 403 after a form is sent without the protection token

The page 429 for too many requests is shown in figure 12.

![Page 429](figures/error-429.png)

Figure 12 – The error page 429 after too frequent requests

The log failure was checked by stopping the database: the request gets the page 500 with an explanation that the log database is unavailable, and a line about the error goes to the console. The database tables are shown in figure 13.

![Database tables](figures/db-tables.png)

Figure 13 – The tables diagrams and request_log in the SQLite database

### 3.9 Automatic verification

Automatic tests on the built-in `node:test` start the server on a free port and check the pages, the guest redirect, adding an item, field validation, escaping, the log table, an unavailable database, the unique creation time, editing and deleting a record with the CSRF token, both error pages, the CSRF token, the security headers, the rate limit, log escaping and huge values. The command is `npm test` in the project folder.

The console of the server started with `npm start` and after the requests is shown in figure 14.

![Server console](figures/console.png)

Figure 14 – Console output of the server with the request log lines (process output captured as text)

The result of the `npm test` command with the number of tests and the code coverage is shown in figure 15.

![Test result](figures/tests.png)

Figure 15 – End of the npm test output: the number of passed tests and the coverage table (process output captured as text)

## 4 Answers to the Control Questions

The number in the group list is 26, so the answers are given to the questions 25, 26 and 27.

25. How do you protect an Express application from CSRF with middleware (in theory)?

    A browser attaches cookies to a request to our site by itself, even when the form was sent by a page of another site, so a cookie alone is not enough. The middleware issues a random token and puts it into a cookie with the `HttpOnly` and `SameSite=Strict` flags and into a hidden field of every form. A request that changes data (`POST`, `PUT`, `PATCH`, `DELETE`) is accepted only when the field value matches the cookie and the `Origin` header, when present, points to this very site. A page of another site can neither read the cookie nor guess the token. The comparison uses `timingSafeEqual`. The order matters: the middleware is mounted after the form parser, because the token is in the body, and before the routes. In the work this is the `csrf` function in `security.js`, and the add, edit and delete forms carry the hidden field. The scheme is a double submit cookie together with the check of the `Origin` header, and the token is signed with a key made at the start of the server, so a home-made value planted into the cookie fails the signature check. Safe methods such as `GET` are not checked, so they must not change data. The package `csurf` is deprecated and its successor `csrf-csrf` uses the same scheme, so here it is written by hand. The token is not bound to a session, because the application has none: it separates this site from another site, not one user from another. For this reason an attacker on a sibling subdomain could plant a genuine signed token that the site gave to the attacker and put the same value into the form: the signature does not reject it, and only the `Origin` check and `SameSite=Strict` protect against that. After a server restart the key changes and open forms must be loaded again.

26. How do you use a helper function (for example, a date formatter) in an EJS template?

    The function is put into `app.locals` and becomes available in all templates, or into `res.locals` for one request, or it is passed as the second argument of `res.render()`. In the work `app.locals.formatTime` turns an ISO string such as `2026-10-01T09:00:00.000Z` into the readable "2026-10-01 09:00:00.000 UTC". In the template the call looks like this: `<%= formatTime(item.createdAt) %>`. The `<%=` tag escapes the result, and the exact machine value stays in the `datetime` attribute of the `time` element.

27. Why is the static files middleware usually mounted before all routes?

    A request for a style sheet or a logo should be answered at once, without passing authorization, the log, the form parser and the search through the routes. The page loads faster, and the log does not get a row for every file. If static files came after the routes, a template route or the 404 handler could grab the address of a file first. In the work `express.static` stands after the security headers, the request id generator and the `/health` probe, but before the simulated authorization, the rate limit, the log, the form parser and the routes. If the file is missing, `express.static` calls `next()` and the request goes on, so an address without a file gets the 404 page from the `notFound` handler. The price of this order is that static files are available without signing in, so nothing private may be put into `public`.

## Conclusion

For the DSLKit project an Express application with EJS templates was built: the list of diagrams, the detail page and the add form take data from the `diagrams` table of a SQLite database. By the rules of the even variant the request log is written to the `request_log` table of the same database, and its failure is shown by the styled 500 page while the action is not done. The form rejects empty and whitespace values, too long text and negative numbers by the limits from the separate file `limits.json`, and every record has a unique creation time. Records can be edited and deleted with the buttons on the detail page, and deleting is a `POST` form. The form is protected by a CSRF token, and the server by security headers and a rate limit. The error pages 400, 403, 404, 405, 413, 429 and 500 follow the site style and explain what happened, why and how to fix it. The look is taken from Part 1 of the project. The automatic tests on `node:test` check the pages, the forms, the protection and the log failure, and the application code is covered by the tests completely, as figure 15 shows. The screenshots are given in the text and the listings in the appendices. The answers to the control questions 25, 26 and 27 are given in section 4. The work was done in the branch {{meta:branch}} of the project repository.

## Appendix A (mandatory) Listing of index.ejs

The comments in the listings of all appendices are in English, as in the source files of the project.

{{code:part-2/pz-01-middleware-ejs/views/index.ejs}}

## Appendix B (mandatory) Listing of app.js, middleware and shared functions

{{code:part-2/pz-01-middleware-ejs/src/app.js#1-97}}

## Appendix C (mandatory) Listing of requestLogger.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/requestLogger.js#11-56}}

## Appendix D (mandatory) Listing of requestLog.js with the log table

{{code:part-2/pz-01-middleware-ejs/src/data/requestLog.js}}

## Appendix E (mandatory) Listing of fakeAuth.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/fakeAuth.js}}

## Appendix F (mandatory) Listing of app.js, routes of the application

{{code:part-2/pz-01-middleware-ejs/src/app.js#99-197}}

## Appendix G (mandatory) Listing of item.ejs

{{code:part-2/pz-01-middleware-ejs/views/item.ejs}}

## Appendix H (mandatory) Listing of errorHandlers.js

{{code:part-2/pz-01-middleware-ejs/src/middleware/errorHandlers.js}}

## Appendix I (mandatory) Listing of diagrams.js, form field checks

{{code:part-2/pz-01-middleware-ejs/src/data/diagrams.js#142-181}}

## Appendix J (mandatory) Listing of diagrams.js, initial records

{{code:part-2/pz-01-middleware-ejs/src/data/diagrams.js#8-40}}

## Appendix K (mandatory) Listing of diagrams.js, table and record store

{{code:part-2/pz-01-middleware-ejs/src/data/diagrams.js#41-140}}

## Appendix L (mandatory) The limits file limits.json

{{code:part-2/pz-01-middleware-ejs/limits.json}}

## Appendix M (mandatory) Listing of security.js, headers and CSRF protection

{{code:part-2/pz-01-middleware-ejs/src/middleware/security.js#1-94}}

## Appendix N (mandatory) Listing of security.js, rate limit and escaping

{{code:part-2/pz-01-middleware-ejs/src/middleware/security.js#96-130}}

## Appendix O (mandatory) Listing of logFile.js, log export with streams

{{code:part-2/pz-01-middleware-ejs/src/data/logFile.js}}
