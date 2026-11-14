# Questions for the owner (22 October 2026)

Russian version: `33-QUESTIONS.md`. Answer by number: "1 yes, 2 no, 3 option B". For anything unanswered I follow the option marked "default".

## A. Part 1 site

1. Should the canvas have a "Retry" button on a Kroki error, separate from "Draw again"? (default: no, the existing button is enough)
2. How to show a Kroki error: text in the status line (as now) or a frame on the canvas with an icon? (default: the status line)
3. What to do on partial success when the diagram has parse warnings: draw and show the problems panel? (default: yes)
4. Do you need a language switch right in the editor, or only in the settings? (default: only the settings)
5. Do you need SVG and PNG export from the editor? (default: no)
6. Do you need example diagrams for each of the 27 notations in an "Open example" menu? (default: hints exist, I add no templates)
7. Should I upload the mockups to Figma through your browser window while you are signed in? (default: no, I wait for your sign-in)
8. Should I re-shoot the Mermaid frames as soon as Kroki works, without a separate request? (default: yes)

## B. Extras and improvements

9. Do extras for lab 4, P2 and lab 8? (default: yes, one work at a time)
10. Do the medium extras (a `?notation=` filter, graceful shutdown, lock limits in `limits.json`, notation editing and auto-retry in lab 5)? (default: yes)
11. Add `GET /health` to P1 and P2? (default: yes)
12. Add a `lint` script (ESLint and Prettier) to the server works? (default: no)
13. Implement undo in P4? (default: no)
14. Enable `connectionStateRecovery` in the lab 7 Socket.IO? (default: no)
15. Implement a pause for a slow connection (lab 7 question 15)? (default: no, the answer is in the guide)
16. Do you need `basename` and a `HashRouter` mode in P3? (default: no)
17. Do you need a pgAdmin or Redis service in the lab 8 `docker-compose.yml`? (default: no)
18. Change the lab 8 default ports to 80 and 5000 as in the assignment? (default: no, 8080 and 3000, and 80 and 5000 are enabled through `.env`)
19. Do you need a "Clear log" button in P1? (default: no)
20. Do you need the P2 API described in OpenAPI? (default: no)

## C. Quality and documentation

21. Do refactoring round 2 (`App.jsx` of lab 5, the notation render functions)? (default: yes, after the extras)
22. Add an architecture paragraph with Martin and Fowler references to the reports of labs 1–3? (default: yes)
23. Do you need a separate "write it live" cheat-sheet file covering all 12 works? (default: no, each guide has one)
24. Do you need the Mermaid diagrams of the guides as PNG for printing? (default: no)
25. Do you need a guide for the course project (branch `course-project`)? (default: no, the branch is untouched)

## D. Git and handing in

26. Merge the Part 1 branches into `main` and push? (default: no, I wait for your yes)
27. Delete the service local branches of the working copies (they are not published)? (default: neither published nor touched)
28. Keep the 51 MB of mockups in Git or move them to a separate archive? (default: keep in Git, as you said)
29. Push the Part 2 work branches one by one to separate branches on GitHub? (default: no)
30. How to sign pull requests: only with the owner's name? (default: yes)

## E. For the teacher (questions to ask them)

31. For an even variant, must the lab 1 data live in a database or in an array?
32. P3 asks for React Router v6 but the work has v7: is that acceptable?
33. How to show the 500 page in client-only works where a real failure is impossible?
34. Is SQLite acceptable instead of PostgreSQL in labs 2 and 3?
35. Are screenshots of every endpoint needed, or one per operation?

## F. Defence: short answers and "write it live" exercises

Questions the teacher may ask about the code, and requests to write code on the spot (see `docs/notes/06-teacher-requirements.md`, `07-possible-teacher-extras.md`). Every answer rests on a file in the repository. What was only tested with fakes (no Claude key, no real Mongo) is said plainly. Simple words, with an example.

### F1. File import (`docs/agent-reports/feature-import-recognition.en.md`)

**What does the import do?** It takes a file (draw.io, BPMN, XMI, GraphML, DOT, CSV, Visio, Mermaid, PlantUML, Markdown with a block) and turns it into DSLKit code. Example: an `a.drawio` file with a diamond and an oval becomes a GOST flowchart.

**Where is the entry point?** `site/js/automation/upload.js`: `uploadKind` looks at the type and extension (`picture`, `bmp`, `zip`, `text`, `unknown`), `importUpload` rejects files over 10 MB (`MAX_FILE_BYTES`), takes the diagram block out of Markdown and hands the text to the right reader. Structured formats are read by `site/js/utils/diagram-file-import.js`. Result: `{ ok, notation, code, warnings }` or `{ ok: false, reason }` (`no-structure`, `bad-file`, `unknown`). `parseDiagram` checks the code.

**Is an AI key needed?** Not for structured files, everything is deterministic. For pictures and PDF yes: `tools/ai-vision.js` and `tools/ai-api.js`. Honestly: picture recognition was never run against a real AI provider, the request and the retry were tested only against a fake server. Unpacking compressed draw.io in the browser (`DecompressionStream('deflate-raw')`) never ran in a real browser, in Node it was tested with `deflateRaw`. The Graphviz and Mermaid SVG readers were written from the known structure and not tried on real files of every version.

**Why an own XML reader instead of `DOMParser`?** So the same code runs in the browser and in Node (tests).

**Write it live: a new extension.** For example `.mmdc`. Step 1: add `'mmdc'` to the `TEXT_EXTENSIONS` list in `upload.js` (`ACCEPT` and `uploadKind` pick it up on their own). Step 2: check in `importUpload` where such text goes (like `mmd`). Step 3: a test next to the tests of `upload.js`.

**Write it live: another size limit.** The constant `MAX_FILE_BYTES` (10 MB) is imported into `upload.js` from `diagram-file-import.js`; change the number and the test for the `too-big` answer.

### F2. Review and fix (`docs/agent-reports/feature-review-fix.en.md`)

**How does it work?** `reviewCode(code, { lang })` in `site/js/utils/diagram-review.js` collects the findings of the parser and the rules, then builds variants: "minimal" (errors only) and "full cleanup". Fixes run in passes (up to four), each variant is parsed again and offered only if it has fewer problems.

**Where do the findings come from?** From the parser and validator of each notation, the same as in the problems panel, plus rules: no title, empty diagram, too long a label, an IDEF0 block without an input.

**And the AI?** An optional layer, `tools/ai-review.js`: the model answer is checked by the same validator, at most two variants are kept. Without a key the server answers 503 and the panel works on local rules only. Not tried with a real key.

**Can it be undone?** Yes. Applying writes the code into the editor as an ordinary edit, "Undo" brings the old code back.

**What can it not do?** It does not know the meaning of the diagram ("data", "Processing" must be replaced by hand), an unreachable node with links is fixed manually. The panel was not checked on a real phone, only the markup and tests.

**Write it live: a new rule.** In `diagram-review.js`, next to the other rules, add a finding `{ severity, line, rule, message: { ru, en }, fix }`; `fix` is an edit of a line, `applyEdits` applies it. Example: "label longer than 60 characters". Write the message in both languages at once, then a test.

### F3. Clarifying questions (`docs/agent-reports/feature-clarify-complete.en.md`)

**Idea.** If a diagram is incomplete, the system asks ("where does the process end?") and completes it from the answers. File: `site/js/utils/diagram-questions.js`.

**Functions.** `buildQuestions(code, notation)` returns questions by importance; each has `apply(answer, code)`. `completeFromAnswers(code, answers, notation)` applies the answers and checks the result with the parser. If there are more errors or the code did not change, the result is `ok: false` and the code stays as it was: a worse result is never returned silently.

**Why does the order of answers not matter?** Lines are found by content, not by number.

**AI.** `tools/ai-questions.js`, route `POST /api/ai/clarify`: the model adds up to three questions and refines the code. Without a key or on a failure a rule-based fallback runs. In tests the model answer is fake; a real key and the dialog in a real browser at 375 px were not tried (markup and behaviour were checked in jsdom). There are no rules yet for class and timing diagrams.

**Write it live: a new question.** In `diagram-questions.js` add a rule that returns `{ id, kind: 'yesno', text: { ru, en }, target, priority, apply }`; `apply` returns the new code. Test: code without the needed element gives the question, the answer "yes" removes the problem.

### F4. Two languages (`docs/agent-reports/i18n-audit.en.md`)

**How are the languages built?** `site/js/utils/lang.js`: `LANGUAGES = ['ru', 'en']`, the first one is the source language. `normalizeLanguage` gives Russian for an unknown code, `pageLanguage` reads the `lang` attribute of the page, `pick(texts, code, params)` takes the text from a `{ ru, en }` dictionary and fills `{name}`. Dates and numbers go through `Intl` (`formatDateTime`, `formatNumber`). Pages live in `site/` and `site/en/`.

**What did the audit find?** A Russian label on the English page at the editor tab close button, an "unsaved" mark that was never removed, query and anchor lost on a language switch, error pages in Russian only. All findings and statuses are in the report table.

**Write it live: a new interface string.** Add `{ ru: 'Сохранить', en: 'Save' }` to the dictionary of the component and read it with `pick(TEXTS.save, lang)`. Do not write `lang === 'en' ? ... : ...` in code: the audit looked for exactly such places. The `{name}` placeholders must match in both versions.

### F5. CI/CD (`.github/workflows`)

**What runs?** `ci.yml` on every push, pull request and by hand. Jobs: `test` (`npm ci`, `format:check`, `npm test`, `npm audit --omit=dev --audit-level=high`), `build` (`npm run build`, artifact `dist` for 7 days), `react` (tests and build of `react-app`), `e2e` (the site on port 5173, Playwright scripts in Python, then `e2e-gate.py` fails if any result is not Passed; Chromium instead of Edge). `pages.yml` publishes the site to GitHub Pages on a push to `main` and to `docs/overview-and-ab-tests`, or by hand.

**Why `permissions: contents: read`?** The token can only read the code, a compromised step cannot push. **Why `concurrency`?** A newer push to the same branch cancels the older run. **Why are the e2e folders set in the first step through `$GITHUB_ENV`?** The `runner` context is not available in the `env` of a job.

**Honestly.** A green run on GitHub servers is visible only in Actions; this answer describes the file, not a run result. There are no secrets in CI.

**Write it live: a new job.** A block in `jobs:` with `runs-on: ubuntu-latest`, `timeout-minutes`, steps `actions/checkout@v4`, `actions/setup-node@v4` (`node-version: 24`, `cache: npm`), `npm ci` and the command. Example: a `lint` job running `npm run format:check`.

### F6. Docker lab 8: the backend image fix (`part-2/lab-08-docker`)

**Three problems and their solutions.**

1. **sequelize-cli.** On start the container runs the migrations and the seed (`CMD` in `backend/Dockerfile`), but `sequelize-cli` is a dev dependency in lab 3 and `npm ci --omit=dev` does not install it. Then `npx` tries to download the package, and the file system is read-only. Solution: in the `deps` stage, after `npm ci --omit=dev`, `sequelize-cli@6.6.5` (the version from the lockfile) is installed with `--no-save --no-package-lock --ignore-scripts`.
2. **Read-only.** In `docker-compose.yml` the `backend` has `read_only: true`, `tmpfs: [/tmp]`, `cap_drop: [ALL]`, `no-new-privileges`. Only `/tmp` is writable, so nothing can be downloaded on the fly: everything is installed at build time.
3. **DNS in Nginx** (`frontend/nginx.conf`). A plain `proxy_pass http://backend:3000` resolves the name once at start: after the backend is recreated (new address) there is a 502 until Nginx is reloaded. With `resolver 127.0.0.11 valid=10s;` and the variable `set $backend_upstream ...` Nginx asks the Docker DNS every 10 seconds. With a variable it does not cut `/api/` itself, so `rewrite ^/api/(.*)$ /$1 break;` is needed.

**What else is in the image?** Two stages, user `node` (not root), `HEALTHCHECK` on `/health`, `depends_on: condition: service_healthy`, the database in an internal network (`internal: true`), the `pgdata` volume, log rotation, `limit_req_zone` of 10 requests per second per address, `client_max_body_size 100k`.

**Honestly.** The answer is built from the text of `Dockerfile`, `docker-compose.yml` and `nginx.conf`. That a full `docker compose up` ran on your machine was not checked here: see `docs/study/17-LR8-DOCKER.en.md` and the lab 8 report for confirmed runs.

**Write it live.** (a) Change the port: the frontend in `docker-compose.yml` listens on `'${FRONTEND_PORT:-8080}:8080'`, setting `FRONTEND_PORT` in `.env` is enough. (b) Add a service: a block next to `redis`, with `profiles`, so it does not start by default. (c) Explain why startup fails without `POSTGRES_PASSWORD`: the entry `${POSTGRES_PASSWORD:?...}` stops it on purpose.

### F7. Request-rate limiter and log of lab 3 (`part-2/lab-03-auth/src/middleware`)

**Limiter (`rate-limit.js`).** `createRateLimiter({ windowMs, max, now })`: a fixed-window counter per client address (`req.ip`). Example: `max = 5`, a window of one minute: the sixth request within a minute gets a 429 error `tooManyRequests` with the number of seconds to wait (`src/errors.js`). The state is in memory, so it is per process (written in `AUDIT.md`). The time is passed as the parameter `now`, so a test does not wait real minutes.

**Overflow protection.** `makeRoom`: at 10,000 keys the oldest tenth is dropped at once (a `Map` remembers insertion order), memory cannot grow without bound.

**Login lock.** `createLoginGuard({ maxAttempts, lockMs })`: `fail(email)` counts failures, after `maxAttempts` the key is locked for `lockMs`, even for the right password; `succeed` resets the counter; `retryAfter` gives the seconds to wait. The controller builds the key from the address and the email, known or not, so the answer never shows which emails exist. The limits come from `limits.json` (in `app.js`: `loginRateMax`, `loginMaxAttempts`, `loginLockMinutes`, `registerRateMax`).

**The `Retry-After` header.** Already there: `src/middleware/error-handler.js` sets it from `err.retryAfter`.

**Why `TRUST_PROXY`?** Behind Nginx the client address would always be the same, the proxy address. `app.js` has `app.set('trust proxy', ...)`, compose has `TRUST_PROXY: '1'`.

**The log (`request-log.js`).** Variant 26 is even: the log goes to the database table `RequestLog`, not to a file. The row is created before the route; if that fails, the error goes to the error handler and the client sees the 500 page. The status is added after the response (`res.on('finish')`), on a best-effort basis. `clean` replaces control characters with `?` (otherwise a new line would forge a log line) and cuts the length to 200; the query string is dropped, it may carry tokens. Retention is 30 days: `purgeOldLogs` at start and then hourly (`startLogRetention`).

**Write it live.** (a) Change a limit: change the number in `limits.json`, do not touch the code. (b) A new log field, for example `userAgent` (there is none now): a new migration modelled on `migrations/20261016000004-create-request-logs.js`, the field in `models/request-log.js`, pass `clean(req.get('user-agent') ?? '', 200)` to `RequestLog.create`.

**Honestly.** Here the code was only read and described, the lab 3 tests were not run for this documentation change.

### F8. Report linters (`tools/lint-report.js`, `tools/part2/lint-report.js`)

**What do they check?** A Markdown report against the teacher's rules: the sections "1 Purpose of the Work" and "Conclusion" (not "Conclusions"), no words "also" and "were", no references like "(see fig.)", a figure caption "Figure N – Description" with a capital letter, a worded reference before each figure, a table caption, no code in the main text, no figure in an appendix. The Part 2 version in `strict` mode adds: an appendix is titled "Appendix A (mandatory) Title", at least one appendix, each one is referenced in the text, no semicolons, no sentence starting with a figure reference. The Russian rule about guillemet quotes exists only for `ru`.

**How is it built?** An object `L` with rules and messages for `ru` and `en`, and a function `lintReport(text, lang, { strict })` that returns the list of error messages; an empty list means no remarks. `strip` cuts code and tables before the prose is checked. Tests: `tools/lint-report.test.js`, `tools/part2/lint-report.test.js`. The linter catches form, not meaning. The rules come from the owner's retelling (`06-teacher-requirements.md`), the teacher's basis is not confirmed.

**Write it live: a new rule.** For example, forbid the word "given". In `L.en` change `forbidden` to `/(?<![a-z])(also|were|given)(?![a-z])/i` and fix the message text. For a brand new rule: a key in `messages`, a regular expression in `L` and a line `check(condition, m.key)` in `lintReport`; then a test with a bad and a good text.

### F9. General tips for the defence

- Start with the file and the function: "this is in `rate-limit.js`, the function `createLoginGuard`".
- To a question about what never ran (a real Claude key, a real Mongo, a browser on a phone) answer directly: it was checked with fake data and tests.
- Before a live edit: find the place, change it in one place, run `npm test` and `npx prettier --check .`.
