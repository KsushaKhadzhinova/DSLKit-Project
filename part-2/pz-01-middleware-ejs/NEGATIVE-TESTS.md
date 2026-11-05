# Тесты неправильного поведения пользователя

Файл теста: `test/negative-misuse.test.js` (22 сценария, `node --test`).
Итог `npm test`: было 77 тестов, стало 99 тестов, все проходят. Покрытие строк не изменилось (99.35%), ветвей выросло с 97.54% до 97.56%.

## Новые сценарии

| Сценарий | Ожидаемый ответ | Тест |
| --- | --- | --- |
| Неверные адреса `/item/abc`, `1e3`, `1.5`, `%F0%9F%98%80`, `%D8%A7`, номер из 300 цифр | 404 styled-страница, без 500, записи не меняются | odd item addresses answer 404, a broken escape 400, and never 500 |
| Адрес `/item/%` с незакрытым экранированием | 400 styled-страница, без 500 | odd item addresses answer 404, a broken escape 400, and never 500 |
| POST на неизвестный маршрут с верным токеном | 404 «Page not found» | a POST to an unknown route with a valid token answers the styled 404 page |
| PUT и PATCH на адрес записи с верным токеном | 404, запись не меняется | PUT and PATCH on an item address answer 404 and change nothing |
| HEAD на страницу | 200, `text/html`, тело пустое | a HEAD request to a page answers 200 with the headers and no body |
| Адрес с закодированным переводом строки `%0D%0A` в журнале | Одна строка журнала, URL без переводов строк | an address with an encoded line break is logged as one plain row |
| Разметка в сыром адресе `/<img/src=x/...>` на странице 404 и в журнале | Разметка выводится как текст (`&lt;img`), тега нет | markup in a raw address is escaped on the 404 page and on the request log |
| Форма с `Content-Type: text/plain` | 403, в хранилище ничего не добавлено | a form sent as text/plain is refused with 403 and nothing is stored |
| Тело на 1 байт больше лимита 20 kB | 413 «Request too large», запись не добавлена | a body one byte over the 20 kB limit answers 413 with the styled page |
| Форма без поля `notation` | 400 «Choose a notation», другие поля сохранены в форме | a form without the notation field is refused with 400 and keeps the other values |
| Заголовок из неразрывных пробелов и табуляций | 400 «Title is required» | a title made of non-breaking spaces and tabs counts as empty and is refused |
| Заголовок с эмодзи и арабскими буквами | 302, текст показан без изменений | a title with emoji and right-to-left letters is stored and shown unchanged |
| Заголовок из одного NUL-байта | 302 или 400, список открывается дальше | a title that is only a NUL byte is answered with 302 or 400, and the list still opens |
| Заголовок из 41 эмодзи (82 единицы UTF-16) | 400 «Title must be at most 80 characters» | a title of 41 emoji is refused, because the limit counts UTF-16 units like the form maxlength |
| Код ровно 5000 символов | 302, граница включена | a code of exactly 5000 characters is accepted, the limit is inclusive |
| Ревизия `007` | 302, сохраняется число 7 | a revision with leading zeros is accepted and stored as the plain number |
| Ревизии `NaN`, `Infinity`, пробел, `2147483648` | 400 для каждой | revisions NaN, Infinity, a blank space and 2147483648 are refused with 400 |
| Токен из чужой формы (другая кука) | 403, запись не добавлена | a token copied from another visitor form is refused with 403 |
| Одна и та же форма отправлена дважды | Две записи, оба ответа 302 | the same add form sent twice creates two records, one per send |
| Редактирование записи после удаления (GET и POST) | 404, запись не возвращается | editing a record after it was deleted answers 404 and does not bring it back |
| Разметка в отклонённой форме | Выводится как текст, тега нет | markup typed into a rejected form is shown again as text, not as a tag |
| Журнал запросов остановлен посреди работы | 500 «Server error» без путей к файлам, SQL и стека | a stopped request log shows the 500 page without file paths, SQL or stack text |
| Журнал в пути под обычным файлом (нельзя создать папку) | 500 с понятным текстом, два запроса подряд, без внутренних имён | a request log under a regular file shows the styled 500 page without internals and keeps answering |

## Дефекты

Дефектов, требующих правки кода, тесты не выявили: ни один сценарий не дал 500 на неверный ввод, не пропустил запрещённое и не упал. Код приложения не менялся.

## Наблюдения (код не менялся)

Это расхождения с брифом или мелкие особенности, а не дефекты. Записаны, чтобы их можно было решить отдельно.

| Сценарий | Что было | Что стало |
| --- | --- | --- |
| Неподдерживаемый метод (PUT, PATCH) на адресе записи | По брифу ожидается 405 с заголовком `Allow` | Ответ 404 «Page not found». Тест фиксирует 404, запись не меняется |
| Форма с `Content-Type: text/plain` | По брифу ожидается 415 | Ответ 403 («token missing or wrong»), потому что тело не разобрано. Тест фиксирует 403 |
| Лимит заголовка считается в единицах UTF-16 | Сообщение говорит «80 characters», а 41 эмодзи отклоняется | Так же ведёт себя `maxlength` в форме, поэтому в браузере расхождения не видно. Тест фиксирует 400 |
| Заголовок из NUL-байта | Принимается и сохраняется как текст | Тест допускает 302 или 400 и проверяет, что страница не падает. Лучше запретить управляющие символы отдельно |
| Журнал закрыт до первого запроса | Соединение открывается заново и работает, поэтому ошибки не будет | Тест проверяет остановку после работы, как и существующие тесты |
