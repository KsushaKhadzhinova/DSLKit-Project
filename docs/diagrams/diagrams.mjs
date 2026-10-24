// The diagrams of the DSLKit system, each written once in the DSL of DSLKit itself with texts in two languages.
// source(L): L(russian, english) picks the text of the language that is being built. Keywords and identifiers stay the same.
// Every source is rendered by the local engine of the service (site/js/engines/local-engine.js), see build.mjs.

export const DIAGRAMS = [
  {
    id: '01',
    notation: 'c4',
    title: ['C4: контекст системы DSLKit', 'C4: system context of DSLKit'],
    about: [
      'Кто пользуется системой и с какими внешними сервисами она общается. Автор пишет диаграмму текстом, внешний сервис Kroki рисует её по запросу.',
      'Who uses the system and which outside services it talks to. The author writes a diagram as text, the outside service Kroki draws it on request.',
    ],
    source: (L) => `diagram c4 "${L('DSLKit: контекст', 'DSLKit: context')}"
person author "${L('Автор диаграмм', 'Diagram author')}"
person teacher "${L('Преподаватель', 'Teacher')}"
system dslkit "${L('DSLKit: редактор диаграмм как код', 'DSLKit: diagrams as code editor')}"
external kroki "${L('Сервис Kroki', 'Kroki service')}"
external hosting "${L('Статический хостинг', 'Static hosting')}"
uses author -> dslkit "${L('пишет код диаграммы', 'writes diagram code')}"
uses teacher -> dslkit "${L('проверяет', 'reviews')}"
uses dslkit -> kroki "${L('рисует', 'draws')}"
uses hosting -> dslkit "${L('отдаёт страницы', 'serves the pages')}"`,
  },
  {
    id: '02',
    notation: 'c4',
    title: ['C4: контейнеры DSLKit', 'C4: containers of DSLKit'],
    about: [
      'Из каких запускаемых частей состоит система: редактор в браузере, клиент на React, веб-сервер Nginx, программный интерфейс на Express и база данных PostgreSQL.',
      'The runnable parts of the system: the editor in the browser, the React client, the Nginx web server, the Express programming interface and the PostgreSQL database.',
    ],
    source: (L) => `diagram c4 "${L('DSLKit: контейнеры', 'DSLKit: containers')}"
person author "${L('Автор диаграмм', 'Diagram author')}"
container editor "${L('Редактор в браузере', 'Editor in the browser')}"
external kroki "${L('Сервис Kroki', 'Kroki service')}"
container client "${L('Клиент на React', 'React client')}"
container proxy "${L('Nginx', 'Nginx')}"
container api "${L('REST API на Express', 'REST API on Express')}"
database db "PostgreSQL"
uses author -> editor "${L('пишет код', 'writes code')}"
uses editor -> kroki "${L('рисует', 'draws')}"
uses author -> client "${L('ведёт список', 'keeps a list')}"
uses client -> proxy "HTTP"
uses proxy -> api "/api"
uses api -> db "SQL"`,
  },
  {
    id: '03',
    notation: 'uml-usecase',
    title: ['UML: варианты использования', 'UML: use cases'],
    about: [
      'Что может делать автор диаграмм и администратор. Вход нужен для списка диаграмм на сервере, редактор работает и без входа.',
      'What the diagram author and the administrator can do. Signing in is needed for the list of diagrams on the server, the editor works without it.',
    ],
    source: (L) => `diagram uml usecase "${L('Варианты использования DSLKit', 'DSLKit use cases')}"
actor Author "${L('Автор', 'Author')}"
actor Admin "${L('Администратор', 'Administrator')}"
usecase write "${L('Написать код диаграммы', 'Write diagram code')}"
usecase draw "${L('Увидеть диаграмму', 'See the diagram')}"
usecase export "${L('Экспортировать', 'Export')}"
usecase import "${L('Импортировать Mermaid и PlantUML', 'Import Mermaid and PlantUML')}"
usecase signin "${L('Войти', 'Sign in')}"
usecase list "${L('Вести список диаграмм', 'Keep a list of diagrams')}"
usecase users "${L('Управлять пользователями', 'Manage users')}"
link Author -> write
link Author -> export
link Author -> import
link Author -> list
link Admin -> users
include write -> draw
include list -> signin
include users -> signin`,
  },
  {
    id: '04',
    notation: 'uml-class',
    title: ['UML: классы предметной области', 'UML: domain classes'],
    about: [
      'Основные сущности сервера: пользователь, диаграмма, проект и запись журнала запросов.',
      'The main entities of the server: user, diagram, project and request log entry.',
    ],
    source: (L) => `diagram uml class "${L('Предметная область', 'Domain model')}"
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
User "1" --> "0..*" Diagram : ${L('владеет', 'owns')}
Project "1" o-- "0..*" Diagram : ${L('есть', 'has')}`,
  },
  {
    id: '05',
    notation: 'uml-object',
    title: ['UML: объекты (снимок данных)', 'UML: objects (a data snapshot)'],
    about: [
      'Конкретные объекты в один момент времени: пользователь, его диаграмма и проект.',
      'Concrete objects at one moment: a user, a diagram of theirs and a project.',
    ],
    source: (L) => `diagram uml object "${L('Снимок данных', 'Data snapshot')}"
object u1 "${L('anna : Пользователь', 'anna : User')}"
object d1 "${L('order : Диаграмма', 'order : Diagram')}"
object p1 "${L('shop : Проект', 'shop : Project')}"
link u1 -> d1 "${L('владеет', 'owns')}"
link p1 -> d1 "${L('содержит', 'contains')}"`,
  },
  {
    id: '06',
    notation: 'uml-component',
    title: ['UML: компоненты редактора', 'UML: components of the editor'],
    about: [
      'Из каких компонентов собран редактор и через какие интерфейсы они связаны: разбор кода, отрисовка, сервис Kroki и хранилище.',
      'The components of the editor and the interfaces between them: the parser, the drawing, the Kroki service and the storage.',
    ],
    source: (L) => `diagram uml component "${L('Компоненты редактора', 'Editor components')}"
component parser "${L('Разбор кода', 'Code parser')}"
component engine "${L('Движки отрисовки', 'Drawing engines')}"
component store "${L('Хранилище', 'Storage')}"
component ui "${L('Интерфейс редактора', 'Editor interface')}"
interface IParse
interface IDraw
interface ISave
provide parser -> IParse
provide engine -> IDraw
provide store -> ISave
require ui -> IParse
require ui -> IDraw
require ui -> ISave`,
  },
  {
    id: '07',
    notation: 'uml-composite',
    title: ['UML: составная структура страницы редактора', 'UML: composite structure of the editor page'],
    about: [
      'Из каких частей состоит страница редактора и как они обмениваются данными через порты.',
      'The parts of the editor page and how they pass data through ports.',
    ],
    source: (L) => `diagram uml composite "${L('Страница редактора', 'Editor page')}"
classifier page "${L('Страница редактора', 'Editor page')}"
part code "${L('Поле кода', 'Code field')}" in=page
part canvas "${L('Холст', 'Canvas')}" in=page
part problems "${L('Панель проблем', 'Problems panel')}" in=page
port pc "${L('текст', 'text')}" of=code
port pv "${L('модель', 'model')}" of=canvas
port pp "${L('ошибки', 'errors')}" of=problems
connect pc -> pv "${L('код', 'code')}"
connect pc -> pp "${L('проверка', 'check')}"`,
  },
  {
    id: '08',
    notation: 'uml-deployment',
    title: ['UML: развёртывание в Docker', 'UML: deployment in Docker'],
    about: [
      'Где что запущено при docker compose: три контейнера (Nginx, Node.js, PostgreSQL) и компьютер пользователя, который открывает клиент на порту 8080.',
      'What runs where under docker compose: three containers (Nginx, Node.js, PostgreSQL) and the user computer that opens the client on port 8080.',
    ],
    source: (L) => `diagram uml deployment "${L('Развёртывание', 'Deployment')}"
device laptop "${L('Компьютер пользователя', 'User computer')}"
environment nginx "${L('Контейнер Nginx', 'Nginx container')}"
environment node "${L('Контейнер Node.js', 'Node.js container')}"
environment pg "${L('Контейнер PostgreSQL', 'PostgreSQL container')}"
artifact dist "${L('сборка клиента', 'client build')}"
artifact server "${L('сервер Express', 'Express server')}"
artifact data "${L('том pgdata', 'pgdata volume')}"
deploy dist -> nginx
deploy server -> node
deploy data -> pg
communicate laptop -> nginx "HTTP 8080"
communicate nginx -> node "/api"
communicate node -> pg "SQL"`,
  },
  {
    id: '09',
    notation: 'uml-package',
    title: ['UML: пакеты сайта', 'UML: packages of the site'],
    about: [
      'Папки исходного кода сайта и зависимости между ними, посчитанные по настоящим импортам.',
      'The source folders of the site and the dependencies between them, counted from the real imports.',
    ],
    source: (L) => `diagram uml package "${L('Пакеты site/js', 'Packages of site/js')}"
package components "${L('components: компоненты', 'components')}"
package notations "${L('notations: нотации', 'notations')}"
package engines "${L('engines: движки', 'engines')}"
package storage "${L('storage: хранилище', 'storage')}"
package api "${L('api: обращения к серверу', 'api: server calls')}"
package utils "${L('utils: помощники', 'utils: helpers')}"
import components -> notations
import components -> engines
import components -> storage
import components -> api
import components -> utils
import engines -> notations
import notations -> utils
import storage -> utils`,
  },
  {
    id: '10',
    notation: 'uml-profile',
    title: ['UML: профиль DSLKit', 'UML: DSLKit profile'],
    about: [
      'Стереотипы, которыми помечены классы системы: нотация, движок отрисовки и формат экспорта.',
      'The stereotypes that mark the classes of the system: notation, drawing engine and export format.',
    ],
    source: (L) => `diagram uml profile "${L('Профиль DSLKit', 'DSLKit profile')}"
profile dslkit "DSLKit"
metaclass Class
stereotype Notation
stereotype Engine
stereotype Exporter
extend Notation -> Class
extend Engine -> Class
extend Exporter -> Class`,
  },
  {
    id: '11',
    notation: 'uml-activity',
    title: ['UML: деятельность «Отрисовка диаграммы»', 'UML: activity "Drawing a diagram"'],
    about: [
      'Что происходит между нажатием «Запустить» и появлением рисунка: код проверяется, при ошибках показываются проблемы, иначе рисуется диаграмма.',
      'What happens between pressing "Run" and the drawing appearing: the code is checked, errors show problems, otherwise the diagram is drawn.',
    ],
    source: (L) => `diagram uml activity "${L('Отрисовка', 'Drawing')}"
start s
action a1 "${L('Разобрать и проверить', 'Parse and check')}"
decision d "${L('Ошибки?', 'Errors?')}"
action a2 "${L('Показать проблемы', 'Show problems')}"
action a3 "${L('Нарисовать', 'Draw')}"
action a4 "${L('Показать на холсте', 'Show on canvas')}"
end e
flow s -> a1
flow a1 -> d
flow d -> a2 "${L('да', 'yes')}"
flow d -> a3 "${L('нет', 'no')}"
flow a3 -> a4
flow a2 -> e
flow a4 -> e`,
  },
  {
    id: '12',
    notation: 'uml-state',
    title: ['UML: состояния сохранения кода', 'UML: states of saving the code'],
    about: [
      'Автосохранение: после последнего изменения проходит секунда, затем код сохраняется в браузере.',
      'Autosave: one second after the last change the code is saved in the browser.',
    ],
    source: (L) => `diagram uml state "${L('Автосохранение', 'Autosave')}"
initial i
state saved "${L('Сохранено', 'Saved')}"
state typing "${L('Идёт ввод', 'Typing')}"
state waiting "${L('Ждём секунду', 'Waiting one second')}"
final off
transition i -> saved
transition saved -> typing "${L('правка', 'edit')}"
transition typing -> waiting "${L('пауза', 'pause')}"
transition waiting -> saved "${L('1 с тишины', '1 s quiet')}"
transition saved -> off "${L('закрытие', 'close')}"`,
  },
  {
    id: '13',
    notation: 'uml-sequence',
    title: ['UML: последовательность «Вход и создание диаграммы»', 'UML: sequence "Sign in and create a diagram"'],
    about: [
      'Обмен между клиентом, сервером и базой: вход выдаёт токен, дальше запрос создания проходит проверку токена.',
      'The exchange between client, server and database: signing in gives a token, then the create request passes the token check.',
    ],
    source: (L) => `diagram uml sequence "${L('Вход и создание', 'Sign in and create')}"
actor User "${L('Пользователь', 'User')}"
participant Client "${L('Клиент React', 'React client')}"
participant Api "${L('Сервер Express', 'Express server')}"
participant Db "PostgreSQL"
User -> Client : ${L('почта и пароль', 'email and password')}
Client -> Api : POST /auth/login
Api -> Db : ${L('найти пользователя', 'find the user')}
Db --> Api : ${L('хеш пароля', 'password hash')}
Api --> Client : ${L('токен JWT', 'JWT token')}
User -> Client : ${L('новая диаграмма', 'new diagram')}
Client -> Api : POST /diagrams + token
Api -> Db : INSERT
Db --> Api : ${L('запись создана', 'row created')}
Api --> Client : 201`,
  },
  {
    id: '14',
    notation: 'uml-communication',
    title: ['UML: коммуникация «Запрос к серверу»', 'UML: communication "A request to the server"'],
    about: [
      'Те же объекты, но показаны связи и номера сообщений: порядок задаётся нумерацией.',
      'The same objects, but the links and the message numbers are shown: the order is given by the numbering.',
    ],
    source: (L) => `diagram uml communication "${L('Запрос списка', 'Request of the list')}"
object c "${L('клиент : Клиент', 'client : Client')}"
object s "${L('сервер : Сервер', 'server : Server')}"
object d "${L('база : База данных', 'db : Database')}"
message c -> s "${L('1: GET /diagrams', '1: GET /diagrams')}"
message s -> d "${L('1.1: SELECT', '1.1: SELECT')}"
message d -> s "${L('1.2: строки', '1.2: rows')}"
message s -> c "${L('2: массив', '2: array')}"`,
  },
  {
    id: '15',
    notation: 'uml-timing',
    title: ['UML: временная диаграмма автосохранения', 'UML: timing diagram of autosave'],
    about: [
      'Состояния редактора и индикатора «Сохранено» во времени (в десятых долях секунды).',
      'The states of the editor and of the "Saved" indicator over time (in tenths of a second).',
    ],
    source: (L) => `diagram uml timing "${L('Автосохранение во времени', 'Autosave over time')}"
lifeline editor "${L('Редактор', 'Editor')}" states ${L('Покой, Ввод', 'Idle, Typing')}
lifeline note "${L('Индикатор', 'Indicator')}" states ${L('Сохранено, Сохраняется', 'Saved, Saving')}
at 0 editor ${L('Покой', 'Idle')}
at 0 note ${L('Сохранено', 'Saved')}
at 10 editor ${L('Ввод', 'Typing')}
at 10 note ${L('Сохраняется', 'Saving')}
at 30 editor ${L('Покой', 'Idle')}
at 40 note ${L('Сохранено', 'Saved')}`,
  },
  {
    id: '16',
    notation: 'uml-overview',
    title: ['UML: обзор взаимодействий', 'UML: interaction overview'],
    about: [
      'Сценарий работы с серверной частью как цепочка взаимодействий с проверкой входа.',
      'The work with the server part as a chain of interactions with a sign-in check.',
    ],
    source: (L) => `diagram uml overview "${L('Работа со списком', 'Working with the list')}"
start s
interaction i1 "${L('Вход', 'Sign in')}"
decision d "${L('Токен?', 'Token?')}"
interaction i2 "${L('Список диаграмм', 'List of diagrams')}"
interaction i3 "${L('Сообщение об ошибке', 'Error message')}"
merge m
end e
flow s -> i1
flow i1 -> d
flow d -> i2 "${L('да', 'yes')}"
flow d -> i3 "${L('нет', 'no')}"
flow i2 -> m
flow i3 -> m
flow m -> e`,
  },
  {
    id: '17',
    notation: 'idef0',
    title: ['IDEF0: функциональная модель', 'IDEF0: functional model'],
    about: [
      'Три функции системы с входами, управлением, выходами и механизмами: написание, отрисовка и выдача результата.',
      'Three functions of the system with inputs, controls, outputs and mechanisms: writing, drawing and delivering the result.',
    ],
    source: (L) => `diagram idef0 "${L('Работа редактора', 'Work of the editor')}"
box A1 "${L('Написать код', 'Write the code')}" {
 input: ${L('Замысел', 'Idea')}
 control: ${L('Синтаксис DSLKit', 'DSLKit syntax')}
 output: ${L('Текст', 'Text')}
 mechanism: ${L('Автор', 'Author')}
}
box A2 "${L('Нарисовать', 'Draw')}" {
 input: ${L('Текст', 'Text')}
 control: ${L('Правила нотации', 'Notation rules')}
 output: ${L('Рисунок', 'Drawing')}
 mechanism: ${L('Движок', 'Engine')}
}
box A3 "${L('Выдать результат', 'Deliver the result')}" {
 input: ${L('Рисунок', 'Drawing')}
 control: ${L('Формат экспорта', 'Export format')}
 output: ${L('Файл', 'File')}
 mechanism: ${L('Браузер', 'Browser')}
}
arrow A1.output -> A2.input
arrow A2.output -> A3.input`,
  },
  {
    id: '18',
    notation: 'idef1',
    title: ['IDEF1: информационная модель', 'IDEF1: information model'],
    about: [
      'Какую информацию система хранит и как она связана: пользователь, диаграмма и проект.',
      'The information the system keeps and how it is linked: user, diagram and project.',
    ],
    source: (L) => `diagram idef1 "${L('Информация системы', 'System information')}"
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
relationship User 1:N Diagram "${L('владеет', 'owns')}"
relationship Project 1:N Diagram "${L('содержит', 'contains')}"`,
  },
  {
    id: '19',
    notation: 'idef1x',
    title: ['IDEF1X: модель данных', 'IDEF1X: data model'],
    about: [
      'Таблицы базы с первичными и внешними ключами: ключи пользователя и проекта переходят в таблицу диаграмм.',
      'The tables of the database with primary and foreign keys: the keys of the user and the project migrate into the table of diagrams.',
    ],
    source: (L) => `diagram idef1x "${L('База данных', 'Database')}"
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
nonidentifying Users -> Diagrams "${L('владеет', 'owns')}"
nonidentifying Projects -> Diagrams "${L('содержит', 'contains')}"`,
  },
  {
    id: '20',
    notation: 'idef3',
    title: ['IDEF3: процесс входа', 'IDEF3: the sign-in process'],
    about: [
      'Порядок работ при входе: проверка блокировки, проверка пароля, выдача токена или отказ.',
      'The order of work when signing in: lock check, password check, token or refusal.',
    ],
    source: (L) => `diagram idef3 "${L('Вход пользователя', 'User sign-in')}"
uob u1 "${L('Принять почту и пароль', 'Receive email and password')}"
uob u2 "${L('Проверить блокировку', 'Check the lock')}"
xor j1
uob u3 "${L('Сравнить хеш пароля', 'Compare the password hash')}"
uob u4 "${L('Ответить 429', 'Answer 429')}"
xor j3
uob u5 "${L('Выдать токен', 'Issue the token')}"
uob u6 "${L('Ответить 401', 'Answer 401')}"
xor j4
xor j2
uob u7 "${L('Отправить ответ', 'Send the answer')}"
referent r1 "${L('Лимиты входа', 'Sign-in limits')}"
precedence u1 -> u2
precedence u2 -> j1
precedence j1 -> u3
precedence j1 -> u4
precedence u3 -> j3
precedence j3 -> u5
precedence j3 -> u6
precedence u5 -> j4
precedence u6 -> j4
precedence j4 -> j2
precedence u4 -> j2
precedence j2 -> u7
relational r1 -> u2`,
  },
  {
    id: '21',
    notation: 'idef4',
    title: ['IDEF4: объектное проектирование сервера', 'IDEF4: object design of the server'],
    about: [
      'Слои сервера как классы: маршрут принимает запрос, контроллер выполняет, модель хранит.',
      'The layers of the server as classes: the route receives the request, the controller acts, the model stores.',
    ],
    source: (L) => `diagram idef4 "${L('Слои сервера', 'Server layers')}"
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
Router "1" --> "1" Controller : ${L('вызов', 'calls')}
Controller "1" --> "1" Validator : ${L('проверка', 'checks')}
Controller "1" --> "1" Model : ${L('запись', 'stores')}`,
  },
  {
    id: '22',
    notation: 'idef5',
    title: ['IDEF5: онтология предметной области', 'IDEF5: domain ontology'],
    about: [
      'Понятия предметной области: диаграмма, нотация, движок; экземпляры и процесс отрисовки.',
      'The concepts of the domain: diagram, notation, engine; individuals and the drawing process.',
    ],
    source: (L) => `diagram idef5 "${L('Понятия DSLKit', 'DSLKit concepts')}"
kind Diagram "${L('Диаграмма', 'Diagram')}"
kind Notation "${L('Нотация', 'Notation')}"
kind Engine "${L('Движок', 'Engine')}"
kind Bpmn "BPMN"
individual order "${L('Обработка заказа', 'Order handling')}"
individual local "${L('Свой движок', 'Local engine')}"
process drawing "${L('Отрисовка', 'Drawing')}"
isa Bpmn -> Notation
partof Notation -> Diagram
instanceof order -> Diagram
instanceof local -> Engine
relation Engine -> drawing "${L('выполняет', 'performs')}"`,
  },
  {
    id: '23',
    notation: 'dfd',
    title: ['DFD: потоки данных', 'DFD: data flows'],
    about: [
      'Какие данные куда текут: текст диаграммы идёт на отрисовку, запись сохраняется на сервере, внешний сервис возвращает рисунок.',
      'Which data flows where: the text goes to drawing, the record is saved on the server, the outside service returns the drawing.',
    ],
    source: (L) => `diagram dfd "${L('Потоки данных', 'Data flows')}"
entity Author "${L('Автор', 'Author')}"
process 1 "${L('Разобрать код', 'Parse the code')}"
process 2 "${L('Нарисовать', 'Draw')}"
entity Kroki "${L('Сервис Kroki', 'Kroki service')}"
store D1 "${L('Браузер: код', 'Browser: code')}"
store D2 "${L('База данных', 'Database')}"
process 3 "${L('Сохранить запись', 'Save the record')}"
flow Author -> 1 "${L('текст', 'text')}"
flow 1 -> 2 "${L('модель', 'model')}"
flow 2 -> Kroki "${L('запрос', 'request')}"
flow Kroki -> 2 "SVG"
flow 1 -> D1 "${L('автосохранение', 'autosave')}"
flow Author -> 3 "${L('запись', 'record')}"
flow 3 -> D2 "${L('строка', 'row')}"`,
  },
  {
    id: '24',
    notation: 'erd',
    title: ['ERD: сущности и связи', 'ERD: entities and relationships'],
    about: [
      'База данных курсовой и лабораторных: пользователь, диаграмма, проект и их связи один-ко-многим.',
      'The database of the course work and labs: user, diagram, project and their one-to-many relationships.',
    ],
    source: (L) => `diagram erd "${L('Модель данных', 'Data model')}"
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
relationship User 1:N Diagram "${L('владеет', 'owns')}"
relationship Project 1:N Diagram "${L('содержит', 'contains')}"`,
  },
  {
    id: '25',
    notation: 'bpmn',
    title: ['BPMN: работа автора с редактором', 'BPMN: the author working with the editor'],
    about: [
      'Бизнес-процесс автора: написать код, получить рисунок, исправить ошибки или экспортировать результат.',
      'The business process of the author: write the code, get the drawing, fix errors or export the result.',
    ],
    source: (L) => `diagram bpmn "${L('Создание диаграммы', 'Creating a diagram')}"
start s "${L('Нужна схема', 'A scheme is needed')}"
task t1 "${L('Написать код', 'Write the code')}"
task t2 "${L('Посмотреть рисунок', 'Look at the drawing')}"
exclusive g1 "${L('Верно?', 'Correct?')}"
task t3 "${L('Исправить', 'Fix')}"
task t4 "${L('Экспортировать', 'Export')}"
end e "${L('Схема готова', 'Scheme is ready')}"
flow s -> t1
flow t1 -> t2
flow t2 -> g1
flow g1 -> t4 "${L('да', 'yes')}"
flow g1 -> t3 "${L('нет', 'no')}"
flow t3 -> t2
flow t4 -> e`,
  },
  {
    id: '26',
    notation: 'petri',
    title: ['Сеть Петри: попытки входа', 'Petri net: sign-in attempts'],
    about: [
      'Пять попыток входа как фишки: каждая неудача забирает фишку, когда фишек нет, вход блокируется.',
      'Five sign-in attempts as tokens: each failure takes a token, with no tokens left the sign-in is locked.',
    ],
    source: (L) => `diagram petri "${L('Попытки входа', 'Sign-in attempts')}"
place left "${L('Осталось попыток', 'Attempts left')}" tokens=5
place failed "${L('Неудач', 'Failures')}"
place locked "${L('Блокировка', 'Locked')}"
transition fail "${L('Неверный пароль', 'Wrong password')}"
transition lock "${L('Заблокировать', 'Lock')}"
arc left -> fail
arc fail -> failed
arc failed -> lock weight=5
arc lock -> locked`,
  },
  {
    id: '27',
    notation: 'gost',
    title: ['Блок-схема по ГОСТ 19.701-90: проверка заголовка', 'Flowchart (GOST 19.701-90): checking the header'],
    about: [
      'Алгоритм разбора первой строки кода: если заголовок указывает известную нотацию, разбирается тело, иначе выдаётся ошибка.',
      'The algorithm that reads the first line of the code: if the header names a known notation the body is parsed, otherwise an error is reported.',
    ],
    source: (L) => `diagram gost "${L('Разбор заголовка', 'Reading the header')}"
start s "${L('Начало', 'Start')}"
io in "${L('Ввод кода', 'Input the code')}"
process p1 "${L('Взять первую строку', 'Take the first line')}"
decision d1 "${L('Заголовок верен?', 'Header valid?')}"
process p2 "${L('Разобрать тело', 'Parse the body')}"
process p3 "${L('Сообщить об ошибке', 'Report an error')}"
io out "${L('Вывод модели', 'Output the model')}"
end e "${L('Конец', 'End')}"
flow s -> in
flow in -> p1
flow p1 -> d1
flow d1 -> p2 "${L('Да', 'Yes')}"
flow d1 -> p3 "${L('Нет', 'No')}"
flow p2 -> out
flow p3 -> out
flow out -> e`,
  },
  {
    id: '28',
    notation: 'graph',
    title: ['Граф: связи между нотациями по близости', 'Graph: how close the notations are'],
    about: [
      'Взвешенный граф: чем меньше вес ребра, тем проще перейти от одной нотации к другой. Сервис называет кратчайший путь IDEF0 → BPMN → UML → C4 (длина 7) в панели результатов.',
      'A weighted graph: the smaller the edge weight, the easier it is to move from one notation to another. The service names the shortest path IDEF0 → BPMN → UML → C4 (length 7) in the results panel.',
    ],
    source: (L) => `diagram graph "${L('Близость нотаций', 'Notation closeness')}"
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
path IDEF0 -> C4`,
  },
  {
    id: '29',
    notation: 'dag',
    title: ['DAG: порядок проверок в CI', 'DAG: order of the checks in CI'],
    about: [
      'Граф зависимостей этапов проверки перед выпуском; длительности в минутах. Критический путь «Установка → Тесты → Сборка → Отчёт» (12 минут) сервис называет в панели результатов.',
      'The dependency graph of the checks before a release; durations in minutes. The service names the critical path "Install → Tests → Build → Report" (12 minutes) in the results panel.',
    ],
    source: (L) => `diagram dag "${L('Проверки перед выпуском', 'Checks before a release')}"
task install "${L('Установка', 'Install')}" duration=2
task format "${L('Формат', 'Format')}" duration=1
task test "${L('Тесты', 'Tests')}" duration=6
task audit "${L('Аудит зависимостей', 'Dependency audit')}" duration=1
task build "${L('Сборка', 'Build')}" duration=3
task report "${L('Отчёт', 'Report')}" duration=1
depend install -> format
depend install -> test
depend install -> audit
depend test -> build
depend format -> build
depend build -> report
depend audit -> report`,
  },
  {
    id: '30',
    notation: 'mindmap',
    title: ['Ментальная карта проекта', 'Mind map of the project'],
    about: [
      'Из чего состоит проект: сайт, серверные и клиентские работы, курсовой и дипломный проект.',
      'What the project consists of: the site, the server and client works, the course work and the diploma project.',
    ],
    source: (L) => `diagram mindmap "${L('Проект DSLKit', 'DSLKit project')}"
root r "DSLKit"
topic p1 "${L('Часть 1: сайт', 'Part 1: the site')}"
topic p2 "${L('Часть 2: серверы и клиенты', 'Part 2: servers and clients')}"
topic cw "${L('Курсовой', 'Course work')}"
topic dp "${L('Диплом', 'Diploma')}"
topic ed "${L('Редактор', 'Editor')}"
topic nt "${L('33 нотации', '33 notations')}"
topic srv "${L('REST, JWT, WebSocket', 'REST, JWT, WebSocket')}"
topic cl "${L('React', 'React')}"
topic dk "Docker"
branch r -> p1
branch r -> p2
branch r -> cw
branch r -> dp
branch p1 -> ed
branch p1 -> nt
branch p2 -> srv
branch p2 -> cl
branch p2 -> dk`,
  },
  {
    id: '31',
    notation: 'orgchart',
    title: ['Организационная структура работ', 'Organisational structure of the work'],
    about: [
      'Кто за что отвечает в учебном проекте: владелица проекта, руководитель и направления работ.',
      'Who is responsible for what in the study project: the owner, the supervisor and the lines of work.',
    ],
    source: (L) => `diagram orgchart "${L('Структура работ', 'Structure of the work')}"
person owner "${L('Владелица проекта', 'Project owner')}"
person sup "${L('Научный руководитель', 'Supervisor')}"
unit dev "${L('Разработка', 'Development')}"
unit qa "${L('Качество', 'Quality')}"
unit doc "${L('Документы', 'Documents')}"
person fe "${L('Клиент и редактор', 'Client and editor')}"
person be "${L('Сервер и база', 'Server and database')}"
person tst "${L('Тесты и аудит', 'Tests and audit')}"
leads sup -> owner
leads owner -> dev
leads owner -> qa
leads owner -> doc
leads dev -> fe
leads dev -> be
leads qa -> tst`,
  },
  {
    id: '32',
    notation: 'network',
    title: ['Схема сети развёртывания', 'Deployment network scheme'],
    about: [
      'Как соединены компьютер пользователя, веб-сервер, сервер приложения, база данных и внешний сервис.',
      'How the user computer, the web server, the application server, the database and the outside service are connected.',
    ],
    source: (L) => `diagram network "${L('Сеть развёртывания', 'Deployment network')}"
cloud net "${L('Интернет', 'Internet')}"
client pc "${L('Компьютер', 'Computer')}"
client phone "${L('Телефон', 'Phone')}"
router gw "${L('Шлюз', 'Gateway')}"
server web "${L('Nginx (порт 8080)', 'Nginx (port 8080)')}"
server api "${L('Express (порт 3000)', 'Express (port 3000)')}"
database db "PostgreSQL"
cloud kroki "Kroki"
link pc -> net
link phone -> net
link net -> gw
link gw -> web
link web -> api
link api -> db
link net -> kroki`,
  },
  {
    id: '33',
    notation: 'decision',
    title: ['Дерево решений: какой движок выбрать', 'Decision tree: which engine to choose'],
    about: [
      'Подсказка автору: нужен ли рисунок без интернета, нужны ли особые форматы, какой движок подойдёт.',
      'A hint for the author: is a drawing needed without internet, are special formats needed, which engine fits.',
    ],
    source: (L) => `diagram decision "${L('Выбор движка', 'Choosing an engine')}"
question q1 "${L('Без интернета?', 'Offline?')}"
question q2 "${L('Точная раскладка?', 'Exact layout?')}"
question q3 "${L('Последовательность?', 'Sequence?')}"
outcome local "${L('Свой движок', 'Local engine')}"
outcome dot "Graphviz"
outcome puml "PlantUML"
outcome mer "Mermaid"
answer q1 -> local "${L('да', 'yes')}"
answer q1 -> q2 "${L('нет', 'no')}"
answer q2 -> dot "${L('да', 'yes')}"
answer q2 -> q3 "${L('нет', 'no')}"
answer q3 -> puml "${L('да', 'yes')}"
answer q3 -> mer "${L('нет', 'no')}"`,
  },
  {
    id: '34',
    notation: 'epc',
    title: ['eEPC: цепочка процесса по событиям', 'eEPC: event-driven process chain'],
    about: [
      'Процесс «Диаграмма сохранена» от события до результата: код получен, проверен, нарисован или отклонён.',
      'The process "Diagram saved" from event to result: the code is received, checked, drawn or rejected.',
    ],
    source: (L) => `diagram epc "${L('Обработка кода', 'Handling the code')}"
event e1 "${L('Код получен', 'Code received')}"
function f1 "${L('Проверить код', 'Check the code')}"
xor g1 "XOR"
event e2 "${L('Ошибок нет', 'No errors')}"
event e3 "${L('Есть ошибки', 'Errors found')}"
function f2 "${L('Нарисовать', 'Draw')}"
function f3 "${L('Показать проблемы', 'Show problems')}"
event e4 "${L('Рисунок готов', 'Drawing ready')}"
event e5 "${L('Проблемы показаны', 'Problems shown')}"
flow e1 -> f1
flow f1 -> g1
flow g1 -> e2
flow g1 -> e3
flow e2 -> f2
flow e3 -> f3
flow f2 -> e4
flow f3 -> e5`,
  },
];
