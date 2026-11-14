// Russian variants of the starter sources of templates.js: the same keys, the same structure, the same DSL keywords.
// The titles, the labels, the descriptions and the names of the elements are Russian, the identifiers that only link
// elements stay short Latin ones. Every source is valid: it has no errors (a test parses all of them).
export const TEMPLATES_RU = {
  idef0: `diagram idef0 "Обработка заказа"
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
arrow A2.output -> A3.input`,
  idef1: `diagram idef1 "Информация о заказах"
entity Клиент {
  id: int pk
  имя: string
}
entity Заказ {
  id: int pk
  сумма: decimal
}
relationship Клиент 1:N Заказ "оформляет"`,
  idef1x: `diagram idef1x "Заказы"
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
category Счёт complete вид: Сберегательный, Расчётный`,
  idef3: `diagram idef3 "Выполнение заказа"
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
relational r1 -> u2`,
  idef4: `diagram idef4 "Транспорт"
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
Автомобиль "1" *-- "1" Двигатель : имеет`,
  idef5: `diagram idef5 "Организация"
kind Employee "Сотрудник"
kind Manager "Руководитель"
kind Team "Команда"
individual alice "Алиса"
process hire "Найм"
isa Manager -> Employee
partof Employee -> Team
instanceof alice -> Manager
relation Manager -> hire "выполняет"`,
  dfd: `diagram dfd "Заказ в интернет-магазине"
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
flow 2 -> Клиент "чек"`,
  erd: `diagram erd "Магазин"
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
relationship Заказ N:M Товар "содержит"`,
  bpmn: `diagram bpmn "Обработка заказа"
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
flow g2 -> e`,
  petri: `diagram petri "Производитель и потребитель"
place free "Свободные места" tokens=2
place used "Занятые места"
transition put "Произвести"
transition take "Потребить"
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
  graph: `diagram graph "Дороги"
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
  dag: `diagram dag "Конвейер сборки"
task fetch "Загрузка" duration=2
task compile "Компиляция" duration=5
task test "Тесты" duration=8
task lint "Линтер" duration=3
task package "Упаковка" duration=2
depend fetch -> compile
depend fetch -> lint
depend compile -> test
depend lint -> package
depend test -> package`,
  'uml-class': `diagram uml class "Магазин"
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
Заказ "1" *-- "1..*" Товар : содержит`,
  'uml-object': `diagram uml object "Снимок заказа"
object c1 "алиса : Покупатель"
object o1 "заказ42 : Заказ"
object i1 "книга : Товар"
link c1 -> o1 "оформляет"
link o1 -> i1 "содержит"`,
  'uml-component': `diagram uml component "Сервисы магазина"
component web "Веб-интерфейс"
component api "API заказов"
component db "Драйвер базы данных"
interface IOrder
interface ISql
provide api -> IOrder
require web -> IOrder
require api -> ISql
provide db -> ISql`,
  'uml-composite': `diagram uml composite "Автомобиль"
classifier car "Автомобиль"
part engine "Двигатель" in=car
part wheel "Колесо" in=car
port p1 "привод" of=engine
port p2 "ось" of=wheel
connect p1 -> p2 "крутящий момент"`,
  'uml-deployment': `diagram uml deployment "Развёртывание магазина"
node server "Сервер приложений"
environment tomcat "Tomcat"
device phone "Мобильный телефон"
artifact app "shop.war"
artifact mobile "shop.apk"
deploy app -> tomcat
deploy mobile -> phone
communicate tomcat -> phone "HTTPS"
communicate server -> tomcat`,
  'uml-package': `diagram uml package "Модули магазина"
package shop "магазин"
package ui "интерфейс"
package domain "предметная область"
element order "Заказ"
contains shop -> ui
contains shop -> domain
contains domain -> order
import ui -> domain`,
  'uml-profile': `diagram uml profile "Профиль магазина"
profile shopProfile "Магазин"
metaclass Class
stereotype Сущность
stereotype Сервис
extend Сущность -> Class
extend Сервис -> Class`,
  'uml-usecase': `diagram uml usecase "Интернет-магазин"
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
extend gift -> order`,
  'uml-activity': `diagram uml activity "Ход заказа"
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
flow a4 -> e`,
  'uml-state': `diagram uml state "Плеер"
initial i
state idle "Ожидание"
state running "Воспроизведение"
state paused "Пауза"
final f
transition i -> idle
transition idle -> running "старт"
transition running -> paused "пауза"
transition paused -> running "продолжить"
transition running -> f "стоп"`,
  'uml-sequence': `diagram uml sequence "Оформление заказа"
actor Покупатель
participant Магазин "Интернет-магазин"
participant Банк
Покупатель -> Магазин : оформить заказ
Магазин -> Банк : списать с карты
Банк --> Магазин : одобрено
Магазин ->> Покупатель : письмо с подтверждением
Магазин --> Покупатель : заказ принят`,
  'uml-communication': `diagram uml communication "Оформление заказа"
object c "покупатель : Покупатель"
object s "магазин : Магазин"
object b "банк : Банк"
message c -> s "1: оформить заказ"
message s -> b "1.1: списать с карты"
message s -> c "2: подтвердить"`,
  'uml-timing': `diagram uml timing "Перекрёсток"
lifeline light "Светофор" states Красный, Зелёный, Жёлтый
lifeline car "Автомобиль" states Стоит, Едет
at 0 light Красный
at 0 car Стоит
at 30 light Зелёный
at 30 car Едет
at 60 light Жёлтый
at 70 light Красный
at 80 car Стоит`,
  'uml-overview': `diagram uml overview "Обзор оформления заказа"
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
flow m -> e`,
  mindmap: `diagram mindmap "План обучения"
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
branch ops -> docker`,
  orgchart: `diagram orgchart "Команда проекта"
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
leads qa -> tester`,
  c4: `diagram c4 "Контекст DSLKit"
person user "Автор диаграмм"
system dslkit "DSLKit"
external kroki "Сервис отрисовки Kroki"
container api "REST API"
database db "PostgreSQL"
uses user -> dslkit "пишет диаграммы"
uses dslkit -> kroki "просит нарисовать"
uses dslkit -> api "вызывает"
uses api -> db "читает и пишет"`,
  network: `diagram network "Сеть офиса"
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
link sw -> c2`,
  decision: `diagram decision "Выбор базы данных"
question q1 "Много пользователей одновременно?"
question q2 "Строгие связи между данными?"
outcome sqlite "SQLite"
outcome pg "PostgreSQL"
outcome mongo "MongoDB"
answer q1 -> q2 "да"
answer q1 -> sqlite "нет"
answer q2 -> pg "да"
answer q2 -> mongo "нет"`,
  epc: `diagram epc "Обработка заказа"
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
flow f3 -> e5`,
};
