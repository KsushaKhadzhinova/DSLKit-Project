# Quality checks and CI

Russian version: [`CI-CHECKS.md`](CI-CHECKS.md).

Branching: GitHub Flow and trunk-based. `main` is always green, every change is a short-lived branch from `origin/main` through a pull request.

## What is checked on every push and pull request

| Check                             | Where                                       | What breaks the build                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint (`npm run lint`)           | job `test`                                  | undefined and unused names, `var`, loose equality, empty blocks, regular expression mistakes                                                                                                            |
| Prettier (`npm run format:check`) | job `test`                                  | any difference from the format                                                                                                                                                                          |
| Site tests (`npm test`)           | job `test`                                  | a failing test or coverage below 100% of lines, branches and functions; the coverage explicitly includes every file of `site/js` and `tools`, also those no test loaded                                 |
| `npm audit --omit=dev`            | job `test`                                  | a high vulnerability in the libraries that reach the user                                                                                                                                               |
| Work folders (`part-2/*`)         | job `work-folders`, 12 folders in parallel  | the tests of every lab and practical, the reports, `npm audit`                                                                                                                                          |
| Site build                        | job `build`                                 | a build error                                                                                                                                                                                           |
| React app                         | job `react`                                 | tests and build                                                                                                                                                                                         |
| Browser e2e (Playwright)          | job `e2e`                                   | any scenario not Passed, or a dirty tree after the run                                                                                                                                                  |
| CodeQL (`security-and-quality`)   | `security.yml`, also weekly                 | static security findings                                                                                                                                                                                |
| Dependency review                 | `security.yml`, pull requests only          | a new dependency with a high vulnerability                                                                                                                                                              |
| Memory leaks                      | `leaks.yml`, pull requests, weekly, by hand | the heap of a server after 2000 requests or 500 sockets grows above the limit, a handle stays open after `close()`, the editor or the dashboard keeps DOM nodes, listeners or documents after 50 cycles |

Everything locally at once: `npm run verify` (lint, format, tests).

## Memory leak checks

Separate from `npm test` because they are slow and need `node --expose-gc`. Workflow `.github/workflows/leaks.yml` runs them on pull requests, every Monday and by hand.

- Node: `npm run test:leaks` in `part-2/lab-01-node-server`, `lab-02-sequelize`, `lab-03-auth`, `lab-06-mongodb`, `lab-07-websocket`, `pz-01-middleware-ejs`, `pz-02-rest-api` (a matrix of 7 jobs). Each test starts the real app in the process and sends 2000 requests (reads, create then delete, a rejected body, a 404); lab 7 also connects, chats and disconnects 500 socket clients. The helper `tools/leaks/heap-growth.js` (tested to 100%) forces a garbage collection, reads `heapUsed` after a warmup and at 5 further points, and compares the last reading with the first. After `server.close()` the test compares `process.getActiveResourcesInfo()` with the list taken before the start: no socket, server or timer may stay. Lab 7 also checks that no client, socket, room or extra listener stays on the server.
- Browser: `python testing-course/full/leaks-e2e.py` (Chromium or Edge, one browser) opens and closes the five panels of the editor, switches all notations, redraws the diagram and opens and cancels the rename and delete dialogs of the dashboard, 50 cycles each. Before and after, the garbage is collected and the DevTools protocol is asked for `Memory.getDOMCounters` (nodes, listeners, documents) and `Runtime.getHeapUsage`.
- `LEAK_ITERATIONS`, `LEAK_WARMUP`, `LEAK_SOCKETS` and `LEAK_CYCLES` change the sizes for a quick local try.

Limits are twice the largest growth measured over three runs (Windows, Node 24, Edge), and never below the noise floor:

| Check                          | Measured (largest of 3 runs)                          | Limit                                       |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------- |
| lab 1, 2000 requests           | 202 KB                                                | 500 KB                                      |
| lab 2, lab 3, practical 1      | below 0 (the heap after the run is smaller)           | 500 KB                                      |
| lab 6                          | 232 KB                                                | 500 KB                                      |
| lab 7, 2000 HTTP requests      | 390 KB                                                | 800 KB                                      |
| lab 7, 500 socket clients      | 280 KB (the history keeps 50 messages per room)       | 600 KB                                      |
| practical 2                    | 238 KB                                                | 500 KB                                      |
| editor and dashboard (browser) | 32 DOM nodes (once), 0 listeners, 0 documents, 195 KB | 100 nodes, 20 listeners, 0 documents, 1 MiB |

A growth that does not repeat is not a leak: lab 7 with 500 sockets keeps about 270 KB and with 2000 sockets 440 KB, because the chat history is bounded and fills first. Real leaks found: none. A deliberately added leak (1 KB per request, a listener per cycle) fails the tests, so the checks do react.

## What is not checked automatically

Live Atlas and Gemini (secrets are needed), real Postman, Docker Desktop and devices. They stay manual and are listed in `docs/STATUS-CHECKLIST.md`.
