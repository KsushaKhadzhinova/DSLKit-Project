diagram idef5 "Понятия DSLKit"
individual local "Свой движок"
kind Engine "Движок"
process drawing "Отрисовка"
individual order "Обработка заказа"
kind Bpmn "Диаграмма BPMN"
kind Diagram "Диаграмма"
instanceof local -> Engine
relation Engine -> drawing "выполняет"
instanceof order -> Bpmn
isa Bpmn -> Diagram
