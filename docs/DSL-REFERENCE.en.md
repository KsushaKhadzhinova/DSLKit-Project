# DSLKit language reference

DSLKit describes a diagram as text: the first line names the notation, the other lines declare elements and links. One line is one element or one link. Lines starting with "//" are comments, blank lines are ignored. Labels go in double quotes; inside quotes backslash-quote and backslash-n work as usual. The place of a block on the board is the optional attribute pos=XxY. The colour of a block in graph notations (DFD, BPMN, GOST, state machines and others whose blocks are drawn from shapes) is the optional attribute color=#rrggbb or color=#rgb, for example process 2 "Pay" color=#ffcc00. Only this form is accepted: colour names and functions such as rgb() are rejected with an error. The text colour is chosen automatically (black or white, contrast at least 4.5). In PlantUML and Mermaid the colour is carried for flowcharts (a node style); other notations do not carry it, and the editor says so. Compatibility: an editor version without colour does not open code with a color=#… attribute (it reads it as a syntax error); code without color= opens everywhere.

## How it works

1. Parsing: parseDiagram reads the text and builds a model with line numbers and a list of problems.
2. Checking: every notation and the shared strict rules (strict.js) report errors and warnings in Russian and English.
3. Drawing: the own engine draws SVG in the browser (site/js/notations), and the server returns the same drawing for POST /api/render.
4. Export: the same model gives Graphviz, Mermaid and PlantUML; text in another language is drawn by an external service through /api/external/<language>.

## Grammar

```
source     = header , { line } ;
header     = "diagram" , notation , [ kind ] , [ string ] ;
notation   = "idef0" | "dfd" | "erd" | "bpmn" | "uml" | ... ;  (GET /api/notations lists all)
kind       = word ;                      (only after "uml": class, sequence, state, ...)
line       = comment | declaration | relation | block-end ;
comment    = "//" , { any } ;
declaration= keyword , id , [ string ] , { attribute } ;
relation   = id , [ "." , port ] , arrow , id , [ "." , port ] , [ string ] ;
attribute  = word , [ "=" , value ] ;
id         = letter-or-digit , { letter-or-digit | "." | "-" } ;
string     = '"' , { char | "\\" , any } , '"' ;
```

## API

| Method | Path                       | Body and answer                                                                                   |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/notations`           | { notations: [{ id, short, name, header, formats, nodes, edges }] }                               |
| GET    | `/api/grammar`             | { grammar, header }                                                                               |
| GET    | `/api/engines`             | { own, external: [{ id, endpoint }] }                                                             |
| POST   | `/api/validate`            | { source, lang } -> { notation, valid, problems: [{ line, severity, code, message }] }            |
| POST   | `/api/parse`               | { source, lang } -> { notation, valid, problems, model }                                          |
| POST   | `/api/generate`            | { source, format, lang } -> { notation, format, text }                                            |
| POST   | `/api/render`              | { source, lang } -> { notation, valid, problems, svg } (Accept: image/svg+xml gives the bare SVG) |
| POST   | `/api/external/<language>` | { source } -> SVG of the external service (Kroki-compatible, KROKI_URL)                           |

## Importing files and pictures

The wizard "Automatic build" takes files up to 10 MB. The format is found by the content first, then by the extension. Structured formats are read by the deterministic importer without an AI key (site/js/utils/diagram-file-import.js); pictures and PDF are read only by the AI of the server.

| Format                                                                                 | Result                                                         |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| draw.io (.drawio, .dio, compressed or not), SVG (export of draw.io, Graphviz, Mermaid) | GOST flowchart, BPMN or graph, positions pos=XxY are kept      |
| JSON (nodes and edges, Cytoscape, Excalidraw, Lucid)                                   | graph or GOST flowchart                                        |
| BPMN 2.0 XML (.bpmn)                                                                   | BPMN with the positions of BPMNShape                           |
| XMI (.xmi, .uml)                                                                       | UML class diagram                                              |
| GraphML, GEXF, DOT (.dot, .gv), CSV and TSV with links                                 | graph                                                          |
| Visio (.vdx, .vsdx)                                                                    | GOST flowchart or graph                                        |
| Mermaid (.mmd, .md), PlantUML (.puml, .plantuml, .pu, .wsd), DSLKit (.dsl), text       | the existing import of flowcharts, sequence and state diagrams |
| png, jpeg, webp, gif, pdf                                                              | only the AI with a key on the server; BMP is not accepted      |

## Notations

### IDEF0 — function modelling

- Header: `diagram idef0`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: graphviz, mermaid, plantuml

Example:

```
diagram idef0 "Order process"
box A1 "Receive order" {
 input: Order
 control: Sales policy
 output: Accepted order
 mechanism: Manager
}
box A2 "Check stock" {
 input: Accepted order
 control: Stock rules
 output: Reserved goods
}
box A3 "Ship goods" {
 input: Reserved goods
 control: Delivery rules
 output: Shipment
 mechanism: Courier
}
arrow A1.output -> A2.input
arrow A2.output -> A3.input
```

The same example in Russian:

```
diagram idef0 "Обработка заказа"
box A1 "Принять заказ" {
 input: Заказ
 control: Политика продаж
 output: Принятый заказ
 mechanism: Менеджер
}
box A2 "Проверить склад" {
 input: Принятый заказ
 control: Правила склада
 output: Зарезервированный товар
}
box A3 "Отгрузить товар" {
 input: Зарезервированный товар
 control: Правила доставки
 output: Отправление
 mechanism: Курьер
}
arrow A1.output -> A2.input
arrow A2.output -> A3.input
```

### IDEF1 — information modelling

- Header: `diagram idef1`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: graphviz, mermaid, plantuml

Example:

```
diagram idef1 "Order information"
entity Customer {
  id: int pk
  name: string
}
entity Order {
  id: int pk
  total: decimal
}
relationship Customer 1:N Order "places"
```

The same example in Russian:

```
diagram idef1 "Информация о заказах"
entity Клиент {
  id: int pk
  имя: string
}
entity Заказ {
  id: int pk
  сумма: decimal
}
relationship Клиент 1:N Заказ "оформляет"
```

### IDEF1X — data modelling

- Header: `diagram idef1x`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: graphviz, mermaid, plantuml

Example:

```
diagram idef1x "Orders"
entity Customer {
  customer_id: int pk
  name: string
}
entity Order {
  order_id: int pk
  customer_id: int fk
  placed: date
}
entity OrderLine dependent {
  order_id: int pk fk
  line_no: int pk
  qty: int
}
entity Account {
  account_id: int pk
  kind: string
}
entity Savings {
  account_id: int pk fk
}
entity Checking {
  account_id: int pk fk
}
nonidentifying Customer -> Order "places"
identifying Order -> OrderLine "contains" P
category Account complete kind: Savings, Checking
```

The same example in Russian:

```
diagram idef1x "Заказы"
entity Клиент {
  код_клиента: int pk
  имя: string
}
entity Заказ {
  код_заказа: int pk
  код_клиента: int fk
  оформлен: date
}
entity ПозицияЗаказа dependent {
  код_заказа: int pk fk
  номер_позиции: int pk
  количество: int
}
entity Счёт {
  код_счёта: int pk
  вид: string
}
entity Сберегательный {
  код_счёта: int pk fk
}
entity Расчётный {
  код_счёта: int pk fk
}
nonidentifying Клиент -> Заказ "оформляет"
identifying Заказ -> ПозицияЗаказа "содержит" P
category Счёт complete вид: Сберегательный, Расчётный
```

### IDEF3 — process flows

- Header: `diagram idef3`
- Elements: `uob`, `and`, `or`, `xor`, `referent`
- Links: `precedence`, `relational`, `objectflow`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram idef3 "Order fulfilment"
uob u1 "Receive order"
xor j1
uob u2 "Check stock"
uob u3 "Reject order"
xor j2
uob u4 "Close order"
referent r1 "Stock policy"
precedence u1 -> j1
precedence j1 -> u2
precedence j1 -> u3
precedence u2 -> j2
precedence u3 -> j2
precedence j2 -> u4
relational r1 -> u2
```

The same example in Russian:

```
diagram idef3 "Выполнение заказа"
uob u1 "Принять заказ"
xor j1
uob u2 "Проверить склад"
uob u3 "Отклонить заказ"
xor j2
uob u4 "Закрыть заказ"
referent r1 "Политика склада"
precedence u1 -> j1
precedence j1 -> u2
precedence j1 -> u3
precedence u2 -> j2
precedence u3 -> j2
precedence j2 -> u4
relational r1 -> u2
```

### IDEF4 — object-oriented design

- Header: `diagram idef4`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: graphviz, mermaid, plantuml

Example:

```
diagram idef4 "Vehicles"
class Vehicle {
  - speed: int
  + move(): void
}
class Car {
  + doors: int
}
class Engine {
  + power: int
}
Car --|> Vehicle
Car "1" *-- "1" Engine : has
```

The same example in Russian:

```
diagram idef4 "Транспорт"
class Транспорт {
  - скорость: int
  + двигаться(): void
}
class Автомобиль {
  + двери: int
}
class Двигатель {
  + мощность: int
}
Автомобиль --|> Транспорт
Автомобиль "1" *-- "1" Двигатель : имеет
```

### IDEF5 — ontology description

- Header: `diagram idef5`
- Elements: `kind`, `individual`, `process`
- Links: `isa`, `partof`, `instanceof`, `relation`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram idef5 "Organisation"
kind Employee "Employee"
kind Manager "Manager"
kind Team "Team"
individual alice "Alice"
process hire "Hiring"
isa Manager -> Employee
partof Employee -> Team
instanceof alice -> Manager
relation Manager -> hire "performs"
```

The same example in Russian:

```
diagram idef5 "Организация"
kind Employee "Сотрудник"
kind Manager "Руководитель"
kind Team "Команда"
individual alice "Алиса"
process hire "Найм"
isa Manager -> Employee
partof Employee -> Team
instanceof alice -> Manager
relation Manager -> hire "выполняет"
```

### DFD — data flow diagram

- Header: `diagram dfd`
- Elements: `entity`, `process`, `store`
- Links: `flow`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram dfd "Online order"
entity Customer
entity Bank "Payment bank"
process 1 "Validate order"
process 2 "Take payment"
store D1 "Orders"
flow Customer -> 1 "order"
flow 1 -> D1 "valid order"
flow D1 -> 2 "order to pay"
flow 2 -> Bank "payment request"
flow Bank -> 2 "payment result"
flow 2 -> Customer "receipt"
```

The same example in Russian:

```
diagram dfd "Заказ в интернет-магазине"
entity Клиент
entity Bank "Банк платежей"
process 1 "Проверить заказ"
process 2 "Принять оплату"
store D1 "Заказы"
flow Клиент -> 1 "заказ"
flow 1 -> D1 "проверенный заказ"
flow D1 -> 2 "заказ к оплате"
flow 2 -> Bank "запрос платежа"
flow Bank -> 2 "результат платежа"
flow 2 -> Клиент "чек"
```

### ERD — entity-relationship diagram

- Header: `diagram erd`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: graphviz, mermaid, plantuml

Example:

```
diagram erd "Shop"
entity Customer {
  id: int pk
  email: string unique
}
entity Order {
  id: int pk
  customer_id: int fk -> Customer
  total: decimal
}
entity Product {
  id: int pk
  name: string
}
relationship Customer 1:N Order "places"
relationship Order N:M Product "contains"
```

The same example in Russian:

```
diagram erd "Магазин"
entity Клиент {
  id: int pk
  почта: string unique
}
entity Заказ {
  id: int pk
  код_клиента: int fk -> Клиент
  сумма: decimal
}
entity Товар {
  id: int pk
  название: string
}
relationship Клиент 1:N Заказ "оформляет"
relationship Заказ N:M Товар "содержит"
```

### BPMN — business processes

- Header: `diagram bpmn`
- Elements: `start`, `end`, `intermediate`, `task`, `exclusive`, `parallel`
- Links: `flow`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram bpmn "Order handling"
start s "Order received"
task t1 "Check order"
exclusive g1 "In stock?"
task t2 "Ship goods"
task t3 "Notify customer"
exclusive g2
end e "Done"
flow s -> t1
flow t1 -> g1
flow g1 -> t2 "yes"
flow g1 -> t3 "no"
flow t2 -> g2
flow t3 -> g2
flow g2 -> e
```

The same example in Russian:

```
diagram bpmn "Обработка заказа"
start s "Заказ получен"
task t1 "Проверить заказ"
exclusive g1 "Товар в наличии?"
task t2 "Отгрузить товар"
task t3 "Уведомить клиента"
exclusive g2
end e "Готово"
flow s -> t1
flow t1 -> g1
flow g1 -> t2 "да"
flow g1 -> t3 "нет"
flow t2 -> g2
flow t3 -> g2
flow g2 -> e
```

### Petri nets

- Header: `diagram petri`
- Elements: `place`, `transition`
- Links: `arc`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram petri "Producer and consumer"
place free "Free slots" tokens=2
place used "Used slots"
transition put "Produce"
transition take "Consume"
arc free -> put
arc put -> used weight=2
arc used -> take
arc take -> free
```

The same example in Russian:

```
diagram petri "Производитель и потребитель"
place free "Свободные места" tokens=2
place used "Занятые места"
transition put "Произвести"
transition take "Потребить"
arc free -> put
arc put -> used weight=2
arc used -> take
arc take -> free
```

### GOST 19.701-90 flowcharts

- Header: `diagram gost`
- Elements: `start`, `end`, `process`, `decision`, `predefined`, `io`, `preparation`, `manual`, `document`, `connector`, `offpage`, `storage`, `comment`
- Links: `flow`, `note`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram gost "Sum of numbers"
start s "Start"
io in "Input n"
preparation p "i = 1, sum = 0"
decision d "i <= n?"
process a "sum = sum + i, i = i + 1"
io out "Output sum"
end e "End"
flow s -> in
flow in -> p
flow p -> d
flow d -> a "Yes"
flow a -> d
flow d -> out "No"
flow out -> e
```

The same example in Russian:

```
diagram gost "Сумма чисел"
start s "Начало"
io in "Ввод n"
preparation p "i = 1, sum = 0"
decision d "i <= n?"
process a "sum = sum + i, i = i + 1"
io out "Вывод sum"
end e "Конец"
flow s -> in
flow in -> p
flow p -> d
flow d -> a "Да"
flow a -> d
flow d -> out "Нет"
flow out -> e
```

### Graphs

- Header: `diagram graph`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: graphviz, mermaid

Example:

```
diagram graph "Roads"
mode undirected
vertex A
vertex B
vertex C
vertex D
edge A -- B weight=4
edge A -- C weight=2
edge B -- C weight=1
edge B -- D weight=5
edge C -- D weight=8
path A -> D
```

The same example in Russian:

```
diagram graph "Дороги"
mode undirected
vertex A
vertex B
vertex C
vertex D
edge A -- B weight=4
edge A -- C weight=2
edge B -- C weight=1
edge B -- D weight=5
edge C -- D weight=8
path A -> D
```

### DAG — directed acyclic graph

- Header: `diagram dag`
- Elements: `task`
- Links: `depend`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram dag "Build pipeline"
task fetch "Fetch" duration=2
task compile "Compile" duration=5
task test "Test" duration=8
task lint "Lint" duration=3
task package "Package" duration=2
depend fetch -> compile
depend fetch -> lint
depend compile -> test
depend lint -> package
depend test -> package
```

The same example in Russian:

```
diagram dag "Конвейер сборки"
task fetch "Загрузка" duration=2
task compile "Компиляция" duration=5
task test "Тесты" duration=8
task lint "Линтер" duration=3
task package "Упаковка" duration=2
depend fetch -> compile
depend fetch -> lint
depend compile -> test
depend lint -> package
depend test -> package
```

### UML — class diagram

- Header: `diagram uml class`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml class "Shop"
interface Payable {
  + pay(amount: Money): Receipt
}
abstract class Person {
  - name: String
  + getName(): String
}
class Customer {
  - email: String
  + placeOrder(item: Item): Order
}
class Order {
  + total(): Money
}
class Item {
  + price: Money
}
Customer --|> Person
Order ..|> Payable
Customer "1" --> "0..*" Order : places
Order "1" *-- "1..*" Item : contains
```

The same example in Russian:

```
diagram uml class "Магазин"
interface Оплачиваемый {
  + оплатить(сумма: Деньги): Чек
}
abstract class Человек {
  - имя: String
  + получитьИмя(): String
}
class Покупатель {
  - почта: String
  + оформитьЗаказ(товар: Товар): Заказ
}
class Заказ {
  + итого(): Деньги
}
class Товар {
  + цена: Деньги
}
Покупатель --|> Человек
Заказ ..|> Оплачиваемый
Покупатель "1" --> "0..*" Заказ : оформляет
Заказ "1" *-- "1..*" Товар : содержит
```

### UML — object diagram

- Header: `diagram uml object`
- Elements: `object`
- Links: `link`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml object "Order snapshot"
object c1 "alice : Customer"
object o1 "order42 : Order"
object i1 "book : Item"
link c1 -> o1 "places"
link o1 -> i1 "contains"
```

The same example in Russian:

```
diagram uml object "Снимок заказа"
object c1 "алиса : Покупатель"
object o1 "заказ42 : Заказ"
object i1 "книга : Товар"
link c1 -> o1 "оформляет"
link o1 -> i1 "содержит"
```

### UML — component diagram

- Header: `diagram uml component`
- Elements: `component`, `interface`
- Links: `provide`, `require`, `delegate`, `depend`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml component "Shop services"
component web "Web UI"
component api "Order API"
component db "Database driver"
interface IOrder
interface ISql
provide api -> IOrder
require web -> IOrder
require api -> ISql
provide db -> ISql
```

The same example in Russian:

```
diagram uml component "Сервисы магазина"
component web "Веб-интерфейс"
component api "API заказов"
component db "Драйвер базы данных"
interface IOrder
interface ISql
provide api -> IOrder
require web -> IOrder
require api -> ISql
provide db -> ISql
```

### UML — composite structure diagram

- Header: `diagram uml composite`
- Elements: `classifier`, `part`, `port`
- Links: `connect`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml composite "Car"
classifier car "Car"
part engine "Engine" in=car
part wheel "Wheel" in=car
port p1 "drive" of=engine
port p2 "axle" of=wheel
connect p1 -> p2 "torque"
```

The same example in Russian:

```
diagram uml composite "Автомобиль"
classifier car "Автомобиль"
part engine "Двигатель" in=car
part wheel "Колесо" in=car
port p1 "привод" of=engine
port p2 "ось" of=wheel
connect p1 -> p2 "крутящий момент"
```

### UML — deployment diagram

- Header: `diagram uml deployment`
- Elements: `node`, `device`, `environment`, `artifact`
- Links: `deploy`, `communicate`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml deployment "Shop deployment"
node server "Application server"
environment tomcat "Tomcat"
device phone "Mobile phone"
artifact app "shop.war"
artifact mobile "shop.apk"
deploy app -> tomcat
deploy mobile -> phone
communicate tomcat -> phone "HTTPS"
communicate server -> tomcat
```

The same example in Russian:

```
diagram uml deployment "Развёртывание магазина"
node server "Сервер приложений"
environment tomcat "Tomcat"
device phone "Мобильный телефон"
artifact app "shop.war"
artifact mobile "shop.apk"
deploy app -> tomcat
deploy mobile -> phone
communicate tomcat -> phone "HTTPS"
communicate server -> tomcat
```

### UML — package diagram

- Header: `diagram uml package`
- Elements: `package`, `element`
- Links: `import`, `access`, `merge`, `contains`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml package "Shop modules"
package shop "shop"
package ui "ui"
package domain "domain"
element order "Order"
contains shop -> ui
contains shop -> domain
contains domain -> order
import ui -> domain
```

The same example in Russian:

```
diagram uml package "Модули магазина"
package shop "магазин"
package ui "интерфейс"
package domain "предметная область"
element order "Заказ"
contains shop -> ui
contains shop -> domain
contains domain -> order
import ui -> domain
```

### UML — profile diagram

- Header: `diagram uml profile`
- Elements: `profile`, `metaclass`, `stereotype`
- Links: `extend`, `generalize`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml profile "Shop profile"
profile shopProfile "Shop"
metaclass Class
stereotype Entity
stereotype Service
extend Entity -> Class
extend Service -> Class
```

The same example in Russian:

```
diagram uml profile "Профиль магазина"
profile shopProfile "Магазин"
metaclass Class
stereotype Сущность
stereotype Сервис
extend Сущность -> Class
extend Сервис -> Class
```

### UML — use case diagram

- Header: `diagram uml usecase`
- Elements: `actor`, `usecase`
- Links: `link`, `include`, `extend`, `generalize`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml usecase "Online shop"
actor Customer
actor Clerk
usecase browse "Browse catalog"
usecase order "Place order"
usecase pay "Pay"
usecase gift "Add gift wrap"
link Customer -> browse
link Customer -> order
link Clerk -> order
include order -> pay
extend gift -> order
```

The same example in Russian:

```
diagram uml usecase "Интернет-магазин"
actor Покупатель
actor Продавец
usecase browse "Просмотреть каталог"
usecase order "Оформить заказ"
usecase pay "Оплатить"
usecase gift "Добавить подарочную упаковку"
link Покупатель -> browse
link Покупатель -> order
link Продавец -> order
include order -> pay
extend gift -> order
```

### UML — activity diagram

- Header: `diagram uml activity`
- Elements: `start`, `end`, `action`, `decision`, `merge`, `fork`, `join`
- Links: `flow`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml activity "Order flow"
start s
action a1 "Receive order"
decision d "In stock?"
action a2 "Pack"
action a3 "Back-order"
merge m
action a4 "Ship"
end e
flow s -> a1
flow a1 -> d
flow d -> a2 "yes"
flow d -> a3 "no"
flow a2 -> m
flow a3 -> m
flow m -> a4
flow a4 -> e
```

The same example in Russian:

```
diagram uml activity "Ход заказа"
start s
action a1 "Принять заказ"
decision d "Товар в наличии?"
action a2 "Упаковать"
action a3 "Заказать у поставщика"
merge m
action a4 "Отправить"
end e
flow s -> a1
flow a1 -> d
flow d -> a2 "да"
flow d -> a3 "нет"
flow a2 -> m
flow a3 -> m
flow m -> a4
flow a4 -> e
```

### UML — state machine diagram

- Header: `diagram uml state`
- Elements: `initial`, `final`, `state`
- Links: `transition`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml state "Player"
initial i
state idle "Idle"
state running "Running"
state paused "Paused"
final f
transition i -> idle
transition idle -> running "start"
transition running -> paused "pause"
transition paused -> running "resume"
transition running -> f "stop"
```

The same example in Russian:

```
diagram uml state "Плеер"
initial i
state idle "Ожидание"
state running "Воспроизведение"
state paused "Пауза"
final f
transition i -> idle
transition idle -> running "старт"
transition running -> paused "пауза"
transition paused -> running "продолжить"
transition running -> f "стоп"
```

### UML — sequence diagram

- Header: `diagram uml sequence`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: mermaid, plantuml

Example:

```
diagram uml sequence "Checkout"
actor Customer
participant Shop "Online shop"
participant Bank
Customer -> Shop : place order
Shop -> Bank : charge card
Bank --> Shop : approved
Shop ->> Customer : confirmation email
Shop --> Customer : order accepted
```

The same example in Russian:

```
diagram uml sequence "Оформление заказа"
actor Покупатель
participant Магазин "Интернет-магазин"
participant Банк
Покупатель -> Магазин : оформить заказ
Магазин -> Банк : списать с карты
Банк --> Магазин : одобрено
Магазин ->> Покупатель : письмо с подтверждением
Магазин --> Покупатель : заказ принят
```

### UML — communication diagram

- Header: `diagram uml communication`
- Elements: `object`
- Links: `message`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml communication "Checkout"
object c "customer : Customer"
object s "shop : Shop"
object b "bank : Bank"
message c -> s "1: place order"
message s -> b "1.1: charge card"
message s -> c "2: confirm"
```

The same example in Russian:

```
diagram uml communication "Оформление заказа"
object c "покупатель : Покупатель"
object s "магазин : Магазин"
object b "банк : Банк"
message c -> s "1: оформить заказ"
message s -> b "1.1: списать с карты"
message s -> c "2: подтвердить"
```

### UML — timing diagram

- Header: `diagram uml timing`
- Elements: written in the code, see the example
- Links: written in the code, see the example
- Export: plantuml

Example:

```
diagram uml timing "Crossing"
lifeline light "Traffic light" states Red, Green, Yellow
lifeline car "Car" states Stopped, Moving
at 0 light Red
at 0 car Stopped
at 30 light Green
at 30 car Moving
at 60 light Yellow
at 70 light Red
at 80 car Stopped
```

The same example in Russian:

```
diagram uml timing "Перекрёсток"
lifeline light "Светофор" states Красный, Зелёный, Жёлтый
lifeline car "Автомобиль" states Стоит, Едет
at 0 light Красный
at 0 car Стоит
at 30 light Зелёный
at 30 car Едет
at 60 light Жёлтый
at 70 light Красный
at 80 car Стоит
```

### UML — interaction overview diagram

- Header: `diagram uml overview`
- Elements: `start`, `end`, `interaction`, `decision`, `merge`, `fork`, `join`
- Links: `flow`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram uml overview "Checkout overview"
start s
interaction i1 "Login"
decision d "Valid?"
interaction i2 "Checkout"
interaction i3 "Show error"
merge m
end e
flow s -> i1
flow i1 -> d
flow d -> i2 "yes"
flow d -> i3 "no"
flow i2 -> m
flow i3 -> m
flow m -> e
```

The same example in Russian:

```
diagram uml overview "Обзор оформления заказа"
start s
interaction i1 "Вход"
decision d "Данные верны?"
interaction i2 "Оформление"
interaction i3 "Показать ошибку"
merge m
end e
flow s -> i1
flow i1 -> d
flow d -> i2 "да"
flow d -> i3 "нет"
flow i2 -> m
flow i3 -> m
flow m -> e
```

### Mind map

- Header: `diagram mindmap`
- Elements: `root`, `topic`
- Links: `branch`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram mindmap "Learning plan"
root r "DSLKit course"
topic server "Server"
topic client "Client"
topic ops "Operations"
topic api "REST API"
topic auth "Authentication"
topic react "React"
topic docker "Docker"
branch r -> server
branch r -> client
branch r -> ops
branch server -> api
branch server -> auth
branch client -> react
branch ops -> docker
```

The same example in Russian:

```
diagram mindmap "План обучения"
root r "Курс DSLKit"
topic server "Сервер"
topic client "Клиент"
topic ops "Эксплуатация"
topic api "REST API"
topic auth "Аутентификация"
topic react "React"
topic docker "Docker"
branch r -> server
branch r -> client
branch r -> ops
branch server -> api
branch server -> auth
branch client -> react
branch ops -> docker
```

### Organisation chart

- Header: `diagram orgchart`
- Elements: `unit`, `person`
- Links: `leads`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram orgchart "Project team"
person head "Head of project"
unit dev "Development"
unit qa "Quality"
person lead "Tech lead"
person dev1 "Developer"
person tester "Tester"
leads head -> dev
leads head -> qa
leads dev -> lead
leads lead -> dev1
leads qa -> tester
```

The same example in Russian:

```
diagram orgchart "Команда проекта"
person head "Руководитель проекта"
unit dev "Разработка"
unit qa "Качество"
person lead "Технический лидер"
person dev1 "Разработчик"
person tester "Тестировщик"
leads head -> dev
leads head -> qa
leads dev -> lead
leads lead -> dev1
leads qa -> tester
```

### C4 — context and containers

- Header: `diagram c4`
- Elements: `person`, `system`, `external`, `container`, `database`
- Links: `uses`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram c4 "DSLKit context"
person user "Diagram author"
system dslkit "DSLKit"
external kroki "Kroki rendering service"
container api "REST API"
database db "PostgreSQL"
uses user -> dslkit "writes diagrams"
uses dslkit -> kroki "asks to draw"
uses dslkit -> api "calls"
uses api -> db "reads and writes"
```

The same example in Russian:

```
diagram c4 "Контекст DSLKit"
person user "Автор диаграмм"
system dslkit "DSLKit"
external kroki "Сервис отрисовки Kroki"
container api "REST API"
database db "PostgreSQL"
uses user -> dslkit "пишет диаграммы"
uses dslkit -> kroki "просит нарисовать"
uses dslkit -> api "вызывает"
uses api -> db "читает и пишет"
```

### Network diagram

- Header: `diagram network`
- Elements: `cloud`, `router`, `switch`, `server`, `client`, `database`
- Links: `link`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram network "Office network"
cloud net "Internet"
router r1 "Router"
switch sw "Switch"
server web "Web server"
database db "Database"
client c1 "Laptop"
client c2 "Phone"
link net -> r1
link r1 -> sw
link sw -> web
link web -> db
link sw -> c1
link sw -> c2
```

The same example in Russian:

```
diagram network "Сеть офиса"
cloud net "Интернет"
router r1 "Маршрутизатор"
switch sw "Коммутатор"
server web "Веб-сервер"
database db "База данных"
client c1 "Ноутбук"
client c2 "Телефон"
link net -> r1
link r1 -> sw
link sw -> web
link web -> db
link sw -> c1
link sw -> c2
```

### Decision tree

- Header: `diagram decision`
- Elements: `question`, `outcome`
- Links: `answer`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram decision "Choose a database"
question q1 "Many users at once?"
question q2 "Strict relations?"
outcome sqlite "SQLite"
outcome pg "PostgreSQL"
outcome mongo "MongoDB"
answer q1 -> q2 "yes"
answer q1 -> sqlite "no"
answer q2 -> pg "yes"
answer q2 -> mongo "no"
```

The same example in Russian:

```
diagram decision "Выбор базы данных"
question q1 "Много пользователей одновременно?"
question q2 "Строгие связи между данными?"
outcome sqlite "SQLite"
outcome pg "PostgreSQL"
outcome mongo "MongoDB"
answer q1 -> q2 "да"
answer q1 -> sqlite "нет"
answer q2 -> pg "да"
answer q2 -> mongo "нет"
```

### eEPC — event-driven process chain

- Header: `diagram epc`
- Elements: `event`, `function`, `and`, `or`, `xor`
- Links: `flow`
- Export: graphviz, mermaid, plantuml

Example:

```
diagram epc "Order handling"
event e1 "Order received"
function f1 "Check order"
xor g1 "XOR"
event e2 "Order is valid"
event e3 "Order is invalid"
function f2 "Ship goods"
function f3 "Reject order"
event e4 "Goods shipped"
event e5 "Order rejected"
flow e1 -> f1
flow f1 -> g1
flow g1 -> e2
flow g1 -> e3
flow e2 -> f2
flow e3 -> f3
flow f2 -> e4
flow f3 -> e5
```

The same example in Russian:

```
diagram epc "Обработка заказа"
event e1 "Заказ получен"
function f1 "Проверить заказ"
xor g1 "XOR"
event e2 "Заказ верен"
event e3 "Заказ неверен"
function f2 "Отгрузить товар"
function f3 "Отклонить заказ"
event e4 "Товар отгружен"
event e5 "Заказ отклонён"
flow e1 -> f1
flow f1 -> g1
flow g1 -> e2
flow g1 -> e3
flow e2 -> f2
flow e3 -> f3
flow f2 -> e4
flow f3 -> e5
```
