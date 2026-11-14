# Тесты неправильного поведения пользователя

Файл с тестами: `src/negative.test.jsx` (25 сценариев). Существующие тесты не менялись.

## Найденные дефекты

| Сценарий | Что было | Что стало |
|---|---|---|
| Двойной клик по ссылке «Выйти» (`signs out once on a double click on the logout link`) | Первый клик выходит из системы и меняет ссылку на «Войти». Второй клик попадает уже на ссылку «Войти», и пользователь оказывается на странице входа вместо главной. | Повторный клик (`detail > 1`) по ссылке входа/выхода в шапке не выполняется. Пользователь попадает на главную, сессия очищена. Исправление в `src/components/Layout.jsx` (функция `ignoreRepeatClick`). |

## Сценарии

| Сценарий | Ожидаемый ответ | Тест |
|---|---|---|
| Malformed percent sequence in the address `/catalog/%` | Страница 404 в стиле сайта, без падения приложения | `answers 404 for a malformed percent sequence in the address` |
| Неизвестный id шаблона `-1` | Страница 404 | `answers 404 for the unknown template id -1` |
| Неизвестный id шаблона `1.5` | Страница 404 | `answers 404 for the unknown template id 1.5` |
| Неизвестный id шаблона `99999999999999999999` | Страница 404 | `answers 404 for the unknown template id 99999999999999999999` |
| Неизвестный id шаблона с пробелом `%202` | Страница 404 | `answers 404 for the unknown template id %202` |
| Лишний сегмент пути `/catalog/2/extra` | Страница 404 без хлебных крошек | `answers 404 for a deeper path under a template and shows no breadcrumbs` |
| Гость открывает `/DASHBOARD` в верхнем регистре | Перенаправление на страницу входа | `redirects a guest from an upper-case /DASHBOARD address to the login page` |
| Обычный пользователь открывает `/ADMIN` в верхнем регистре | Страница 403 | `answers 403 for an upper-case /ADMIN address opened by a plain user` |
| Кнопка «назад» после входа | Возврат на страницу, с которой начали вход, а не на форму входа | `goes back to the page before the login, not to the login form` |
| Кнопка «назад» после выхода | Страница входа, кабинет не показывается | `does not show the dashboard when going back after sign-out` |
| Чужой адрес возврата `http://evil.example/` в состоянии перехода | После входа открывается `/dashboard`, чужой адрес не используется | `does not follow the foreign return address http://evil.example/ after login` |
| Чужой адрес возврата `//evil.example/path` | После входа открывается `/dashboard` | `does not follow the foreign return address //evil.example/path after login` |
| Адрес возврата `javascript:alert(1)` | После входа открывается `/dashboard`, код не выполняется | `does not follow the foreign return address javascript:alert(1) after login` |
| Адрес возврата в параметре `?next=//evil.example` | Параметр игнорируется, после входа `/dashboard` | `ignores a return address passed in the query string` |
| Имя из табуляций и переводов строки | Ошибка «Введите имя пользователя», вход не выполняется | `rejects a name made only of tabs and line breaks` |
| Имя из 100000 символов | Ошибка «Имя не длиннее 40 символов», вход не выполняется | `rejects a 100000-character name without signing in` |
| Имя `  AdMiN  ` в другом регистре с пробелами | Вход выполнен, на главной в кабинете есть ссылка на раздел администратора | `gives the admin link to an upper-case admin name with spaces` |
| Двойной Enter в поле имени | Вход выполнен один раз, открыт кабинет, имя сохранено | `signs in once on a double Enter in the name field` |
| В хранилище сохранено имя длиннее 40 символов | Пользователь считается гостем, открывается страница входа | `treats an over-long stored name as no session` |
| В хранилище сохранено имя из пробелов | Пользователь считается гостем, открывается страница входа | `treats a blank stored name as no session` |
| Хранилище не даёт удалить ключи при выходе | Выход выполнен на странице, ошибки на экране нет | `signs out in the page when storage refuses to remove the keys` |
| Разметка в имени `<img src=x onerror=...>` | Текст выводится как есть, картинка не создаётся, код не выполняется | `renders a stored name with markup as text on the dashboard` |
| Двойной клик по ссылке «Выйти» | Выход один раз, открыта главная, сессия очищена | `signs out once on a double click on the logout link` |
| Повтор параметра `?q=erd&q=bpmn` | Используется первое значение `erd`, найден один шаблон | `keeps the first q value when the address repeats the parameter` |
| Испорченная кодировка в `?q=%E0%A4%A` | Сообщение «Ничего не найдено», страница каталога работает | `shows the empty-result message for a malformed percent sequence in q` |
