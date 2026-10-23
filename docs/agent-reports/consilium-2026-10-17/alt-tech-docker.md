# Консилиум 2026-10-17: ЛР6 MongoDB, ЛР7 WebSocket, ЛР8 Docker (взгляд строгого преподавателя)

Прочитано: условия ЛР6, ЛР7, ЛР8 (`materials/text/part-2/Модуль 03…`, `Модуль 05…`), `docs/notes/06`, `07`, `08`, код, `AUDIT.md`, `NOTES.md`, `README.md`, отчёты ЛР6 (`part-2\lab-06-mongodb`) и ЛР7 (`part-2\lab-07-websocket`). Ничего не запускалось и не менялось. Пометка **[не проверено]** значит: вывод сделан по чтению кода или чужого описания, без запуска.

Находка по ЛР8: в рабочей папке `part-2\lab-08-docker\` уже лежат `docker-compose.yml`, Dockerfile сервера и клиента, `nginx.conf`, README, отчёты, `docker.test.mjs`, 4 рисунка (файлы от 17.10, 11:45–11:52). Это работа, выполненная параллельно, я её не запускал и не оценивал как готовую. В таблице ЛР8 считаю «нет», но в графе «Есть ли уже» указываю, что замечено в этом каталоге. Обозначение пути в таблице: `L6` = `…\part2-mongo-work-6cc76b\part-2\lab-06-mongodb`, `L7` = `…\part2-ws-work-ee9b7b\part-2\lab-07-websocket`, `L8` = `…\lab28\part-2\lab-08-docker`.

## 1 Таблица придирок (по убыванию вероятности)

| № | Что мог бы попросить | Почему | Вероятность | Есть ли уже (путь) | Что сделать (1 строка) |
|---|---|---|---|---|---|
| 1 | ЛР8: `docker compose up --build` на его/чистой машине без ошибок и без Docker Hub | Главный критерий оценки; в РБ Hub режется | 95 % | L8 (замечено, не проверено мной): `REGISTRY=mirror.gcr.io/` в `.env` | Прогнать с нуля на «чистом» Docker (`docker system prune -a`), записать, какое зеркало сработало |
| 2 | ЛР8: открыть `http://localhost` и `http://localhost:5000` ровно как в условии | В Части 5 прямо написаны порты 80 и 5000 | 80 % | L8: порты 8080 и 3000 (`unprivileged` слушает 8080) | В README и отчёте объяснить отличие или опубликовать `80:8080`; про 5000 сказать, что сервер ЛР3 на 3000 |
| 3 | ЛР6: «покажи страницу 500 реальным сбоем, останови MongoDB» | Требование 16.10: реальный сбой, не кнопка | 80 % | `L6\src\app.js` (`requireDatabase` даёт 503 JSON), `L6\src\middleware\security.js` (500 при сбое записи в `requestlogs`) | Описать в README два сценария: стоп `mongod` даёт 503, а 500 даёт отказ записи журнала (например, `db.requestlogs.drop()` + validator или права); проверить оба руками |
| 4 | ЛР8: показать ограничение Docker Hub в РБ и меры доступа | Примечание: «в отчёте указать, какие меры были предприняты» | 80 % | L8\README.md («`REGISTRY`, проверена сборка через зеркало» **[не проверено]**) | В отчёт: конкретное зеркало, фрагмент `daemon.json`, вывод `docker pull`, что делать, если зеркало мертво (quay.io, GitLab Registry) |
| 5 | ЛР7: «история в MongoDB» (пункт Части 3 и вопрос 8) | История сейчас в памяти и пропадает при перезапуске | 75 % | `L7\src\history.js` (Map в памяти), `L7\AUDIT.md` («не сделано намеренно, интерфейс add/list готов») | Заготовить `history-mongo.js` на Mongoose (модель Message) и показать замену за 5 минут; ответ на вопрос 8 с полями |
| 6 | Любая ЛР: «вставь огромную строку/число» (мегабайт текста, `1e999`, 10 000 пробелов) | Его стиль, формулировка из задания | 75 % | `L6\src\middleware\validate.js`, `L6\limits.json`, `express.json({limit:'100kb'})`; `L7\src\validate.js` (`textMaxLength*2`), `maxHttpBufferSize` 10000, `maxlength` в `index.html` | Руками вставить 1 МБ в чат ЛР7: сокет закрывается движком без `ack`, клиент покажет «Connection lost»; сделать понятное сообщение или обрезку на клиенте |
| 7 | ЛР6: «добавь поле/запрос при мне» (например, `status`, сортировка `?sort=`, `PATCH`) | «Допиши код при тебе» | 75 % | `L6\src\models\diagram.js`, `L6\src\controllers\diagrams.controller.js`, `L6\src\routes\diagrams.routes.js` (есть `PUT`, нет `PATCH`, нет `sort`) | Отрепетировать (см. раздел 2, задания 1–4); подготовить шпаргалку, `docs\defense\` пока нет |
| 8 | ЛР6: пробельное значение во всех полях, тело `{}` , `null`, массив, `priority: 1.5`, `-1` | Требование «пробельные значения и лимиты» | 70 % | `L6\src\middleware\validate.js` (`isText` с `trim`, `Number.isInteger`), `L6\tests\hardening.test.js` | Прогнать список 12 негодных тел через `requests.http` и приложить рисунок `11-validation-error.png` для каждого вида |
| 9 | ЛР6: Atlas: дашборд кластера, URI в `.env`, данные в Compass/Atlas | Прямой пункт отчёта, 5 скриншотов | 70 % | `L6\figures\10-mongo-document.png` (Compass/Mongo), `L6\NOTES.md` («скриншоты Atlas нужны владельцу»), README: Atlas **не проверялся** | Создать M0, снять дашборд, URI с закрытым паролем, Data Explorer с вложенным `comments`; если Atlas недоступен, сказать про локальную установку (примечание условия) |
| 10 | ЛР8: `docker ps`, логи, `exec` внутрь контейнера, `docker compose down -v` | Типичные команды из вопросов 5, 10, 15 | 70 % | L8\figures\01-docker-ps.png | Отрепетировать: `docker compose logs -f backend`, `docker compose exec backend sh`, `docker compose down -v` и повторный запуск |
| 11 | Отчёт ЛР6: число тестов и рисунки не сходятся | Придирка к отчётам: «в отчёте 41, в README 54» | 65 % | `L6\report.md` (стр. «Всего 41 автоматический тест») против `L6\README.md` и `L6\NOTES.md` (54) | Пересобрать отчёт (`node tools/build.js part-2/lab-06-mongodb`), сверить числа и состав тестов |
| 12 | Отчёт ЛР8: ответы на контрольные 9, 10, 11 из 16? Нет: n−1, n, n+1 | В ЛР8 вопросов 16, вариант 26: 26 mod 16 = 10, значит 9, 10, 11 | 65 % | L8\report.md **[не проверено]** | Убедиться, что ответы только на 9 (зависимость запуска), 10 (команда в контейнере), 11 (проброс порта), по вопросу 14 (GitLab Registry) знать устно |
| 13 | ЛР8: «пересоздай БД, данные должны остаться» (вопрос 15) | Критерий: тома для БД | 65 % | L8\docker-compose.yml (`pgdata`), README: «данные пережили `restart db`» | Показать два сценария: `down` (данные есть) и `down -v` (данных нет) с рисунками |
| 14 | ЛР7: «покажи реальный сбой для страницы 500» | Та же логика, что в пункте 3 | 60 % | `L7\public\500.html`, `L7\src\app.js` (обработчик ошибок) | Описать в README, как вызвать (например, переименовать `public\404.html`/`index.html` и открыть страницу, или упавший `setup`) и проверить руками **[не проверено, какой сбой реален]** |
| 15 | ЛР8: покажи размер образа и как его уменьшил (вопрос 6, 3 способа) | Прямой вопрос | 60 % | L8\backend\Dockerfile (многоэтапная, alpine, `--omit=dev`, `.dockerignore`) | Снять `docker images` до/после (один этап и два), записать 3 способа: alpine, multi-stage, `.dockerignore`/`--omit=dev` |
| 16 | ЛР7: «отправь сообщение всем, кроме меня» и «в комнату» «живьём» | Вопросы 3, 4, 16 | 60 % | `L7\src\socket.js` (`socket.to(room).emit`, `io.to(room).emit`, `socket.broadcast.emit`) | Подготовить 3 строки в разных обработчиках и таблицу различий `socket.emit/io.emit/socket.broadcast.emit` |
| 17 | ЛР6: почему при остановленной базе 503, а не оформленная страница 500 | Чётный вариант: «не молчать, показать 500» | 55 % | `L6\AUDIT.md` («Не делалось: интерфейса нет, ответы JSON») | Подготовить ответ: API без HTML, 503 это 5xx с понятным текстом; при желании добавить `public/500.html` для `Accept: text/html` |
| 18 | ЛР6: объяснить `explain()` индекса, зачем `comments.author` и `tags` | Вопрос 9 в твоём наборе (9, 10, 11) | 55 % | `L6\src\models\diagram.js` (`index: true`, `diagramSchema.index({'comments.author':1})`) | Подготовить `db.diagrams.find({tags:'shop'}).explain('executionStats')` с `IXSCAN` и показать на Compass |
| 19 | ЛР7: неотправленное/длинное сообщение, 501 символ, пробелы, эмодзи, RTL | «Лимиты и пробельные значения» | 55 % | `L7\src\validate.js` (`cleanText`), `L7\tests\audit.test.js` | Руками вставить 501 символ (на клиенте не дадут из-за `maxlength`, использовать консоль `socket.emit`) |
| 20 | ЛР8: добавить второй доп. на месте (pgAdmin / Redis / том логов) | «Минимум одно, лучше несколько», может сказать «добавь pgadmin» | 55 % | L8\docker-compose.yml: нет `pgadmin`, нет `redis`, нет тома `/logs` | Заготовить сервис `pgadmin` (`dpage/pgadmin4`, порт 5050, сеть `internal`) и том `logs:/app/logs` в compose заранее |
| 21 | ЛР8: секреты в репозитории, `.env`, пароль БД | Требование «нет `.env` в репозитории» | 55 % | L8\.env (294 байта, есть на диске), L8\.env.example | Убедиться, что `.env` в `.gitignore` и не попал в коммит; в отчёте только пример без значений |
| 22 | Все: скриншоты с видимым URL, подписанные, без рамки | Придирка к отчёту, разд. «Отчёт» 06 | 55 % | `L6\figures\` (15 файлов, MANIFEST.md), `L7\figures\` (10 + svg), `L8\figures\` (4) | Сверить подписи и номера рисунков с текстом, убрать рамки, дописать URL в адресной строке |
| 23 | ЛР7: авторизация сокета токеном (вопрос 14) | Сейчас имя берётся из `auth.username` без проверки | 50 % | `L7\src\socket.js` (`io.use`), `L7\AUDIT.md` («не сделано: нет учётных записей») | Подготовить `io.use` с проверкой JWT из ЛР3 (`jsonwebtoken.verify`) как «допиши при мне» |
| 24 | ЛР7: reconnection и восстановление пропущенных сообщений (вопрос 12) | Просит оборвать сеть и показать | 50 % | `L7\public\client.js` (`connect` повторный вход в комнату, строки 162–174) | Показать DevTools offline → online; ответить про `connect`, `disconnect`, `connect_error`, Manager `reconnect_attempt`; знать `connectionStateRecovery` **[не проверено в этой версии 4.8]** |
| 25 | ЛР8: инструкция в Dockerfile отличается от условия (`node:18`, `EXPOSE 5000`, `--only=production`) | «Почему не как в методичке?» | 50 % | L8\backend\Dockerfile: `node:22-alpine`, 3000, `--omit=dev` | Готовый ответ: `--only=production` устарел, 18 вышел из поддержки; движок проекта `node>=22` |
| 26 | ЛР8: что случится, если БД поднимется позже сервера | Проверка `depends_on` + `service_healthy`, вопрос 9 | 50 % | L8\docker-compose.yml (`condition: service_healthy`) | Показать `docker compose up` с искусственной задержкой БД и повтор подключения |
| 27 | ЛР6: каскадное удаление, populate, статический и экземплярный методы (вопросы 10, 14, 15) | Живое «допиши»: «сделай коллекцию `Comment` и populate» | 45 % | `L6\src\models\diagram.js` (комментарии вложены, `populate` не нужен, AUDIT) | Подготовить заготовку: `ref`, `populate('diagramId')`, `pre('findOneAndDelete')`, `statics.byOwner` |
| 28 | ЛР6/ЛР7/ЛР8: `/health` и healthcheck | Нужен для Docker; в списке допов | 45 % | `L6\src\app.js`, `L7\src\app.js` (`/health` есть); `L8` healthcheck в Dockerfile **[не проверено]** | Проверить `curl /health` при упавшей базе (ЛР6 даёт 503), отразить в отчёте ЛР8 |
| 29 | ЛР7: лимит скорости и backpressure (вопросы 13, 15) | Вопрос 13 реализован, 15 нет | 40 % | `L7\src\rate-limit.js`, `eventRateMax` в `limits.json` | Ответ на 15: `volatile`, `socket.conn.writeBuffer.length`, `ack`-окно; показать флуд 50 сообщений и «Too many messages» |
| 30 | ЛР7/ЛР6: README на двух языках | Требование владельца «отчёты и README на двух языках» | 40 % | `L7\AUDIT.md`: «README только на русском»; у `L6` тоже только `README.md`; у `L8\README.en.md` есть | Добавить `README.en.md` в ЛР6 и ЛР7 (перевод, 1 час) |
| 31 | ЛР6: чистая остановка (`SIGINT`) и `unhandledRejection` | Допы из `07-possible-teacher-extras.md`: [~] | 40 % | `L6\server.js` (нет обработчиков); `L7\server.js` (есть `io.close`) | Добавить `mongoose.disconnect()` на `SIGINT`/`SIGTERM` в `L6\server.js` |
| 32 | ЛР8: `docker-compose up` (дефис) против `docker compose` | Условие пишет старый синтаксис, поле `version: '3.8'` | 40 % | L8\docker-compose.yml: без `version`, есть `name:` | Знать: v2 без дефиса, `version` устарел; показать, что команда из условия тоже работает, если стоит `docker-compose` |
| 33 | ЛР6: текстовый поиск, TTL, виртуальные поля, хуки | Прямо в `07`: «индексы, агрегация, populate, текстовый поиск, TTL, виртуальные поля, хуки» | 35 % | агрегация и индекс есть (`stats`, `comments.author`); виртуальное `id` в `toJSON`; TTL и text нет | Добавить text-индекс на `title` + `?q=` и TTL на `requestlogs.createdAt` (30 дней), оба по 10 строк |
| 34 | ЛР7: «приватное сообщение не по `socket.id`» (id меняется при переподключении) | Каверзный вопрос 9 | 35 % | `L7\src\socket.js` (`private:message` по `to`=socket.id, личное в историю не пишется) | Готовый ответ: id временный, постоянный адрес это комната `user:<name>`; показать `socket.join('user:'+name)` |
| 35 | ЛР8: масштабирование `--scale backend=3` (вопрос 16) | Прямой вопрос | 35 % | L8\README.md («не поддержано: один порт, лимитер в памяти») | Показать `--scale` на варианте без `ports` с Nginx upstream; знать ограничения |

## 2 Живое кодирование при защите (8 заданий «допиши при мне»)

1. **ЛР6: добавить поле `status` (enum `draft|review|done`) от схемы до фильтра.** Правки: `src\models\diagram.constants.js` (список `STATUSES`), `src\models\diagram.js` (поле с `enum`, `default: 'draft'`), `src\middleware\validate.js` (проверка в `diagramChecks`, добавить в `FILTERS` и текст сообщения), `src\controllers\diagrams.controller.js` (`listFilter`), затем `scripts\seed.js` и один тест. Ловушка: PUT перезаписывает поле, если его нет в теле, значение вернётся к умолчанию.
2. **ЛР6: сортировка и общее число в списке.** `?sort=title&order=desc`: белый список полей в `validateListQuery`, в `list` заменить `.sort({_id:1})` на объект; в ответ добавить заголовок `X-Total-Count` через `Diagram.countDocuments(filter)`. Ловушка: не пропускать произвольное имя поля (инъекция в `sort`).
3. **ЛР6: `PATCH /diagrams/:id`.** Новый `.patch(parseId, validatePartial, controller.update)` в `diagrams.routes.js`, валидатор проверяет только присланные ключи, `findByIdAndUpdate(id, {$set: fields}, {new:true, runValidators:true})`. Ловушка: пустой объект должен давать 400.
4. **ЛР6: счётчик комментариев и «последний комментарий» (операции с массивом).** `$push` с `$each` и `$slice: -100`, либо агрегация `$project: { n: { $size: '$comments' }, last: { $last: '$comments' } }`; ответить, чем `$pull` отличается от `$pop`.
5. **ЛР7: сохранить историю в MongoDB.** Создать `src\history-mongo.js` с Mongoose-моделью `Message {room, from, text, at}`, `add` через `create`, `list` через `find({room}).sort({at:-1}).limit(historyLimit)` и развернуть; в `socket.js` обработчики сделать `async` (сейчас `history.list` синхронный в `room:join`). Ловушка: интерфейс стал асинхронным, `ack` вызывать после `await`.
6. **ЛР7: событие «пользователь печатает» только для приватного чата или «прочитано».** Добавить `socket.on('read', ...)` с `ack`, `socket.to(room).emit('read', {id, by})`, на клиенте обработчик; показать разницу `emit` с `ack` и без.
7. **ЛР7: проверка токена при подключении.** В `io.use` читать `socket.handshake.auth.token`, `jwt.verify(token, process.env.JWT_SECRET)`, при ошибке `next(new Error('Unauthorized'))`; имя брать из `payload.email`; на клиенте `io({auth:{token}})`. Ловушка: ошибка рукопожатия приходит в `connect_error`, не в `disconnect`.
8. **ЛР8: добавить сервис в compose.** Либо `pgadmin` (`image: ${REGISTRY}dpage/pgadmin4`, переменные `PGADMIN_DEFAULT_EMAIL/PASSWORD`, сеть `internal`, порт `5050:80`), либо `redis:7-alpine` с `healthcheck: redis-cli ping`, либо том `logs:/app/logs`; затем `docker compose up -d --build` и показать `docker ps`. Ловушка: сервис в сети `internal: true` не получит порт хоста, `pgadmin` нужен в `public`.

## 3 ЛР8: подробный чек-лист

Источник: `17. Лабораторная работа №8…`. Вариант 26, ветка `28`, БД PostgreSQL (сервер ЛР3 на Sequelize, клиент ЛР5 на Vite/React 19). Состояние «замечено» относится к каталогу L8, **[не проверено]**.

### 3.1 Пункты условия (разд. 3 «Задачи» и 4 «Порядок»)

| Пункт условия | Что проверить / сделать | Замечено в L8 |
|---|---|---|
| Dockerfile Node.js/Express (backend) | Образ собирается, сервер слушает порт, не root | `backend\Dockerfile`, два этапа, `USER node` |
| Dockerfile React, многоэтапная сборка | `builder` (`npm ci`, `npm run build`) + `nginx` с `COPY --from=builder` | `frontend\Dockerfile`, `nginx-unprivileged` |
| `docker-compose.yml`: backend, frontend, БД | Три сервиса, связь по имени (`db`, `backend`), том БД | Да |
| `docker-compose up --build` | Запуск без ошибок за один шаг | Нужна проверка с нуля |
| Проверка: `http://localhost` | Фронтенд открывается на порту 80 (в условии) | 8080 вместо 80, объяснить |
| Проверка: `http://localhost:5000` | Сервер отвечает на 5000 (в условии) | 3000, объяснить |
| `docker ps` | Рисунок с healthy-статусами | `figures\01-docker-ps.png` |
| Доп. требование (минимум одно) | Выбрать несколько, см. 3.2 | Выбрано много |
| Ветка `28` | Имя ветки точно такое | Рабочая папка `lab28` (ветка не проверена) |
| Ссылка на репозиторий + инструкция запуска | README с командами и именем ветки | `README.md`, `README.en.md` |

### 3.2 Дополнительные требования (разд. 6), какие выбрать

| Допы из условия | Брать? | Как проверить |
|---|---|---|
| Переменные окружения, `.env` | Да, обязательно | `docker compose config` показывает подстановку; `.env` не в git |
| Healthcheck backend `/health` | Да | `docker inspect --format '{{.State.Health.Status}}' <id>` = `healthy` |
| Том для логов backend (`/logs`) | Да, дёшево | `docker volume ls`, файл переживает `restart backend` **[не сделано, в compose нет]** |
| pgAdmin / mongo-express | Желательно (преподаватель любит «веб-интерфейс БД») | Открыть `http://localhost:5050`, подключиться к `db` **[не сделано]** |
| Redis | Только если есть кэш; иначе пропустить (не уместно, в условии «если уместно») | Не брать без нужды |
| Изоляция сетей | Да | `docker network inspect`; с хоста порт БД не открыт; сервер и клиент в `public` |
| Reverse-proxy (Nginx) | Да | `curl localhost:8080/api/health` отвечает 200 через прокси |
| Healthcheck БД + `service_healthy` | Да | Остановить БД, сервер ждёт; в логах порядок запуска |
| Дополнительно (из `07`): multi-stage, `.dockerignore`, не root, размер образа, CI | По возможности | `docker images`, `docker top`/`docker exec id` показывает `node`, не `root` |

### 3.3 Отчёт (разд. 5) и критерии (разд. 9)

- Титульный лист, цель работы нумеруется «1 Цель работы», раздел «Заключение», не «Выводы» (правило 06; в условии стоит «Выводы», выбрать правило преподавателя).
- Теория контейнеризации кратко (образ, контейнер, слои, том, сеть, реестр).
- Листинги Dockerfile и compose: не более одной страницы кода в основном тексте, остальное в приложениях «Приложение А (обязательное) …».
- Рисунки: `docker ps`, браузер на `http://localhost…`, описание допов, с подписями «Рисунок N – …».
- Меры доступа к образам: зеркало или реестр, обязательно (разд. 8 условия).
- Ответы только на вопросы 9, 10, 11 (вариант 26 при 16 вопросах).
- Ссылка на ветку 28 и инструкция.

### 3.4 Проверка на машине без Docker Hub, зеркала

Docker 29.3.1 установлен и демон отвечает (`docker info` показал Server Version). Список `registry-mirrors` в `docker info` пуст, значит зеркала не настроены **[не проверено, что именно блокируется]**.

1. Вариант A, зеркало демона: в Docker Desktop, Settings, Docker Engine, добавить `"registry-mirrors": ["https://mirror.gcr.io", "https://dockerhub.timeweb.cloud"]`, Apply & restart. На Linux это `/etc/docker/daemon.json`, затем `systemctl restart docker`. Проверка: `docker info | findstr /i mirror`, затем `docker pull alpine`.
2. Вариант B, префикс образа (уже заложен в L8): в `.env` `REGISTRY=mirror.gcr.io/`, образы становятся `mirror.gcr.io/library/node:22-alpine`. Недостаток: `mirror.gcr.io` проксирует только образы Docker Hub под `library/`, а `nginxinc/nginx-unprivileged` и `dpage/pgadmin4` могут не найтись **[не проверено]**.
3. Вариант C, другие реестры (из условия): `quay.io` (postgres: `quay.io/…` **[имя репозитория не проверено]**), GitLab Container Registry `registry.gitlab.com/<группа>/<проект>/node:22-alpine` после `docker push` (вопрос 14: `docker login registry.gitlab.com`, `docker tag`, `docker push`).
4. Вариант D, офлайн: на машине с доступом `docker save -o images.tar node:22-alpine postgres:16-alpine nginxinc/nginx-unprivileged:1.27-alpine`, на целевой `docker load -i images.tar`. Хорошо как запасной план на защите.
5. Проверки на чистой машине: `docker system prune -a --volumes` (удалит всё, делать осознанно), `docker compose up --build`, `docker compose ps` (все `healthy`), `curl http://localhost:8080/api/health`, регистрация и вход в браузере, `docker compose restart db` (данные на месте), `docker compose down -v` (данных нет).
6. Что показать на защите без интернета: образы уже в кэше, сборка идёт; `npm ci` внутри Dockerfile требует доступ к npm registry (не Docker Hub). Если npm недоступен, сборка упадёт: подготовить `--mount=type=cache` или заранее собранный образ.

### 3.5 Вопросы, на которые стоит ответить устно сверх n−1, n, n+1

- 14 (опубликовать в альтернативный реестр), 16 (масштабирование), 6 (3 способа уменьшить образ), 13 (healthcheck), 12 (`.env` в Compose: автоматическая подстановка `${VAR}`, `env_file`).
