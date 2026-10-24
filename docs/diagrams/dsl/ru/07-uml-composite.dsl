diagram uml composite "Страница редактора"
classifier page "Страница редактора"
part code "Поле кода" in=page
part canvas "Холст" in=page
part problems "Панель проблем" in=page
port pc "текст" of=code
port pv "модель" of=canvas
port pp "ошибки" of=problems
connect pc -> pv "код"
connect pc -> pp "проверка"
