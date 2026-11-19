// Broken or incomplete diagrams of several notations for the real-model checks of the review and the clarify modes.
export const BROKEN = [
  ['gost no end, branch without label', 'diagram gost "Order"\nstart s "Start"\nprocess r "Read order"\ndecision d "In stock?"\nprocess a "Ship"\nprocess b "Back order"\nflow s -> r\nflow r -> d\nflow d -> a\nflow d -> b'],
  ['gost flow to an unknown id', 'diagram gost "Login"\nstart s "Start"\nprocess l "Login"\nend e "End"\nflow s -> l\nflow l -> check\nflow check -> e'],
  ['bpmn no end, dead end', 'diagram bpmn "Request"\nstart s\ntask t1 "Receive request"\nexclusive g "Valid?"\ntask t2 "Process"\ntask t3 "Reject"\nflow s -> t1\nflow t1 -> g\nflow g -> t2 "yes"\nflow g -> t3 "no"'],
  ['bpmn two starts', 'diagram bpmn "Two starts"\nstart s1\nstart s2\ntask t "Work"\nend e\nflow s1 -> t\nflow s2 -> t\nflow t -> e'],
  ['dfd store without input', 'diagram dfd "Shop"\nentity Customer\nprocess 1 "Take order"\nstore D1 "Orders"\nflow Customer -> 1 "order"\nflow D1 -> Customer "history"'],
  ['erd relationship to unknown entity', 'diagram erd "Library"\nentity Book {\n  id: int pk\n  title: text\n}\nentity Reader {\n  id: int pk\n}\nrelationship Reader 1:N Loan "takes"\nrelationship Book 1:N Copy "has"'],
  ['uml class extends unknown', 'diagram uml class\nclass Dog {\n  + bark()\n}\nclass Cat {\n  + meow()\n}\nAnimal <|-- Dog\nAnimal <|-- Cat'],
  ['uml sequence message to unknown participant', 'diagram uml sequence "Pay"\nactor User\nparticipant Shop\nUser -> Shop : pay\nShop -> Bank : charge\nBank --> Shop : ok\nShop --> User : receipt'],
  ['uml state no initial', 'diagram uml state "Door"\nstate Closed\nstate Open\nfinal end\ntransition Closed -> Open "push"\ntransition Open -> Closed "pull"'],
  ['graph edge to undefined vertex', 'diagram graph "Net"\nmode directed\nvertex A "Hub"\nvertex B "Node"\nedge A -> B\nedge B -> C\nedge C -> A'],
  ['wrong notation word in header', 'diagram flowchart "Tea"\nstart s "Start"\nprocess p "Boil water"\nend e "End"\nflow s -> p\nflow p -> e'],
  ['sequence with a lone line and typos', 'diagram uml sequence "Chat"\nparticipant A\nparticipant B\nA -> B : hi\nB => A : hello\nA -> B'],
];
