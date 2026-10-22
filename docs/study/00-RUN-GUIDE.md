# Как запускать работы: терминал VS Code, PowerShell и кнопки VS Code

Один раз на компьютере: установить **Node.js 22 или новее** (https://nodejs.org, проверка `node -v`), **Git**, **VS Code**. Для ЛР6 нужна MongoDB (локально или Atlas), для ЛР8 нужен Docker Desktop. Пароли и ключи в репозиторий не вписывать, они живут в файле `.env` рядом с работой.

## 1 Как получить нужную работу (ветки)

Каждая работа лежит в своей ветке GitHub-репозитория `DSLKit-Project`. В ветке лежит папка `part-2/<работа>/`. Ветки более поздних работ содержат и ранние (например, в ветке `25` есть `lab-01` … `lab-05`).

| Работа | Ветка | Папка внутри `part-2/` |
| --- | --- | --- |
| ЛР1 Node.js | `lab21` | `lab-01-node-server` |
| ЛР2 Sequelize | `lab12` | `lab-02-sequelize` |
| ЛР3 Аутентификация | `23` | `lab-03-auth` |
| ЛР4 Состояние React | `24` | `lab-04-react-state` |
| ЛР5 React и сервер | `25` | `lab-05-react-api` (+ сервер `lab-03-auth`) |
| ЛР6 MongoDB | `26` | `lab-06-mongodb` |
| ЛР7 WebSocket | `27` | `lab-07-websocket` |
| ЛР8 Docker | `28` | `lab-08-docker` |
| ПЗ1 Middleware и EJS | `pz21` | `pz-01-middleware-ejs` |
| ПЗ2 REST API | `pz22` | `pz-02-rest-api` |
| ПЗ3 Маршрутизация | `pz23` | `pz-03-routing` |
| ПЗ4 Context и reducer | `pz24` | `pz-04-context-reducer` |

Первый раз (в терминале, где нужна папка для проектов):

```bash
git clone https://github.com/KsushaKhadzhinova/DSLKit-Project.git
cd DSLKit-Project
git switch 23
```

Переключиться на другую работу: `git switch 25` (перед этим закоммитить или убрать свои правки). Сайт Части 1 лежит в ветке `work/part1-finish` и пока не в `main`.

## 2 Три способа запуска одного и того же

### Способ A. Терминал внутри VS Code
1. Открыть папку проекта: меню **File → Open Folder…** → выбрать `DSLKit-Project`.
2. Открыть терминал: меню **Terminal → New Terminal** (или сочетание Ctrl+`).
3. Перейти в папку работы, например: `cd part-2/lab-03-auth`.
4. Первый запуск работы: `npm install` (создаёт `node_modules`, нужен интернет).
5. Создать файл настроек: `copy .env.example .env` (в PowerShell) или `cp .env.example .env` (в Git Bash), затем открыть `.env` в редакторе и заполнить пустые значения (см. `01-DATA-NEEDED.md`).
6. Запустить: команда из таблицы раздела 3.
7. Остановить сервер: в терминале Ctrl+C.

Профиль терминала меняется в выпадающем списке рядом с «+» в панели терминала (PowerShell, Command Prompt, Git Bash).

### Способ B. Windows PowerShell отдельно от VS Code
1. Пуск → набрать `PowerShell` → открыть.
2. `cd C:\путь\к\DSLKit-Project\part-2\lab-03-auth` (или правая кнопка по папке в проводнике → «Открыть в Терминале»).
3. Дальше те же команды. Различия PowerShell и Bash: копирование файла `Copy-Item .env.example .env`, переменная на одну команду `$env:PORT=3001; npm start`, вместо `export`, `cat` это `Get-Content`.
4. Если PowerShell пишет «выполнение сценариев отключено»: один раз выполнить `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` и подтвердить.

### Способ C. Кнопки VS Code без ввода команд
1. **NPM Scripts.** В левой панели Explorer внизу раздел **NPM SCRIPTS** (если его нет: File → Preferences → Settings → найти `npm.enableScriptExplorer` и включить). Раскрыть `package.json` нужной работы и нажать значок ▶ рядом со скриптом `start`, `dev` или `test`.
2. **Run and Debug.** Значок «жук с треугольником» в левой панели → «create a launch.json file» → выбрать Node.js. В файле `.vscode/launch.json` указать `"program": "${workspaceFolder}/part-2/lab-03-auth/server.js"` и `"envFile": "${workspaceFolder}/part-2/lab-03-auth/.env"`, затем кнопка ▶ (или F5). Остановка: красный квадрат.
3. **Запуск одного теста по кнопке.** Установить расширение «Vitest» (для React-работ) или использовать встроенный Test Explorer: значок колбы в левой панели, ▶ у нужного теста.
4. **Просмотр результата в браузере.** Для React-работ в терминале появится адрес вида `http://localhost:5175/`, на нём Ctrl+клик открывает браузер.
5. **Git без команд.** Значок «ветвление» (Source Control): кнопка с названием ветки внизу слева в строке состояния переключает ветку.

## 3 Команды по работам

Во всех серверных работах порт по умолчанию 3000 (меняется переменной `PORT`), для пробы проверить `http://localhost:3000/health` (где есть) или `http://localhost:3000/diagrams`. Фраза «тесты» значит `npm test` в папке работы.

| Работа | Подготовка (один раз) | Запуск | Адрес | Тесты |
| --- | --- | --- | --- | --- |
| ЛР1 | `cd part-2/lab-01-node-server`, `npm install` | `npm start` (или `npm run dev` с автоперезапуском) | http://localhost:3000 | `npm test` |
| ЛР2 | `cd part-2/lab-02-sequelize`, `npm install`, `npm run db:migrate`, `npm run db:seed` | `npm start` | http://localhost:3000 | `npm test` |
| ЛР3 | `cd part-2/lab-03-auth`, `npm install`, `.env` с `JWT_SECRET`, `npm run db:migrate`, `npm run db:seed` | `npm start` | http://localhost:3000 | `npm test` |
| ЛР4 | `cd part-2/lab-04-react-state`, `npm install` | `npm run dev` | http://localhost:5175 | `npm test` |
| ЛР5 | сервер как ЛР3; `cd part-2/lab-05-react-api`, `npm install`, `.env` из `.env.example` | в одном окне сервер ЛР3 `npm start`, в другом `npm run dev` | http://localhost:5178 | `npm test` в обеих папках |
| ЛР6 | `cd part-2/lab-06-mongodb`, `npm install`, `.env` с `MONGODB_URI`, `npm run seed` | `npm start` | http://localhost:3000 | `npm test` (база в памяти, свой Mongo не нужен) |
| ЛР7 | `cd part-2/lab-07-websocket`, `npm install` | `npm start` | http://localhost:3000 (открыть в двух вкладках) | `npm test` |
| ЛР8 | Docker Desktop запущен, `cd part-2/lab-08-docker`, `.env` из примера | `docker compose up --build` | см. README работы | `npm test` |
| ПЗ1 | `cd part-2/pz-01-middleware-ejs`, `npm install` | `npm start` | http://localhost:3000, форма `/add?auth=1` | `npm test` |
| ПЗ2 | `cd part-2/pz-02-rest-api`, `npm install` | `npm start` | http://localhost:3000/api | `npm test` |
| ПЗ3 | `cd part-2/pz-03-routing`, `npm install` | `npm run dev` | http://localhost:5176 | `npm test` |
| ПЗ4 | `cd part-2/pz-04-context-reducer`, `npm install` | `npm run dev` | http://localhost:5177 | `npm test` |
| Сайт Части 1 | ветка `work/part1-finish`, корень проекта, `npm install` | `npm start` | http://localhost:5173 | `npm test`, `npm run format:check` |

## 4 Как запустить только часть работы или один файл

- **Один файл тестов (серверные работы, `node --test`):** `node --test tests/negative.test.js`. Один тест по имени: `node --test --test-name-pattern="rate limit" tests/security.test.js`.
- **Один файл тестов (React, Vitest):** `npx vitest run src/App.test.jsx`, один тест: `npx vitest run -t "adds a diagram"`. Режим наблюдения: `npm run test:watch`.
- **Только проверка отчёта:** `node --test report.test.mjs`. Пересобрать отчёт из шаблона (из корня репозитория): `node tools/build.js part-2/lab-03-auth`.
- **Только сервер без клиента, или клиент без сервера:** серверы стартуют сами по себе (`npm start`), клиент ЛР5 без сервера покажет «Сервер недоступен», это нормальное состояние для рисунка с ошибкой.
- **Другой порт:** PowerShell `$env:PORT=3100; npm start`, Git Bash `PORT=3100 npm start`, CMD `set PORT=3100 && npm start`.
- **Другой файл базы SQLite:** `SQLITE_STORAGE=./other.sqlite` (в PowerShell `$env:SQLITE_STORAGE='./other.sqlite'`).
- **Одна сборка React без сервера разработки:** `npm run build` затем `npm run preview`.
- **Один запрос вручную:** `curl http://localhost:3000/diagrams` или файл `requests.http` в VS Code с расширением «REST Client» (кнопка «Send Request» над запросом), или импорт Postman-коллекции из папки работы.

## 5 Что делать, если не запускается

| Симптом | Причина | Что сделать |
| --- | --- | --- |
| `node: command not found` или версия меньше 22 | Node не установлен или старый | установить Node 22 LTS, перезапустить VS Code |
| `Cannot find module …` | нет `npm install` | выполнить `npm install` в папке работы |
| `EADDRINUSE: address already in use :::3000` | порт занят | остановить прошлый запуск (Ctrl+C) или взять другой `PORT` |
| `JWT_SECRET must be…` | пустой секрет в `.env` | вписать длинную случайную строку (см. `01-DATA-NEEDED.md`) |
| `SQLITE_ERROR: no such table` | не выполнены миграции | `npm run db:migrate` |
| `MongoServerSelectionError` | нет MongoDB по адресу из `.env` | запустить Mongo или вписать строку Atlas |
| Клиент ЛР5: «Сервер недоступен» | не запущен сервер ЛР3 или другой порт | запустить сервер, проверить `VITE_API_URL` и `CORS_ORIGIN` |
| `docker: error during connect` | Docker Desktop не запущен | запустить Docker Desktop |
| Скрипт не выполняется в PowerShell | политика выполнения | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
