# Interactive clarify and complete for diagrams

When a diagram is incomplete or ambiguous, the system asks clarifying questions and completes the diagram from the answers.

## What was built

- `site/js/utils/diagram-questions.js`: pure functions.
  - `buildQuestions(code, notation)` reads the code through `parseDiagram` and returns the questions by importance (errors, warnings, details). A question is `{ id, kind: 'choice' | 'text' | 'yesno', text: { ru, en }, options, target: { line, id }, priority, apply(answer, code) }`.
  - Rules: missing header or unknown notation, missing start or end (BPMN, GOST, UML activity and state), unnamed element, unlabeled flow (DFD, gateway branches, GOST decisions), isolated, unreachable and dead-end elements, a DFD process without input or output, an unknown word in a line ("what type is this"), an undeclared element, an invalid cardinality and an unnamed relationship (ERD, IDEF1), an entity without a key, an IDEF0 box without input, output, control or mechanism, a sequence diagram without an actor and a message without text, a use case diagram without an actor.
  - `completeFromAnswers(code, answers)` applies the answers (an object `{ id: answer }` or a list `{ id, answer }`) and validates the result with the same parser. It returns `{ ok, valid, reason, code, applied, problems, errorsBefore, errorsAfter }`. When the answers make the diagram worse (more errors) or change nothing, `ok` is false and `code` is the original one: an invalid result is never returned silently.
  - Lines are found by content, not by number, so the answers can be applied in any order.
- `tools/ai-questions.js`: the `clarify` mode of the AI server, route `POST /api/ai/clarify` (`step: 'questions' | 'complete'`). The model adds up to three questions the rules do not know and refines the code with the answers to them. Its code goes through `parseDiagram` and is dropped when it is worse than the start (one retry). Without a key, after a model failure and for answers that belong to the rules, the deterministic result is used. The rate limit and the daily limit are shared with the rest of the AI and apply only to model calls.
- `site/js/components/clarify-panel.js`: the dialog "Clarify and complete" (a button in the "Automation" menu). One question at a time, "Question N of M" with a progress bar, Back, Skip, Next and Apply buttons, Enter in a text field goes on, Escape closes. The answers are written into the code in one step, so one press of undo restores the old code. Russian and English texts, `role="dialog"`, focus moves to the answer field, `aria-live` regions, buttons at least 44 px high, the panel takes the full width at 375 px.
- `site/css/clarify.css`: a few styles (the shell comes from the `.auto` panel).

## Verification

- Tests: `labs/06-async-api-storage/diagram-questions.test.js`, `labs/06-async-api-storage/clarify-panel.test.js`, `tools/ai-questions.test.js`; 100 % line, branch and function coverage.
- Not verified: a run against the real Claude API (tests use a fake API) and the look of the panel in a real browser at 375 px (markup and behavior are checked in jsdom).

## Limits

- The rules cover the most common gaps; class, timing and some UML diagrams have no questions yet.
- If an answer about a link leads to more errors, the dialog says so and leaves the code unchanged.
