# DSLKit TODO

Полная картина и контекст: `PROJECT-OVERVIEW.md`.

## 🔴 Срочно

- [ ] Отправить ветку на GitHub и слить в основную
- [ ] Пройти 100 A/B тестов (`mockups/dslkit-100-ab-tests.html`), сохранить итог в `docs/ab-results/`
- [ ] Снять противоречия в требованиях (раздел 9 в PROJECT-OVERVIEW.md)

## 🟡 Accessibility (WCAG)

- [ ] `aria-label` на все иконки тулбара и Activity bar
- [ ] `role="switch"` + `aria-checked` на Autosave toggle
- [ ] Видимые focus rings: `outline: 2px solid var(--ac)`
- [ ] Canvas keyboard navigation (Tab, Arrow keys)
- [ ] Цель клика × вкладки не меньше 24 px

## 🔵 UX улучшения

- [ ] Empty state с шаблонами нотаций ("Start Here")
- [ ] Onboarding hints (non-blocking overlay)
- [ ] Двусторонняя подсветка код ↔ холст
- [ ] Autocomplete / IntelliSense для DSL синтаксиса
- [ ] Tooltip с примером для каждой нотации

## ⬜ Отложено

- [ ] Figma файл (нужен PAT token или Figma MCP): вайрфреймы, мокапы, макеты, мудборд, логотип, шрифты
- [ ] Mobile / tablet варианты макетов
- [ ] Collaborative editing
- [ ] Mermaid export
- [ ] CLI режим
- [ ] Реальный юзабилити-тест на 3–5 людях (SUS, UMUX, TSR)
- [ ] Разработка: DSL, ядро C++/WASM, фронтенд, бэкенд (план в PROJECT-OVERVIEW.md)

## ✅ Завершено

- [x] Light theme токены (все WCAG AA)
- [x] Dark theme токены (tx3 исправлен)
- [x] Layout с golden ratio φ=1.618
- [x] Autosave toggle pattern
- [x] A/B тесты batches 1-5 (~49 вопросов)
- [x] Оценка интерфейса 12 симулированными персонами с SUS
- [x] Улучшенный макет IDE v2
- [x] Иконки middle ground 1.25px/17px
- [x] Sticky header (toolbar и навигация макета)
- [x] P1: диалог при закрытии несохранённой вкладки
- [x] P2: Run отключается при ошибках
- [x] 100 A/B тестов с визуальными примерами интерфейса
- [x] Сводный документ PROJECT-OVERVIEW.md
