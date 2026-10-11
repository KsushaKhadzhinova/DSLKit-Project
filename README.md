# DSLKit Project Files

Дипломный проект БГУИР — Ксения Хаджинова

## Структура папки

```
DSLKit-Project/
├── README.md              ← этот файл
├── PROJECT-OVERVIEW.md    ← СТАРТ ЗДЕСЬ: весь проект, история чатов, что готово и что делать
├── HANDOVER.md            ← handover предыдущего этапа (исторический)
├── TODO.md                ← список задач (срочные сверху)
├── DESIGN-TOKENS.md       ← CSS токены light/dark темы
├── UX-RESEARCH-RESULTS.md ← оценки персон + A/B тесты
└── mockups/
    ├── dslkit-mockup.html         ← первичный макет IDE
    ├── dslkit-mockup-v2.html      ← улучшенный макет (MAIN)
    ├── dslkit-100-ab-tests.html   ← 100 A/B тестов с визуальными примерами
    ├── dslkit-quiz.html           ← A/B тест batch 1-3
    ├── dslkit-layouts.html        ← сравнение layout вариантов
    └── ab-src/                    ← исходники A/B страницы (build.py)
```

## Быстрый старт

1. Открой **PROJECT-OVERVIEW.md**: там вся картина.
2. Приоритеты в **TODO.md**.
3. Токены в **DESIGN-TOKENS.md**.
4. Основной макет: `mockups/dslkit-mockup-v2.html`.
5. A/B тесты: открой `mockups/dslkit-100-ab-tests.html`; после правок в `mockups/ab-src/` пересобери `python mockups/ab-src/build.py`.

## Ближайшие задачи

1. Пройти 100 A/B тестов и зафиксировать решения.
2. Accessibility (aria-labels, role="switch", focus rings).
3. Онбординг и пустое состояние с шаблонами нотаций.
4. Figma-макеты (нужен доступ), затем разработка по плану из PROJECT-OVERVIEW.md.
