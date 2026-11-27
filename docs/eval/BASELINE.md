# Базовая линия точности автоматизации

Числа получены командой `npm run eval` на эталонном наборе `docs/eval/` без сети и без ключа ИИ. Подробности устройства: `docs/eval/README.md`.

## Объём набора

|  |  |
| --- | --- |
| Описаний на языке | ru: 150, en: 150 |
| Диаграмм с засеянной ошибкой | 102 |
| Чистых диаграмм | 116 |
| Кодов Mermaid, PlantUML, DOT | 45 |

## Определение нотации

| Язык | top-1 | top-3 | macro-F1 | ECE |
| --- | --- | --- | --- | --- |
| ru | 59.3 % | 77.3 % | 59.5 % | 0.021 |
| en | 63.3 % | 80 % | 65 % | 0.0505 |

### По классам (точность / полнота / F1)

| Нотация | Язык | Точность | Полнота | F1 | Примеров |
| --- | --- | --- | --- | --- | --- |
| bpmn | ru | 48.6 % | 56.7 % | 52.3 % | 30 |
| gost | ru | 70 % | 23.3 % | 35 % | 30 |
| erd | ru | 82.8 % | 80 % | 81.4 % | 30 |
| uml-sequence | ru | 52.3 % | 76.7 % | 62.2 % | 30 |
| dfd | ru | 75 % | 60 % | 66.7 % | 30 |
| bpmn | en | 48.3 % | 46.7 % | 47.5 % | 30 |
| gost | en | 79 % | 50 % | 61.2 % | 30 |
| erd | en | 92.6 % | 83.3 % | 87.7 % | 30 |
| uml-sequence | en | 53.5 % | 76.7 % | 63 % | 30 |
| dfd | en | 72 % | 60 % | 65.5 % | 30 |

## Построение по описанию

| Режим | Язык | F1 элементов | F1 связей | Без ошибок валидатора | Точное совпадение |
| --- | --- | --- | --- | --- | --- |
| автоопределение нотации | ru | 66.8 % | 48 % | 82 % | 24.7 % |
| нотация задана | ru | 78.1 % | 58.9 % | 80 % | 32 % |
| автоопределение нотации | en | 65.1 % | 43.4 % | 84 % | 25.3 % |
| нотация задана | en | 77 % | 55 % | 81.3 % | 32 % |

### Повтор «построить, экспортировать в Mermaid, импортировать, сравнить»

| Язык | Точных | Из |
| --- | --- | --- |
| ru | 6.2 % | 146 |
| en | 23.7 % | 148 |

## Проверка диаграмм

|  |  |
| --- | --- |
| Полнота найденных засеянных ошибок | 89.2 % |
| Полнота с совпадением строки | 77.5 % |
| Доля засеянных, на которых что-то отмечено | 97.1 % |
| Ложные срабатывания на чистых (ошибки и предупреждения) | 0 % |
| Засеянных, по которым задан вопрос | 100 % |
| Чистых, по которым задан вопрос | 48 / 116 |

| Категория | Найдено | Из | Полнота |
| --- | --- | --- | --- |
| dangling | 18 | 18 | 100 % |
| deadend | 13 | 16 | 81.3 % |
| level-balance | 16 | 16 | 100 % |
| notation-rule | 15 | 18 | 83.3 % |
| syntax | 15 | 18 | 83.3 % |
| unreachable | 14 | 16 | 87.5 % |

## Точность импорта

| Формат | Принято | Из | F1 элементов | F1 связей |
| --- | --- | --- | --- | --- |
| dot | 1 | 6 | 20 % | 0 % |
| mermaid | 29 | 29 | 93.1 % | 78.5 % |
| plantuml | 10 | 10 | 97.9 % | 96.2 % |

## Время и стабильность

Время зависит от машины и в сравнении с базовой линией не участвует. Стабильность (два прогона дают то же): 100 % (1163 / 1163).

## Слабые места

- Нотация `gost` (ru): F1 35 %
- Нотация `bpmn` (en): F1 47.5 %
- Нотация `bpmn` (ru): F1 52.3 %
- категория проверки `deadend`: полнота 81.3 %
- категория проверки `notation-rule`: полнота 83.3 %
- категория проверки `syntax`: полнота 83.3 %

## 20 самых частых ошибок

| № | Причина | Раз | Пример |
| --- | --- | --- | --- |
| 1 | build(auto) dfd: expected elements are missing | 58 | ru-dfd-01 |
| 2 | build(auto) dfd: expected relations are missing | 58 | ru-dfd-01 |
| 3 | build(gold notation) dfd: expected elements are missing | 58 | ru-dfd-01 |
| 4 | build(gold notation) dfd: expected relations are missing | 58 | ru-dfd-01 |
| 5 | build(gold notation) dfd: extra relations | 55 | ru-dfd-01 |
| 6 | build(gold notation): the built code has validator errors | 52 | ru-dfd-02 |
| 7 | build(auto) dfd: extra relations | 51 | ru-dfd-01 |
| 8 | build(auto) bpmn: expected relations are missing | 50 | ru-bpmn-01 |
| 9 | build(auto) bpmn: expected elements are missing | 44 | ru-bpmn-01 |
| 10 | build(auto) dfd: extra elements | 44 | ru-dfd-01 |
| 11 | build(auto) bpmn: extra relations | 39 | ru-bpmn-01 |
| 12 | build(gold notation) bpmn: expected relations are missing | 38 | ru-bpmn-04 |
| 13 | build(gold notation) dfd: extra elements | 38 | ru-dfd-01 |
| 14 | build(auto) bpmn: extra elements | 37 | ru-bpmn-01 |
| 15 | build(gold notation) gost: expected elements are missing | 37 | ru-gost-03 |
| 16 | build(gold notation) gost: expected relations are missing | 37 | ru-gost-03 |
| 17 | build(auto): the built code has validator errors | 35 | ru-uml-sequence-12 |
| 18 | build(auto) uml-sequence: expected relations are missing | 33 | ru-uml-sequence-02 |
| 19 | build(gold notation) bpmn: expected elements are missing | 32 | ru-bpmn-04 |
| 20 | build(auto) gost: expected elements are missing | 31 | ru-gost-01 |
