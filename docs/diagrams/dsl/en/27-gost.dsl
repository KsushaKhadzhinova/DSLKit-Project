diagram gost "Reading the header"
start s "Start"
io in "Input the code"
process p1 "Take the first line"
decision d1 "Header valid?"
process p2 "Parse the body"
process p3 "Report an error"
io out "Output the model"
end e "End"
flow s -> in
flow in -> p1
flow p1 -> d1
flow d1 -> p2 "Yes"
flow d1 -> p3 "No"
flow p2 -> out
flow p3 -> out
flow out -> e
