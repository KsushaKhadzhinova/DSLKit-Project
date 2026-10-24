diagram idef5 "DSLKit concepts"
kind Diagram "Diagram"
kind Notation "Notation"
kind Engine "Engine"
kind Bpmn "BPMN"
individual order "Order handling"
individual local "Local engine"
process drawing "Drawing"
isa Bpmn -> Notation
partof Notation -> Diagram
instanceof order -> Diagram
instanceof local -> Engine
relation Engine -> drawing "performs"
