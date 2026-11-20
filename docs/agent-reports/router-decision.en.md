# React Router version decision (practical 3)

Conclusion: `part-2/pz-03-routing` uses **React Router v6** (`react-router-dom` 6.30).

## Evidence

The practical 3 task (`materials/text/part-2/Модуль 02. Клиентская разработка на React/24. Практическое занятие 3 Маршрутизация в React-приложениях.txt`), the aim: "Освоение библиотеки React Router v6: настройка маршрутизации, создание SPA" (mastering the React Router v6 library). Review questions 3, 13, 16, 19 and 24 also name "React Router v6" directly. On 2026-10-24 the owner confirmed that the v6 variant is the one handed in.

## What was done

- The content of the former `pz-03-routing-v6` folder (v6, with error pages and accessibility work, three more test files) moved into `part-2/pz-03-routing`. The former v7 variant was removed: the code of both was the same, and v7 contradicts the task, so it was not a documented alternative.
- The `pz-03-routing-v6` folder is gone, one folder remains.
- The README, the report templates (RU, EN) and `NOTES.md` speak about version 6.30 without "variant with v7" caveats.
- The known `npm audit` risk of the 6.x line is described in `NOTES.md` (F4); there is no patch inside line 6.

## Not done

- The rows of `docs/STATUS-CHECKLIST.md` and `.en.md` (practical 3, lab 1, lab 7, practical 1) are not updated.
- References to `pz-03-routing-v6` remain in `docs/ITIVP-AUDIT-2026-10-29.md` and `docs/STATUS-REPORT*.md`.
- The lab 1 `spike` test passed several runs, the full lab 1 `npm test` was not run.
