# DSLKit TODO

## 🔴 Срочно (следующий чат)

- [ ] **Sticky header** — `position: sticky; top: 0; z-index: 100` на toolbar в IDE макете
- [ ] **100 A/B тестов** — создать HTML с ~100 вопросами, открыть в браузере
- [ ] **P1 fix**: модальный диалог при закрытии таба с несохранёнными изменениями
- [ ] **P2 fix**: `Run` кнопка disabled когда в error panel есть ошибки

## 🟡 Accessibility (WCAG)

- [ ] `aria-label` на все иконки toolbar
- [ ] `role="switch"` + `aria-checked` на Autosave toggle
- [ ] Видимые focus rings: `outline: 2px solid var(--ac)`
- [ ] Canvas keyboard navigation (Tab, Arrow keys)

## 🔵 UX улучшения

- [ ] Empty state с шаблонами нотаций ("Start Here")
- [ ] Onboarding hints (non-blocking overlay)
- [ ] Autocomplete / IntelliSense для DSL синтаксиса
- [ ] Tooltip с примером для каждой нотации

## ⬜ Отложено

- [ ] Figma файл (нужен PAT token или Figma MCP)
- [ ] Mobile responsive варианты
- [ ] Moodboard
- [ ] Варианты логотипа DSLKit
- [ ] Collaborative editing
- [ ] Mermaid export
- [ ] CLI режим

## ✅ Завершено

- [x] Light theme токены (все WCAG AA)
- [x] Dark theme токены (tx3 исправлен)
- [x] Layout с golden ratio φ=1.618
- [x] Autosave toggle pattern
- [x] A/B тесты batches 1-5 (~49 вопросов)
- [x] 12-агентная оценка с SUS
- [x] Улучшенный макет IDE v2
- [x] Иконки middle ground 1.25px/17px
