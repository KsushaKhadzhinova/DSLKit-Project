# Аналоги и источники вдохновения — полный список

Дополняет [COMPETITOR-ANALYSIS.md](COMPETITOR-ANALYSIS.md) (там подробно: PlantUML, Mermaid, draw.io, Lucidchart, Eraser, Whimsical, StormBPMN, Kroki, dbdiagram.io).

**Статус ссылок.** «Проверено» — страница нашлась в поиске 24.10.2026. «По памяти» — адрес не открывался, перед вставкой в отчёт проверить ссылку, цены и функции.

## 1 Ближайшие аналоги: код и схема связаны в обе стороны

Ближе всего к идее DSLKit («перетащил блок — поменялся текст»).

| Продукт | Что делает | Ссылка | Статус |
|---|---|---|---|
| visimer | Редактор Mermaid: перетаскивание на холсте превращается в минимальную правку текста, один общий undo | https://github.com/inkeep/visimer | проверено |
| oxdraw | Mermaid + перетаскиваемый веб-редактор, позиции сохраняются в `.mmd` комментариями, привязка к сетке | https://github.com/RohanAdwankar/oxdraw | проверено |
| DrakoFlow | В браузере, координаты холста пишутся в редактор кода, подсветка строки при наведении | поиск «DrakoFlow diagram» | проверено (адрес не получен) |
| Visual Paradigm (VPasCode, D2-редактор) | Код и предпросмотр рядом, обратной записи с холста не описано | https://online.visual-paradigm.com | проверено |
| Eraser | Текст и мышь, DiagramGPT | https://www.eraser.io | в анализе |
| D2 Playground | Текст слева, схема справа | https://play.d2lang.com | по памяти |

## 2 Диаграммы «как код»

D2 https://d2lang.com · Structurizr (C4) https://structurizr.com · Graphviz https://graphviz.org · WaveDrom https://wavedrom.com · Diagrams (Python) https://diagrams.mingrammer.com · Pikchr https://pikchr.org · Ditaa https://ditaa.sourceforge.net · Nomnoml https://nomnoml.com · Mermaid Live https://mermaid.live · PlantText https://www.planttext.com · Swimlanes.io https://swimlanes.io · SequenceDiagram.org https://sequencediagram.org (все по памяти).

## 3 Рисование мышью

Excalidraw https://excalidraw.com · tldraw https://www.tldraw.com · Miro https://miro.com · FigJam https://www.figma.com/figjam · Lucidspark https://lucidspark.com · Creately https://creately.com · Visual Paradigm Online https://online.visual-paradigm.com · Gliffy https://www.gliffy.com · Cacoo https://cacoo.com · yEd https://www.yworks.com/products/yed · diagrams.net https://app.diagrams.net (по памяти).

## 4 Нотации (IDEF0, DFD, BPMN, UML, ERD)

IDEF0 / DFD — самый узкий рынок, то есть пробел для DSLKit:

| Продукт | Заметка | Ссылка | Статус |
|---|---|---|---|
| ChatDiagram — IDEF0 Diagram Maker | Текстовое описание → IDEF0, первые 3 диаграммы без регистрации; DFD не найдено | https://www.chatdiagram.com/tool/idef0-diagram-maker | проверено |
| EdrawMax | Шаблоны IDEF0, перетаскивание, 200+ типов диаграмм | https://www.edrawsoft.com/idef0-solutions.html | проверено |
| ConceptDraw DIAGRAM | Решение IDEF0 и DFD, настольное, Visio-экспорт | https://www.conceptdraw.com/How-To-Guide/idef0-software | проверено |
| Ramus Educational | Бесплатный IDEF0/DFD (русская учебная среда) | поиск «Ramus Educational» | по памяти |
| Business Studio, ARIS Express | Российские/европейские пакеты моделирования | https://www.businessstudio.ru · https://www.ariscommunity.com | по памяти |

Остальные нотации: bpmn.io https://bpmn.io · Camunda Modeler https://camunda.com/download/modeler · Signavio https://www.signavio.com · Bizagi https://www.bizagi.com · ARIS https://www.ariscommunity.com · Enterprise Architect https://sparxsystems.com · StarUML https://staruml.io · Archi https://www.archimatetool.com · DrawSQL https://drawsql.app · XMind https://xmind.app · MindMeister https://www.mindmeister.com · Gaphor https://gaphor.org (по памяти).

## 5 Где диаграммы встраивают в документы

Notion https://www.notion.so · Obsidian https://obsidian.md · GitHub (Mermaid в Markdown) https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams · Docusaurus https://docusaurus.io · Confluence + draw.io https://www.atlassian.com/software/confluence · Яндекс Вики https://yandex.ru/support/wiki.

## 6 ИИ-генерация

Eraser DiagramGPT https://www.eraser.io/diagramgpt · Whimsical AI https://whimsical.com/ai · Mermaid Chart https://www.mermaidchart.com · ChatDiagram (см. выше).

## 7 Редакторы и библиотеки, откуда взят интерфейс или движок

Monaco https://microsoft.github.io/monaco-editor · CodeMirror https://codemirror.net · StackBlitz https://stackblitz.com · CodePen https://codepen.io · Compiler Explorer https://godbolt.org (слева код, справа результат) · JointJS https://www.jointjs.com · React Flow https://reactflow.dev (холст с узлами и перетаскиванием) · Penpot https://penpot.app (по памяти).

## 8 Русскоязычные

StormBPMN https://stormbpmn.com · Яндекс Вики (выше) · Business Studio (выше).

## Что взять в обзор конкурентов

1. Двусторонняя синхронизация (visimer, oxdraw, DrakoFlow) — самые близкие, но все они только для Mermaid; IDEF0 и DFD в них нет.
2. IDEF0/DFD закрывают в основном тяжёлые платные пакеты или генераторы без правки кодом; у DSLKit — свой язык, правка кодом и мышью, нотации по методичке.
3. Подсветка строки при наведении на элемент (DrakoFlow) совпадает с решением A/B №18 из `docs/project/ab-results`.
