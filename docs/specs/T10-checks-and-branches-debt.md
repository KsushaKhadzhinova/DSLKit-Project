# T10 Долг по проверкам и веткам / Checks and branches debt

Агент: sonnet. Ветки: `chore/…` по одной на подпункт, короткие PR.

## RU

**Подпункты.**

1. **`// @ts-nocheck`**: 50 файлов. Убирать по группам, исправляя типы; не ослаблять `tsconfig`. Один PR на группу, счётчик в отчёте.
2. **Firefox как обязательная проверка**: стабилизировать e2e в Firefox, затем предложить владельцу добавить проверку в `main protection` (правило меняет только владелец).
3. **Пороги покрытия для 10 папок `part-2`**: измерить, выбрать реалистичные пороги, включить в `npm test` каждой папки.
4. **Ветки `design/*`, `docs/*`, `feature/*`, `feat/lab3-advanced-auth`, `lab12-hardening`**: для каждой diff против `main`, что не влито; таблица «влить / закрыть / оставить» для решения владельца. Ничего не удалять без решения.

**Критерии готовности.** Каждый подпункт закрыт отдельным PR или решением владельца; `docs/BRANCHES.md` и `docs/CI-CHECKS.md` обновлены (RU и EN); CI зелёный.

## EN

**Sub-items.** (1) Remove `@ts-nocheck` from 50 files by group, fixing types, without loosening `tsconfig`. (2) Stabilise Firefox e2e, then propose it as a required check (owner changes the ruleset). (3) Measure and enforce coverage thresholds for the 10 `part-2` folders. (4) Diff each stale branch family against `main`, tabulate merge/close/keep for the owner; delete nothing without a decision.

**Done.** Each sub-item closed by its own PR or an owner decision; `BRANCHES` and `CI-CHECKS` updated in RU and EN; CI green.
