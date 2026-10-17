# Part 2. Laboratory Work 8. Containerization with Docker

Русская версия: [README.md](README.md)

DSLKit project (SaaS, diagrams-as-code editor), variant 26. Repository branch: **28** (from branch 25). The task: `materials/text/part-2/Модуль 05…/17. Лабораторная работа №8…`. The packaged parts are the server from `part-2/lab-03-auth`, the client from `part-2/lab-05-react-api` and PostgreSQL. The application code is not copied: Compose uses their folders as the build context. Reports: [`report.tpl.md`](report.tpl.md) in Russian, [`report.en.tpl.md`](report.en.tpl.md) in English, built into `report.md` and `report.en.md`.

## 1 What is done

| Task requirement                       | Implementation                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Server Dockerfile                      | `backend/Dockerfile`: two stages, `npm ci --omit=dev`, `node` user, healthcheck               |
| Client Dockerfile, multi-stage build   | `frontend/Dockerfile`: `builder` stage (Vite), final image `nginx-unprivileged`               |
| docker-compose.yml: server, client, DB | `docker-compose.yml`: `backend`, `frontend`, `db` (PostgreSQL 16), volume `pgdata`            |
| Environment variables                  | `.env` (not committed), sample `.env.example` without values, required values are checked     |
| Server healthcheck                     | `GET /health` in `lab-03-auth` (checks the DB, 200 or 503, two tests)                         |
| DB healthcheck and `service_healthy`   | `pg_isready`, the server waits for the DB, the client waits for the server                    |
| Network isolation                      | `internal` network (`internal: true`: DB and server) and `public` (server and client)         |
| Nginx reverse proxy                    | `frontend/nginx.conf`: static files, `index.html` fallback, `/api/` to the server             |
| Non-root run, `.dockerignore`          | `USER node`, `nginx-unprivileged`, `cap_drop: ALL`, `read_only`, `Dockerfile.dockerignore`    |
| Image access in Belarus                | `REGISTRY` variable (for example `mirror.gcr.io/`), build and pull through the mirror checked |

## 2 Run

Docker with Compose v2 is needed. Put the secret values in yourself, the repository has no ready ones.

```bash
cd part-2/lab-08-docker
cp .env.example .env     # fill in POSTGRES_PASSWORD and JWT_SECRET, optionally ADMIN_EMAIL and ADMIN_PASSWORD
docker compose up --build
```

Client: http://localhost:8080 (the port is set by `FRONTEND_PORT`). Server checks: http://localhost:8080/api/health and http://127.0.0.1:3000/health. Containers: `docker ps`. Stop: `docker compose down`, and with the database data removed: `docker compose down -v`.

If Docker Hub is unavailable, put `REGISTRY=mirror.gcr.io/` (with the trailing slash) or another mirror address into `.env`.

## 3 Decisions and limits

- The client is built with `VITE_API_URL=/api` and Nginx forwards `/api/` to `backend:3000`. Requests go to one origin, so CORS is not needed.
- `NODE_ENV=production` is not set: the server then requires TLS to the database and the database in the Compose network has none. For a cloud database (Neon, Supabase) set `DATABASE_URL` and `DATABASE_SSL=true` and remove the `db` service.
- The database password uses letters and digits only (it goes into the connection URL).
- `TRUST_PROXY=1`: exactly one proxy (Nginx) stands in front of the server, otherwise the rate limiter would see the proxy address.
- The database port is not published to the host and the server port is bound to `127.0.0.1`.
- Scaling with `--scale backend=N` is not supported: there is one host port and the rate limiter counters live in the memory of an instance.

## 4 Checks

```bash
npm test                 # 6 checks of the Docker files (no daemon needed) and the report checks
npm run shots            # screenshots of figures 1–4 in figures/ (needs the running stack, Chrome or Edge, npm ci in ../lab-05-react-api)
cd ../lab-03-auth && npm test   # 92 server tests, including /health
```

Build and start were checked on Docker 29.3.1: all three containers became healthy, registration, login and the list work through Nginx and the data survived `docker compose restart db`.
