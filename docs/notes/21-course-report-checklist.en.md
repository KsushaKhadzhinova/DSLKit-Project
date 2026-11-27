# Coursework formatting checklist and report structure (level C, reference)

Source: the rules the owner handed over (chat, 2026-11-27). Normative base: STP 01-2024 (sections 2–3 apply to coursework) and GOST 2.105-95, 2.106-96, 2.004-88, 7.1-2003, 7.9-95.

The document is kept whole for the future coursework. Practical and lab reports use only what is marked level A or B in `docs/notes/20-report-rules-stp-2024.en.md`, where the differences between this checklist and the STP text are also listed. The STP wins over the checklist, and for practicals and labs the teacher's rules win.

## Checklist

### A. General

- Format by STP 01-2024 (sections 2–3) and GOST.
- Margins, headings, page number per appendix Л; formulas per appendix М; an illustration between paragraphs per appendix Н; an appendix per appendix П; units С, unit ratios Т, alphabets У.
- The report is bound in a folder.

### B. Size and structure (coursework)

- 20–30 pages without appendices (up to 33 allowed).
- Order: title, assignment, contents, list of abbreviations, introduction, chapters 1–3, conclusion, sources, appendices.
- Automatic contents from the styles "Heading 1/2/3".
- Every part starts on a new page; a prospectus plan exists.

### C. Title and assignment

- Title per the department sample; department and faculty without abbreviations; the topic in capitals exactly as in the assignment.
- Signatures of the student, the supervisor and the head of department, dates.
- No page number on the title, but the sheet counts.
- Coursework code: `БГУИР КР 6-05-0612-03 XX ПЗ`.
- The assignment per the department template, item 5 "No graphic part"; no abstract.
- Topic: one sentence, no punctuation, no "development" or "design", no languages, DBMS or frameworks.

### D. Text (STP 2.3)

- Times New Roman 14 pt, line spacing 1.15, indent 1.25 cm, justified.
- Part headings (Contents, Introduction, Conclusion, References, Appendix): centred, CAPITALS, 16 pt, 12 pt before and after, no number.
- Section headings: CAPITALS 16 pt, indent 1.25 cm at the left edge, no hyphenation, every section on a new page.
- Subsection headings: capital first letter, 14 pt (12 pt before, 6 pt after). Item headings: 14 pt (6 pt before, 0 after).
- All headings bold, no full stop; multi-line headings single-spaced; no heading at the bottom of a page.
- Page number bottom right, 17 mm from the bottom edge; title and assignment unnumbered, numbering starts at the contents.
- Non-breaking space before units and "%"; dash "—"; guillemets; decimal comma; ranges "20–30".
- Abbreviations are expanded at the first mention.

### E. Figures and tables

- Numbered by section ("Figure 1.1"), in appendices "А.1".
- Caption under the figure, centred, no indent: "Figure 2.3 – Title"; 6 pt before, 12 pt after; a blank line separates the figure.
- The reference in the text comes before the object.
- Tables per item 2.6: title above, left-aligned, "Table 2.1 – Title"; 12 pt before, 6 pt after; a table does not break ("Continuation of table 2.1" if needed); units in the header; 12 pt, single spacing; empty cells "—".
- Screenshots: 3–4 in the text, full ones in appendix В; one style (one browser, 1280×720 window, Russian interface); readable in black and white.

### F. Formulas and listings

- Formulas centred, the number on the right in brackets, 6 pt indent; numbered by section (2.1); symbols explained after the word "where" without indent.
- Listings as text: Courier New 12 pt, single spacing, with a number and a title "Listing 2.1 – …" and a reference in the text.
- Only IDE and console screenshots are figures.
- No syntax highlighting, long lines not wrapped, comments in Russian, no line numbers, a gap is marked "…".
- A fragment in the text is at most one page, full listings go to appendix А.

### G. Sources

- 15–20 sources; books not older than 5 years, articles from 2022–2026.
- Alphabetical order (normative documents first); format per item 2.8 of the STP and GOST 7.1-2003.
- The STP entry: "Стандарт предприятия. Дипломные проекты (работы). Общие требования : СТП 01–2024. – Минск : БГУИР, 2024."
- Electronic resources with a URL and an access date.
- No Wikipedia, help systems, search engines or lecture notes.
- References in the text "[12]"; every source is cited in the text and vice versa.

### H. Appendices

- А listings, Б test input data, В full screenshots, Г free services.
- Letter numbering without Ё, З, Й, О, Ч, Ъ, Ы, Ь.
- A three-line heading: "APPENDIX А" / "(mandatory)" / title; centred, on a new page.
- Every appendix is referenced in the text.
- Appendix Б: test accounts, JSON request examples, seed data, boundary and invalid data.
- Appendix Г: hosting Netlify and GitHub Pages, Render and Supabase, Coolify; databases Supabase, Neon, Render, MongoDB Atlas; CI/CD GitHub Actions; monitoring GlitchTip; analytics Yandex.Metrica, Rybbit, Plausible, with free limits and sanctions restrictions.

### I. Web specifics (coursework)

- No A1 graphic part.
- Use Case, ER and architecture as figures in chapter 1; UML and ER in draw.io, PNG at 300 dpi; UML 2.5 for Use Case, Crow's Foot for ER.
- "3 main modules" = 3 CRUD entities plus authentication.
- Defence: 5–7 minute demo; criteria: it works 50%, formatting 20%, defence 30%.
- Presentation of 8–10 slides, at least 20 pt, no animation; a backup demo video of 2–3 minutes.

### J. Procedure

- Hand-in two weeks before the credit week; checkpoints 30%, 60%, 90%, 100%.
- The self-check from section K is mandatory.
- AI tools are allowed if the code is understood; the report states which and for what.
- Text originality at least 50%.
- Electronic version: PDF plus a repository link; presentation PDF or PPTX; video MP4.

### K. Final check

- Contents updated (F9); styles "Heading 1/2/3".
- Title and assignment unnumbered, numbering from the contents.
- Cross-references through "Insert → Cross-reference".
- No stray Calibri or Arial.
- Invisible characters checked: extra spaces, empty paragraphs, line breaks.
- PDF: figures not cropped, tables not split, page numbers present, appendices on new pages.

## Structure of the coursework report "Web application development"

Size 20–30 pages without appendices.

1. Title page.
2. Assignment.
3. Contents (automatic).
4. List of abbreviations (optional): API, SPA, JSX, REST, JWT, ORM, CI/CD, deploy.
5. Introduction, 1–1.5 pages: relevance, goal, tasks (1–5), object and subject, practical value, structure.
6. Chapter 1 "Analysis and design of the system", 7–8 pages:
   - 1.1 Analysis and requirements FR/NFR, 2 pages.
   - 1.2 Architecture, 3 pages: Use Case, a "Client – Server – DB" scheme or C4 level 1, the REST endpoint table.
   - 1.3 ER diagram of 4–6 entities, 2 pages.
7. Chapter 2 "Implementation of the web application", 12–13 pages:
   - 2.1 Stack and rationale, 1.5 pages.
   - 2.2 Backend, 4 pages: structure, Sequelize or Mongoose models, REST API CRUD with validation, JWT, errors and security (helmet, cors, bcrypt).
   - 2.3 Frontend, 4 pages: structure, React Router, components and state, server interaction, responsive interface.
   - 2.4 Integration, Docker, deployment, testing, 2.5 pages.
8. Chapter 3 "User guide and testing", 4–5 pages:
   - 3.1 User guide, 2.5 pages.
   - 3.2 Test cases as a table, 1.5 pages.
9. Conclusion, 1 page.
10. Sources, 1 page (15–20 items).
11. Appendices (outside the size): А listings; Б test input data; В full screenshots; Г recommendations for free services (hosting Netlify and GitHub Pages, Render and Supabase, Coolify; databases Supabase, Neon, Render, MongoDB Atlas; CI/CD GitHub Actions; monitoring GlitchTip; analytics Yandex.Metrica, Rybbit, Plausible).
