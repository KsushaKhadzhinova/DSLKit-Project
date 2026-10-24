diagram epc "Обработка кода"
event e1 "Код получен"
function f1 "Проверить код"
xor g1 "XOR"
event e2 "Ошибок нет"
event e3 "Есть ошибки"
function f2 "Нарисовать"
function f3 "Показать проблемы"
event e4 "Рисунок готов"
event e5 "Проблемы показаны"
flow e1 -> f1
flow f1 -> g1
flow g1 -> e2
flow g1 -> e3
flow e2 -> f2
flow e3 -> f3
flow f2 -> e4
flow f3 -> e5
