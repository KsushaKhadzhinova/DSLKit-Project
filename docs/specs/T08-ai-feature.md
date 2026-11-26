# T08 «Добавить ИИ» / Add AI

Агент: opus или ведущий. Ветка: `feat/ai-assistant`. **Сначала уточнить объём у владельца: задача не начинается без ответа.**

## RU
**Вопросы владельцу (ответ номерами).**
1. Что входит: (а) генерация кода диаграммы из описания, (б) исправление ошибок DSL, (в) объяснение диаграммы, (г) чат-помощник?
2. Провайдер и ключ: на сервере (T04) или ключ пользователя в браузере? Ключи только в `.env`, не в репозитории.
3. Нужна ли работа без ИИ как раньше (да по умолчанию).

**Требования (после ответа).**
- Вызовы только через серверный прокси (ключ не попадает в браузер), лимиты запросов на пользователя, таймауты, отмена.
- Результат ИИ никогда не исполняется и не вставляется через `innerHTML`; код диаграммы проходит тот же разбор и очистку, предпросмотр до применения («принять / отклонить»).
- Не отправлять данные, которых пользователь не выбрал; предупреждение о том, что текст уходит внешнему сервису.
- RU/EN, доступность, деградация при недоступности сервиса.

**Тесты.** Проверки на заглушке провайдера: лимиты, ошибки, отмена, вредоносный ответ; e2e с заглушкой. Реальный провайдер только вручную владельцем.

**Критерии готовности.** `verify` и тесты сервера зелёные; безопасность проверена (`/security-review`); PR влит.

## EN
**Owner questions (answer by number).** Scope (generate / fix / explain / chat), provider and key location (server proxy vs user key; keys only in `.env`), AI stays optional.

**Requirements.** Server-side proxy, per-user limits, timeouts, cancel; AI output is never executed or injected via `innerHTML`, goes through the same parser/sanitiser with accept/reject preview; send only user-selected data with a notice; RU/EN, accessible, graceful degradation.

**Tests.** Provider stub: limits, errors, cancel, hostile output; e2e with the stub. Real provider tested manually by the owner.

**Done.** `verify` and server tests green; security review done; PR merged.
