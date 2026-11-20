# Firefox and Edge check of part 1 and practicals of part 2 (19.11.2026)

Русская версия: [README.md](README.md).

Status: partial. The run is not complete. The Edge run of the scripts produced no results, and the practicals and the course client were not checked with scenarios.

## What was run

| Work                                             | Browser         | Width     | Result                              | Console errors | Notes                           |
| ------------------------------------------------ | --------------- | --------- | ----------------------------------- | -------------- | ------------------------------- |
| e2e auth (testing-course/full)                   | Firefox         | 1366, 390 | 7 of 29                             | not collected  | most: Timeout 8000 ms on `goto` |
| e2e critical-path                                | Firefox         | 1366      | 1 of 21                             | not collected  | same cause                      |
| e2e extra                                        | Firefox         | 1366      | 2 of 11                             | not collected  | same cause                      |
| e2e editor, scenarios, palette, click-everything | Firefox         | -         | not completed                       | -              | run interrupted                 |
| all e2e                                          | Edge (`msedge`) | -         | not done                            | -              | `e2e/edge` folder is empty      |
| Home page load, `probe.py`                       | Firefox         | 1366      | loaded in 4.7 s, no failed requests | -              | `browser.close` hung (exit 124) |
| pz-01, pz-03, pz-04, lab-04, course client       | -               | -         | not checked with scenarios          | -              | servers started, see below      |

Servers started by hand: site `tools/serve.js site 5173`; pz-01 on 3000; lab-04 on 5175; pz-03 on 5176; pz-04 on 5177; course server on 3100 (SQLite in a temporary file, no `.env`); course client on 5178. All returned HTTP 200 on the home page.

## Defects and causes

1. Main problem of the runs: `Page.goto` timeouts after 8 s. A single Firefox probe loaded the home page in 4.7 s, so the main cause is machine load (parallel processes), not the site. The scripts were not changed. Re-run on an idle machine or with a longer timeout.
2. `probe.py`: after the work, Firefox `browser.close` does not return. A script run in Firefox may hang on exit.
3. `testing-course/full/e2e_env.py`: added the `E2E_BROWSER=firefox` branch (`p.firefox.launch()`). This is the only code change in this work.

## Not checked

Edge in every scenario; practicals pz-01 (CSRF, error pages), pz-03 (guards and roles), pz-04 (undo/redo), lab-04; course client (login, create, edit, search, filter); 1366 and 390 px in the apps; light and dark themes; PWA and offline service worker; structured data. No screenshots were taken for these items.

## Files

- `e2e/firefox/` — JSON results and logs of the Firefox runs, `shots/` — failure screenshots.
- `scripts/probe.py` — home page load time and failed requests check.
