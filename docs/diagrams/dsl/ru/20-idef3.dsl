diagram idef3 "Вход пользователя"
uob u1 "Принять почту и пароль"
uob u2 "Проверить блокировку"
xor j1
uob u3 "Сравнить хеш пароля"
uob u4 "Ответить 429"
xor j3
uob u5 "Выдать токен"
uob u6 "Ответить 401"
xor j4
xor j2
uob u7 "Отправить ответ"
referent r1 "Лимиты входа"
precedence u1 -> u2
precedence u2 -> j1
precedence j1 -> u3
precedence j1 -> u4
precedence u3 -> j3
precedence j3 -> u5
precedence j3 -> u6
precedence u5 -> j4
precedence u6 -> j4
precedence j4 -> j2
precedence u4 -> j2
precedence j2 -> u7
relational r1 -> u2
