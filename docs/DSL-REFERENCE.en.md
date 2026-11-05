# DSLKit language reference

DSLKit describes a diagram as text: the first line names the notation, the other lines declare elements and links. One line is one element or one link. Lines starting with "//" are comments, blank lines are ignored. Labels go in double quotes; inside quotes backslash-quote and backslash-n work as usual. The place of a block on the board is the optional attribute pos=XxY.

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

### GOST 19.701-90 flowcharts

- Header: `diagram gost`
- Elements: `start`, `end`, `process`, `decision`, `predefined`, `io`, `preparation`, `manual`, `document`, `connector`, `offpage`, `storage`, `comment`
- Links: `flow`, `note`
- Export: graphviz, mermaid, plantuml

Example:

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
