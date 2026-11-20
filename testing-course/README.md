# Курс «Тестирование ПО»: лабораторные 2 и 3 по проекту DSLKit

Ветка `testing-course`. Объект тестирования: сайт DSLKit из папки `site/`. Теория по книге С. С. Куликова «Тестирование программного обеспечения. Базовый курс» (EPAM, <https://svyatoslav.biz/software_testing_book/>).

## Что внутри

| Путь                           | Назначение                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `lab2/cases.js`                | 22 тест-кейса формы заявки (данные и ожидаемый результат)                               |
| `lab2/run.js`                  | Выполняет тест-кейсы, пишет `lab2/results.json`                                         |
| `lab3/checklists.js`           | Дымовой (8) и критического пути (36) чек-листы                                          |
| `lab3/run.js`                  | Поднимает сервер сайта, выполняет чек-листы, считает метрики, пишет `lab3/results.json` |
| `build-reports.js`             | Собирает тексты отчётов из результатов и запускает report-gen                           |
| `reports/lab2`, `reports/lab3` | Отчёты: `output/note.docx`, `output/note.pdf`, `output/tex/note.tex`                    |

| `documents/` | Отдельные документы без оформления по СТП: `01-test-cases` (тест-кейсы по шаблону) и `02-checklists-and-test-report` (чек-листы и отчёт о тестировании), DOCX и PDF |
| `screenshots.py`, `screens/` | Скриншоты тестирования сайта в Edge (Playwright) и вывода консоли |
| `lab1/` | Лаба 1: `dynamic.py` проверяет Use Case в браузере, `build-doc.py` собирает документ `documents/03-lab1-…` |
| `docx_kit.py` | Общие функции оформления DOCX |
| `build-docs.py` | Собирает документы из `results.json` и `screens/` (python-docx) |

## Как запустить

Нужны Node.js 20+ (корень проекта: `npm install` один раз).

```bash
npm run tc:lab2      # лабораторная 2: выполнение тест-кейсов
npm run tc:lab3      # лабораторная 3: чек-листы и метрики
```

Код выхода 0, если все проверки пройдены, и 1, если есть проваленные.

### Скриншоты и отдельные документы

```bash
npm start                              # сервер сайта на :5173, в отдельном терминале
pip install playwright python-docx && playwright install msedge
python testing-course/screenshots.py   # скрины сайта и консоли в screens/
python testing-course/build-docs.py    # документы в documents/ (PDF делается из DOCX через Word)
```

### Сквозные проверки в браузере (`full/*-e2e.py`) и CI

```bash
npm start                                  # сервер сайта на :5173, в отдельном терминале
pip install playwright && playwright install chromium
npm run e2e                                # editor, palette, extra, critical-path, auth, scenarios, затем e2e-gate.py
```

Скрипты читают окружение (общий помощник `full/e2e_env.py`): `E2E_BROWSER` (`msedge` по умолчанию, `chromium` в CI), `E2E_OUT` (папка для `*-e2e.json`, по умолчанию `full/`, то есть закоммиченные результаты), `E2E_SHOTS` (папка для скриншотов, по умолчанию `screens/`). `full/e2e-gate.py` завершается с кодом 1, если хоть один результат не `Passed`. В GitHub Actions задача `e2e` (`.github/workflows/ci.yml`) запускает всё это с `E2E_BROWSER=chromium` и временными папками, чтобы не менять закоммиченные JSON, и выкладывает результаты и скриншоты провалов артефактом `e2e-results`. `click-everything.py` в CI и в `npm run e2e` не входит (запускается вручную).

English: `npm run e2e` runs the Playwright scripts of `full/` in order and then the gate `full/e2e-gate.py`; set `E2E_BROWSER=chromium` (default `msedge`), `E2E_OUT` and `E2E_SHOTS` to choose the browser and keep the committed JSON files clean. The `e2e` job in `.github/workflows/ci.yml` does exactly that and uploads the `e2e-results` artifact.

### Проверки под разными аккаунтами (`accounts/*.py`)

`npm run e2e:accounts` запускает в Edge и Firefox (по процессу на браузер) сценарии `isolation.py` (изоляция данных, квоты, вкладки, ссылка «поделиться»), `roles_projects.py` (роли, импорт, шаблоны, корзина, версии), `storage_states.py` (перезагрузка, очистка данных сайта, повреждённое, переполненное и отключённое хранилище, смена языка), `ai_offline_mobile.py` (ИИ без ключа и с поддельным локальным сервером, офлайн через service worker, телефон 390 px), `course_app.py` (приложение курсового проекта: два пользователя и администратор), затем `accounts-gate.py` (код 1, если хоть одна строка не `Passed`). Сайт и сервер поднимаются самими скриптами. Окружение: `ACC_BROWSERS` (`msedge,firefox`, для CI `chromium`), `E2E_OUT` (папка `accounts-*.json`), `E2E_SHOTS` (скриншоты провалов, по умолчанию `docs/evidence/accounts-2026-11/screens`). Роли developer и admin записываются в запись аккаунта тестового профиля: настоящие коды не используются. Протокол: `docs/evidence/accounts-2026-11/README.md`.

English: `npm run e2e:accounts` runs the account scenarios of `accounts/` in Edge and Firefox (one process per browser) and then `accounts-gate.py`, which exits 1 if any row is not `Passed`. The scripts start the site and the course-app server themselves. Variables: `ACC_BROWSERS`, `E2E_OUT`, `E2E_SHOTS`. The roles developer and admin are written into the account record of the test profile, the real codes are never used. Protocol: `docs/evidence/accounts-2026-11/README.en.md`.

### Пересборка отчётов

Отчёты собирает [report-gen](https://github.com/KsushaKhadzhinova/report-gen) (нужен Python 3.10+; для PDF нужен XeLaTeX).

```bash
git clone https://github.com/KsushaKhadzhinova/report-gen.git
pip install -e ./report-gen
npm run tc:reports   # прогон лаб 3 и 2, затем сборка DOCX, TeX и PDF
```

Перед сдачей впишите ФИО, преподавателя и кафедру в `reports/lab2/meta.yaml` и `reports/lab3/meta.yaml` (поля `student`, `supervisor`, `faculty`, `department`), затем снова `npm run tc:reports`: `build-reports.js` перезаписывает `meta.yaml`, поэтому для постоянных правок меняйте шаблон `meta()` в нём.

## Лабораторная 2: тест-кейсы

**Теория.** Тест-кейс — это входные данные, условия выполнения и ожидаемый результат для проверки одного свойства. Для выбора данных применяют эквивалентное разбиение (значения, которые программа обрабатывает одинаково, берут по одному представителю) и анализ граничных значений (последнее допустимое и первое недопустимое значения диапазона).

**Практика.** Use case: «оставить заявку в листе ожидания». Тестируется функция `validateWaitlist` (`site/js/utils/validation.js`): она получает объект полей и возвращает список неверных полей.

- Поля и правила: `name` (2–60 символов, буквы, пробел, апостроф, дефис), `email` (формат, до 120), `notation` (из списка), `team` (0–500), `comment` (до 500), `consent` (только true).
- `cases.js` строит набор: базовый корректный объект и его варианты с одним изменённым полем. Так по списку ошибок сразу видно, какое поле сработало. Типы: P позитивный, N негативный, B граничный.
- `run.js` вызывает `validateWaitlist` для каждого случая и сравнивает отсортированный список ошибок с ожидаемым: совпало — `Passed`, нет — `Failed`.
- Шаблон тест-кейса (предусловия, шаги, постусловия) описан в отчёте общим текстом, потому что для всех случаев он одинаков; индивидуальны ID, приоритет, заголовок, данные, ожидаемый и фактический результат.

## Лабораторная 3: чек-листы и отчёт

**Теория.** Чек-лист — набор идей для проверки без подробных шагов. По важности выделяют три уровня. Дымовой: базовые функции, без которых продукт бессмыслен, проходит после каждой сборки и должен пройти на 100 %. Критический путь: то, чем пользуются ежедневно. Расширенный: остальное. Отчёт о тестировании содержит объём, результаты, дефекты, риски, выводы и метрики.

**Практика.**

- Проверки описаны кортежами `[id, требование, название, функция]`. Функция выбрасывает ошибку при несовпадении, это и есть `Failed`.
- `run.js` запускает настоящий статический сервер проекта (`tools/server.js`) на свободном порту и обращается к нему через `fetch`: коды ответов, заголовки безопасности, 404 и 405, защита от выхода за корень, ссылки на ресурсы, `lang`, `h1`, `canonical`, манифест. Чистые функции (разбор DSL, хранилище, валидация) проверяются прямым вызовом.
- Если дымовой чек-лист не пройден, критический путь получает статус `Blocked` и не запускается (так делают на практике).
- Метрики: выполненные = (всего − Blocked) / всего; успешные = Passed / выполненные; плотность дефектов = Failed / всего; покрытие требований = требования с хотя бы одной пройденной проверкой / все требования R1–R9.

## Результаты

- Лаб. 2: 22 тест-кейса, 22 Passed, дефектов нет.
- Лаб. 3: 44 проверки (8 дымовых, 36 критического пути), 44 Passed, покрытие R1–R9 100 %, плотность дефектов 0.
- Честная оговорка: при отладке падала проверка SM-06 из-за моей ошибки в синтаксисе тестовых данных DSL (нужны `diagram`, `box … {`, `arrow`). Это ошибка теста, не продукта. Тесты не проверяют отрисовку в браузере и сервис Kroki.

## Как расширить

- Новый тест-кейс: добавьте строку в `CASES` в `lab2/cases.js`.
- Новая проверка: добавьте кортеж в `smoke` или `critical` в `lab3/checklists.js`, указав требование Rn.
- Новое требование: используйте новый идентификатор Rn и добавьте строку в таблицу требований в `build-reports.js`.
