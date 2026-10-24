diagram uml state "Автосохранение"
initial i
state saved "Сохранено"
state typing "Идёт ввод"
state waiting "Ждём секунду"
final off
transition i -> saved
transition saved -> typing "правка"
transition typing -> waiting "пауза"
transition waiting -> saved "1 с тишины"
transition saved -> off "закрытие"
