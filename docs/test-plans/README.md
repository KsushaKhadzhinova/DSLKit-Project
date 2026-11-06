# Планы тестирования, чеклисты, агенты и навыки

Английская версия: [`README.en.md`](README.en.md). Каталог собран 6 ноября 2026 на ветке `docs/test-plans-and-checklists`. Он дополняет, а не заменяет `docs/testing-kulikov/` и `testing-course/documents/`.

| Файл                                                                                           | Что внутри                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [`00-project-checklist.md`](00-project-checklist.md)                                           | Общий чеклист: сделано, в процессе, ждёт владелицу, запланировано, не планируется                                   |
| [`01-test-strategy.md`](01-test-strategy.md)                                                   | Стратегия: объекты, виды тестирования, критерии начала и окончания, порядок, метрики, риски                         |
| [`02-analytics.md`](02-analytics.md)                                                           | Аналитика: цифры, пробелы по областям, реестр рисков, противоречия источников, нестабильные тесты, критический путь |
| [`30-epics-and-tasks.md`](30-epics-and-tasks.md)                                               | 15 эпиков, 95 задач, 57 подзадач с приоритетом, исполнителем, размером и зависимостями                              |
| [`40-next-steps-and-questions.md`](40-next-steps-and-questions.md)                             | Подробные статусы по областям, план шагов, 30 вопросов к владелице, что ещё учесть                                  |
| [`50-labs-pz-tasks-and-impact.md`](50-labs-pz-tasks-and-impact.md)                             | Задачи и подзадачи по каждой ЛР и ПЗ, матрица влияния изменений, проверенные связи между копиями работ              |
| [`10-agents-and-skills.md`](10-agents-and-skills.md)                                           | Правила владелицы, агенты, работавшие раньше, агенты и навыки для этапов проверки, анализа, валидации, сдачи        |
| [`specialists/01-qa-functional.md`](specialists/01-qa-functional.md)                           | QA: функциональное, регрессионное, исследовательское                                                                |
| [`specialists/02-test-automation.md`](specialists/02-test-automation.md)                       | Автоматизация: юнит, интеграция, e2e, CI, стабильность                                                              |
| [`specialists/03-security.md`](specialists/03-security.md)                                     | Безопасность                                                                                                        |
| [`specialists/04-accessibility-ux.md`](specialists/04-accessibility-ux.md)                     | Доступность и юзабилити                                                                                             |
| [`specialists/05-performance.md`](specialists/05-performance.md)                               | Производительность и нагрузка                                                                                       |
| [`specialists/06-compatibility-localization.md`](specialists/06-compatibility-localization.md) | Совместимость, адаптивность, локализация                                                                            |
| [`specialists/07-backend-db-docker.md`](specialists/07-backend-db-docker.md)                   | API, базы данных, WebSocket, Docker (Часть 2, курсовой)                                                             |
| [`specialists/08-docs-acceptance.md`](specialists/08-docs-acceptance.md)                       | Приёмка документации и соответствие условиям                                                                        |

У каждого файла есть английская версия с суффиксом `.en.md`.

Чекбоксы в планах и чеклистах специалистов пустые: это шаблоны для прогона. Результаты записывать в протокол прогона с датой, коммитом и окружением. Числа и статусы в `00-project-checklist.md` взяты из документов репозитория и чатов на 6 ноября 2026 и могли устареть.
