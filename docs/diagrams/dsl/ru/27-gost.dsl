diagram gost "Разбор заголовка"
start s "Начало"
io in "Ввод кода"
process p1 "Взять первую строку"
decision d1 "Заголовок верен?"
process p2 "Разобрать тело"
process p3 "Сообщить об ошибке"
io out "Вывод модели"
end e "Конец"
flow s -> in
flow in -> p1
flow p1 -> d1
flow d1 -> p2 "Да"
flow d1 -> p3 "Нет"
flow p2 -> out
flow p3 -> out
flow out -> e
