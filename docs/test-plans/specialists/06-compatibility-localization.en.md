# 06. Compatibility, responsiveness and localization: test plan and checklist

DSLKit project, branch `testing-course-full`. The site `site/` (Russian at the root, English in `site/en/`), the application pages `site/app/*` and `site/en/app/*`, the `dist/` build. This document does not repeat earlier findings and links to them instead: the matrix and bugs `docs/testing-kulikov/70`, `71`, the markup audit `95`, the user-persona review `92`, the quick Firefox and Edge run `docs/metrics/browsers`, the script `tools/evidence/cross2.mjs`, the screenshots `docs/testing-kulikov/screens-devices`.

## 1. Role and scope

The compatibility, responsiveness and localization specialist makes sure the same scenarios give the same result in different browsers, on different screens, in two languages and in two themes.

In scope: browsers and engines Blink, Gecko, WebKit (desktop and mobile), breakpoints 576, 768, 1024 px (CSS uses only `min-width`), orientations, zoom up to 400 percent, pixel density and 4K, light and dark theme with `prefers-*` and `forced-colors`, feature support (`color-mix`, `clamp`, `:has`, `dvh`, logical properties, File API, Service Worker, WebCrypto, Pointer Events), input by mouse, touch and keyboard, block dragging, file export and import, `localStorage`, PWA and offline, printing, RU and EN localization (completeness, switching, string length, dates and numbers, `hreflang`, `canonical`), search-engine markup and W3C validators.

Out of scope: performance (a separate specialist), security and full WCAG accessibility. Accessibility is touched only where it depends on the device (touch targets, zoom, theme contrast).
Already done and not repeated: the Chromium 153, Edge 156 and Chrome 156 device run (file 70), 8 defects BUG-CB-01..08 (file 71), the CSS and HTML audit (95: CSS-01..21, HTML-01..04), Firefox 157 and Edge 155 on 20 checks (`docs/metrics/browsers`). Not done: Playwright Firefox and WebKit, real iOS and Android, 360x640 and 768x1024 in the persona review, landscape 812x375, the pinch gesture, the on-screen keyboard, printing outside Chromium.

## 2. What is checked (priorities P0-P3)

| Priority | Meaning                                                 | DSLKit examples                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | The main path fails or data is lost in a target browser | the editor does not open or does not draw a diagram, registration and sign-in fail (WebCrypto PBKDF2), `localStorage` is unavailable with no explanation, toolbar buttons are pushed off the screen (BUG-CB-02) |
| P1       | A key feature degrades or differs between browsers      | block dragging by touch (BUG-CB-01), file export and import, offline mode and Service Worker registration, theme and language switching, Russian text on EN pages, wrong `hreflang` and `canonical`             |
| P2       | A noticeable inconvenience without losing the function  | touch targets under 44 px (BUG-CB-04), clipped list text (BUG-CB-06, BUG-CB-07), printing, date format, no fallback for `color-mix` (CSS-16), Rich Results errors                                               |
| P3       | Cosmetics and style                                     | html-validate style remarks (HTML-02), identical media blocks kept apart (CSS-09), duplicate selectors, repeated `theme-color` in `<head>`                                                                      |

Assignment rule: the priority follows the worst consequence in Tier 1 (table 3.2). The same defect in Tier 3 is lowered by one step.

## 3. Plan

### 3.1 Goals

1. Confirm that all scenarios of file 11 (checklists) pass in Chrome, Edge, Firefox and WebKit with no console errors.
2. Close the blind spots: Firefox and WebKit through Playwright, real iOS Safari and Android Chrome (by hand), printing, PWA installation.
3. Check the breakpoint borders 575/576, 767/768, 1023/1024 and the 320 px width (WCAG 1.4.10, reflow without horizontal scroll).
4. Confirm RU and EN completeness and close what file 92 found (404 under `/en/`, Russian starter project names, the `aria-label` "Закрыть файл").
5. Make sure the SEO markup (Schema.org microdata, `hreflang`, `canonical`, sitemap) is valid and symmetric for RU and EN.
6. Re-check the 8 BUG-CB defects and the 27 findings of file 95 on the current build and mark their status.

### 3.2 Matrix: browser, OS, device

Levels: Tier 1 blocks a release, Tier 2 is checked before release by hand or selectively, Tier 3 when possible.

| Browser, engine                                    | OS                            | Device and viewport                       | Method                                                        | Tier | What exists                                               |
| -------------------------------------------------- | ----------------------------- | ----------------------------------------- | ------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| Chromium (Playwright builds 1243 and 1248), Blink  | Windows 11                    | 1366x768, 1920x1080, 3840x2160, zoom 200% | Playwright, default channel                                   | 1    | main run of file 70, `chromium-*` screenshots             |
| Google Chrome stable (156 and newer)               | Windows 11                    | laptop 1366, iPhone 13, iPhone SE         | Playwright `channel="chrome"`                                 | 1    | partial (70)                                              |
| Microsoft Edge stable (156 and newer)              | Windows 11                    | laptop 1366, iPhone 13                    | Playwright `channel="msedge"` and `tc:full`                   | 1    | partial (70), 20 of 20 (`docs/metrics/browsers`)          |
| Firefox stable (157 and newer), Gecko              | Windows 11                    | 1280, 375                                 | Playwright `firefox` and desktop Firefox through `cross2.mjs` | 1    | 20 of 20 through puppeteer-core, Playwright never started |
| WebKit (Playwright `webkit`)                       | Windows 11                    | 1366, iPhone 13, iPad (gen 7)             | Playwright `webkit`                                           | 1    | none                                                      |
| Safari 17 and newer                                | macOS                         | MacBook 1440x900                          | by hand                                                       | 2    | none                                                      |
| Safari iOS 17 and newer                            | iPhone 13 or newer, iPhone SE | 390x844, 375x667, landscape 844x390       | by hand on the device                                         | 2    | Chromium emulation only                                   |
| Chrome Android 130 and newer                       | Pixel 7 or similar            | 412x915, landscape 915x412                | by hand, remote debugging                                     | 2    | emulation only                                            |
| Samsung Internet                                   | Galaxy Tab S4 or a phone      | 800x1280                                  | by hand                                                       | 3    | Chromium emulation                                        |
| Firefox ESR, Chrome and Firefox on Linux and macOS | Linux, macOS                  | 1440x900                                  | Playwright on another machine                                 | 3    | none                                                      |

Devices and viewports (for every engine where available): 320x568, 360x640, 375x667, 390x844, 412x915, 768x1024 and 1024x768, 1366x768, 1920x1080, 2560x1440, 3840x2160. Density 1, 2, 3. Portrait and landscape, on a phone 812x375 and 915x412. Borders: 575 and 576, 767 and 768, 1023 and 1024. Page zoom 100, 125, 150, 200, 400 percent (400 percent at 1280 equals 320 CSS px).

### 3.3 Approach

- Automation: Playwright (Python, as in `testing-course/full`) runs the loop "engine × device × page" and collects console errors, horizontal scroll and screenshots. It extends the file 70 scripts, which had no Firefox or WebKit.
- Live browsers: `tools/evidence/cross2.mjs` for desktop Firefox and Edge where the Playwright build does not start.
- A manual pass over the section 4 checklist on real Tier 2 devices: touch, on-screen keyboard, PWA installation, printing.
- Every defect links to a BUG-CB, CSS or HTML id from files 71 and 95 when one exists, new ones are numbered BUG-CB-09 onward in the format of file 71.
- Screenshots are named `[dist-]browser-device-screen.png`, as in `screens-devices`, and compared by eye. The check runs on `site/` and on `dist/` (the `esbuild` build), because the file 70 bugs reproduced on both.

### 3.4 Environment

- Windows 11, Node 20 or newer, Python 3 with `playwright` 1.63, Playwright browsers (`chromium`, `firefox`, `webkit`), installed Chrome, Edge, Firefox.
- Server: `npm start` (`site/`, port 5173) and `npm run start:prod` (`dist/`, port 5173, one after the other).
- Locales: `ru-RU` and `en-US`, time zones `Europe/Minsk` and `America/New_York` for date checks.
- Data: a clean profile for every run and a separate run with filled `localStorage` (keys with the prefix `dslkit.`, for example `dslkit.projects.`, `dslkit.accounts`, `dslkit.tour-done`). Accounts are test and local only.
- Mobile devices: real iPhone and Android, reaching `http://<laptop address>:5173` over the local network. WebCrypto and Service Worker need a secure context, so on a phone use an HTTPS tunnel or `chrome://inspect` with port forwarding.

### 3.5 Entry and exit criteria

Entry:

- the build starts, `npm test` and `npm run format:check` are green, the list of changed files in `site/` is known
- the machine is free of outside load (in file 70 a 100 percent load caused timeouts)
- the Playwright browsers are downloaded and start
  Exit:
- all P0 and P1 items of the checklist pass in Tier 1, each item has a screenshot or a log
- zero console errors except the expected offline error of the request to `kroki.io/health`
- zero horizontal document scroll on all pages and viewports from 3.2
- no open BUG-CB with priority P0 or P1, the rest are filed with an owner
- everything not checked is listed with a reason (as in section 7 of file 70)

### 3.6 Risks

| Risk                                                                                     | Impact                                          | Mitigation                                                                                                                 |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Playwright Firefox or WebKit does not start on the machine (file 70 had `spawn UNKNOWN`) | the blind spot stays                            | `python -m playwright install firefox webkit`, fallback: `cross2.mjs` with desktop Firefox, WebKit on macOS or a cloud rig |
| Chromium emulation passes for iOS and Android                                            | a false "Pass"                                  | close touch and keyboard items only on real devices, mark "emulation" in the report                                        |
| Machine load breaks timeouts, the build changes during the run                           | false "Fail", results that cannot be compared   | one process, rerun failures, commit hash in the report                                                                     |
| Secure context on a phone                                                                | WebCrypto and Service Worker do not work        | HTTPS tunnel, `localhost` through port forwarding                                                                          |
| The external Kroki service is down, caniuse versions change                              | differences between runs, a stale support table | built-in engine, the offline error is expected, check caniuse on the day of the run                                        |

## 4. Checklist

Notes: (P0..P3) is the priority, the reference in brackets points to an earlier finding.

### A. Browser and engine matrix

- [ ] A1. (P0) The landing pages `/` and `/en/` open with no console errors in Chrome, Edge, Firefox, WebKit.
- [ ] A2. (P0) Registration and sign-in work in Firefox and WebKit (WebCrypto PBKDF2, file 70 section 3, Firefox is "not checked" there).
- [ ] A3. (P0) Editor: code input and diagram rendering in all four engines.
- [ ] A4. (P1) Rendering of the 33 notations gives a non-empty SVG in Edge, Chrome, Firefox, WebKit (Edge and Chrome are "not checked").
- [ ] A5. (P1) The "My projects" redirect to `login.html` without sign-in in all engines.
- [ ] A6. (P1) Chrome 156 and Edge 156 match Chromium 153 on every item of this section (repeat on newer versions).
- [ ] A7. (P1) The 20 checks of `docs/metrics/browsers` repeated on the current build in Firefox 157 or newer and Edge.
- [ ] A8. (P2) `dist/` run in Firefox and WebKit, not only in Chromium (file 70 section 5).
- [ ] A9. (P2) Screenshots of one screen in different engines compared: shifts, fonts, scrollbars, focus rings. Safari macOS and Samsung Internet checked selectively (P3).

### B. Breakpoints, orientations, devices

- [ ] B1. (P0) No horizontal document scroll at 320, 360, 375, 390, 412, 768, 1024, 1366, 1920 px on all 15 pages (RU and EN).
- [ ] B2. (P0) Editor at 320, 375, 390, 412: toolbar buttons and bottom navigation items stay inside the screen (BUG-CB-02, CSS-02).
- [ ] B3. (P1) Borders 575/576, 767/768, 1023/1024: the layout changes exactly at the border, with no jumps or empty areas.
- [ ] B4. (P1) Landscape 812x375 and 915x412: the editor, dialogs and tour are not clipped in height (BUG-CB-03).
- [ ] B5. (P1) Tablets iPad (gen 7) 768x1024 and Galaxy Tab S4: portrait and landscape switching, the cursor status does not stretch the page (remark in file 70).
- [ ] B6. (P1) Editor bottom panel: the height does not jump when tabs change (CSS-04, CSS-05).
- [ ] B7. (P2) "My projects" on a phone: the search field and tabs are fully visible, section navigation is not hidden past the edge (BUG-CB-07, file 92).
- [ ] B8. (P2) The theme button in the top bar does not shrink to 16 px at 320 and 375 (CSS-06).
- [ ] B9. (P2) The "Link type" list shows readable text at narrow widths (BUG-CB-06, UI-01).
- [ ] B10. (P2) The tutorial tour window fits 360x640 and 320x568 (BUG-CB-03).
- [ ] B11. (P2) Notches and safe areas: check `env(safe-area-inset-*)` on an iPhone with a notch in landscape.
- [ ] B12. (P2) Address bar and `100dvh`: the bottom panel does not slide under the browser bar on iOS and Android.
- [ ] B13. (P3) 2560x1440 and 3840x2160: content is neither stretched nor too small (compare `chromium-4k3840-*` on the new build). CSS adaptivity uses only `min-width`, the exceptions (`pointer: coarse`, `prefers-*`, `forced-colors`) are justified (CSS-10).

### C. Zoom, fonts, HiDPI and 4K

- [ ] C1. (P1) Zoom 200 percent at 1366: the interface is usable, no horizontal scroll (BUG-CB-08, repeat the 683x384 window at a height of 768).
- [ ] C2. (P1) Zoom 400 percent (320 CSS px): reflow without losing functions except the canvas.
- [ ] C3. (P1) Large system font (browser 125 and 150 percent, Android "large font"): labels do not run into neighbours.
- [ ] C4. (P1) Input fields on iOS: font size not below 16 px, otherwise the page zooms on focus (file 92, 15 px fields).
- [ ] C5. (P2) Fonts: the system stack, `font-family` substitutes render without a shift on Windows, macOS, Android, iOS. The project has no `@font-face`.
- [ ] C6. (P2) HiDPI dpr 2 and 3: icons, logo and the SVG diagram are sharp, lines thinner than 1 px do not vanish.
- [ ] C7. (P2) 4K 3840x2160 with OS scale 100 and 150 percent: text is not smaller, the canvas fills the area.
- [ ] C8. (P2) Manifest raster icons 192, 512 and maskable 512 are not blurred at dpr 3.
- [ ] C9. (P3) The "Code font size" setting (13 px and extreme values) and long words without spaces in project names do not break the editor and cards.

### D. Theme and system settings

- [ ] D1. (P1) `prefers-color-scheme: dark` without a user choice turns on the dark theme on all pages, with no flash of the light one.
- [ ] D2. (P1) An explicit theme choice beats the system setting and survives a reload (`data-theme`, `localStorage`).
- [ ] D3. (P1) Token contrast in both themes is not below the thresholds (`node --test tools/contrast.test.js`, values from file 95).
- [ ] D4. (P2) Code highlighting, the problems panel, the canvas and diagrams are readable in the dark theme, the SVG background is transparent (CSS-14).
- [ ] D5. (P2) `prefers-reduced-motion: reduce` turns off animations and transitions, including `dslkit-reveal` (CSS-19).
- [ ] D6. (P2) `forced-colors: active` (Windows high contrast): button borders, focus and icons are visible.
- [ ] D7. (P2) `color-scheme` in `<meta>` and CSS agree, system controls (scrollbars, fields, `<select>`) follow the theme.
- [ ] D8. (P2) `theme-color` and the phone status bar match the theme, the repeated tag in `<head>` is removed (lines 11 and 18 of `site/index.html`).
- [ ] D9. (P3) A system theme change on an open page is reflected when the user did not choose a theme. Printing from the dark theme gives a light page.

### E. Feature support

Check the minimum versions against caniuse on the day of the run.

- [ ] E1. (P1) `color-mix()` (11 uses, no `@supports`, CSS-16): in browsers without support the card grid and header background stay readable.
- [ ] E2. (P1) `clamp()` (26 uses): heading and spacing sizes stay within limits at 320 and 3840.
- [ ] E3. (P1) `:has()` (5 uses): a fallback behavior where the selector is unsupported.
- [ ] E4. (P1) `100dvh` and `100vh` (5 and 2 uses): height in mobile browsers with a dynamic address bar.
- [ ] E5. (P1) Service Worker: `'serviceWorker' in navigator`, registration and an error do not break the page (`pwa.js`), including Firefox and Safari private mode.
- [ ] E6. (P1) File API: `input[type=file]`, `FileReader`, dropping a code file onto the page, `Blob` and `URL.createObjectURL` for downloads.
- [ ] E7. (P1) WebCrypto `crypto.subtle` exists only in a secure context: check `http://localhost` and a network address (access is closed there with a clear message).
- [ ] E8. (P2) Container queries: the CSS has no `@container` (0 uses), the item records that a fallback rule is added if one appears.
- [ ] E9. (P2) Logical properties (`margin-inline`, `padding-block`, `inset`) render the same, the remaining physical properties do not break the layout (CSS-17).
- [ ] E10. (P2) Pointer Events and `touch-action` on the SVG root, not on inner elements (BUG-CB-01).
- [ ] E11. (P2) `matchMedia` (10 uses): theme and size listeners do not fail in older Safari (`addListener`).
- [ ] E12. (P3) `accent-color`, `text-wrap`, `backdrop-filter`, `aspect-ratio`: degradation with no visible breakage.

### F. Input: mouse, touch, keyboard

- [ ] F1. (P1) Block dragging by mouse at 1366, 1920, 4K, in Firefox and WebKit (file 70 covers Chromium only).
- [ ] F2. (P1) Block dragging by finger on iPad, Galaxy Tab, iPhone, Pixel: no `pointercancel`, `pos=XxY` is written to the code (BUG-CB-01), checked on real iOS and Android.
- [ ] F3. (P1) Dragging does not block page scroll outside the canvas.
- [ ] F4. (P1) The two-finger zoom on a diagram and page zoom do not conflict.
- [ ] F5. (P1) On-screen keyboard: the code field is not covered, the bottom panel does not overlap, the page scrolls to the caret.
- [ ] F6. (P2) Touch targets at least 44 by 44 px: editor buttons, "Skip", the form checkbox, mail links (BUG-CB-04, CSS-07, CSS-08).
- [ ] F7. (P2) No dependence on `:hover`: tooltips and menus are reachable by touch and by focus (UI-02).
- [ ] F8. (P2) Keyboard: Tab order, Enter and Space on buttons, Esc closes menus and dialogs, focus returns (file 92, persona 1).
- [ ] F9. (P2) Ctrl+S and Cmd+S (macOS) save the project and do not open the browser dialog.
- [ ] F10. (P2) Right click, long press and double tap on a block do not open an unwanted OS menu.
- [ ] F11. (P3) IME, dictation, autocorrect and RU and EN layouts: input in the code field works, hotkeys do not depend on the layout.

### G. Files and storage

- [ ] G1. (P0) Export of the diagram and code: the file downloads with a correct name and extension in all engines, a Cyrillic name does not break.
- [ ] G2. (P0) Import of `.puml`, `.mmd`, `.md`, `.txt`, `.dsl` through the file picker and through dropping, the content matches.
- [ ] G3. (P1) Import of a file in another encoding (UTF-8 with BOM, UTF-16, Windows-1251): a clear reaction, not garbled text.
- [ ] G4. (P1) Loading an empty, a very large and an unsuitable file: an error message, the page stays alive.
- [ ] G5. (P1) Download on iOS Safari: the file opens through "Share" or is saved, not lost.
- [ ] G6. (P0) `localStorage` disabled or full (Safari private mode, cookies blocked): a clear message, no blank page.
- [ ] G7. (P1) Data of one profile is not visible in another and does not mix between `localhost:5173` and a network address.
- [ ] G8. (P2) Two tabs of the same application: changes in one do not overwrite the project in the other without a warning.
- [ ] G9. (P2) Switching RU and EN does not lose projects and the session. Clearing site data returns the first launch, the tour shows again (`dslkit.tour-done`).

### H. PWA and offline

- [ ] H1. (P1) The manifest is valid: name, `start_url`, `scope`, `display`, colors, icons 192, 512, maskable (DevTools, Application panel).
- [ ] H2. (P1) Installation on Chrome and Edge (desktop) and Chrome Android: the window starts in `standalone` mode on `app/dashboard.html`.
- [ ] H3. (P1) Installation on iOS through "Add to Home Screen": icon, name, start page.
- [ ] H4. (P1) Service Worker `dslkit-v5` registers, `SHELL` caches every listed RU and EN page, none returns 404.
- [ ] H5. (P1) Offline after the first visit: `index`, `editor`, `dashboard` and the EN versions open without a network.
- [ ] H6. (P1) Changing `VERSION`: the old cache is removed, the user gets the new build without manual clearing.
- [ ] H7. (P2) Requests to foreign servers (Kroki) go to the network and are not cached, offline shows a clear message.
- [ ] H8. (P2) The manifest is Russian only (`lang: ru`): installing from `/en/` starts on the Russian dashboard, decide and record the expected behavior.
- [ ] H9. (P2) Firefox and Safari: Service Worker exists, installation does not, the page works. Lighthouse gives no manifest warnings (maskable, `id`, screenshots).

### I. Printing

- [ ] I1. (P2) Editor print: panels and buttons are hidden, the diagram and code remain (`@media print`, `editor.css`), an A4 PDF is produced (BUG-CB-05, fixed for the editor only, verify).
- [ ] I2. (P2) Landing, privacy policy, documentation pages: no `@media print`, the header, menu and background stay in print (CSS-18).
- [ ] I3. (P2) The diagram does not split across pages and is not cut at the right edge of A4 and Letter.
- [ ] I4. (P3) Black text on white, no extra blank page, the Firefox and Safari preview matches Chromium, the EN version prints English labels.

### J. RU and EN localization

- [ ] J1. (P1) All 9 application pages and 3 site pages have an RU and EN pair, the set of elements and classes matches (`site/app/*`, `site/en/app/*`).
- [ ] J2. (P1) The 404 page and the other error pages under `/en/` are English (file 92: currently fully Russian).
- [ ] J3. (P1) Starter projects, the "ГОСТ" label and their `aria-label` are translated in the EN interface (file 92).
- [ ] J4. (P1) `aria-label` such as "Закрыть файл …" and the file name "сумма-чисел.dsl" in the EN editor are translated (file 92).
- [ ] J5. (P1) Russian text search: `grep` for Cyrillic in `site/en/**` and in `site/js` strings chosen when `lang` equals `en`, the remainder is explained (language names are allowed).
- [ ] J6. (P1) The language switcher leads to the equivalent page, not to the home page, and keeps context (editor, settings).
- [ ] J7. (P1) `<html lang>` matches the page language, nested fragments carry their own `lang` (`Русский`, `English`).
- [ ] J8. (P2) Validation errors, `prompt` and `confirm` dialogs, toasts, the status bar and empty states in both languages.
- [ ] J9. (P2) The old sign-in error is cleared by a new one, two messages are never shown together (file 92).
- [ ] J10. (P2) String length: EN shorter or longer than RU does not break buttons, tabs, cards, the toolbar at 320 and 375. Check the longest labels in both languages.
- [ ] J11. (P2) Dates: format follows the page language (`Intl.DateTimeFormat`), today ISO in both (file 92), 12 and 24 hours, the card and status bar time zones agree.
- [ ] J12. (P2) Numbers and units: decimal and thousands separators, "13 px", "3 of 5 diagrams per day", Russian plural forms (1 диаграмма, 2 диаграммы, 5 диаграмм).
- [ ] J13. (P2) The "My templates" and "Shared" pages in EN show no irrelevant notation filters (file 92).
- [ ] J14. (P2) The welcome page does not show "Sign in / Sign up" to a signed-in user in either language (file 92).
- [ ] J15. (P3) Text in exported files and default names match the interface language. A trial `dir="rtl"` does not break logical properties.

### K. SEO markup

- [ ] K1. (P1) `canonical` on every indexable page points to itself and to the domain `https://dslkit.io`, with no typos and no parameters.
- [ ] K2. (P1) `hreflang` ru, en and `x-default` on `/`, `/en/`, `privacy.html`, `en/privacy.html`, `thanks.html`: reciprocal links are symmetric.
- [ ] K3. (P1) `sitemap.xml`: addresses answer 200, the `xhtml:link` blocks match the tags in the pages, `lastmod` is current.
- [ ] K4. (P1) `robots.txt`: `/errors/` is closed, the rest is open, the sitemap link is correct, application pages behind sign-in are not indexed (`noindex`).
- [ ] K5. (P1) Schema.org microdata `SoftwareApplication` and `Offer` on `/` and `/en/` pass the Rich Results Test and validator.schema.org (paste the code as a snippet, localhost is not reachable for cloud checks).
- [ ] K6. (P2) Microdata values (price 0, currency, category, OS) match the visible page text in both EN and RU.
- [ ] K7. (P2) `title` and `meta description` are unique, within snippet length, different for RU and EN.
- [ ] K8. (P2) Open Graph and Twitter: title, description, image, `og:locale` and `og:locale:alternate` per language.
- [ ] K9. (P2) Exactly one `h1` per page, heading hierarchy without gaps (confirmed in 95, repeat after changes).
- [ ] K10. (P2) Internal links and the language switch link have no 404, external links carry `rel`.
- [ ] K11. (P3) Lighthouse SEO at least 90 on `/` and `/en/` in mobile and desktop profiles. `/en/nonexistent` returns 404, `index.html` and `/` are not duplicated.

### L. Validators and static analysis

- [ ] L1. (P1) html-validate over all `site/**/*.html`: no errors except the agreed style ones (HTML-02), `wrap="off"` is fixed (HTML-01).
- [ ] L2. (P2) W3C Nu Html Checker (`vnu.jar`) over `site/**/*.html`: zero errors, warnings reviewed.
- [ ] L3. (P2) W3C CSS Validator over `site/css/*.css`: remarks on new features (`color-mix`, nesting) are separated from real errors.
- [ ] L4. (P2) `npx prettier --check .` and `npm test` are green after compatibility fixes.
- [ ] L5. (P3) Duplicate selectors, dead rules, magic `z-index`, `!important` (CSS-11, 13, 14, 15, 20) recounted, no `@media` with `max-width`.

## 5. How to run

Preparation:

```
cd E:\DSLKit-Project
npm install
python -m pip install playwright
python -m playwright install chromium firefox webkit
npm start
```

The site is at `http://localhost:5173`. For `dist/` stop the server, then `npm run build` and `npm run start:prod`.
The loop "engine × device × page" (Playwright, Python) collects console errors and horizontal scroll:

```python
from playwright.sync_api import sync_playwright
BASE = "http://localhost:5173"
PAGES = ["/", "/en/", "/app/login.html", "/app/editor.html", "/en/app/editor.html"]
DEVICES = {"chromium": ["Pixel 7", "iPad (gen 7)"], "webkit": ["iPhone 13"], "firefox": []}
SIZES = [(320, 568), (375, 667), (768, 1024), (1366, 768), (1920, 1080)]
with sync_playwright() as p:
    for engine, devices in DEVICES.items():
        browser = getattr(p, engine).launch()
        contexts = [(d, browser.new_context(**p.devices[d])) for d in devices]
        contexts += [(f"{w}x{h}", browser.new_context(viewport={"width": w, "height": h})) for w, h in SIZES]
        for name, ctx in contexts:
            page = ctx.new_page()
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            for path in PAGES:
                page.goto(BASE + path)
                wide = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
                print(engine, name, path, "overflow" if wide else "ok", len(errors))
            ctx.close()
        browser.close()
```

Modes (Playwright context and page parameters):

- dark theme: `new_context(color_scheme="dark")`, reduced motion: `reduced_motion="reduce"`, high contrast: `forced_colors="active"`
- language and zone: `new_context(locale="en-US", timezone_id="America/New_York")`
- offline: `ctx.set_offline(True)` after the first load and a second visit, so the Service Worker has time to install
- density: `device_scale_factor=2` or `3`, zoom 200 percent: a 683x384 window with `device_scale_factor=2`
- printing (Chromium only): `page.emulate_media(media="print")` and `page.pdf(path="print-index.pdf", format="A4")`
- touch: `new_context(has_touch=True, is_mobile=True)` (not in Firefox), gestures through CDP `Input.dispatchTouchEvent`, as in BUG-CB-01

Ready-made runs:

- `python testing-course/full/editor-e2e.py http://localhost:5173` and the other `*-e2e.py` (Edge), the whole set: `npm run tc:full`
- desktop Firefox and Edge through puppeteer-core: `npm install --no-save puppeteer-core` then `node tools/evidence/cross2.mjs`, screenshots go to `docs/metrics/browsers`
- token contrast: `node --test tools/contrast.test.js`
- the whole project suite: `npm test`, formatting: `npm run format:check`

SEO and validators:

- `npx html-validate "site/**/*.html"`
- `java -jar vnu.jar --skip-non-html site` (the Nu Html Checker is downloaded separately and is not part of the project)
- CSS: upload the files to the W3C CSS Validator (jigsaw.w3.org/css-validator), CSS level 3 mode
- `hreflang` and `canonical`: `curl -s http://localhost:5173/en/ | grep -E "canonical|hreflang"` for each page pair, compare with `site/sitemap.xml`
- Schema.org: Rich Results Test, the "Code" tab, paste the landing HTML, and validator.schema.org
- Lighthouse: `npx lighthouse http://localhost:5173/ --only-categories=seo,accessibility,best-practices --preset=desktop` and the same without `--preset` for the mobile profile
- Russian text in EN: `grep -rnP "[А-Яа-яЁё]" site/en` and a line-by-line review of the remainder

Manual pass on Tier 2 devices: open the site through an HTTPS tunnel and go through sections B, F, G, H, I. Install the PWA, turn the network off, open `index` and `editor`. Rotate the device, raise the keyboard in the code field, drag a block by finger. Record the result marked "real device" or "emulation".

## 6. Artifacts

- Run report: `docs/testing-kulikov/` in the format of file 70 (feature × device matrix, browser × feature, modes, what was not checked), new defects BUG-CB-09 onward in the format of file 71.
- Screenshots: `docs/testing-kulikov/screens-devices/`, named `[dist-]browser-device-screen.png`, plus `print-index.pdf`.
- Firefox and Edge results: `docs/metrics/browsers/` (table and screenshots).
- Console logs and the width-overflow table (output of the section 5 script) as JSON, reports of html-validate, the Nu Html Checker, the CSS Validator and Lighthouse, Rich Results Test screenshots.
- A "not checked and why" list, the commit hash, browser and OS versions, the machine load. A closure table for BUG-CB-01..08, CSS-01..21, HTML-01..04 with the status on the current build.
- The updated checklist with ticks and links to screenshots and logs.
