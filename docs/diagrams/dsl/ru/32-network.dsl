diagram network "Сеть развёртывания"
cloud net "Интернет"
client pc "Компьютер"
client phone "Телефон"
router gw "Шлюз"
server web "Nginx (порт 8080)"
server api "Express (порт 3000)"
database db "PostgreSQL"
cloud kroki "Kroki"
link pc -> net
link phone -> net
link net -> gw
link gw -> web
link web -> api
link api -> db
link net -> kroki
