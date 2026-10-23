# Editor features: a defence guide

What was added to the Part 1 editor in October 2026, how it works and how to show it. Russian version: [`34-EDITOR-FEATURES.md`](34-EDITOR-FEATURES.md). The code is in `site/js/`, the tests in `labs/05-javascript-interactivity` and `labs/06-async-api-storage`.

## 1 Autosave

- **What it does.** One second after the last change the code is written to `localStorage` (key `dslkit.editor-source`), the status bar shows "Saved 22:30", the unsaved marks disappear. When the page is opened again the code comes back.
- **How it works.** `components/source-autosave.js`: a `MutationObserver` watches the list of code lines, a timer (`setTimeout`, replaceable in tests) is postponed on every edit. The "Autosave" switch in the menu turns writing on and off. A damaged or empty saved value is ignored.
- **Show it.** Menu "⋯" → another notation template → wait a second → reload the page.
- **Teacher question:** "Why a MutationObserver?" The code is shown as a list of elements, not an input field, so the `input` event is not available.

## 2 Export

- **Formats.** SVG, PNG, JPEG, `.drawio`, a self-contained `.html` (drawing and code, no network, no scripts).
- **How it works.** `components/export-menu.js` takes the SVG from the canvas, `utils/exporters.js` builds the file. PNG and JPEG are drawn through `Image` and `canvas` with a white background at double scale. The `.drawio` file holds the drawing as one image on the page (not as shapes). The file name comes from the diagram title (`fileName`). Download: a link to a temporary address from `URL.createObjectURL`.
- **Show it.** Menu "⋯" → "Export PNG".
- **Limit (honestly):** `.drawio` cannot be edited shape by shape.

## 3 Import of Mermaid and PlantUML

- **What it understands.** Mermaid flowcharts (`graph`/`flowchart`), sequence and state diagrams (Mermaid and PlantUML). The result is DSLKit code that the editor accepts without errors. Other kinds (classes, ER, Gantt) are named as unsupported, skipped constructs are listed.
- **How it works.** `utils/import-diagram.js` (pure functions, three parsers), `components/import-menu.js` (file and clipboard). Identifiers are cleaned, quotes and backslashes in labels are neutralised.
- **Show it.** Menu "⋯" → "Import from the clipboard" with the text `flowchart TD\nA[Start] --> B{Ok?}`.

## 4 Dragging blocks

- **What it does.** A block moves with the mouse, a finger or the arrow keys (Shift: step 50). The place is written into the code as `pos=600x214.4` on the line of the block and the diagram is drawn again.
- **How it works.** The renderer (`notations/svg.js`) reads `pos`, puts the centre of the block there and widens the page; every block carries `data-cx` and `data-cy`. `components/canvas-drag.js` listens to `pointerdown/move/up` on the canvas, converts screen points to drawing units (`pointInDrawing`), `utils/node-position.js` changes the code line without touching text in quotes. Keyboard: blocks have `tabindex`, focus returns after the redraw.
- **Condition.** Works with the "Own engine" and with notations that share the layout.
- **Show it.** Settings → engine "Own" → the BPMN template → drag the "Ship goods" block.

## 5 Tour, PWA

- **Tour:** `components/tour.js`, 5 steps, once (`dslkit.tour-done`), again from the menu.
- **PWA:** `site/manifest.webmanifest`, icons (`tools/make-icons.mjs`), `site/sw.js` (pages: network first, then the copy; files: the copy and a refresh in the background; foreign addresses such as Kroki are never cached). Registration in `components/pwa.js`.

## 6 New notations

Mind map (`mindmap`), org chart (`orgchart`), C4 (`c4`), network (`network`), decision tree (`decision`), eEPC (`epc`). They are described in `notations/specs-more.js` by the same rule as the others: a table of node and link kinds plus checks. Templates are in `templates.js`, texts of the checks in `messages.js` (Russian and English).

## 7 Tests

New files: `source-autosave.test.js`, `tour.test.js`, `pwa.test.js` (lab 5), `export.test.js`, `import-diagram.test.js`, `import-menu.test.js`, `canvas-drag.test.js`, `notations-more.test.js` (lab 6). 608 tests in all, 100% coverage. The tests run `sw.js` in a `vm` sandbox with substitute `caches` and `fetch`.

## 8 Likely questions

- Why is the code a list of elements and not a `<textarea>`? Lines are highlighted by keywords.
- Why is `pos=` better than storing coordinates separately? One source of truth: the code. A re-run gives the same picture.
- Why does the service worker not cache Kroki? It is a foreign service, its answers are not our file.
- What happens with a damaged `localStorage`? Reading is wrapped in `try/catch`, a damaged value is ignored.
