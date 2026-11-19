# Проверка сценариев под разными аккаунтами (ноябрь 2026)

Английская версия: [README.en.md](README.en.md).

## Что проверено

Настоящие браузеры: Microsoft Edge (`channel="msedge"`) и Firefox, Python Playwright. Сайт поднимает сам скрипт (`node tools/serve.js site <port>`), приложение курсового проекта поднимается своим сервером с SQLite. Регистрация и вход идут через интерфейс. Роли developer и admin записываются в запись аккаунта тестового профиля; настоящие коды доступа не используются.

Запуск: `npm run e2e:accounts` (скрипты `testing-course/accounts/*.py`, затем `accounts-gate.py`, который завершается с кодом 1, если хотя бы одна строка не `Passed`).

## Итог

- Сценариев: 66 идентификаторов, каждый в двух браузерах (132 строки). Строк `Passed`: 81, `Failed`: 51 (по данным сохранённых JSON).
- Gate падает. Это ожидаемо: найденные дефекты не исправлены, и приложение не менялось.
- Часть провалов похожа на дефекты самого теста, а не приложения. Они помечены в таблице дефектов как «требует проверки».
- Курсовое приложение (CRS): в Edge после исправления теста (неверный ключ `text` для комментариев и неверное тело PUT) сценарии CRS-03, CRS-04 и CRS-06 проходят. CRS-02, CRS-07 и CRS-08 падают. Сохранённый JSON `accounts-course-msedge.json` и `accounts-course-firefox.json` относятся к запуску до исправления; повторный прогон Edge оборвался на закрытии браузера (CRS-11), поэтому JSON не перезаписан. Полный прогон Firefox после исправления не выполнен.
- Прочие наборы (ISO, ROL, STO, AIO) получены в одном прогоне 14 ноября 2026 года, после которого скрипты не менялись. Полный повторный прогон на машине с параллельной нагрузкой не выполнен.

## Таблица: сценарий x браузер x результат

Серьёзность указана только для провалов.

| ID | Scenario | Edge | Firefox | Severity |
|---|---|---|---|---|
| AIO-01 | AI without a key: status says unavailable, the AI button is hidden, the rules-based review works, the API answers 503 | Passed | Passed | - |
| AIO-02 | Fake provider answering correctly: AI button appears and the review/generate answers with code | Failed | Failed | Medium |
| AIO-03 | Provider errors (500, 429, garbage, empty, dropped connection): UI shows a failure, never stays busy, no JS error, key never leaked | Passed | Passed | - |
| AIO-04 | Slow provider: the button is disabled while waiting and enabled again after the failure | Failed | Failed | Medium |
| AIO-05 | AI panel for a guest works the same as for a signed-in user (server-side key) | Passed | Passed | - |
| AIO-06 | Clarify panel opens without errors with and without a key | Passed | Passed | - |
| AIO-07 | Offline (service worker): dashboard, editor, settings, docs open, saving, sign-out and sign-in work | Passed | Passed | - |
| AIO-08 | 390 px phone: sign-up -> template -> first saved diagram -> list -> sign-out, no horizontal scroll | Failed | Failed | Medium |
| CRS-01 | Two users sign up through the UI, sign out; a wrong password is refused with a message | Passed | Passed | - |
| CRS-02 | User one creates a diagram in the UI; it stays after a reload | Failed | Failed | Medium |
| CRS-03 | API ownership: a user cannot change/delete a foreign diagram, tag or comment (403/404); the owner and author can | Failed | Failed | High |
| CRS-04 | API roles: admin-only /users, no self-promotion, role set at sign-up ignored, role changes and deleted users take effect at once | Failed | Failed | High |
| CRS-05 | API errors: 401 without a token, 400 invalid body, 404 unknown id/route, 405 wrong method | Passed | Passed | - |
| CRS-06 | UI: guest redirected, user gets 403 on /admin, 404 pages, admin lists users | Failed | Failed | Medium |
| CRS-07 | UI comments: another user posts, edits and deletes own comment; a tag on a foreign diagram is refused | Failed | Failed | Medium |
| CRS-08 | Switching accounts in one profile: the token is replaced and each user sees the right data | Failed | Failed | Medium |
| CRS-09 | A damaged token in localStorage: the user is sent to sign-in, no crash | Passed | Passed | - |
| CRS-10 | Storage disabled (private mode): the login page still renders without errors | Passed | Passed | - |
| CRS-11 | Token expiry (JWT_EXPIRES_IN=5): after expiry the app shows the sign-in form | Passed | Passed | - |
| ISO-01 | User A: sign-up through the form, creates a project, a template and a version | Passed | Passed | - |
| ISO-02 | User A: moves a project to the trash | Passed | Passed | - |
| ISO-03 | User B in the same profile: no projects, templates or trash of A, own 33 starter projects | Passed | Passed | - |
| ISO-04 | Quota of B starts at 0 (A's diagrams are not counted) | Passed | Passed | - |
| ISO-05 | Projects are stored under a key of each user | Passed | Passed | - |
| ISO-06 | Version history (Git panel) of A is not visible to B | Failed | Failed | High |
| ISO-07 | Settings of A (editor guides) do not change the settings of B | Failed | Failed | Medium |
| ISO-08 | Theme chosen by A is not applied to B (theme per account) | Failed | Failed | Low |
| ISO-09 | Search and filter state of the dashboard is not carried from A to B | Failed | Failed | Low |
| ISO-10 | A signs in again: projects, template, trash and quota are exactly as left | Passed | Passed | - |
| ISO-11 | Separate browser context: no accounts and no data of A, the same email can be registered there | Passed | Passed | - |
| ISO-12 | User: five new diagrams a day, the sixth and a re-save after delete are refused, edits of an existing one work | Passed | Passed | - |
| ISO-13 | Developer: 7 new diagrams, the quota says no daily limit | Passed | Passed | - |
| ISO-14 | Admin: 7 new diagrams, the quota says no daily limit | Passed | Passed | - |
| ISO-15 | Switching accounts in one profile keeps each user's quota separate | Failed | Failed | Medium |
| ISO-16 | Projects saved as a guest stay with the guest and do not enter a new account | Passed | Passed | - |
| ISO-17 | Sign-out in tab 1 sends tab 2 to sign-in and updates the editor menu; sign-in updates it back | Failed | Failed | Medium |
| ISO-18 | Two tabs save the same project: the last write wins, one record, valid JSON, no errors | Passed | Passed | - |
| ISO-19 | A project trashed in tab 1 is not resurrected or duplicated by a save in tab 2 | Failed | Failed | Medium |
| ISO-20 | Share link: opens for a guest, for another account and in another context; a damaged link does not break the editor | Passed | Passed | - |
| ROL-01 | Documentation: only the developer sees and uses Edit; guest/user/admin do not; wrong codes give no role | Passed | Passed | - |
| ROL-02 | Expert rules: only the developer can edit rules | Passed | Passed | - |
| ROL-03 | Admin role scope | Passed | Passed | - |
| ROL-10 | Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as guest | Passed | Passed | - |
| ROL-11 | Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as user | Passed | Passed | - |
| ROL-12 | Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as developer | Passed | Passed | - |
| ROL-13 | Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as admin | Passed | Passed | - |
| ROL-20 | Trash: move, restore, delete forever, empty, a trashed project does not open | Failed | Failed | Medium |
| ROL-21 | Trash: items older than 30 days are erased | Failed | Failed | Medium |
| ROL-22 | Templates: create from a project and delete, for user, developer and admin | Failed | Failed | Medium |
| ROL-23 | Versions: commit, change, restore returns the committed code, Versions tab lists it | Passed | Passed | - |
| ROL-24 | Role belongs to the account: kept after reload and re-login, other accounts unchanged | Passed | Passed | - |
| STO-01 | Reload keeps the session and the projects (dashboard and editor) | Passed | Passed | - |
| STO-02 | Clearing site data: guest again, old login fails with a message, the same email registers again with a clean state | Passed | Passed | - |
| STO-03 | Corrupted dslkit.accounts (8 payloads x 4 pages): no JS errors, pages render | Passed | Failed | Medium |
| STO-04 | Corrupted dslkit.session | Passed | Failed | Medium |
| STO-05 | Corrupted dslkit.projects.<id> | Passed | Passed | - |
| STO-06 | Corrupted dslkit.templates.<id> | Passed | Failed | Medium |
| STO-07 | Corrupted dslkit.seeded.<id>, settings, theme, dashboard, git-commits, editor-source | Failed | Failed | Medium |
| STO-08 | Tour flag absent / corrupted: the tour opens for a new visitor, Skip stores the flag, no JS errors | Passed | Passed | - |
| STO-09 | Session of a deleted account and a missing project id: sent to sign-in / a clear note, not a crash | Passed | Passed | - |
| STO-10 | The address ?p=<id> of another user's project does not open it | Passed | Passed | - |
| STO-11 | Full storage (QuotaExceededError): sign-up shows the storage message, no session, no JS error | Passed | Passed | - |
| STO-12 | Full storage while saving a project: the page must not claim 'Saved' when nothing was stored | Failed | Failed | High |
| STO-13 | Full storage on the settings page: no false 'The setting is saved' | Failed | Failed | Low |
| STO-14 | Disabled storage (private mode simulation): every page opens, sign-up says why it fails, the editor still draws | Failed | Failed | High |
| STO-15 | Language switch (RU <-> EN) keeps the session, the open project, the unsaved edit and the dashboard section | Failed | Failed | Medium |

## Дефекты (по серьёзности)

| # | Серьёзность | Дефект | Воспроизведение | Статус |
|---|---|---|---|---|
| 1 | High | История версий (Git-панель) общая для всех аккаунтов: ключ `dslkit.git-commits` не разделён по пользователю (ISO-06) | Войти как A, сохранить версию; войти как B в том же профиле: видны версии A | Подтверждено |
| 2 | High | При полном хранилище сохранение проекта показывает «Сохранено», хотя ничего не записано (STO-12) | Заполнить квоту localStorage, изменить проект, нажать сохранить | Требует проверки (тест ждёт переход, см. лог) |
| 3 | High | При отключённом хранилище регистрация сообщает об успехе (Edge, STO-14); в Firefox при этом ошибки JS на дашборде | Подменить `localStorage` на бросающий исключение, зарегистрироваться | Подтверждено в Edge |
| 4 | Medium | Выход в одной вкладке не отправляет вторую на вход: вторая остаётся на закрытой странице (ISO-17) | Два окна, выход в первом, во втором дашборд | Подтверждено |
| 5 | Medium | Проект, удалённый в корзину в первой вкладке, возвращается или дублируется правкой во второй вкладке (ISO-19) | Удалить в A, сохранить правку в B | Подтверждено |
| 6 | Medium | Настройки редактора (направляющие) общие для аккаунтов: ключ `dslkit.settings` (ISO-07) | Изменить как A, войти как B | Подтверждено |
| 7 | Medium | Повреждённые `dslkit.accounts`, `dslkit.session`, `dslkit.templates.<id>`, `dslkit.seeded.<id>` и др. дают ошибки JS или пустую страницу; в Firefox ошибка service worker на `sw.js` (STO-03, 04, 06, 07) | Записать мусор в ключ, открыть страницы | Подтверждено в Firefox, Edge частично |
| 8 | Medium | Нет состояния «занято» во время медленного ответа ИИ; кнопка не блокируется (AIO-04) | Провайдер с задержкой 20 с | Подтверждено |
| 9 | Medium | Курсовое приложение: диаграмма пропадает после перезагрузки (CRS-02); владелец не видит свою диаграмму после смены аккаунта (CRS-08) | Создать диаграмму, перезагрузить; сменить аккаунт и вернуться | Требует проверки |
| 10 | Medium | Телефон 390 px: форма входа не видна в потоке регистрации (AIO-08); в Edge и Firefox одинаково | Открыть регистрацию при ширине 390 px | Требует проверки (возможно, селектор) |

Низкая серьёзность: тема не разделена по аккаунтам (ISO-08), строка поиска дашборда общая (ISO-09), полное хранилище на странице настроек (STO-13), смена языка (STO-15, клик по ссылке не проходит, требует проверки). Меню корзины и шаблонов (ROL-20..22) не открывается в обоих браузерах; возможно, это устаревший селектор, требует проверки. Квота при смене аккаунта (ISO-15) не дошла до welcome.html: тайм-аут, требует проверки.

## Скриншоты

Только провалы: `docs/evidence/accounts-2026-11/screens/fail-*.png` (Firefox; скриншоты Edge не сохранялись в прошлом прогоне).

## Что не сделано

- Полный повторный прогон всех наборов в обоих браузерах после исправления теста.
- Проверка по каждому провалу, помеченному «требует проверки», отдельным ручным прогоном.
