> Русская версия: краткая сводка ниже в английском тексте; полный перевод не сделан (нет времени), см. .en.md.

# Real-file and real-AI checks, 2026-11

Real importer run (node): `testing-course/import-samples/run-importers.mjs`; fixtures in `labs/05-javascript-interactivity/import-real-samples.test.js`.

| Format | Tool / source | Result |
| --- | --- | --- |
| DOT, SVG (Graphviz) | real `dot` 14.1.2, Kroki | OK, counts kept |
| Mermaid .mmd | own source | OK |
| Mermaid SVG (v11 via Kroki) | Kroki | FIXED: was refused (prefixed node ids), now 6 nodes, 6 links, labels kept |
| PlantUML .puml | own source | OK; PlantUML SVG has no structure, refused by design |
| draw.io plain and compressed | public jgraph examples | OK; links to containers/text are skipped with a warning (bpmn-2 example 32 of 23 kept) |
| BPMN 2.0 | bpmn.io samples | FIXED: sub-process inside was flattened (extra start/dead ends); only the first process was read (pizza: 8 of 18 flows), now 18 of 18 |
| XMI | Eclipse UML2 sample (real); Enterprise Architect (hand-built) | FIXED: associations as separate elements were lost |
| GraphML, Excalidraw, CSV/TSV, .vdx | hand-built after documented formats | OK |
| GEXF, .vsdx | public samples | OK |

Not verified: the editor upload in Edge and Firefox (script `browser-upload.py` written, run not finished); the collaboration sample keeps one error (two pools have two starts).

## AI (gemini-3.1-flash-lite through the OpenAI-compatible endpoint)

- Pictures to `/api/ai/generate` mode image: flow PNG, ERD WebP, BPMN PNG, sketch JPEG: 4 of 4 gave code that parses (2 needed a retry). The sketch invented Start/End blocks.
- PDF: implemented through Gemini native `generateContent` (`inlineData`) in `tools/ai-provider.js` (fake-fetch tests); a real vector PDF: 200, valid code.
- Review and clarify on 12 broken diagrams, before tuning: review 11 of 12 answered by AI (1 transient upstream error), 10 of 12 with a better variant; clarify 12 of 12 AI questions, 4 of 12 in Russian although `lang` was en; the model wrote labels as `[label="x"]`.
- Fixes: syntax reminder in the review prompt, one retry of a failed call, fenced JSON read first, question language from `lang`. After tuning only 2 of 12 diagrams were re-run (both gave a valid variant, questions in English); the full re-run is NOT done.
- Fallback with garbage answers is covered by unit tests only, not re-checked with the real model.
