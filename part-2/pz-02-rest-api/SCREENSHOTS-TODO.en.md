# Figures of the practical 2 report: all 21 are shots of real windows

Russian version: [`SCREENSHOTS-TODO.md`](SCREENSHOTS-TODO.md). There are no placeholders, `"final": true` is set in `report.meta.json`, so the report test rejects any placeholder.

- Figures 1 and 20 (`journal-table.png`, `console.png`) and 21 (`tests.png`): PowerShell in Windows Terminal. Figure 21 shows the end of `npm test` with `pass 179`, `fail 0` and the coverage table at 100 percent for every file of `src`, including `server.js` and `start.js`.
- Figures 2 to 4 and 6 (`error-404.png`, `error-429.png`, `error-500.png`, `api-docs.png`) and 14 to 19 (`02-users-list.png` to `07-user-projects.png`): Chrome with the address bar, a guest profile.
- Figures 5 and 7 to 13 (`postman-403.png`, `postman-get.png` to `postman-validation.png`): the Postman window, the top of the window (workspace name, banner, tabs) is cropped. The Body tab is open for POST, PUT and PATCH, the Headers tab for the 403.

How: `node shots/real-shots.mjs` (ports 4230 to 4236, an unlocked screen is needed, `shots/window-shot.ps1` captures the window). The console shots are taken from `E:\DSLKit\part-2\pz-02-rest-api` (a copy without the worktree path). The Postman requests were made by pasting a cURL command into the address field and pressing Send. Figure 21 was taken after the fix of the server start test (`src/start.js`); the earlier version showed `server.js` at 84.62 percent in a console window.

## Open questions

1. The error pages in the figures are in English (`src/error-catalog.js`).
2. Figure numbers run through the report; the samples number them by section.
3. The branch `pz22` comes from `report.meta.json`; the owner creates it.
4. Swagger UI is not part of the app; figure 6 shows the OpenAPI document itself.
5. Figure 21 does not show the first line `tests 179`: it scrolled off the top of the window.

The browser figures 14 to 19 stand in the order `02-users-list.png`, `03-user-one.png`, `06-diagrams-search.png`, `07-user-projects.png`, `04-user-404.png`, `05-user-400.png`, so that the pages fill better. `console.png` and `journal-table.png` are cropped at the bottom to the content of the window.
