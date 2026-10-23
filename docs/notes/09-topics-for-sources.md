# Темы по теории и практике: что делалось и где искать источники и правила

Список для поиска литературы и правил оформления. Для каждой темы указано, где она использована, что искать (ключевые слова, стандарты, официальная документация). Это перечень тем, а не готовых ссылок: источники нужно найти и проверить. Версии библиотек взяты из `package.json` работ.

## A Оформление отчётов и документов

| Тема                                                                           | Где использовано                        | Что искать                                                                                                             |
| ------------------------------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Структура пояснительной записки, титульный лист, «Цель работы», «Заключение»   | все отчёты, курсовой                    | СТП БГУИР 01-2024 (дипломное и курсовое проектирование), методические указания кафедры                                 |
| Оформление приложений: «Приложение А (обязательное) Название», ссылка в тексте | отчёты Части 2                          | ГОСТ 7.32 (отчёт о НИР), СТП БГУИР, правила нумерации приложений русскими буквами без Ё, З, Й, О, Ч, Ь, Ы, Ъ           |
| Нумерация и подписи рисунков и таблиц («Рисунок 1 – Название»)                 | отчёты                                  | СТП БГУИР, ГОСТ 2.105                                                                                                  |
| Кавычки-ёлочки, длинное тире, запрет точки с запятой в тексте                  | отчёты, проверка `tools/lint-report.js` | правила русской пунктуации и типографики, «Справочник издателя»                                                        |
| Список источников                                                              | курсовой, отчёты                        | ГОСТ 7.1 (библиографическая запись), ГОСТ 7.0.5 (ссылки), БГУИР: ГОСТ 7.1 в редакции для СТП                           |
| Контрольные вопросы n−1, n, n+1 по варианту                                    | отчёты Части 2                          | требования преподавателя (`06-teacher-requirements.md`)                                                                |
| Диаграммы в курсовом: Use Case, C4, ER, схема «Клиент–Сервер–БД»               | курсовой (не начат)                     | UML 2.5 (OMG), модель C4 (Саймон Браун), нотации ER (Чен, «воронья лапка»), ГОСТ 19.701 (схемы алгоритмов), ГОСТ 2.701 |
| Таблица контрольных примеров и руководство пользователя                        | курсовой                                | ГОСТ 19.505 (руководство оператора), ГОСТ 34.602 (ТЗ)                                                                  |

## B Часть 1: сайт (HTML, CSS, JavaScript)

| Тема                                                                       | Где использовано              | Что искать                                                                                                     |
| -------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Семантическая разметка HTML5                                               | `site/`                       | WHATWG HTML Living Standard, MDN «HTML elements reference», W3C Nu Validator                                   |
| Адаптивная вёрстка, медиазапросы, mobile first                             | `site/css`, ЛР4               | MDN «Responsive design», «Using media queries», CSS Media Queries Level 4                                      |
| Относительные единицы rem, плавный размер шрифта `clamp()`                 | корневой размер сайта         | MDN `clamp()`, CSS Values and Units, статьи о fluid typography                                                 |
| Золотое сечение 1 : 1,618 в раскладке                                      | замер `audit-geometry.mjs`    | литература по композиции и модульным сеткам, «Grid systems» Мюллер-Брокман                                     |
| Токены дизайна, CSS custom properties                                      | `site/css`                    | MDN «Using CSS custom properties», Design Tokens Community Group                                               |
| Тёмная тема, `prefers-color-scheme`, переключатель                         | сайт и все приложения Части 2 | MDN `prefers-color-scheme`, `color-scheme`, web.dev «Dark mode»                                                |
| Размер цели касания 44 px, шрифт не мельче 14 px                           | правила интерфейса            | WCAG 2.2: критерии 2.5.5 (Target Size Enhanced) и 2.5.8 (Target Size Minimum), Apple HIG 44 pt, Material 48 dp |
| Контраст текста                                                            | `tools/contrast.js`           | WCAG 2.2 критерии 1.4.3 и 1.4.6, формула относительной яркости                                                 |
| Доступность: подписи полей, ссылка пропуска навигации, фокус, `aria-label` | сайт, редактор, приложения    | WCAG 2.2, WAI-ARIA Authoring Practices, ARIA in HTML                                                           |
| Подсказки на иконках (`data-tip`), иконки только понятные                  | редактор                      | Nielsen Norman Group о значках, закон Хика, принцип «узнавание лучше запоминания»                              |
| Одна главная кнопка на экран, меню вместо лишних кнопок                    | редактор                      | десять эвристик Нильсена, прогрессивное раскрытие, закон Фиттса                                                |
| Шрифт Inter, один гарнитурный ряд                                          | сайт                          | документация шрифта Inter, правила типографской шкалы                                                          |
| SEO: canonical, hreflang, sitemap, Open Graph, JSON-LD                     | `site/`                       | Google Search Central, schema.org, Rich Results Test                                                           |
| Многоязычность RU и EN                                                     | сайт, редактор                | атрибут `lang`, `hreflang`, рекомендации W3C по интернационализации                                            |
| Модули JavaScript, работа с `fetch`, `localStorage`                        | `site/js`                     | MDN «JavaScript modules», «Fetch API», «Web Storage API»                                                       |
| Диаграммы как код, сервис Kroki                                            | редактор                      | документация Kroki, PlantUML, Mermaid, нотация DSL                                                             |
| Тестирование: `node:test`, покрытие 100 %                                  | `labs/**/*.test.js`, `tools/` | документация Node.js «Test runner», «Code coverage»                                                            |
| Форматирование и линтинг                                                   | `npm run format:check`        | документация Prettier, ESLint                                                                                  |
| Кросс-браузерная проверка                                                  | запланирована                 | MDN «Cross browser testing», Can I use                                                                         |

## C Серверная разработка: Node.js и Express (ЛР1–ЛР3, ПЗ1, ПЗ2)

| Тема                                                                                                                   | Где использовано               | Что искать                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Платформа Node.js, event loop, модули CommonJS и ESM                                                                   | все серверные работы           | документация Node.js 22, «Event loop, timers, nextTick»                                                             |
| Express 5: маршруты, `Router`, middleware, порядок выполнения                                                          | ЛР1–ЛР3, ПЗ1, ПЗ2              | expressjs.com «Routing», «Using middleware», «Migrating to Express 5» (Promise в обработчиках)                      |
| Глобальная обработка ошибок, четыре параметра, `routeNotFound`                                                         | все серверные                  | expressjs.com «Error handling»                                                                                      |
| Протокол HTTP: методы, идемпотентность, безопасные методы                                                              | REST API                       | RFC 9110 (HTTP Semantics), MDN «HTTP request methods»                                                               |
| Коды состояния: 200, 201, 204, 400, 401, 403, 404, 405, 409, 413, 415, 429, 500, 503                                   | все API                        | RFC 9110 раздел 15, MDN «HTTP response status codes», RFC 6585 (429)                                                |
| Заголовки `Location`, `Allow`, `Retry-After`, `Content-Type`, `Vary`                                                   | создание, 405, ограничитель    | RFC 9110, RFC 9111 (кэширование)                                                                                    |
| REST: ресурсы, именование URL, принципы                                                                                | ПЗ2, ЛР1                       | диссертация Роя Филдинга (глава 5), «RESTful Web APIs», Microsoft «REST API design», Google API Design Guide        |
| PUT и PATCH, частичное обновление                                                                                      | ЛР1, ПЗ2                       | RFC 5789 (PATCH), RFC 7396 (JSON Merge Patch)                                                                       |
| Пагинация, сортировка, фильтры списка (`limit`, `offset`, `sort`, `order`, `X-Total-Count`)                            | ЛР1–ЛР3, ПЗ2                   | Microsoft «API design: pagination», JSON:API (параметры `page`, `sort`), RFC 8288 (Link), сравнение offset и cursor |
| Единый формат ошибки                                                                                                   | все API                        | RFC 9457 (Problem Details for HTTP APIs), JSON:API errors                                                           |
| Проверка входных данных, белые списки, ограничения длины                                                               | все API, `limits.json`         | OWASP Input Validation Cheat Sheet, OWASP API Security Top 10 (API4, API8)                                          |
| Размер тела запроса, 413, защита от огромного ввода                                                                    | `express.json({ limit })`      | документация body-parser, OWASP «Denial of Service»                                                                 |
| Заголовки безопасности: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control: no-store` | серверы                        | OWASP Secure Headers Project, MDN «HTTP Headers», документация Helmet                                               |
| Ограничитель запросов (rate limit), блокировка перебора пароля                                                         | ЛР3, ПЗ1, ПЗ2                  | OWASP «Blocking Brute Force Attacks», RFC 6585, алгоритмы «окно» и «токен-бакет»                                    |
| CORS: `Origin`, `Vary: Origin`, preflight 204, запрет `*`                                                              | ЛР3 (для ЛР5)                  | MDN «CORS», спецификация Fetch Standard (CORS protocol), OWASP «CORS misconfiguration»                              |
| Прокси и `trust proxy`, `X-Forwarded-For`                                                                              | ЛР3, ЛР8                       | expressjs.com «Behind proxies», RFC 7239 (Forwarded)                                                                |
| Шаблонизатор EJS, частичные шаблоны, экранирование `<%= %>`                                                            | ПЗ1                            | документация EJS, OWASP XSS Prevention Cheat Sheet                                                                  |
| CSRF: токен, проверка заголовка, `SameSite`                                                                            | ПЗ1, ПЗ2                       | OWASP CSRF Prevention Cheat Sheet, MDN `SameSite`                                                                   |
| Журнал запросов в таблицу БД (чётный вариант)                                                                          | ЛР2, ЛР3, ЛР6, ПЗ1             | требования преподавателя, форматы логов, OWASP Logging Cheat Sheet                                                  |
| Страница 500 при реальном сбое                                                                                         | ПЗ1, ЛР6                       | паттерн «graceful degradation», обработка `uncaughtException` и `unhandledRejection` в Node.js                      |
| Конечная точка `/health`, проверка живости и готовности                                                                | ЛР1–ЛР3, ЛР6, ЛР7, ПЗ2, Docker | Kubernetes «Liveness, readiness probes», шаблон Health Check API                                                    |
| Документирование API: `API.md`, OpenAPI, Swagger UI, Postman                                                           | ПЗ2, `requests.http`           | спецификация OpenAPI 3.1, документация Postman (формат Collection v2.1), расширение REST Client                     |
| Тестирование HTTP API: `node:test`, реальные запросы на свободном порту                                                | все серверные                  | документация Node.js test runner, «Testing Node.js applications»                                                    |
| Плавная остановка сервера, сигналы SIGINT и SIGTERM                                                                    | запланировано                  | документация Node.js «process signal events», 12-factor «Disposability»                                             |

## D Базы данных: SQL, ORM, NoSQL (ЛР2, ЛР3, ЛР6)

| Тема                                                                                             | Где использовано             | Что искать                                                                   |
| ------------------------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------- |
| Реляционная модель, нормализация, ключи, связи 1:N и N:M                                         | ЛР2, ЛР3, курсовой           | Дейт «Введение в системы баз данных», ER-моделирование                       |
| PostgreSQL: установка, пользователи, строка подключения                                          | ЛР2, ЛР3, ЛР8                | документация PostgreSQL 16, «libpq connection strings», Neon и Supabase docs |
| SQLite для локальной работы и тестов                                                             | ЛР2, ЛР3                     | документация SQLite, различия диалектов в Sequelize                          |
| ORM Sequelize 6: модели, `findAll`, `findByPk`, `findAndCountAll`, `create`, `update`, `destroy` | ЛР2, ЛР3                     | sequelize.org «Model basics», «Model querying»                               |
| Миграции, откат, сиды (`sequelize-cli`), идемпотентный сид                                       | ЛР2, ЛР3, ЛР8                | sequelize.org «Migrations», документация sequelize-cli                       |
| Ограничения CHECK, внешние ключи, `RESTRICT` и каскад                                            | ЛР2, ЛР3                     | документация PostgreSQL «Constraints», SQL:2016                              |
| SQL-инъекции, параметризованные запросы                                                          | поиск `?search=`, сортировка | OWASP SQL Injection Prevention Cheat Sheet                                   |
| TLS к базе: `DATABASE_SSL`, проверка сертификата, центр сертификации                             | ЛР2, ЛР3                     | документация `pg` «SSL», PostgreSQL «SSL support», сервисы Neon и Supabase   |
| Транзакции и изоляция                                                                            | запланировано                | документация PostgreSQL «Transaction isolation», Sequelize «Transactions»    |
| MongoDB: документная модель, коллекции, вложенные документы и массивы                            | ЛР6                          | docs.mongodb.com «Data modeling», сравнение SQL и NoSQL                      |
| Mongoose 8: схема, валидаторы, `findByIdAndUpdate`, операторы `$push`, `$pull`, позиционный `$`  | ЛР6                          | mongoosejs.com «Schemas», «Subdocuments», MongoDB «Update operators»         |
| Агрегация, индексы, текстовый поиск, TTL                                                         | ЛР6                          | MongoDB «Aggregation pipeline», «Indexes»                                    |
| Atlas и локальная Mongo, строка подключения `mongodb+srv`                                        | ЛР6                          | документация MongoDB Atlas, MongoDB Compass                                  |
| NoSQL-инъекции, операторы в JSON                                                                 | ЛР6                          | OWASP NoSQL Injection, `express-mongo-sanitize`                              |

## E Аутентификация и безопасность (ЛР3, курсовой)

| Тема                                                           | Где использовано | Что искать                                                                                                               |
| -------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Хеширование паролей: bcrypt, стоимость, предел 72 байта        | ЛР3              | OWASP Password Storage Cheat Sheet, статья «A Future-Adaptable Password Scheme» (Provos, Mazières), сравнение с Argon2id |
| JWT: структура, подпись, `exp`, секрет не короче 32 символов   | ЛР3, ЛР5         | RFC 7519 (JWT), RFC 8725 (JWT Best Current Practices), jwt.io                                                            |
| Middleware проверки токена, `Authorization: Bearer`            | ЛР3              | RFC 6750 (Bearer Token Usage)                                                                                            |
| Роли (RBAC), админ-маршруты, права владельца                   | ЛР3              | NIST RBAC, OWASP Authorization Cheat Sheet, API1 BOLA                                                                    |
| Блокировка после неудачных попыток, равное сообщение об ошибке | ЛР3              | OWASP Authentication Cheat Sheet                                                                                         |
| Хранение токена в `localStorage`, риски XSS                    | ЛР5              | OWASP HTML5 Security Cheat Sheet, сравнение с `HttpOnly`-куки                                                            |
| Хранение секретов в `.env`, 12-factor                          | все работы, ЛР8  | 12factor.net «Config», документация `process.loadEnvFile`                                                                |
| OWASP Top 10 и API Security Top 10                             | аудит всех работ | owasp.org Top 10 (2021), API Security Top 10 (2023), ASVS                                                                |

## F Клиентская разработка: React (ЛР4, ЛР5, ПЗ3, ПЗ4)

| Тема                                                                                                      | Где использовано   | Что искать                                                                          |
| --------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| React 19: компоненты, JSX, состояние, эффекты                                                             | ЛР4, ЛР5, ПЗ3, ПЗ4 | react.dev «Learn», «You Might Not Need an Effect»                                   |
| `useState`, `useEffect`, зависимости, очистка эффекта                                                     | ЛР4, ЛР5           | react.dev справочник хуков                                                          |
| Сохранение в `localStorage`, отложенное сохранение (debounce)                                             | ЛР4, ПЗ4           | MDN «Web Storage API», паттерн debounce                                             |
| Vite: сборка, переменные `VITE_*`, прокси                                                                 | все клиенты, ЛР8   | vite.dev «Env Variables and Modes», «Building for Production»                       |
| axios: экземпляр, перехватчики, тайм-аут, отмена `AbortController`                                        | ЛР5                | документация axios, MDN `AbortController`                                           |
| Оптимистичное обновление и откат, временный идентификатор                                                 | ЛР5                | документация TanStack Query «Optimistic Updates» (как описание паттерна)            |
| Состояния загрузки, ошибки, повтор запроса                                                                | ЛР5                | паттерны UX «loading, empty, error», Nielsen «Response times»                       |
| Debounce и поиск на сервере                                                                               | ЛР5                | MDN, статьи о debounce и throttle                                                   |
| React Router 6/7: `Routes`, `Route`, `NavLink`, `Outlet`, `useParams`, `useNavigate`, защищённые маршруты | ПЗ3                | reactrouter.com «Main Concepts», «Protected routes»                                 |
| Context API, `useReducer`, prop drilling, оптимизация перерисовок (`memo`, `useMemo`)                     | ПЗ4                | react.dev «Passing Data Deeply with Context», «Scaling Up with Reducer and Context» |
| Границы ошибок `ErrorBoundary`                                                                            | ЛР4, ЛР5, ПЗ4      | react.dev `componentDidCatch`, «Error boundaries»                                   |
| Тестирование: Vitest, React Testing Library, jsdom                                                        | все клиенты        | vitest.dev, testing-library.com «Guiding Principles»                                |
| Безопасность React: экранирование, отказ от `dangerouslySetInnerHTML`                                     | ЛР5                | react.dev «Escaping», OWASP XSS Prevention                                          |
| Единый интерфейс с Частью 1                                                                               | все клиенты        | дизайн-система проекта, `site/css`                                                  |

## G Реальное время (ЛР7)

| Тема                                                                             | Где использовано | Что искать                                                  |
| -------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| Протокол WebSocket, рукопожатие, кадры                                           | ЛР7              | RFC 6455, MDN «WebSocket API»                               |
| Socket.IO 4: события, комнаты, пространства имён, подтверждения, переподключение | ЛР7              | socket.io «Server API», «Rooms», «Client API»               |
| Отличия от long polling и Server-Sent Events                                     | ЛР7, отчёт       | MDN «Server-sent events», сравнение технологий              |
| Проверка источника (`Origin`), ограничение размера сообщения, ограничитель       | ЛР7              | OWASP WebSocket Security, документация Socket.IO «Security» |
| Присутствие (кто онлайн), индикатор набора текста                                | ЛР7              | паттерны презентационных статусов в чатах                   |

## H Контейнеризация и развёртывание (ЛР8)

| Тема                                                                                                 | Где использовано | Что искать                                                                               |
| ---------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| Образ, контейнер, слои, кэш сборки                                                                   | ЛР8              | docs.docker.com «Docker overview», «Build cache»                                         |
| Dockerfile: `FROM`, `WORKDIR`, `COPY`, `RUN`, `CMD`, `HEALTHCHECK`, `USER`, `ARG`                    | ЛР8              | docs.docker.com «Dockerfile reference», «Best practices»                                 |
| Многоэтапная сборка                                                                                  | клиент, сервер   | docs.docker.com «Multi-stage builds»                                                     |
| `.dockerignore`, `Dockerfile.dockerignore`                                                           | ЛР8              | docs.docker.com «.dockerignore file»                                                     |
| Docker Compose: сервисы, сети, тома, `depends_on` с `service_healthy`, `additional_contexts`, `name` | ЛР8              | docs.docker.com «Compose file reference» (спецификация Compose, поле `version` устарело) |
| Тома для базы данных                                                                                 | ЛР8              | docs.docker.com «Volumes»                                                                |
| Внутренняя сеть `internal: true`, изоляция                                                           | ЛР8              | docs.docker.com «Networking in Compose»                                                  |
| Переменные окружения и `.env`, подстановка `${VAR:?}`                                                | ЛР8              | docs.docker.com «Environment variables in Compose»                                       |
| Nginx: статические файлы, `try_files`, обратный прокси, `nginx-unprivileged`                         | ЛР8              | nginx.org «ngx_http_proxy_module», образ `nginxinc/nginx-unprivileged`                   |
| Запуск не от root, `cap_drop`, `read_only`, `no-new-privileges`                                      | ЛР8              | docs.docker.com «Security», CIS Docker Benchmark, OWASP Docker Security Cheat Sheet      |
| Размер образа, Alpine и musl, готовые бинарные модули                                                | ЛР8              | документация Alpine, prebuilt bcrypt и sqlite3                                           |
| Зеркала реестра для Беларуси: `mirror.gcr.io`, GitLab Container Registry, `registry-mirrors`         | ЛР8              | документация Docker «Registry mirror», `daemon.json`, GitLab Container Registry          |
| pgAdmin и mongo-express (не сделано)                                                                 | ЛР8 допы         | официальные образы pgAdmin и mongo-express                                               |
| Деплой: Render, Neon, переменные окружения                                                           | запланировано    | документация Render, Neon                                                                |

## I Качество, процесс и инструменты

| Тема                                                                              | Где использовано           | Что искать                                                    |
| --------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| Git: ветки по условию, Conventional Commits, `git worktree`                       | весь репозиторий           | git-scm.com, conventionalcommits.org                          |
| Тестовая пирамида, покрытие кода, смысл 100 %                                     | все работы                 | Фаулер «Test pyramid», документация coverage Node.js и v8     |
| Аудит «как преподаватель»: чек-листы, граничные значения, огромные числа и строки | все работы                 | техника граничных значений (ISTQB), OWASP Testing Guide       |
| Генерация Postman из `requests.http`                                              | `tools/http-to-postman.js` | спецификация Postman Collection v2.1.0                        |
| Скриншоты в Chrome (puppeteer-core)                                               | отчёты                     | документация Puppeteer                                        |
| Экспертная оценка работы                                                            | оценки процентов           | это экспертная симуляция, не заменяет проверку преподавателем |

## Что я не проверял по первоисточникам

- Точный текст СТП БГУИР и ГОСТ: правила оформления взяты из требований преподавателя и условий работ. Нужен актуальный документ кафедры.
- Версии библиотек (Express 5.1, React 19.3, Vite 8, Vitest 5, Sequelize 6.37, Mongoose 8.19, Socket.IO 4.8) заданы в `package.json`. Документацию читать под эти версии.
- Утверждения о стандартах в этом списке даны по памяти как направления поиска. Номера RFC, критериев WCAG и ГОСТ сверить с первоисточником.
