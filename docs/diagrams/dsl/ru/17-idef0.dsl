diagram idef0 "Работа редактора"
box A1 "Написать код" {
 input: Замысел
 control: Синтаксис DSLKit
 output: Текст
 mechanism: Автор
}
box A2 "Нарисовать" {
 input: Текст
 control: Правила нотации
 output: Рисунок
 mechanism: Движок
}
box A3 "Выдать результат" {
 input: Рисунок
 control: Формат экспорта
 output: Файл
 mechanism: Браузер
}
arrow A1.output -> A2.input
arrow A2.output -> A3.input
