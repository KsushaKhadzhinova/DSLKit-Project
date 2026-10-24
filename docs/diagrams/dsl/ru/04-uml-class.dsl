diagram uml class "Предметная область"
class User {
  - id: Integer
  + email: String
  - passwordHash: String
  + role: Role
}
class Diagram {
  + id: Integer
  + title: String
  + notation: Notation
  + sourceCode: String
  + priority: Priority
  + createdAt: DateTime
}
class Project {
  + id: Integer
  + name: String
}
class RequestLog {
  + method: String
  + path: String
  + status: Integer
}
User "1" --> "0..*" Diagram : владеет
Project "1" o-- "0..*" Diagram : есть
