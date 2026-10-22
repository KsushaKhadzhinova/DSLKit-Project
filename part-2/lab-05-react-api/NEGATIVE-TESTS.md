# Тесты неправильного поведения пользователя

Файл с тестами: `src/negative.test.jsx` (23 сценария, Vitest и Testing Library, сеть мокается так же, как в `src/App.test.jsx`). Существующие тесты не менялись.

## Сценарии и ожидаемые ответы

| Сценарий | Ожидаемый ответ | Тест |
|---|---|---|
| Пустая форма диаграммы | Под полями «Введите название» и «Введите исходный код», запрос не отправляется | shows field errors and sends nothing for an empty form |
| Форма из пробелов и табуляций | Те же ошибки, запрос не отправляется | shows field errors and sends nothing for a form of tabs and spaces |
| Вставка 100 000 символов в название | Поле обрезано до 80 символов, в запрос уходит 80 символов | cuts a 100000-character title paste to 80 characters before sending |
| Исходный код 100 000 символов (принудительная вставка) | «Исходный код не длиннее 10000 символов», запрос не отправляется | refuses a 100000-character source code with a message and sends nothing |
| Двойной клик на «Добавить» | Ровно один POST | sends one POST for a double click on the add button |
| Двойной Enter в поле названия | Ровно один POST | sends one POST for a double Enter in the title field |
| Двойной Enter на кнопке «Удалить» | Ровно один DELETE для этой записи | sends one DELETE for a double Enter on the delete button |
| Двойной клик на «Войти» | Ровно один запрос входа | sends one login request for a double click on the sign-in button |
| Быстрая смена поиска: ответ на старый текст приходит позже | Список показывает результат нового текста, старый ответ его не перезаписывает | ignores the answer to an old search text that arrives after the new one |
| Escape при переименовании | Режим правки закрыт, название прежнее, PUT не отправляется | cancels the rename with Escape and keeps the old title |
| Сервер недоступен при добавлении | Сообщение «Не удалось добавить диаграмму. Сервер недоступен…», временная запись убрана | shows a notice and removes the new item when the server is unavailable on add |
| Сервер отвечает 500 при загрузке списка | «Ошибка сервера (500)» и кнопка «Повторить», после повтора список загружается | shows the status and a retry button when the list answers 500 |
| 401 посреди сессии | Токен удалён из хранилища, показана форма входа с текстом «Сессия истекла. Войдите снова.» | signs the user out and shows the login form when the token is rejected in the middle of a session |
| 403 при добавлении | «Не удалось добавить диаграмму. Ошибка сервера (403)», временная запись убрана | shows the 403 status and removes the new item when the server refuses the add |
| 404 при изменении (запись уже удалена) | Сообщение с текстом сервера, старое название возвращено | shows the 404 message and restores the old title when the record is gone on edit |
| Сервер отвечает HTML вместо JSON | «Сервер вернул неожиданный ответ. Проверьте адрес сервера» с кнопкой «Повторить», без падения | shows an error instead of crashing when the server answers HTML |
| Пустое тело ответа | То же сообщение, без падения | shows an error instead of crashing when the server answers an empty body |
| Сервер не отвечает вовремя | «Сервер не ответил вовремя» | shows a timeout message when the server does not answer in time |
| Сервер недоступен при входе | «Сервер недоступен. Проверьте, что он запущен», токен не сохраняется | shows the unavailable message when the server is down during sign-in |
| Неверный пароль | Текст сервера в предупреждении, форма входа остаётся, токен не сохраняется | shows the server message for a wrong password and keeps the login form |
| Разметка в данных (`<img onerror>`, `<script>`) | Выводится как текст, элементы img и script не создаются, код не выполняется | shows markup from the data as plain text and runs no script |
| localStorage не читается (исключение) | Показана форма входа, запросы списка не отправляются | shows the login form when the storage cannot be read |
| localStorage не записывается (исключение) | Вход выполнен, показан список, приложение не падает | signs in and shows the list when the storage refuses to save the token |

## Найденные дефекты

| Сценарий | Что было | Что стало |
|---|---|---|
| HTML вместо JSON или пустой ответ при загрузке списка | Тело ответа без массива сохранялось как список. `items.filter is not a function` в `useDiagrams` ронял всё React-дерево, страница становилась пустой | В `usePagedList` (`src/hooks/useDiagrams.js`) проверка `Array.isArray(response.data)`. Иначе показывается «Сервер вернул неожиданный ответ. Проверьте адрес сервера» с кнопкой «Повторить». Отчёты `report.md` и `report.en.md` пересобраны скриптом `tools/build.js`, потому что в них вставлен код этого файла |
