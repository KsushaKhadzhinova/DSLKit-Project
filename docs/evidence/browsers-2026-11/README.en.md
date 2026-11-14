# Browser check of the clients of labs 5-8 (14.11.2026)

Russian version: [README.md](README.md).

Goal: real evidence that the clients of labs 5, 6, 7 and 8 work in Firefox and in Edge.

Environment: Windows 11, Playwright for Python 1.63.0, Firefox 155.0 (Playwright build), Microsoft Edge (`channel="msedge"`, installed on the machine), headless. Each run uses a fresh browser context at 1366x800 and at 390x844. Code is the tree of `main` (aac8566). Scripts: [scripts/](scripts/). Raw data of every run (steps, console errors, failed requests, HTTP answers 400 and above): `lab-0N/result.json`. Screenshots: `lab-0N/<browser>-<width>.png` (`msedge` is Edge).

## Result

| Lab                                                   | Browser | 1366 px | 390 px | Console errors                                  | Failed requests | Notes                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | ------- | ------- | ------ | ----------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5 React client + lab 3 API                            | Firefox | passed  | passed | 0                                               | 0               | register, sign in, create, edit, search, load more (20 -> 33 cards), delete                                                                                                                                                                             |
| 5                                                     | Edge    | passed  | passed | 0                                               | 0               | same                                                                                                                                                                                                                                                    |
| 6 MongoDB API (JSON, no page)                         | Firefox | passed  | passed | 6 per run, one kind                             | 0               | the browser opens the GET endpoints as JSON pages. The messages are Firefox reports that the Content-Security-Policy of the API blocks `/favicon.ico` (the API sends `default-src 'none'`). The expected 400 for `/diagrams/abc` is the only HTTP error |
| 6                                                     | Edge    | passed  | passed | 1 per run (the expected 400 of `/diagrams/abc`) | 0               | same                                                                                                                                                                                                                                                    |
| 7 WebSocket chat                                      | Firefox | passed  | passed | 0                                               | 0               | two separate contexts: login, join a room, room message, private message, reply; all arrived                                                                                                                                                            |
| 7                                                     | Edge    | passed  | passed | 0                                               | 0               | same                                                                                                                                                                                                                                                    |
| 8 Docker (Nginx 127.0.0.1:8080 -> /api -> PostgreSQL) | Firefox | passed  | passed | 0                                               | 0               | register, sign in, create, edit, reload (the diagram is still there), delete; 7 requests through the `/api` proxy                                                                                                                                       |
| 8                                                     | Edge    | passed  | passed | 0                                               | 0               | same                                                                                                                                                                                                                                                    |

## What is not covered or limited

- Lab 6 has no client page. A page cannot call the API of the lab with `fetch()` (CSP `default-src 'none'`, no CORS headers, by design), so create, patch, comment and delete were sent by the Playwright HTTP client of the context, not by the browser. Only the GET endpoints (`/health`, `/diagrams`, `/diagrams/:id`, `/count`, `/stats`, and the 400 for a bad id) were opened in the browsers. The check ran on an in-memory MongoDB, not on Atlas (the `.env` of the lab was not read).
- Lab 5 ran on SQLite (temporary file) with the seeded demo data, not on PostgreSQL. Lab 8 ran on PostgreSQL.
- Headless runs only, one engine version of each browser, no Safari, no real phone: 390 px is a viewport size, not a device. Edge is the Chromium build installed on this machine.
- Only the scenarios in the table were run; error pages and the dark theme were not checked.
- Not checked: Atlas, WebSocket behind a proxy, touch input.

## What failed during preparation

1. First Edge run of lab 8 at 1366 px: after "save" the script reloaded the page at once, the save request was aborted, and the old title came back. The page updates the list before the server answers. The script now waits for the PATCH answer (200) before the reload, and repeated runs pass in both browsers. This is a race in the check, but it also shows that a reload right after a save can lose the edit in Edge.
2. A later run hit the registration limit of the API (10 per hour per address, "Too many requests"): this is the lab 3 rate limit working. The backend container was restarted and the full run repeated. The committed results are from that clean full run.
3. The first attempt to start Firefox inside the sandboxed shell failed (`spawn UNKNOWN`); the runs were made from PowerShell.

## How the stacks were started

- Labs 3 + 5: `SQLITE_STORAGE` on a temporary file, `db:migrate`, `db:seed:all`, `CORS_ORIGIN=http://localhost:5178`, Vite on 5178, API on 3000. Random JWT secret and passwords in a file outside the repository.
- Lab 6: `mongodb-memory-server` + `server.js` on port 3006.
- Lab 7: `node server.js` on port 3007 (history in memory).
- Lab 8: `docker compose -p dslkit-evidence --env-file <outside the repo> up --build --wait`, then `down` without `-v`. The volume `dslkit-evidence_pgdata` was listed and removed with `docker volume rm`, plus the two images of this project. Other volumes, containers and images were not touched.

No secrets are in this folder: the scripts read the test password from the environment.
