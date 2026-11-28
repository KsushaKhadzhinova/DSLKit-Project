# Figures of the practical 2 report: what is done, what is left

Russian version (the exact steps): [`SCREENSHOTS-TODO.md`](SCREENSHOTS-TODO.md).

## Done from the real server (20 figures of 21)

All of these are shots of real windows, nothing is drawn by a script: figure 1 `journal-table.png` and figure 20 `console.png` (PowerShell in Windows Terminal), figures 2 to 4 and 6 `error-404.png`, `error-429.png`, `error-500.png`, `api-docs.png` and figures 14 to 19 `02-users-list.png` to `07-user-projects.png` (Chrome with the address bar, an empty profile), figures 5 and 7 to 13 `postman-403.png`, `postman-get.png` to `postman-validation.png` (the Postman window).

How: `node shots/real-shots.mjs` (ports 4230 to 4236, an unlocked screen is needed, `shots/window-shot.ps1` captures the window). The Postman requests were made by driving the Postman window: a cURL command was pasted into the address field and Send was pressed. The Postman window shows the owner's workspace name.

## Left for the owner (1 placeholder file)

`owner-tests.png` (figure 21): `npm test` in `part-2/pz-02-rest-api`, the end of the output with the test counts and the coverage table. The file is a **placeholder** (orange card with the mark `dslkit-placeholder`), not a screenshot. It was not captured because the coverage is unstable (below), and the report says 100 percent. After replacing it add `"final": true` to `report.meta.json` and run `node tools/docx-cli.js part-2/pz-02-rest-api` from the repository root. The number of tests in the window should be 176; otherwise fix it in section 3.10 of both templates and rebuild.

## Finding for the owner of the PZ2 code: unstable coverage

`npm test` sometimes misses the 100 percent branch threshold (99.75 percent in 3 of 9 runs). In a Windows Terminal window `server.js` gave 84.62 percent every time (lines 20 to 23, the signal handlers), in the tool shell 100. A likely cause is the test `server.js starts on the given port`, which starts the server as a child process and ends it by force, so the child coverage is not always written. The PZ2 code was not changed in this task.

## Open questions

1. The error pages in the figures are in English (`src/error-catalog.js`).
2. Figure numbers run through the report; the samples number them by section.
3. The branch `pz22` comes from `report.meta.json`; the owner creates it.
4. Figure 6 shows the OpenAPI description as one line; Swagger UI is not part of the app.
5. The Postman shots do not show the Body tab of POST, PUT and PATCH, only the method, address, status code and response body.
