diagram idef4 "Слои сервера"
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
Router "1" --> "1" Controller : вызов
Controller "1" --> "1" Validator : проверка
Controller "1" --> "1" Model : запись
