# Тест-план и чеклист безопасности DSLKit (специалист по безопасности приложений)

Дата: 06.11.2026. Ветка `testing-course-full` (Часть 1) и рабочие копии Части 2 в `.claude/worktrees/`. Английская версия: `03-security.en.md`. Основа: OWASP ASVS 4.0, OWASP Top 10:2021 и OWASP WSTG (содержание пересказано, номера глав даны как ссылки).

## 1. Роль и область

Специалист по безопасности приложений проверяет, что DSLKit не выполняет чужой код в браузере, не раскрывает данные пользователя, не принимает вредный ввод и не рассыпается от тяжёлого запроса. Он не чинит код, он готовит проверки, запускает их на своём приложении и записывает результат так, чтобы владелец мог принять решение.

- Часть 1: сайт `site/`, учётные записи и проекты в `localStorage`, `site/sw.js`, импорт файлов, очистка SVG, HTTP-API `tools/render-api.js`, серверы `tools/server.js` и `tools/serve.js`, endpoint генерации кода `tools/ai-api.js`, внешний сервис Kroki.
- Часть 2: Express и JWT (`lab-03-auth`), React (`lab-04`, `lab-05`), MongoDB (`lab-06-mongodb`), Socket.IO (`lab-07-websocket`), Docker с PostgreSQL (`lab-08-docker`), практические `pz-01` до `pz-04`. Ветки: `lab21`, `lab12`, `23` до `28`, `pz21` до `pz24`, `course-app`.
- Сквозное: зависимости npm, секреты, контейнеры, приватность данных в браузере.

## 2. Что проверяется (приоритеты)

| Приоритет | Смысл                                                                                        | Примеры                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| P0        | Выполнение чужого кода, утечка секрета, обход входа или ролей на сервере. Выпуск блокируется | XSS через название, DSL, импорт, SVG. Секрет в репозитории. SQL и NoSQL-инъекции. Порт базы наружу                               |
| P1        | Обход защиты или отказ в обслуживании без особых условий                                     | CSP и заголовки, блокировка входа, CSRF, CORS, Origin в сокетах, IDOR, зависание от одного запроса (F-03, B-02), Docker под root |
| P2        | Защита ослаблена или данные теряются                                                         | PBKDF2 (F-04), гонки вкладок (F-05), кэш воркера (F-06), `unsafe-inline` (F-09), лимиты тела                                     |
| P3        | Гигиена и формулировки                                                                       | HSTS, раскрытие версий, журналы без срока хранения, описание ограничений                                                         |

## 3. План

### 3.1 Цели

1. Подтвердить, что защиты из `61-security-code-review.md` и `02-SECURITY-AUDIT.md` работают после последних правок (код изменился: воркер `dslkit-v5`, в API есть `MAX_LINES`, новый расчёт тела, появился `tools/ai-api.js`).
2. Закрыть области, которые прежние отчёты не покрывали: заголовки в браузере, воркер и кэш, роли в клиенте, endpoint генерации, Docker на запущенном стенде, WebSocket.
3. Убедиться, что каждая известная находка (F-01 до F-13, B-01 до B-18, строки аудита ЛР1 до ПЗ4) исправлена или честно записана как ограничение.
4. Зафиксировать границу доверия: что защита, а что удобство (риск R-05: учётные записи в браузере не заменяют серверную аутентификацию).

### 3.2 Объём и вне объёма

- В объёме: всё из раздела 1 на localhost, чтение кода, тесты репозитория, сценарии в Chromium, запросы `curl`.
- Вне объёма: чужие хосты и сам `kroki.io` (подменённый ответ имитируется локальной заглушкой), нагрузочные испытания сверх одного тяжёлого запроса, социальная инженерия, сеть вуза, настоящая серверная аутентификация Части 1 (её нет по условию), исправление найденного.

### 3.3 Подход

- Статический обзор по категориям OWASP: поиск `innerHTML`, `eval`, динамических запросов, чтения секретов.
- Динамические проверки: `npm test`, `testing-course/full/*`, ручные сценарии, `curl`.
- Набор грязных данных: разметка, кавычки, управляющие символы, U+2028, очень длинные строки, `__proto__`, операторы вида `{"$ne":null}`, SQL-кавычки.
- Результат пункта: прошёл, не прошёл, не применимо, не проверялось. Причина обязательна, кроме «прошёл».

### 3.4 Окружение

- Windows 11, Node.js 20 или новее, Chromium через Playwright, `curl`, Docker Desktop.
- Часть 1: `npm start` на `http://localhost:5173`, для сравнения сборка `npm run build` и `npm run start:prod`.
- Часть 2: каждая работа в своей рабочей копии, базы только локальные, `.env` с тестовыми значениями, созданными на этой машине. Ключ сторонней службы не задавать: endpoint генерации должен отвечать понятным отказом.
- Учётные записи: user, developer, admin и второй обычный пользователь (для IDOR). Все вымышленные.

### 3.5 Критерии входа и выхода

- Вход: приложение запускается, `npm ci` выполнен, записан хеш коммита, красные тесты известны (B-16), для браузера взят чистый профиль.
- Выход: выполнены все P0 и P1 с ссылкой на артефакт. Нет открытых P0. Открытые P1 и P2 внесены в реестр рисков с решением владельца. `npm audit --omit=dev` без высоких и критических находок во всех проверенных пакетах. RU и EN отчёта обновлены вместе.

### 3.6 Этика

- Только собственное приложение на localhost или в локальном контейнере. Чужие сайты, общие серверы и учётные записи других людей не проверяются.
- Секреты не выводятся в консоль, чат и отчёты, фиксируется только факт и путь. Поиск секретов только по именам файлов.
- Команды Docker, удаляющие тома и образы (`down -v`, `prune`), только после явного решения владельца.
- Проверка отказа в обслуживании: один запрос, таймаут, перезапуск сервера, отдельный порт и не во время чужой работы на той же машине (в прошлом прогоне это мешало другим, см. F-03).
- Уязвимость сообщается владельцу по `SECURITY.md`, подробности до исправления не публикуются.

- Риски самого тестирования:
  - Повисший сервер: `curl -m 10`, отдельный порт, перезапуск процесса.
  - Устаревший кэш воркера даёт ложные результаты: перед прогоном снять регистрацию и очистить Cache Storage.
  - Старые номера строк в отчётах: сверять с текущим кодом.
  - Особенности Windows (регистр путей, `::$DATA`, B-18): записывать платформу.

### 3.7 Сопоставление с уже найденным

Находки не дублируются, чеклист просит повторно проверить состояние.

| ID                                 | Тема                                                                                    | Пункты                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| F-01, B-01, B-03                   | Медленный разбор, исключение на U+2028                                                  | FILE-03, FILE-04, API-02                                            |
| F-02, R-05, B-07, B-12             | Вход только на клиенте, выход в другой вкладке, не все страницы закрыты                 | AUTH-01, AUTH-02, PRIV-01, LIM-01                                   |
| F-03, B-02, F-07                   | Синхронный API, лимит тела                                                              | API-01, API-02, API-03                                              |
| F-04, B-15                         | PBKDF2, нет блокировки, кнопка зависает                                                 | AUTH-04, AUTH-05, BRUTE-05                                          |
| F-05, B-04, B-05, B-06, B-08       | Гонки, лимит 200, тихий отказ записи                                                    | PRIV-03 до PRIV-05                                                  |
| F-06                               | Воркер и кэш API                                                                        | SW-01 до SW-05                                                      |
| F-08, F-09, F-10, F-11, F-12, F-13 | Ссылки в SVG, `unsafe-inline`, интерфейсы, Kroki, квота, dev-зависимости                | XSS-06, HDR-02, HDR-07, PRIV-06, LIM-01, DEP-02                     |
| B-10, B-18                         | Файл читается до проверки размера, пути `::$DATA`                                       | FILE-02, HDR-08                                                     |
| Аудит 02: ЛР3, ЛР5, ЛР7, ЛР8       | Блокировка по почте, JWT в `localStorage`, секрет по умолчанию, nginx и `sequelize-cli` | BRUTE-02, AUTH-11, AUTH-12, KEY-05, WS-05, DOCK-05, DEP-04, CORS-02 |
| Аудит 02: ПЗ1, ПЗ2                 | `auth=1` в журнале, почта в списке, смена роли                                          | AUTHZ-04, AUTHZ-05, PRIV-08                                         |

## 4. Чеклист

Строка: `ID (приоритет) что проверить. Где: файл или категория. OWASP: ссылка.` Результат и артефакт вписываются в отчёт, не в этот файл.

### 4.1 XSS: названия проектов, DSL, импорт, SVG

- [ ] XSS-01 (P0) Название проекта с `<img onerror>` и `<script>` не исполняется на дашборде, в списке файлов, во вкладке и в имени экспортируемого файла. Где: `site/js/components/dashboard.js`, `editor-projects.js`. OWASP: A03, WSTG-INPV-02, ASVS V5.
- [ ] XSS-02 (P0) Метки, заголовок и идентификаторы блоков в DSL со спецсимволами экранируются во всех нотациях, `data-id` не даёт атрибутной инъекции. Где: `site/js/notations/common.js` (`escapeXml`). OWASP: A03, WSTG-CLNT-01, ASVS V5.3.
- [ ] XSS-03 (P0) Импорт Mermaid, PlantUML и DOT с вредными подписями проходит отрисовку и сохранение без выполнения скрипта. Где: `site/js/utils/import-diagram.js`. OWASP: A03, WSTG-CLNT-01.
- [ ] XSS-04 (P0) SVG движка с `script`, `onload`, `javascript:` (регистр, табуляция в схеме), `foreignObject`, `use`, `image`, DOCTYPE-сущностями и `url()` в `style` очищается. Где: `site/js/utils/dataParser.js` (`sanitizeSvg`). OWASP: A03, ASVS V5.3.
- [ ] XSS-05 (P0) Ответ `/api/external/*` с `<script`, `on...=` или `javascript:` отклоняется кодом 502. Где: `tools/render-api.js` (`UNSAFE_SVG`). OWASP: A03, ASVS V13.
- [ ] XSS-06 (P2) Внешняя ссылка `<a href="https://...">` вокруг всего полотна и тяжёлые фильтры: повторить F-08 и записать решение. Где: `dataParser.js` (`SAFE_LINK`). OWASP: A04, ASVS V5.
- [ ] XSS-07 (P1) Имя и почта в формах, поиск, тосты, панель проблем, документация и экспертная панель выводят пользовательский текст через `textContent`. Где: `validation.js`, `app-search.js`, `toast.js`, `problems-panel.js`, `docs.js`. OWASP: A03, WSTG-INPV-02.
- [ ] XSS-08 (P1) `git grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" -- site/js` даёт только вхождения с константами. Где: `site/js`. OWASP: A03, ASVS V5.3.
- [ ] XSS-09 (P1) Параметры адреса и хеш не попадают в страницу без кодирования и не создают открытый редирект. Где: `editor-projects.js`, `welcome.js`, `auth-gate.js`. OWASP: A03, A01, WSTG-CLNT-04.
- [ ] XSS-10 (P1) Подложенное содержимое `localStorage` (разметка в названии, `settings`, `diagram_cache`) не приводит к выполнению кода. Где: `site/js/utils/storage.js`, `site/js/storage/*.js`. OWASP: A03, A08, WSTG-CLNT-12.
- [ ] XSS-11 (P1) React Части 2 без `dangerouslySetInnerHTML`, EJS в `pz-01` только с экранирующим выводом, чат `lab-07` через `textContent`. Где: `lab-04`, `lab-05`, `pz-04`, `pz-01/views`, `lab-07/public`. OWASP: A03, WSTG-CLNT-10.

### 4.2 CSP и заголовки

- [ ] HDR-01 (P0) CSP на каждом типе ответа (HTML, JS, JSON, страницы ошибок) содержит `script-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`. Где: `tools/server.js` (`SECURITY_HEADERS`). OWASP: A05, WSTG-CONF-12, ASVS V14.4.
- [ ] HDR-02 (P2) `style-src 'unsafe-inline'` оставлен из-за SVG: записан как принятое ограничение или план отказа (F-09). Где: `tools/server.js`. OWASP: A05.
- [ ] HDR-03 (P1) При обходе всех страниц в консоли нет нарушений CSP, а инлайн-скрипт, подложенный через консоль, блокируется. Где: все страницы `site/`. OWASP: A05, WSTG-CONF-12.
- [ ] HDR-04 (P1) `connect-src` пускает только свой сервер и `https://kroki.io`, запрос к другому хосту блокируется. Где: `tools/server.js`. OWASP: A05, A10.
- [ ] HDR-05 (P1) `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP и верный `Content-Type` есть у статики, API и ответов 4xx и 5xx. Где: `server.js`, `render-api.js`. OWASP: A05, WSTG-CONF-06, ASVS V14.4.
- [ ] HDR-06 (P1) Страница не встраивается во фрейм чужого порта (проверка тестовой страницей). Где: `frame-ancestors`. OWASP: A05, WSTG-CLNT-09.
- [ ] HDR-07 (P3) Для боевого хоста по HTTPS есть HSTS, сервер разработки слушает только `127.0.0.1` (сейчас все интерфейсы, F-10). Где: `tools/serve.js`, настройки хостинга. OWASP: A05, WSTG-CONF-07.
- [ ] HDR-08 (P2) Пути `..%2f`, `%2e%2e`, `..%5c`, `%00`, `/js/../../package.json`, `index.html::$DATA`, другой регистр, длинный адрес не отдают файлы вне `site/` (B-18). Где: `tools/server.js` (`serve`). OWASP: A05, WSTG-ATHZ-01.
- [ ] HDR-09 (P2) Методы кроме GET и HEAD дают 405 с `Allow`, кривой заголовок даёт страницу 400 или 431 без стека. Где: `tools/server.js` (`clientError`). OWASP: A05, WSTG-CONF-06, ASVS V7.
- [ ] HDR-10 (P2) Часть 2: заголовки безопасности в API и в nginx (CSP, `server_tokens off`), `X-Powered-By` выключен. Где: `lab-03-auth/src/app.js`, `lab-08-docker/frontend/nginx.conf`. OWASP: A05, WSTG-CONF-06.

### 4.3 Хранение секретов

- [ ] KEY-01 (P0) В рабочем дереве и истории нет ключей и паролей, поиск по именам файлов, каждое вхождение проверено на тестовое значение. Где: репозиторий и ветки Части 2. OWASP: A02, A05, ASVS V2.10.
- [ ] KEY-02 (P0) `.env` не отслеживается git, есть в `.gitignore` и `.dockerignore`, есть `.env.example` без значений. Где: корень и каждая работа. OWASP: A05, ASVS V14.1.
- [ ] KEY-03 (P0) Ключ сервиса генерации читается только из окружения сервера и не попадает в ответ, журнал, исключение и страницу. Где: `tools/ai-api.js`. OWASP: A02, ASVS V8.
- [ ] KEY-04 (P1) Клиентский код и `dist` не содержат серверных ключей и переменных окружения. Где: `site/js`, `dist`. OWASP: A02, WSTG-CONF-04.
- [ ] KEY-05 (P0) Сервер Части 2 не стартует без `JWT_SECRET` достаточной длины и разнообразия, секрета по умолчанию в коде нет. Где: `lab-03-auth/src/settings.js`, `lab-07-websocket/src/token.js`. OWASP: A02, A07, ASVS V6.4.
- [ ] KEY-06 (P1) Пароли и ключи не видны в `docker history`, `docker inspect`, `ARG` сборки и журналах контейнеров. Где: `lab-08-docker/backend/Dockerfile`, `docker-compose.yml`. OWASP: A05, ASVS V14.
- [ ] KEY-07 (P1) Хеши кодов ролей developer и admin в клиентском файле описаны как ограничение, а не защита, сами коды нигде не записаны. Где: `site/js/config/roles.js`. OWASP: A04, A02, R-05.
- [ ] KEY-08 (P2) Журналы сервера и тестов не содержат паролей, токенов, строки подключения и тел запросов входа, пароль администратора сидов задаётся через окружение. Где: `request-log.js`, `lab-03-auth/seeders`. OWASP: A09, ASVS V7.1.

### 4.4 Аутентификация и сессии

- [ ] AUTH-01 (P1) Часть 1: дашборд без сессии ведёт на вход, подложенная сессия с копией аккаунта его открывает. Записать как ограничение R-05, не как дефект (F-02). Где: `site/js/components/auth-gate.js`. OWASP: A07, WSTG-ATHN-04, ASVS V3.
- [ ] AUTH-02 (P2) После выхода в другой вкладке защищённая страница и сохранение в редакторе перепроверяют сессию, правило защиты `app/*` единое (B-07, B-12). Где: `auth-gate.js`, `editor-projects.js`, `site/app/*.html`. OWASP: A07, WSTG-SESS-06.
- [ ] AUTH-03 (P2) Запись аккаунта хранит соль, хеш и число итераций, пароль в открытом виде нигде не появляется. Где: `site/js/storage/accounts.js`. OWASP: A02, A07, ASVS V2.4.
- [ ] AUTH-04 (P2) Число итераций PBKDF2 (сейчас 100 000, рекомендация OWASP выше) записано как решение, старые записи проверяются со своим числом (F-04). Где: `accounts.js` (`ITERATIONS`). OWASP: A02, ASVS V2.4.
- [ ] AUTH-05 (P2) Отказ `crypto.subtle` не оставляет кнопку отправки отключённой и показывает ошибку (B-15). Где: `site/js/components/auth.js`. OWASP: A07, ASVS V7.
- [ ] AUTH-06 (P2) Ответ и время при неверной почте и неверном пароле сравнимы (фиктивная соль, сравнение без раннего выхода). Где: `accounts.js` (`DUMMY_SALT`, `same`). OWASP: A07, WSTG-IDNT-04, ASVS V2.2.
- [ ] AUTH-07 (P2) Политика пароля (8 до 128 знаков, слабые пароли не проверяются) записана, почта в другом регистре или с пробелами не создаёт дубль. Где: `validation.js`, `accounts.js` (`normalizeEmail`). OWASP: A07, WSTG-ATHN-07, WSTG-IDNT-02.
- [ ] AUTH-08 (P1) Часть 2: токены `alg: none`, чужой секрет, истёкший срок, другой издатель и обрезанная подпись отклоняются кодом 401, алгоритм и издатель закреплены. Где: `lab-03-auth/src/middleware/auth.js`. OWASP: A07, WSTG-SESS-10, ASVS V3.5.
- [ ] AUTH-09 (P1) Срок жизни токена не больше 24 часов, роль берётся из базы на каждый запрос. Где: `lab-03-auth/src/settings.js`, `auth.js`. OWASP: A01, A07, ASVS V3.
- [ ] AUTH-10 (P1) Пароль хранится как bcrypt, длина ограничена 72 байтами, хеш не попадает в ответы API. Где: `lab-03-auth/limits.json`, `users.controller.js`. OWASP: A02, ASVS V2.4.
- [ ] AUTH-11 (P2) Отзыва токена и выхода на сервере нет, регистрация раскрывает занятость почты кодом 409 (ЛР3): состояние подтверждено, решение записано. Где: `lab-03-auth/src/controllers/auth.controller.js`. OWASP: A07, WSTG-SESS-06, WSTG-IDNT-04.
- [ ] AUTH-12 (P2) Токен в клиенте лежит в `localStorage` (ЛР5) или в памяти страницы (ЛР7): выбор записан, риск при XSS оценён. Где: `lab-05-react-api/src/api.js`, `lab-07-websocket/public`. OWASP: A07, WSTG-CLNT-12.

### 4.5 Авторизация, IDOR, роли

- [ ] AUTHZ-01 (P0) Пользователь A не читает, не меняет и не удаляет диаграмму пользователя B по идентификатору (GET, PUT, PATCH, DELETE). Где: `lab-03-auth/src/controllers/diagrams.controller.js`. OWASP: A01, WSTG-ATHZ-04, ASVS V4.2.
- [ ] AUTHZ-02 (P0) Изменить чужую запись может только владелец или администратор, роль из тела запроса игнорируется. Где: `diagrams.controller.js`, `users.controller.js`. OWASP: A01, WSTG-ATHZ-03.
- [ ] AUTHZ-03 (P0) Поля `role`, `id`, `ownerId`, `passwordHash` в теле регистрации и обновления не принимаются (массовое присвоение). Где: `src/middleware/validate.js`, `validate-auth.js`. OWASP: A01, A04, ASVS V5.1.
- [ ] AUTHZ-04 (P1) `pz-02`: смена роли `owner` без прав и почты в публичном списке (аудит 02): состояние подтверждено. Где: `pz-02-rest-api/src/app.js`, `resource.js`. OWASP: A01, WSTG-ATHZ-02.
- [ ] AUTHZ-05 (P2) `pz-01`: признак `?auth=1` это имитация по условию, в журнал запросов не пишется. Где: `pz-01-middleware-ejs/src/middleware/fakeAuth.js`, `requestLogger.js`. OWASP: A01, A09.
- [ ] AUTHZ-06 (P1) Часть 1: подделанная роль в `localStorage` влияет только на лимит новых диаграмм и правку документации, не на чужие данные. Где: `accounts.js`, `site/js/config/roles.js`. OWASP: A01, A04, R-05.
- [ ] AUTHZ-07 (P1) Часть 1: проекты одного аккаунта не видны под другим и гостем на одном профиле, ключ `projects.<id>` привязан к владельцу. Где: `site/js/storage/projects.js`. OWASP: A01, WSTG-ATHZ-04.
- [ ] AUTHZ-08 (P1) Маршруты администратора и список пользователей закрыты на сервере (401 анониму, 403 обычной роли), в том числе те, что скрыты в клиенте. Где: `lab-03-auth/src/routes/users.routes.js`, `RoleRoute.jsx`. OWASP: A01, WSTG-ATHZ-02, ASVS V4.1.

### 4.6 Брутфорс

- [ ] BRUTE-01 (P1) Часть 2: после 5 неудачных входов вход блокируется на 15 минут даже с верным паролем, ответ 429 содержит время ожидания. Где: `lab-03-auth/limits.json`, `middleware/rate-limit.js`. OWASP: A07, WSTG-ATHN-03, ASVS V2.2.1.
- [ ] BRUTE-02 (P1) Блокировка по паре адрес и почта не даёт заблокировать чужую почту с другого адреса, счётчик неизвестной почты ведётся так же (ЛР3). Где: `rate-limit.js` (`createLoginGuard`). OWASP: A07, A04.
- [ ] BRUTE-03 (P1) Лимит частоты на `/auth/login` и `/auth/register` срабатывает до проверки данных. Где: `src/routes/auth.routes.js`. OWASP: A07, ASVS V11.
- [ ] BRUTE-04 (P2) Счётчики в памяти процесса: сброс после перезапуска записан как ограничение, таблица ограничена по размеру, `X-Forwarded-For` не обходит счётчик без доверенного прокси. Где: `rate-limit.js`, `src/app.js`. OWASP: A04, A05.
- [ ] BRUTE-05 (P2) Часть 1: лимита попыток нет (F-04), ограничение описано, подбор замедляется стоимостью PBKDF2. Где: `accounts.js`. OWASP: A07, WSTG-ATHN-03, R-05.
- [ ] BRUTE-06 (P2) Лимит endpoint генерации (6 в минуту на адрес, суточный предел) даёт 429 и не обходится заголовками. Где: `tools/ai-api.js`. OWASP: A04, ASVS V11.

### 4.7 CSRF

- [ ] CSRF-01 (P1) `pz-01`: POST без токена и с чужим токеном отклоняется, токен в cookie `SameSite=Strict` совпадает с полем формы. Где: `pz-01-middleware-ejs/src/middleware/security.js` (`csrf`). OWASP: A01, WSTG-SESS-05, ASVS V4.2.2.
- [ ] CSRF-02 (P1) Запрос с чужим `Origin` отклоняется даже с верным токеном. Где: `security.js`. OWASP: A01, WSTG-SESS-05.
- [ ] CSRF-03 (P1) API с JWT не принимает токен из cookie, JSON-маршруты не принимают `application/x-www-form-urlencoded`, изменение состояния недоступно через GET, `POST /api/*` Части 1 ничего не меняет на сервере. Где: `lab-03-auth/src/middleware/http.js`, `routes/*.js`, `tools/render-api.js`. OWASP: A01, WSTG-SESS-05, ASVS V4.

### 4.8 CORS

- [ ] CORS-01 (P1) Для чужого `Origin`, `null` и похожего поддомена нет `Access-Control-Allow-Origin`. Где: `lab-03-auth/src/middleware/cors.js`. OWASP: A05, WSTG-CLNT-07, ASVS V14.5.
- [ ] CORS-02 (P1) Нет сочетания `*` и `Allow-Credentials: true`, `Origin` не отражается без списка, `OPTIONS` разрешает только нужные методы и заголовки, `CORS_ORIGIN` в compose читается кодом или удалён. Где: `cors.js`, `src/app.js` (`corsOrigin`), `lab-08-docker/docker-compose.yml`. OWASP: A05, WSTG-CLNT-07.
- [ ] CORS-03 (P2) Часть 1: API отдаёт ответ только своему происхождению (заголовков CORS нет), страница с другого порта не читает `/api/render`. Где: `tools/render-api.js`. OWASP: A05, WSTG-CLNT-07.

### 4.9 Инъекции

- [ ] INJ-01 (P0) PostgreSQL: кавычка, `' OR 1=1 --`, юникод-кавычки в почте, названии и параметрах списка не меняют запрос, обращения идут через Sequelize с параметрами. Где: `lab-03-auth/src/models`, `controllers`. OWASP: A03, WSTG-INPV-05, ASVS V5.3.4.
- [ ] INJ-02 (P0) `git grep -nE "sequelize\.query|literal\(|\.raw"` в Части 2 даёт только запросы с `replacements`. Где: `part-2/lab-0*/src`. OWASP: A03, ASVS V5.3.4.
- [ ] INJ-03 (P0) Поля `sort`, `order`, `fields` принимаются только из белого списка. Где: `lab-03-auth/src/middleware/list-query.js`. OWASP: A03, WSTG-INPV-05.
- [ ] INJ-04 (P0) MongoDB: `{"$ne":null}`, `{"$gt":""}`, `$where`, `$regex` в теле и query не становятся оператором (`sanitizeFilter`, `strictQuery`). Где: `lab-06-mongodb/src/middleware`, `controllers`. OWASP: A03, WSTG-INPV-05, ASVS V5.3.
- [ ] INJ-05 (P0) Идентификатор документа проверяется как строгий ObjectId, иначе 400. Где: `lab-06-mongodb/src`. OWASP: A03, ASVS V5.1.
- [ ] INJ-06 (P1) `__proto__`, `constructor`, `prototype` в JSON не меняют объекты (ПЗ2 защищён, проверить остальные работы). Где: `pz-02-rest-api/src`, `lab-0*/src/middleware/validate.js`. OWASP: A08, A03, ASVS V5.1.
- [ ] INJ-07 (P1) Сервер не собирает команды из ввода (`git grep -nE "child_process|exec\(|spawn\("` по `tools` и `part-2`), EJS без `<%-` с пользовательскими данными. Где: `tools`, `pz-01/views`. OWASP: A03, WSTG-INPV-12, WSTG-INPV-18.
- [ ] INJ-08 (P2) Журнал запросов не уязвим к подделке строк (перевод строки в параметре), ошибка базы даёт 500 без текста запроса, имён таблиц и стека. Где: `request-log.js`, `requestLogger.js`, `src/middleware/error-handler.js`. OWASP: A09, A05, ASVS V7.4.

### 4.10 Загрузка и импорт файлов

- [ ] FILE-01 (P1) Импорт принимает только ожидаемые расширения и текст, бинарные и подменённые по расширению файлы не ломают страницу, загрузки Части 2 (если есть) лежат вне корня раздачи. Где: `site/js/components/import-menu.js`, `part-2`. OWASP: A04, WSTG-BUSL-08, ASVS V12.
- [ ] FILE-02 (P1) Размер проверяется по `file.size` до чтения, вставка из буфера подчиняется тому же пределу (B-10). Где: `import-menu.js`, `import-diagram.js` (`MAX_TEXT`). OWASP: A04, WSTG-BUSL-09, ASVS V12.1.
- [ ] FILE-03 (P1) Файл из одной длинной строки, с BOM, смесью `\r\n` и U+2028 разбирается без зависания и необработанного исключения (B-03). Где: `import-menu.js`, `site/js/components/code-lines.js`. OWASP: A04, WSTG-INPV.
- [ ] FILE-04 (P1) Пробельная и повторяющаяся строка 40 000 знаков разбирается за порог 200 мс (F-01). Где: `site/js/utils/import-diagram.js`. OWASP: A04, ASVS V5 (ReDoS как отказ).
- [ ] FILE-05 (P2) Экспорт: имя файла из названия не ломается спецсимволами и длиной (B-11), SVG и PNG не содержат внешних ссылок. Где: `export-menu.js`, `site/js/utils/exporters.js`. OWASP: A03, A08.
- [ ] FILE-06 (P2) Картинка для генерации проверяется по первым байтам и типу, превышение размера даёт 413. Где: `tools/ai-api.js` (`SIGNATURES`). OWASP: A04, ASVS V12.2.

### 4.11 Зависимости

- [ ] DEP-01 (P0) `npm audit --omit=dev --audit-level=high` без находок в корне и в каждой работе Части 2. Где: `package-lock.json`. OWASP: A06, ASVS V14.2.
- [ ] DEP-02 (P2) Полный `npm audit`: dev-цепочка (F-13, `undici`, `fast-uri`) разобрана, решение записано. Где: корень. OWASP: A06.
- [ ] DEP-03 (P1) Lock-файл есть у каждой работы (у ЛР8 его не было), установка через `npm ci`. Где: `package-lock.json`, `Dockerfile`. OWASP: A08, A06.
- [ ] DEP-04 (P2) Нужное при запуске контейнера (`sequelize-cli`) лежит в `dependencies`, а не тянется `npx`, версии и теги образов (`postgres:16-alpine`) не `latest`. Где: `lab-08-docker/backend/Dockerfile`, `package.json`, `docker-compose.yml`. OWASP: A08, A06.
- [ ] DEP-05 (P2) Скрипты и шрифты не подключаются с чужих хостов, CDN нет. Где: `site/*.html`. OWASP: A08, ASVS V14.2.3.

### 4.12 Docker и контейнеры

- [ ] DOCK-01 (P1) Backend запущен не от root: `docker compose exec backend id`. Где: `lab-08-docker/backend/Dockerfile` (`USER node`). OWASP: A05, ASVS V14.
- [ ] DOCK-02 (P1) Файловая система только для чтения, `cap_drop: [ALL]`, `no-new-privileges`, лимиты памяти и процессов заданы. Где: `docker-compose.yml`. OWASP: A05.
- [ ] DOCK-03 (P0) Порт базы не опубликован на хост, база только в закрытой сети `internal`: `docker compose port db 5432` пусто. Где: `docker-compose.yml`. OWASP: A05, WSTG-CONF-02.
- [ ] DOCK-04 (P1) Обязательные пароли заданы через `${VAR:?}`, значений по умолчанию для секретов нет. Где: `docker-compose.yml`. OWASP: A05, A07.
- [ ] DOCK-05 (P2) У nginx заданы CSP, `server_tokens off`, `client_max_body_size`, `limit_req`, листинга каталогов нет. Где: `lab-08-docker/frontend/nginx.conf`. OWASP: A05, WSTG-CONF-04.
- [ ] DOCK-06 (P1) Сборка многоэтапная, в итоговом образе нет `.env`, `.git`, тестов и ключей: `docker run --rm --entrypoint sh <образ> -c "ls -la"`. Где: `Dockerfile`, `.dockerignore`. OWASP: A05, A08.
- [ ] DOCK-07 (P2) `HEALTHCHECK` не печатает секретов, журналы ротируются (`max-size`, `max-file`), TLS к базе (если включён) проверяет сертификат. Где: `Dockerfile`, `docker-compose.yml`. OWASP: A09, A02.
- [ ] DOCK-08 (P2) Пересоздание контейнеров не сбрасывает данные тома без решения владельца, команды с удалением томов помечены в README. Где: `lab-08-docker/package.json`, README. OWASP: A05.

### 4.13 WebSocket

- [ ] WS-01 (P0) Рукопожатие с чужим `Origin` и без него отклоняется, список разрешённых берётся из настройки. Где: `lab-07-websocket/src/origin.js`. OWASP: A01, WSTG-CLNT-10, ASVS V13.5.
- [ ] WS-02 (P1) При `REQUIRE_TOKEN` соединение без токена и с поддельным не принимается, подписи сравниваются за постоянное время. Где: `src/token.js`, `src/socket.js`. OWASP: A07, ASVS V13.5.
- [ ] WS-03 (P1) Имя отправителя берётся из соединения, а не из тела сообщения. Где: `src/socket.js`. OWASP: A01, A04.
- [ ] WS-04 (P1) Слишком большое, не-JSON, неверного типа сообщение и поле с управляющими или bidi-символами отбрасываются без падения сервера. Где: `src/validate.js`. OWASP: A03, A04, WSTG-CLNT-10.
- [ ] WS-05 (P1) Лимит частоты событий не сбрасывается переподключением, есть лимит соединений с адреса (аудит 02, ЛР7), `/login` для выдачи токена ограничен по частоте. Где: `src/rate-limit.js`, `socket.js`, `src/app.js`. OWASP: A04, A07, ASVS V13.5.
- [ ] WS-06 (P2) Медленный клиент не копит неограниченную очередь, история ограничена по числу и сроку. Где: `src/slow-clients.js`, `src/history.js`. OWASP: A04, A09.

### 4.14 Сервис-воркер и кэш

- [ ] SW-01 (P1) Воркер кэширует только файлы своего происхождения, запросы к `kroki.io` идут в сеть. Где: `site/sw.js`. OWASP: A05, A08.
- [ ] SW-02 (P1) `/api/*` не попадает в кэш и не отдаётся устаревшим вопреки `no-store` (F-06). Где: `sw.js`. OWASP: A05.
- [ ] SW-03 (P2) После выпуска обновления (смена файла и `VERSION`) пользователь получает новый JS не позже второго захода, смеси версий нет, старые кэши удаляются. Где: `sw.js` (`activate`). OWASP: A08, A06.
- [ ] SW-04 (P2) Офлайн-копия страниц с `data-requires-auth` не показывает данных, защита остаётся в JavaScript (R-05). Где: `sw.js`, `auth-gate.js`. OWASP: A01.
- [ ] SW-05 (P2) Cache Storage не содержит персональных данных, ответов API и токенов. Где: DevTools, Application. OWASP: A02, WSTG-CLNT-12.

### 4.15 Приватность данных в localStorage

- [ ] PRIV-01 (P1) Перечень ключей `dslkit.*` описан (аккаунты с хешами, сессия, проекты открытым текстом, настройки, кэш), паролей и токенов сторонних служб нет. Где: `site/js/utils/storage.js`, `site/js/storage/*`. OWASP: A02, WSTG-CLNT-12, ASVS V8.
- [ ] PRIV-02 (P2) Выход очищает сессию, гость не видит проекты бывшего пользователя без входа, решение о хранении данных после выхода записано. Где: `accounts.js` (`logout`), `projects.js`. OWASP: A01, A04, ASVS V8.3.
- [ ] PRIV-03 (P2) Полная квота показывает ошибку записи, а не «Сохранено», и не стирает остальные ключи (B-06). Где: `source-autosave.js`, `projects.js`. OWASP: A04, ASVS V7.
- [ ] PRIV-04 (P2) Две вкладки не теряют записи и не воскрешают проект из корзины (F-05, B-04), лимит 200 не удаляет молча (B-05). Где: `site/js/storage/projects.js`. OWASP: A04, A08.
- [ ] PRIV-05 (P2) Запрет сайтовых данных даёт предупреждение, а не «успешную» регистрацию (B-08). Где: `site/js/utils/storage.js` (`getStorage`). OWASP: A04, ASVS V7.
- [ ] PRIV-06 (P1) Пользователь видит, что код диаграммы уходит на `kroki.io` при внешнем движке, встроенный ничего не отправляет, других внешних хостов в сети нет (F-11). Где: `site/js/api/config.js`, `privacy.html`. OWASP: A02, A10, ASVS V8.
- [ ] PRIV-07 (P2) Нет аналитики и сторонних счётчиков, форма waitlist шлёт данные только на свой адрес, политика актуальна. Где: `waitlist-form.js`, `privacy.html`. OWASP: A02, ASVS V8.
- [ ] PRIV-08 (P2) Публичные ответы Части 2 не раскрывают почты и хеши (список пользователей, `?q=`). Где: `pz-02-rest-api/src/resource.js`, `users.controller.js`. OWASP: A01, A02, ASVS V8.
- [ ] PRIV-09 (P3) Журналы запросов Части 2 не хранят полный IP и query-строку без срока (TTL, ротация). Где: `src/models/request-log.js`, `tests/log-retention.test.js`. OWASP: A09, ASVS V8.

### 4.16 HTTP-API и ограничения ресурсов

- [ ] API-01 (P1) Один тяжёлый запрос (500 и более блоков или 100 000 знаков) не блокирует статику дольше порога, либо введены ограничения (F-03, B-02). Где: `tools/render-api.js`, `server.js`. OWASP: A04, WSTG-BUSL-05, ASVS V13.
- [ ] API-02 (P1) Пределы строк (`MAX_LINES`), размера источника и числа вершин срабатывают с кодами 422 и 413 до разбора. Где: `render-api.js`. OWASP: A04, ASVS V13.
- [ ] API-03 (P2) Лимит тела считается отдельно от лимита символов, чтение прекращается при превышении (F-07). Где: `render-api.js` (`MAX_BODY`). OWASP: A04.
- [ ] API-04 (P1) Тело не-JSON, `null`, число, массив, неверный тип содержимого и метод дают 400, 415 и 405, а не 500. Где: `render-api.js`. OWASP: A05, ASVS V13.2.
- [ ] API-05 (P1) Адрес внешнего сервиса берётся только из `KROKI_URL`, язык проверяется по белому списку, пользователь адрес не задаёт (SSRF). Где: `render-api.js` (`krokiUrl`, `EXTERNAL_TYPES`). OWASP: A10, WSTG-INPV-19.
- [ ] API-06 (P2) Ответ внешнего сервиса: таймаут 10 с, предел 5 000 000 знаков, неверный формат и ошибка дают 502 и 504 без деталей (локальная заглушка). Где: `render-api.js` (`external`). OWASP: A10, A04.
- [ ] API-07 (P2) Каталоги `/api/notations` и `/api/grammar` и ошибки Части 2 не раскрывают пути, версии и стек. Где: `render-api.js`, `error-handler.js`. OWASP: A05, WSTG-INFO-02, ASVS V7.4.
- [ ] API-08 (P1) Endpoint генерации: пустой ключ даёт отказ без обращения к службе, текст больше 20 000 знаков даёт 413, повторов не больше двух, результат проходит `parseDiagram` и выводится как текст. Где: `tools/ai-api.js`, `site/js/components/automation.js`. OWASP: A04, A03.

### 4.17 Ограничения и формулировки (R-05)

- [ ] LIM-01 (P1) В документах и интерфейсе Части 1 учётные записи и квота «пять диаграмм в день» названы удобством, а не серверной защитой (R-05, F-02, F-12, B-13). Где: README, `privacy.html`, `projects.js`, `quota.js`. OWASP: A04, ASVS V1.
- [ ] LIM-02 (P3) Отсутствие аутентификации в ЛР1, ЛР2, ЛР6, ПЗ2 и имитация входа в ПЗ1, ПЗ3 названы условием работы в отчётах, ограничения мер (счётчики в памяти, нет отзыва токена) перечислены в `AUDIT.md`. Где: отчёты и `part-2/*/AUDIT.md`. OWASP: A01, A04.

## 5. Как запускать

Все команды выполняются на своей машине, пути для Windows, оболочка Bash или PowerShell.

```
cd E:\DSLKit-Project\.claude\worktrees\test-plans
npm ci
npm test
npm audit --omit=dev --audit-level=high
npm audit
node --test tools/server.test.js tools/render-api.test.js tools/ai-api.test.js
node testing-course/full/static-sec-perf.js
python testing-course/full/auth-e2e.py
```

Сервер и заголовки (Часть 1):

```
npm start
curl -sI http://localhost:5173/
curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "http://localhost:5173/..%2f..%2fpackage.json"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5173/index.html
curl -s -m 10 -X POST http://localhost:5173/api/validate -H "Content-Type: application/json" -d "null"
curl -s -m 10 -X PUT http://localhost:5173/api/render
```

Поиск опасных приёмов и секретов (значения не выводить):

```
git grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" -- site/js
git grep -lIE "(api[_-]?key|secret|passw)" -- . ":!package-lock.json"
git ls-files | grep -E "(^|/)\.env$"
```

Часть 2 (пример `lab-03-auth`, остальные работы в своих копиях):

```
cd E:\DSLKit-Project\.claude\worktrees\lab28\part-2\lab-03-auth
npm ci
npm test
npm audit --omit=dev --audit-level=high
seq 1 6 | xargs -I{} curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"user@example.test\",\"password\":\"wrong-{}\"}"
curl -s -i -X OPTIONS http://localhost:3000/diagrams -H "Origin: http://evil.test" -H "Access-Control-Request-Method: POST"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/diagrams -H "Authorization: Bearer not-a-token"
```

Ожидается 401 пять раз, затем 429. Docker (`lab-08-docker`, `.env` с тестовыми значениями):

```
cd E:\DSLKit-Project\.claude\worktrees\lab28\part-2\lab-08-docker
docker compose config --quiet
docker compose up --build -d
docker compose exec backend id
docker compose exec backend sh -c "touch /probe"
docker compose port db 5432
docker compose down
```

`docker compose down -v` и `prune` без решения владельца не запускать. Браузер (Chromium, DevTools): Console для нарушений CSP, Network для внешних хостов, Application для Local Storage, Cache Storage и Service Workers, перед прогоном Clear site data. Время разбора: скрипт Node вызывает `importDiagram` со строкой из 40 000 пробелов и замеряет время (порог 200 мс).

## 6. Артефакты

| Артефакт                  | Где                                                     | Содержание                                                    |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Отчёт о прогоне (RU и EN) | `docs/test-plans/`                                      | Дата, хеш коммита, платформа, результат по каждому пункту     |
| Реестр находок            | в отчёте, ID как в `80-break-report.md`                 | ID, область, серьёзность, шаги, факт, ожидание, файл и строка |
| Вывод `npm audit`         | приложение, без секретов                                | Пакеты и уровни по каждой работе                              |
| Скриншоты и логи консоли  | `docs/testing-kulikov/screens-*`                        | Нарушения CSP, заголовки, Cache Storage                       |
| Скрипты воспроизведения   | `testing-course/full/`, `docs/testing-kulikov/scripts/` | Сценарии Playwright и `curl`                                  |
| Реестр рисков             | `docs/testing-kulikov/10-test-plan.md`                  | Открытые P1 и P2 с владельцем решения                         |
