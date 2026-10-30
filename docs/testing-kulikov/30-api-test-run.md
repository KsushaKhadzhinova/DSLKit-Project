# Протокол прогона тестов API и безопасности (метод чёрного ящика)

Дата прогона: 2026-10-29. Объект: собственный API отрисовки DSLKit (`tools/render-api.js`) и статический сервер (`tools/server.js`).
Сервер: `node tools/serve.js site 5195` (тот же код, что на порту 5190; отдельный порт выбран, чтобы тяжёлые запросы не блокировали рабочий сервер).
Скрипты: `docs/testing-kulikov/scripts/` (запуск: `PORT=5195 node docs/testing-kulikov/scripts/run-all.mjs`, затем `node docs/testing-kulikov/scripts/make-report.mjs`). Сырые данные: `scripts/results.json`.

Методы по Куликову: граничные значения (размер 0, 1, 99999, 100000, 100001), эквивалентные классы (типы полей, Content-Type, методы), предугадывание ошибок (`__proto__`, `\u0000`, обход путей, XSS, большие графы), проверка кодов ответов и заголовков.

## Итоги

| Показатель | Значение |
|---|---|
| Всего проверок | 716 |
| Pass | 661 |
| Fail | 55 |

| Группа | Проверок | Pass | Fail |
|---|---|---|---|
| A. Endpoints and methods | 49 | 47 | 2 |
| B. Body, Content-Type, JSON | 53 | 45 | 8 |
| C. Size boundaries | 26 | 24 | 2 |
| D. Large graphs and performance | 34 | 27 | 7 |
| E. All notations | 261 | 261 | 0 |
| F. XSS and reflection | 14 | 12 | 2 |
| J. Internal errors (500) | 46 | 38 | 8 |
| G. Concurrency and slow clients | 10 | 6 | 4 |
| H. Security headers | 18 | 11 | 7 |
| I. Static server and paths | 88 | 80 | 8 |
| K. Engines, external languages, body limit | 117 | 110 | 7 |

Ожидание в таблицах - требование, которое тестировщик считает правильным для HTTP/REST и для заявленного поведения API (лимит 100000 символов, коды 200/400/404/405/413/422/500). Fail означает расхождение факта с ожиданием; расхождения разобраны в `31-api-bug-reports.md`. Строки с пометкой `Informational` ничего не утверждают и всегда Pass.

## Провалы

| ID | Проверка | Факт | Баг-репорт |
|---|---|---|---|
| A07-HEAD/api/notations | HEAD /api/notations | 405 allow=GET bodyLen=0 | BUG-13 |
| A13 | render source without header | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-header","mes… | BUG-11 |
| B15 | source only \u0000 | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | BUG-11 |
| B30 | text/plain with JSON body (taken as source text) | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | BUG-11 |
| B31 | application/x-www-form-urlencoded | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | BUG-10 |
| B32 | multipart/form-data | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | BUG-10 |
| B33 | application/xml | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | BUG-10 |
| B35 | Content-Type: application/jsonx (substring match) | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | BUG-09 |
| B36 | Content-Type: text/plain; x=application/json | 400 {"error":{"code":"json","message":"The body is not valid JSON"}} | BUG-09 |
| B42 | CR-only line endings | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | BUG-12 |
| C02 | source length 1 ("a") | 200 4 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… | BUG-11 |
| C20 | source of 30000 Cyrillic chars (60000 bytes) | 200 5 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… | BUG-11 |
| D01 | chain of 300 nodes | 200 3066 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | BUG-03 |
| D02 | chain of 600 nodes | 200 10831 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | BUG-03 |
| D06 | complete graph of 60 nodes (3540 edges) | 200 22011 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | BUG-03 |
| D11 | validate of a chain of 800 vertices | 200 15483 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | BUG-03 |
| D12 | parse of a chain of 800 vertices | 200 18202 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | BUG-03 |
| D12c | validate of a DAG of 800 tasks (for comparison) | 200 5157 ms {"notation":"dag","valid":true,"problems":[{"line":1,"severi… | BUG-03 |
| D28 | mindmap depth 2000 | 200 15086 ms {"notation":"mindmap","valid":true,"problems":[],"svg":…http… | BUG-04 |
| F03 | JSON responses are JSON type + nosniff | application/json; charset=utf-8 nosniff=- | BUG-06 |
| F04 | SVG served directly: no raw <script>, CSP present | 200 script=false csp=- | BUG-06 |
| J05 | diagram constructor | 500 {"error":{"code":"internal","message":"The source could not be processed"}}  | BUG-05 |
| J05-validate | diagram constructor via validate | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | BUG-05 |
| J05-parse | diagram constructor via parse | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | BUG-05 |
| J05-generate | diagram constructor via generate | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | BUG-05 |
| J06 | diagram __proto__ | 500 {"error":{"code":"internal","message":"The source could not be processed"}}  | BUG-05 |
| J06-validate | diagram __proto__ via validate | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | BUG-05 |
| J06-parse | diagram __proto__ via parse | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | BUG-05 |
| J06-generate | diagram __proto__ via generate | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | BUG-05 |
| G04 | 50 simultaneous renders of a 150-node graph | 40/50 x 200, total 60228 ms | BUG-03 |
| G05 | a light request while 5 heavy renders run (event-loop blocking) | probe 20037 ms, heavy: 16156/19607/23550/26562/28871 ms | BUG-03 |
| G06 | slow client: header sent, then 1 body byte per second for 15 s | closed after 16687 ms (by the client, server never gave up), response: none | BUG-14 |
| G07 | request headers never finished | timeout after 8208 ms, status 0 | BUG-14 |
| H05 | API GET /api/notations | 200 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-poli | BUG-06 |
| H06 | API GET /api/grammar | 200 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-poli | BUG-06 |
| H07 | API 404 | 404 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-poli | BUG-06 |
| H08 | API 400 | 400 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-poli | BUG-06 |
| H09 | API 405 | 405 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-poli | BUG-06 |
| H10 | API 413 | 413 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-poli | BUG-06 |
| H11 | API 422 | 200 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-poli | BUG-06 |
| I35 | Accept: image/svg+xml;q=0 (explicitly refused) | image/svg+xml; charset=utf-8 | BUG-15 |
| I38 | OPTIONS on a static page | 405 allow=GET, HEAD | BUG-15 |
| I48 | If-None-Match: * (RFC 9110: matches any current representation) | 200 | BUG-15 |
| I49 | If-None-Match with a list of ETags | 200 | BUG-15 |
| I53 | trailing slash after a file | 200 | BUG-15 |
| I57b | MIME type of /manifest.webmanifest | 200 application/octet-stream | BUG-16 |
| I63 | /api/../index.html is answered (not left hanging) | no answer in 5168 ms (timeout) | BUG-02 |
| I63b | /api/%2e%2e/index.html is answered | no answer in 5138 ms | BUG-02 |
| K04-HEAD | HEAD /api/engines | 405 allow=GET | BUG-13 |
| K06 | security headers on /api/engines | csp=no nosniff=no | BUG-06 |
| K80 | upstream SVG with <script>/on*/javascript: is forwarded as is | 200 image/svg+xml; charset=utf-8 issues=<script>;on*-attribute;javascript: in attribute nosniff=- csp=- | BUG-07 |
| K89b | server process survives an upstream that stalls mid-body | server process exited (code null): unhandled TimeoutError from answer.text() | BUG-01 |
| K89 | upstream sends headers but never finishes the body | no response (ECONNRESET) after 10464 ms | BUG-01 |
| K90 | upstream returns 100 MB of SVG | 200 100 MB in 6900 ms | BUG-08 |
| K93 | external answer headers | cache=no-store nosniff=- csp=- | BUG-06 |

## A. Endpoints and methods

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| A01 | GET /api/notations | GET /api/notations | 200, JSON, 33 notations | 200, 33 items, application/json; charset=utf-8 | Pass |
| A02 | notations in English | GET /api/notations?lang=en | 200, names in English | 200, first name: IDEF0 — function modelling | Pass |
| A03 | unknown lang falls back | GET /api/notations?lang=xx | 200 (fallback to ru) | 200 | Pass |
| A04 | odd lang query | GET /api/notations?lang[]=en&lang=__proto__ | 200 | 200 | Pass |
| A05 | GET /api/grammar | GET /api/grammar | 200, JSON with grammar | 200 {"grammar":"source = header , { line } ;\nheader = \"diagram… | Pass |
| A06-/api/nope | unknown path /api/nope | POST /api/nope | 404 JSON error | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api/nope"}} | Pass |
| A06-/api/ | unknown path /api/ | POST /api/ | 404 JSON error | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api/"}} | Pass |
| A06-/api | unknown path /api | POST /api | 404 JSON error | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api"}} | Pass |
| A06-/api/render/ | unknown path /api/render/ | POST /api/render/ | 404 JSON error | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api/render/"… | Pass |
| A06-/api/RENDER | unknown path /api/RENDER | POST /api/RENDER | 404 JSON error | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api/RENDER"}… | Pass |
| A06-/api/render/x | unknown path /api/render/x | POST /api/render/x | 404 JSON error | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api/render/x… | Pass |
| A06-/api/validate.json | unknown path /api/validate.json | POST /api/validate.json | 404 JSON error | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api/validate… | Pass |
| A06-/api//render | unknown path /api//render | POST /api//render | 404 JSON error | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api//render"… | Pass |
| A07-POST/api/notations | POST /api/notations | POST /api/notations | 405 with Allow header | 405 allow=GET bodyLen=47 | Pass |
| A07-PUT/api/notations | PUT /api/notations | PUT /api/notations | 405 with Allow header | 405 allow=GET bodyLen=47 | Pass |
| A07-DELETE/api/grammar | DELETE /api/grammar | DELETE /api/grammar | 405 with Allow header | 405 allow=GET bodyLen=47 | Pass |
| A07-PATCH/api/grammar | PATCH /api/grammar | PATCH /api/grammar | 405 with Allow header | 405 allow=GET bodyLen=47 | Pass |
| A07-GET/api/render | GET /api/render | GET /api/render | 405 with Allow header | 405 allow=POST bodyLen=48 | Pass |
| A07-GET/api/validate | GET /api/validate | GET /api/validate | 405 with Allow header | 405 allow=POST bodyLen=48 | Pass |
| A07-GET/api/parse | GET /api/parse | GET /api/parse | 405 with Allow header | 405 allow=POST bodyLen=48 | Pass |
| A07-GET/api/generate | GET /api/generate | GET /api/generate | 405 with Allow header | 405 allow=POST bodyLen=48 | Pass |
| A07-PUT/api/render | PUT /api/render | PUT /api/render | 405 with Allow header | 405 allow=POST bodyLen=48 | Pass |
| A07-DELETE/api/render | DELETE /api/render | DELETE /api/render | 405 with Allow header | 405 allow=POST bodyLen=48 | Pass |
| A07-PATCH/api/validate | PATCH /api/validate | PATCH /api/validate | 405 with Allow header | 405 allow=POST bodyLen=48 | Pass |
| A07-OPTIONS/api/render | OPTIONS /api/render | OPTIONS /api/render | 204/200 with Allow, or 405 with Allow | 405 allow=POST bodyLen=48 | Pass |
| A07-OPTIONS/api/notations | OPTIONS /api/notations | OPTIONS /api/notations | 204/200 with Allow, or 405 with Allow | 405 allow=GET bodyLen=47 | Pass |
| A07-HEAD/api/notations | HEAD /api/notations | HEAD /api/notations | 200 without body (HEAD = GET without body) | 405 allow=GET bodyLen=0 | **Fail** |
| A07-HEAD/api/render | HEAD /api/render | HEAD /api/render | 405 with Allow header | 405 allow=POST bodyLen=0 | Pass |
| A07-TRACE/api/render | TRACE /api/render | TRACE /api/render | 405 with Allow header | 405 allow=POST bodyLen=48 | Pass |
| A08-validate | valid source to /api/validate | POST /api/validate {source} | 200 JSON | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| A08-parse | valid source to /api/parse | POST /api/parse {source} | 200 JSON | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| A08-render | valid source to /api/render | POST /api/render {source} | 200 JSON | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| A08-generate | valid source to /api/generate | POST /api/generate {source} | 200 JSON | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| A09 | render with Accept: image/svg+xml | POST /api/render Accept: image/svg+xml | 200, Content-Type image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| A10-"graphviz" | generate format="graphviz" | POST /api/generate {format:"graphviz"} | 200, format as asked | 200 format=graphviz | Pass |
| A10-"mermaid" | generate format="mermaid" | POST /api/generate {format:"mermaid"} | 200, format as asked | 200 format=mermaid | Pass |
| A10-"plantuml" | generate format="plantuml" | POST /api/generate {format:"plantuml"} | 200, format as asked | 200 format=plantuml | Pass |
| A10-"nonsense" | generate format="nonsense" | POST /api/generate {format:"nonsense"} | 200 (fallback) or 4xx, never 500 | 200 format=plantuml | Pass |
| A10-"" | generate format="" | POST /api/generate {format:""} | 200 (fallback) or 4xx, never 500 | 200 format=plantuml | Pass |
| A10-5 | generate format=5 | POST /api/generate {format:5} | 200 (fallback) or 4xx, never 500 | 200 format=plantuml | Pass |
| A10-null | generate format=null | POST /api/generate {format:null} | 200 (fallback) or 4xx, never 500 | 200 format=plantuml | Pass |
| A10-[] | generate format=[] | POST /api/generate {format:[]} | 200 (fallback) or 4xx, never 500 | 200 format=plantuml | Pass |
| A10-{} | generate format={} | POST /api/generate {format:{}} | 200 (fallback) or 4xx, never 500 | 200 format=plantuml | Pass |
| A11 | generate with a format the notation does not support (timing -> graphviz) | POST /api/generate uml timing format=graphviz | 200 with fallback format, or 4xx | 200 format=plantuml | Pass |
| A12 | validate reports a problem with line and severity | POST /api/validate (edge to undefined vertex) | 200, valid=false, problems[0].line | 200 {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"info","code":"graph-summary","message":"Вершин: 1, р… | Pass |
| A13 | render source without header | POST /api/render {source:"hello world"} | 422 unknown-notation | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-header","mes… | **Fail** |
| A14 | render with unknown notation | POST /api/render diagram nothere | 422 | 422 {"error":{"code":"unknown-notation","message":"Неизвестная нотация «nothere». Доступны: idef0, idef1… | Pass |
| A15 | validate source without header | POST /api/validate {source:"hello world"} | 200 valid=false (or 422), not 500 | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-header","mes… | Pass |
| A16 | render with lang=en | POST /api/render lang=en | 200 | 200 | Pass |

## B. Body, Content-Type, JSON

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| B01 | empty body, JSON | POST /api/render {"Content-Type":"application/json"} body= | 400 | 400 {"error":{"code":"json","message":"The body is not valid JSON"}} | Pass |
| B02 | empty body, no Content-Type | POST /api/render {} body= | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B03 | no body at all (Content-Length 0) | POST /api/render {"Content-Length":"0"} body= | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B04 | broken JSON { | POST /api/render {"Content-Type":"application/json"} body={ | 400 json | 400 {"error":{"code":"json","message":"The body is not valid JSON"}} | Pass |
| B05 | broken JSON trailing comma | POST /api/render {"Content-Type":"application/json"} body={"source":"x",} | 400 | 400 {"error":{"code":"json","message":"The body is not valid JSON"}} | Pass |
| B06 | JSON with BOM | POST /api/render {"Content-Type":"application/json"} body= {"source":"diagram graph \"Roads\"\nmode undirect… | 200 or 400, not 500 | 400 {"error":{"code":"json","message":"The body is not valid JSON"}} | Pass |
| B07 | JSON null | POST /api/render {"Content-Type":"application/json"} body=null | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B08 | JSON array | POST /api/render {"Content-Type":"application/json"} body=[1,2] | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B09 | JSON number | POST /api/render {"Content-Type":"application/json"} body=42 | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B10 | JSON string | POST /api/render {"Content-Type":"application/json"} body="diagram graph \"Roads\"\nmode undirected\nvertex … | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B11 | JSON true | POST /api/render {"Content-Type":"application/json"} body=true | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B12-number | source is number | POST /api/render {"Content-Type":"application/json"} body={"source":5} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B12-array | source is array | POST /api/render {"Content-Type":"application/json"} body={"source":["diagram graph \"Roads\"\nmode undirect… | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B12-null | source is null | POST /api/render {"Content-Type":"application/json"} body={"source":null} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B12-object | source is object | POST /api/render {"Content-Type":"application/json"} body={"source":{"a":"diagram graph \"Roads\"\nmode undi… | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B12-boolean | source is boolean | POST /api/render {"Content-Type":"application/json"} body={"source":true} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B12-empty string | source is empty string | POST /api/render {"Content-Type":"application/json"} body={"source":""} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B12-spaces only | source is spaces only | POST /api/render {"Content-Type":"application/json"} body={"source":" \n\t "} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B12-object with toString | source is object with toString | POST /api/render {"Content-Type":"application/json"} body={"source":{"toString":"x"}} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B13 | source missing | POST /api/render {"Content-Type":"application/json"} body={} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B14 | source with \u0000 inside valid text | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200/422, not 500 | 200 {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"info","code":"graph-su… | Pass |
| B15 | source only \u0000 | POST /api/render {"Content-Type":"application/json"} body={"source":"\u0000"} | 422 or 400 | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | **Fail** |
| B16 | duplicate keys source (last wins by JSON.parse) | POST /api/render {"Content-Type":"application/json"} body={"source":"junk","source":"diagram graph \"Roads\"… | no 500 | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B17 | __proto__ key | POST /api/render {"Content-Type":"application/json"} body={"__proto__":{"source":"x"},"source":"diagram grap… | 200, no pollution | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B18 | constructor key | POST /api/render {"Content-Type":"application/json"} body={"constructor":{"prototype":{"x":1}},"source":"dia… | 200 | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B19 | __proto__ as the only content (source inherited?) | POST /api/render {"Content-Type":"application/json"} body={"__proto__":{"source":"diagram graph \"x\"\nverte… | 400 (no own source) | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B20 | lang = number | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200 fallback | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B21 | lang = object | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200 fallback | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B22 | lang = "__proto__" | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200 | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B23 | lang = "toString" | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200 | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B24 | extra unknown fields | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200, ignored | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B25 | JSON deeply nested (10000 levels) in extra field | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200 or 400, not 500/crash | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B26 | JSON nested 1e5 deep (body ~200KB) | POST /api/render {"Content-Type":"application/json"} body=[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[… | 413 or 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}} | Pass |
| B27 | text/plain with source | POST /api/render {"Content-Type":"text/plain"} body=diagram graph "Roads" mode undirected vertex A ver… | 200 | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B28 | text/plain; charset=utf-8 | POST /api/render {"Content-Type":"text/plain; charset=utf-8"} body=diagram graph "Roads" mode undirected vertex A ver… | 200 | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B29 | no Content-Type, plain source | POST /api/render {} body=diagram graph "Roads" mode undirected vertex A ver… | 200 (treated as text) | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B30 | text/plain with JSON body (taken as source text) | POST /api/render {"Content-Type":"text/plain"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 422 (JSON is not a diagram) | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | **Fail** |
| B31 | application/x-www-form-urlencoded | POST /api/render {"Content-Type":"application/x-www-form-urlencoded… body=source=diagram%20graph%20%22Roads%22%0Amode%20undi… | 415 (unsupported media type) or 400/422 | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | **Fail** |
| B32 | multipart/form-data | POST /api/render {"Content-Type":"multipart/form-data; boundary=x"} body=--x Content-Disposition: form-data; name="source" … | 415 or 400/422 | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | **Fail** |
| B33 | application/xml | POST /api/render {"Content-Type":"application/xml"} body=<source>x</source> | 415 or 400/422 | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | **Fail** |
| B34 | garbage Content-Type | POST /api/render {"Content-Type":"!!;;=="} body=diagram graph "Roads" mode undirected vertex A ver… | not 500 | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B35 | Content-Type: application/jsonx (substring match) | POST /api/render {"Content-Type":"application/jsonx"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 415/400/422 (not JSON) | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… (includes("application/json") accepts any type that merely contains the substring) | **Fail** |
| B36 | Content-Type: text/plain; x=application/json | POST /api/render {"Content-Type":"text/plain; x=application/json"} body=diagram graph "Roads" mode undirected vertex A ver… | treated as text/plain -> 200 | 400 {"error":{"code":"json","message":"The body is not valid JSON"}} (Substring match makes it parsed as JSON) | **Fail** |
| B37 | Content-Type: APPLICATION/JSON (upper case) | POST /api/render {"Content-Type":"APPLICATION/JSON"} body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200 (media types are case-insensitive) | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | Pass |
| B38 | JSON with charset=utf-16 label but utf-8 bytes | POST /api/render {"Content-Type":"application/json; charset=utf-16"… body={"source":"diagram graph \"Roads\"\nmode undirecte… | 200 or 415/400 | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B39 | invalid UTF-8 bytes in text | POST /api/render {"Content-Type":"text/plain"} body=diagram graph "x" vertex A vertex B���� | 200/422, not 500 | 200 {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"info","code":"graph-su… | Pass |
| B40 | unicode, emoji, CJK in names | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Привет 😀 世界\"\nvertex … | 200 or 422, no 500 | 200 {"notation":"graph","valid":false,"problems":[{"line":2,"severity":"error","code":"syntax"… | Pass |
| B41 | CRLF line endings | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\r\nmode undirec… | 200, valid | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":"graph-sum… | Pass |
| B42 | CR-only line endings | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\"\rmode undirecte… | 200, valid | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… (old Mac line ends) | **Fail** |
| B43 | U+2028 as line separator | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"Roads\" mode undirected… | 200 or 422, not 500 | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-he… | Pass |
| B44 | lone surrogate in source | POST /api/render {"Content-Type":"application/json"} body={"source":"diagram graph \"x\"\nvertex \ud800"} | 200/422, response is valid JSON | 200 {"notation":"graph","valid":false,"problems":[{"line":2,"severity":"error","code":"syntax"… | Pass |
| B45 | Content-Length lower than real body | POST /api/render {"Content-Type":"application/json","Content-Length… body={"source":"diagram graph \"Roads\"\nmode undirecte… | not 500 | 400  | Pass |
| B46 | Content-Length larger than the sent body (truncated request) | raw: CL=500, 13 bytes sent, then wait | server stays alive for other requests | timeout after 4076 ms, status 0 | Pass |

## C. Size boundaries

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| C01 | source length 0 | POST /api/render {"source":""} (13 bytes) | 400 | 400 70 ms {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| C02 | source length 1 ("a") | POST /api/render {"source":"a"} (14 bytes) | 422 | 200 4 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… | **Fail** |
| C03 | source length 1 (validate) | POST /api/validate {"source":"a"} (14 bytes) | 200/422, not 500 | 200 4 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… | Pass |
| C04 | source 99999 chars (render) | POST /api/render {"source":"diagram graph \"x\" (107218 bytes) | not 413 | 200 22461 ms {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"in… | Pass |
| C05 | source exactly 100000 chars (render) | POST /api/render {"source":"diagram graph \"x\" (107219 bytes) | accepted (not 413) | 200 14905 ms {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"in… | Pass |
| C06 | source 100001 chars (render) | POST /api/render {"source":"diagram graph \"x\" (107220 bytes) | 413 | 413 16 ms {"error":{"code":"too-large","message":"The source is longer than 1000… | Pass |
| C07 | source 100000 chars (validate) | POST /api/validate {"source":"diagram graph \"x\" (107219 bytes) | 200 | 200 22721 ms {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"in… | Pass |
| C08 | source 100001 chars (validate) | POST /api/validate {"source":"diagram graph \"x\" (107220 bytes) | 413 | 413 20 ms {"error":{"code":"too-large","message":"The source is longer than 1000… | Pass |
| C09 | source 100001 chars (parse) | POST /api/parse {"source":"diagram graph \"x\" (107220 bytes) | 413 | 413 9 ms {"error":{"code":"too-large","message":"The source is longer than 1000… | Pass |
| C10 | source 100001 chars (generate) | POST /api/generate {"source":"diagram graph \"x\" (107220 bytes) | 413 | 413 10 ms {"error":{"code":"too-large","message":"The source is longer than 1000… | Pass |
| C11 | text/plain 100000 chars | POST /api/render diagram graph "x" vertex v18 v (100000 bytes) | accepted | 200 45184 ms {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"in… | Pass |
| C12 | text/plain 100001 chars | POST /api/render diagram graph "x" vertex v18 v (100001 bytes) | 413 | 413 282 ms {"error":{"code":"too-large","message":"The source is longer than 1000… | Pass |
| C13 | text/plain 101024 chars (limit + slack) | POST /api/render aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (101024 bytes) | 413 | 413 14 ms {"error":{"code":"too-large","message":"The source is longer than 1000… | Pass |
| C14 | text/plain 101025 chars | POST /api/render aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (101025 bytes) | 413 | 413 5 ms {"error":{"code":"too-large","message":"The source is longer than 1000… | Pass |
| C15 | body 200 KB JSON | POST /api/render {"source":"aaaaaaaaaaaaaaaaaaa (200013 bytes) | 413 | 413 29 ms {"error":{"code":"too-large","message":"The source is longer than 1000… | Pass |
| C16 | body 5 MB text | POST /api/render aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (5242880 bytes) | 413 or connection closed | 413 46 ms {"error":{"code":"too-large","message":"The request is longer than 100… | Pass |
| C17 | body 50 MB text | POST /api/render aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (52428800 bytes) | 413 or connection closed | 413 400 ms {"error":{"code":"too-large","message":"The request is longer than 100… | Pass |
| C18 | server still alive after huge bodies | GET /api/grammar | 200 | 200 | Pass |
| C19 | source of 50000 emoji (100000 UTF-16 units, 200000 bytes) | POST /api/render {"source":"😀😀😀😀😀😀😀😀😀� (100013 bytes) | 200/422 (100000 units = at the limit), never 413 | 200 11 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… | Pass |
| C20 | source of 30000 Cyrillic chars (60000 bytes) | POST /api/render {"source":"яяяяяяяяяяяяяяяяяяя (30013 bytes) | 422 | 200 5 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… | **Fail** |
| C21 | source of 100000 Cyrillic chars (valid length, 200000 bytes) | POST /api/render {"source":"яяяяяяяяяяяяяяяяяяя (100013 bytes) | not 413: length is exactly 100000 chars | 200 9 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… (The byte limit (100000+1024) is checked in bytes, not characters: a valid 100000-char Cyrillic source is refused) | Pass |
| C22 | source of 50000 Cyrillic chars (100000 bytes) | POST /api/render {"source":"яяяяяяяяяяяяяяяяяяя (50013 bytes) | not 413 | 200 5 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… | Pass |
| C23 | source of 60000 Cyrillic chars (120000 bytes, 60000 chars < 100000) | POST /api/render {"source":"яяяяяяяяяяяяяяяяяяя (60013 bytes) | not 413 (60000 < 100000 chars) | 200 8 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… (Same defect as C21) | Pass |
| C24 | 100000 chars written as \u0000 escapes (600 KB JSON) | POST /api/render {"source":"\u0000\u0000\u0000\ (600013 bytes) | not 413 (source is 100000 chars) | 200 12 ms {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"wa… (JSON escapes count against the byte limit) | Pass |
| C25 | long single word 99900 chars | POST /api/render {"source":"diagram graph \"x\" (99941 bytes) | responds < 5 s | 200 17 ms {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"inf… | Pass |
| C26 | long title 99000 chars | POST /api/render {"source":"diagram graph \"TTT (99041 bytes) | responds < 5 s | 200 11 ms {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"inf… | Pass |

## D. Large graphs and performance

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| D01 | chain of 300 nodes | POST /api/render (8689 chars) | 200, valid SVG, < 3 s | 200 3066 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | **Fail** |
| D02 | chain of 600 nodes | POST /api/render (17689 chars) | answer < 10 s, not 500 | 200 10831 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | **Fail** |
| D03 | cycle of 300 nodes | POST /api/render (8705 chars) | 200 < 3 s | 200 895 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| D04 | 300 self-loops | POST /api/render (8704 chars) | 200 < 3 s | 200 1508 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| D05 | complete graph of 40 nodes (1560 edges) | POST /api/render (24645 chars) | 200 < 5 s | 200 4389 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| D06 | complete graph of 60 nodes (3540 edges) | POST /api/render (56145 chars) | answer < 15 s, not 500 | 200 22011 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | **Fail** |
| D07 | star of 500 nodes | POST /api/render (14325 chars) | answer < 10 s, not 500 | 200 2623 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| D08 | DAG chain 400 tasks | POST /api/render (18757 chars) | 200 < 5 s | 200 757 ms {"notation":"dag","valid":true,"problems":[{"line":1,"severi… | Pass |
| D09 | DAG with a cycle of 400 tasks | POST /api/render (18775 chars) | 200 valid=false (cycle reported) < 5 s | 200 609 ms {"notation":"dag","valid":false,"problems":[{"line":402,"sev… | Pass |
| D10 | DAG cycle, validate | POST /api/validate (2175 chars) | valid=false with a cycle problem | 200 12 ms {"notation":"dag","valid":false,"problems":[{"line":52,"seve… | Pass |
| D11 | validate of a chain of 800 vertices | POST /api/validate (23689 chars) | 200 < 5 s | 200 15483 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | **Fail** |
| D12 | parse of a chain of 800 vertices | POST /api/parse (23689 chars) | 200 < 5 s | 200 18202 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | **Fail** |
| D12b | validate of a chain of 400 vertices | POST /api/validate (11689 chars) | 200 < 2 s | 200 1896 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| D12c | validate of a DAG of 800 tasks (for comparison) | POST /api/validate (37957 chars) | 200 < 2 s | 200 5157 ms {"notation":"dag","valid":true,"problems":[{"line":1,"severi… | **Fail** |
| D13-graphviz | generate graphviz for 400 nodes | POST /api/generate | 200 < 5 s | 200 4894 ms | Pass |
| D13-mermaid | generate mermaid for 400 nodes | POST /api/generate | 200 < 5 s | 200 3153 ms | Pass |
| D14 | many quotes | POST /api/render (50025 chars) | answer < 5 s, no 500/hang | 200 13 ms {"notation":"graph","valid":false,"problems":[{"line":2,"sev… | Pass |
| D15 | many backslashes | POST /api/render (50025 chars) | answer < 5 s, no 500/hang | 200 99 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| D16 | long run of spaces then x | POST /api/render (90019 chars) | answer < 5 s, no 500/hang | 200 6 ms {"notation":"graph","valid":false,"problems":[{"line":2,"sev… | Pass |
| D17 | long unterminated string | POST /api/render (90028 chars) | answer < 5 s, no 500/hang | 200 7 ms {"notation":"graph","valid":false,"problems":[{"line":2,"sev… | Pass |
| D18 | long word of dots/dashes | POST /api/render (80025 chars) | answer < 5 s, no 500/hang | 200 9 ms {"notation":"graph","valid":false,"problems":[{"line":2,"sev… | Pass |
| D19 | weight with 50000 digits | POST /api/render (50055 chars) | answer < 5 s, no 500/hang | 200 7 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| D20 | weights 1e999 / NaN / -0 | POST /api/render (117 chars) | answer < 5 s, no 500/hang | 200 6 ms {"notation":"graph","valid":false,"problems":[{"line":1,"sev… | Pass |
| D21 | 20000 empty lines then header | POST /api/render (20026 chars) | answer < 5 s, no 500/hang | 200 9 ms {"notation":"graph","valid":true,"problems":[{"line":1,"seve… | Pass |
| D22 | 19000 comment lines | POST /api/render (95018 chars) | answer < 5 s, no 500/hang | 200 18 ms {"notation":"graph","valid":true,"problems":[],"svg":…http:/… | Pass |
| D23 | 5000 unclosed braces (uml class) | POST /api/render (50022 chars) | answer < 5 s, no 500/hang | 200 185 ms {"notation":"uml-class","valid":false,"problems":[{"line":2,… | Pass |
| D24 | id of 60000 letters + "!" | POST /api/render (60026 chars) | answer < 5 s, no 500/hang | 200 10 ms {"notation":"graph","valid":false,"problems":[{"line":2,"sev… | Pass |
| D25 | idef0 with 500 boxes | POST /api/render (23077 chars) | answer < 5 s | 200 218 ms {"notation":"idef0","valid":false,"problems":[{"line":2,"sev… | Pass |
| D26 | erd with 300 entities and relations | POST /api/render (17656 chars) | answer < 5 s | 200 875 ms {"notation":"erd","valid":true,"problems":[],"svg":…http://w… | Pass |
| D27 | uml sequence with 2000 messages | POST /api/render (40053 chars) | answer < 5 s | 200 183 ms {"notation":"uml-sequence","valid":false,"problems":[{"line"… | Pass |
| D28 | mindmap depth 2000 | POST /api/render (72696 chars) | answer < 5 s, no stack overflow | 200 15086 ms {"notation":"mindmap","valid":true,"problems":[],"svg":…http… | **Fail** |
| D29 | orgchart depth 3000 (recursion?) | POST /api/render (104672 chars) | answer < 5 s, no 500 | 413 35 ms {"error":{"code":"too-large","message":"The source is longer… | Pass |
| D30 | decision tree depth 3000 | POST /api/render (137665 chars) | answer < 5 s, no 500 | 413 5 ms {"error":{"code":"too-large","message":"The source is longer… | Pass |
| D31 | latency of a normal render, 20 sequential requests | POST /api/render gost template x20 | median < 100 ms, max < 500 ms | median 7.2 ms, max 15.4 ms | Pass |

## E. All notations

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| E00 | every notation has a template and vice versa | GET /api/notations vs TEMPLATES | 33 = 33, identical sets | 33 vs 33, missing: - | Pass |
| E-idef0-render | render template idef0 | POST /api/render (397 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 6 ms issues=none | Pass |
| E-idef0-validate | validate template idef0 | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-idef0-svg | render idef0 as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-idef0-gen-graphviz | generate graphviz for idef0 | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=607 | Pass |
| E-idef0-gen-mermaid | generate mermaid for idef0 | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=427 | Pass |
| E-idef0-gen-plantuml | generate plantuml for idef0 | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=467 | Pass |
| E-idef0-parse | parse template idef0 | POST /api/parse | 200, model object | 200 len=765 | Pass |
| E-idef1-render | render template idef1 | POST /api/render (169 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 6 ms issues=none | Pass |
| E-idef1-validate | validate template idef1 | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-idef1-svg | render idef1 as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-idef1-gen-graphviz | generate graphviz for idef1 | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=657 | Pass |
| E-idef1-gen-mermaid | generate mermaid for idef1 | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=137 | Pass |
| E-idef1-gen-plantuml | generate plantuml for idef1 | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=222 | Pass |
| E-idef1-parse | parse template idef1 | POST /api/parse | 200, model object | 200 len=880 | Pass |
| E-idef1x-render | render template idef1x | POST /api/render (513 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 11 ms issues=none | Pass |
| E-idef1x-validate | validate template idef1x | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-idef1x-svg | render idef1x as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-idef1x-gen-graphviz | generate graphviz for idef1x | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=1788 | Pass |
| E-idef1x-gen-mermaid | generate mermaid for idef1x | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=423 | Pass |
| E-idef1x-gen-plantuml | generate plantuml for idef1x | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=602 | Pass |
| E-idef1x-parse | parse template idef1x | POST /api/parse | 200, model object | 200 len=2605 | Pass |
| E-idef3-render | render template idef3 | POST /api/render (300 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 15 ms issues=none | Pass |
| E-idef3-validate | validate template idef3 | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-idef3-svg | render idef3 as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-idef3-gen-graphviz | generate graphviz for idef3 | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=621 | Pass |
| E-idef3-gen-mermaid | generate mermaid for idef3 | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=225 | Pass |
| E-idef3-gen-plantuml | generate plantuml for idef3 | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=328 | Pass |
| E-idef3-parse | parse template idef3 | POST /api/parse | 200, model object | 200 len=1150 | Pass |
| E-idef4-render | render template idef4 | POST /api/render (181 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 12 ms issues=none | Pass |
| E-idef4-validate | validate template idef4 | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-idef4-svg | render idef4 as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-idef4-gen-graphviz | generate graphviz for idef4 | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=934 | Pass |
| E-idef4-gen-mermaid | generate mermaid for idef4 | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=213 | Pass |
| E-idef4-gen-plantuml | generate plantuml for idef4 | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=254 | Pass |
| E-idef4-parse | parse template idef4 | POST /api/parse | 200, model object | 200 len=921 | Pass |
| E-idef5-render | render template idef5 | POST /api/render (252 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 7 ms issues=none | Pass |
| E-idef5-validate | validate template idef5 | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-idef5-svg | render idef5 as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-idef5-gen-graphviz | generate graphviz for idef5 | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=552 | Pass |
| E-idef5-gen-mermaid | generate mermaid for idef5 | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=191 | Pass |
| E-idef5-gen-plantuml | generate plantuml for idef5 | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=265 | Pass |
| E-idef5-parse | parse template idef5 | POST /api/parse | 200, model object | 200 len=829 | Pass |
| E-dfd-render | render template dfd | POST /api/render (315 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 7 ms issues=none | Pass |
| E-dfd-validate | validate template dfd | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-dfd-svg | render dfd as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-dfd-gen-graphviz | generate graphviz for dfd | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=684 | Pass |
| E-dfd-gen-mermaid | generate mermaid for dfd | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=275 | Pass |
| E-dfd-gen-plantuml | generate plantuml for dfd | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=344 | Pass |
| E-dfd-parse | parse template dfd | POST /api/parse | 200, model object | 200 len=998 | Pass |
| E-erd-render | render template erd | POST /api/render (285 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 7 ms issues=none | Pass |
| E-erd-validate | validate template erd | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-erd-svg | render erd as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-erd-gen-graphviz | generate graphviz for erd | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=979 | Pass |
| E-erd-gen-mermaid | generate mermaid for erd | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=246 | Pass |
| E-erd-gen-plantuml | generate plantuml for erd | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=322 | Pass |
| E-erd-parse | parse template erd | POST /api/parse | 200, model object | 200 len=1397 | Pass |
| E-bpmn-render | render template bpmn | POST /api/render (281 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 10 ms issues=none | Pass |
| E-bpmn-validate | validate template bpmn | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-bpmn-svg | render bpmn as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-bpmn-gen-graphviz | generate graphviz for bpmn | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=722 | Pass |
| E-bpmn-gen-mermaid | generate mermaid for bpmn | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=243 | Pass |
| E-bpmn-gen-plantuml | generate plantuml for bpmn | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=331 | Pass |
| E-bpmn-parse | parse template bpmn | POST /api/parse | 200, model object | 200 len=1121 | Pass |
| E-petri-render | render template petri | POST /api/render (220 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 12 ms issues=none | Pass |
| E-petri-validate | validate template petri | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-petri-svg | render petri as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-petri-gen-graphviz | generate graphviz for petri | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=550 | Pass |
| E-petri-gen-mermaid | generate mermaid for petri | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=143 | Pass |
| E-petri-gen-plantuml | generate plantuml for petri | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=221 | Pass |
| E-petri-parse | parse template petri | POST /api/parse | 200, model object | 200 len=803 | Pass |
| E-gost-render | render template gost | POST /api/render (281 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 11 ms issues=none | Pass |
| E-gost-validate | validate template gost | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-gost-svg | render gost as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-gost-gen-graphviz | generate graphviz for gost | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=698 | Pass |
| E-gost-gen-mermaid | generate mermaid for gost | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=253 | Pass |
| E-gost-gen-plantuml | generate plantuml for gost | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=333 | Pass |
| E-gost-parse | parse template gost | POST /api/parse | 200, model object | 200 len=1116 | Pass |
| E-graph-render | render template graph | POST /api/render (190 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 8 ms issues=none | Pass |
| E-graph-validate | validate template graph | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=6 (non-info: 0) | Pass |
| E-graph-svg | render graph as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-graph-gen-graphviz | generate graphviz for graph | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=329 | Pass |
| E-graph-gen-mermaid | generate mermaid for graph | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=145 | Pass |
| E-graph-parse | parse template graph | POST /api/parse | 200, model object | 200 len=2110 | Pass |
| E-dag-render | render template dag | POST /api/render (296 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 8 ms issues=none | Pass |
| E-dag-validate | validate template dag | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=4 (non-info: 0) | Pass |
| E-dag-svg | render dag as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-dag-gen-graphviz | generate graphviz for dag | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=565 | Pass |
| E-dag-gen-mermaid | generate mermaid for dag | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=164 | Pass |
| E-dag-gen-plantuml | generate plantuml for dag | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=254 | Pass |
| E-dag-parse | parse template dag | POST /api/parse | 200, model object | 200 len=1870 | Pass |
| E-uml-class-render | render template uml-class | POST /api/render (397 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 8 ms issues=none | Pass |
| E-uml-class-validate | validate template uml-class | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-class-svg | render uml-class as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-class-gen-graphviz | generate graphviz for uml-class | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=1586 | Pass |
| E-uml-class-gen-mermaid | generate mermaid for uml-class | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=485 | Pass |
| E-uml-class-gen-plantuml | generate plantuml for uml-class | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=489 | Pass |
| E-uml-class-parse | parse template uml-class | POST /api/parse | 200, model object | 200 len=1624 | Pass |
| E-uml-object-render | render template uml-object | POST /api/render (164 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 5 ms issues=none | Pass |
| E-uml-object-validate | validate template uml-object | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-object-svg | render uml-object as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-object-gen-graphviz | generate graphviz for uml-object | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=366 | Pass |
| E-uml-object-gen-mermaid | generate mermaid for uml-object | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=127 | Pass |
| E-uml-object-gen-plantuml | generate plantuml for uml-object | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=190 | Pass |
| E-uml-object-parse | parse template uml-object | POST /api/parse | 200, model object | 200 len=546 | Pass |
| E-uml-component-render | render template uml-component | POST /api/render (232 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 9 ms issues=none | Pass |
| E-uml-component-validate | validate template uml-component | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-component-svg | render uml-component as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-component-gen-graphviz | generate graphviz for uml-component | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=463 | Pass |
| E-uml-component-gen-mermaid | generate mermaid for uml-component | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=157 | Pass |
| E-uml-component-gen-plantuml | generate plantuml for uml-component | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=234 | Pass |
| E-uml-component-parse | parse template uml-component | POST /api/parse | 200, model object | 200 len=845 | Pass |
| E-uml-composite-render | render template uml-composite | POST /api/render (178 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 7 ms issues=none | Pass |
| E-uml-composite-validate | validate template uml-composite | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-composite-svg | render uml-composite as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-composite-gen-graphviz | generate graphviz for uml-composite | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=385 | Pass |
| E-uml-composite-gen-mermaid | generate mermaid for uml-composite | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=104 | Pass |
| E-uml-composite-gen-plantuml | generate plantuml for uml-composite | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=187 | Pass |
| E-uml-composite-parse | parse template uml-composite | POST /api/parse | 200, model object | 200 len=618 | Pass |
| E-uml-deployment-render | render template uml-deployment | POST /api/render (289 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 11 ms issues=none | Pass |
| E-uml-deployment-validate | validate template uml-deployment | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-deployment-svg | render uml-deployment as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-deployment-gen-graphviz | generate graphviz for uml-deployment | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=597 | Pass |
| E-uml-deployment-gen-mermaid | generate mermaid for uml-deployment | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=247 | Pass |
| E-uml-deployment-gen-plantuml | generate plantuml for uml-deployment | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=316 | Pass |
| E-uml-deployment-parse | parse template uml-deployment | POST /api/parse | 200, model object | 200 len=885 | Pass |
| E-uml-package-render | render template uml-package | POST /api/render (205 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 9 ms issues=none | Pass |
| E-uml-package-validate | validate template uml-package | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-package-svg | render uml-package as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-package-gen-graphviz | generate graphviz for uml-package | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=422 | Pass |
| E-uml-package-gen-mermaid | generate mermaid for uml-package | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=132 | Pass |
| E-uml-package-gen-plantuml | generate plantuml for uml-package | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=195 | Pass |
| E-uml-package-parse | parse template uml-package | POST /api/parse | 200, model object | 200 len=751 | Pass |
| E-uml-profile-render | render template uml-profile | POST /api/render (161 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 9 ms issues=none | Pass |
| E-uml-profile-validate | validate template uml-profile | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-profile-svg | render uml-profile as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-profile-gen-graphviz | generate graphviz for uml-profile | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=390 | Pass |
| E-uml-profile-gen-mermaid | generate mermaid for uml-profile | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=144 | Pass |
| E-uml-profile-gen-plantuml | generate plantuml for uml-profile | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=214 | Pass |
| E-uml-profile-parse | parse template uml-profile | POST /api/parse | 200, model object | 200 len=624 | Pass |
| E-uml-usecase-render | render template uml-usecase | POST /api/render (276 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 9 ms issues=none | Pass |
| E-uml-usecase-validate | validate template uml-usecase | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-usecase-svg | render uml-usecase as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-usecase-gen-graphviz | generate graphviz for uml-usecase | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=561 | Pass |
| E-uml-usecase-gen-mermaid | generate mermaid for uml-usecase | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=215 | Pass |
| E-uml-usecase-gen-plantuml | generate plantuml for uml-usecase | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=281 | Pass |
| E-uml-usecase-parse | parse template uml-usecase | POST /api/parse | 200, model object | 200 len=991 | Pass |
| E-uml-activity-render | render template uml-activity | POST /api/render (276 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 16 ms issues=none | Pass |
| E-uml-activity-validate | validate template uml-activity | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-activity-svg | render uml-activity as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-activity-gen-graphviz | generate graphviz for uml-activity | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=812 | Pass |
| E-uml-activity-gen-mermaid | generate mermaid for uml-activity | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=242 | Pass |
| E-uml-activity-gen-plantuml | generate plantuml for uml-activity | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=334 | Pass |
| E-uml-activity-parse | parse template uml-activity | POST /api/parse | 200, model object | 200 len=1242 | Pass |
| E-uml-state-render | render template uml-state | POST /api/render (270 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 10 ms issues=none | Pass |
| E-uml-state-validate | validate template uml-state | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-state-svg | render uml-state as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-state-gen-graphviz | generate graphviz for uml-state | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=619 | Pass |
| E-uml-state-gen-mermaid | generate mermaid for uml-state | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=177 | Pass |
| E-uml-state-gen-plantuml | generate plantuml for uml-state | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=176 | Pass |
| E-uml-state-parse | parse template uml-state | POST /api/parse | 200, model object | 200 len=911 | Pass |
| E-uml-sequence-render | render template uml-sequence | POST /api/render (251 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 10 ms issues=none | Pass |
| E-uml-sequence-validate | validate template uml-sequence | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-sequence-svg | render uml-sequence as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-sequence-gen-mermaid | generate mermaid for uml-sequence | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=273 | Pass |
| E-uml-sequence-gen-plantuml | generate plantuml for uml-sequence | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=292 | Pass |
| E-uml-sequence-parse | parse template uml-sequence | POST /api/parse | 200, model object | 200 len=755 | Pass |
| E-uml-communication-render | render template uml-communication | POST /api/render (207 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 7 ms issues=none | Pass |
| E-uml-communication-validate | validate template uml-communication | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-communication-svg | render uml-communication as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-communication-gen-graphviz | generate graphviz for uml-communication | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=430 | Pass |
| E-uml-communication-gen-mermaid | generate mermaid for uml-communication | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=168 | Pass |
| E-uml-communication-gen-plantuml | generate plantuml for uml-communication | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=224 | Pass |
| E-uml-communication-parse | parse template uml-communication | POST /api/parse | 200, model object | 200 len=655 | Pass |
| E-uml-timing-render | render template uml-timing | POST /api/render (248 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 12 ms issues=none | Pass |
| E-uml-timing-validate | validate template uml-timing | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-timing-svg | render uml-timing as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-timing-gen-plantuml | generate plantuml for uml-timing | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=218 | Pass |
| E-uml-timing-parse | parse template uml-timing | POST /api/parse | 200, model object | 200 len=709 | Pass |
| E-uml-overview-render | render template uml-overview | POST /api/render (260 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 24 ms issues=none | Pass |
| E-uml-overview-validate | validate template uml-overview | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-uml-overview-svg | render uml-overview as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-uml-overview-gen-graphviz | generate graphviz for uml-overview | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=701 | Pass |
| E-uml-overview-gen-mermaid | generate mermaid for uml-overview | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=228 | Pass |
| E-uml-overview-gen-plantuml | generate plantuml for uml-overview | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=313 | Pass |
| E-uml-overview-parse | parse template uml-overview | POST /api/parse | 200, model object | 200 len=1123 | Pass |
| E-mindmap-render | render template mindmap | POST /api/render (353 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 12 ms issues=none | Pass |
| E-mindmap-validate | validate template mindmap | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-mindmap-svg | render mindmap as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-mindmap-gen-graphviz | generate graphviz for mindmap | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=786 | Pass |
| E-mindmap-gen-mermaid | generate mermaid for mindmap | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=252 | Pass |
| E-mindmap-gen-plantuml | generate plantuml for mindmap | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=342 | Pass |
| E-mindmap-parse | parse template mindmap | POST /api/parse | 200, model object | 200 len=1244 | Pass |
| E-orgchart-render | render template orgchart | POST /api/render (264 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 7 ms issues=none | Pass |
| E-orgchart-validate | validate template orgchart | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-orgchart-svg | render orgchart as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-orgchart-gen-graphviz | generate graphviz for orgchart | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=600 | Pass |
| E-orgchart-gen-mermaid | generate mermaid for orgchart | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=183 | Pass |
| E-orgchart-gen-plantuml | generate plantuml for orgchart | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=256 | Pass |
| E-orgchart-parse | parse template orgchart | POST /api/parse | 200, model object | 200 len=950 | Pass |
| E-c4-render | render template c4 | POST /api/render (305 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 9 ms issues=none | Pass |
| E-c4-validate | validate template c4 | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-c4-svg | render c4 as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-c4-gen-graphviz | generate graphviz for c4 | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=661 | Pass |
| E-c4-gen-mermaid | generate mermaid for c4 | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=234 | Pass |
| E-c4-gen-plantuml | generate plantuml for c4 | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=313 | Pass |
| E-c4-parse | parse template c4 | POST /api/parse | 200, model object | 200 len=870 | Pass |
| E-network-render | render template network | POST /api/render (262 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 10 ms issues=none | Pass |
| E-network-validate | validate template network | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-network-svg | render network as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-network-gen-graphviz | generate graphviz for network | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=638 | Pass |
| E-network-gen-mermaid | generate mermaid for network | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=202 | Pass |
| E-network-gen-plantuml | generate plantuml for network | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=275 | Pass |
| E-network-parse | parse template network | POST /api/parse | 200, model object | 200 len=1050 | Pass |
| E-decision-render | render template decision | POST /api/render (267 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 5 ms issues=none | Pass |
| E-decision-validate | validate template decision | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-decision-svg | render decision as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-decision-gen-graphviz | generate graphviz for decision | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=667 | Pass |
| E-decision-gen-mermaid | generate mermaid for decision | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=196 | Pass |
| E-decision-gen-plantuml | generate plantuml for decision | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=277 | Pass |
| E-decision-parse | parse template decision | POST /api/parse | 200, model object | 200 len=838 | Pass |
| E-epc-render | render template epc | POST /api/render (362 chars) | 200, valid=true, valid SVG without script/on*/javascript:, < 500 ms | 200 valid=true 8 ms issues=none | Pass |
| E-epc-validate | validate template epc | POST /api/validate | 200 valid=true, no errors/warnings (info allowed) | 200 valid=true problems=0 (non-info: 0) | Pass |
| E-epc-svg | render epc as image/svg+xml | POST /api/render Accept: image/svg+xml | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 issues=none | Pass |
| E-epc-gen-graphviz | generate graphviz for epc | POST /api/generate format=graphviz | 200, non-empty text, format as asked | 200 format=graphviz len=1112 | Pass |
| E-epc-gen-mermaid | generate mermaid for epc | POST /api/generate format=mermaid | 200, non-empty text, format as asked | 200 format=mermaid len=306 | Pass |
| E-epc-gen-plantuml | generate plantuml for epc | POST /api/generate format=plantuml | 200, non-empty text, format as asked | 200 format=plantuml len=410 | Pass |
| E-epc-parse | parse template epc | POST /api/parse | 200, model object | 200 len=1352 | Pass |
| E-idef0-empty | empty idef0 diagram (header only) | POST /api/render "diagram idef0" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-idef1-empty | empty idef1 diagram (header only) | POST /api/render "diagram idef1" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-idef1x-empty | empty idef1x diagram (header only) | POST /api/render "diagram idef1x" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-idef3-empty | empty idef3 diagram (header only) | POST /api/render "diagram idef3" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-idef4-empty | empty idef4 diagram (header only) | POST /api/render "diagram idef4" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-idef5-empty | empty idef5 diagram (header only) | POST /api/render "diagram idef5" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-dfd-empty | empty dfd diagram (header only) | POST /api/render "diagram dfd" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-erd-empty | empty erd diagram (header only) | POST /api/render "diagram erd" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-bpmn-empty | empty bpmn diagram (header only) | POST /api/render "diagram bpmn" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-petri-empty | empty petri diagram (header only) | POST /api/render "diagram petri" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-gost-empty | empty gost diagram (header only) | POST /api/render "diagram gost" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-graph-empty | empty graph diagram (header only) | POST /api/render "diagram graph" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-dag-empty | empty dag diagram (header only) | POST /api/render "diagram dag" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-class-empty | empty uml-class diagram (header only) | POST /api/render "diagram uml class" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-object-empty | empty uml-object diagram (header only) | POST /api/render "diagram uml object" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-component-empty | empty uml-component diagram (header only) | POST /api/render "diagram uml component" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-composite-empty | empty uml-composite diagram (header only) | POST /api/render "diagram uml composite" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-deployment-empty | empty uml-deployment diagram (header only) | POST /api/render "diagram uml deployment" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-package-empty | empty uml-package diagram (header only) | POST /api/render "diagram uml package" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-profile-empty | empty uml-profile diagram (header only) | POST /api/render "diagram uml profile" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-usecase-empty | empty uml-usecase diagram (header only) | POST /api/render "diagram uml usecase" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-activity-empty | empty uml-activity diagram (header only) | POST /api/render "diagram uml activity" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-state-empty | empty uml-state diagram (header only) | POST /api/render "diagram uml state" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-sequence-empty | empty uml-sequence diagram (header only) | POST /api/render "diagram uml sequence" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-communication-empty | empty uml-communication diagram (header only) | POST /api/render "diagram uml communication" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-timing-empty | empty uml-timing diagram (header only) | POST /api/render "diagram uml timing" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-uml-overview-empty | empty uml-overview diagram (header only) | POST /api/render "diagram uml overview" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-mindmap-empty | empty mindmap diagram (header only) | POST /api/render "diagram mindmap" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-orgchart-empty | empty orgchart diagram (header only) | POST /api/render "diagram orgchart" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-c4-empty | empty c4 diagram (header only) | POST /api/render "diagram c4" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-network-empty | empty network diagram (header only) | POST /api/render "diagram network" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-decision-empty | empty decision diagram (header only) | POST /api/render "diagram decision" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |
| E-epc-empty | empty epc diagram (header only) | POST /api/render "diagram epc" | 200 or 422, no 500, SVG valid when 200 | 200 svg ok | Pass |

## F. XSS and reflection

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| F01 | injection payloads in every quoted string of every template | 33 notations x 16 payloads = 528 requests | no script/on*/javascript:, SVG balanced, no 500 | no violations | Pass |
| F02 | injection payloads in identifiers (unquoted) | 165 requests | no 500, safe SVG | no violations | Pass |
| F03 | JSON responses are JSON type + nosniff | POST /api/generate with <script> title | application/json, X-Content-Type-Options: nosniff | application/json; charset=utf-8 nosniff=- | **Fail** |
| F04 | SVG served directly: no raw <script>, CSP present | POST /api/render Accept svg with <script> title | no <script>; CSP header present | 200 script=false csp=- | **Fail** |
| F05 | reflection in 422 message | POST /api/render <script> without header | JSON type (not HTML) so reflection is inert | 200 application/json; charset=utf-8 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","code":"no-header","message":"Нет заголовка… | Pass |
| F06 | path reflected in 404 JSON | GET /api/<script>alert(1)</script> | 404 JSON | 404 application/json; charset=utf-8 {"error":{"code":"not-found","message":"Unknown endpoint /api/%3Cscript%3Ealert(1)%3C/script%3E"}} | Pass |
| F07 | encoded path reflected | POST /api/%3Cscript%3E | 404 JSON | 404 {"error":{"code":"not-found","message":"Unknown endpoint /api/%3Cscript%3E"}} | Pass |
| F08 | query reflected | GET /api/notations?lang=<script> | not reflected | 200 reflected=false | Pass |
| F09 | CORS: foreign Origin | GET /api/notations Origin: evil.example | no Access-Control-Allow-Origin | ACAO=- | Pass |
| F10 | CORS preflight from foreign origin | OPTIONS /api/render Origin evil | no ACAO (cross-origin denied) | 405 ACAO=- | Pass |
| F11 | simple cross-origin POST (text/plain) is processed | POST text/plain Origin evil | harmless: stateless, no cookies, CORS blocks reading | 200 (No CSRF impact: the API is stateless and has no cookies) | Pass |
| F12 | Host header spoofing | GET /api/notations Host: evil.example | Host not reflected | 200 reflected=false | Pass |
| F13 | escape sequences in titles do not become tags | title with \u003c | no <script> in svg | 200 | Pass |
| F14 | quote-breaking labels | vertex with embedded quote/newline | SVG valid | 200 ok | Pass |

## J. Internal errors (500)

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| J01 | header with leading spaces | POST /api/render " diagram graph "x"" | 200 or 422, never 500; SVG valid | 200 {"notation":"graph","valid":true,"problems":[],"svg":…http://www.w3.org/2000/svg…  | Pass |
| J02 | diagram keyword only | POST /api/render "diagram" | 200 or 422, never 500; SVG valid | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"severity":"warning","co…  | Pass |
| J03 | diagram uml only | POST /api/render "diagram uml" | 200 or 422, never 500; SVG valid | 422 {"error":{"code":"unknown-notation","message":"Для UML укажите вид диаграммы: cl…  | Pass |
| J04 | diagram uml unknown kind | POST /api/render "diagram uml nosuch "x"" | 200 or 422, never 500; SVG valid | 422 {"error":{"code":"unknown-notation","message":"Неизвестный вид UML «nosuch». Дос…  | Pass |
| J05 | diagram constructor | POST /api/render "diagram constructor "x"" | 200 or 422, never 500; SVG valid | 500 {"error":{"code":"internal","message":"The source could not be processed"}}  | **Fail** |
| J05-validate | diagram constructor via validate | POST /api/validate | not 500 | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | **Fail** |
| J05-parse | diagram constructor via parse | POST /api/parse | not 500 | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | **Fail** |
| J05-generate | diagram constructor via generate | POST /api/generate | not 500 | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | **Fail** |
| J06 | diagram __proto__ | POST /api/render "diagram __proto__ "x"" | 200 or 422, never 500; SVG valid | 500 {"error":{"code":"internal","message":"The source could not be processed"}}  | **Fail** |
| J06-validate | diagram __proto__ via validate | POST /api/validate | not 500 | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | **Fail** |
| J06-parse | diagram __proto__ via parse | POST /api/parse | not 500 | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | **Fail** |
| J06-generate | diagram __proto__ via generate | POST /api/generate | not 500 | 500 {"error":{"code":"internal","message":"The source could not be processed"}} | **Fail** |
| J07 | diagram toString | POST /api/render "diagram toString" | 200 or 422, never 500; SVG valid | 422 {"error":{"code":"unknown-notation","message":"Неизвестная нотация «tostring». Д…  | Pass |
| J08 | diagram hasOwnProperty | POST /api/render "diagram hasOwnProperty" | 200 or 422, never 500; SVG valid | 422 {"error":{"code":"unknown-notation","message":"Неизвестная нотация «hasownproper…  | Pass |
| J09 | diagram uml constructor | POST /api/render "diagram uml constructor" | 200 or 422, never 500; SVG valid | 422 {"error":{"code":"unknown-notation","message":"Неизвестный вид UML «constructor»…  | Pass |
| J10 | diagram uml __proto__ | POST /api/render "diagram uml __proto__" | 200 or 422, never 500; SVG valid | 422 {"error":{"code":"unknown-notation","message":"Неизвестный вид UML «__proto__». …  | Pass |
| J11 | vertex named __proto__/constructor | POST /api/render "diagram graph "x"\nvertex __proto__\nvertex constr…" | 200 or 422, never 500; SVG valid | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":…  | Pass |
| J12 | vertex named toString/hasOwnProperty | POST /api/render "diagram graph "x"\nvertex toString\nvertex hasOwnP…" | 200 or 422, never 500; SVG valid | 200 {"notation":"graph","valid":true,"problems":[{"line":1,"severity":"info","code":…  | Pass |
| J13 | attribute __proto__=1 | POST /api/render "diagram graph "x"\nvertex A __proto__=1 constructo…" | 200 or 422, never 500; SVG valid | 200 {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"info","code"…  | Pass |
| J14 | dag task __proto__ | POST /api/render "diagram dag "x"\ntask __proto__ "a" duration=1\nta…" | 200 or 422, never 500; SVG valid | 200 {"notation":"dag","valid":true,"problems":[{"line":1,"severity":"info","code":"d…  | Pass |
| J15 | erd entity __proto__ | POST /api/render "diagram erd "x"\nentity __proto__ {\n constructor:…" | 200 or 422, never 500; SVG valid | 200 {"notation":"erd","valid":true,"problems":[],"svg":…http://www.w3.org/2000/svg\"…  | Pass |
| J16 | uml class named constructor | POST /api/render "diagram uml class "x"\nclass constructor {\n +__pr…" | 200 or 422, never 500; SVG valid | 200 {"notation":"uml-class","valid":true,"problems":[],"svg":…http://www.w3.org/2000…  | Pass |
| J17 | idef0 box __proto__ | POST /api/render "diagram idef0 "x"\nbox __proto__ "a" {\n input: co…" | 200 or 422, never 500; SVG valid | 200 {"notation":"idef0","valid":false,"problems":[{"line":2,"severity":"warning","co…  | Pass |
| J18 | gost node __proto__ | POST /api/render "diagram gost "x"\nstart __proto__ "S"\nend constru…" | 200 or 422, never 500; SVG valid | 200 {"notation":"gost","valid":true,"problems":[],"svg":…http://www.w3.org/2000/svg\…  | Pass |
| J19 | sequence participants __proto__ | POST /api/render "diagram uml sequence "x"\nparticipant __proto__\np…" | 200 or 422, never 500; SVG valid | 200 {"notation":"uml-sequence","valid":false,"problems":[{"line":2,"severity":"warni…  | Pass |
| J20 | dag duration negative / not a number | POST /api/render "diagram dag "x"\ntask a "a" duration=-5\ntask b "b…" | 200 or 422, never 500; SVG valid | 200 {"notation":"dag","valid":false,"problems":[{"line":1,"severity":"info","code":"…  | Pass |
| J21 | graph path to missing node | POST /api/render "diagram graph "x"\nvertex A\npath A -> Z" | 200 or 422, never 500; SVG valid | 200 {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"info","code"…  | Pass |
| J22 | graph negative weight path | POST /api/render "diagram graph "x"\nmode undirected\nvertex A\nvert…" | 200 or 422, never 500; SVG valid | 200 {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"info","code"…  | Pass |
| J23 | petri negative / huge tokens | POST /api/render "diagram petri "x"\nplace p tokens=-3\nplace q toke…" | 200 or 422, never 500; SVG valid | 200 {"notation":"petri","valid":false,"problems":[{"line":2,"severity":"error","code…  | Pass |
| J24 | petri tokens 99999999999 | POST /api/render "diagram petri "x"\nplace p tokens=99999999999\ntra…" | 200 or 422, never 500; SVG valid | 200 {"notation":"petri","valid":true,"problems":[],"svg":…http://www.w3.org/2000/svg…  | Pass |
| J25 | mindmap two roots and a cycle | POST /api/render "diagram mindmap "x"\nroot a "A"\nroot b "B"\ntopic…" | 200 or 422, never 500; SVG valid | 200 {"notation":"mindmap","valid":false,"problems":[{"line":3,"severity":"error","co…  | Pass |
| J26 | orgchart cycle | POST /api/render "diagram orgchart "x"\nunit a "A"\nunit b "B"\nlead…" | 200 or 422, never 500; SVG valid | 200 {"notation":"orgchart","valid":false,"problems":[{"line":4,"severity":"error","c…  | Pass |
| J27 | decision cycle | POST /api/render "diagram decision "x"\nquestion a "A"\nquestion b "…" | 200 or 422, never 500; SVG valid | 200 {"notation":"decision","valid":false,"problems":[{"line":2,"severity":"warning",…  | Pass |
| J28 | orgchart self lead | POST /api/render "diagram orgchart "x"\nunit a "A"\nleads a -> a" | 200 or 422, never 500; SVG valid | 200 {"notation":"orgchart","valid":false,"problems":[{"line":3,"severity":"error","c…  | Pass |
| J29 | mindmap self branch | POST /api/render "diagram mindmap "x"\nroot a "A"\nbranch a -> a" | 200 or 422, never 500; SVG valid | 200 {"notation":"mindmap","valid":false,"problems":[{"line":3,"severity":"error","co…  | Pass |
| J30 | epc cycle | POST /api/render "diagram epc "x"\nevent e1 "E"\nfunction f1 "F"\nfl…" | 200 or 422, never 500; SVG valid | 200 {"notation":"epc","valid":true,"problems":[],"svg":…http://www.w3.org/2000/svg\"…  | Pass |
| J31 | bpmn cycle + self loop | POST /api/render "diagram bpmn "x"\ntask a "A"\ntask b "B"\nflow a -…" | 200 or 422, never 500; SVG valid | 200 {"notation":"bpmn","valid":false,"problems":[{"line":1,"severity":"error","code"…  | Pass |
| J32 | uml class inheritance cycle | POST /api/render "diagram uml class "x"\nclass A\nclass B\nA --\|> B\…" | 200 or 422, never 500; SVG valid | 200 {"notation":"uml-class","valid":false,"problems":[{"line":4,"severity":"error","…  | Pass |
| J33 | uml package contains cycle | POST /api/render "diagram uml package "x"\npackage a\npackage b\ncon…" | 200 or 422, never 500; SVG valid | 200 {"notation":"uml-package","valid":false,"problems":[{"line":4,"severity":"error"…  | Pass |
| J34 | uml state cycle without initial | POST /api/render "diagram uml state "x"\nstate a\nstate b\ntransitio…" | 200 or 422, never 500; SVG valid | 200 {"notation":"uml-state","valid":false,"problems":[{"line":1,"severity":"error","…  | Pass |
| J35 | c4 self relation | POST /api/render "diagram c4 "x"\nsystem s "S"\nuses s -> s "self"" | 200 or 422, never 500; SVG valid | 200 {"notation":"c4","valid":false,"problems":[{"line":3,"severity":"error","code":"…  | Pass |
| J36 | network self link | POST /api/render "diagram network "x"\nrouter r\nlink r -> r" | 200 or 422, never 500; SVG valid | 200 {"notation":"network","valid":false,"problems":[{"line":3,"severity":"error","co…  | Pass |
| J37 | idef3 loop | POST /api/render "diagram idef3 "x"\nuob a "A"\nuob b "B"\nprecedenc…" | 200 or 422, never 500; SVG valid | 200 {"notation":"idef3","valid":false,"problems":[{"line":1,"severity":"error","code…  | Pass |
| J38 | dfd self flow | POST /api/render "diagram dfd "x"\nprocess p "P"\nflow p -> p" | 200 or 422, never 500; SVG valid | 200 {"notation":"dfd","valid":false,"problems":[{"line":3,"severity":"warning","code…  | Pass |
| J39 | duplicate ids and edges | POST /api/render "diagram graph "x"\nvertex A\nvertex A\nedge A -- A…" | 200 or 422, never 500; SVG valid | 200 {"notation":"graph","valid":false,"problems":[{"line":1,"severity":"info","code"…  | Pass |
| J40 | uml activity self flow | POST /api/render "diagram uml activity "x"\nstart s\naction a "A"\nf…" | 200 or 422, never 500; SVG valid | 200 {"notation":"uml-activity","valid":false,"problems":[{"line":1,"severity":"error…  | Pass |

## G. Concurrency and slow clients

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| G01 | 50 simultaneous renders of different notations | 50 x POST /api/render in parallel | all 200, total < 5 s | 50/50 x 200, total 1195 ms, max 1177 ms | Pass |
| G02 | 50 simultaneous identical renders give identical results | 50 x POST /api/render bpmn | one distinct response body | 1 distinct | Pass |
| G03 | 50 mixed requests in parallel (ok, error, static, 405, 404) | mix | only 200/400/404/405 | statuses: 200,400,405,404 | Pass |
| G04 | 50 simultaneous renders of a 150-node graph | 50 x heavy POST | all 200, total < 15 s | 40/50 x 200, total 60228 ms | **Fail** |
| G05 | a light request while 5 heavy renders run (event-loop blocking) | GET /api/grammar during 5 x 400-node renders | answers < 1 s | probe 20037 ms, heavy: 16156/19607/23550/26562/28871 ms (Rendering is synchronous on the single Node thread, so heavy requests delay all clients) | **Fail** |
| G06 | slow client: header sent, then 1 body byte per second for 15 s | raw slow POST | server ends the connection by itself within ~15 s (body timeout) | closed after 16687 ms (by the client, server never gave up), response: none (Node defaults: requestTimeout 300 s; a slow client can hold a socket for 5 minutes) | **Fail** |
| G07 | request headers never finished | raw: partial header, 8 s wait | server closes (headersTimeout) or 408 within 8 s | timeout after 8208 ms, status 0 (Node default headersTimeout is 60 s) | **Fail** |
| G08 | 100 idle open connections do not block new requests | 100 idle sockets + GET | 200 | 100 open, probe 200 76 ms | Pass |
| G09 | HTTP pipelining: two requests in one write | raw | two 200 responses | 2 x 200 | Pass |
| G10 | server alive after all load tests | GET /api/grammar | 200 | 200 | Pass |

## H. Security headers

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| H01 | static HTML page | GET / | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 200 missing: none | Pass |
| H02 | static JS | GET /js/script.js | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 200 missing: none | Pass |
| H03 | static CSS | GET /css/editor.css | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 200 missing: none | Pass |
| H04 | 404 page | GET /no-such-file | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 404 missing: none | Pass |
| H05 | API GET /api/notations | GET /api/notations | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 200 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | **Fail** |
| H06 | API GET /api/grammar | GET /api/grammar | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 200 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | **Fail** |
| H07 | API 404 | POST /api/zzz | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 404 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | **Fail** |
| H08 | API 400 | POST /api/render | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 400 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | **Fail** |
| H09 | API 405 | GET /api/render | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 405 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | **Fail** |
| H10 | API 413 | POST /api/render | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 413 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | **Fail** |
| H11 | API 422 | POST /api/render | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 200 missing: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | **Fail** |
| H12 | static 405 | POST / | all of: content-security-policy, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, cross-origin-opener-policy | 405 missing: none | Pass |
| H13 | CSP forbids inline scripts, plugins and framing | GET / | script-src 'self' (no unsafe-inline), object-src 'none', frame-ancestors 'none' | default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://kroki.io; manifest-src 'self'; worker-src 'self'; objec | Pass |
| H14 | CSP style-src has 'unsafe-inline' | GET / | no unsafe-inline in style-src |  style-src 'self' 'unsafe-inline' (Observation (not counted): documented trade-off in server.js (SVG carries style attributes); low risk) | Pass |
| H15 | Strict-Transport-Security | GET / | not applicable on plain http://localhost | - (must be sent by the real HTTPS host) | Pass |
| H16 | Server / X-Powered-By not disclosed | GET / | no X-Powered-By, no version in Server | server=- x-powered-by=- | Pass |
| H17 | Cache-Control on API responses | GET /api/notations | no-store | no-store | Pass |
| H18 | Cross-Origin-Resource-Policy | GET / | CORP present (informational) | corp=- (Informational) | Pass |

## I. Static server and paths

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| I01 | traversal: ../ in path | GET /../package.json | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I02 | traversal: ../../ deep | GET /../../../../../../etc/passwd | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I03 | traversal: %2e%2e/ | GET /%2e%2e/package.json | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I04 | traversal: %2e%2e%2f | GET /%2e%2e%2fpackage.json | no content from outside site/; 400/403/404 | 403 1240 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I05 | traversal: double encoded | GET /%252e%252e/package.json | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I06 | traversal: ..%5c backslash | GET /..%5cpackage.json | no content from outside site/; 400/403/404 | 403 1240 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I07 | traversal: ..\ literal backslash | GET /..\package.json | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I08 | traversal: null byte %00 | GET /index.html%00.png | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I09 | traversal: null byte before ../ | GET /%00/../../package.json | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I10 | traversal: windows drive path | GET /C:/Windows/win.ini | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I11 | traversal: windows drive path encoded | GET /C%3A/Windows/win.ini | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I12 | traversal: UNC path | GET //localhost/c$/windows/win.ini | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I13 | traversal: dots and slashes mix | GET /js/../../package.json | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I14 | traversal: overlong utf-8 .. | GET /%c0%ae%c0%ae/package.json | no content from outside site/; 400/403/404 | 400 1191 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I15 | traversal: absolute URL form | GET http://localhost/../package.json | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I16 | traversal: sibling dir with the same prefix | GET /../site-secret/x | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I17 | traversal: NTFS stream ::$DATA | GET /index.html::$DATA | no content from outside site/; 400/403/404 | 200 5f4e <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I18 | traversal: 8.3 short name | GET /PROGRA~1/x | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I19 | traversal: /etc/passwd | GET /etc/passwd | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I20 | traversal: semicolon param | GET /..;/package.json | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I21 | traversal: %2e%2e%5c | GET /%2e%2e%5cpackage.json | no content from outside site/; 400/403/404 | 403 1240 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I22 | traversal: tools dir via .. | GET /../tools/server.js | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I23 | traversal: .git via .. | GET /../.git/config | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I24 | traversal: dotfile .git inside site | GET /.git/config | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I25 | traversal: dotfile .env | GET /.env | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I25b | traversal: NTFS alternate stream of a script | GET /js/script.js::$DATA | no content from outside site/; 400/403/404 | 200 b54 import { initAccordion } from './components/accordion.js… | Pass |
| I25c | traversal: device name CON | GET /CON | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I25d | traversal: device name NUL.html | GET /NUL.html | no content from outside site/; 400/403/404 | 404 10a5 <!doctype html> <html lang="ru"> <head> <meta charset="… | Pass |
| I27 | malformed percent-encoding | GET /% | 400 | 400 | Pass |
| I28 | malformed percent-encoding %zz | GET /%zz | 400 | 400 | Pass |
| I29 | truncated UTF-8 sequence | GET /%E0%A4%A | 400 | 400 | Pass |
| I30 | URL of 10000 chars | GET /aaaa… | 404 / 414 | 404 | Pass |
| I31 | URL of 100000 chars (above Node header limit 16 KB) | GET /aaaa…(100k) | 414/431/400 or connection closed; server alive afterwards | no response (ECONNRESET) | Pass |
| I32 | header over 16 KB | GET with 20 KB header | 431 or closed | 431 | Pass |
| I33 | huge Accept header (13 KB), static page | GET /index.html large Accept | 200 | 200 | Pass |
| I34 | huge Accept header on API (15 KB) | POST /api/render large Accept | 200 or 431 | 200 | Pass |
| I35 | Accept: image/svg+xml;q=0 (explicitly refused) | Accept: application/json, image/svg+xml;q=0 | JSON (svg refused with q=0) | image/svg+xml; charset=utf-8 (Server matches the substring and ignores q-values) | **Fail** |
| I36 | Accept: text/html only | Accept: text/html | 200 JSON or 406 | 200 application/json; charset=utf-8 | Pass |
| I37-HEAD | static HEAD /index.html | HEAD /index.html | 200 empty body | 200 allow=- | Pass |
| I37-OPTIONS | static OPTIONS /index.html | OPTIONS /index.html | 405 + Allow | 405 allow=GET, HEAD | Pass |
| I37-PUT | static PUT /index.html | PUT /index.html | 405 + Allow | 405 allow=GET, HEAD | Pass |
| I37-DELETE | static DELETE /index.html | DELETE /index.html | 405 + Allow | 405 allow=GET, HEAD | Pass |
| I37-POST | static POST /index.html | POST /index.html | 405 + Allow | 405 allow=GET, HEAD | Pass |
| I37-PATCH | static PATCH /index.html | PATCH /index.html | 405 + Allow | 405 allow=GET, HEAD | Pass |
| I37-TRACE | static TRACE /index.html | TRACE /index.html | 405 + Allow | 405 allow=GET, HEAD | Pass |
| I38 | OPTIONS on a static page | OPTIONS /index.html | 204/200 + Allow (RFC 9110 9.3.7) | 405 allow=GET, HEAD (Minor: 405 for OPTIONS is legal but unusual) | **Fail** |
| I39 | 404 page is the HTML page from site/errors | GET /no-such-page | 404 text/html with page | 404 text/html; charset=utf-8  Ошибка 404: страница не найдена — DSLKit Перейти к основном… | Pass |
| I40 | 404 for a missing image | GET /no-such-file.png | 404 | 404 | Pass |
| I41 | 405 page is HTML | POST /index.html | 405 HTML page | 405 text/html; charset=utf-8 | Pass |
| I42 | 400 page is HTML | GET /% | 400 HTML page (site/errors/400.html exists) | 400 text/html; charset=utf-8 | Pass |
| I42b | 403 for path outside the root: error page exists | GET /../package.json (raw) | 403 or 404 HTML | 404 | Pass |
| I43-400 | error page 400.html opens | GET /errors/400.html | 200 HTML | 200 len=3903 | Pass |
| I44-400 | error page 400 has no inline script/handler (CSP) | GET /errors/400.html | none | none | Pass |
| I43-403 | error page 403.html opens | GET /errors/403.html | 200 HTML | 200 len=4092 | Pass |
| I44-403 | error page 403 has no inline script/handler (CSP) | GET /errors/403.html | none | none | Pass |
| I43-404 | error page 404.html opens | GET /errors/404.html | 200 HTML | 200 len=3731 | Pass |
| I44-404 | error page 404 has no inline script/handler (CSP) | GET /errors/404.html | none | none | Pass |
| I43-405 | error page 405.html opens | GET /errors/405.html | 200 HTML | 200 len=4252 | Pass |
| I44-405 | error page 405 has no inline script/handler (CSP) | GET /errors/405.html | none | none | Pass |
| I43-500 | error page 500.html opens | GET /errors/500.html | 200 HTML | 200 len=3951 | Pass |
| I44-500 | error page 500 has no inline script/handler (CSP) | GET /errors/500.html | none | none | Pass |
| I45 | directory without index.html | GET /errors/ | 403/404, no listing | 404  Ошибка 404: страница не найдена — DSLKit Перейти к основном… | Pass |
| I46 | directory without trailing slash | GET /js | 301/403/404, no listing | 404 | Pass |
| I47 | conditional GET gives 304 with empty body | GET /index.html If-None-Match: <etag> | 304 | 304 body=0 | Pass |
| I48 | If-None-Match: * (RFC 9110: matches any current representation) | GET /index.html INM: * | 304 | 200 (Minor: wildcard and ETag lists are not handled) | **Fail** |
| I49 | If-None-Match with a list of ETags | GET /index.html INM: a, etag | 304 | 200 (Minor) | **Fail** |
| I50 | Range request | GET /index.html Range: bytes=0-9 | 206 or 200 (full) | 200 | Pass |
| I51 | query string on a static page | GET /index.html?x=1 | 200 | 200 | Pass |
| I52 | upper-case path of an existing file | GET /INDEX.HTML | 404 on a case-sensitive host; 200 on Windows FS (informational) | 200 (Informational: 200. The Windows file system is case-insensitive, so URLs are too) | Pass |
| I53 | trailing slash after a file | GET /index.html/ | 404 | 200 | **Fail** |
| I54 | trailing encoded space (Windows strips) | GET /index.html%20 | 404 | 404 (Windows file API trims trailing spaces and dots) | Pass |
| I55 | trailing dot (Windows strips) | GET /index.html. | 404 | 404 (Windows file API trims trailing dots) | Pass |
| I56 | js served as text/javascript | GET /js/script.js | text/javascript | text/javascript; charset=utf-8 | Pass |
| I57 | MIME type of /favicon.ico | GET /favicon.ico | 404 or correct type (image/) | 404 text/html; charset=utf-8 (TYPES table lacks .ico/.webmanifest/.woff2/.webp/.jpg/.gif: they would go as application/octet-stream) | Pass |
| I57b | MIME type of /manifest.webmanifest | GET /manifest.webmanifest | 404 or correct type (manifest) | 200 application/octet-stream (TYPES table lacks .ico/.webmanifest/.woff2/.webp/.jpg/.gif: they would go as application/octet-stream) | **Fail** |
| I57c | MIME type of /fonts/x.woff2 | GET /fonts/x.woff2 | 404 or correct type (font) | 404 text/html; charset=utf-8 (TYPES table lacks .ico/.webmanifest/.woff2/.webp/.jpg/.gif: they would go as application/octet-stream) | Pass |
| I59 | root with empty query | GET /? | 200 | 200 | Pass |
| I60 | /api?x=1 routed to API | GET /api?x=1 | 404 JSON | 404 application/json; charset=utf-8 | Pass |
| I61 | encoded slash /api%2Fnotations | GET /api%2Fnotations | 404 | 404 | Pass |
| I62 | upper-case /API/notations | GET /API/notations | 404 | 404 | Pass |
| I63 | /api/../index.html is answered (not left hanging) | GET /api/../index.html (raw) | any answer within 4 s (200/404) | no answer in 5168 ms (timeout) (server.js calls handleApi() and returns without checking its false result; the request is never answered) | **Fail** |
| I63b | /api/%2e%2e/index.html is answered | GET /api/%2e%2e/index.html (raw) | any answer within 4 s | no answer in 5138 ms (same cause as I63) | **Fail** |
| I64 | double slash //api/notations | GET //api/notations | no crash | 404 | Pass |
| I65 | Content-Length + Transfer-Encoding together | raw | 400 (Node rejects) or consistent | 400 close | Pass |
| I66 | garbage request line | raw GARBAGE | 400 from Node | 400 | Pass |
| I68 | HTTP/1.1 without Host | raw | 400 (RFC 9112 3.2) | 400 (Node (default) answers 400 only when requireHostHeader is on; informational) | Pass |
| I69 | compression of large JSON | GET /api/notations Accept-Encoding: gzip | Content-Encoding: gzip (informational) | encoding=- size=7937 (Informational: responses are not compressed) | Pass |
| I70 | server alive after all static tests | GET /api/grammar | 200 | 200 | Pass |

## K. Engines, external languages, body limit

| ID | Проверка | Запрос | Ожидание | Факт | Результат |
|---|---|---|---|---|---|
| K01 | GET /api/engines | GET /api/engines | 200 JSON, own.notations = 33, external list | 200 own={"id":"dslkit","endpoint":"/api/render","notations":33} external=24 | Pass |
| K02 | every external endpoint is exactly /api/external/<id> | GET /api/engines | endpoint === "/api/external/" + id for all | 0 mismatches | Pass |
| K03 | engines ids are unique | GET /api/engines | no duplicates | 24 of 24 | Pass |
| K04-POST | POST /api/engines | POST /api/engines | 405 with Allow | 405 allow=GET | Pass |
| K04-PUT | PUT /api/engines | PUT /api/engines | 405 with Allow | 405 allow=GET | Pass |
| K04-DELETE | DELETE /api/engines | DELETE /api/engines | 405 with Allow | 405 allow=GET | Pass |
| K04-PATCH | PATCH /api/engines | PATCH /api/engines | 405 with Allow | 405 allow=GET | Pass |
| K04-OPTIONS | OPTIONS /api/engines | OPTIONS /api/engines | 405 with Allow | 405 allow=GET | Pass |
| K04-HEAD | HEAD /api/engines | HEAD /api/engines | 200 empty body | 405 allow=GET | **Fail** |
| K04-TRACE | TRACE /api/engines | TRACE /api/engines | 405 with Allow | 405 allow=GET | Pass |
| K05-/api/engines/ | variant path /api/engines/ | GET /api/engines/ | 404 JSON | 404 application/json; charset=utf-8 | Pass |
| K05-/api/engines/x | variant path /api/engines/x | GET /api/engines/x | 404 JSON | 404 application/json; charset=utf-8 | Pass |
| K05-/api/ENGINES | variant path /api/ENGINES | GET /api/ENGINES | 404 JSON | 404 application/json; charset=utf-8 | Pass |
| K05-/api/engines?x=1 | variant path /api/engines?x=1 | GET /api/engines?x=1 | 200 | 200 application/json; charset=utf-8 | Pass |
| K05-/api/engines%00 | variant path /api/engines%00 | GET /api/engines%00 | 404 JSON | 404 application/json; charset=utf-8 | Pass |
| K06 | security headers on /api/engines | GET /api/engines | CSP and nosniff present | csp=no nosniff=no (Same defect as H05: API answers carry no security headers) | **Fail** |
| K10 | GET on external endpoint | GET /api/external/graphviz | 405 Allow: POST | 405 allow=POST | Pass |
| K11-nope | unknown language "nope" | POST /api/external/nope | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language nope"}} | Pass |
| K11-empty | unknown language "" | POST /api/external/ | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language "}} | Pass |
| K11-GRAPHVIZ | unknown language "GRAPHVIZ" | POST /api/external/GRAPHVIZ | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language GRAPHVIZ"}} | Pass |
| K11-graphviz/ | unknown language "graphviz/" | POST /api/external/graphviz/ | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language graphviz/"}} | Pass |
| K11-graphviz/svg | unknown language "graphviz/svg" | POST /api/external/graphviz/svg | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language graphviz/svg"… | Pass |
| K11-__proto__ | unknown language "__proto__" | POST /api/external/__proto__ | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language __proto__"}} | Pass |
| K11-constructor | unknown language "constructor" | POST /api/external/constructor | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language constructor"}… | Pass |
| K11-toString | unknown language "toString" | POST /api/external/toString | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language toString"}} | Pass |
| K11-graphviz%00 | unknown language "graphviz%00" | POST /api/external/graphviz%00 | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language graphviz%00"}… | Pass |
| K11-..%2fengines | unknown language "..%2fengines" | POST /api/external/..%2fengines | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language ..%2fengines"… | Pass |
| K11-../engines | unknown language "../engines" | POST /api/external/../engines | 404 JSON, nothing sent to upstream | 405 {"error":{"code":"method","message":"Use GET"}} (the URL parser folds ../ into /api/engines; GET-only answer 405 is correct) | Pass |
| K11-http:%2f%2fevil.exam | unknown language "http:%2f%2fevil.example" | POST /api/external/http:%2f%2fevil.example | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language http:%2f%2fev… | Pass |
| K11-%67raphviz | unknown language "%67raphviz" | POST /api/external/%67raphviz | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language %67raphviz"}} | Pass |
| K11-graphviz%20 | unknown language "graphviz%20" | POST /api/external/graphviz%20 | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language graphviz%20"}… | Pass |
| K11-aaaaaaaaaaaaaaaaaaaa | unknown language "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" | POST /api/external/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 404 JSON, nothing sent to upstream | 404 {"error":{"code":"not-found","message":"Unknown language aaaaaaaaaaaaa… | Pass |
| K12 | unknown language never reached the upstream | mock log | no request to a path other than /<known>/svg | 0 strange requests: - | Pass |
| K13-PUT | PUT on external endpoint | PUT /api/external/graphviz | 405 Allow: POST | 405 allow=POST | Pass |
| K13-DELETE | DELETE on external endpoint | DELETE /api/external/graphviz | 405 Allow: POST | 405 allow=POST | Pass |
| K13-PATCH | PATCH on external endpoint | PATCH /api/external/graphviz | 405 Allow: POST | 405 allow=POST | Pass |
| K13-OPTIONS | OPTIONS on external endpoint | OPTIONS /api/external/graphviz | 405 Allow: POST | 405 allow=POST | Pass |
| K13-HEAD | HEAD on external endpoint | HEAD /api/external/graphviz | 405 Allow: POST | 405 allow=POST | Pass |
| K13-TRACE | TRACE on external endpoint | TRACE /api/external/graphviz | 405 Allow: POST | 405 allow=POST | Pass |
| K14 | unknown language is checked before the body is read | POST /api/external/doesnotexist body "{" | 404 (not 400) | 404 | Pass |
| K20 | valid request is proxied | POST /api/external/graphviz {source:"ok"} | 200 image/svg+xml, valid SVG | 200 image/svg+xml; charset=utf-8 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>g… issues=none | Pass |
| K21 | upstream receives POST /graphviz/svg as text/plain with the source | mock log | POST /graphviz/svg text/plain, len 2 | {"url":"/graphviz/svg","method":"POST","type":"text/plain","len":2} | Pass |
| K22-graphviz | every language is routed: graphviz | POST /api/external/graphviz | 200, upstream path /graphviz/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-mermaid | every language is routed: mermaid | POST /api/external/mermaid | 200, upstream path /mermaid/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-plantuml | every language is routed: plantuml | POST /api/external/plantuml | 200, upstream path /plantuml/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-c4plantuml | every language is routed: c4plantuml | POST /api/external/c4plantuml | 200, upstream path /c4plantuml/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-d2 | every language is routed: d2 | POST /api/external/d2 | 200, upstream path /d2/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-nomnoml | every language is routed: nomnoml | POST /api/external/nomnoml | 200, upstream path /nomnoml/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-ditaa | every language is routed: ditaa | POST /api/external/ditaa | 200, upstream path /ditaa/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-svgbob | every language is routed: svgbob | POST /api/external/svgbob | 200, upstream path /svgbob/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-blockdiag | every language is routed: blockdiag | POST /api/external/blockdiag | 200, upstream path /blockdiag/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-seqdiag | every language is routed: seqdiag | POST /api/external/seqdiag | 200, upstream path /seqdiag/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-actdiag | every language is routed: actdiag | POST /api/external/actdiag | 200, upstream path /actdiag/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-nwdiag | every language is routed: nwdiag | POST /api/external/nwdiag | 200, upstream path /nwdiag/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-packetdiag | every language is routed: packetdiag | POST /api/external/packetdiag | 200, upstream path /packetdiag/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-rackdiag | every language is routed: rackdiag | POST /api/external/rackdiag | 200, upstream path /rackdiag/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-bytefield | every language is routed: bytefield | POST /api/external/bytefield | 200, upstream path /bytefield/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-erd | every language is routed: erd | POST /api/external/erd | 200, upstream path /erd/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-pikchr | every language is routed: pikchr | POST /api/external/pikchr | 200, upstream path /pikchr/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-structurizr | every language is routed: structurizr | POST /api/external/structurizr | 200, upstream path /structurizr/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-vega | every language is routed: vega | POST /api/external/vega | 200, upstream path /vega/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-vegalite | every language is routed: vegalite | POST /api/external/vegalite | 200, upstream path /vegalite/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-wavedrom | every language is routed: wavedrom | POST /api/external/wavedrom | 200, upstream path /wavedrom/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-dbml | every language is routed: dbml | POST /api/external/dbml | 200, upstream path /dbml/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-excalidraw | every language is routed: excalidraw | POST /api/external/excalidraw | 200, upstream path /excalidraw/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K22-bpmn | every language is routed: bpmn | POST /api/external/bpmn | 200, upstream path /bpmn/svg | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K23 | text/plain body accepted | POST text/plain "ok" | 200 | 200 | Pass |
| K30 | external: empty body | POST /api/external/graphviz  | 400 | 400 {"error":{"code":"json","message":"The body is not valid JSON"}} | Pass |
| K31 | external: broken JSON | POST /api/external/graphviz { | 400 | 400 {"error":{"code":"json","message":"The body is not valid JSON"}} | Pass |
| K32 | external: JSON null | POST /api/external/graphviz null | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| K33 | external: JSON array | POST /api/external/graphviz ["x"] | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| K34 | external: source number | POST /api/external/graphviz {"source":5} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| K35 | external: source null | POST /api/external/graphviz {"source":null} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| K36 | external: source object | POST /api/external/graphviz {"source":{"a":1}} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| K37 | external: source spaces only | POST /api/external/graphviz {"source":"   "} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| K38 | external: source empty | POST /api/external/graphviz {"source":""} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| K39 | external: no source | POST /api/external/graphviz {} | 400 | 400 {"error":{"code":"source","message":"The \"source\" text is required"}… | Pass |
| K40 | external: __proto__ source is not inherited | POST {"__proto__":{"source":"x"}} | 400 | 400 | Pass |
| K41 | external: NUL character in source | POST source "a\u0000b" | 200 or 4xx, not 500 | 200 | Pass |
| K42 | external: unicode, emoji, CRLF | POST unicode source | 200 | 200 | Pass |
| K50 | external: source of 1 characters | POST /api/external/graphviz (1 chars) | 200 | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K51 | external: source of 99999 characters | POST /api/external/graphviz (99999 chars) | 200 | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K52 | external: source of 100000 characters | POST /api/external/graphviz (100000 chars) | 200 | 200 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="1… | Pass |
| K53 | external: source of 100001 characters | POST /api/external/graphviz (100001 chars) | 413 | 413 {"error":{"code":"too-large","message":"The source is longer… | Pass |
| K54 | external: 100000 Cyrillic characters (200000 bytes) | POST source 100000 x "я" | 200 (length is at the limit) | 200 | Pass |
| K55 | external: 100000 newlines (escaped as 200000 bytes in JSON) | POST source 100000 x \n | at the limit but blank: 400 (only whitespace) | 400 | Pass |
| K56 | external: 100000 chars with 50000 newlines | POST | 200 | 200 | Pass |
| K57 | external: 100000 control chars (JSON escape = 6 bytes each, 600 KB body) | POST source 100000 x \u0001 | 200 (exactly at the limit) | 200 | Pass |
| K60 | text/plain 100000 bytes | POST /api/validate 100000 x "x" | 200 | 200 | Pass |
| K61 | text/plain 100001 characters | POST /api/validate 100001 x "x" | 413 (source longer than 100000) | 413 | Pass |
| K62 | text/plain 601024 bytes (body limit) | POST 601024 bytes | 413 (source too long) | 413 | Pass |
| K63 | text/plain 601025 bytes (limit + 1) | POST 601025 bytes | 413 | 413 | Pass |
| K64 | text/plain 5 MB | POST 5 MB | 413 | 413 | Pass |
| K65 | JSON: 100000 chars each escaped to 6 bytes (body 600013 bytes) | POST /api/validate | 200 (source is at the limit) | 200 {"notation":"idef0","valid":false,"problems":[{"line":1,"sev… | Pass |
| K66 | JSON: 100001 escaped chars (body 600019 bytes) | POST /api/validate | 413 | 413 | Pass |
| K67 | JSON with a valid short source but 700 KB of extra field | POST /api/validate | 413 (body over limit) is acceptable; 200 would also be fine | 413 | Pass |
| K68 | JSON with a short source and 400 KB of extra field (below body limit) | POST /api/validate | 200 | 200 | Pass |
| K69 | JSON nested 300000 deep (600 KB) | POST /api/validate | 200, 400 or 413; server stays alive | 200 | Pass |
| K70 | external: body over limit | POST /api/external/graphviz 601025 bytes | 413 | 413 | Pass |
| K71 | 50 parallel requests with 600 KB bodies (30 MB in flight) | 50 x POST /api/validate 600 KB | all 200 within 20 s | 50/50 x 200 in 1559 ms | Pass |
| K80 | upstream SVG with <script>/on*/javascript: is forwarded as is | mock returns hostile SVG | response must be sanitised or served so it cannot run (no <script>, no on*) | 200 image/svg+xml; charset=utf-8 issues=<script>;on*-attribute;javascript: in attribute nosniff=- csp=- (The server relays the SVG unchanged and sends no CSP/sandbox; opened directly in a tab it runs the script on the DSLKit origin. The editor cleans the SVG on the) | **Fail** |
| K81 | upstream returns HTML | mock returns text/html | 502 upstream-invalid | 502 {"error":{"code":"upstream-invalid","message":"The drawing service did not retur… | Pass |
| K82 | upstream returns an empty body | mock returns "" | 502 | 502 | Pass |
| K83 | upstream 400 (syntax error) maps to 422 | mock 400 | 422 with code upstream-error | 422 {"error":{"code":"upstream-error","message":"The drawing service answered 400"}} | Pass |
| K84 | upstream 404 | mock 404 | 502 | 502 | Pass |
| K85 | upstream 500 | mock 500 | 502 | 502 | Pass |
| K86 | upstream error text is not echoed | mock 400 "syntax error" | the response carries a message but the compiler error is lost | {"error":{"code":"upstream-error","message":"The drawing service answered 500"}} (Informational: with 422 the user gets no line/column of the upstream syntax error) | Pass |
| K87 | upstream SVG with <?xml> and DOCTYPE prolog is accepted | mock prolog | 200 | 200 | Pass |
| K88 | upstream never answers: timeout | mock hangs | 504 upstream-timeout after about 10 s | 504 after 10054 ms {"error":{"code":"upstream-timeout","message":"The drawing s… | Pass |
| K89b | server process survives an upstream that stalls mid-body | same request as K89 | server keeps running | server process exited (code null): unhandled TimeoutError from answer.text() (In render-api.js the call is 'return external(...)' inside try without await, so the rejection is not caught by the catch, and server.js does not catch the prom) | **Fail** |
| K89 | upstream sends headers but never finishes the body | mock sends part of the body and stalls | 504/502 within about 10 s (timeout covers the body) | no response (ECONNRESET) after 10464 ms (AbortSignal.timeout also aborts answer.text() in modern Node, so the request is cut) | **Fail** |
| K90 | upstream returns 100 MB of SVG | mock 100 MB | refused (502/413) - memory of the server must be bounded | 200 100 MB in 6900 ms (answer.text() buffers the whole upstream body; there is no size limit on what is relayed to the client) | **Fail** |
| K91 | 20 parallel requests to a hanging upstream do not block the server | 20 x hang | all 504 in about 10 s, other requests still answered | 20/20 x 504 in 10547 ms, probe 200 | Pass |
| K92 | Accept: application/json on a SVG-only endpoint | Accept: application/json | 200 SVG or 406 | 200 image/svg+xml; charset=utf-8 | Pass |
| K93 | external answer headers | POST /api/external/graphviz | Cache-Control: no-store, nosniff, CSP | cache=no-store nosniff=- csp=- (No-store is set, security headers are not) | **Fail** |
| K94 | external: cross-origin simple request (text/plain) is processed | POST text/plain with Origin: evil.example | no ACAO header; the call costs only a proxy hop | 200 ACAO=- (Any web page can make a visitor browser send diagrams to the server (open proxy for Kroki), no cookies involved) | Pass |
| K95 | default upstream is the public https://kroki.io (privacy) | source of render-api.js | user diagrams leave the server only on explicit /api/external/* calls | krokiUrl default = process.env.KROKI_URL ?? "https://kroki.io" (Informational: diagram text is sent to a third party unless KROKI_URL is set; CSP connect-src also allows https://kroki.io) | Pass |
