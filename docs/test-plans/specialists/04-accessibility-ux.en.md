# 04. Accessibility and usability specialist: test plan and checklist

Version 1.0 (a plan, there are no run results here). Date: 2026-11-06. Branch: testing-course-full. Russian version: `04-accessibility-ux.md` (the content is equal).

Source material: `docs/testing-kulikov/60-ux-a11y-review.md` (60 below), `51-manual-bugs.md` (51), `90-persona-student-teacher.md` (90), `91-persona-analyst-developer.md` (91), `92-persona-a11y-mobile-en.md` (92), `docs/project/UX-RESEARCH-RESULTS.md`, the Accessibility section of `docs/project/TODO.md`, `docs/design-contest/logos/AB-TEST-PLAN.md`, `tools/contrast.js`, the report `docs/ux/reports/a11y.md` and the axe-core check on the `pz23` branch. `60/A1` means item A1 of file 60, `92/K5` means task K5 of file 92, `51/M-12` means defect M-12. Some IDs in 90 and 92 are Cyrillic in the source (for example 90/С1, 90/П-6) and are kept as written.

## 1. Role and scope

Role: accessibility (WCAG 2.2 AA) and usability testing specialist. Responsible for showing that the diagram-as-code editor works with a keyboard and screen readers, is readable in both themes and at any window size, is clear to a newcomer, and has no untranslated or false texts.

Scope: the pages `site/app/*.html` and `site/en/app/*` (welcome, dashboard, editor, settings, login, register, docs, expert, decision), the landing page and the privacy page, the error pages in `site/errors/` (400, 403, 404, 405, 431, 500). Elements: the SVG canvas, the palette, block dragging, the "Connect" mode, the problems panel, the status line, the tour, modal windows, the "More actions" menu and the project card menu, the assistant panel, the sign-in and registration forms, switches, the mobile bar and the bottom navigation. Light and dark themes, widths 320, 375, 768, 1366 px, zoom 200% and 400%.

Out of scope: security (61), notation rendering accuracy (62), the API (30, 31).

Limitation: the scores of the 12 "evaluators" in `UX-RESEARCH-RESULTS.md` (SUS about 63) and of the personas in 90-92 come from a simulation by one reviewer, not from real participants. The forecast "SUS 82+" remains a hypothesis. A real screen reader (NVDA, VoiceOver) was not run in 92, so the screen reader part of section 4.3 must be run by hand.

## 2. What the specialist checks (P0-P3)

| Priority | Definition                                                              | Examples from existing findings                                                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | The main task is impossible for a group of users, data loss, focus trap | Board blocks unreachable by keyboard (60/A2, 2.1.1), Tab inserts a tab character and corrupts code (60/A1, 2.1.2), a menu with no keyboard exit (60/A3)                                                          |
| P1       | The task is done with serious difficulty or an A/AA criterion fails     | Editor wider than the screen at 375 px (60/R1, R2, 51/M-12, 92/M6), a code error is not announced (92/K7, 4.1.3), Russian text in the English interface (92/E8), 56 Tab presses to the code field (92/K4, 2.4.1) |
| P2       | Inconvenience, a workaround exists, a recommendation fails              | Targets under 24 px (60/A4, A5, 2.5.8), a tooltip does not close on Esc (60/A7, 1.4.13), `arrow` in English (60/T2), the tour covers the buttons it explains (60/T1)                                             |
| P3       | Cosmetic, suggestion, AAA                                               | Empty previews (51/M-11, 90/П-11), ISO dates (92), 44 px targets                                                                                                                                                 |

If a problem blocks a keyboard or screen reader user in the main zone (code, canvas, problems, saving), it is P0 whatever the criterion level.

State at the date of the plan: after reports 60 and 92 the code received changes (commit `fb6913c`: 44 px toolbar targets and a "To the diagram code" link, `code-input.js`: Esc releases Tab, `popups.js`: the menu closes on Esc and on a click outside, the 404 page holds a Russian and an English block). A run has not confirmed this, so checklist items tied to 60, 92 and 51 are regression checks.

## 3. Plan

### 3.1 Goals

1. Confirm or refute WCAG 2.2 AA conformance for the pages in section 1, in both themes and languages.
2. Close the gaps listed in 92 ("What is left to check"): a real screen reader, 360x640, 768x1024, landscape 812x375, pinch, the on-screen keyboard.
3. Run a real usability test with 3-5 participants (the "Deferred" item in `TODO.md`) and obtain TSR, SUS, UMUX and time on task instead of simulations.
4. Check the ux-copy and the error pages in ru and en. Prepare A/B checks so that they do not reduce accessibility.

### 3.2 Scope and approach

Order: automation (axe-core, Lighthouse, html-validate, `tools/contrast.js`), a keyboard pass without a mouse, zoom and reflow, contrast and themes, screen reader, mobile devices, texts and errors, sessions with participants. Do not invite participants while keyboard P0 items are open, otherwise the sessions are spent on known defects. Automation covers only part of the criteria, so the manual section 4 is mandatory whatever axe reports.

### 3.3 Environment and assistive technology

| Group          | Contents                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test bench     | `npm start` (port 5173) or `node tools/serve.js site 5190`, build with `npm run build` and `npm run start:prod`. A clean browser profile per session |
| Browsers       | Chromium and Edge, Firefox (for NVDA), Safari on macOS and iOS (for VoiceOver)                                                                       |
| Screen readers | NVDA with Firefox and Chrome, VoiceOver on macOS and iOS, TalkBack on Android, Narrator and JAWS if available                                        |
| Devices        | Phone 375x812 and 360x640, tablet 768x1024, laptop 1366x768. Real iPhone and Android, not only emulation                                             |
| Modes          | Zoom 200% and 400% (windows 683x400, 320x256), `prefers-reduced-motion`, `forced-colors`, `prefers-color-scheme`, text spacing per 1.4.12            |
| Input          | Keyboard, mouse, touch, Voice Access or Voice Control                                                                                                |
| Accounts       | Test accounts created through the registration form. Passwords stay out of the repository and the protocols                                          |

### 3.4 Entry and exit criteria

- Entry: the test bench is stable (see 51/M-15), the P0 items from 60 and 92 are closed or accepted by the owner, the protocols (section 6) and participant consents are ready.
- Exit: the checklist is complete, no P0 or P1 stays open, every P2 has a decision and a date. axe-core reports no A or AA violations on all pages, both languages, both themes.
- Usability: at least 3 sessions, TSR for T1-T5 not below 80%, SUS not below 68 with a note about the small sample. The thresholds are proposed by the plan and need the owner's approval.

### 3.5 Risks

| Risk                                            | Action                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A small sample (3-5) makes SUS and TSR noisy    | Report ranges and single cases, never write "significant". The value of the sessions is the list of problems |
| No real screen reader or device at hand         | Do not replace with emulation, mark "not checked"                                                            |
| The code changes during testing                 | Record the commit and build address in every protocol                                                        |
| The test bench overloaded and stopped runs (92) | One session at a time, a time limit per step                                                                 |
| Sample bias (one university and course)         | Include an analyst or developer and a person with no DSL knowledge                                           |

## 4. Checklist

Format: identifier, check, WCAG criterion, screen, link to an earlier finding. All checkboxes are empty. "Both themes" means light and dark, "both languages" means `/app/` and `/en/app/`.

### 4.1 Keyboard, focus, Tab order

- [ ] KB-01 Every function works with the keyboard alone (2.1.1), all screens.
- [ ] KB-02 Focus can leave the "DSL code" field forward and back, and does not stay in it after 48 Tab presses (2.1.2), editor. Link: 60/A1, 92/K5.
- [ ] KB-03 The way out of the code field is announced by text or a hint and read by the screen reader (3.3.2), editor. Link: 92/K5.
- [ ] KB-04 The "More actions" menu and the card menu close on Esc, on a click outside and when focus leaves, focus returns to the button and not to `body` (2.4.3), editor, dashboard. Link: 60/A3, 92/K3.
- [ ] KB-05 Esc closes the tour, the confirmation window and the assistant panel, focus returns to the opener (2.4.3), editor.
- [ ] KB-06 Ctrl+K, Ctrl+S, Ctrl+Enter, Delete work, single-letter shortcuts can be turned off or act only on focus (2.1.4), editor. Link: 51/M-06.
- [ ] KB-07 Focus is visible everywhere: an outline of at least 2 px, contrast to neighbouring colours at least 3:1 in both themes (2.4.7, 1.4.11), all screens. Link: 60/A8.
- [ ] KB-08 Focus is not hidden by the sticky header, the bottom navigation, the tour card or a tooltip (2.4.11), editor, dashboard.
- [ ] KB-09 Modal window: focus moves inside, Tab cycles, the background is unreachable, focus returns on close (2.4.3, 4.1.2), the "Close tab" window, the tour. Link: 60/A11.
- [ ] KB-10 The first Tab stop is the skip link, it is visible on focus, and there are "To the code", "to the diagram", "to the problems" links (2.4.1), editor. Link: 92/K4.
- [ ] KB-11 No more than 10 Tab stops before the code field, the file explorer does not unfold into dozens of stops (2.4.1), editor. Link: 92/K4 (was 56).
- [ ] KB-12 Tab order matches the visual order at 1366 and 375 (2.4.3, 1.3.2), editor, dashboard, settings. Link: 92/K8.
- [ ] KB-13 One `h1`, no skipped heading levels, landmarks and `title` are unique (1.3.1, 2.4.2, 2.4.6), all screens.
- [ ] KB-14 Repeated components (header, help) sit in the same place on every page, no change of context on focus or input (3.2.1, 3.2.3, 3.2.6), all screens.

### 4.2 Canvas and alternatives

- [ ] CV-01 Blocks take focus (roving tabindex), arrows move the selection (2.1.1), editor. Link: 60/A2, TODO, Canvas keyboard navigation.
- [ ] CV-02 With the keyboard one can select, rename (Enter), delete (Delete), connect and undo (2.1.1), editor. Link: 60/A2, 51/M-06.
- [ ] CV-03 Dragging has a single-pointer and keyboard alternative, with cancel on Esc or a return when released outside the board (2.5.7, 2.5.2), editor. Link: 51/M-04, M-05.
- [ ] CV-04 The "Connect" mode needs no dragging, announces its steps and the exit, and `aria-pressed` is truthful (2.5.7, 4.1.2), editor. Link: 60/T4.
- [ ] CV-05 A text alternative exists: the list of elements and links matches the code, and the SVG `title` and `desc` update after a run (1.1.1, 1.3.1), editor. Link: 60/A9.
- [ ] CV-06 Labels are at least 12 px after "Fit" at 1366 and 375 (1.4.4), editor. Link: 60/A9, R3.
- [ ] CV-07 Zoom is available through buttons, not only wheel and pinch (2.5.1), editor 375. Double click to rename has an alternative (2.5.1).
- [ ] CV-08 Lines, ports and the selection frame are at least 3:1 against the background, and a selected block and a block with an error differ by more than colour (1.4.11, 1.4.1), editor, both themes.
- [ ] CV-09 The canvas creates no focus or scroll trap (2.1.2), editor.

### 4.3 ARIA and screen readers

For the SR items record verbatim what the screen reader said, with the reader and browser versions.

- [ ] AR-01 All icons of the toolbar, tabs and bottom navigation have a name that contains the visible label (4.1.2, 2.5.3), editor. Link: TODO, aria-label.
- [ ] AR-02 Switches have `role="switch"` or a native checkbox and a correct `aria-checked` (4.1.2), settings, editor. Link: TODO. Hidden 1x1 inputs stay focusable (92/M1, M8).
- [ ] AR-03 `aria-pressed`, `aria-expanded`, `aria-selected` change with the interface, and the settings and bottom panel tabs are a `tablist` (4.1.2), editor, settings. Link: 92/K8.
- [ ] AR-04 "Run" with errors has `aria-disabled` and `aria-describedby` with the reason, and the reason is visible at 375 too (4.1.2, 3.3.1), editor. Link: 60 section 2.
- [ ] AR-05 The status line uses `aria-live="polite"`, critical errors use `role="alert"`, messages are not duplicated and do not contradict each other ("Diagram ready" while errors exist) (4.1.3), editor. Link: 92/K7.
- [ ] AR-06 The tour and windows have `role="dialog"`, `aria-modal`, `aria-labelledby` (4.1.2), editor. Link: 60/A11.
- [ ] AR-07 `data-tip` tooltips close on Esc, stay when hovered, and do not cover neighbours (1.4.13), editor. Link: 60/A7.
- [ ] AR-08 `lang` is right on the page and on inserts, `alt` is meaningful or empty, the logo is read as "DSLKit, to the home page" (3.1.1, 3.1.2, 1.1.1), all screens. Link: AB-TEST-PLAN.
- [ ] AR-09 Equal file and project names are told apart by a screen reader (2.4.6), editor, dashboard. Link: 92 problems, low.
- [ ] SR-01 Registration and sign-in: fields, hints, required marks and errors are announced, focus goes to the first invalid field (3.3.1, 3.3.3), register, login, both languages. Link: 92/K1.
- [ ] SR-02 Editor: the reader finds landmarks, the link to the code, the "DSL code" field (2.4.1), editor.
- [ ] SR-03 Code error: the reader gets the count and the text of the first error (4.1.3), editor. Link: 92/K7.
- [ ] SR-04 Adding, connecting, renaming, deleting, undoing, saving and a storage failure are announced without moving focus (4.1.3), editor. Link: commit 70878fe.
- [ ] SR-05 The "Projects found" counter is announced on search and filter (4.1.3), dashboard.
- [ ] SR-06 VoiceOver on iOS and TalkBack: swiping visits elements in a logical order, toolbar buttons are named, the canvas does not block scrolling (1.3.2, 4.1.2), 375.
- [ ] SR-07 The English version is read with an English voice, `aria-label` values are not Russian (3.1.1, 3.1.2), `/en/app/`. Link: 92/E8.

### 4.4 Contrast and colour

- [ ] CT-01 Text is at least 4.5:1, large text at least 3:1 on all backgrounds in both themes, including tooltips, the status line and the disabled button (1.4.3), all screens. Link: 60 section 3.
- [ ] CT-02 Field borders, icons, focus rings and switches are at least 3:1 (1.4.11), all screens.
- [ ] CT-03 Gradient backgrounds, colours with alpha and `color(srgb)` are recalculated at the worst point with ancestor backgrounds blended in (1.4.3), landing, `tools/contrast.js`.
- [ ] CT-04 Errors and statuses are not only red and green: text or an icon exists, and they are distinguishable with deuteranopia and in greyscale (1.4.1), problems panel, logo. Link: AB-TEST-PLAN.
- [ ] CT-05 `forced-colors` mode: focus, borders and icons stay visible (1.4.11, 2.4.7), editor, settings. Link: `components.css`.
- [ ] CT-06 Changing the theme leaves no foreign colours and no flash on load (SVG, tooltips, modal windows) (1.4.3), all screens.
- [ ] CT-07 The default theme follows the system and the choice is remembered (1.4.3), settings, header.

### 4.5 Zoom, reflow, motion

- [ ] ZM-01 Zoom 200%: no loss of function and no horizontal scroll, the canvas keeps a working height (1.4.4, 1.4.10), all screens. Link: 60 section 4, R4.
- [ ] ZM-02 Zoom 400% (320x256): content is reachable with scrolling in one direction, the canvas is an exception (1.4.10), all screens.
- [ ] ZM-03 Text-only enlargement to 200% and the 1.4.12 spacing (1.5, 2, 0.12, 0.16 em) cause no clipping or overlap (1.4.4, 1.4.12), editor, dashboard.
- [ ] ZM-04 Tooltips and menus shown on hover and focus can be dismissed and hovered (1.4.13), editor.
- [ ] ZM-05 Orientation is not locked, landscape 812x375 is usable (1.3.4), editor. Link: 92, not finished.
- [ ] ZM-06 The tour and cards take no more than half of the height at 375 and at 200% (1.4.10), editor. Link: 60 section 5.
- [ ] ZM-07 With `prefers-reduced-motion: reduce` transitions and smooth scrolling are off (2.3.3), all screens. Link: 60 section 3.
- [ ] ZM-08 Nothing flashes more than three times a second, auto-moving content longer than 5 seconds can be stopped (2.3.1, 2.2.2), landing, welcome.
- [ ] ZM-09 Toasts stay long enough and are announced by the screen reader (2.2.1, 4.1.3), editor, dashboard. Link: commit 78731a2.
- [ ] ZM-10 Signing out in another tab and session expiry are announced and data is not lost silently (2.2.1), all screens. Link: commit d314923.

### 4.6 Targets, forms, input errors

- [ ] FM-01 Targets are at least 24x24 px or spaced (2.5.8), all screens. Link: 60/A4, A5, TODO (tab close button).
- [ ] FM-02 On a phone targets are 44x44 px: toolbar, tabs, checkboxes, settings switches (2.5.5), 375. Link: 60/A6, 92/M6, 90/П-5.
- [ ] FM-03 An action fires on release and is cancelled by moving the pointer away, multi-finger gestures have an alternative (2.5.2, 2.5.1), buttons, canvas.
- [ ] FM-04 Fields have a visible `label`, required fields are named in text, `autocomplete` exists for name, email, passwords (1.3.1, 3.3.2, 1.3.5), register, login. Link: 92/M2.
- [ ] FM-05 An error is tied to its field (`aria-describedby`, `aria-invalid`), is announced, names the cause and the fix (3.3.1, 3.3.3, 4.1.3), register, login, both languages.
- [ ] FM-06 After an empty submit focus goes to the first invalid field, the old message is cleared, there are not two texts and no duplicate of the native one (3.3.1), login, register. Link: 92/E3.
- [ ] FM-07 A password can be pasted from a manager, there is no captcha without an alternative, no repeated entry is required (3.3.8, 3.3.7), login, register.
- [ ] FM-08 Dangerous actions are reversible or confirmed: deleting a project, emptying the trash, replacing code with a template (3.3.4), dashboard, editor. Link: 91/persona 1, task A2, 51/M-08.
- [ ] FM-09 Field font is at least 16 px on a phone, iOS does not zoom in (1.4.4), login, register, search. Link: 92/M2.
- [ ] FM-10 Names with any letters are not rejected by the pattern (3.3.1), register. Link: `docs/ux/reports/a11y.md` (pz23), A6.
- [ ] FM-11 An empty search and a repeated registration are explained and announced (3.3.1, 4.1.3), dashboard, register. Link: 51/M-14.
- [ ] FM-12 The field type and phone keyboard fit (`type=email`, `search`, `inputmode`) (1.3.5), 375, real device.

### 4.7 Responsiveness and mobile input

- [ ] RS-01 No horizontal scroll at 320, 360, 375, 768, 1366 (1.4.10), all screens. Link: 51/M-12, 92/M6.
- [ ] RS-02 Editor at 375: every toolbar action is reachable without sideways scrolling, the "⋯" menu is not wider than the window (1.4.10), editor. Link: 60/R1, R2, A3.
- [ ] RS-03 The dashboard section menu shows its continuation or wraps, "New diagram" has a label (1.3.1, 2.5.3), dashboard 375. Link: 92/M3, M5.
- [ ] RS-04 The "Code / Canvas" switch and the bottom navigation do not cover the code field when the on-screen keyboard is open (2.4.11), editor 375, real device.
- [ ] RS-05 The diagram is readable at 375 after "Fit", dragging with a finger works (2.5.1), editor. Link: commit 056fb06, 92/M7.
- [ ] RS-06 Tablet 768x1024 in both orientations and 360x640 with the problems panel open (1.4.10), editor. Link: 92, not finished.
- [ ] RS-07 Hover-only hints have a touch equivalent (1.4.13), editor. Link: 60/T3.
- [ ] RS-08 The guest header is not shown to a signed-in user on welcome (3.2.3), welcome. Link: 92 (smartphone problems, low), 90/П-6.

### 4.8 Texts (ux-copy ru/en) and error pages

- [ ] TX-01 `/en/` has no Russian: `aria-label`, `title`, names of starter projects and files, the "ГОСТ" label (3.1.1), English pages. Link: 92/E4, E6.
- [ ] TX-02 `/` has no English outside language names and terms, list values (`arrow`) are translated (3.1.2), editor. Link: 60/T2.
- [ ] TX-03 The ru/en string table is checked pair by pair, length does not break the layout, meaning is equal, one action has one verb on its button (3.2.4), all screens.
- [ ] TX-04 Code error messages name the expected form (3.3.3), problems panel. Link: 60/T5, 91/persona 1, task A3.
- [ ] TX-05 Empty states ("No problems", empty canvas, empty search) say what to do next (3.3.5), editor, dashboard. Link: 60/T6, 90/П-13.
- [ ] TX-06 Messages show the current file name, not `order.dsl` (3.3.1), problems panel. Link: 51/M-03, 90/П-9.
- [ ] TX-07 "Planned" and "beta" statuses are right (UML), the breadcrumb belongs to the current notation (2.4.6), landing, editor. Link: 90/П-12, 92 problems.
- [ ] TX-08 Dates and numbers follow the page language, the card time and the status line time agree, `prompt` and `confirm` dialogs are translated (3.1.1), dashboard. Link: 92 section on formats.
- [ ] TX-09 The tone is uniform, terms ("engine", DSL) are explained or link to help, placeholders do not replace labels (3.3.2), welcome, docs, search.
- [ ] TX-10 The tour refers to real elements and has a step on adding and connecting blocks (3.3.5), editor. Link: 60/T1.
- [ ] ER-01 Pages 400, 403, 404, 405, 431, 500 return the right HTTP status and have their own `title`, one `h1`, a skip link and a "Home" link (2.4.1, 2.4.2), `site/errors/`.
- [ ] ER-02 The 404 page under `/en/...` is in English or has the right `lang` on its sections, with dark theme, contrast and focus like other pages (3.1.1, 1.4.3, 2.4.7), `/en/nonexistent`. Link: 92/E8.
- [ ] ER-03 Error pages are readable at 320 and at 400%, expose no internal details, have no broken links (1.4.10, 2.4.4), 500, 431, footer.
- [ ] ER-04 A network or API error in the interface is announced by the screen reader and offers a retry (4.1.3, 3.3.3), editor, assistant.

### 4.9 Usability sessions and A/B checks

- [ ] US-01 3-5 participants are selected (student, analyst or developer, teacher, one keyboard or screen reader user, one with no DSL knowledge), written consents are received.
- [ ] US-02 A pilot with a colleague is done, task wording and timing are fixed, tasks T1-T9 are on cards without button names.
- [ ] US-03 Every session records TSR, time on task, errors, hints, SEQ, then SUS and UMUX are collected.
- [ ] US-04 Observations are recorded verbatim with the screen and step, participant words are kept apart from observer judgements.
- [ ] US-05 Defects are filed in the 51 format with a P0-P3 priority and a WCAG criterion.
- [ ] US-06 The report states the small sample, contains no invented percentages and separates the simulations of 90-92 from participant data.
- [ ] US-07 A session with a keyboard or screen reader user is held on their device and with their settings.
- [ ] AB-01 Only one element differs between A and B, and the light, dark, one-colour and 16x16 versions are ready (AB-TEST-PLAN, rules 1 and 3).
- [ ] AB-02 Variant B passes section 4.4 and FM-01 as accessibility guardrails (1.4.3, 1.4.11, 2.5.8), including the landing first-screen variant (commit `c20499a`), the dot grid does not reduce contrast.
- [ ] AB-03 Assignment is random and sticky (`localStorage`), there is one primary metric (CTR of "Open editor"), guardrails are bounce, time on page and load errors (AB-TEST-PLAN, rule 4).
- [ ] AB-04 The sample size is calculated (about 18,850 per group at baseline 8% and +10%), with low traffic a 5-second test with 5-50 respondents is used, the result is not peeked at before the sample is reached, and the outcome is written to the log (AB-TEST-PLAN, rule 5).

## 5. How to run

Commands run from the repository root. Test bench: `http://localhost:5173` or another port.

| Task                   | Command or action                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Test bench             | `npm start` or `node tools/serve.js site 5190`. Build: `npm run build`, then `npm run start:prod`                                                                  |
| Repository checks      | `npm run format:check`, `npm test`                                                                                                                                 |
| Automated e2e          | `python testing-course/full/editor-e2e.py`, `python testing-course/full/auth-e2e.py`, the whole set `npm run tc:full`                                              |
| axe-core               | `npx @axe-core/cli http://localhost:5173/app/editor.html --tags wcag2a,wcag2aa,wcag22aa` for each page of section 1, both languages                                |
| Lighthouse             | `npx lighthouse http://localhost:5173/app/editor.html --only-categories=accessibility --output=json --output-path=docs/metrics/lighthouse-editor/report.json`      |
| Contrast of a pair     | `node -e "import('./tools/contrast.js').then(m=>console.log(m.contrast('#ffffff','#2563eb')))"`, colours from `site/css/variables.css` in both themes              |
| Markup                 | `npx html-validate site/app/*.html site/en/app/*.html site/errors/*.html`                                                                                          |
| Keyboard               | Without a mouse: Tab, Shift+Tab, Enter, Space, Esc, arrows. Record the number of stops before the code field and any lost focus                                    |
| Zoom and modes         | Ctrl and plus up to 200% and 400%. DevTools, Rendering: `prefers-reduced-motion`, `forced-colors`, `prefers-color-scheme`. 1.4.12 styles through a user stylesheet |
| Mobile                 | DevTools, Device toolbar: 320x568, 360x640, 375x812, 768x1024, 812x375, then real devices                                                                          |
| NVDA                   | Firefox, browse mode (arrows) and forms mode (Tab), Speech Viewer for the speech log                                                                               |
| VoiceOver and TalkBack | macOS: Cmd+F5, Safari, rotor Ctrl+Option+U. iOS: Settings, Accessibility. Android: TalkBack, swipe and double tap                                                  |
| Persona scripts        | `docs/testing-kulikov/scripts-ui/` (Playwright, Python), a clean profile and a new registration per session                                                        |

## 6. Artifacts

### 6.1 Contents

An automated check log (axe, Lighthouse, html-validate, build commit). A completed section 4 checklist with the statuses "passed, failed, not checked, not applicable" and screenshot links. Recorded NVDA and VoiceOver speech. A contrast table (pair, value, threshold, theme). The ru/en string table. Session protocols using template 6.3. A metric summary with a note on the sample. Defects in the 51 format with a P0-P3 field, a criterion and a screen. Screenshots in the manner of `docs/testing-kulikov/screens-ux/`.

### 6.2 Tasks and metrics

| No. | Task for the participant                    | Success                                    | Link         |
| --- | ------------------------------------------- | ------------------------------------------ | ------------ |
| T1  | Register and sign in                        | Signed in unaided                          | 92/K1, 90/С1 |
| T2  | Create a diagram from the IDEF0 template    | The editor opens with a working diagram    | 90/С2        |
| T3  | Rename a block and add a new one            | The block is in the code and on the canvas | 90/С3        |
| T4  | Connect two blocks with a link              | The link is visible, no errors             | 60/T4        |
| T5  | Find the error in the diagram and fix it    | The problems panel is empty                | 91/A3        |
| T6  | Save your work and find it by search        | The project is open                        | 90/С4        |
| T7  | Save a picture of the diagram for a report  | The file is received                       | 90/С6, 91/A6 |
| T8  | Turn on the dark theme and English          | Both settings applied                      | 92/E7        |
| T9  | On a phone make an edit and run the diagram | The edit shows on the canvas               | 92/M6        |

- TSR: the share of tasks done without a moderator hint, per task and overall, partial success counted apart.
- Time on task: from the end of reading the card to the words "I am done", limit 5 minutes, with a small sample the median and range.
- Errors and hints: the number of wrong actions, backtracks and requests for help.
- SEQ: "How easy was the task", 1-7, after every task.
- SUS: 10 questions with 5 points. Odd items give the answer minus 1, even items give 5 minus the answer, the sum is multiplied by 2.5. Reference 68.
- UMUX: 4 questions with 7 points. Positive items give the answer minus 1, negative items give 7 minus the answer, the sum is divided by 24 and multiplied by 100. UMUX-Lite with 2 questions is acceptable.
- The targets SUS 82+ and IDEF0 time from 15 to 8 minutes in `UX-RESEARCH-RESULTS.md` stay hypotheses until measured.

### 6.3 Usability session protocol template

| Field                                                                            | Value |
| -------------------------------------------------------------------------------- | ----- |
| Session, date, moderator, observer                                               |       |
| Participant (code, role, experience with diagrams and DSL, assistive technology) |       |
| Device, OS, browser, window width, language, theme                               |       |
| Commit and build address, consent and recording                                  |       |

| Task | Time, s | Success (yes, partial, no) | Hints | Errors | SEQ 1-7 | Participant quote | Observation (screen, step) | Defect ID |
| ---- | ------- | -------------------------- | ----- | ------ | ------- | ----------------- | -------------------------- | --------- |
| T1   |         |                            |       |        |         |                   |                            |           |
| T2   |         |                            |       |        |         |                   |                            |           |
| T3   |         |                            |       |        |         |                   |                            |           |
| T4   |         |                            |       |        |         |                   |                            |           |
| T5   |         |                            |       |        |         |                   |                            |           |
| T6   |         |                            |       |        |         |                   |                            |           |
| T7   |         |                            |       |        |         |                   |                            |           |
| T8   |         |                            |       |        |         |                   |                            |           |
| T9   |         |                            |       |        |         |                   |                            |           |

| Session result                                                        | Value |
| --------------------------------------------------------------------- | ----- |
| TSR, SUS (answers and total), UMUX (answers and total)                |       |
| Three best and three worst moments                                    |       |
| Debrief: what was unclear, what was expected, would they recommend it |       |
| Deviations from the script                                            |       |

### 6.4 Moderator script

1. Welcome: "We are testing the program, not you, you cannot make a mistake". The right to stop at any time. Consent, recording with permission, a questionnaire (role, experience, assistive technology).
2. Think aloud: "Say out loud what you see, what you expect, what confuses you". Show an example on an unrelated site.
3. Tasks one at a time on a card. Do not hint at button names. After more than 30 seconds of silence ask "What are you thinking about now?". A hint turns success into partial success or failure, and the hint time is recorded.
4. After a task ask SEQ. After 5 minutes move to the next task.
5. After the tasks give SUS and UMUX, then the debrief: what was most unclear, what was most pleasant, what they would change.
6. Thank the participant, anonymise the participant code, save the protocol. For a screen reader or keyboard participant do not comment on their reader, the tasks are the same.
7. English variant: the same steps, tasks on `/en/app/`, at least one participant with no Russian.

### 6.5 Assumptions

- There are no run results in this document on purpose. The numbers from 60, 90, 91, 92 and `UX-RESEARCH-RESULTS.md` belong to earlier runs and persona simulations.
- The exit thresholds (TSR 80%, SUS 68, zero A and AA violations) are proposed by the plan and wait for the owner's decision.
- The sources disagree: 60/A1 says Esc does not release the Tab mode, 92/K5 describes leaving with Esc and then Tab. Item KB-02 records the current behaviour.
