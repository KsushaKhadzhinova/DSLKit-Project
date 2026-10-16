# Лабораторная работа №6. Интеграция с NoSQL базой данных MongoDB

## 1 Цель работы

Освоить работу с документной базой данных MongoDB: подключение, описание схем и моделей через ODM Mongoose, CRUD-операции в маршрутах Express и вложенные структуры документа. Работа выполнена для проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS. Это альтернативная реализация хранения коллекции `diagrams` из лабораторной работы 2: тот же REST API, но вместо таблицы реляционной базы используется коллекция MongoDB. Код лежит в ветке репозитория `26`.

## 2 Краткие теоретические сведения

**Документная модель.** MongoDB хранит данные в коллекциях, а коллекция состоит из документов в формате BSON, двоичном расширении JSON. У каждого документа есть уникальное поле `_id`, по умолчанию это `ObjectId` длиной 12 байт: время создания, случайное значение и счётчик. Документ может содержать вложенные объекты и массивы, поэтому данные, которые в реляционной базе разнесены по нескольким таблицам, хранятся вместе и читаются одним запросом.

**Mongoose.** ODM Mongoose добавляет к MongoDB схему и модель. Схема описывает поля, их типы, обязательность, допустимые значения и индексы, а модель даёт методы `find`, `findById`, `create`, `findByIdAndUpdate` и `findByIdAndDelete`. Схема проверяется в приложении, сама MongoDB структуру документов не навязывает.

Таблица 1 – Сравнение реляционной и документной баз данных

| Признак             | Реляционная (PostgreSQL)                         | Документная (MongoDB)                                  |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Единица хранения    | Строка таблицы                                   | Документ BSON в коллекции                              |
| Схема               | Жёсткая, меняется миграциями                     | Гибкая, правила задаёт код приложения                  |
| Связанные данные    | Отдельные таблицы и соединения `JOIN`            | Вложенные документы и массивы или ссылки и `populate`  |
| Идентификатор       | Целое число или UUID                             | `ObjectId`                                             |
| Транзакции и связи  | Внешние ключи, строгие транзакции                | Атомарность в пределах одного документа                |
| Масштабирование     | Обычно вертикальное                              | Горизонтальное через шардирование                      |

Недостаток документной модели в дублировании данных и в слабых связях между коллекциями: каскадного удаления и внешних ключей нет, их приходится обеспечивать кодом. Преимущество в скорости чтения целого объекта и в простоте изменения структуры.

## 3 Ход работы

### 3.1 Подключение к базе данных

Адрес базы берётся из переменной окружения `MONGODB_URI`. Её читает пакет `dotenv` из файла `.env`, а образец `.env.example` лежит в репозитории, поэтому пароль к кластеру не попадает в систему контроля версий. Один и тот же код работает с локальной установкой MongoDB Community и с кластером MongoDB Atlas, меняется только строка подключения. Функция `connect` в файле `src/db.js` вызывает `mongoose.connect`, а `server.js` запускает сервер только после успешного подключения, иначе печатает причину и завершает процесс с кодом 1. Подключение к Atlas в этой работе не проверялось, запуск проверен на локальном `mongod` версии 8.2, а тесты работают на временной базе.

### 3.2 Схема и модель

Схема `Diagram` описана в `src/models/diagram.js`. Основные поля те же, что в лабораторных работах 1 и 2: `title`, `notation`, `sourceCode`, `priority` и `owner`. Допустимые значения `notation` заданы через `enum`, а `priority` это целое число от 0 до 2 со значением по умолчанию 1. Обязательные строки не принимают пустые и пробельные значения, длины строк, число тегов и число комментариев ограничены. Все пределы лежат в отдельном файле `limits.json`, который читают и схема, и проверка запросов, поэтому изменить предел можно без правки кода. Для нужд документной модели добавлены два вложенных поля: массив строк `tags` и массив вложенных документов `comments` с полями `author`, `text` и `createdAt`. Комментарий хранится внутри диаграммы, отдельной коллекции и соединений для него нет. Mongoose сам добавляет `_id` диаграммы и каждого комментария, а параметр `timestamps` ведёт `createdAt` и `updatedAt`. Для ускорения поиска объявлены индексы по `owner` и `tags`, а для ответов настроено преобразование в JSON: поле `_id` заменено на `id`, служебное `__v` скрыто.

Таблица 2 – Сопоставление таблиц реляционной версии и документа MongoDB

| Реляционная версия (ЛР 2)                       | Документная версия (ЛР 6)                         |
| ----------------------------------------------- | ------------------------------------------------- |
| Таблица `Diagrams`, строка на диаграмму         | Коллекция `diagrams`, документ на диаграмму       |
| Теги пришлось бы вынести в таблицы `Tags` и связь | Массив `tags` внутри документа                    |
| Комментарии в таблице `Comments` с внешним ключом | Массив `comments` внутри документа                |
| Чтение диаграммы с комментариями через `JOIN`   | Один запрос `findById`                            |
| Удаление комментариев каскадом по внешнему ключу | Удаляются вместе с документом                     |

### 3.3 CRUD через Mongoose

Контроллеры получают модель параметром и вызывают методы Mongoose, как показано в таблице 3. Метод `findByIdAndUpdate` вызывается с параметрами `new: true` и `runValidators: true`: клиент получает обновлённый документ, а проверки схемы срабатывают и при обновлении. Идентификатор в адресе проверяется до обращения к базе: допустима строка из 24 шестнадцатеричных символов, иначе ответ 400. Неизвестный, но корректный идентификатор даёт 404. Ошибки `ValidationError` и `CastError` от Mongoose обработчик ошибок переводит в ответ 400, а любой другой сбой в 500 без внутренних подробностей. Защита от инъекций операторов построена в три слоя. Проверка запроса принимает в полях только строки нужной длины, поэтому тело вида `{ "$ne": null }` отвергается ответом 400, а параметры списка допускают только `owner` и `tag` со строковым значением. Настройки `sanitizeFilter` и `strictQuery` не дают оператору из значения попасть в запрос, а лишние поля тела отбрасываются схемой. Размер тела запроса ограничен значением 100 КБ. Формат ошибок, ответ 405 с заголовком `Allow` и ограничение размера тела остались как в предыдущих работах.

Таблица 3 – Соответствие маршрутов и методов Mongoose

| Маршрут                | Вызов Mongoose                                           | Ответ       |
| ---------------------- | -------------------------------------------------------- | ----------- |
| `GET /diagrams`        | `Diagram.find(filter).sort({ _id: 1 })`                  | 200         |
| `GET /diagrams/:id`    | `Diagram.findById(id)`                                   | 200 или 404 |
| `POST /diagrams`       | `Diagram.create(fields)`                                 | 201         |
| `PUT /diagrams/:id`    | `Diagram.findByIdAndUpdate(id, fields, { new: true })`   | 200 или 404 |
| `DELETE /diagrams/:id` | `Diagram.findByIdAndDelete(id)`                          | 204 или 404 |

Список принимает параметры `tag` и `owner`. Фильтр `{ tags: 'shop' }` в MongoDB означает «массив тегов содержит значение», отдельного оператора для этого не нужно.

### 3.4 Работа с вложенными структурами

Три дополнительных маршрута работают с массивом комментариев и меняют его отдельными атомарными операторами MongoDB, не загружая документ в приложение.

Таблица 4 – Маршруты для массива комментариев

| Маршрут                                   | Оператор MongoDB                                            | Ответ       |
| ----------------------------------------- | ----------------------------------------------------------- | ----------- |
| `POST /diagrams/:id/comments`             | `$push: { comments: comment }`                              | 201 или 404 |
| `PUT /diagrams/:id/comments/:commentId`   | `$set: { 'comments.$.text': text }` с условием `comments._id` | 200 или 404 |
| `DELETE /diagrams/:id/comments/:commentId` | `$pull: { comments: { _id: commentId } }`                   | 200 или 404 |

Изменение одного элемента массива показывает отличие от реляционной модели: позиционный оператор `$` подставляет индекс найденного элемента, поэтому обновляется только текст нужного комментария, а остальные элементы массива и поля диаграммы не затрагиваются. Условие поиска содержит и идентификатор диаграммы, и идентификатор комментария, поэтому комментарий другой диаграммы по этому адресу недоступен. Метод `PUT /diagrams/:id` меняет поля диаграммы и теги, но не трогает комментарии.

### 3.5 Запуск и проверка

Порядок запуска: скопировать `.env.example` в `.env` и вписать `MONGODB_URI`, выполнить `npm run seed`, затем `npm run dev`. Сид удаляет демонстрационные документы по названию и вставляет три диаграммы, поэтому его можно запускать повторно. Проверка на локальном `mongod` показала, что список возвращает диаграммы с вложенными комментариями и тегами, а запрос с параметром `tag=shop` возвращает две диаграммы из трёх.

Всего 41 автоматический тест. Девятнадцать проверяют основные маршруты: корректные и некорректные идентификаторы, создание, замену с сохранением комментариев, удаление, ошибки 400, 404, 405 и 413, ответ 500 без утечки текста ошибки. Одиннадцать проверяют вложенные структуры: фильтр по тегу и владельцу, добавление, изменение и удаление комментария, недоступность чужого комментария, проверку схемы на уровне модели, индексы и перевод ошибки Mongoose в ответ 400. Ещё одиннадцать проверяют защиту данных: операторы вроде `$ne` в теле и в параметрах запроса, пробельные значения, пределы из `limits.json` на границе и за ней, целочисленный приоритет, ограничение размера тела и наличие времени создания у каждой записи. Тесты запускаются на временном экземпляре MongoDB через `mongodb-memory-server`, поэтому рабочая база не затрагивается. Те же команды `npm test` проверяют сборку и оформление этого отчёта. Скриншоты кластера Atlas, запросов в Postman и данных в MongoDB Compass в этот вариант отчёта не включены.

## Ответы на контрольные вопросы

9. **Как создать индекс в Mongoose?** Параметр `index: true` у поля или `schema.index({ owner: 1 })`; уникальность задаёт `unique: true`. В проекте индексы стоят на `owner` и `tags`.
10. **Что такое populate?** Метод, который заменяет ссылку `ObjectId` в документе данными из другой коллекции. В проекте он не нужен, потому что комментарии вложены, а не вынесены в отдельную коллекцию.
11. **Как искать, когда массив содержит значение?** Условие на поле-массив сравнивает значение с элементами: `Diagram.find({ tags: 'shop' })`, для нескольких значений есть `$in` и `$all`.

## Заключение

В лабораторной работе сервер DSLKit из лабораторной работы 2 переведён с Sequelize на Mongoose. Коллекция `diagrams` хранится в MongoDB, маршруты CRUD сохранили адреса и формат ответов, а идентификаторы стали строками `ObjectId`. Теги и комментарии лежат внутри документа диаграммы, что заменяет несколько таблиц и соединений одним запросом. Для массива комментариев реализованы добавление, изменение элемента позиционным оператором и удаление. Строка подключения вынесена в переменную окружения, схема проверяет данные, а 41 тест подтверждает поведение API на временной базе. Не выполнено подключение к MongoDB Atlas и не приложены скриншоты.

## Приложение А – Листинг файла db.js

```js
const mongoose = require('mongoose');

// The connection string comes from MONGODB_URI (see .env.example).
const connect = async (uri = process.env.MONGODB_URI) => {
  if (!uri) throw new Error('MONGODB_URI is not set, copy .env.example to .env');
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};

module.exports = { connect, disconnect: () => mongoose.disconnect() };
```

## Приложение Б – Листинг файла server.js

```js
require('dotenv').config({ quiet: true });
const { createApp } = require('./src/app');
const models = require('./src/models');
const { connect } = require('./src/db');

const port = Number(process.env.PORT) || 3000;

connect()
  .then(() => {
    console.log('MongoDB connected');
    createApp(models).listen(port, () => console.log(`Server running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Cannot connect to MongoDB:', error.message);
    process.exit(1);
  });
```

## Приложение В – Листинг файла diagram.js

```js
const mongoose = require('mongoose');
const { NOTATIONS, PRIORITY, LIMITS } = require('./diagram.constants');

// Query filters are never trusted: operators sent as values are stripped, unknown fields are ignored.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

// Responses expose "id" instead of Mongo's "_id" and "__v".
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
  },
};

// A comment lives inside the diagram document: no separate collection, no join.
const commentSchema = new mongoose.Schema(
  {
    author: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.author },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.commentText },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON, strict: true },
);

const diagramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.title },
    notation: { type: String, required: true, enum: NOTATIONS },
    sourceCode: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.sourceCode },
    priority: {
      type: Number,
      required: true,
      min: PRIORITY.min,
      max: PRIORITY.max,
      default: PRIORITY.default,
      validate: { validator: Number.isInteger, message: 'priority must be an integer' },
    },
    owner: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.owner, index: true },
    tags: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: LIMITS.tag }],
      index: true,
      validate: { validator: (v) => v.length <= LIMITS.tags, message: 'too many tags' },
    },
    comments: { type: [commentSchema], validate: { validator: (v) => v.length <= LIMITS.comments, message: 'too many comments' } },
  },
  { timestamps: true, toJSON, strict: true },
);

const Diagram = mongoose.models.Diagram || mongoose.model('Diagram', diagramSchema);

module.exports = { Diagram };
```

## Приложение Г – Листинг файла diagrams.controller.js

```js
const { notFound } = require('../errors');

const missing = (id) => notFound(`Diagram ${id} not found`);
const missingComment = (id) => notFound(`Comment ${id} not found`);

// ?owner=anna&tag=shop narrows the list; tag matches when the tags array contains the value.
const listFilter = ({ owner, tag }) => ({
  ...(typeof owner === 'string' && { owner }),
  ...(typeof tag === 'string' && { tags: tag }),
});

const options = { new: true, runValidators: true };

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  list: async (req, res) => res.json(await Diagram.find(listFilter(req.query)).sort({ _id: 1 })),

  get: async (req, res, next) => {
    const diagram = await Diagram.findById(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: async (req, res) => {
    const diagram = await Diagram.create(req.diagramFields);
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndUpdate(req.diagramId, req.diagramFields, options);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  remove: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndDelete(req.diagramId);
    return diagram ? res.status(204).end() : next(missing(req.diagramId));
  },

  // $push appends to the nested array in one atomic update.
  addComment: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndUpdate(req.diagramId, { $push: { comments: req.commentFields } }, options);
    return diagram ? res.status(201).json(diagram) : next(missing(req.diagramId));
  },

  // The positional operator $ updates only the array element matched by the filter.
  updateComment: async (req, res, next) => {
    const diagram = await Diagram.findOneAndUpdate(
      { _id: req.diagramId, 'comments._id': req.commentId },
      { $set: { 'comments.$.text': req.commentFields.text } },
      options,
    );
    return diagram ? res.json(diagram) : next(missingComment(req.commentId));
  },

  removeComment: async (req, res, next) => {
    const diagram = await Diagram.findOneAndUpdate(
      { _id: req.diagramId, 'comments._id': req.commentId },
      { $pull: { comments: { _id: req.commentId } } },
      options,
    );
    return diagram ? res.json(diagram) : next(missingComment(req.commentId));
  },
});

module.exports = { createDiagramsController };
```

## Приложение Д – Листинг файла diagrams.routes.js

```js
const { Router } = require('express');
const { HttpError } = require('../errors');
const { validateListQuery, parseId, parseCommentId, validateDiagram, validateComment, validateCommentText } = require('../middleware/validate');

const methodNotAllowed = (allow) => (_req, res, next) => {
  res.set('Allow', allow);
  next(new HttpError(405, `Method not allowed, use ${allow}`));
};

const createDiagramsRouter = (controller) => {
  const router = Router();
  router.route('/').get(validateListQuery, controller.list).post(validateDiagram, controller.create).all(methodNotAllowed('GET, POST'));
  router
    .route('/:id')
    .get(parseId, controller.get)
    .put(parseId, validateDiagram, controller.replace)
    .delete(parseId, controller.remove)
    .all(methodNotAllowed('GET, PUT, DELETE'));
  router.route('/:id/comments').post(parseId, validateComment, controller.addComment).all(methodNotAllowed('POST'));
  router
    .route('/:id/comments/:commentId')
    .put(parseId, parseCommentId, validateCommentText, controller.updateComment)
    .delete(parseId, parseCommentId, controller.removeComment)
    .all(methodNotAllowed('PUT, DELETE'));
  return router;
};

module.exports = { createDiagramsRouter };
```

## Приложение Е – Листинг файла seed.js

```js
require('dotenv').config({ quiet: true });
const { Diagram } = require('../src/models');
const { connect, disconnect } = require('../src/db');

const demo = [
  {
    title: 'Order processing',
    notation: 'BPMN',
    sourceCode: 'start -> check stock -> pay -> ship -> end',
    priority: 2,
    owner: 'anna',
    tags: ['shop', 'process'],
    comments: [{ author: 'boris', text: 'Add a refund branch' }],
  },
  { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', owner: 'carol', tags: ['auth'] },
  { title: 'Customers and orders', notation: 'ERD', sourceCode: 'Customer ||--o{ Order', priority: 0, owner: 'anna', tags: ['shop', 'database'] },
];

// Replaces the demo documents by title, so the script can be run many times.
const seed = async () => {
  await connect();
  await Diagram.deleteMany({ title: { $in: demo.map((d) => d.title) } });
  const created = await Diagram.create(demo);
  console.log(`Seeded ${created.length} diagrams`);
  await disconnect();
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
```

## Приложение Ж – Листинг файла limits.json

```json
{
  "title": 80,
  "owner": 60,
  "sourceCode": 10000,
  "tags": 20,
  "tag": 30,
  "comments": 100,
  "author": 60,
  "commentText": 1000,
  "priorityMin": 0,
  "priorityMax": 2,
  "priorityDefault": 1
}
```
