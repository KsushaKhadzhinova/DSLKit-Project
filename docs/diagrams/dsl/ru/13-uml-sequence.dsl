diagram uml sequence "Вход и создание"
actor User "Пользователь"
participant Client "Клиент React"
participant Api "Сервер Express"
participant Db "PostgreSQL"
User -> Client : почта и пароль
Client -> Api : POST /auth/login
Api -> Db : найти пользователя
Db --> Api : хеш пароля
Api --> Client : токен JWT
User -> Client : новая диаграмма
Client -> Api : POST /diagrams + token
Api -> Db : INSERT
Db --> Api : запись создана
Api --> Client : 201
