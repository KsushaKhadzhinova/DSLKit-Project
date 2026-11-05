diagram erd "Data model"
entity User {
  id: int pk
  email: string unique
  role: string
}
entity Diagram {
  id: int pk
  owner_id: int fk -> User
  project_id: int fk -> Project
  title: string
}
entity Project {
  id: int pk
  name: string unique
}
relationship User 1:N Diagram "owns"
relationship Project 1:N Diagram "contains"
