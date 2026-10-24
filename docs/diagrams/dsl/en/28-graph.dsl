diagram graph "Notation closeness"
mode undirected
vertex IDEF0
vertex DFD
vertex BPMN
vertex UML
vertex C4
edge IDEF0 -- DFD weight=2
edge IDEF0 -- BPMN weight=4
edge DFD -- BPMN weight=3
edge BPMN -- UML weight=2
edge DFD -- UML weight=5
edge UML -- C4 weight=1
path IDEF0 -> C4
