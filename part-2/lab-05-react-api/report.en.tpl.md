# Laboratory Work No. 5. Interaction of a React Application with a Server

## 1 Purpose of the Work

To master sending HTTP requests from a React application to a REST API, handling the loading, error and success states, optimistic interface updates and rolling a change back on failure. The client part of DSLKit, a web editor for diagrams as code (SaaS direction), is connected to the server from laboratory works 1–3 with JWT authentication and becomes the base of the future course project.

## 2 Brief Theoretical Background

**Client and server.** The browser requests data from the server over HTTP, and the server answers with JSON and a status code. A browser allows a request to another origin only when the server sends CORS headers.

**Fetch and axios.** `fetch` is built into the browser and returns a promise that is rejected only on a network failure. The axios library rejects the promise for 4xx and 5xx codes too, parses JSON itself and supports interceptors. That is why axios is used in this work.

**Request states.** Every request goes through three states: loading, success and error. The interface shows an indicator in the first one, the data in the second one and a message with a retry button in the third one.

**Optimistic update.** The interface changes at once without waiting for the server. If the server refuses, the change is rolled back and the user sees a message.

**Request cancellation.** An `AbortController` aborts a request when the component is gone or the search text has changed, so an outdated answer cannot overwrite a fresh one.

## 3 Work Progress

### 3.1 Interaction Scheme

The application has two parts. The server from laboratory work 3 listens on port 3000, stores the diagrams in a database and checks the token. The Vite client runs on port 5178 and talks to the server through the `api.js` module. The server address is set by the `VITE_API_URL` variable in the `.env` file. For the browser to allow the requests, the server got a small CORS middleware. It compares the `Origin` header of a request with the single allowed client address and names this address in the answer, while another address gets no allowing headers. The `Vary: Origin` header is always sent, so a shared cache does not give the answer for one origin to another. Preflight requests get a 204 answer without a token check. The module is given in Appendix F.

The sequence is as follows. The user signs in, the server returns a token, the client saves it in `localStorage`, and an axios interceptor puts it into the `Authorization` header of every request. If the server answers with code 401, the token is removed and the login form is shown with a message that the session has expired.

The look of the application comes from Part 1 of the project: the header with the logo and the theme switch, the footer, the buttons, the record cards and the form fields are taken from the site stylesheet. There is one main button on a screen, controls are at least 44 pixels high, text is at least 14 pixels, fields have visible labels, and the skip link leads to the main content.

The login and registration form is shown in figure 1.

![Login form](figures/01-login.png)

Figure 1 – Login form of the application with a check of the email address and the password length

### 3.2 API Service

All calls to the server are collected in the `api.js` module, which is shown in Appendix A. It creates an axios instance with the address from the environment and an eight-second timeout, adds a request interceptor with the token and a response interceptor for code 401. The functions `fetchDiagrams`, `addDiagram`, `updateDiagram` and `deleteDiagram` correspond to the GET, POST, PUT and DELETE requests. The `errorMessage` function turns an error into a clear text: the server message with the list of fields, a note about a timeout or a message about an unreachable server.

### 3.3 Loading the List

The `useDiagrams` hook keeps the list, the loading flag and the error, and requests the data in `useEffect` on mount. The hook is given in Appendix B. While the request is running, an indicator is shown, as in figure 2.

![Loading indicator](figures/02-loading.png)

Figure 2 – Loading indicator while the server answers slowly

The loaded list is shown in figure 3. Every record has a "Создана" field with the exact time, so the records differ visually.

![Diagram list](figures/03-list.png)

Figure 3 – List of diagrams received from the server

If the server is unreachable, a message and a "Повторить" button that starts the request again are shown instead of the list. This state is shown in figure 4.

![Error message](figures/09-error.png)

Figure 4 – Error message for an unreachable server and the retry button

### 3.4 Adding, Editing and Deleting

When a diagram is added, the record appears in the list at once with a temporary identifier and the "Сохраняется…" mark. The form and the list before sending are shown in figure 5.

![Form before adding](figures/04-add-before.png)

Figure 5 – Filled-in form before the diagram is sent

Right after the click the record is already in the list, although the server has not answered yet. This is visible in figure 6.

![Optimistic add](figures/05-add-optimistic.png)

Figure 6 – New record marked "Сохраняется…" before the server answer

When the server has answered, the temporary record is replaced by the real one with the identifier from the answer, as in figure 7. If the server refuses, the record disappears and a notice with the reason appears.

![Record after the answer](figures/06-add-after.png)

Figure 7 – New record after the server answer

Deleting works the same way. The record is removed at once and returns to its place if the request fails. The result is shown in figure 8.

![Deleting a record](figures/07-delete.png)

Figure 8 – List after a record is deleted

The title is edited with the Enter key or the "Сохранить" button, and Escape cancels the edit. The client sends a PUT request with all fields of the record, because the server replaces the record as a whole. If the request fails, the previous title comes back.

Fast repeated actions do not break the list. While a request for a record is not finished, a second delete or edit of the same record is ignored, so a double click on the "Удалить" button sends one DELETE request. A record with a temporary identifier cannot be deleted or edited until the server returns the real identifier. Answer 404 to a delete means that the record is already gone, so no rollback is needed.

### 3.5 Server Search with Debounce

Server search is chosen as the additional improvement. The server accepts the `search` parameter in the `GET /diagrams` request and returns the records whose title contains this string. The value is passed as a database query parameter, so a foreign fragment cannot be injected into the query, and a value that is not a string or is too long gets answer 400.

The client does not send a request on every letter. The `useDebouncedValue` hook waits for 400 milliseconds of silence, and the previous request is cancelled through `AbortController`. The search result is shown in figure 9.

![Search result](figures/08-search.png)

Figure 9 – List after a search for the word "order"

### 3.6 Input Validation

The form checks the values before sending. The title and the source code cannot be empty or made of spaces, the title is at most 80 characters, the source code is at most 10000, the password is from 8 to 72 bytes. The password length is counted in bytes, because the bcrypt hash on the server uses only the first 72 bytes, and a Russian letter takes two bytes. The limits are in the `limits.json` file and match the server limits. The file is shown in Appendix E, and the check functions in Appendix D. The server repeats the same check, so the client cannot be bypassed.

### 3.7 Testing

The main component and its states are shown in Appendix C. The work is covered by 42 automated Vitest tests with a mocked server. The tests cover the loading and error states, retry, optimistic add, delete and edit with rollback, search with cancellation of the previous request, login and logout, the token header and the handling of code 401, a double click on delete, records with a temporary identifier, and server markup shown as plain text. The server part with CORS and search is covered by ten tests in laboratory work 3. For a manual check, start the server with `npm run dev` in the `part-2/lab-03-auth` folder and the client with the same command in the `part-2/lab-05-react-api` folder. The screenshots for figures 1–9 are taken by the `shots/shots.mjs` script.

Repository branch: 25.

## Conclusion

The React client works with the server API: it receives the list with a loading indicator and a retry button, adds, edits and deletes records with optimistic updates and rollback, puts the token into every request and searches on the server with a delayed request and cancellation. All calls are collected in one module, and the value limits are moved to a separate file. The work gives a ready base for integrating the client into the course project.

## Appendix A (mandatory) Listing of api.js

{{code:part-2/lab-05-react-api/src/api.js}}

## Appendix B (mandatory) Listing of useDiagrams.js

{{code:part-2/lab-05-react-api/src/hooks/useDiagrams.js}}

## Appendix C (mandatory) Listing of App.jsx

{{code:part-2/lab-05-react-api/src/App.jsx}}

## Appendix D (mandatory) Listing of validation.js

{{code:part-2/lab-05-react-api/src/utils/validation.js}}

## Appendix E (mandatory) The limits.json Limits File

{{code:part-2/lab-05-react-api/src/limits.json}}

## Appendix F (mandatory) Listing of cors.js

{{code:part-2/lab-03-auth/src/middleware/cors.js}}