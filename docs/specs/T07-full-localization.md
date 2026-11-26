# T07 Полная локализация RU/EN / Full RU/EN localization

Агент: sonnet. Ветка: `feat/full-i18n`. После T03, T05, T06 (чтобы не переводить дважды).

## RU
**Цель.** Весь проект без непереведённых строк на русском и английском.

**Шаги.**
1. Инвентаризация: поиск жёстко прописанных строк в `site/js`, HTML, сообщениях об ошибках, шаблонах, подписях доступности, `README`.
2. Один словарь на язык; ключи без дублей; проверка тестом, что наборы ключей RU и EN совпадают и в коде нет литералов вне словаря.
3. Форматирование дат, чисел и множественных форм по языку.
4. Серверные ответы (T04) отдают код ошибки, перевод на клиенте.
5. Переключатель языка сохраняется, `lang` на `<html>` и `hreflang` корректны.

**Тесты.** Паритет ключей, отсутствие литералов, e2e на обоих языках; покрытие 100%.

**Критерии готовности.** `verify` зелёный; отчёт об инвентаризации; PR влит.

**Вне задачи.** Третий язык.

## EN
**Goal.** No untranslated strings anywhere, in Russian and English.

**Steps.** Inventory hard-coded strings; one dictionary per language with a parity test and a no-literals check; locale-aware dates, numbers and plurals; server errors return codes translated on the client; persisted language switch with correct `lang`/`hreflang`.

**Tests.** Key parity, no literals, e2e in both languages, 100% coverage.

**Done.** `verify` green; inventory report; PR merged. **Out of scope:** a third language.
