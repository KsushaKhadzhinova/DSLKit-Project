diagram idef1x "База данных"
entity Users {
  user_id: int pk
  email: string
  role: string
}
entity Projects {
  project_id: int pk
  name: string
}
entity Diagrams {
  diagram_id: int pk
  user_id: int fk
  project_id: int fk
  title: string
  notation: string
}
nonidentifying Users -> Diagrams "владеет"
nonidentifying Projects -> Diagrams "содержит"
