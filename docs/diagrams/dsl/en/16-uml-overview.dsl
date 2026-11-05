diagram uml overview "Working with the list"
start s
interaction i1 "Sign in"
decision d "Token issued?"
interaction i2 "List of diagrams"
interaction i3 "Error message"
merge m
end e
flow s -> i1
flow i1 -> d
flow d -> i2 "yes"
flow d -> i3 "no"
flow i2 -> m
flow i3 -> m
flow m -> e
