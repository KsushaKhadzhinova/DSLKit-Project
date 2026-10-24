diagram uml overview "Работа со списком"
start s
interaction i1 "Вход"
decision d "Токен выдан?"
interaction i2 "Список диаграмм"
interaction i3 "Сообщение об ошибке"
merge m
end e
flow s -> i1
flow i1 -> d
flow d -> i2 "да"
flow d -> i3 "нет"
flow i2 -> m
flow i3 -> m
flow m -> e
