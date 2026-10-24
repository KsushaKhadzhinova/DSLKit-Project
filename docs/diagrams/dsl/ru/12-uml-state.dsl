diagram uml state "Автосохранение"
initial i
state saved "Сохранено"
state editing "Правка кода"
final off
transition i -> saved
transition saved -> editing "изменение"
transition editing -> saved "1 с без правок"
transition saved -> off "закрытие"
