# Часть 2. Лабораторная работа 8. Контейнеризация приложения с Docker

English version: [README.en.md](README.en.md)

Проект DSLKit (SaaS, редактор диаграмм как кода), вариант 26. Ветка репозитория: **28** (от ветки 25). Условие: `materials/text/part-2/Модуль 05…/17. Лабораторная работа №8…`. Упаковываются сервер из `part-2/lab-03-auth`, клиент из `part-2/lab-05-react-api` и PostgreSQL. Код приложений не копируется: Compose берёт их папки как контекст сборки. Отчёты: [`report.tpl.md`](report.tpl.md) на русском, [`report.en.tpl.md`](report.en.tpl.md) на английском, собранные `report.md` и `report.en.md`.

## 1 Что сделано

| Требование условия                      | Реализация                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dockerfile сервера                      | `backend/Dockerfile`: два этапа, `npm ci --omit=dev`, пользователь `node`, healthcheck            |
| Dockerfile клиента, многоэтапная сборка | `frontend/Dockerfile`: этап `builder` (Vite), конечный образ `nginx-unprivileged`                 |
| docker-compose.yml: сервер, клиент, БД  | `docker-compose.yml`: `backend`, `frontend`, `db` (PostgreSQL 16), том `pgdata`                   |
| Переменные окружения                    | `.env` (не в репозитории), образец `.env.example` без значений, обязательные значения проверяются |
| Healthcheck сервера                     | маршрут `GET /health` в `lab-03-auth` (проверяет БД, 200 или 503, два теста)                      |
| Healthcheck БД и `service_healthy`      | `pg_isready`, сервер ждёт БД, клиент ждёт сервер                                                  |
| Изоляция сетей                          | сеть `internal` (`internal: true`: БД и сервер) и `public` (сервер и клиент)                      |
| Reverse proxy на Nginx                  | `frontend/nginx.conf`: статические файлы, возврат `index.html`, `/api/` на сервер                 |
| Запуск не от root, `.dockerignore`      | `USER node`, `nginx-unprivileged`, `cap_drop: ALL`, `read_only`, `Dockerfile.dockerignore`        |
| Доступ к образам в РБ                   | переменная `REGISTRY` (например `mirror.gcr.io/`), проверена сборка и загрузка через зеркало      |

## 2 Запуск

Нужен Docker с Compose v2. Значения секретов впишите сами, готовых в репозитории нет.

```bash
cd part-2/lab-08-docker
cp .env.example .env     # заполните POSTGRES_PASSWORD и JWT_SECRET, при желании ADMIN_EMAIL и ADMIN_PASSWORD
docker compose up --build
```

Порты из условия (80 и 5000): `FRONTEND_PORT=80`, `BACKEND_PORT=5000` в `.env`. Клиент: http://localhost:8080 (порт задаёт `FRONTEND_PORT`). Проверка сервера: http://localhost:8080/api/health и http://127.0.0.1:3000/health. Список контейнеров: `docker ps`. Остановка: `docker compose down`, с удалением данных базы: `docker compose down -v`.

Если Docker Hub недоступен, впишите в `.env` строку `REGISTRY=mirror.gcr.io/` (с косой чертой в конце) или адрес другого зеркала.

## 3 Решения и ограничения

- Клиент собирается с `VITE_API_URL=/api`, Nginx пересылает `/api/` на `backend:3000`. Запросы идут на один адрес, CORS не нужен.
- `NODE_ENV=production` не задан: в нём сервер требует TLS к базе, а база в сети Compose без TLS. Для облачной базы (Neon, Supabase) задайте `DATABASE_URL` и `DATABASE_SSL=true` и уберите сервис `db`.
- Пароль базы только из букв и цифр (он входит в адрес подключения).
- `TRUST_PROXY=1`: перед сервером ровно один прокси (Nginx), иначе ограничитель запросов видел бы адрес прокси.
- Порт базы на хост не публикуется, порт сервера привязан к `127.0.0.1`.
- Масштабирование `--scale backend=N` не поддержано: порт хоста один, а счётчики ограничителя запросов лежат в памяти экземпляра.

## 4 Проверки

```bash
npm test                 # 6 проверок файлов Docker (без демона) и проверка отчётов
npm run shots            # скриншоты рисунков 1–4 в figures/ (нужен запущенный стек, Chrome или Edge, npm ci в ../lab-05-react-api)
cd ../lab-03-auth && npm test   # 92 теста сервера, включая /health
```

Сборка и запуск проверены на Docker 29.3.1: все три контейнера получили статус healthy, регистрация, вход и работа со списком идут через Nginx, данные пережили `docker compose restart db`.
