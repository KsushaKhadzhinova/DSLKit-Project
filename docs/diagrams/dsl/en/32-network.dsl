diagram network "Deployment network"
cloud net "Internet"
client pc "Computer"
client phone "Phone"
router gw "Gateway"
server web "Nginx (port 8080)"
server api "Express (port 3000)"
database db "PostgreSQL"
cloud kroki "Kroki"
link pc -> net
link phone -> net
link net -> gw
link gw -> web
link web -> api
link api -> db
link net -> kroki
