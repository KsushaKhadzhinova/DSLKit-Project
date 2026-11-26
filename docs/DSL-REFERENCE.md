# Справочник языка DSLKit

DSLKit описывает диаграмму текстом: первая строка называет нотацию, остальные строки объявляют элементы и связи. Одна строка, один элемент или одна связь. Строки с «//» это комментарии, пустые строки игнорируются. Подписи пишутся в двойных кавычках, внутри кавычек «\"» и «
» работают как обычно. Положение блока на доске задаётся необязательным атрибутом pos=XxY. Цвет блока графовых нотаций (DFD, BPMN, ГОСТ, состояния и других, где блоки рисуются из фигур) задаётся необязательным атрибутом color=#rrggbb или color=#rgb, например process 2 "Оплата" color=#ffcc00. Допустим только такой вид: названия цветов и функции вроде rgb() отклоняются ошибкой. Цвет текста выбирается автоматически (чёрный или белый, контраст не ниже 4,5). В PlantUML и Mermaid цвет попадает у блок-схем (стиль узла); у остальных нотаций он не переносится, и редактор сообщает об этом.

## Как это работает

1. Разбор: parseDiagram читает текст и строит модель с номерами строк и списком проблем.
2. Проверка: каждая нотация и общие строгие правила (strict.js) сообщают об ошибках и предупреждениях на русском и английском.
3. Отрисовка: собственный движок рисует SVG в браузере (site/js/notations), тот же код отдаёт сервер по POST /api/render.
4. Экспорт: из той же модели получаются Graphviz, Mermaid и PlantUML; через /api/external/<язык> текст на другом языке рисует внешний сервис.

## Грамматика

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

## Импорт файлов и картинок

Мастер «Автоматическое построение» принимает файлы до 10 МБ. Формат определяется по содержимому, затем по расширению. Структурные форматы читает детерминированный импортёр без ключа ИИ (site/js/utils/diagram-file-import.js), картинки и PDF читает только ИИ сервера.

| Формат                                                                               | Результат                                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| draw.io (.drawio, .dio, сжатое и несжатое), SVG (экспорт draw.io, Graphviz, Mermaid) | блок-схема ГОСТ, BPMN или граф, положения pos=XxY сохраняются  |
| JSON (nodes и edges, Cytoscape, Excalidraw, Lucid)                                   | граф или блок-схема ГОСТ                                       |
| BPMN 2.0 XML (.bpmn)                                                                 | BPMN с положениями из BPMNShape                                |
| XMI (.xmi, .uml)                                                                     | UML, диаграмма классов                                         |
| GraphML, GEXF, DOT (.dot, .gv), CSV и TSV со связями                                 | граф                                                           |
| Visio (.vdx, .vsdx)                                                                  | блок-схема ГОСТ или граф                                       |
| Mermaid (.mmd, .md), PlantUML (.puml, .plantuml, .pu, .wsd), DSLKit (.dsl), текст    | существующий импорт блок-схем, последовательностей и состояний |
| png, jpeg, webp, gif, pdf                                                            | только ИИ с ключом на сервере; BMP не принимается              |

## Нотации

### IDEF0 — функциональное моделирование

- Заголовок: `diagram idef0`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### IDEF1 — информационное моделирование

- Заголовок: `diagram idef1`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### IDEF1X — моделирование данных

- Заголовок: `diagram idef1x`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### IDEF3 — потоки работ

- Заголовок: `diagram idef3`
- Элементы: `uob`, `and`, `or`, `xor`, `referent`
- Связи: `precedence`, `relational`, `objectflow`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### IDEF4 — объектно-ориентированное проектирование

- Заголовок: `diagram idef4`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### IDEF5 — онтологическое описание

- Заголовок: `diagram idef5`
- Элементы: `kind`, `individual`, `process`
- Связи: `isa`, `partof`, `instanceof`, `relation`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### DFD — диаграмма потоков данных

- Заголовок: `diagram dfd`
- Элементы: `entity`, `process`, `store`
- Связи: `flow`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### ERD — диаграмма «сущность — связь»

- Заголовок: `diagram erd`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### BPMN — бизнес-процессы

- Заголовок: `diagram bpmn`
- Элементы: `start`, `end`, `intermediate`, `task`, `exclusive`, `parallel`
- Связи: `flow`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### Сети Петри

- Заголовок: `diagram petri`
- Элементы: `place`, `transition`
- Связи: `arc`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### Блок-схемы по ГОСТ 19.701-90

- Заголовок: `diagram gost`
- Элементы: `start`, `end`, `process`, `decision`, `predefined`, `io`, `preparation`, `manual`, `document`, `connector`, `offpage`, `storage`, `comment`
- Связи: `flow`, `note`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### Графы

- Заголовок: `diagram graph`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: graphviz, mermaid

Пример:

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

Тот же пример на английском:

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

### DAG — ориентированный ациклический граф

- Заголовок: `diagram dag`
- Элементы: `task`
- Связи: `depend`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — диаграмма классов

- Заголовок: `diagram uml class`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — диаграмма объектов

- Заголовок: `diagram uml object`
- Элементы: `object`
- Связи: `link`
- Экспорт: graphviz, mermaid, plantuml

Пример:

```
diagram uml object "Снимок заказа"
object c1 "алиса : Покупатель"
object o1 "заказ42 : Заказ"
object i1 "книга : Товар"
link c1 -> o1 "оформляет"
link o1 -> i1 "содержит"
```

Тот же пример на английском:

```
diagram uml object "Order snapshot"
object c1 "alice : Customer"
object o1 "order42 : Order"
object i1 "book : Item"
link c1 -> o1 "places"
link o1 -> i1 "contains"
```

### UML — диаграмма компонентов

- Заголовок: `diagram uml component`
- Элементы: `component`, `interface`
- Связи: `provide`, `require`, `delegate`, `depend`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — составная структура

- Заголовок: `diagram uml composite`
- Элементы: `classifier`, `part`, `port`
- Связи: `connect`
- Экспорт: graphviz, mermaid, plantuml

Пример:

```
diagram uml composite "Автомобиль"
classifier car "Автомобиль"
part engine "Двигатель" in=car
part wheel "Колесо" in=car
port p1 "привод" of=engine
port p2 "ось" of=wheel
connect p1 -> p2 "крутящий момент"
```

Тот же пример на английском:

```
diagram uml composite "Car"
classifier car "Car"
part engine "Engine" in=car
part wheel "Wheel" in=car
port p1 "drive" of=engine
port p2 "axle" of=wheel
connect p1 -> p2 "torque"
```

### UML — диаграмма развёртывания

- Заголовок: `diagram uml deployment`
- Элементы: `node`, `device`, `environment`, `artifact`
- Связи: `deploy`, `communicate`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — диаграмма пакетов

- Заголовок: `diagram uml package`
- Элементы: `package`, `element`
- Связи: `import`, `access`, `merge`, `contains`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — диаграмма профилей

- Заголовок: `diagram uml profile`
- Элементы: `profile`, `metaclass`, `stereotype`
- Связи: `extend`, `generalize`
- Экспорт: graphviz, mermaid, plantuml

Пример:

```
diagram uml profile "Профиль магазина"
profile shopProfile "Магазин"
metaclass Class
stereotype Сущность
stereotype Сервис
extend Сущность -> Class
extend Сервис -> Class
```

Тот же пример на английском:

```
diagram uml profile "Shop profile"
profile shopProfile "Shop"
metaclass Class
stereotype Entity
stereotype Service
extend Entity -> Class
extend Service -> Class
```

### UML — диаграмма вариантов использования

- Заголовок: `diagram uml usecase`
- Элементы: `actor`, `usecase`
- Связи: `link`, `include`, `extend`, `generalize`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — диаграмма деятельности

- Заголовок: `diagram uml activity`
- Элементы: `start`, `end`, `action`, `decision`, `merge`, `fork`, `join`
- Связи: `flow`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — диаграмма состояний

- Заголовок: `diagram uml state`
- Элементы: `initial`, `final`, `state`
- Связи: `transition`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — диаграмма последовательности

- Заголовок: `diagram uml sequence`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### UML — диаграмма коммуникации

- Заголовок: `diagram uml communication`
- Элементы: `object`
- Связи: `message`
- Экспорт: graphviz, mermaid, plantuml

Пример:

```
diagram uml communication "Оформление заказа"
object c "покупатель : Покупатель"
object s "магазин : Магазин"
object b "банк : Банк"
message c -> s "1: оформить заказ"
message s -> b "1.1: списать с карты"
message s -> c "2: подтвердить"
```

Тот же пример на английском:

```
diagram uml communication "Checkout"
object c "customer : Customer"
object s "shop : Shop"
object b "bank : Bank"
message c -> s "1: place order"
message s -> b "1.1: charge card"
message s -> c "2: confirm"
```

### UML — диаграмма синхронизации

- Заголовок: `diagram uml timing`
- Элементы: пишутся в коде, см. пример
- Связи: пишутся в коде, см. пример
- Экспорт: plantuml

Пример:

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

Тот же пример на английском:

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

### UML — обзор взаимодействий

- Заголовок: `diagram uml overview`
- Элементы: `start`, `end`, `interaction`, `decision`, `merge`, `fork`, `join`
- Связи: `flow`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### Ментальная карта

- Заголовок: `diagram mindmap`
- Элементы: `root`, `topic`
- Связи: `branch`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### Организационная структура

- Заголовок: `diagram orgchart`
- Элементы: `unit`, `person`
- Связи: `leads`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### C4 — контекст и контейнеры

- Заголовок: `diagram c4`
- Элементы: `person`, `system`, `external`, `container`, `database`
- Связи: `uses`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### Схема компьютерной сети

- Заголовок: `diagram network`
- Элементы: `cloud`, `router`, `switch`, `server`, `client`, `database`
- Связи: `link`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### Дерево решений

- Заголовок: `diagram decision`
- Элементы: `question`, `outcome`
- Связи: `answer`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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

### eEPC — цепочка процессов по событиям

- Заголовок: `diagram epc`
- Элементы: `event`, `function`, `and`, `or`, `xor`
- Связи: `flow`
- Экспорт: graphviz, mermaid, plantuml

Пример:

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

Тот же пример на английском:

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
