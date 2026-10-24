diagram idef5 "DSLKit concepts"
individual local "Local engine"
kind Engine "Engine"
process drawing "Drawing"
individual order "Order handling"
kind Bpmn "BPMN diagram"
kind Diagram "Diagram"
instanceof local -> Engine
relation Engine -> drawing "performs"
instanceof order -> Bpmn
isa Bpmn -> Diagram
