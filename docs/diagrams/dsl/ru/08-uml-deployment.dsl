diagram uml deployment "Развёртывание"
device laptop "Компьютер пользователя"
environment nginx "Контейнер Nginx"
environment node "Контейнер Node.js"
environment pg "Контейнер PostgreSQL"
artifact dist "сборка клиента"
artifact server "сервер Express"
artifact data "том pgdata"
deploy dist -> nginx
deploy server -> node
deploy data -> pg
communicate laptop -> nginx "HTTP 8080"
communicate nginx -> node "/api"
communicate node -> pg "SQL"
