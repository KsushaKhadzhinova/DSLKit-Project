// Problem texts in Russian (the source language of the site) and English. {name} is replaced from the problem parameters.
export const MESSAGES = {
  syntax: { ru: 'Строка не распознана: «{text}»', en: 'Unrecognized line: "{text}"' },
  'syntax-short': { ru: 'Строка не распознана', en: 'Unrecognized line' },
  'no-header': { ru: 'Нет заголовка «diagram <нотация>», принята нотация IDEF0', en: 'No "diagram <notation>" header, IDEF0 is assumed' },
  'header-unknown': { ru: 'Неизвестная нотация «{name}». Доступны: {list}', en: 'Unknown notation "{name}". Available: {list}' },
  'header-kind': { ru: 'Для UML укажите вид диаграммы: {list}', en: 'Give the UML diagram kind: {list}' },
  'header-kind-unknown': { ru: 'Неизвестный вид UML «{name}». Доступны: {list}', en: 'Unknown UML kind "{name}". Available: {list}' },
  'header-extra': { ru: 'У нотации {name} нет видов, слово «{kind}» лишнее', en: 'Notation {name} has no kinds, the word "{kind}" is extra' },
  duplicate: { ru: 'Идентификатор «{id}» уже объявлен в строке {first}', en: 'Identifier "{id}" is already declared on line {first}' },
  'unknown-ref': { ru: 'Неизвестный элемент «{id}»', en: 'Unknown element "{id}"' },
  unclosed: { ru: 'Не закрыт блок «{id}»', en: 'Block "{id}" is not closed' },
  isolated: { ru: 'Элемент «{id}» ни с чем не связан', en: 'Element "{id}" is not connected to anything' },

  'idef0-id': {
    ru: 'Номер блока «{id}» не по правилам: A-0 для контекста, A1…A6 и далее',
    en: 'Box number "{id}" breaks the rule: A-0 for context, then A1…A6 and so on',
  },
  'idef0-arrow-from': { ru: 'Стрелка выходит из порта «{port}», а должна выходить из output', en: 'The arrow leaves port "{port}" but must leave from output' },
  'idef0-arrow-to': {
    ru: 'Стрелка входит в порт «{port}», допустимы input, control, mechanism',
    en: 'The arrow enters port "{port}", allowed are input, control, mechanism',
  },
  'idef0-no-output': {
    ru: 'У блока {id} нет выхода (output): у функции должен быть хотя бы один',
    en: 'Box {id} has no output: a function needs at least one',
  },
  'idef0-no-control': {
    ru: 'У блока {id} нет управления (control): нужна хотя бы одна стрелка',
    en: 'Box {id} has no control: at least one arrow is required',
  },
  'idef0-context': { ru: 'Контекстная диаграмма A-0 должна содержать один блок', en: 'The A-0 context diagram must hold a single box' },
  'idef0-count': { ru: 'На диаграмме декомпозиции {n} блоков, должно быть от 3 до 6', en: 'The decomposition diagram has {n} boxes, it should have 3 to 6' },

  'strict-pos': {
    ru: 'У элемента {id} неверное положение «pos={value}», нужен вид pos=120x80',
    en: 'Element {id} has a wrong place "pos={value}", the form is pos=120x80',
  },
  'strict-dup-edge': { ru: 'Связь {from} → {to} уже есть, повтор лишний', en: 'The link {from} → {to} already exists, the repeat is extra' },
  'strict-self-loop': { ru: 'Элемент {id} ведёт сам в себя: в этой нотации так нельзя', en: 'Element {id} points at itself, this notation does not allow it' },
  'strict-id-case': { ru: 'Идентификатор «{id}» отличается от «{other}» только регистром', en: 'Identifier "{id}" differs from "{other}" only in case' },
  'strict-dup-label': { ru: 'Элементы {id} и {other} названы одинаково: «{label}»', en: 'Elements {id} and {other} have the same name: "{label}"' },
  'strict-store-write-only': { ru: 'В хранилище {id} только пишут и никогда не читают', en: 'Data store {id} is only written and never read' },
  'strict-store-read-only': { ru: 'Из хранилища {id} только читают, в него никто не пишет', en: 'Data store {id} is only read and never written' },
  'strict-idef0-feedback': {
    ru: 'Стрелка блока {id} возвращается в него же: обратную связь рисуют через другой блок',
    en: 'The arrow of box {id} returns to the same box: draw feedback through another box',
  },
  'strict-idef0-gap': { ru: 'Нумерация блоков прерывается: после {previous} идёт {id}', en: 'The box numbers have a gap: {id} follows {previous}' },
  'strict-idef0-port-dup': { ru: 'У блока {id} в разделе {port} повторяется одна и та же стрелка', en: 'Box {id} repeats the same arrow in {port}' },

  'dfd-no-process': {
    ru: 'Поток {from} → {to} не касается процесса: хотя бы один конец должен быть процессом',
    en: 'Flow {from} → {to} touches no process: one end must be a process',
  },
  'dfd-unlabelled': { ru: 'Поток {from} → {to} без названия', en: 'Flow {from} → {to} has no label' },
  'dfd-miracle': {
    ru: 'Процесс «{id}» только создаёт данные: нет входящих потоков («чудо»)',
    en: 'Process "{id}" only produces data: no inflow (a "miracle")',
  },
  'dfd-black-hole': {
    ru: 'Процесс «{id}» только поглощает данные: нет исходящих потоков («чёрная дыра»)',
    en: 'Process "{id}" only consumes data: no outflow (a "black hole")',
  },

  'erd-no-pk': { ru: 'У сущности «{id}» нет первичного ключа (pk)', en: 'Entity "{id}" has no primary key (pk)' },
  'erd-dup-attr': { ru: 'В сущности «{id}» атрибут «{name}» объявлен дважды', en: 'Entity "{id}" declares attribute "{name}" twice' },
  'erd-fk-unknown': {
    ru: 'Внешний ключ «{name}» в «{id}» ссылается на неизвестную сущность «{ref}»',
    en: 'Foreign key "{name}" in "{id}" points to unknown entity "{ref}"',
  },
  'erd-cardinality': {
    ru: 'Связь «{value}» не поддерживается: допустимы 1:1, 1:N, N:1, N:M',
    en: 'Cardinality "{value}" is not supported: use 1:1, 1:N, N:1, N:M',
  },

  'idef1-no-attrs': { ru: 'У сущности «{id}» нет атрибутов', en: 'Entity "{id}" has no attributes' },
  'idef1x-child-independent': {
    ru: 'Сущность «{id}» — потомок идентифицирующей связи и должна быть dependent',
    en: 'Entity "{id}" is the child of an identifying relationship and must be dependent',
  },
  'idef1x-fk-missing': {
    ru: 'В «{id}» не мигрировал ключ «{name}» родителя «{parent}» (fk)',
    en: 'Key "{name}" of parent "{parent}" did not migrate into "{id}" (fk)',
  },
  'idef1x-fk-identifying': {
    ru: 'Мигрировавший ключ «{name}» в «{id}» при идентифицирующей связи должен входить в первичный ключ',
    en: 'The migrated key "{name}" in "{id}" must be part of the primary key for an identifying relationship',
  },
  'idef1x-fk-nonidentifying': {
    ru: 'Мигрировавший ключ «{name}» в «{id}» при неидентифицирующей связи не должен входить в первичный ключ',
    en: 'The migrated key "{name}" in "{id}" must not be part of the primary key for a non-identifying relationship',
  },
  'idef1x-nonspecific': {
    ru: 'Неспецифическая связь {from} — {to} нужно разрешить промежуточной сущностью',
    en: 'Non-specific relationship {from} — {to} should be resolved with an intersection entity',
  },
  'idef1x-dependent-orphan': { ru: 'Зависимая сущность «{id}» не имеет идентифицирующего родителя', en: 'Dependent entity "{id}" has no identifying parent' },
  'idef1x-category-self': { ru: 'Сущность «{id}» не может быть подтипом самой себя', en: 'Entity "{id}" cannot be its own subtype' },

  'flow-no-start': { ru: 'Нет начального узла ({kind})', en: 'There is no start node ({kind})' },
  'flow-multi-start': { ru: 'Лишний начальный узел «{id}» ({kind}): он должен быть один', en: 'Extra start node "{id}" ({kind}): there must be exactly one' },
  'flow-no-end': { ru: 'Нет конечного узла ({kind})', en: 'There is no end node ({kind})' },
  'flow-start-incoming': { ru: 'В начальный узел «{id}» не могут входить потоки', en: 'No flow may enter the start node "{id}"' },
  'flow-end-outgoing': { ru: 'Из конечного узла «{id}» не могут выходить потоки', en: 'No flow may leave the end node "{id}"' },
  'flow-unreachable': { ru: 'Узел «{id}» недостижим от начала', en: 'Node "{id}" is unreachable from the start' },
  'flow-dead-end': { ru: 'Из узла «{id}» некуда идти: нет исходящих потоков', en: 'Node "{id}" is a dead end: it has no outgoing flows' },
  'gateway-mixed': {
    ru: 'Узел «{id}» и разветвляет, и соединяет потоки: разделите его на два',
    en: 'Node "{id}" both splits and joins flows: split it in two',
  },
  'gateway-neither': { ru: 'Узел «{id}» не разветвляет и не соединяет потоки', en: 'Node "{id}" neither splits nor joins flows' },
  'flow-unlabelled-branch': { ru: 'Ветка после «{id}» без условия', en: 'A branch after "{id}" has no condition' },
  'bpmn-implicit-split': { ru: 'У задачи «{id}» несколько выходов: поставьте шлюз', en: 'Task "{id}" has several outgoing flows: add a gateway' },

  'petri-bipartite': {
    ru: 'Дуга {from} → {to} соединяет элементы одного типа: дуги идут только между местом и переходом',
    en: 'Arc {from} → {to} joins elements of the same type: arcs run only between a place and a transition',
  },
  'petri-weight': { ru: 'Вес дуги «{value}» должен быть целым числом больше нуля', en: 'Arc weight "{value}" must be an integer above zero' },
  'petri-tokens': {
    ru: 'Число фишек «{value}» у «{id}» должно быть целым и не меньше нуля',
    en: 'Token count "{value}" of "{id}" must be an integer, zero or more',
  },

  'uc-link': { ru: 'Связь {from} — {to} должна соединять актёра и вариант использования', en: 'Link {from} — {to} must join an actor and a use case' },
  'uc-include': {
    ru: 'Связь {kind} {from} → {to} возможна только между вариантами использования',
    en: 'The {kind} link {from} → {to} is only allowed between use cases',
  },
  'uc-generalize': {
    ru: 'Обобщение {from} → {to} должно соединять элементы одного типа',
    en: 'Generalization {from} → {to} must join elements of the same type',
  },

  'state-nondeterministic': { ru: 'Из «{id}» два перехода по событию «{event}»', en: 'State "{id}" has two transitions on event "{event}"' },

  'idef3-referent': {
    ru: 'Ссылка (referent) {from}/{to} подключается только реляционной связью',
    en: 'A referent ({from}/{to}) connects only by a relational link',
  },
  'idef3-junction': {
    ru: 'Перекрёсток «{id}» должен либо разветвлять (1 вход, 2+ выхода), либо соединять (2+ входа, 1 выход)',
    en: 'Junction "{id}" must either fan out (1 in, 2+ out) or fan in (2+ in, 1 out)',
  },
  'idef3-unpaired': {
    ru: 'Перекрёстки {kind} не парные: разветвлений {splits}, слияний {joins}',
    en: 'Junctions {kind} are not paired: {splits} splits, {joins} joins',
  },
  'idef3-no-start': { ru: 'Нет единицы работы без входящих связей: поток замкнут', en: 'No unit of behaviour without incoming links: the flow is closed' },

  'gost-note': {
    ru: 'Линия комментария {from} — {to} должна идти от символа «комментарий»',
    en: 'Comment line {from} — {to} must start from a comment symbol',
  },
  'gost-comment-flow': {
    ru: 'Комментарий нельзя вставлять в поток {from} → {to}: используйте note',
    en: 'A comment cannot sit in flow {from} → {to}: use note',
  },
  'gost-connector': {
    ru: 'Соединитель «{label}» ({id}) без пары: нужно ровно два с одним обозначением',
    en: 'Connector "{label}" ({id}) has no pair: exactly two with the same mark are needed',
  },
  'gost-decision': { ru: 'Решение «{id}» должно иметь не меньше двух ветвей', en: 'Decision "{id}" must have at least two branches' },
  'gost-decision-label': { ru: 'Ветвь решения «{id}» без подписи (Да/Нет)', en: 'A branch of decision "{id}" has no label (Yes/No)' },

  'idef4-construct': { ru: 'В IDEF4 нет конструкции «{what}»', en: 'IDEF4 has no construct "{what}"' },

  'class-mult': {
    ru: 'Кратность «{value}» неверна: допустимы 1, *, 0..1, 1..* и т. п.',
    en: 'Multiplicity "{value}" is invalid: use 1, *, 0..1, 1..* and so on',
  },
  'class-realization': {
    ru: 'Реализацию можно направлять только на интерфейс, а «{id}» не интерфейс',
    en: 'Realization may only point at an interface, and "{id}" is not one',
  },
  'class-cycle': { ru: 'Цикл наследования: {path}', en: 'Inheritance cycle: {path}' },
  'class-dup-member': { ru: 'У «{id}» член «{name}» объявлен дважды', en: '"{id}" declares member "{name}" twice' },
  'class-iface-attr': { ru: 'У интерфейса «{id}» не должно быть атрибутов («{name}»)', en: 'Interface "{id}" should not have attributes ("{name}")' },

  'seq-return': { ru: 'Ответ {from} → {to} без вызова, на который он отвечает', en: 'Reply {from} → {to} has no call it answers' },

  'uml-object-label': { ru: 'Подпись объекта «{id}» лучше писать как имя : Класс', en: 'Write the label of object "{id}" as name : Class' },
  'uml-comp-iface': {
    ru: 'Связь {kind} {from} → {to}: компонент должен соединяться с интерфейсом',
    en: 'Link {kind} {from} → {to}: a component must connect to an interface',
  },
  'uml-comp-depend': { ru: 'Зависимость {from} → {to} возможна только между компонентами', en: 'Dependency {from} → {to} is only allowed between components' },
  'uml-cs-port': { ru: 'У порта «{id}» нужен владелец: of=<часть или классификатор>', en: 'Port "{id}" needs an owner: of=<part or classifier>' },
  'uml-cs-connect': {
    ru: 'Коннектор {from} — {to} соединяет части и порты, а не классификатор',
    en: 'Connector {from} — {to} joins parts and ports, not a classifier',
  },
  'uml-deploy': { ru: 'Развёртывание {from} → {to}: артефакт разворачивается на узле', en: 'Deployment {from} → {to}: an artifact is deployed on a node' },
  'uml-communicate': {
    ru: 'Связь {from} — {to} соединяет только узлы, устройства и среды выполнения',
    en: 'Link {from} — {to} joins only nodes, devices and execution environments',
  },
  'uml-pkg-edge': { ru: 'Связь {kind} {from} → {to} возможна только между пакетами', en: 'The {kind} link {from} → {to} is only allowed between packages' },
  'uml-pkg-contains': { ru: 'Вложение {from} → {to}: владелец должен быть пакетом', en: 'Containment {from} → {to}: the owner must be a package' },
  'uml-pkg-owner': {
    ru: 'Элемент «{id}» уже вложен в пакет (строка {first}): у него один владелец',
    en: 'Element "{id}" is already owned by a package (line {first}): it has one owner',
  },
  'uml-pkg-cycle': { ru: 'Пакеты вложены по кругу: {path}', en: 'Packages contain each other in a loop: {path}' },
  'uml-profile-extend': { ru: 'Расширение {from} → {to}: стереотип расширяет метакласс', en: 'Extension {from} → {to}: a stereotype extends a metaclass' },
  'uml-profile-generalize': {
    ru: 'Обобщение {from} → {to} возможно только между стереотипами',
    en: 'Generalization {from} → {to} is only allowed between stereotypes',
  },
  'uml-stereotype-idle': { ru: 'Стереотип «{id}» ничего не расширяет', en: 'Stereotype "{id}" extends nothing' },
  'uml-comm-number': { ru: 'Сообщение {from} → {to} без порядкового номера (1, 1.1, 2…)', en: 'Message {from} → {to} has no sequence number (1, 1.1, 2…)' },
  'uml-timing-states': { ru: 'У линии жизни «{id}» меньше двух состояний', en: 'Lifeline "{id}" has fewer than two states' },
  'uml-timing-state': { ru: 'Состояние «{state}» не объявлено у линии «{id}»', en: 'State "{state}" is not declared for lifeline "{id}"' },
  'uml-timing-order': { ru: 'Время {time} у «{id}» раньше предыдущего события', en: 'Time {time} of "{id}" is earlier than its previous event' },

  'idef5-isa': {
    ru: 'Связь isa {from} → {to}: подвид связывает виды или процессы одного типа',
    en: 'isa {from} → {to}: a subkind links kinds or processes of the same type',
  },
  'idef5-instanceof': {
    ru: 'Связь instanceof {from} → {to}: индивид относится к виду или процессу',
    en: 'instanceof {from} → {to}: an individual belongs to a kind or process',
  },
  'idef5-partof': { ru: 'Связь partof {from} → {to} должна соединять элементы одного типа', en: 'partof {from} → {to} must join elements of the same type' },
  'idef5-cycle': { ru: 'Цикл в связях {kind}: {path}', en: 'Cycle in {kind} links: {path}' },
  'idef5-individual': { ru: 'Индивид «{id}» не отнесён ни к одному виду (instanceof)', en: 'Individual "{id}" belongs to no kind (instanceof)' },

  'graph-arrow-mode': {
    ru: 'Тип ребра не совпадает с режимом графа ({mode}): -> для ориентированного, -- для неориентированного',
    en: 'Edge type does not match the graph mode ({mode}): -> directed, -- undirected',
  },
  'graph-weight': { ru: 'Вес «{value}» должен быть числом', en: 'Weight "{value}" must be a number' },
  'graph-negative': {
    ru: 'Поиск кратчайшего пути (Дейкстра) не работает с отрицательными весами',
    en: 'Shortest path search (Dijkstra) does not work with negative weights',
  },
  'graph-summary': {
    ru: 'Вершин: {v}, рёбер: {e}; ориентированный: {directed}, взвешенный: {weighted}, петель: {loops}, мультиграф: {multi}',
    en: 'Vertices: {v}, edges: {e}; directed: {directed}, weighted: {weighted}, loops: {loops}, multigraph: {multi}',
  },
  'graph-structure': {
    ru: 'Компонент связности: {components}; цикл: {cyclic}; дерево: {tree}; DAG: {dag}; двудольный: {bipartite}',
    en: 'Components: {components}; cycle: {cyclic}; tree: {tree}; DAG: {dag}; bipartite: {bipartite}',
  },
  'graph-degrees': { ru: 'Степени вершин: {list}', en: 'Vertex degrees: {list}' },
  'graph-matrix': { ru: 'Матрица смежности: {matrix}', en: 'Adjacency matrix: {matrix}' },
  'graph-order': { ru: 'Топологический порядок: {order}', en: 'Topological order: {order}' },
  'graph-mst': { ru: 'Минимальный остов: вес {weight}, рёбра {edges}', en: 'Minimum spanning tree: weight {weight}, edges {edges}' },
  'graph-path': { ru: 'Кратчайший путь {from} → {to}: {path}, длина {distance}', en: 'Shortest path {from} → {to}: {path}, length {distance}' },
  'graph-path-none': { ru: 'Пути {from} → {to} не существует', en: 'There is no path {from} → {to}' },

  'dag-duration': { ru: 'Длительность «{value}» у «{id}» должна быть числом', en: 'Duration "{value}" of "{id}" must be a number' },
  'dag-cycle': { ru: 'Цикл зависимостей: {path} (строки {lines})', en: 'Dependency cycle: {path} (lines {lines})' },
  'dag-order': { ru: 'Топологический порядок: {order}', en: 'Topological order: {order}' },
  'dag-layers': { ru: 'Уровни: {layers}', en: 'Layers: {layers}' },
  'dag-roots': { ru: 'Корни: {roots}; листья: {leaves}', en: 'Roots: {roots}; leaves: {leaves}' },
  'dag-critical': { ru: 'Критический путь: {path}, длина {length}', en: 'Critical path: {path}, length {length}' },
  'dag-redundant': {
    ru: 'Зависимость {from} → {to} избыточна: она следует из других путей (транзитивная редукция)',
    en: 'Dependency {from} → {to} is redundant: other paths imply it (transitive reduction)',
  },

  'mm-root': { ru: 'У ментальной карты должен быть ровно один корень, сейчас их {n}', en: 'A mind map needs exactly one root, there are {n}' },
  'mm-parent': { ru: 'Ветка «{id}» подчинена нескольким веткам, а должна одной', en: 'Topic "{id}" hangs on several topics, it should hang on one' },
  'mm-unreachable': { ru: 'Ветка «{id}» не связана с корнем', en: 'Topic "{id}" is not connected to the root' },
  'mm-cycle': { ru: 'Ветки образуют кольцо: {path}', en: 'The topics form a loop: {path}' },
  'org-many-bosses': { ru: 'У «{id}» несколько руководителей: проверьте структуру', en: '"{id}" has several managers: check the structure' },
  'org-many-tops': { ru: 'Вверху структуры {n} элементов без руководителя', en: 'The top of the structure has {n} elements without a manager' },
  'org-cycle': { ru: 'Подчинение замкнулось в кольцо: {path}', en: 'The reporting lines form a loop: {path}' },
  'c4-unlabelled': {
    ru: 'Связь {from} → {to} без подписи: напишите, что передаётся или зачем',
    en: 'The relation {from} → {to} has no label: say what is sent or why',
  },
  'c4-database-source': {
    ru: 'База «{id}» сама ничего не вызывает: стрелка должна идти к ней',
    en: 'Database "{id}" calls nothing itself: the arrow should point to it',
  },
  'net-client-client': {
    ru: 'Клиенты {from} и {to} соединены напрямую: обычно связь идёт через коммутатор или роутер',
    en: 'Clients {from} and {to} are linked directly: normally a switch or a router sits between them',
  },
  'dt-outcome-out': { ru: 'Из исхода «{id}» не должно выходить ответов', en: 'Outcome "{id}" must have no answers going out' },
  'dt-answer-label': {
    ru: 'Ответ {from} → {to} без подписи: напишите, что отвечают на вопрос',
    en: 'The answer {from} → {to} has no label: write the answer to the question',
  },
  'dt-branches': { ru: 'У вопроса «{id}» один ответ: нужно не меньше двух', en: 'Question "{id}" has one answer: at least two are needed' },
  'dt-many-parents': { ru: 'В «{id}» ведёт несколько ответов, а в дереве путь один', en: 'Several answers lead to "{id}", a tree has one path' },
  'dt-roots': {
    ru: 'У дерева {n} начал: оставьте один вопрос без входящих ответов',
    en: 'The tree has {n} starts: keep one question without incoming answers',
  },
  'dt-cycle': { ru: 'Ответы замыкаются в круг: {path}', en: 'The answers form a loop: {path}' },
  'epc-alternate': {
    ru: 'Между {from} и {to} два элемента одного вида ({kind}): в eEPC события и функции чередуются, между ними можно поставить коннектор',
    en: 'Two elements of one kind ({kind}) follow each other, {from} and {to}: in eEPC events and functions alternate, a connector may sit between them',
  },
  'epc-start': { ru: 'Цепочка начинается с «{id}», а должна начинаться с события', en: 'The chain starts with "{id}", it must start with an event' },
  'epc-end': { ru: 'Цепочка заканчивается на «{id}», а должна заканчиваться событием', en: 'The chain ends with "{id}", it must end with an event' },
};

// Texts of the problems panel and the status bar.
export const UI = {
  status: { ru: 'Проблем: {n} (ошибки: {e}, предупреждения: {w})', en: 'Problems: {n} (errors: {e}, warnings: {w})' },
  clean: { ru: 'Проблем нет', en: 'No problems' },
  error: { ru: 'Ошибка', en: 'Error' },
  warning: { ru: 'Предупреждение', en: 'Warning' },
  info: { ru: 'Сведения', en: 'Info' },
  banner: { ru: 'Ошибок: {n}', en: 'Errors: {n}' },
  fallback: { ru: 'Выбранный движок не рисует эту нотацию, использован {label}.', en: 'The chosen engine cannot draw this notation, {label} was used.' },
  notation: { ru: 'Диаграмма: {name}', en: 'Diagram: {name}' },
  tab: { ru: 'Проблемы: {n}', en: 'Problems: {n}' },
  template: { ru: 'Шаблон диаграммы', en: 'Diagram template' },
  drawFailed: { ru: 'Не удалось построить изображение диаграммы.', en: 'The diagram image could not be built.' },
};

const fill = (template, params) => template.replace(/\{(\w+)\}/g, (_, key) => String(params[key]));

export const formatProblem = (item, lang) => fill(MESSAGES[item.code][lang === 'en' ? 'en' : 'ru'], item.params);

export const ui = (key, params, lang) => fill(UI[key][lang === 'en' ? 'en' : 'ru'], params);
