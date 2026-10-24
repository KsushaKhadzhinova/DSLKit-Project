diagram idef0 "Work of the editor"
box A1 "Write the code" {
 input: Idea
 control: DSLKit syntax
 output: Text
 mechanism: Author
}
box A2 "Draw" {
 input: Text
 control: Notation rules
 output: Drawing
 mechanism: Engine
}
box A3 "Deliver the result" {
 input: Drawing
 control: Export format
 output: File
 mechanism: Browser
}
arrow A1.output -> A2.input
arrow A2.output -> A3.input
