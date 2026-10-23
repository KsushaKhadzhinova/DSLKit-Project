// Starter sources shown by the template buttons in the editor. Every template is valid: it has no errors.
export const TEMPLATES = {
  idef0: `diagram idef0 "Order process"
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
arrow A2.output -> A3.input`,
  idef1: `diagram idef1 "Order information"
entity Customer {
  id: int pk
  name: string
}
entity Order {
  id: int pk
  total: decimal
}
relationship Customer 1:N Order "places"`,
  idef1x: `diagram idef1x "Orders"
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
category Account complete kind: Savings, Checking`,
  idef3: `diagram idef3 "Order fulfilment"
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
relational r1 -> u2`,
  idef4: `diagram idef4 "Vehicles"
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
Car "1" *-- "1" Engine : has`,
  idef5: `diagram idef5 "Organisation"
kind Employee "Employee"
kind Manager "Manager"
kind Team "Team"
individual alice "Alice"
process hire "Hiring"
isa Manager -> Employee
partof Employee -> Team
instanceof alice -> Manager
relation Manager -> hire "performs"`,
  dfd: `diagram dfd "Online order"
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
flow 2 -> Customer "receipt"`,
  erd: `diagram erd "Shop"
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
relationship Order N:M Product "contains"`,
  bpmn: `diagram bpmn "Order handling"
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
flow g2 -> e`,
  petri: `diagram petri "Producer and consumer"
place free "Free slots" tokens=2
place used "Used slots"
transition put "Produce"
transition take "Consume"
arc free -> put
arc put -> used weight=2
arc used -> take
arc take -> free`,
  gost: `diagram gost "Сумма чисел"
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
flow out -> e`,
  graph: `diagram graph "Roads"
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
path A -> D`,
  dag: `diagram dag "Build pipeline"
task fetch "Fetch" duration=2
task compile "Compile" duration=5
task test "Test" duration=8
task lint "Lint" duration=3
task package "Package" duration=2
depend fetch -> compile
depend fetch -> lint
depend compile -> test
depend lint -> package
depend test -> package`,
  'uml-class': `diagram uml class "Shop"
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
Order "1" *-- "1..*" Item : contains`,
  'uml-object': `diagram uml object "Order snapshot"
object c1 "alice : Customer"
object o1 "order42 : Order"
object i1 "book : Item"
link c1 -> o1 "places"
link o1 -> i1 "contains"`,
  'uml-component': `diagram uml component "Shop services"
component web "Web UI"
component api "Order API"
component db "Database driver"
interface IOrder
interface ISql
provide api -> IOrder
require web -> IOrder
require api -> ISql
provide db -> ISql`,
  'uml-composite': `diagram uml composite "Car"
classifier car "Car"
part engine "Engine" in=car
part wheel "Wheel" in=car
port p1 "drive" of=engine
port p2 "axle" of=wheel
connect p1 -> p2 "torque"`,
  'uml-deployment': `diagram uml deployment "Shop deployment"
node server "Application server"
environment tomcat "Tomcat"
device phone "Mobile phone"
artifact app "shop.war"
artifact mobile "shop.apk"
deploy app -> tomcat
deploy mobile -> phone
communicate tomcat -> phone "HTTPS"
communicate server -> tomcat`,
  'uml-package': `diagram uml package "Shop modules"
package shop "shop"
package ui "ui"
package domain "domain"
element order "Order"
contains shop -> ui
contains shop -> domain
contains domain -> order
import ui -> domain`,
  'uml-profile': `diagram uml profile "Shop profile"
profile shopProfile "Shop"
metaclass Class
stereotype Entity
stereotype Service
extend Entity -> Class
extend Service -> Class`,
  'uml-usecase': `diagram uml usecase "Online shop"
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
extend gift -> order`,
  'uml-activity': `diagram uml activity "Order flow"
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
flow a4 -> e`,
  'uml-state': `diagram uml state "Player"
initial i
state idle "Idle"
state running "Running"
state paused "Paused"
final f
transition i -> idle
transition idle -> running "start"
transition running -> paused "pause"
transition paused -> running "resume"
transition running -> f "stop"`,
  'uml-sequence': `diagram uml sequence "Checkout"
actor Customer
participant Shop "Online shop"
participant Bank
Customer -> Shop : place order
Shop -> Bank : charge card
Bank --> Shop : approved
Shop ->> Customer : confirmation email
Shop --> Customer : order accepted`,
  'uml-communication': `diagram uml communication "Checkout"
object c "customer : Customer"
object s "shop : Shop"
object b "bank : Bank"
message c -> s "1: place order"
message s -> b "1.1: charge card"
message s -> c "2: confirm"`,
  'uml-timing': `diagram uml timing "Crossing"
lifeline light "Traffic light" states Red, Green, Yellow
lifeline car "Car" states Stopped, Moving
at 0 light Red
at 0 car Stopped
at 30 light Green
at 30 car Moving
at 60 light Yellow
at 70 light Red
at 80 car Stopped`,
  'uml-overview': `diagram uml overview "Checkout overview"
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
flow m -> e`,
  mindmap: `diagram mindmap "Learning plan"
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
branch ops -> docker`,
  orgchart: `diagram orgchart "Project team"
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
leads qa -> tester`,
  c4: `diagram c4 "DSLKit context"
person user "Diagram author"
system dslkit "DSLKit"
external kroki "Kroki rendering service"
container api "REST API"
database db "PostgreSQL"
uses user -> dslkit "writes diagrams"
uses dslkit -> kroki "asks to draw"
uses dslkit -> api "calls"
uses api -> db "reads and writes"`,
  network: `diagram network "Office network"
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
link sw -> c2`,
  decision: `diagram decision "Choose a database"
question q1 "Many users at once?"
question q2 "Strict relations?"
outcome sqlite "SQLite"
outcome pg "PostgreSQL"
outcome mongo "MongoDB"
answer q1 -> q2 "yes"
answer q1 -> sqlite "no"
answer q2 -> pg "yes"
answer q2 -> mongo "no"`,
  epc: `diagram epc "Order handling"
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
flow f3 -> e5`,
};

export const KEYWORDS = new Set(
  (
    'diagram box input control output mechanism arrow entity process store flow relationship identifying nonidentifying nonspecific category start end ' +
    'intermediate task exclusive parallel place transition arc class abstract interface participant actor usecase link include extend generalize action ' +
    'decision merge fork join initial final state object component provide require delegate depend classifier part port connect node device environment ' +
    'artifact deploy communicate package element contains import access profile metaclass stereotype message lifeline at interaction uob and or xor referent ' +
    'precedence relational objectflow kind individual isa partof instanceof relation predefined io preparation manual document connector offpage storage ' +
    'comment note mode vertex edge path root topic branch unit person leads system external container database uses cloud router switch server client question outcome answer event function'
  ).split(' '),
);
