diagram uml activity "Drawing"
start s
action a1 "Parse and check"
decision d "Errors?"
action a2 "Show problems"
action a3 "Draw"
action a4 "Show on canvas"
end e
flow s -> a1
flow a1 -> d
flow d -> a2 "yes"
flow d -> a3 "no"
flow a3 -> a4
flow a2 -> e
flow a4 -> e
