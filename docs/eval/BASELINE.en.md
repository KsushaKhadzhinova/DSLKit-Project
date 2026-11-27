# Accuracy baseline of the automation

The numbers come from `npm run eval` on the gold set in `docs/eval/`, with no network and no AI key. How it works: `docs/eval/README.en.md`.

## Size of the set

|  |  |
| --- | --- |
| Descriptions per language | ru: 150, en: 150 |
| Diagrams with a seeded defect | 102 |
| Clean diagrams | 116 |
| Mermaid, PlantUML, DOT codes | 45 |

## Notation detection

| Language | top-1 | top-3 | macro-F1 | ECE |
| --- | --- | --- | --- | --- |
| ru | 59.3 % | 77.3 % | 59.5 % | 0.021 |
| en | 63.3 % | 80 % | 65 % | 0.0505 |

### Per class (precision / recall / F1)

| Notation | Language | Precision | Recall | F1 | Cases |
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

## Building from a description

| Mode | Language | Element F1 | Relation F1 | No validator errors | Exact match |
| --- | --- | --- | --- | --- | --- |
| notation detected | ru | 66.8 % | 48 % | 82 % | 24.7 % |
| notation given | ru | 78.1 % | 58.9 % | 80 % | 32 % |
| notation detected | en | 65.1 % | 43.4 % | 84 % | 25.3 % |
| notation given | en | 77 % | 55 % | 81.3 % | 32 % |

### Round trip: build, export to Mermaid, import, compare

| Language | Exact | Of |
| --- | --- | --- |
| ru | 6.2 % | 146 |
| en | 23.7 % | 148 |

## Diagram checks

|  |  |
| --- | --- |
| Recall of seeded defects | 89.2 % |
| Recall with the line matching | 77.5 % |
| Share of seeded diagrams with any finding | 97.1 % |
| False alarms on clean diagrams (errors and warnings) | 0 % |
| Seeded diagrams that got a question | 100 % |
| Clean diagrams that got a question | 48 / 116 |

| Category | Found | Of | Recall |
| --- | --- | --- | --- |
| dangling | 18 | 18 | 100 % |
| deadend | 13 | 16 | 81.3 % |
| level-balance | 16 | 16 | 100 % |
| notation-rule | 15 | 18 | 83.3 % |
| syntax | 15 | 18 | 83.3 % |
| unreachable | 14 | 16 | 87.5 % |

## Import fidelity

| Format | Accepted | Of | Element F1 | Relation F1 |
| --- | --- | --- | --- | --- |
| dot | 1 | 6 | 20 % | 0 % |
| mermaid | 29 | 29 | 93.1 % | 78.5 % |
| plantuml | 10 | 10 | 97.9 % | 96.2 % |

## Time and stability

Time depends on the machine and does not take part in the comparison with the baseline. Stability (two runs give the same answers): 100 % (1163 / 1163).

## Weak spots

- Notation `gost` (ru): F1 35 %
- Notation `bpmn` (en): F1 47.5 %
- Notation `bpmn` (ru): F1 52.3 %
- check category `deadend`: recall 81.3 %
- check category `notation-rule`: recall 83.3 %
- check category `syntax`: recall 83.3 %

## The 20 most frequent mistakes

| # | Reason | Times | Example |
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
