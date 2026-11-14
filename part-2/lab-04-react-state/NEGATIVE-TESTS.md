# Тесты неправильного поведения пользователя

Файл тестов: `src/negative.test.jsx` (Vitest + Testing Library). Существующие тесты не менялись, `report.test.mjs` не трогался.

Итог `npm test`: до добавления 55 тестов Vitest и 2 теста `node --test`, после добавления 80 тестов Vitest и 2 теста `node --test`. Новых тестов 25.

## Сценарии и ожидаемые ответы

| Сценарий | Ожидаемый ответ | Тест |
|---|---|---|
| Пустая форма отправлена кнопкой «Добавить» | Ошибка «Введите название диаграммы», запись не добавлена | `src/negative.test.jsx`: answers with an error and stores nothing for an empty form submit |
| Название из табуляций и пробелов | Ошибка «Введите название диаграммы», запись не добавлена | `src/negative.test.jsx`: rejects a title made of tabs and spaces without adding a record |
| Вставка 100 000 символов в название | Ошибка с пределом 80 символов, список не меняется, страница работает | `src/negative.test.jsx`: answers with the limit message to a 100000 character paste and stays usable |
| Название на 1 символ длиннее предела (81) | Ошибка с пределом, запись не добавлена | `src/negative.test.jsx`: rejects a title one character longer than the limit |
| Название ровно 80 символов с пробелами по краям | Принято, пробелы по краям обрезаны | `src/negative.test.jsx`: accepts a title of exactly the limit length with spaces around it |
| Числоподобные значения `-1`, `0`, `1e309`, `NaN` в названии | Сохраняются как текст, не как число | `src/negative.test.jsx`: stores "%s" as a text title, not as a number (4 теста) |
| Двойной клик по «Добавить» | Ровно одна новая запись | `src/negative.test.jsx`: adds one record on a double click of the add button |
| Двойной Enter в поле названия | Ровно одна новая запись, второй Enter даёт ошибку пустого поля | `src/negative.test.jsx`: adds one record on a double Enter in the title field |
| Эмодзи и текст справа налево в названии | Выводятся без искажения | `src/negative.test.jsx`: shows emoji and right-to-left text in a title unchanged |
| Двойной Enter при переименовании | Одно сохранение, режим правки закрыт, ошибки нет | `src/negative.test.jsx`: saves a rename once when Enter is pressed twice |
| Двойной клик по «Удалить» | Одно удаление, осталось на одну запись меньше | `src/negative.test.jsx`: deletes a diagram once on a double click of its delete button |
| Переименование на 100 000 символов | Ошибка с пределом, старое название сохранено | `src/negative.test.jsx`: rejects a rename to 100000 characters and keeps the old title |
| Escape при правке и последующий Enter | Правка отменена, название прежнее, Enter ничего не меняет | `src/negative.test.jsx`: drops the typed text on Escape and ignores a later Enter |
| Разметка `<img onerror>` и `<script>` в сохранённом названии | Выводится текстом, элементы `img` и `script` не создаются, код не выполняется | `src/negative.test.jsx`: shows markup stored in a title as text and does not create an image or a script |
| Битый JSON в хранилище | Показан начальный список из 3 диаграмм | `src/negative.test.jsx`: starts with the initial list when the stored JSON is broken |
| В хранилище массив чисел вместо списка диаграмм | Показан начальный список из 3 диаграмм | `src/negative.test.jsx`: starts with the initial list when the stored value is an array of numbers |
| В хранилище `null` | Показан начальный список из 3 диаграмм | `src/negative.test.jsx`: starts with the initial list when the stored value is null |
| В хранилище название на 100 000 символов | Запись отбрасывается, показан начальный список | `src/negative.test.jsx`: starts with the initial list when a stored title is 100000 characters long |
| В хранилище больше 200 записей | Запись отбрасывается, показан начальный список | `src/negative.test.jsx`: starts with the initial list when the stored list is over the limit |
| Чтение `localStorage` выбрасывает исключение | Страница отрисована с начальным списком, без падения | `src/negative.test.jsx`: renders the page when reading storage throws |
| Чтение и запись `localStorage` заблокированы | Добавление и удаление работают в памяти, без падения | `src/negative.test.jsx`: keeps adding and deleting in memory when reading and writing storage are both blocked |
| Неизвестный якорь в адресе (`#no-such-section`) | Одна страница, все диаграммы на месте, один заголовок `h1` | `src/negative.test.jsx`: shows the single page and all diagrams for an unknown anchor |

## Дефекты

Дефектов не найдено: все 25 сценариев прошли на текущем коде, код приложения не менялся.

Наблюдение (не дефект по брифу, код не менялся): если в `localStorage` лежит хотя бы одна некорректная запись, весь список отбрасывается, показывается начальный список, и при первой отрисовке он записывается поверх сохранённых данных. Это сознательное решение `useLocalStorage` и `isDiagramList`, но пользователь может потерять остальные корректные записи. Решение о поведении остаётся за автором работы.

## Сценарии каталога, которые к этой работе не относятся

- Числовые поля (`-1`, `0`, `1.5`, `NaN`, `1e309`, `2147483648`): в приложении нет числового поля, проверены только текстовые поля.
- Ответы сервера 500, 401, 403, 404, HTML вместо JSON, пустой ответ, медленный ответ, недоступный сервер: приложение работает без сервера, сетевых запросов нет.
- CSRF-токен и повторяющиеся ключи формы: в приложении нет серверных форм.
- Быстрая смена поиска с устаревшим ответом: поиск синхронный, запросов нет.
- Неизвестный `id` в адресе и неизвестный маршрут: маршрутизатора и адресов с `id` нет, проверен неизвестный якорь.
- Двойной клик и Enter при отправке через сеть, повтор запроса: запросов нет, проверена только локальная запись.
