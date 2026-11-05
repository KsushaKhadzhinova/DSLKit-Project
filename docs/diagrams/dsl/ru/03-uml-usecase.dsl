diagram uml usecase "Варианты использования DSLKit"
actor Author "Автор"
actor Admin "Администратор"
usecase write "Написать код диаграммы"
usecase draw "Увидеть диаграмму"
usecase export "Экспортировать"
usecase import "Импортировать Mermaid и PlantUML"
usecase signin "Войти"
usecase list "Вести список диаграмм"
usecase users "Управлять пользователями"
link Author -> write
link Author -> export
link Author -> import
link Author -> list
link Admin -> users
include write -> draw
include list -> signin
include users -> signin
