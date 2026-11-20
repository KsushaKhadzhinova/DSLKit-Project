# Проверки качества и CI

Английская версия: [`CI-CHECKS.en.md`](CI-CHECKS.en.md).

Ветвление: GitHub Flow и trunk-based. `main` всегда зелёный, каждое изменение идёт короткой веткой от `origin/main` через pull request.

## Что проверяется на каждый push и pull request

| Проверка                          | Где                                                    | Что ломает сборку                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint (`npm run lint`)           | job `test`                                             | неопределённые и неиспользуемые имена, `var`, нестрогое сравнение, пустые блоки, ошибки регулярных выражений                                        |
| Prettier (`npm run format:check`) | job `test`                                             | любое расхождение с форматом                                                                                                                        |
| Тесты сайта (`npm test`)          | job `test`                                             | падение теста или покрытие ниже 100% строк, ветвей и функций; в покрытие явно входят все файлы `site/js` и `tools`, даже те, что тесты не загрузили |
| `npm audit --omit=dev`            | job `test`                                             | уязвимость уровня high в библиотеках, которые доходят до пользователя                                                                               |
| Папки работ (`part-2/*`)          | job `work-folders`, 12 папок параллельно               | тесты каждой лабораторной и практической, отчёты, `npm audit`                                                                                       |
| Сборка сайта                      | job `build`                                            | ошибка сборки                                                                                                                                       |
| React-приложение                  | job `react`                                            | тесты и сборка                                                                                                                                      |
| e2e в браузере (Playwright)       | job `e2e`, две копии: chromium и firefox               | любой сценарий не в состоянии Passed или грязное дерево после прогона                                                                               |
| CodeQL (`security-and-quality`)   | `security.yml`, также раз в неделю                     | находки статического анализа безопасности                                                                                                           |
| Dependency review                 | `security.yml`, только pull request                    | новая зависимость с уязвимостью high                                                                                                                |
| Секреты (gitleaks)                | `secrets.yml`, push в main, pull request, раз в неделю | ключ или токен в любом коммите всей истории (`fetch-depth: 0`)                                                                                      |
| Мутационные тесты (Stryker)       | `mutation.yml`, только раз в неделю и вручную          | не входит в обязательные проверки: считает, сколько мутаций тесты ловят в `site/js/auth` и `site/js/utils`                                          |

Локально всё сразу: `npm run verify` (lint, format, тесты).

## Новые проверки

- **e2e в двух браузерах.** Имена проверок в GitHub: `Browser end-to-end checks (Playwright, chromium)` и `Browser end-to-end checks (Playwright, firefox)`. Старое имя без скобки больше не создаётся: в обязательных проверках ветки `main` замените его на эти два. Локально Firefox: `E2E_BROWSER=firefox python testing-course/full/editor-e2e.py http://localhost:5173`. В Firefox Playwright нет разрешений на буфер обмена, поэтому `e2e_env.py` подставляет страницам буфер в памяти с теми же `writeText` и `readText`. Открыто: скрипт `auth-e2e.py` в Firefox не доходит до конца (страницы перестают загружаться после ошибки service worker), поэтому в Firefox он пока не запускается, только в chromium.
- **Секреты.** Имя проверки `Secrets scan of the whole history (gitleaks)`. Правила gitleaks по умолчанию плюс `.gitleaks.toml`: в списке исключений два тестовых значения, проверенных вручную (выдуманный ключ в `part-2/lab-03-auth/tests/twofactor.test.js` и общий секрет из RFC 6238 в `labs/05-javascript-interactivity/auth-modules.test.js`). Остальное считается находкой. Локально: `gitleaks git . --config .gitleaks.toml --redact`.
- **Мутационные тесты.** `npm run mutation` (Stryker, `stryker.config.json`) правит исходники по одной мутации и запускает выбранные тесты `node --test`; выжившая мутация означает слабый тест. Отчёт HTML лежит в артефакте `mutation-report` и локально в `reports/mutation/`. Порог `break` 65 задан в `stryker.config.json`; измеренный счёт 69,2% (50 минут локально; format-code, node-position, lang почти не покрыты выбранными тестами). В `npm test` и `npm run verify` не входит, на push не запускается.

## Что не проверяется автоматически

Живые Atlas и Gemini (нужны секреты), реальные Postman, Docker Desktop и устройства. Они остаются ручными и записаны в `docs/STATUS-CHECKLIST.md`.
