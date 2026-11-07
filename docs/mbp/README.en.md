# MBP (business process modelling): labs 1–4 for the DSLKit project

Russian version: [README.md](README.md)

Course "Business Process Modelling", author Khadzhinova K.A., lecturer Rusak T.V. The domain of all labs is the author's own project, DSLKit (a cloud diagram-as-code editor). Status on 2026-11-07: the four labs are built and wait for the owner's review; nothing has been pushed to GitHub or uploaded to Google Drive before that confirmation.

## Contents

| Folder | Lab | Diagrams (draw.io and PNG) | Report |
|---|---|---|---|
| `ЛР1_Анализ_предметной_области` | Domain analysis, IDEF0 | A-0, A0, node tree, org structure | `Отчет_ЛР1_МБП.docx`, `.pdf` |
| `ЛР2_BPMN` | BPMN of process A2 "Write and check DSL code" | process and the "Check code" subprocess | `Отчет_ЛР2_МБП.docx`, `.pdf` |
| `ЛР3_EPC` | EPC of process A1 "Registration and access management" | one diagram | `Отчет_ЛР3_МБП.docx`, `.pdf` |
| `ЛР4_ССП` | Balanced scorecard | goal and indicator catalogue, strategy map | `Отчет_ЛР4_МБП.docx`, `.pdf` |
| `материалы` | Course assignments and theory | original PDFs and Markdown with figures | `материалы/README.md` |
| `src` | Diagram generators, rule checkers, report texts | – | – |

`ВСЕ_ДИАГРАММЫ_И_МАКЕТЫ.drawio` is the owner's draw.io project: the lab 1–4 pages are updated and the 12 Part 2 mockups are carried over unchanged. The original `E:\ИИТ\МБП_ЛР1\ВСЕ_ДИАГРАММЫ_И_МАКЕТЫ.drawio` was not modified. Each lab folder also has `ВСЕ_ДИАГРАММЫ_ЛРn.drawio` with all pages of that lab.

The report structure follows the lecturer's "Structure of the MBP report" file (two-level IDEF0, BPMN of a subprocess, EPC of a subprocess, scorecard); by the owner's decision the reports are separate per lab.

## What was applied from the owner's instructions

- The lab 1 org structure and the lab 4 responsible roles come from the project management practical work (PZ1): product owner, project manager, back-end developer, front-end developer, notation expert (on demand). In those documents the project is called NotaCode; the name DSLKit does not occur there.
- Tariffs: Free, Pro (6 USD), Max (40 USD).
- Lab 4 follows the handbook example: perspective lanes, goal ellipses, indicator rectangles with dotted links, blue arrows with width by strength of influence, a navigator-style tree of goal and indicator catalogues. The report text has no remarks about assumptions.
- Course materials (assignments and theory) are converted to Markdown with figures and the originals are kept: `материалы/`.

## Report layout

Reports are built in the strict mode of report-gen (`layout: strict` in `meta.yaml`):

- "Minsk 2026" on the last line of the title page, "Performed by" and "Checked by" centred;
- section titles left-aligned, "ВЫВОДЫ" centred;
- a blank line before a table caption, before a figure, before a subsection and after a table or figure; a blank line is never first on a page (paragraph spacing, not an empty paragraph);
- a paragraph of text follows every table and every figure;
- a caption and its table, a figure and its caption are never split; a large table is split into parts titled "Продолжение таблицы N";
- wide diagrams get their own page, rotated by -90°, with the caption on the right reading bottom to top;
- diagrams are never cut into pieces.

The PDF was checked visually. The DOCX is built by the same mode, but this computer has no Word, so its layout was not checked visually.

## How it was checked

Every diagram is built from one model and checked by a program (`src`):

- IDEF0: one block in A-0, 3 to 6 blocks in A0, control and output on every block, stair-step layout, arrow sides, the 14 boundary arrows of A0 match A-0 by ICOM codes;
- BPMN: the handbook rules for diagrams "for people" (task types, XOR and AND gateways only, labelled outgoing flows, message flows not at gateways, start without incoming flow, end without outgoing flow);
- EPC: the 11 handbook rules (alternation, operators, number of functions, links);
- scorecard: at most 25 goals, 1–3 indicators per goal, about 80 % non-financial, direction of cause-and-effect links, strength values from the handbook set;
- layout: overlapping labels, text outside a shape, label crossing an arrow, slanted arrow segments.

The `.drawio` files were opened in the draw.io viewer to confirm that the native BPMN and EPC shapes render. The report-gen linter reports 0 errors and 0 warnings for all four reports.

## Open questions

1. BPMN lab 2: tasks performed by the system are shown without a type marker (the handbook allows only user and manual tasks for diagrams read by people). The owner's decision is pending.
2. The period of the Pro and Max tariffs (monthly or yearly) is not set; the scorecard counts income per month.
3. The group number is not on the title page (the template has no such field).

## How to rebuild

```bash
cd src
python lab1.py && python lab2.py && python lab3.py && python lab4.py
python make_reports.py
python merge_project.py
python materials_to_md.py
```

Reports are built with report-gen (projects `E:\report-gen\projects\mbp-lr1` … `mbp-lr4`). Without Docker: `cd E:\report-gen`, `set PYTHONPATH=E:\report-gen\src`, `python -m reportgen build projects/mbp-lr1`, then `lint`. Texts of labs 3 and 4 are generated by `src/make_reports.py` and `src/make_reports_lr4.py` (lab 4 tables come from `src/bsc_data.py`); texts of labs 1 and 2 are edited in `content` and by `src/make_reports_lr12.py`.

## Next: move into the main project code (final stage)

After the labs are reviewed, a separate branch from the working code branch (`testing-course-full`) must add to the main DSLKit code:

1. the IDEF0, BPMN, EPC and scorecard diagrams as project documentation in `docs/` (RU and EN);
2. DSL examples of these diagrams (IDEF0, BPMN) as templates and test data; for EPC and the scorecard, first decide whether to add such notations to DSLKit;
3. the IDEF0, BPMN and EPC notation rules as validator checks with tests; ready groundwork: `src/idef0.py`, `src/bpmn_lib.py`, `src/epc_lib.py`.

This is the owner's decision of 2026-11-07: project code is not touched in the labs branch; the transfer is made at the end in a separate branch and pull request.
