# Figures of the practical 2 report: what is done, what the owner must take

Russian version: [`SCREENSHOTS-TODO.md`](SCREENSHOTS-TODO.md) (the exact steps are kept there).

## Done from the real server (figures 2, 3, 4, 13 to 18)

`shots/shots.mjs` starts the server on ports 4230 to 4232, opens pages in a headless Edge window and saves the shots (no address bar is visible). Files: `error-404.png`, `error-429.png` (limit of 3 requests a minute), `error-500.png` (journal table dropped under the running server), `02-users-list.png`, `03-user-one.png`, `04-user-404.png`, `05-user-400.png`, `06-diagrams-search.png`, `07-user-projects.png`.

## The owner must take (11 placeholder files)

These files in `figures/` are **placeholders** (an orange card with the word "ЗАГЛУШКА" and the mark `dslkit-placeholder` inside the PNG), not screenshots. Replace each under the same name. When none is left, add `"final": true` to `report.meta.json`, so the report test fails on any placeholder, then run `node tools/docx-cli.js part-2/pz-02-rest-api` from the repository root. Whole window, width up to 1280 px, height up to 60 % of a page, the URL and the result visible.

| File | Figure | Program | Action |
|---|---|---|---|
| `owner-journal-table.png` | 1 | DB Browser for SQLite or DBeaver | `SELECT * FROM request_log ORDER BY id DESC LIMIT 15;` on `journal.sqlite`, columns method, path, status, request_id, no `/health` rows |
| `owner-error-403.png` | 5 | Postman | `DELETE http://localhost:3000/api/projects/1` with the header `X-User-Id: 2`, answer 403 |
| `owner-postman-get.png` | 6 | Postman | `GET /api/users`, 200 |
| `owner-postman-post.png` | 7 | Postman | `POST /api/diagrams`, raw JSON body `{"title":"Billing schema","notation":"ERD","code":"invoice -> payment","projectId":1}`, 201 |
| `owner-postman-put.png` | 8 | Postman | `PUT /api/users/2`, body `{"name":"Alan T","email":"alan@example.com","role":"editor"}`, 200 |
| `owner-postman-patch.png` | 9 | Postman | `PATCH /api/users/1`, body `{"role":"editor"}`, 200 |
| `owner-postman-delete.png` | 10 | Postman | `DELETE /api/diagrams/2`, 204 with no body |
| `owner-postman-delete-409.png` | 11 | Postman | `DELETE /api/users/1`, 409 |
| `owner-postman-validation.png` | 12 | Postman | `POST /api/users`, body `{"name":"","email":"x"}`, 400 with `details` |
| `owner-console.png` | 19 | PowerShell | `npm start`, then two requests; the line "DSLKit REST API listens on http://localhost:3000/api" |
| `owner-tests.png` | 20 | PowerShell | `npm test`; end of the output with `tests 176`, `pass 176`, `fail 0` and the 100 % coverage table |

If the number of tests in the window is not 176, fix the number in section 3.10 of both templates and rebuild: `node tools/build.js part-2/pz-02-rest-api`.

## Open questions the report does not close

1. The error pages are in English (`src/error-catalog.js`); the report says so in 3.6. Russian pages need a separate code task.
2. Figure numbers run through the whole report; the samples number them by section.
3. The branch `pz22` and the repository link come from `report.meta.json`; the owner creates the branch.
