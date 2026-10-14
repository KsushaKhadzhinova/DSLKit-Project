# Лабораторная работа №7. Создание компонентного интерфейса с использованием React

## 1 Цель работы

Освоить компонентный подход в React, JSX и передачу данных через `props` на примере проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS и будущему курсовому проекту, и подготовить компонентную базу для следующих работ.

## 2 Краткие теоретические сведения

**Компонентный подход.** Интерфейс собирается из небольших независимых частей, у каждой из которых своя разметка, стили и логика. Компонент принимает данные через `props` и возвращает описание интерфейса, поэтому его можно переиспользовать и проверять отдельно.

**JSX.** Это расширение синтаксиса JavaScript, похожее на HTML. Отличия: вместо `class` пишется `className`, вместо `for` пишется `htmlFor`, атрибуты записываются в стиле camelCase, например `onClick`, любое выражение вставляется в фигурных скобках, а каждый тег должен быть закрыт.

**SPA и Virtual DOM.** Одностраничное приложение загружается один раз и меняет содержимое без перезагрузки страницы. React хранит в памяти лёгкую копию дерева интерфейса (Virtual DOM), при изменении сравнивает старую и новую копии и обновляет в настоящем DOM только отличающиеся узлы.

**React, Vue и Angular.** React предоставляет библиотеку для интерфейса и оставляет выбор остальных инструментов разработчику. Vue даёт прогрессивный фреймворк с шаблонами и более мягкой кривой обучения. Angular является полным фреймворком с TypeScript, внедрением зависимостей и жёсткой структурой.

## 3 Ход работы

### 3.1 Окружение и структура проекта

Работа выполнена в ветке `feature/react-components`, приложение находится в папке `react-app`. Проект создан на Vite, установлены `react`, `react-dom` и `react-router-dom`, который в этой работе не используется. Структура папок соответствует условию и показана в таблице 1.

Таблица 1 – Компоненты приложения DSLKit

| Компонент | Группа | Назначение |
|---|---|---|
| `Button` | ui | Универсальная кнопка с вариантами `primary` и `quiet` |
| `Card` | ui | Контейнер с заголовком, содержимое приходит через `children` |
| `Badge` | ui | Метка статуса, цвет задаёт пропс `tone` |
| `Header` | layout | Название, ссылки на разделы, кнопка записи в бету |
| `Footer` | layout | Подвал с годом и владельцем из пропсов |
| `NotationCard` | features | Карточка нотации из `Card` и `Badge` с примером кода |
| `NotationList` | features | Список карточек нотаций |
| `ProjectCard` | features | Карточка проекта с кнопкой «Открыть» |
| `ProjectList` | features | Список проектов с выбором нотации |
| `PlanCard` | features | Тариф с ценой, возможностями и кнопкой «Выбрать» |

### 3.2 Базовые компоненты и композиция

Базовые компоненты `Button`, `Card` и `Badge` ничего не знают о предметной области. `Button` принимает вариант, обработчик и остальные атрибуты через оператор `...props`. `Card` выводит необязательный заголовок и вставляет `children` внутрь блока. Предметные компоненты собираются из них: `NotationCard` состоит из `Card` и `Badge`, а `ProjectCard` добавляет к ним `Button`. Такая иерархия показана в приложениях А и Б.

### 3.3 Props, списки и условный рендеринг

Данные идут только сверху вниз. Корневой компонент передаёт `ProjectList` массив проектов, список нотаций и обработчики, а тот передаёт каждому `ProjectCard` один проект. Списки выводятся методом `map`, и у каждого элемента есть `key` с уникальным `id`. Условный рендеринг применён в `Card` (заголовок выводится только если он передан), в `ProjectCard` (метка «Общий доступ» только для общих проектов) и в списках (сообщение при пустом массиве). Вычисляемые значения вставляются выражениями в фигурных скобках, например `formatDate(project.updated)`.

### 3.4 Моковые данные и обработчики

В папке `data` лежат три массива: шесть нотаций, восемь проектов и три тарифа. Состояния в приложении нет, поэтому обработчики являются заглушками: нажатие кнопок и смена выбора нотации пишут сообщение в консоль через `console.log`. Выбор нотации в списке проектов только сообщает о значении родителю и не фильтрует список, потому что для этого нужно состояние, которое появится в следующей работе.

### 3.5 Стилизация и проверка на разных экранах

Для компонентов созданы CSS-модули, а общие токены золотого сечения, размеры и цвета лежат в `index.css`. Сетка карточек меняет число колонок на 576 и 1024 пикселях по принципу mobile first. Результат на экране шириной 375 пикселей показан на рисунке 1.

![Приложение на экране шириной 375 пикселей](figures/mobile-375.jpg)

Рисунок 1 – Мобильная версия: карточки идут в одну колонку, шапка переносится

На планшете шириной 768 пикселей карточки занимают две колонки, как показано на рисунке 2.

![Приложение на экране шириной 768 пикселей](figures/tablet-768.jpg)

Рисунок 2 – Планшет: две колонки карточек

На экране шириной 1280 пикселей карточки занимают три колонки, как показано на рисунке 3.

![Приложение на экране шириной 1280 пикселей](figures/desktop-1280.jpg)

Рисунок 3 – Компьютер: три колонки карточек

### 3.6 Тестирование

Автоматический тест читает исходные файлы и проверяет структуру папок, число компонентов, функциональную форму компонентов, размер моковых данных, наличие `key` в списках, заглушки обработчиков, CSS-модули и отсутствие `useState` и `useEffect`. Работа приложения дополнительно проверена в Chrome: консоль не содержит ошибок, четыре заглушки пишут сообщения в консоль. Снимок вкладки Components инструмента React DevTools и проверка в Firefox и Edge остаются задачей на этап приёмки.

### 3.7 Фиксация изменений

Коммит с реализацией: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/f4a22b1. Сообщение коммита: `feat(react): add the DSLKit component library with mock data, props and CSS modules on Vite`.

## Заключение

Для проекта DSLKit создано приложение на Vite и React с десятью компонентами: базовыми, макета и предметными. Данные передаются через `props`, списки выводятся с `key`, условный рендеринг и композиция применены в нескольких местах, а обработчики являются заглушками. Правило об отсутствии `useState` и `useEffect` проверяется автоматическим тестом, а вёрстка подтверждена на трёх ширинах экрана. Остаётся приложить снимок React DevTools и проверить приложение в Firefox и Edge.

## Приложение А – Листинг файла Button.jsx

```jsx
import styles from './Button.module.css';

// Universal button: the look comes from `variant`, everything else is passed to the native element.
function Button({ children, onClick, variant = 'primary', type = 'button', ...props }) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

export default Button;
```

## Приложение Б – Листинг файла Card.jsx

```jsx
import styles from './Card.module.css';

// Container with an optional title; the content arrives through `children`.
// `headingLevel` keeps the heading order of the page correct (h2 under h1, h3 under h2).
function Card({ children, title, className = '', headingLevel: Heading = 'h3' }) {
  return (
    <article className={`${styles.card} ${className}`.trim()}>
      {title && <Heading className={styles.title}>{title}</Heading>}
      <div className={styles.content}>{children}</div>
    </article>
  );
}

export default Card;
```

## Приложение В – Листинг файла NotationCard.jsx

```jsx
import { NOTATION_STATUSES } from '../../data/notations';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import styles from './features.module.css';

// Composite component: a Card with a Badge and a code example, built from simpler parts.
function NotationCard({ notation }) {
  const isBeta = notation.status === 'beta';
  return (
    <Card title={notation.code} headingLevel="h2">
      <Badge tone={isBeta ? 'success' : 'warning'}>{NOTATION_STATUSES[notation.status]}</Badge>
      <p>{notation.title}</p>
      <code className={styles.code}>{notation.example}</code>
    </Card>
  );
}

export default NotationCard;
```

## Приложение Г – Листинг файла ProjectList.jsx

```jsx
import { filterByNotation } from '../../utils/helpers';
import ProjectCard from './ProjectCard';

// The list is filtered by the `notation` prop. There is no state in this lab, so the select only sets its first value and reports changes; the next lab connects it to the list.
function ProjectList({ projects, notation = 'all', notations = [], onOpen, onFilterChange }) {
  const visible = filterByNotation(projects, notation);
  return (
    <div className="project-list">
      <div className="section__head">
        <h2 id="projects-title">Проекты</h2>
        <div className="toolbar">
          <label htmlFor="project-filter">Нотация</label>
          <select id="project-filter" defaultValue={notation} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">Все</option>
            {notations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      {visible.length === 0 ? (
        <p>Проектов не найдено.</p>
      ) : (
        <ul className="grid" data-testid="project-list">
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectList;
```

## Приложение Д – Листинг файла App.jsx

```jsx
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';
import NotationList from './components/features/NotationList';
import PlanCard from './components/features/PlanCard';
import ProjectList from './components/features/ProjectList';
import { mockNotations } from './data/notations';
import { mockPlans } from './data/plans';
import { mockProjects } from './data/projects';

const LINKS = [
  { href: '#notations', label: 'Нотации' },
  { href: '#projects', label: 'Проекты' },
  { href: '#plans', label: 'Тарифы' },
];

const PROJECT_NOTATIONS = [...new Set(mockProjects.map((project) => project.notation))];

// Handlers are stubs for this lab: they only write to the console because the state arrives in the next lab.
const handleSignup = () => console.log('Запись в бету');
const handleOpen = (project) => {
  console.group(`Открыт проект: ${project.name}`);
  console.table(project);
  console.groupEnd();
};
const handleFilter = (notation) => console.log('Выбрана нотация:', notation);
const handleChoose = (plan) => console.log('Выбран тариф:', plan.name);

function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        К основному содержимому
      </a>
      <Header title="DSLKit" links={LINKS} onSignup={handleSignup} />
      <main className="page" id="main">
        <section id="notations" aria-labelledby="notations-title">
          <div className="section__head">
            <h1 id="notations-title">Диаграммы как код</h1>
          </div>
          <NotationList notations={mockNotations} />
        </section>
        <section id="projects" aria-labelledby="projects-title">
          <ProjectList projects={mockProjects} notations={PROJECT_NOTATIONS} onOpen={handleOpen} onFilterChange={handleFilter} />
        </section>
        <section id="plans" aria-labelledby="plans-title">
          <h2 id="plans-title">Тарифы</h2>
          <ul className="grid">
            {mockPlans.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} onChoose={handleChoose} />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer owner="DSLKit" year={2026} />
    </>
  );
}

export default App;
```
