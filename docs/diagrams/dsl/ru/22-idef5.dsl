diagram idef5 "Понятия DSLKit"
kind Diagram "Диаграмма"
kind Notation "Нотация"
kind Engine "Движок"
kind Bpmn "BPMN"
individual order "Обработка заказа"
individual local "Свой движок"
process drawing "Отрисовка"
isa Bpmn -> Notation
partof Notation -> Diagram
instanceof order -> Diagram
instanceof local -> Engine
relation Engine -> drawing "выполняет"
