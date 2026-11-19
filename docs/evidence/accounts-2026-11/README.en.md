# Account scenario checks (November 2026)

Russian version: [README.md](README.md).

## What was checked

Real browsers: Microsoft Edge (`channel="msedge"`) and Firefox, Python Playwright. The script starts the site (`node tools/serve.js site <port>`); the course-project app starts its own server with SQLite. Sign-up and sign-in go through the UI. The developer and admin roles are written into the account record of the test profile; real role codes are not used.

Run: `npm run e2e:accounts` (the scripts in `testing-course/accounts/*.py`, then `accounts-gate.py`, which exits 1 if any row is not `Passed`).

## Summary

- Scenarios: 66 IDs, each run in both browsers (132 rows). Saved JSON: 81 rows `Passed`, 51 `Failed`.
- The gate fails. This is expected: the defects below are not fixed and the application was not changed.
- Some failures look like defects of the test itself rather than the application. They are marked "needs check" in the defect list.
- Course app (CRS): after fixing the test (wrong comment key `text`, wrong PUT body), in Edge CRS-03, CRS-04 and CRS-06 pass; CRS-02, CRS-07 and CRS-08 fail. The saved `accounts-course-msedge.json` and `accounts-course-firefox.json` are from the run before the fix; the Edge rerun ended on a browser close error (CRS-11), so its JSON was not written. No Firefox course rerun after the fix.
- Other suites (ISO, ROL, STO, AIO) come from one run on 14 November 2026; the scripts were not changed after it. A full rerun on a machine under parallel load was not done.

## Table: scenario x browser x result

Severity is given for failures only.

| ID | Scenario | Edge | Firefox | Severity |
|---|---|---|---|---|
| AIO-01 | AI without a key: status says unavailable, the AI button is hidden, the rules-based review works, the API answers 503 | Passed | Passed | - |
| AIO-02 | Fake provider answering correctly: AI button appears and the review/generate answers with code | Failed | Failed | Medium |
| AIO-03 | Provider errors (500, 429, garbage, empty, dropped connection): UI shows a failure, never stays busy, no JS error, key never leaked | Passed | Passed | - |
| AIO-04 | Slow provider: the button is disabled while waiting and enabled again after the failure | Failed | Failed | Medium |
| AIO-05 | AI panel for a guest works the same as for a signed-in user (server-side key) | Passed | Passed | - |
| AIO-06 | Clarify panel opens without errors with and without a key | Passed | Passed | - |
| AIO-07 | Offline (service worker): dashboard, editor, settings, docs open, saving, sign-out and sign-in work | Passed | Passed | - |
| AIO-08 | 390 px phone: sign-up -> template -> first saved diagram -> list -> sign-out, no horizontal scroll | Failed | Failed | Medium |
| CRS-01 | Two users sign up through the UI, sign out; a wrong password is refused with a message | Passed | Passed | - |
| CRS-02 | User one creates a diagram in the UI; it stays after a reload | Failed | Failed | Medium |
| CRS-03 | API ownership: a user cannot change/delete a foreign diagram, tag or comment (403/404); the owner and author can | Failed | Failed | High |
| CRS-04 | API roles: admin-only /users, no self-promotion, role set at sign-up ignored, role changes and deleted users take effect at once | Failed | Failed | High |
| CRS-05 | API errors: 401 without a token, 400 invalid body, 404 unknown id/route, 405 wrong method | Passed | Passed | - |
| CRS-06 | UI: guest redirected, user gets 403 on /admin, 404 pages, admin lists users | Failed | Failed | Medium |
| CRS-07 | UI comments: another user posts, edits and deletes own comment; a tag on a foreign diagram is refused | Failed | Failed | Medium |
| CRS-08 | Switching accounts in one profile: the token is replaced and each user sees the right data | Failed | Failed | Medium |
| CRS-09 | A damaged token in localStorage: the user is sent to sign-in, no crash | Passed | Passed | - |
| CRS-10 | Storage disabled (private mode): the login page still renders without errors | Passed | Passed | - |
| CRS-11 | Token expiry (JWT_EXPIRES_IN=5): after expiry the app shows the sign-in form | Passed | Passed | - |
| ISO-01 | User A: sign-up through the form, creates a project, a template and a version | Passed | Passed | - |
| ISO-02 | User A: moves a project to the trash | Passed | Passed | - |
| ISO-03 | User B in the same profile: no projects, templates or trash of A, own 33 starter projects | Passed | Passed | - |
| ISO-04 | Quota of B starts at 0 (A's diagrams are not counted) | Passed | Passed | - |
| ISO-05 | Projects are stored under a key of each user | Passed | Passed | - |
| ISO-06 | Version history (Git panel) of A is not visible to B | Failed | Failed | High |
| ISO-07 | Settings of A (editor guides) do not change the settings of B | Failed | Failed | Medium |
| ISO-08 | Theme chosen by A is not applied to B (theme per account) | Failed | Failed | Low |
| ISO-09 | Search and filter state of the dashboard is not carried from A to B | Failed | Failed | Low |
| ISO-10 | A signs in again: projects, template, trash and quota are exactly as left | Passed | Passed | - |
| ISO-11 | Separate browser context: no accounts and no data of A, the same email can be registered there | Passed | Passed | - |
| ISO-12 | User: five new diagrams a day, the sixth and a re-save after delete are refused, edits of an existing one work | Passed | Passed | - |
| ISO-13 | Developer: 7 new diagrams, the quota says no daily limit | Passed | Passed | - |
| ISO-14 | Admin: 7 new diagrams, the quota says no daily limit | Passed | Passed | - |
| ISO-15 | Switching accounts in one profile keeps each user's quota separate | Failed | Failed | Medium |
| ISO-16 | Projects saved as a guest stay with the guest and do not enter a new account | Passed | Passed | - |
| ISO-17 | Sign-out in tab 1 sends tab 2 to sign-in and updates the editor menu; sign-in updates it back | Failed | Failed | Medium |
| ISO-18 | Two tabs save the same project: the last write wins, one record, valid JSON, no errors | Passed | Passed | - |
| ISO-19 | A project trashed in tab 1 is not resurrected or duplicated by a save in tab 2 | Failed | Failed | Medium |
| ISO-20 | Share link: opens for a guest, for another account and in another context; a damaged link does not break the editor | Passed | Passed | - |
| ROL-01 | Documentation: only the developer sees and uses Edit; guest/user/admin do not; wrong codes give no role | Passed | Passed | - |
| ROL-02 | Expert rules: only the developer can edit rules | Passed | Passed | - |
| ROL-03 | Admin role scope | Passed | Passed | - |
| ROL-10 | Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as guest | Passed | Passed | - |
| ROL-11 | Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as user | Passed | Passed | - |
| ROL-12 | Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as developer | Passed | Passed | - |
| ROL-13 | Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as admin | Passed | Passed | - |
| ROL-20 | Trash: move, restore, delete forever, empty, a trashed project does not open | Failed | Failed | Medium |
| ROL-21 | Trash: items older than 30 days are erased | Failed | Failed | Medium |
| ROL-22 | Templates: create from a project and delete, for user, developer and admin | Failed | Failed | Medium |
| ROL-23 | Versions: commit, change, restore returns the committed code, Versions tab lists it | Passed | Passed | - |
| ROL-24 | Role belongs to the account: kept after reload and re-login, other accounts unchanged | Passed | Passed | - |
| STO-01 | Reload keeps the session and the projects (dashboard and editor) | Passed | Passed | - |
| STO-02 | Clearing site data: guest again, old login fails with a message, the same email registers again with a clean state | Passed | Passed | - |
| STO-03 | Corrupted dslkit.accounts (8 payloads x 4 pages): no JS errors, pages render | Passed | Failed | Medium |
| STO-04 | Corrupted dslkit.session | Passed | Failed | Medium |
| STO-05 | Corrupted dslkit.projects.<id> | Passed | Passed | - |
| STO-06 | Corrupted dslkit.templates.<id> | Passed | Failed | Medium |
| STO-07 | Corrupted dslkit.seeded.<id>, settings, theme, dashboard, git-commits, editor-source | Failed | Failed | Medium |
| STO-08 | Tour flag absent / corrupted: the tour opens for a new visitor, Skip stores the flag, no JS errors | Passed | Passed | - |
| STO-09 | Session of a deleted account and a missing project id: sent to sign-in / a clear note, not a crash | Passed | Passed | - |
| STO-10 | The address ?p=<id> of another user's project does not open it | Passed | Passed | - |
| STO-11 | Full storage (QuotaExceededError): sign-up shows the storage message, no session, no JS error | Passed | Passed | - |
| STO-12 | Full storage while saving a project: the page must not claim 'Saved' when nothing was stored | Failed | Failed | High |
| STO-13 | Full storage on the settings page: no false 'The setting is saved' | Failed | Failed | Low |
| STO-14 | Disabled storage (private mode simulation): every page opens, sign-up says why it fails, the editor still draws | Failed | Failed | High |
| STO-15 | Language switch (RU <-> EN) keeps the session, the open project, the unsaved edit and the dashboard section | Failed | Failed | Medium |

## Defects (by severity)

| # | Severity | Defect | Reproduction | Status |
|---|---|---|---|---|
| 1 | High | Version history (Git panel) is shared by all accounts: key `dslkit.git-commits` is not per user (ISO-06) | Sign in as A, save a version; sign in as B in the same profile: A's versions are visible | Confirmed |
| 2 | High | With full storage, saving a project shows "Saved" although nothing was stored (STO-12) | Fill the localStorage quota, edit a project, press save | Needs check (the test waited for navigation, see log) |
| 3 | High | With storage disabled, sign-up reports success (Edge, STO-14); Firefox shows JS errors on the dashboard | Replace `localStorage` with a throwing stub, sign up | Confirmed in Edge |
| 4 | Medium | Sign-out in tab 1 does not send tab 2 to sign-in; tab 2 stays on a private page (ISO-17) | Two windows, sign out in the first, the second shows the dashboard | Confirmed |
| 5 | Medium | A project trashed in tab 1 comes back or is duplicated by an edit in tab 2 (ISO-19) | Trash in A, save an edit in B | Confirmed |
| 6 | Medium | Editor settings (guides) are shared by all accounts: key `dslkit.settings` (ISO-07) | Change as A, sign in as B | Confirmed |
| 7 | Medium | Corrupted `dslkit.accounts`, `dslkit.session`, `dslkit.templates.<id>`, `dslkit.seeded.<id>` and others cause JS errors or a blank page; in Firefox a service worker error on `sw.js` (STO-03, 04, 06, 07) | Write junk into the key, open the pages | Confirmed in Firefox, partly in Edge |
| 8 | Medium | No busy state during a slow AI answer; the button is not disabled (AIO-04) | Provider with a 20 s delay | Confirmed |
| 9 | Medium | Course app: a diagram disappears after reload (CRS-02); the owner does not see their diagram after switching accounts (CRS-08) | Create a diagram, reload; switch accounts and back | Needs check |
| 10 | Medium | 390 px phone: the sign-in form is not visible in the sign-up flow (AIO-08), same in both browsers | Open sign-up at 390 px width | Needs check (possibly a selector) |

Low severity: theme not per account (ISO-08); dashboard search text shared (ISO-09); full storage on the settings page (STO-13); language switch click does not go through (STO-15, needs check). The trash and template menus do not open in either browser (ROL-20..22; possibly a stale selector, needs check). The quota check after account switch (ISO-15) timed out before welcome.html (needs check).

## Screenshots

Failures only: `docs/evidence/accounts-2026-11/screens/fail-*.png` (Firefox; Edge screenshots were not kept in the previous run).

## Not done

- A full rerun of all suites in both browsers after the test fix.
- A manual check of each failure marked "needs check".
