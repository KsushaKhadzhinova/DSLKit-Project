# Notes, practical 1

- Interface rebuilt on Part 1: `public/dslkit.css` (bundled by `bundle-css.mjs`), `public/pz.css` (a few rules), logo, theme switch, new EJS views.
- Added `src/middleware/security.js`: CSRF token, security headers, rate limit, log escaping.
- Fixed: `/item/0x1`, open `/log`, field count limit, headings of 403/413/429 pages.
- Found in a real browser: `Referrer-Policy: no-referrer` made the form fail with 403, now `same-origin`.
- Figures in `figures/` (6 screenshots, Chrome, 1280 px, light theme), added to both report templates (3.7, 3.8), appendix I.
- Tests: 39 pass, coverage 100 percent. Reports built, lint is clean.
- Left: ask the teacher about "data in a table for even variants"; mobile and dark shots were checked, not added to the report.
