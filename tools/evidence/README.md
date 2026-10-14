# Скрипты для скриншотов и записей (доказательства для отчётов)

Эти скрипты создали все скриншоты DevTools, журналы HAR, отчёты Lighthouse и кросс-браузерные проверки. Они лежат здесь для воспроизведения, в `npm test` не входят и не отформатированы (папка в `.prettierignore`). Пути внутри скриптов жёстко заданы под машину владельца (Chrome `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`, Edge, папка вывода `E:/DSLKit-Project/...`), поправьте их под вашу.

Зависимости ставятся вне репозитория, например в `%TEMP%/pw`: `npm i puppeteer-core playwright-core`. Для React DevTools: `npm i react-devtools-inline@6.1.5 react@0.0.0-experimental-ff8f88fc-20260915 react-dom@(та же версия) react-is@(та же версия) esbuild --legacy-peer-deps`, затем собрать `rdi-src/harness.jsx` и `rdi-src/inject.js` через `esbuild --bundle` (см. `rdi-src/`), раздать `dist` через `rdi-src/serve.mjs` на порту 5190.

| Файл | Что делает |
|---|---|
| `dtf.mjs` | Запускает Chrome с отладочным портом и открывает настоящий интерфейс DevTools как страницу, чтобы снимать панели через `page.screenshot` без съёмки рабочего стола. Нужен флаг `--disable-features=LocalNetworkAccessChecks,...`. |
| `l1full.mjs`, `l1g.mjs` | ЛР1: панели Network, заголовки, Timing, Security, cookies, профиль Slow 4G (прежний Fast 3G). |
| `har.mjs` | Запись HAR для `app.diagrams.net` в настоящем окне Chrome 155 (обычная сеть и Slow 4G). |
| `l5.mjs`, `l6.mjs` | ЛР5 и ЛР6: слушатели событий, консоль, LocalStorage, запрос к Kroki, состояние ошибки. |
| `rdt3.mjs`, `l7c.mjs` | ЛР7: React DevTools (Components) и консоль. Profiler в этой сборке не собирает данные («Processing data»), снимок не сделан. |
| `l8.mjs` | ЛР8: Sources, точка останова, Step Over и Step Into. |
| `lhshot.mjs` | Снимок отчёта Lighthouse; сами отчёты: `npx lighthouse URL --preset=desktop --only-categories=performance,accessibility,best-practices,seo`. |
| `cross2.mjs` | Кросс-браузерная проверка сайта в Firefox и Edge (puppeteer-core). |
| `shoot.ps1`, `click.ps1`, `dt.mjs` | Съёмка экрана и мышь через Windows. **Не используйте, пока владелец работает за компьютером**: в кадр попадают посторонние окна. |

Расширения не загружаются в Chrome 155 флагом `--load-extension` (работает в Edge 155).
