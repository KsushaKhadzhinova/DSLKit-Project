# DSLKit REST API

Base URL: `http://localhost:3000/api`. Requests and responses are JSON (`Content-Type: application/json`). Data lives in memory and resets when the server restarts. There is no authentication in this practical.

## Resources

| Resource   | Fields (type, rule)                                                                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`    | `name` (string, required, up to 60), `email` (string, required, valid format), `role` (`owner`, `editor`, `viewer`, default `viewer`)                                                                                                                                   |
| `projects` | `name` (string, required, up to 80), `description` (string, up to 500, default empty), `ownerId` (integer, required, must be an existing user)                                                                                                                          |
| `diagrams` | `title` (string, required, up to 80), `notation` (`UML`, `BPMN`, `ERD`, `DFD`, `IDEF0`, `Petri`, required), `code` (string, up to 10000, default empty), `projectId` (integer, required, must be an existing project), `status` (`draft`, `published`, default `draft`) |

Every record also has a read-only `id` and `createdAt`. Relations: a user owns projects, a project holds diagrams.

## Endpoints

Each resource has the same six operations, shown for `{res}` = `users`, `projects`, `diagrams`.

| Method   | URL          | Purpose                                | Success            | Errors        |
| -------- | ------------ | -------------------------------------- | ------------------ | ------------- |
| `GET`    | `/{res}`     | List with filter, search, sort, paging | 200 `{data, meta}` | 400           |
| `GET`    | `/{res}/:id` | One record                             | 200                | 400, 404      |
| `POST`   | `/{res}`     | Create                                 | 201 and `Location` | 400, 413      |
| `PUT`    | `/{res}/:id` | Replace the whole record               | 200                | 400, 404      |
| `PATCH`  | `/{res}/:id` | Change only the sent fields            | 200                | 400, 404      |
| `DELETE` | `/{res}/:id` | Delete                                 | 204 without a body | 400, 404, 409 |

Extra operations:

| Method | URL                       | Purpose                                                 | Success | Errors   |
| ------ | ------------------------- | ------------------------------------------------------- | ------- | -------- |
| `GET`  | `/projects/:id/diagrams`  | Diagrams of one project, same query options as lists    | 200     | 400, 404 |
| `POST` | `/diagrams/:id/publish`   | Set status to `published`; repeating it changes nothing | 200     | 400, 404 |
| `POST` | `/diagrams/:id/duplicate` | Copy a diagram as a draft titled "... (copy)"           | 201     | 400, 404 |

## List query parameters

| Parameter       | Meaning                                                   | Example            |
| --------------- | --------------------------------------------------------- | ------------------ |
| any field name  | Exact match filter                                        | `?status=draft`    |
| `q`             | Case-insensitive search in the string fields              | `?q=billing`       |
| `sort`          | Field name, a leading `-` means descending                | `?sort=-title`     |
| `page`, `limit` | Page number (from 1) and page size (1 to 100, default 20) | `?page=2&limit=10` |

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
| 400    | `validation_failed`                           | Missing or wrong field, unknown field, empty `PATCH` body, reference to a missing record                                            |
| 400    | `invalid_json`, `invalid_id`, `invalid_query` | Broken JSON, id is not a positive integer, bad `page`, `limit` or `sort`                                                            |
| 404    | `not_found`                                   | Unknown record or route                                                                                                             |
| 405    | `method_not_allowed`                          | Method not supported on a known path; the `Allow` header lists the right ones                                                       |
| 409    | `conflict`                                    | Deleting a user who owns projects or a project that has diagrams, or an email already used by another user (compared ignoring case) |
| 413    | `payload_too_large`                           | Body over 100 KB                                                                                                                    |
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
