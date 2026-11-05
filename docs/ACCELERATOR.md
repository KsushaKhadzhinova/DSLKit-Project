# Accelerator в проекте DSLKit

Английская версия: [`ACCELERATOR.en.md`](ACCELERATOR.en.md). Документ для любого, кто продолжает работу в новом диалоге с другим ИИ: что такое Accelerator, что здесь установлено, почему выбраны именно эти навыки и как всё воспроизвести.

Дата установки: 4 ноября 2026. Каталог закреплён на `refs/tags/v1.4.1`, команда `accelerator` версии 0.18.0.

## 1 Что это

Accelerator ставит в проект подобранный набор навыков для ИИ-агентов. Навык (skill) это файл `SKILL.md`, из которого агент узнаёт, как делать один вид задач. Порядок работы:

1. `scan` читает проект и пишет черновик профиля (`.accelerator/profile.draft.json`).
2. Анкета (навык `accelerator-setup`) дополняет то, что скан знать не может, и завершает профиль (`.accelerator/profile.json`).
3. `accelerator install` читает профиль и копирует выбранные навыки в `.claude/skills/`. Он ничего не спрашивает и не использует ИИ: один и тот же профиль даёт один и тот же набор.

Ответ «да» на тему анкеты только открывает её карточки и ничего не ставит. Ставятся только id, выбранные явно.

## 2 Что результат скана

| Поле          | Значение                     |
| ------------- | ---------------------------- |
| языки         | javascript                   |
| фреймворки    | docker                       |
| тест-раннер   | не определён                 |
| пакетный мен. | npm                          |
| структура     | обычный проект (не монорепо) |
| CI            | github-actions               |
| агенты        | claude-code                  |

Скан не увидел React: `react-app/` лежит во вложенной папке. Это не влияет на выбор, потому что выбраны только карточки без привязки к React.

## 3 Что установлено

Проектные навыки (18 выбранных и 1 обязательный `DOCKER-DATA-LOSS-CONFIRMATION`, он ставится всегда при наличии Docker). Лежат в `.claude/skills/`, закоммичены, доступны всем:

- Процесс (в духе курса: требования, план, выполнение, проверка): `REQUIREMENTS-BRAINSTORMING`, `IMPLEMENTATION-PLANNING`, `PLAN-EXECUTION`, `COMPLETION-VERIFICATION`.
- Качество: `CODE-CHANGE-REVIEW`, `TEST-DESIGN-REVIEW`, `ERROR-DIAGNOSIS`, `REFACTOR-STEP-PLANNING`.
- Документация: `PROJECT-DOCUMENTATION`, `CODE-COMMENT-WRITING`, `PROJECT-ADAPTATION`.
- Docker и безопасность: `DOCKER-COMPOSE-LOCAL-STACK`, `DOCKER-IMAGE-BUILD`, `DOCKER-DATA-LOSS-CONFIRMATION`, `SENSITIVE-DATA-HANDLING`.
- Данные и пайплайны: `DATA-QUALITY-CONTROLS`, `DATA-INCIDENT-TRACING`, `PIPELINE-CHECK-SELECTION`, `PIPELINE-OUTPUT-REVIEW`.

Личные навыки (4), у владельца локально, в репозиторий не попадают: `DAILY-STANDUP-UPDATE`, `TECHNICAL-PROSE-EDITING`, `REQUEST-REFINEMENT`, `RECENT-DISCUSSION-RESEARCH`.

## 4 Какие файлы где

| Файл                               | В git | Зачем                                                  |
| ---------------------------------- | ----- | ------------------------------------------------------ |
| `.accelerator/profile.json`        | да    | Завершённый профиль проекта: стек, темы, выбранные id. |
| `.accelerator/registry.json`       | да    | Что поставил `install` и по какой причине.             |
| `.claude/skills/<ID>/SKILL.md`     | да    | Сами навыки.                                           |
| `.accelerator/profile.user.json`   | нет   | Личный выбор владельца (4 id выше), только локально.   |
| `.accelerator/registry.user.json`  | нет   | Реестр личных навыков.                                 |
| `.accelerator/profile.draft.json`  | нет   | Черновик скана, пересоздаётся.                         |
| `.accelerator/catalog-topics.json` | нет   | Карточки каталога для анкеты, пересоздаётся.           |

Локальное правило `.git/info/exclude` скрывает `.accelerator/`. Закоммиченные файлы из этой папки добавлены через `git add -f`.

## 5 Почему такой выбор (источники)

- Курс «AI for Developers mid 2026» (Innowise LMS, конспект в `E:\ai-courses\course1_AI_for_Developers_mid_2026.md`). Три фундамента курса: meta-prompting, context engineering, spec-driven development. Поэтому выбраны все навыки процесса (требования, план, выполнение, проверка), навык `REQUEST-REFINEMENT` близок к мета-промптингу, а `PROJECT-ADAPTATION` вписывает навыки в репозиторий, как в разделе про инструкции для агентов. В курсе Accelerator назван собственным фреймворком для Claude Code (раздел Applied Practices).
- Комплект сертификации (`E:\accelerator-kit`, упражнения 01 и 02). Главные уроки: профиль коммитят и проверяют человеком; тема только открывает карточки; `install` молча отбрасывает id, чьи условия `applies_to` не подходят профилю, поэтому ответы анкеты должны быть верными; не добавлять в стек то, чего нет (в упражнении это Snowflake).
- Правила владельца из [`PROJECT-STATE.md`](PROJECT-STATE.md): коммиты без отметок об инструментах, сообщения на английском, документы на русском и английском.
- Тема `database-administration` в каталоге содержит только навыки Snowflake. В проекте Snowflake нет, поэтому они не выбраны и в стек не добавлялись.
- Данные-карточки (пайплайны, качество данных) в основном про dbt и Python. Они выбраны по просьбе владельца и для DSLKit применимы мало. Если захочется сократить набор, уберите id из `selected_artifacts` и выполните `accelerator install`.

## 6 Как воспроизвести или изменить

Нужны PowerShell 7 и команда `accelerator` в PATH (установщик: `E:\accelerator-kit\installation`, руководство `installation-guide.md`).

```bash
accelerator install
```

Для изменения набора правьте `selected_artifacts` в `.accelerator/profile.json` и снова запускайте команду, либо вызовите навык `accelerator-setup` в Claude Code. Чтобы вернуть личные навыки на новой машине, создайте `.accelerator/profile.user.json`:

```json
{
  "schema_version": "1",
  "toolset_ref": "refs/tags/v1.4.1",
  "selected_artifacts": ["DAILY-STANDUP-UPDATE", "RECENT-DISCUSSION-RESEARCH", "REQUEST-REFINEMENT", "TECHNICAL-PROSE-EDITING"]
}
```

Обновление версии каталога: новый тег `vX.Y.Z` в `toolset_ref` обоих профилей и повторная установка. Ветки и короткие SHA в `toolset_ref` недопустимы.

## 7 Адаптация под проект

5 ноября 2026 навык `PROJECT-ADAPTATION` дописал в конец `SKILL.md` каждого из 18 проектных навыков раздел «Project context» между маркерами `<!-- >>> project adaptation >>> -->` и `<!-- <<< project adaptation <<< -->`: команды проверки, пути, правила владелицы. Команды прочитаны из конфигурации и не запускались. У навыков Docker и данных (`DOCKER-*`, `DATA-*`, `PIPELINE-*`) в этой ветке пока нет предмета: Dockerfile лежат в других ветках (`course-app`, `lab12`, `25`), хранилища данных нет, раздел говорит, что именно к ним относится сейчас и что подтвердить у владелицы.

Что это значит для установщика:

- `accelerator update` считает адаптированные копии изменёнными вручную, не обновляет их и сообщает об этом при каждом запуске.
- `accelerator update -Force` и повторный `accelerator install` заменяют копии версией каталога, раздел «Project context» пропадает. Тогда запустите адаптацию снова (текст из git служит исходными данными).
