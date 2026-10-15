# Practical Session 2. Design and Implementation of a REST API

## 1 Purpose of the Work

To learn the principles of designing a RESTful API, to implement endpoints for CRUD operations and extra operations, to add input validation and to document the API, using the DSLKit project, a diagram-as-code web editor whose theme matches the SaaS direction and the future course project.

## 2 Brief Theory

**Resources and methods.** REST describes the subject area as a set of resources with plural addresses such as `/api/diagrams`. Operations map to HTTP methods: `GET` reads, `POST` creates, `PUT` replaces a record entirely, `PATCH` changes part of the fields, `DELETE` removes. The methods `GET`, `PUT` and `DELETE` are idempotent: repeating a request does not change the result.

**Status codes.** Code 200 means success, 201 creation with a `Location` header, 204 success without a body, 400 a client error in the request, 404 a missing record, 409 a conflict with the current state of the data, 413 a body that is too large, 500 a server failure.

**Data validation.** The server does not trust the client: required fields, types, length and allowed values are checked before writing, and an error response has a single format.

## 3 Course of the Work

### 3.1 API design

Three related resources are chosen: users `users`, projects `projects` and diagrams `diagrams`. A user owns projects and a project holds diagrams. Table 1 lists the fields.

Table 1 – API resources and fields

| Resource   | Fields                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| `users`    | `name`, `email`, `role` (`owner`, `editor`, `viewer`)                     |
| `projects` | `name`, `description`, `ownerId`                                          |
| `diagrams` | `title`, `notation`, `code`, `projectId`, `status` (`draft`, `published`) |

Every record has the service fields `id` and `createdAt`, which the client cannot change. The data lives in arrays in memory, as the task requires, so the initial records return after a server restart.

### 3.2 Endpoints

Each resource has six standard operations, and diagrams and projects have three extra ones. Table 2 lists all addresses.

Table 2 – API endpoints

| Method and address                 | Purpose                                   | Success |
| ---------------------------------- | ----------------------------------------- | ------- |
| `GET /api/{resource}`              | List with filter, search, sort and paging | 200     |
| `GET /api/{resource}/:id`          | One record                                | 200     |
| `POST /api/{resource}`             | Create                                    | 201     |
| `PUT /api/{resource}/:id`          | Full replacement                          | 200     |
| `PATCH /api/{resource}/:id`        | Partial change                            | 200     |
| `DELETE /api/{resource}/:id`       | Delete                                    | 204     |
| `GET /api/projects/:id/diagrams`   | Diagrams of one project                   | 200     |
| `POST /api/diagrams/:id/publish`   | Publish, repeating changes nothing        | 200     |
| `POST /api/diagrams/:id/duplicate` | Copy of a diagram as a draft              | 201     |

Lists accept `page` and `limit` for paging, `sort` for sorting (a minus sign means descending), `q` for search in text fields and any field name for an exact filter. A list response holds the array `data` and the object `meta` with the total count. The file `API.md` collects detailed request and response examples.

### 3.3 Validation and errors

The schema of every resource sets the type, whether the field is required, the maximum length, the list of allowed values and the default. Validation returns all problems at once, rejects unknown fields and checks that `ownerId` and `projectId` point to existing records. The `PATCH` method checks only the sent fields. Deleting a user who owns projects or a project that has diagrams is rejected with code 409. All errors, including broken JSON, an unknown address and an unexpected failure, come back in one format with the fields `code` and `message`. Appendices A and B hold the listings.

### 3.4 Verification

Automatic tests start the server on a free port and check every method, the status codes, filters, sorting, paging, validation errors, the links between resources, the extra operations and the 500 response. Line and function coverage is 100 percent and branch coverage is above 99 percent. The command is `npm test` in the project folder. Manual checks in Postman or Insomnia can use the requests from `API.md`.

## Conclusion

For the DSLKit project a REST API with three related resources was designed and implemented. It supports CRUD operations, filtering, search, sorting, paging, publishing and copying of diagrams, validates input and the links between records, and answers with errors in one format. `API.md` holds the API description and request examples, and automatic tests cover all the code. Postman screenshots and documentation excerpts remain to be attached.

## Appendix A – Listing of the file app.js

{{code:part-2/pz-02-rest-api/src/app.js}}

## Appendix B – Listing of the file resource.js

{{code:part-2/pz-02-rest-api/src/resource.js}}

## Appendix C – Listing of the file validation.js

{{code:part-2/pz-02-rest-api/src/validation.js}}
