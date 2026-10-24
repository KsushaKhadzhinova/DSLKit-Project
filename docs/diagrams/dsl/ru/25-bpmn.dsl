diagram bpmn "Создание диаграммы"
start s "Нужна схема"
task t1 "Написать код"
task t2 "Посмотреть рисунок"
exclusive g1 "Верно?"
task t3 "Исправить"
task t4 "Экспортировать"
end e "Схема готова"
flow s -> t1
flow t1 -> t2
flow t2 -> g1
flow g1 -> t4 "да"
flow g1 -> t3 "нет"
flow t3 -> t2
flow t4 -> e
