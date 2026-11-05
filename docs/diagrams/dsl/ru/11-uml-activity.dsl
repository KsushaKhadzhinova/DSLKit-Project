diagram uml activity "Отрисовка"
start s
action a1 "Разобрать и проверить"
decision d "Ошибки?"
action a2 "Показать проблемы"
action a3 "Нарисовать"
action a4 "Показать на холсте"
end e
flow s -> a1
flow a1 -> d
flow d -> a2 "да"
flow d -> a3 "нет"
flow a3 -> a4
flow a2 -> e
flow a4 -> e
