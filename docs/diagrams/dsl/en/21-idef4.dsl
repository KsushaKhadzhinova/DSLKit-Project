diagram idef4 "Server layers"
class Router {
  + route(request): Handler
}
class Controller {
  + list(): Diagrams
  + create(data): Diagram
}
class Validator {
  + check(data): Problems
}
class Model {
  + save(row): Row
}
Router "1" --> "1" Controller : calls
Controller "1" --> "1" Validator : checks
Controller "1" --> "1" Model : stores
