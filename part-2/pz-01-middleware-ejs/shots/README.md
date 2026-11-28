# Снимки ПЗ1 / Figures of practical 1

- `shots.mjs` снимает страницы сайта настоящим браузером (рисунки 1–12). / Page figures from a real headless browser.
- `db-tables.png`, `console.png`, `tests.png` (рисунки 13–15) — снимки настоящих окон консоли PowerShell, скрипт их не рисует. / Captures of real PowerShell windows, never drawn.
  1. Откройте окно консоли (`conhost.exe powershell`), выполните команду: `node src/server.js` (сначала с обычным `DB_FILE`, затем с `DB_FILE='package.json/blocked/log.db'` для строки 500), `python shots/windows/query-db.py requests.db "SELECT ..."`, `npm test` (под замком `test.lock`).
  2. Снимите окно: `powershell -File shots/windows/capture-window.ps1 -WinTitle "<заголовок окна>" -Out file.png` (вырезается прямоугольник окна с экрана, DPI-aware).
  3. Обрежьте пустое поле справа и снизу.
