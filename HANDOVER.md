# DSLKit — Handover Document
**Дата**: 2026-10-11  
**Проект**: DSLKit — Web IDE для "diagram as code"  
**Дипломный проект**: Ксения Хаджинова, БГУИР  
**Передаёт**: Claude Sonnet 4.6 → следующий чат

---

## 1. Что такое DSLKit

Веб-IDE для создания диаграмм через код (diagram-as-code). Поддерживаемые нотации:
- **IDEF0** — функциональное моделирование бизнес-процессов
- **ERD** — сущность-связь (Entity-Relationship)
- **BPMN** — бизнес-процессы
- **Petri nets** — сети Петри
- **UML** — диаграммы классов/последовательностей
- **DFD** — диаграммы потоков данных

**Стек технологий**:
- React 19 + TypeScript + Vite (PWA)
- Monaco Editor (код)
- elkjs (layout engine)
- C++ WASM (парсинг DSL)

---

## 2. Дизайн-система (финальная версия)

### Цветовые токены

#### Light theme (designed first — главный)
```css
--bg:  #f8f9fc;   /* основной фон */
--sf:  #ffffff;   /* поверхности (сайдбар, панели) */
--br:  #dde1e9;   /* бордер */
--tx:  #1c1f2e;   /* основной текст — 16.8:1 WCAG AAA */
--tx2: #4a5068;   /* вторичный текст — 7.1:1 WCAG AA */
--tx3: #6b7285;   /* третичный текст — 4.7:1 WCAG AA */
--ac:  #2563eb;   /* акцент (кнопки) — 4.9:1 WCAG AA */
--rt:  #16a34a;   /* success/run — зелёный */
```

#### Dark theme (.t-dark class)
```css
--bg:  #1e1e2e;
--sf:  #181825;
--br:  #313244;
--tx:  #cdd6f4;
--tx2: #a6adc8;
--tx3: #7f849c;   /* ИСПРАВЛЕНО: было #6c7086 (4.1:1 — fail), стало 4.6:1 — pass */
--ac:  #2563eb;
```

### Layout (Golden Ratio φ=1.618)
- Activity bar: **40px**
- Sidebar: **180px**
- Code editor: **~38.2%** остатка
- Canvas: **~61.8%** остатка (~340px)
- Status bar: **22px**

### Правило 60-30-10
- 60% — background
- 30% — surface (панели)
- 10% — accent (кнопки, индикаторы)

### Типографика
- UI: **Inter** (300/400/500/600/700)
- Код: **Geist Mono / JetBrains Mono**

### Иконки
- **Tabler Icons** outline, stroke **1.25px**, размер **17px**
- Выбрано как middle-ground между 1px (слабо) и 1.5px (жирно)

### Дизайн-язык
- Microsoft Fluent + Apple iOS fusion
- Concentric border-radius rule

---

## 3. UI Компоненты — финальные решения

### Autosave Toggle
```html
<!-- Toggle switch — такой же как переключение темы -->
<label class="switch">
  <input type="checkbox" checked>
  <span class="track"></span>
</label>
<span class="label on">Autosave: ON</span>
```
- **ON** → зелёный track, thumb вправо
- **OFF** → серый track, thumb влево → появляется жёлтая кнопка Save ●
- **НЕ** отдельные кнопки, **НЕ** pill/badge

### Tabs
- Закрытие таба: кнопка × 20px (было 12px — слишком маленькая)
- Несохранённые изменения: точка ● рядом с именем (не крестик)
- Ширина таба: от 120px

### Toolbar
- Run = зелёная заливка кнопки (filled)
- Validate = ghost кнопка
- Undo/Redo всегда видимы
- "Diagram: IDEF0" — label нотации в toolbar

### Activity Bar
- Ширина 40px
- Иконки с tooltips при наведении
- Активный элемент: accent цвет

### Error Panel
- Отображается снизу при наличии ошибок
- Закрывается кнопкой ×
- P2 bug: кнопка Run должна быть **disabled**, когда в error panel есть ошибки

---

## 4. A/B Тесты — результаты и ответы

### Batch 1–3 (предыдущие сессии)
Собраны предпочтения по 6 → 15 вопросам:
- Toolbar: icon+text vs icon-only → **icon-only с tooltips**
- Tab close: always vs hover → по предпочтению
- Canvas bg: dots vs grid → по предпочтению
- Sidebar: always vs collapse → по предпочтению

### Batch 4 (10 вопросов)
1. Auto button → **Autosave toggle switch**
2. Unsaved indicator → **● точка на табе**
3. Error panel → **снизу, закрываемый**
4. Undo/Redo → **всегда видимы**
5. Empty state → **chooser с шаблонами нотаций**
6. Run vs Validate → **Run=green filled, Validate=ghost**
7. Notation label → **"Diagram: IDEF0" в toolbar**
8. Connection style → выбор пользователя
9. Scrollbar → тонкий overlay
10. Hotkeys → показывать в tooltips

### Batch 5 (10 вопросов из находок агентов)
1. Close tab dialog → нужен modal с предупреждением (P1 bug!)
2. Run при ошибках → disabled (P2 bug!)
3. Empty state → chooser
4. IDEF0 tooltip → hover tooltip
5. Activity bar separator → color diff
6. Git badge → status bar
7. Onboarding → hints (non-blocking)
8. Collab → Share button
9. Canvas↔code sync → highlight
10. Notation tooltip → hover

---

## 5. Агентные оценки интерфейса (12 агентов)

### Зелёный свет (используют)
| Агент | Оценка | SUS |
|-------|--------|-----|
| Data Scientist | 8/10 | ~70 |
| CS Professor | 8/10 | ~72 |
| System Architect | 7.5/10 | ~68 |
| UX Student | 7.5/10 | ~65 |

### Жёлтый (нужна адаптация)
| Агент | Оценка | SUS |
|-------|--------|-----|
| DevOps Engineer | 6/10 | ~58 |
| CS Student | 6/10 | ~60 |
| Junior Dev | ~5/10 | 52 |
| QA Engineer | 5/10 | ~50 |

### Красный (не будут использовать)
| Агент | Оценка | SUS |
|-------|--------|-----|
| Senior BA | ~3/10 | 28 |
| HR Manager | ~2/10 | ~20 |
| PM (mix) | ~5/10 | ~45 |

### Ключевые находки всех агентов
1. **aria-label отсутствует** на всех иконках toolbar (WCAG Level A violation!)
2. **role="switch" + aria-checked** отсутствует на Autosave toggle
3. **Нет видимых focus rings** → keyboard navigation сломан
4. **Нет onboarding** / "Start Here" — IDEF0 не объяснён новичкам
5. **P1**: Закрытие таба без диалога подтверждения при несохранённых изменениях
6. **P2**: Run активна (зелёная) когда error panel показывает ошибки

### Прогноз после исправлений
- Learnability: 55% → 78%
- Error Prevention: 70% → 88%
- Общий SUS: 68 → 82+

---

## 6. Файлы в проекте

### Scratchpad (временные файлы сессии)
```
scratchpad/
├── dslkit-mockup.html       — первичный макет IDE
├── dslkit-quiz.html         — A/B тест (batch 1-3)
├── dslkit-mockup-v2.html    — улучшенный макет (все UX-фиксы)
└── dslkit-layouts.html      — сравнение layout вариантов
```

### Виджеты (Claude Artifacts — в браузере)
- `dslkit_ab_batch4_final` — A/B тест batch 4 + icon comparison
- `dslkit_improved_v2` — улучшенный IDE макет
- `dslkit_autosave_toggle` — паттерн autosave toggle
- `dslkit_agents_round3` — dashboard 12 агентов
- `dslkit_ab_batch5` — A/B тест batch 5

---

## 7. Незавершённые задачи

### Высокий приоритет
- [ ] **100 A/B тестов** — пользователь просил "в 10 раз больше тестов" (~100 вопросов). Создать HTML файл, открыть в браузере
- [ ] **Sticky header** — пользователь: "Хидер на сайте должен быть закреплён" → position:sticky на toolbar/header IDE
- [ ] **P1 fix**: Диалог подтверждения при закрытии таба с несохранёнными изменениями
- [ ] **P2 fix**: Disable Run button когда error panel показывает ошибки

### Accessibility (все WCAG Level A)
- [ ] aria-label на все иконки toolbar
- [ ] role="switch" + aria-checked на Autosave toggle
- [ ] Видимые focus rings (outline: 2px solid --ac)

### UX
- [ ] Onboarding / Empty state с шаблонами нотаций "Start Here"
- [ ] Диалог при закрытии таба (P1)

### Figma (заблокировано)
- [ ] Нужен Figma MCP server или PAT token
- [ ] Все макеты нужно перенести в Figma вручную

### Дополнительно
- [ ] Mobile/tablet responsive варианты
- [ ] Moodboard
- [ ] Варианты логотипа
- [ ] Аудит дизайна по 9-блочной UX/UI программе

---

## 8. Правила для следующего чата

### КРИТИЧЕСКИ ВАЖНО
- **НЕТ** AI-атрибуции в продукте или коммитах
- **НЕТ** упоминания Claude/AI в коде, комментариях или UI

### Принципы
- Clean Code + Clean Architecture
- Surgical changes — только то, что нужно
- Minimum code для решения задачи
- Без спекулятивных абстракций

### Дизайн
- Light theme — основной, dark через `.t-dark` класс
- Все WCAG AA проверены (см. токены выше)
- Golden Ratio φ=1.618 для layout
- Tabler Icons, 1.25px/17px

---

## 9. Как продолжить работу

### Следующий шаг (100 A/B тестов)
Создать `dslkit-100-ab-tests.html` с ~100 вопросами:
- Toolbar: кнопки, overflow, группировка (~15)
- Editor: line height, цвета синтаксиса, minimap, folding (~15)
- Canvas: node labels, стрелки, zoom, выделение, grid (~15)
- Tabs: overflow, breadcrumb, recent files (~10)
- Errors: высота panel, цвета severity, quick fix (~10)
- Onboarding: welcome screen, тип tutorial, шаблоны (~10)
- Settings: modal vs sidebar, shortcuts panel (~10)
- Status bar: высота, плотность, click actions (~8)
- Mobile: stacked vs split layout (~7)

И **Sticky header** в dslkit-mockup-v2.html:
```css
.toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
}
```

---

## 10. Контекст

- Пользователь: Ксения Хаджинова (kseniya.khadzhynava@innowise.com)
- Цель: Дипломный проект БГУИР
- Инструменты: Claude Code (desktop app), Claude Artifacts
- Язык общения: русский
- Стиль ответов: краткий, конкретный, без лишних объяснений
