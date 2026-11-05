# DSLKit REST API

Base URL: `http://localhost:3000/api`. Requests and responses are JSON (`Content-Type: application/json`, UTF-8 only). Data lives in memory and resets when the server restarts. There is no authentication in this practical: every record and every operation is open to anyone who can reach the server; see "Known limitations" below. Every response has the headers `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Cache-Control: no-store`. No CORS headers are sent, so browsers allow only same-origin calls. A request whose `Accept` header cannot match `application/json` gets 406; `GET`, `HEAD` and `DELETE` never read a body, whatever its `Content-Type`.

## Resources

| Resource   | Fields (type, rule)                                                                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`    | `name` (string, required, up to 60), `email` (string, required, up to 120, ASCII local part and domain, normalized before it is checked or stored, see below), `role` (`owner`, `editor`, `viewer`, default `viewer`)                                                  |
| `projects` | `name` (string, required, up to 80), `description` (string, up to 500, default empty, may contain a newline), `ownerId` (integer, required, must be an existing user)                                                                                                  |
| `diagrams` | `title` (string, required, up to 80), `notation` (`UML`, `BPMN`, `ERD`, `DFD`, `IDEF0`, `Petri`, required), `code` (string, up to 10000, default empty, may contain a newline), `projectId` (integer, required, must be an existing project), `status` (`draft`, `published`, default `draft`) |

Every record also has a read-only `id` and `createdAt`. Relations: a user owns projects, a project holds diagrams. Every string field rejects control characters and invisible formatting characters (zero-width space, bidi marks, byte-order mark) and an unpaired surrogate; a single-line field (everything except `description` and `code`) also rejects a raw newline or tab. A collection (`users`, `projects` or `diagrams`) holds at most 5000 records; creating or duplicating past that answers 409 `quota_exceeded`.

**Email**: before it is checked for uniqueness or stored, an email is Unicode-normalized (NFKC, so "é" and "e" + a combining accent become the same text), stripped of invisible formatting characters, and lower-cased. The local part and the domain must be plain ASCII (an IDNA/punycode domain is not supported) with no leading, trailing or doubled dot. This closes the gaps a zero-width space, a different Unicode normalization, or an upper/lower-case difference used to open, which used to let two look-alike addresses both register.

## Endpoints

Each resource has the same six operations, shown for `{res}` = `users`, `projects`, `diagrams`.

| Method   | URL          | Purpose                                | Success            | Errors        |
| -------- | ------------ | -------------------------------------- | ------------------ | ------------- |
| `GET`    | `/{res}`     | List with filter, search, sort, paging | 200 `{data, meta}` | 400           |
| `GET`    | `/{res}/:id` | One record                             | 200                | 400, 404      |
| `POST`   | `/{res}`     | Create                                 | 201 and `Location` | 400, 409\*, 413 |
| `PUT`    | `/{res}/:id` | Replace the whole record               | 200                | 400, 404, 409\* |
| `PATCH`  | `/{res}/:id` | Change only the sent fields            | 200                | 400, 404, 409\* |
| `DELETE` | `/{res}/:id` | Delete                                 | 204 without a body | 400, 404, 409\*\* |

\* 409 on write only for `users` (an email already taken). `projects` and `diagrams` never 409 on `POST`, `PUT` or `PATCH`; a reference to a record that does not exist (`ownerId`, `projectId`) is 400, not 409.
\*\* 409 on delete for `users` (still owns a project) and `projects` (still has a diagram); `diagrams` never 409 on delete. Any `POST`/`PUT`/`PATCH`/`DELETE` can also answer 409 `quota_exceeded` once its collection holds 5000 records (`POST` and `/duplicate` only).

A full `PUT` replaces every field the schema knows, except: a field the body leaves out keeps the record's **current** value instead of resetting to the field's default (sending `{"name": "...", "email": "..."}` to replace a user does not quietly lower an `owner` back to the default `viewer`). Send the field explicitly, with the value you want, to actually change or reset it.

Extra operations:

| Method | URL                       | Purpose                                                 | Success | Errors   |
| ------ | ------------------------- | -------------------------------------------------------- | ------- | -------- |
| `GET`  | `/users/:id/projects`     | Projects owned by one user, same query options as lists | 200     | 400, 404 |
| `GET`  | `/projects/:id/diagrams`  | Diagrams of one project, same query options as lists    | 200     | 400, 404 |
| `POST` | `/diagrams/:id/publish`   | Set status to `published`; repeating it changes nothing | 200     | 400, 404 |
| `POST` | `/diagrams/:id/duplicate` | Copy a diagram as a draft titled "... (copy)"           | 201     | 400, 404, 409 |

Personal data: the user list returns `id`, `name`, `role` and `createdAt` without the `email`. The email comes only with one user (`GET /api/users/:id`), and a list cannot be filtered, searched or sorted by it (the filter and search are a silent no-op on it, not an error, so neither one works as an oracle for which emails exist).

## List query parameters

| Parameter       | Meaning                                                   | Example            |
| --------------- | --------------------------------------------------------- | ------------------ |
| any field name  | Exact match filter                                        | `?status=draft`    |
| `q`             | Case-insensitive search in the string fields              | `?q=billing`       |
| `sort`          | Field name, a leading `-` means descending, locale-aware, ties keep ascending id order | `?sort=-title` |
| `page`, `limit` | Page number (from 1) and page size (1 to 100, default 20) | `?page=2&limit=10` |

A query key that is none of the above and not a field of the resource (a typo, for example) answers 400 `invalid_query`, instead of being silently ignored. A filter value that does not fit the field (`?role=admin`, `?ownerId=abc`) is also 400, instead of an empty result. The one exception is the hidden `email` filter on `users`: it is still a silent no-op, by design, so it cannot be used to check whether an address exists. A repeated key (`?name=a&name=b`) is 400 as well, rather than being joined into one string. `page` and `id` accept at most 15 digits (999999999999999); the error message states that number, not `Number.MAX_SAFE_INTEGER`.

The list response is `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 3 } }`.

## Errors

Every error has one shape. `details` appears for validation errors.

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Request body is invalid",
    "details": [{ "field": "title", "message": "title must not be empty" }]
  }
}
```

| Status | `code`                                        | When                                                                                                                                |
| ------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `validation_failed`                           | Missing or wrong field, unknown field, a control/invisible character or an unpaired surrogate in a string field, empty `PATCH` body, reference to a missing record |
| 400    | `invalid_json`, `invalid_id`, `invalid_query` | Broken JSON, id is not a positive integer, bad or unknown `page`, `limit`, `sort` or filter, a repeated query key                   |
| 404    | `not_found`                                   | Unknown record or route                                                                                                             |
| 405    | `method_not_allowed`                          | Method not supported on a known path; the `Allow` header lists the right ones                                                       |
| 406    | `not_acceptable`                              | The `Accept` header cannot match `application/json`                                                                                 |
| 409    | `conflict`                                    | Deleting a user who owns projects or a project that has diagrams, or an email already used by another user (compared on its normalized, lower-cased form) |
| 409    | `quota_exceeded`                              | The collection already holds 5000 records (`POST`, or `/diagrams/:id/duplicate`)                                                    |
| 400    | `bad_request`                                 | Malformed URL, for example a broken percent escape                                                                                  |
| 415    | `unsupported_media_type`                      | Unknown `Content-Encoding`, or a charset other than UTF-8                                                                           |
| 413    | `payload_too_large`                           | Body over 100 KB                                                                                                                    |
| 429    | `too_many_requests`                           | More than 300 requests per minute from one address (`RATE_LIMIT_MAX`), the `Retry-After` header says when to retry                  |
| 500    | `internal_error`                              | Unexpected failure, logged on the server                                                                                            |

## Examples (curl)

List draft diagrams sorted by title descending, one per page:

```bash
curl "http://localhost:3000/api/diagrams?status=draft&sort=-title&limit=1"
```

```json
{
  "data": [
    {
      "id": 3,
      "title": "Billing database",
      "notation": "ERD",
      "code": "invoice 1--* line",
      "projectId": 2,
      "status": "draft",
      "createdAt": "2026-10-15T22:24:27.313Z"
    }
  ],
  "meta": { "page": 1, "limit": 1, "total": 2 }
}
```

Create a user (201, header `Location: /api/users/3`):

```bash
curl -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" \
  -d '{"name":"Grace Hopper","email":"grace@example.com","role":"editor"}'
```

Validation error (400):

```bash
curl -X POST http://localhost:3000/api/diagrams -H "Content-Type: application/json" \
  -d '{"title":"","notation":"XYZ","projectId":1}'
```

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Request body is invalid",
    "details": [
      { "field": "title", "message": "title must not be empty" },
      { "field": "notation", "message": "notation must be one of: UML, BPMN, ERD, DFD, IDEF0, Petri" }
    ]
  }
}
```

Partial update, publish, duplicate, delete:

```bash
curl -X PATCH http://localhost:3000/api/diagrams/2 -H "Content-Type: application/json" -d '{"status":"published"}'
curl -X POST http://localhost:3000/api/diagrams/2/publish
curl -X POST http://localhost:3000/api/diagrams/1/duplicate
curl -X DELETE http://localhost:3000/api/projects/1
```

The last call answers 409 `conflict`, "Project still has diagrams". In Postman or Insomnia, create a collection with these requests and the variable `baseUrl = http://localhost:3000/api`.

## OpenAPI

`GET /api/openapi.json` returns an OpenAPI 3.0 description of every route. It is built from the same schemas that validate the requests, with the list responses, the real 409s, the 15-digit `id`/`page` ceiling, and 406/429/an unexpected-error `default` on every operation. Open it in Swagger UI or import it into Postman.

## Known limitations

- **No authentication or authorization** (by design, out of scope for this practical). Every record and every field, including `role` on `users` and `ownerId` on `projects`, can be read and changed by anyone who can reach the server; there is no concept of "my own record". A real deployment needs a login and a per-request check of who is allowed to read or change what before this API is exposed beyond a classroom exercise.
- **The hidden `email` field can still be read directly.** The user list omits `email` so a casual listing does not expose it, but `GET /api/users/:id` still returns it (there is no authorization to restrict it to the user themselves), and the 409 on `POST /api/users` with a taken email confirms, one address at a time, that it belongs to an existing account. Closing this fully needs the same authentication/authorization this practical does not implement; without it, any generic message on the 409 only hides the exact wording, not the fact that a match was found.
