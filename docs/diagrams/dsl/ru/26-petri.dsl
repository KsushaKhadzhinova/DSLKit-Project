diagram petri "Попытки входа"
place left "Осталось попыток" tokens=5
place failed "Неудач"
place locked "Блокировка"
transition fail "Неверный пароль"
transition lock "Заблокировать"
arc left -> fail
arc fail -> failed
arc failed -> lock weight=5
arc lock -> locked
