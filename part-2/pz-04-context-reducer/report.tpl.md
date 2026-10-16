# Практическое занятие №4. Управление состоянием приложения

## 1 Цель работы

Освоить глобальное управление состоянием в React с помощью Context API и хука `useReducer`: показать проблему prop drilling, решить её контекстами и реализовать бизнес-логику проекта DSLKit, веб-редактора диаграмм как кода (направление SaaS), в виде редьюсера и провайдера.

## 2 Ход работы

### 2.1 Проблема prop drilling

Иерархия `PropDrilling` → `DrillingHeader` → `Navigation` → `UserMenu` → `UserAvatar` передаёт имя пользователя через все уровни, хотя использует его только `UserAvatar`. Три промежуточных компонента получают `userName` лишь ради передачи дальше, поэтому любое изменение данных требует правок во всей цепочке. Код приведён в приложении А.

### 2.2 Контексты темы и языка

`ThemeProvider` хранит тему в `useState`, переключает её функцией `toggleTheme` и записывает в атрибут `data-theme` корневого элемента, а CSS-переменные меняют цвета всей страницы. `LanguageProvider` хранит язык и словарь на русском и английском, компоненты получают функцию `t(key)` и не принимают тексты через props. Значения контекстов обёрнуты в `useMemo`, чтобы потребители не перерисовывались без изменения данных.

### 2.3 Избранное на useReducer и Context

Предметная область: избранные шаблоны диаграмм. Состояние это массив идентификаторов. Редьюсер обрабатывает действия `ADD` (без дублей), `REMOVE`, `TOGGLE` и `CLEAR`, возвращает новый массив и не изменяет прежний, неизвестное действие оставляет состояние без изменений. `FavoritesProvider` отдаёт `favorites` и `dispatch`, поэтому карточка шаблона и панель «Избранное» работают с одним состоянием без передачи через props. Список сохраняется в `localStorage` эффектом и читается ленивым инициализатором `useReducer`. Неверный формат и недоступное хранилище не ломают приложение.

### 2.4 Тестирование

Десять автоматических тестов проверяют редьюсер как чистую функцию, переключение темы и языка, добавление, удаление и очистку избранного, восстановление после перезагрузки, повреждённые данные, ошибку записи в хранилище и демонстрацию prop drilling.

## Заключение

Prop drilling показан на цепочке из пяти компонентов и устранён контекстами темы, языка и избранного. Бизнес-логика вынесена в чистый редьюсер, состояние и `dispatch` доступны в любом компоненте через хуки `useTheme`, `useLanguage` и `useFavorites`, избранное сохраняется между сессиями.

## Приложение А – Ключевые части кода

```jsx
// PropDrilling.jsx: userName проходит через компоненты, которым он не нужен
<DrillingHeader userName={userName} />
// DrillingHeader → Navigation → UserMenu → UserAvatar
```

```jsx
// ThemeContext.jsx: провайдер темы
const [theme, setTheme] = useState('light');
const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
useEffect(() => {
  document.documentElement.dataset.theme = theme;
}, [theme]);
```

```jsx
// FavoritesContext.jsx: редьюсер и провайдер
export function favoritesReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return state.includes(action.id) ? state : [...state, action.id];
    case 'REMOVE':
      return state.filter((id) => id !== action.id);
    case 'TOGGLE':
      return state.includes(action.id) ? state.filter((id) => id !== action.id) : [...state, action.id];
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

const [favorites, dispatch] = useReducer(favoritesReducer, undefined, loadFavorites);
```

```jsx
// Templates.jsx: любой компонент читает состояние хуком
const { favorites, dispatch } = useFavorites();
dispatch({ type: 'TOGGLE', id: template.id });
```
