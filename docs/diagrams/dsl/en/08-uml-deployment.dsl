diagram uml deployment "Deployment"
device laptop "User computer"
environment nginx "Nginx container"
environment node "Node.js container"
environment pg "PostgreSQL container"
artifact dist "client build"
artifact server "Express server"
artifact data "pgdata volume"
deploy dist -> nginx
deploy server -> node
deploy data -> pg
communicate laptop -> nginx "HTTP 8080"
communicate nginx -> node "/api"
communicate node -> pg "SQL"
