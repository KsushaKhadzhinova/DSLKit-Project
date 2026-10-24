diagram epc "Handling the code"
event e1 "Code received"
function f1 "Check the code"
xor g1 "XOR"
event e2 "No errors"
event e3 "Errors found"
function f2 "Draw"
function f3 "Show problems"
event e4 "Drawing ready"
event e5 "Problems shown"
flow e1 -> f1
flow f1 -> g1
flow g1 -> e2
flow g1 -> e3
flow e2 -> f2
flow e3 -> f3
flow f2 -> e4
flow f3 -> e5
