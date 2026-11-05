# Негативные тесты: pz-04 (Context + useReducer)

Файл с тестами: `src/negative.test.jsx`. Старые тесты (`src/App.test.jsx`, `src/quantity.test.jsx`) и `report.test.mjs` не менялись.

## Найденные дефекты и исправления

| Сценарий | Что было | Что стало |
|---|---|---|
| Редьюсер получает `undefined` вместо действия | `action.type` бросал TypeError, React уходил на страницу 500 | Действие читается через `action?.type`, состояние возвращается без изменений |
| Редьюсер получает `null` вместо состояния | `state.some` бросал TypeError | Состояние, которое не массив, считается пустым списком |
| `ADD` без `id` | В состояние и в localStorage попадал элемент `{ id: undefined, qty: 1 }` | Действие игнорируется |
| `ADD` с `id` строкой `"1"` | В состояние попадал элемент с неверным типом id (при перезагрузке его отбрасывал `sanitizeFavorites`) | Принимаются только id из `TEMPLATES`, остальное игнорируется |
| `ADD` и `TOGGLE` с id, которого нет в шаблонах (например, 99) | В состояние попадал чужой элемент, который не отображался и не считался | Неизвестные id игнорируются |
| `useFavorites` и `useFavoritesDispatch` вне `FavoritesProvider` | Хук возвращал `null`, падение позже с непонятным TypeError | Бросается ошибка `useFavorites must be used inside FavoritesProvider` (и аналог для dispatch) |
| `useLanguage` вне `LanguageProvider` | Хук возвращал `null`, падение позже с непонятным TypeError | Бросается ошибка `useLanguage must be used inside LanguageProvider` |

Крупных дефектов не найдено, все исправления минимальные. Файл `report.md` исходный код не встраивает, поэтому пересборка отчёта не понадобилась.

## Сценарии

Ожидаемый ответ описан для приложения, тест выполняется в `src/negative.test.jsx`.

| Сценарий | Ожидаемый ответ | Тест |
|---|---|---|
| Редьюсер получает `undefined` вместо действия | Состояние остаётся тем же, без исключения | `answers the same state for a missing action instead of throwing` |
| Редьюсер получает `null` вместо состояния | Создаётся список из одного элемента | `starts from an empty list when the state is null` |
| `ADD` без id | Состояние не меняется | `ignores ADD without an id` |
| `ADD` с id строкой `"1"` | Состояние не меняется | `ignores an id of the wrong type, like the string "1"` |
| `ADD` с id 99, которого нет в шаблонах | Состояние не меняется | `ignores ADD for an id that is not a template` |
| `REMOVE` отсутствующего элемента | Список остаётся тем же | `leaves the list the same when removing an item that is not there` |
| Два `ADD` подряд для одного элемента | Одна запись, количество 1 | `keeps one entry when the same item is added twice in a row` |
| Количество `NaN` | Количество становится 1 | `turns a NaN quantity into 1` |
| Количество 2147483648 и `MAX_SAFE_INTEGER + 1` | Количество ограничено лимитом 99 | `clamps 2147483648 and Number.MAX_SAFE_INTEGER + 1 to the limit` |
| В хранилище количество `"1e3"` | После загрузки количество 99 | `reads a quantity written as "1e3" in storage as the limit` |
| Двойной клик по кнопке «В избранное» | Счётчик, localStorage и `aria-pressed` согласованы. Двойной клик по переключателю даёт два переключения, итог без изменений (это ожидаемо для TOGGLE) | `keeps the counter and the storage in step after a double click on add` |
| Имя из 100 000 символов в блоке prop drilling | Выводится одна буква, страница не падает | `shows only the first letter of a 100000-character name without failing` |
| Имя из табуляций и перевода строки | Выводится заглушка `?` | `shows a tab and newline name as the placeholder` |
| Имя с `<img onerror>` и `<script>` | Выводится текстом, ничего не выполняется | `runs no script from a name with script and onerror markup` |
| `localStorage.getItem` бросает исключение | Страница открывается, избранное пустое | `renders the page with no favorites when reading storage throws` |
| В хранилище литерал `null` | Пустой список избранного | `treats the literal null in storage as an empty list` |
| В хранилище массив вместо темы | Тема берётся из системных настроек (светлая) | `ignores an array stored as the theme` |
| В хранилище `qty: null` | После перезагрузки количество 1 | `reads a null quantity in storage as 1 after a reload` |
| `useFavorites` вне `FavoritesProvider` | Понятная ошибка с именем провайдера | `throws a clear error when useFavorites is used outside FavoritesProvider` |
| `useFavoritesDispatch` вне `FavoritesProvider` | Понятная ошибка с именем провайдера | `throws a clear error when useFavoritesDispatch is used outside FavoritesProvider` |
| `useLanguage` вне `LanguageProvider` | Понятная ошибка с именем провайдера | `throws a clear error when useLanguage is used outside LanguageProvider` |

## Результаты npm test

- До работы: 38 тестов Vitest и 2 отчётных теста (`report.test.mjs`), всего 40, все прошли.
- После работы: 59 тестов Vitest (38 старых и 21 новый) и 2 отчётных теста, всего 61, все прошли.
