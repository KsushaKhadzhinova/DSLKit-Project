# Feature "Check and fix"

A user submits their own diagram (the code of the editor, also code recognised from a picture or a file). The system says what is wrong with it and offers corrected variants.

## What was done

- `site/js/utils/diagram-review.js`: pure functions `reviewCode(code, { lang })`, `applyEdits`, `diffLines`, `checkCode`, `nearest`. The result is `{ notation, issues: [{ severity, line, rule, message: { ru, en }, fix }], variants: [{ id, title, code, changes, errors, warnings }] }`.
  - The remarks come from the parser and the validator of each notation (the same ones as in the problems panel) plus review rules: no title, empty diagram, unreadable name, too long label, diagram fallen into parts, an IDEF0 box without an input.
  - These remarks have a fix: header (missing, misspelt, extra word), repeated identifier, unknown element (replace with the nearest, declare, or remove the line), unconnected element, unclosed block, misspelt keyword, repeated link and link to itself, DFD (flow without a process, flow without a label), BPMN and other flows (start, end, dead end, labels of gateway branches), ERD (no key, repeated attribute), IDEF0 (no output and control, wrong port of an arrow).
  - Variants are built deterministically: "minimal" (errors only) and "full clean-up" (errors, warnings, hints and formatting). The fixes are applied in passes (up to four); every variant is parsed again by the validator and offered only when it has fewer problems.
- `tools/ai-review.js`: the optional AI layer. It builds the request, reads the JSON answer, checks every variant with the same validator and keeps at most two. Without a key, with a failing service or with an unusable answer the deterministic result is returned.
- `tools/ai-api.js`: the mode `review` of `/api/ai/generate` (five lines).
- `site/js/components/review-panel.js` and `site/css/review.css`: the panel "Check and fix": remarks, variants side by side as a difference (before and after; on a phone the columns are stacked), the button "Apply this variant". Applying writes the code into the editor as an ordinary change, so "Undo" brings the old code back. Lines of the difference are marked with signs and hidden text, not by colour alone. Texts in Russian and English.

## Limits

- Without an AI key the server answers 503 as for the other modes; the panel then uses the local review only.
- Not everything can be fixed automatically (for example an unreachable node that has links): such a remark says "fix by hand".
- The fix by rules does not know the meaning of the diagram: placeholder labels such as "data", "Processing", "option N" must be replaced with your own.
- The look of the panel on a real phone in a browser was not checked, only the markup and the tests.
