diagram bpmn "Creating a diagram"
start s "A scheme is needed"
task t1 "Write the code"
task t2 "Look at the drawing"
exclusive g1 "Correct?"
task t4 "Export"
task t3 "Fix"
end e "Scheme is ready"
flow s -> t1
flow t1 -> t2
flow t2 -> g1
flow g1 -> t4 "yes"
flow g1 -> t3 "no"
flow t3 -> t2
flow t4 -> e
