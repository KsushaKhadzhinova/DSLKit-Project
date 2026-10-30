# Практическое занятие №4. Управление состоянием приложения

## 1 Цель работы

Освоить глобальное управление состоянием в React с помощью Context API и хука `useReducer`: показать проблему prop drilling, решить её контекстами и реализовать бизнес-логику проекта DSLKit, веб-редактора диаграмм как кода (направление SaaS), в виде редьюсера и провайдера.

## 2 Ход работы

### 2.1 Проблема prop drilling

Иерархия `PropDrilling` → `DrillingHeader` → `Navigation` → `UserMenu` → `UserAvatar` передаёт имя пользователя через все уровни, хотя использует его только `UserAvatar`. Три промежуточных компонента получают `userName` лишь ради передачи дальше, поэтому любое изменение данных требует правок во всей цепочке. Код приведён в приложении А.

Решение показано рядом, в том же разделе страницы. Имя пользователя лежит в `UserContext`, а `ContextHeader`, `ContextNavigation` и `ContextMenu` не получают props: `ContextAvatar` читает имя хуком `useUser`. Глубина вложенности та же, но передача данных вниз по цепочке исчезает, и добавление нового уровня не требует правок.

### 2.2 Контексты темы и языка

`ThemeProvider` хранит тему в `useState`, переключает её функцией `toggleTheme` и записывает в атрибут `data-theme` корневого элемента, а CSS-переменные меняют цвета всей страницы. `LanguageProvider` хранит язык и словарь на русском и английском, компоненты получают функцию `t(key)` и не принимают тексты через props. Значения контекстов обёрнуты в `useMemo`, чтобы потребители не перерисовывались без изменения данных.

### 2.3 Избранное на useReducer и Context

Предметная область: избранные шаблоны диаграмм. Состояние это массив объектов `{ id, qty }`. Редьюсер обрабатывает действия `ADD` (без дублей), `REMOVE`, `TOGGLE`, `INCREMENT`, `DECREMENT`, `SET_QTY` и `CLEAR`, возвращает новый массив и не изменяет прежний, неизвестное действие оставляет состояние без изменений. Количество всегда целое число от 1 до предела `maxQty` из `limits.json`, значение вне диапазона, дробное или нечисловое приводится к ближайшему допустимому. `FavoritesProvider` разделён на два контекста: данные (`useFavorites`) меняются при каждом действии, а `dispatch` (`useFavoritesDispatch`) не меняется никогда, поэтому компонент, который только отправляет действия, не перерисовывается при изменении данных. Карточка шаблона и панель «Избранное» работают с одним состоянием без передачи через props, в панели есть кнопки «минус» и «плюс» и текущее количество. Список сохраняется в `localStorage` эффектом и читается ленивым инициализатором `useReducer`.

Кнопки «Отменить» и «Вернуть» в панели избранного работают через функцию `withHistory`. Она оборачивает редьюсер и хранит состояние в виде `{ past, present, future }`. Действие, которое ничего не меняет, не создаёт шаг истории, а новое изменение сбрасывает шаги «Вернуть». Сам редьюсер избранного остался прежним и проверяется теми же тестами.

### 2.4 Устойчивость к чужим данным

Содержимое `localStorage` может быть изменено вручную. Функция `sanitizeFavorites` оставляет только известные идентификаторы шаблонов, по одному разу, исправляет повреждённое количество и принимает прежний формат со списком идентификаторов как количество 1. Тема и язык принимаются из хранилища только при допустимых значениях, иначе тема берётся из настройки системы, а язык русский. Недоступное хранилище и неверный JSON не ломают приложение. Тексты выводятся как текст, поэтому разметка в имени пользователя не выполняется, а пустое имя в цепочке prop drilling заменяется знаком вопроса. Страница 500 показывается через `ErrorBoundary`, если отрисовка завершилась сбоем.

### 2.5 Внешний вид

Приложение использует стили и разметку сайта первой части: закреплённую шапку с логотипом и меню по разделам страницы, кнопку языка, переключатель темы в виде луны и солнца с подсказкой, карточки и подвал. Переключатель темы и кнопка языка читают те же контексты, что остальные компоненты, а подписи шапки меняются вместе с языком.

### 2.6 Демонстрация работы

Шаблоны диаграмм в карточках с кнопками избранного показаны на рисунке 1.

![Шаблоны диаграмм](figures/01-templates.png)

Рисунок 1 – Карточки шаблонов с кнопками «В избранное» в светлой теме

Два выбранных шаблона попадают в панель «Избранное», где виден счётчик, как на рисунке 2.

![Панель избранного](figures/02-favorites.png)

Рисунок 2 – Панель «Избранное» с двумя шаблонами и счётчиком выбранных

Кнопки со знаками «+» и «−» меняют количество через действия редьюсера, результат виден на рисунке 3.

![Количество в избранном](figures/08-quantity.png)

Рисунок 3 – Панель «Избранное» с количеством 3 у первого шаблона

Удаление одного шаблона кнопкой «Убрать» оставляет в панели только остальные, как на рисунке 4.

![Удаление шаблона из избранного](figures/10-removed.png)

Рисунок 4 – Панель «Избранное» после удаления одного из трёх шаблонов

После перезагрузки страницы выбор и количество сохраняются, что видно на рисунке 5.

![Избранное после перезагрузки](figures/05-after-reload.png)

Рисунок 5 – Панель «Избранное» после перезагрузки страницы

Переключение темы меняет цвета всей страницы, что видно на рисунке 6.

![Тёмная тема](figures/03-dark-theme.png)

Рисунок 6 – Страница в тёмной теме с подсказкой у переключателя

Смена языка переводит заголовки, названия шаблонов и подписи кнопок, как на рисунке 7.

![Английский язык](figures/04-english.png)

Рисунок 7 – Страница после переключения языка на английский

Проблема prop drilling и её решение через контекст стоят рядом, как на рисунке 8.

![Проблема и решение prop drilling](figures/06-prop-drilling.png)

Рисунок 8 – Блок с передачей имени через props и блок с тем же именем из `UserContext`

Кнопка «Очистить» сбрасывает список действием `CLEAR`, и панель показывает сообщение, как на рисунке 9.

![Пустое избранное](figures/09-cleared.png)

Рисунок 9 – Панель «Избранное» после очистки списка

На ширине телефона 375 пикселей блоки идут в одну колонку, как на рисунке 10.

![Страница на телефоне](figures/07-mobile.png)

Рисунок 10 – Страница приложения на экране шириной 375 пикселей

### 2.7 Тестирование

В этой работе нет сервера и маршрутов, поэтому страницы 401, 403 и 404 не нужны, а для ошибок самого приложения есть две страницы, построенные из каталога текстов `src/shell/errorCatalog.js`. Страница 500 показывается, когда при отрисовке возникла непредвиденная ошибка, а страница «Нет связи с сервером» с кнопкой повтора показывается, когда не удалось скачать часть кода. Каждая отвечает на три вопроса: что это за ошибка, почему она возникла и как её исправить. Технический текст ошибки уходит только в консоль и на страницу не попадает.

Восемьдесят один автоматический тест проверяют редьюсер как чистую функцию, изменение количества с пределами, разделение контекстов (число перерисовок), проблему и решение prop drilling, двойной щелчок по кнопкам, переключение темы и языка, сохранение выбора, добавление, удаление и очистку избранного, восстановление после перезагрузки, повреждённые данные, ошибку записи в хранилище, демонстрацию prop drilling, вывод разметки как текста и страницу 500.

## Заключение

Prop drilling показан на цепочке из пяти компонентов и устранён контекстами темы, языка и избранного, а блок решения стоит рядом с проблемой. Бизнес-логика вынесена в чистый редьюсер, состояние и `dispatch` доступны в любом компоненте через хуки `useTheme`, `useLanguage`, `useFavorites` и `useFavoritesDispatch`, избранное сохраняется между сессиями.

## Ответы на контрольные вопросы

25. **Можно ли использовать `useReducer` без Context?** Да, для локального состояния одного компонента, например формы или счётчика: `const [n, dispatch] = useReducer(r, 0)`.
26. **Чем Context плюс `useReducer` отличается от Redux?** Для малых проектов проще и без зависимостей, но нет инструментов отладки, промежуточных слоёв и точных подписок, как в Redux.
27. **Как получить только `dispatch`?** Вынести `dispatch` в отдельный контекст, тогда компонент не перерисовывается при смене состояния. Так сделано в проекте через `useFavoritesDispatch`.

## Приложение А (обязательное) Ключевые части кода

```jsx
// PropDrilling.jsx: userName проходит через компоненты, которым он не нужен
<DrillingHeader userName={userName} />
// DrillingHeader → Navigation → UserMenu → UserAvatar
```

```jsx
// PropDrilling.jsx: решение, имя берётся из контекста
<UserContext.Provider value={userName}>
  <ContextHeader />
</UserContext.Provider>
// ContextAvatar: const userName = useUser();
```

```jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const THEME_KEY = 'dslkit.theme';

const ThemeContext = createContext(null);

const systemTheme = () => (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

// A saved choice wins, otherwise the system preference decides (light first, as on the Part 1 site).
// Anything else in storage is ignored.
export function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage is blocked: use the system preference.
  }
  return systemTheme();
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme);
  const chosen = useRef(false);

  // The root attribute lets the colour tokens of dslkit.css switch the whole page.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(() => {
    // Only the two known themes are accepted, anything else is ignored.
    const setTheme = (next) => {
      if (next !== 'light' && next !== 'dark') return;
      chosen.current = true;
      setThemeState(next);
    };
    // The functional update makes two toggles in a row flip twice, not once.
    const toggleTheme = () => {
      chosen.current = true;
      setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
    };
    return { theme, setTheme, toggleTheme };
  }, [theme]);

  // Only a choice made by the user is stored, so the system preference is still followed until then.
  useEffect(() => {
    if (!chosen.current) return;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // The choice lives in memory only.
    }
  }, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Outside the provider there is no value to read: fail with a message that names the provider.
export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
};
```

```jsx
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { TEMPLATES } from '../data/templates';
import limits from '../limits.json';

export const FAVORITES_KEY = 'dslkit.favorites';
export const MAX_QTY = limits.maxQty;
export const MAX_HISTORY = limits.maxHistory;

// Quantity is always a whole number from 1 to MAX_QTY, anything else is replaced by the nearest valid value.
export function clampQty(value) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return 1;
  return Math.min(MAX_QTY, Math.max(1, number));
}

const changeQty = (state, id, next) => state.map((item) => (item.id === id ? { ...item, qty: clampQty(next(item.qty)) } : item));

const isTemplateId = (id) => TEMPLATES.some((template) => template.id === id);

// State is an array of { id, qty }. Every action returns a new array and never mutates the old one.
// A missing action, a null state and an id that is not a template are ignored instead of stored.
export function favoritesReducer(current, action) {
  const state = Array.isArray(current) ? current : [];
  switch (action?.type) {
    case 'ADD':
      if (!isTemplateId(action.id) || state.some((item) => item.id === action.id)) return state;
      return [...state, { id: action.id, qty: 1 }];
    case 'REMOVE':
      return state.filter((item) => item.id !== action.id);
    case 'TOGGLE':
      if (!isTemplateId(action.id)) return state;
      return state.some((item) => item.id === action.id) ? state.filter((item) => item.id !== action.id) : [...state, { id: action.id, qty: 1 }];
    case 'INCREMENT':
      return changeQty(state, action.id, (qty) => qty + 1);
    case 'DECREMENT':
      return changeQty(state, action.id, (qty) => qty - 1);
    case 'SET_QTY':
      return changeQty(state, action.id, () => action.qty);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

// localStorage can hold anything: keep only known template ids, once each, with a valid quantity.
// A plain id (the format of the first version) is accepted as quantity 1.
export function sanitizeFavorites(value) {
  if (!Array.isArray(value)) return [];
  const known = new Set(TEMPLATES.map((template) => template.id));
  const seen = new Set();
  const result = [];
  for (const entry of value) {
    const isObject = entry !== null && typeof entry === 'object' && !Array.isArray(entry);
    const id = isObject ? entry.id : entry;
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, qty: isObject ? clampQty(entry.qty) : 1 });
  }
  return result;
}

function loadFavorites() {
  try {
    return sanitizeFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY)));
  } catch {
    return [];
  }
}

// Undo and redo around any reducer: the state is { past, present, future }, the wrapped reducer only sees `present`.
// An action that changes nothing (the reducer returns the same array) leaves no step in the history, a new change clears the redo steps.
export const withHistory = (reducer, limit = MAX_HISTORY) => (state, action) => {
  if (action?.type === 'UNDO') {
    if (state.past.length === 0) return state;
    return { past: state.past.slice(0, -1), present: state.past.at(-1), future: [state.present, ...state.future] };
  }
  if (action?.type === 'REDO') {
    if (state.future.length === 0) return state;
    return { past: [...state.past, state.present].slice(-limit), present: state.future[0], future: state.future.slice(1) };
  }
  const present = reducer(state.present, action);
  if (present === state.present) return state;
  return { past: [...state.past, state.present].slice(-limit), present, future: [] };
};

const favoritesWithHistory = withHistory(favoritesReducer);
const initialHistory = () => ({ past: [], present: loadFavorites(), future: [] });

// Two contexts: the data changes often, dispatch never changes.
// A component that only sends actions subscribes to the second one and is not re-rendered when the data changes.
const FavoritesStateContext = createContext(null);
const FavoritesDispatchContext = createContext(null);
// Whether undo and redo have a step: only the two buttons subscribe to it.
const FavoritesHistoryContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [state, dispatch] = useReducer(favoritesWithHistory, undefined, initialHistory);
  const favorites = state.present;
  const history = useMemo(() => ({ canUndo: state.past.length > 0, canRedo: state.future.length > 0 }), [state.past.length, state.future.length]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Storage is blocked or full: the state still works in memory.
    }
  }, [favorites]);

  return (
    <FavoritesStateContext.Provider value={favorites}>
      <FavoritesDispatchContext.Provider value={dispatch}>
        <FavoritesHistoryContext.Provider value={history}>{children}</FavoritesHistoryContext.Provider>
      </FavoritesDispatchContext.Provider>
    </FavoritesStateContext.Provider>
  );
}

// Outside FavoritesProvider there is no value to read: fail with a message that names the provider.
const insideProvider = (value, hook) => {
  if (value === null) throw new Error(`${hook} must be used inside FavoritesProvider`);
  return value;
};

export const useFavorites = () => insideProvider(useContext(FavoritesStateContext), 'useFavorites');
export const useFavoritesHistory = () => insideProvider(useContext(FavoritesHistoryContext), 'useFavoritesHistory');
export const useFavoritesDispatch = () => insideProvider(useContext(FavoritesDispatchContext), 'useFavoritesDispatch');
```

```jsx
// Templates.jsx: данные и dispatch берутся из разных контекстов
const favorites = useFavorites();
const dispatch = useFavoritesDispatch();
dispatch({ type: 'INCREMENT', id: template.id });
```
