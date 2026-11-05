# -*- coding: utf-8 -*-
"""DSL texts typed into the editor by the scenarios."""
COURSE = {}
COURSE['idef0-context'] = '''diagram idef0 "ЛР1. IDEF0 A-0 Учёт заказов"
box A0 "Обработать заказ" {
  input: Заказ клиента
  control: Правила продаж
  output: Накладная
  mechanism: Менеджер
}
'''
COURSE['idef0-decomp'] = '''diagram idef0 "ЛР1. IDEF0 A0 Декомпозиция"
box A1 "Принять заказ" {
  input: Заказ клиента
  control: Правила продаж
  output: Принятый заказ
  mechanism: Менеджер
}
box A2 "Проверить склад" {
  input: Принятый заказ
  control: Правила склада
  output: Резерв товара
  mechanism: Кладовщик
}
box A3 "Отгрузить товар" {
  input: Резерв товара
  control: Правила доставки
  output: Накладная
  mechanism: Курьер
}
arrow A1.output -> A2.input
arrow A2.output -> A3.input
'''
COURSE['dfd-0'] = '''diagram dfd "ЛР2. DFD уровень 0"
entity Client "Клиент"
entity Bank "Банк"
process 0 "Система продаж"
flow Client -> 0 "заказ"
flow 0 -> Client "чек"
flow 0 -> Bank "запрос оплаты"
flow Bank -> 0 "результат оплаты"
'''
COURSE['dfd-1'] = '''diagram dfd "ЛР2. DFD уровень 1"
entity Client "Клиент"
entity Bank "Банк"
process 1 "Проверить заказ"
process 2 "Принять оплату"
process 3 "Отгрузить"
store D1 "Заказы"
flow Client -> 1 "заказ"
flow 1 -> D1 "проверенный заказ"
flow D1 -> 2 "заказ к оплате"
flow 2 -> Bank "запрос оплаты"
flow Bank -> 2 "результат"
flow 2 -> 3 "оплаченный заказ"
flow 3 -> Client "накладная"
'''
COURSE['dfd-2'] = '''diagram dfd "ЛР2. DFD уровень 2 (процесс 2)"
entity Bank "Банк"
store D1 "Заказы"
process 21 "Сформировать счёт"
process 22 "Отправить в банк"
process 23 "Записать результат"
store D2 "Счета"
flow D1 -> 21 "заказ к оплате"
flow 21 -> D2 "счёт"
flow D2 -> 22 "счёт к оплате"
flow 22 -> Bank "запрос"
flow Bank -> 23 "ответ"
flow 23 -> D2 "статус оплаты"
'''
COURSE['erd'] = '''diagram erd "ЛР3. ERD магазина"
entity Customer {
  id: int pk
  email: string unique
  name: string
}
entity Orders {
  id: int pk
  customer_id: int fk -> Customer
  total: decimal
}
entity Product {
  id: int pk
  name: string
  price: decimal
}
relationship Customer 1:N Orders "делает"
relationship Orders N:M Product "содержит"
'''
COURSE['uml-class'] = '''diagram uml class "ЛР4. UML классы"
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
Customer "1" --> "0..*" Order : делает
Order "1" *-- "1..*" Item : содержит
'''
COURSE['uml-sequence'] = '''diagram uml sequence "ЛР4. UML последовательность"
actor Client "Клиент"
participant Shop "Магазин"
participant Bank "Банк"
Client -> Shop : оформить заказ
Shop -> Bank : списать оплату
Bank --> Shop : одобрено
Shop --> Client : заказ принят
'''
COURSE['uml-state'] = '''diagram uml state "ЛР4. UML состояния заказа"
initial i
state new "Новый"
state paid "Оплачен"
state shipped "Отгружен"
final f
transition i -> new
transition new -> paid "оплата"
transition paid -> shipped "отгрузка"
transition shipped -> f "получен"
'''
COURSE['uml-usecase'] = '''diagram uml usecase "ЛР4. UML варианты использования"
actor Client "Клиент"
actor Manager "Менеджер"
usecase browse "Смотреть каталог"
usecase order "Оформить заказ"
usecase pay "Оплатить"
link Client -> browse
link Client -> order
link Manager -> order
include order -> pay
'''
COURSE['uml-activity'] = '''diagram uml activity "ЛР4. UML деятельность"
start s
action a1 "Принять заказ"
decision d "Есть на складе?"
action a2 "Собрать"
action a3 "Заказать у поставщика"
merge m
action a4 "Отгрузить"
end e
flow s -> a1
flow a1 -> d
flow d -> a2 "да"
flow d -> a3 "нет"
flow a2 -> m
flow a3 -> m
flow m -> a4
flow a4 -> e
'''
COURSE['bpmn'] = '''diagram bpmn "ЛР5. BPMN заказ"
start s "Заказ получен"
task t1 "Проверить заказ"
exclusive g1 "Есть товар?"
task t2 "Отгрузить"
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
'''
COURSE['petri'] = '''diagram petri "ЛР6. Сеть Петри производитель-потребитель"
place free "Свободные ячейки" tokens=2
place used "Занятые ячейки"
transition put "Произвести"
transition take "Потребить"
arc free -> put
arc put -> used weight=2
arc used -> take
arc take -> free
'''
COURSE['gost'] = '''diagram gost "ЛР7. Блок-схема суммы чисел"
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
'''

COMPANY = {}
COMPANY['c4'] = '''diagram c4 "Компания. C4 контекст"
person user "Аналитик"
system crm "CRM"
external mail "Почтовый сервис"
container api "REST API"
database db "PostgreSQL"
uses user -> crm "ведёт клиентов"
uses crm -> mail "отправляет письма"
uses crm -> api "вызывает"
uses api -> db "читает и пишет"
'''
COMPANY['epc'] = '''diagram epc "Компания. eEPC обработка заявки"
event e1 "Заявка получена"
function f1 "Проверить заявку"
xor g1 "XOR"
event e2 "Заявка верна"
event e3 "Заявка неверна"
function f2 "Выполнить"
function f3 "Отклонить"
event e4 "Выполнена"
event e5 "Отклонена"
flow e1 -> f1
flow f1 -> g1
flow g1 -> e2
flow g1 -> e3
flow e2 -> f2
flow e3 -> f3
flow f2 -> e4
flow f3 -> e5
'''
COMPANY['orgchart'] = '''diagram orgchart "Компания. Оргструктура"
person ceo "Директор"
unit it "ИТ-отдел"
unit sales "Отдел продаж"
person cto "Технический директор"
person dev "Разработчик"
person mgr "Менеджер"
leads ceo -> it
leads ceo -> sales
leads it -> cto
leads cto -> dev
leads sales -> mgr
'''
COMPANY['network'] = '''diagram network "Компания. Офисная сеть"
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
'''
COMPANY['decision'] = '''diagram decision "Компания. Выбор СУБД"
question q1 "Много пользователей?"
question q2 "Строгие связи?"
outcome sqlite "SQLite"
outcome pg "PostgreSQL"
outcome mongo "MongoDB"
answer q1 -> q2 "да"
answer q1 -> sqlite "нет"
answer q2 -> pg "да"
answer q2 -> mongo "нет"
'''
COMPANY['mindmap'] = '''diagram mindmap "Компания. План внедрения"
root r "Внедрение CRM"
topic data "Данные"
topic people "Люди"
topic tech "Технологии"
topic mig "Миграция"
topic train "Обучение"
branch r -> data
branch r -> people
branch r -> tech
branch data -> mig
branch people -> train
'''
