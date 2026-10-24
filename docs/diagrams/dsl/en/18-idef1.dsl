diagram idef1 "System information"
entity User {
  id: int pk
  email: string
}
entity Diagram {
  id: int pk
  title: string
  notation: string
}
entity Project {
  id: int pk
  name: string
}
relationship User 1:N Diagram "owns"
relationship Project 1:N Diagram "contains"
