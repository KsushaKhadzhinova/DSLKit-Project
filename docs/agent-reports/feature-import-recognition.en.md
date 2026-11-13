# Feature: import of diagram files and recognition of pictures

## What was built

- `site/js/utils/diagram-file-import.js`: the deterministic importer without a key. It has its own small XML reader (no `DOMParser`), so it runs in the browser and in Node. Result: `{ ok, notation, code, warnings }`, or `{ ok: false, reason }` with the reason `no-structure`, `bad-file` or `unknown`.
- `site/js/automation/upload.js`: the front door of the wizard. It finds the format by content and by extension, refuses files over 10 MB, takes a Mermaid, PlantUML, DOT or DSLKit block from Markdown and sends Mermaid, PlantUML and DSLKit text to the existing import (`importDiagram`, not rewritten). The result is checked by `parseDiagram`.
- `tools/ai-vision.js`: the prompt for pictures (kind of diagram, elements, arrows, shape mapping, `pos=XxY`), PDF as a `document` block, extra checks of the answer (header, at least one element) and the retry message that returns the parser errors to the model. The retry itself (at most two) already existed in `tools/ai-api.js`.
- The wizard accepts all these files in both tabs; a picture dropped on the code tab moves to the picture tab and the other way round.

## Formats

| Format                                                                         | Notation                                                        |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| draw.io (.drawio, .dio, compressed or plain), SVG (draw.io, Graphviz, Mermaid) | GOST flowchart, BPMN (by `mxgraph.bpmn` shapes) or graph        |
| JSON (nodes/edges/links, Cytoscape, Excalidraw, Lucid)                         | graph or GOST flowchart (a `notation` field is honoured)        |
| BPMN 2.0 XML                                                                   | BPMN with `pos` from `BPMNShape`                                |
| XMI (.xmi, .uml)                                                               | UML class diagram (names, attributes, operations without types) |
| GraphML, GEXF, DOT, CSV/TSV                                                    | graph                                                           |
| Visio (.vdx, .vsdx, first page)                                                | GOST flowchart or graph                                         |
| Mermaid, PlantUML, DSLKit, Markdown with a diagram block, text                 | existing import                                                 |
| png, jpeg, webp, gif, pdf                                                      | only the AI with a key; BMP is refused with a clear message     |

Rules of the choice: a draw.io or JSON diagram with at least one flowchart shape (rhombus, parallelogram, oval, cylinder, ...) becomes a GOST flowchart with `pos=XxY` (centres, shifted to start near the top left corner). If its rules fail (no start, no end, a dead end), the diagram is drawn as a graph and a warning says so; only a missing label on a decision branch is kept as an error of the parser, shown in the check list.

## Without a key

Pictures and PDF need the key on the server; the wizard says so in the status line and on the picture tab. Every structured file works without a key.

## Hunks in shared files

- `tools/ai-api.js`: the import of `ai-vision.js`; `IMAGE_TYPES` gets `...VISION_TYPES`; `SIGNATURES` gets `...VISION_SIGNATURES`; `TASKS.image = VISION_TASK`; in `firstMessage` the picture block is `visionBlock(mediaType, image)`; in `generate` the call of `visionIssues` after `problemsOf` and `retryMessage(...)` instead of the inline text.
- `site/js/components/automation.js`: imports of `upload.js` and `vsdxToXml`; new texts (`formats`, `bmp`, `too-big`, `no-structure`, `bad-file`, changed `codeLabel`, `imageLabel`, `imageNoAi`, `imageType`); `IMAGE_TYPES` gets the PDF; `CODE_ACCEPT` is replaced by `ACCEPT`; the hint under the box shows the formats; `buildFromCode` is replaced by `await importUpload(...)`; `takeFile` is rewritten to route by kind.
- `tools/dsl-reference.js`: a section "Importing files and pictures"; `docs/DSL-REFERENCE*.md` are regenerated.

## Not verified

- The SVG readers of Graphviz and Mermaid were written from the known structure of those exports, not checked on real exports of every version.
- draw.io compression is tested with Node's `deflateRaw`; in the browser it uses `DecompressionStream('deflate-raw')`, not run in a real browser.
- XMI from Enterprise Architect (non-standard extensions) is not supported.
- The recognition of pictures was not run against the real Claude API (no key here); only the request and the retry are tested with a fake server.
- BMP and an SVG as a picture are not sent to the AI (the API does not take BMP); SVG is read as a structured file.
