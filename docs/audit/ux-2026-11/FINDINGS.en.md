# UX audit, November 2026: findings

Russian version: [`FINDINGS.md`](FINDINGS.md). The audit is partial: it ran in Edge, in Russian, on desktop, tasks T1-T12 plus a re-check. Not covered: Firefox, the English version, touch at 390 px, a full walk through the lab UIs, a run of the AI modes on a fake API. The detailed log and screenshots are in the branch `worktree-agent-a206e5e4369939fc6` (commit `838fe80c`), files `docs/audit/ux-2026-11/logs/edge-ru-desktop.json` and `shots/`. Result: 0 blockers, 7 major, 6 minor, 2 nits. The seven main findings are below, the other eight are in the log of the branch.

| No. | Severity         | What is wrong                                                                                                                                      | Recommendation                                                                                           |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| F1  | major            | When a file import fails, the message says "format not recognised" and at the same time "saved". This holds for 13 of the 16 formats in the check. | Show one message: what exactly failed and that nothing was saved. Never say "saved" after a parse error. |
| F2  | major            | On the sixth diagram of the day (daily limit 5) the app says "diagram ready" and "not saved" together.                                             | Show one message about the limit before building and explain how to continue.                            |
| F3  | major (re-check) | With the browser storage full, saving reports success.                                                                                             | Check the result of the `localStorage` write and show an error with advice to free space.                |
| F4  | major            | There is no "forgot password" path, accounts live only in the browser, a user who forgets the password loses access to the data.                   | Describe this on the sign-in page; add account export and import; a real reset needs a server.           |
| F5  | major            | Rename and move to trash use the system `prompt` and `confirm` windows: they block the page, are not translated and break the design.              | Replace them with own dialogs with the action name, cancel and keyboard support.                         |
| F6  | major            | 25 icon buttons without an accessible name.                                                                                                        | Add `aria-label` and tooltips in both languages.                                                         |
| F7  | major            | In the Russian forms the browser's field validation prints English text.                                                                           | Set `lang` and own messages through `setCustomValidity` in the page language.                            |

Not reproduced in a short re-check: the timeouts of the clarifying questions, restore and language switching seen in the script.

## What to do next

1. Fix F1, F2, F3 first: the user loses data or gets a contradictory message.
2. Then F6 and F7: accessibility and language.
3. F5 and F4: replace the system windows and describe the limit of browser-only accounts.
4. Repeat the audit for Firefox, the English version and touch at 390 px.
