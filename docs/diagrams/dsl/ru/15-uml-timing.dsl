diagram uml timing "Автосохранение во времени"
lifeline editor "Редактор" states Покой, Ввод
lifeline note "Индикатор" states Сохранено, Сохраняется
at 0 editor Покой
at 0 note Сохранено
at 10 editor Ввод
at 10 note Сохраняется
at 30 editor Покой
at 40 note Сохранено
