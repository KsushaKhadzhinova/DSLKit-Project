# Specialist 05. Performance and load: test plan and checklist

Version of 6 November 2026, branch `testing-course-full`. Russian version: [`05-performance.md`](05-performance.md). General strategy: [`../01-test-strategy.en.md`](../01-test-strategy.en.md).

## 1. Role and scope

The performance engineer owns speed, memory and stability under load. The role does not check whether a diagram is drawn correctly (functional cases do that) but how fast it is drawn, what it costs in memory and what happens when there is a lot of data or many requests.

In scope: the pages and the editor (`site/`), the own drawing engine in the browser, the external Kroki (Graphviz, Mermaid, PlantUML), the own API `/api/render` (`tools/render-api.js`), the service worker `site/sw.js` (cache `dslkit-v5`, 29 shell files) and the PWA, the autosave every 1000 ms (`source-autosave.js`), localStorage (code, projects, a Kroki cache of 20 entries with a 24 h TTL, a history of 5 runs), the 33 examples, the Part 2 servers (lab 1 REST, lab 7 WebSocket on socket.io, the course project with PostgreSQL) and the lab 8 Docker stack. Out of scope: security and accessibility (specialists 03 and 04) and load on the public `kroki.io` (the strategy forbids it, a local Kroki is needed).

About the engine. A diagram is an SVG, and Canvas is used only to export PNG (`site/js/utils/exporters.js`). Dropping a block writes `pos=XxY` into the code and redraws the whole diagram (`canvas-drag.js`). So "SVG against Canvas FPS" comes down to two questions: how many frames dragging and zooming the SVG gives and what a PNG export through Canvas costs.

## 2. What it checks (priorities P0-P3)

| Priority | What counts as a defect                                                                         | Examples for DSLKit                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| P0       | Hang, crash or data loss on a valid input                                                       | 150 blocks take 20.1 s, 300 blocks did not finish in 60 s, `/api/render` on 500 vertices 9.5 s and static pages stall |
| P1       | A metric worse than the "good" threshold or the budget, a memory leak, no recovery after a peak | LCP above 2.5 s, INP above 200 ms, heap growth in a long session, a red spike test                                    |
| P2       | A noticeable but non-blocking degradation                                                       | slow cold load on a slow network, response time growing under light load                                              |
| P3       | Cosmetics of the measurements and small optimizations                                           | extra requests, no `preload`                                                                                          |

A broken Web Vitals "good" threshold is at least P1. A broken "proposal" with no effect for the user is P2.

## 3. Plan

### 3.1 Goals

1. Get the real numbers that do not exist yet: Lighthouse with the performance category per page, first render time for 10/100/1000/5000 nodes, drag and zoom FPS, the cost of adding and removing edges.
2. Find the size beyond which the editor is unusable and record it as a limit or a warning.
3. Check a long session: memory, autosave, localStorage, service worker.
4. Make the Part 2 load tests reproducible and add smoke, load, stress, spike and soak where they are missing.

### 3.2 What is already measured (baseline)

| Source                                                                                                    | Result                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/testing-kulikov/scripts-ui/perf.json` (limit 8 s)                                                   | 30 blocks 1.5 s, 80 blocks 6.0 s, 150 blocks 20.1 s (Fail), 300 blocks timeout 60 s (Fail). From 80 to 150 blocks n grew 1.9 times and time 3.35 times: growth is close to quadratic                                                      |
| `paper-its/bench/*.csv` (i5-1035G1, 8 threads, 23.8 GB, Node 24.13.1, 11 runs without the first, seed 42) | 50,000 nodes: parse 604 ms, hit test under the cursor median 1446 us (brute force) and 1.3 us (grid), grid build 69 ms, about 190 visible nodes in the window                                                                             |
| `testing-course/full/static-sec-perf.json`                                                                | weight by direct links: `/` 33.5 KB, editor 36.5 KB, dashboard 14.7 KB, `/en/` 30.7 KB (ES module imports are not counted, so this is understated)                                                                                        |
| `docs/metrics/lighthouse-*` (Lighthouse 13.4.1, RTT 150 ms, 1638 kbit/s, CPU 4 times slower)              | landing (mobile) and editor (desktop), the performance category is NOT included, CLS 0 and 0.002, editor SEO 0.54                                                                                                                         |
| `labs/08-frontend-testing/report.md` (Lighthouse 13.5.0)                                                  | The Part 1 lab 8 React app without network throttling: performance 100, FCP 352 ms, LCP 352 ms, CLS 0, TBT 0                                                                                                                              |
| `docs/testing-kulikov/80-break-report.md`                                                                 | B-02 API: 500 vertices 9.5 s, 1000 vertices 50 s. B-09: typing into 100 KB blocks 232 ms, 400 KB about 15 s. B-05, B-06: project limit and a full localStorage                                                                            |
| `part-2/*/tests/stress.test.js`                                                                           | Lab 1 p95 below 1500 ms (3000 reads, 50 clients), lab 7 150 clients, course project 600 reads p95 below 3000 ms. Audit of 29 Oct 2026: red `spike: 1000 sockets` and `spike: 400 raw sockets`, the course project not confirmed (timeout) |

### 3.3 Metrics and thresholds

The "good" thresholds come from Web Vitals, the rest are marked "proposal" and need the owner's agreement.

| Metric                                                    | Threshold                                                       | Status                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| LCP                                                       | at most 2.5 s                                                   | Web Vitals, good                                        |
| CLS                                                       | at most 0.1                                                     | Web Vitals, good                                        |
| INP                                                       | at most 200 ms                                                  | Web Vitals, good                                        |
| FCP, TBT                                                  | at most 1.8 s and at most 200 ms                                | proposal (web.dev and Lighthouse guidance)              |
| Lighthouse performance score                              | at least 90 on every page                                       | proposal                                                |
| Page weight, file size, `editor.html` delivery p95        | 1500 KB, 500 KB, 100 ms                                         | already set in `static-sec-perf.js`                     |
| Editor JS and CSS                                         | record a baseline, then at most +10 %                           | proposal                                                |
| First render of 10 / 100 / 1000 nodes                     | 300 ms / 1 s / 3 s                                              | proposal                                                |
| 5000 nodes                                                | within 10 s or a clear refusal within 1 s, tab stays responsive | proposal                                                |
| Drag and zoom                                             | at least 30 frames/s on 100 nodes and 15 on 1000                | proposal                                                |
| Adding or removing an edge (from the edit to the picture) | within 200 ms on 100 nodes and within 1 s on 1000               | proposal                                                |
| localStorage write on the main thread                     | within 16 ms for code up to 100 KB                              | proposal                                                |
| Heap growth after 500 cycles and garbage collection       | at most 10 %, detached DOM nodes 0                              | proposal                                                |
| `/api/render` under load                                  | p95 within 1 s, errors 0, static pages p95 within 500 ms        | proposal (the course project already has p95 below 3 s) |
| Server heap over a soak                                   | growth at most 10 % after the plateau                           | proposal (lab 1 and 7 tests already use below 150 MB)   |

Browser profiles. N0 no limits and CPU 1x. N1: RTT 150 ms, 1638 kbit/s down, 675 kbit/s up, CPU 4x (as in `docs/metrics/lighthouse-*`). N2 (proposal): RTT 400 ms, 400 kbit/s, CPU 6x. N3 offline. N4 (proposal): a request neither fails nor answers.

### 3.4 Load scenarios

All load figures are proposals except those taken from existing tests. VU means concurrent clients.

| Target                        | Kind                             | Profile                                                                         | Success criterion                                                                              |
| ----------------------------- | -------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /api/render`            | smoke                            | 1 VU, one example of each of the 33 notations                                   | all 200 and `<svg`, errors 0                                                                   |
| `POST /api/render`            | load                             | 20 VU, 5 min, mix of examples                                                   | p95 within 1 s, errors 0, static pages in parallel p95 within 500 ms                           |
| `POST /api/render`            | stress                           | steps of 10, 20, 50, 100, 200 VU for 2 min, then graphs of 200 and 500 vertices | find the knee (p95 above 3 s or errors above 1 %), server stays alive                          |
| `POST /api/render`            | spike                            | 5 VU, jump to 200 in 5 s, 1 min, back                                           | no 5xx and no dropped connections, p95 back to baseline within 30 s                            |
| `POST /api/render`            | soak                             | 20 VU, 1 h (4 h preferred)                                                      | RSS and heap on a plateau, descriptors do not grow, p95 does not grow                          |
| `POST /api/render`            | boundaries                       | 99,999, 100,000, 100,001 characters, 2000 and 2001 lines                        | 200, 413 or 422 quickly, server alive                                                          |
| Local Kroki                   | smoke, load                      | 1 and 10 VU, 3 min, graphviz, mermaid, plantuml                                 | answer within 10 s (client timeout), on 5xx and 429 retries after 300, 600, 1200 ms            |
| Lab 1 REST                    | load, stress, spike              | 3000 reads at 50 VU, 100 VU of mixed calls, 1000 sockets                        | no 5xx, p95 below 1500 ms, a 200 answer after the peak                                         |
| Lab 7 WebSocket               | smoke, load, stress, spike, soak | 150 clients, 60 times 20 events, 400 raw sockets, 400 cycles                    | the broadcast reached everyone, server alive, heap below +150 MB, rooms empty after disconnect |
| WebSocket with default limits | flood                            | a client sends faster than `rateMax` 5 per 2000 ms                              | the client is limited, neighbours unaffected (lab 7 tests raise the limits to 1000 and 100000) |
| Course project (Express + DB) | load, volume                     | 600 reads at 30 VU, 600 comments in pages of 100                                | p95 below 3 s, exact `X-Total-Count`, no gaps or repeats                                       |
| Lab 8 Docker stack            | soak, stress                     | reads and writes through the Nginx `/api`, 30 min                               | db and backend below 512 MB, frontend below 128 MB, processes below the limit, restarts 0      |

### 3.5 Environment, method, entry and exit

Environment. Measure the built version (`npm run build`, `npm run start:prod`) and keep a separate "development" row (`npm start`, serves `site/`). The machine is idle (the audit of 29 Oct 2026 produced timeouts because of parallel processes) and on mains power. Record CPU, cores, RAM, OS, Node, browser and Lighthouse versions, the commit, the command, the server mode and the machine load (see `paper-its/bench/env.json`).

Method. Micro-benchmarks: 11 runs, drop the first. Page measurements: 5 runs, median and spread. API: compute p95 from 100 requests or more. Cold cache: a fresh profile with no service worker. Warm: after the first visit. A third variant: after a cache version bump. Change one factor at a time: size, edge count, network, CPU. Judge growth by the time ratio when the size doubles (2 linear, 4 quadratic). The load client and the server share the machine CPU, record that as a limitation.

Entry. The build exists, the server answers, the environment is recorded, functional P0 cases pass, the large diagram generators are ready. Exit. Every metric in 3.3 is measured at least 5 times and entered in the table of section 6, no open P0, every P1 has an owner decision, the unstable Part 2 tests are stable on three runs in a row or the cause is described with the environment data.

### 3.6 Risks

| Risk                                                                         | What to do                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Load on `kroki.io` gets us blocked                                           | local Kroki in Docker only, single requests to the public one                   |
| The server is single-threaded and a heavy request stalls static pages (B-02) | measure static pages in parallel, P0 until worker threads exist                 |
| Part 2 tests raise the limits and never see the real ones                    | separate scenarios with default limits (`maxPerAddress` 20, `maxUsers` 200)     |
| Raw sockets depend on OS descriptor limits                                   | record the OS limit, repeat in Docker or on another machine                     |
| Background noise, pages behind login, localStorage state                     | 5 runs, a profile with a session and `--disable-storage-reset`, a clean profile |

## 4. Checklist

### A. Web Vitals and Lighthouse

- [ ] A1. Run Lighthouse with the performance category for `/`, `/en/`, `app/dashboard`, `editor`, `settings`, `welcome`, `login`, `register`, `docs`, `expert`, `decision`, `privacy`, `thanks` and for `en/app/editor`, `en/app/dashboard`.
- [ ] A2. Mobile and desktop settings, 5 runs each, the median goes into the report.
- [ ] A3. LCP at most 2.5 s and CLS at most 0.1 on every page under profile N1, including the consent banner, the tour and the toast appearing.
- [ ] A4. INP at most 200 ms on actions: typing into code, switching tabs, the menu, changing theme (`PerformanceObserver` for `event` through Playwright).
- [ ] A5. FCP, TBT and the score are recorded, deviations from the proposed thresholds are filed as P2.
- [ ] A6. Cold and warm cache are measured separately, the difference is explained by the service worker.
- [ ] A7. For pages behind login a session is prepared and the page does not redirect to `login`.
- [ ] A8. Critical path: request count, blocking CSS and JS, the load order of `script.js`. The result is compared with `docs/metrics/lighthouse-*` and lab 8.

### B. Size budget

- [ ] B1. Page weight including imported ES modules (`static-sec-perf.js` does not count them), at most 1500 KB, no file above 500 KB.
- [ ] B2. Transfer size with and without compression (`Content-Encoding`), check whether the server compresses.
- [ ] B3. `site/js/docs/content.ru.js` (about 114 KB) and `content.en.js` (about 76 KB) load only on the documentation page.
- [ ] B4. The size of `dist/` after the build, the request count and the third-party share per page are recorded as a baseline, editor JS or CSS growth above 10 % is P1.
- [ ] B5. Images: format, size, `width` and `height` attributes (they affect CLS), lazy loading off screen.
- [ ] B6. `Cache-Control` and `ETag` of static files, a repeated request answers 304.

### C. First render by size

- [ ] C1. Graph generators for 10, 100, 1000, 5000 nodes (based on `genDSL` in `paper-its/bench/bench.mjs` and `perf.py`) for `dag` and `graph`, with 1, 1.5 and 3 edges per node.
- [ ] C2. Time from the paste to 90 % of blocks in the DOM (as in `perf.py`) and to the first frame (`requestAnimationFrame`), median of 5 runs.
- [ ] C3. A table of "nodes, time, ratio on doubling", confirm or refute the quadratic growth from 3.2.
- [ ] C4. The size above which time exceeds 8 s (the `perf.py` limit) and 3 s (proposal) is recorded as a recommended limit.
- [ ] C5. 5000 nodes: either a render within 10 s or a clear message, the tab stays responsive, the console has no errors.
- [ ] C6. Time for each of the 33 templates, the slowest ones highlighted.
- [ ] C7. Parse, layout and DOM separately (DevTools trace), compared with `paper-its/bench` (parse of 50,000 nodes 604 ms).
- [ ] C8. Local Kroki (graphviz, mermaid, plantuml) at the same sizes, cold and from the localStorage cache.
- [ ] C9. The own engine against `POST /api/render` on the same inputs.

### D. Interactivity

- [ ] D1. FPS and long task count when dragging a block on 10, 100, 1000 nodes (DevTools trace). Note that dropping a block redraws the whole diagram.
- [ ] D2. FPS and latency when zooming and scrolling the canvas.
- [ ] D3. Cost of adding an edge (a line `a -> b`) on 100 and 1000 nodes: time to the updated picture, median and p95 of 100 repeats.
- [ ] D4. Cost of removing an edge at the same sizes, and the dependence on edge count with a fixed node count.
- [ ] D5. Typing one character into code of 10, 100, 400 KB: main thread blocking (B-09: 232 ms and 15 s), repeat after the fix.
- [ ] D6. Number of redraws during 5 seconds of typing, no redundant ones.
- [ ] D7. PNG (Canvas) and SVG export on 100 and 1000 nodes: time and memory peak.
- [ ] D8. Compare with Canvas drawing only if it appears, for now record the conclusion "Canvas is not used for display".

### E. Memory and leaks

- [ ] E1. A 30 minute session (2 hours preferred): typing, redraws, switching projects, opening and closing files, heap snapshots at the start, at 15 and 30 minutes after garbage collection, growth at most 10 %.
- [ ] E2. 500 cycles of "edit and redraw" on 100 nodes: heap, DOM node and listener counts, detached nodes 0.
- [ ] E3. Edit history: does memory grow linearly (B-09: a full snapshot per change), is there a cap.
- [ ] E4. The autosave `MutationObserver` and the drag handlers do not pile up when the project changes.
- [ ] E5. Three rounds over the 33 projects: the heap returns to the starting level.
- [ ] E6. Peak memory on 1000 and 5000 nodes, CPU use of a background tab.

### F. Autosave and localStorage

- [ ] F1. Continuous typing at 5 characters per second for 60 seconds on code of 1, 10, 100 KB: write count and main thread write time at most 16 ms.
- [ ] F2. The save timer is reset on every change: record how long typing goes without a write when pauses are shorter than 1000 ms, estimate the loss if the tab crashes and propose a maximum delay.
- [ ] F3. Fill the storage to 50, 80, 95, 100 % (about 5 MB per B-06): autosave, projects, cache and history behave predictably.
- [ ] F4. With a full storage the message "Not saved: the browser storage is full" is shown and the code stays in the editor.
- [ ] F5. The Kroki cache (20 entries) and the history (5) do not evict projects, an overflowing cache does not break drawing.
- [ ] F6. The dashboard with 33, 200 (B-05) and 1000 projects: storage volume and open time.
- [ ] F7. Two tabs write the key `editor-source`: no losses and no frequent conflicts (see B-04).
- [ ] F8. The `navigator.storage.estimate()` quota is recorded for Chrome, Edge, Firefox. Ctrl+S and "Save" write at once.

### G. Offline, service worker, network and CPU

- [ ] G1. The first visit installs `sw.js` (`dslkit-v5`), the cache holds 29 files, the install time is recorded.
- [ ] G2. Offline the shell pages open (RU, EN), the editor draws with the own engine, Kroki shows the "No internet connection" message without hanging.
- [ ] G3. Pages use "network first" with no timeout: with a hanging network (N4) measure when the saved copy appears and propose a timeout.
- [ ] G4. Other files use "from cache and refresh in the background": warm load is faster than cold, the difference is recorded.
- [ ] G5. A cache version bump removes old caches, storage volume does not grow without bound. A page outside the shell gives an offline 503 with text.
- [ ] G6. A service worker update with open tabs does not break an open editor. PWA install and standalone launch are checked.
- [ ] G7. Profiles N1 and N2 for the landing page, editor and dashboard: LCP, FCP, time to interactive. The editor at CPU 4x and 6x: drawing 100 and 1000 nodes, INP while typing.
- [ ] G8. The Kroki client on N2: 10 s timeout, retries after 300, 600, 1200 ms. The worst time to an error message on 5xx and 429 is recorded (4 attempts, up to 2.1 s of waiting, with `Retry-After` up to 5 s per retry). Identical parallel requests are merged.

### H. API `/api/render`

- [ ] H1. Smoke over the 33 examples, all 200 and `<svg`.
- [ ] H2. Load 20 VU, 5 minutes: p95, p99, errors, static pages in parallel.
- [ ] H3. Stress in steps to failure, the knee and the behaviour after it are recorded.
- [ ] H4. Spike from 5 to 200 VU and return to baseline within 30 seconds.
- [ ] H5. Soak of 1 hour or more: server heap and RSS on a plateau.
- [ ] H6. Graph of 200 and 500 vertices: response time and the effect on `GET /` (B-02: 500 vertices 9.5 s), repeat after the fix.
- [ ] H7. Boundaries 99,999, 100,000, 100,001 characters and 2000, 2001 lines, refusal faster than 100 ms. Bodies of 5 and 50 MB: 413 or a dropped connection, server alive.
- [ ] H8. A slow client (byte by byte) does not block the others.
- [ ] H9. `/api/external/*` through a local Kroki: the 10 s timeout gives 504. Per-IP rate limiting exists or not (the proposal from B-02).

### I. Part 2 servers

- [ ] I1. Lab 1: `tests/stress.test.js` with `--expose-gc`, three green runs in a row, `spike: 1000 sockets` checked on an idle machine.
- [ ] I2. Lab 1: 3000 reads at 50 VU p95 below 1500 ms, 5000 records, heap growth over 6000 requests below 150 MB.
- [ ] I3. Lab 7: load 150, stress 60 times 20 events, volume 3000 messages (history at most `historyLimit` 50), three runs in a row.
- [ ] I4. Lab 7: `spike: 400 raw sockets` on an idle machine with the OS descriptor limit recorded.
- [ ] I5. Lab 7: 400 connect cycles leave no users, rooms or memory, vanished clients are removed.
- [ ] I6. Lab 7 with default limits (`maxPerAddress` 20, `maxUsers` 200, `rateMax` 5 per 2000 ms, `maxPacketBytes` 10000): the refusal is polite, neighbours are unaffected.
- [ ] I7. Lab 7: reconnect after the server stops, recovery time, lost messages. Broadcast latency p50 and p95 with 50 and 150 clients.
- [ ] I8. Course project: 600 reads at 30 VU, p95 below 3000 ms on an idle machine, three runs.

### J. Database

- [ ] J1. Indexes are used: `diagrams_owner_id`, `comments_diagram_id`, `comments_author_id`, `request_logs_created_at` (`EXPLAIN (ANALYZE, BUFFERS)` on frequent queries).
- [ ] J2. Diagram list and search on 10,000 and 100,000 rows: time and plan, whether an index for sorting and search is needed.
- [ ] J3. Paging by 100 without gaps or repeats, exact `X-Total-Count`, a deep `offset` does not slow down beyond the threshold. Wrong `limit` and `offset` are rejected quickly.
- [ ] J4. No N+1 when returning diagrams with tags and comments (SQL count per request).
- [ ] J5. `RequestLogs` does not grow without bound, log writing does not slow a request. The connection pool is not exhausted at 100 VU.
- [ ] J6. Time of `db:migrate` and `db:seed` at a large volume.

### K. Docker

- [ ] K1. `docker stats --no-stream` at rest and under load for db, backend, frontend.
- [ ] K2. Limits are applied: db and backend 512 MB, frontend 128 MB, `pids_limit` 200, 200, 100.
- [ ] K3. No `OOMKilled` under load, `RestartCount` 0.
- [ ] K4. Pushing the backend to its memory limit: a restart rather than a hang, recovery is recorded.
- [ ] K5. Cold start time to `service_healthy` of the three services, image sizes recorded as a baseline.
- [ ] K6. Log rotation (10 MB, 3 files) keeps the disk in bounds over 1 hour. The Nginx proxy adds no noticeable delay (port 3000 against 8080).

### L. Method and reporting

- [ ] L1. The environment is recorded for every run, repeats, median, p95 and spread are given, cold and warm cache are separated.
- [ ] L2. Scripts and raw data are kept in `docs/perf/` without secrets.
- [ ] L3. Every red result becomes a defect with a P0-P3 priority. A regression above 10 % against the previous run is P1.

## 5. How to run

Commands run from the repository root. The labs live in working copies under `.claude/worktrees/`.

```
npm install
npm run build
npm run start:prod
```

`start:prod` serves `dist/` on port 5173, `npm start` serves `site/` on the same port (do not run both). Existing measurements:

```
node --expose-gc paper-its/bench/bench.mjs 11
node testing-course/full/static-sec-perf.js
node tools/serve.js dist 5391
python docs/testing-kulikov/scripts-ui/perf.py
node docs/testing-kulikov/scripts/break-02-api-dos.mjs http://localhost:5173
node docs/testing-kulikov/scripts/part-d-load-static.mjs
```

`perf.py` takes the address `BASE` (port 5391) from `scripts-ui/lib.py`. Lighthouse (the reports in the repository are version 13.4.1), mobile profile by default:

```
npx lighthouse@13.4.1 http://localhost:5173/app/editor.html --only-categories=performance --output=json --output=html --output-path=docs/perf/lh/editor-mobile --chrome-flags="--headless=new"
npx lighthouse@13.4.1 http://localhost:5173/app/editor.html --preset=desktop --only-categories=performance --output=json --output-path=docs/perf/lh/editor-desktop --chrome-flags="--headless=new"
seq 5 | xargs -I{} npx lighthouse@13.4.1 http://localhost:5173/ --only-categories=performance --output=json --output-path=docs/perf/lh/landing-{} --chrome-flags="--headless=new"
```

API load (`autocannon` is a proposal and is not in the repository, the body comes from a file created by the C1 generator):

```
npx autocannon -c 20 -d 300 -m POST -H "Content-Type: application/json" -i docs/perf/payloads/dag100.json http://localhost:5173/api/render
curl -o /dev/null -s -w "%{time_total}\n" http://localhost:5173/
```

Part 2 servers:

```
cd .claude/worktrees/w-lab21/part-2/lab-01-node-server && node --expose-gc --test tests/stress.test.js
cd .claude/worktrees/part2-ws-work-ee9b7b/part-2/lab-07-websocket && node --expose-gc --test tests/stress.test.js
cd .claude/worktrees/angry-goldberg-bca72d/course-project/app/server && node --expose-gc --test tests/resilience.test.js
```

Docker and the database (`DSLKit-Project/part-2/lab-08-docker`, a `.env` with `POSTGRES_PASSWORD` and `JWT_SECRET` is required):

```
docker compose up --build -d
docker stats --no-stream
docker inspect --format "{{.Name}} mem={{.HostConfig.Memory}} pids={{.HostConfig.PidsLimit}} restarts={{.RestartCount}} oom={{.State.OOMKilled}}" $(docker compose ps -q)
docker compose exec db psql -U dslkit -d dslkit -c "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM \"Comments\" WHERE \"diagramId\" = 1 ORDER BY id LIMIT 100"
```

In the browser: DevTools (Performance, Memory, Network, Application). Automate through Playwright as in `scripts-ui/lib.py` with `performance.now()`, `PerformanceObserver` and `performance.memory` (Chrome with `--enable-precise-memory-info`).

## 6. Artifacts and results template

The folder `docs/perf/` is created on the first run: `env-<date>.json` (environment), `lh/` (Lighthouse reports), `render-sizes.csv`, `api/` (load output), `docker-stats.txt`, `REPORT.md` and `REPORT.en.md` (summary). Do not commit large heap snapshots, keep a summary instead.

| ID  | Scenario and object | Metric | Threshold (status) | Net/CPU | Cache | Runs | Median | p95 | Spread | Result | Priority | Defect |
| --- | ------------------- | ------ | ------------------ | ------- | ----- | ---- | ------ | --- | ------ | ------ | -------- | ------ |
|     |                     |        |                    |         |       |      |        |     |        |        |          |        |

Environment: date, OS, CPU and threads, RAM, Node, browser, Lighthouse, commit, command, server mode (`site` or `dist`), idle machine load.

| Nodes | Edges | Notation | To 90 % of blocks, ms | First frame, ms | Ratio to half the size | Heap, MB | Result |
| ----- | ----- | -------- | --------------------- | --------------- | ---------------------- | -------- | ------ |
| 10    |       |          |                       |                 |                        |          |        |
| 100   |       |          |                       |                 |                        |          |        |
| 1000  |       |          |                       |                 |                        |          |        |
| 5000  |       |          |                       |                 |                        |          |        |
