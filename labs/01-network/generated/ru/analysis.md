#### 3.3.1 Сводка загрузки

Таблица 1 – Сводные показатели загрузки страницы

| Показатель | Значение |
|---|---|
| Запросов | 17 |
| Передано, МиБ | 6.40 |
| Протокол документа | HTTP/2.0 |
| DOMContentLoaded, мс | 337 |
| onLoad, мс | 1423 |

Таблица 2 – Количество запросов по типам ресурсов

| Тип ресурса | Запросов |
|---|---|
| script | 8 |
| stylesheet | 3 |
| xhr | 3 |
| image | 2 |
| document | 1 |

#### 3.3.2 Запрос: document, https://app.diagrams.net/

Таблица 3 – Общие сведения о запросе

| Метод | Статус |
|---|---|
| GET | 200 |

Таблица 4 – Заголовки запроса

| Заголовок | Значение | Назначение |
|---|---|---|
| `accept` | text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,im... | Типы контента, которые клиент готов принять |
| `accept-encoding` | gzip, deflate, br, zstd | Поддерживаемые алгоритмы сжатия ответа |
| `accept-language` | en-US,en;q=0.9 | — |
| `cache-control` | no-cache | Правила кэширования ресурса |
| `pragma` | no-cache | — |
| `priority` | u=0, i | Приоритет загрузки ресурса (HTTP/2, HTTP/3) |
| `sec-ch-ua` | "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24" | Название и версия браузера (Client Hints) |
| `sec-ch-ua-mobile` | ?0 | Признак мобильного устройства |
| `sec-ch-ua-platform` | "Windows" | Операционная система клиента |
| `sec-fetch-dest` | document | Назначение запроса (document, script, image) |
| `sec-fetch-mode` | navigate | Режим запроса (navigate, cors, no-cors) |
| `sec-fetch-site` | none | Связь источника запроса с целевым сайтом |
| `sec-fetch-user` | ?1 | Запрос вызван действием пользователя |
| `upgrade-insecure-requests` | 1 | Клиент предпочитает защищённую версию ресурса |
| `user-agent` | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gec... | Идентификация браузера и операционной системы |

Таблица 5 – Заголовки ответа

| Заголовок | Значение | Назначение |
|---|---|---|
| `access-control-allow-origin` | * | Каким источникам разрешён кросс-доменный доступ (CORS) |
| `age` | 1 | Сколько секунд ответ пролежал в кэше CDN или прокси |
| `cache-control` | public, max-age=600 | Правила кэширования ресурса |
| `cf-cache-status` | DYNAMIC | Статус кэша Cloudflare (HIT, MISS) |
| `cf-ray` | a4a9cecadfee2d19-WAW | Идентификатор запроса в сети Cloudflare |
| `content-encoding` | br | Применённое сжатие тела ответа |
| `content-security-policy` | default-src 'self'; script-src https://www.dropbox.com https://api.trello.com... | Разрешённые источники ресурсов страницы (защита от XSS) |
| `content-type` | text/html | Тип и кодировка содержимого |
| `date` | Wed, 14 Oct 2026 21:51:51 GMT | Время формирования ответа сервером |
| `expires` | Wed, 14 Oct 2026 22:01:50 GMT | Дата, после которой ответ считается устаревшим |
| `permissions-policy` | microphone=() | Доступ страницы к функциям браузера (камера, геолокация) |
| `referrer-policy` | strict-origin | Какую часть адреса отправлять в Referer |
| `server` | cloudflare | Программное обеспечение сервера или CDN |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Требует открывать сайт только по HTTPS (HSTS) |
| `x-cloud-trace-context` | f8b2f570d45c3d950f603df4bd6b39d9 | Идентификатор трассировки запроса в Google Cloud |
| `x-content-type-options` | nosniff | Запрет угадывания типа содержимого (nosniff) |
| `x-xss-protection` | 1; mode=block | Устаревший фильтр XSS в браузере |

Таблица 6 – Фазы запроса по вкладке Timing

| Фаза | Время |
|---|---|
| Queued/Stalled | — |
| DNS Lookup | 38 мс |
| Initial connection | 39 мс |
| SSL | 25 мс |
| Request sent | 0 мс |
| Waiting (TTFB) | 81 мс |
| Content Download | 2 мс |

Самая долгая фаза: Waiting (TTFB).

#### 3.3.3 Запрос: script, https://app.diagrams.net/js/bootstrap.js

Таблица 7 – Общие сведения о запросе

| Метод | Статус |
|---|---|
| GET | 200 |

Таблица 8 – Заголовки запроса

| Заголовок | Значение | Назначение |
|---|---|---|
| `accept` | */* | Типы контента, которые клиент готов принять |
| `accept-encoding` | gzip, deflate, br, zstd | Поддерживаемые алгоритмы сжатия ответа |
| `accept-language` | en-US,en;q=0.9 | — |
| `cache-control` | no-cache | Правила кэширования ресурса |
| `pragma` | no-cache | — |
| `priority` | u=1 | Приоритет загрузки ресурса (HTTP/2, HTTP/3) |
| `referer` | https://app.diagrams.net/ | Адрес страницы, с которой выполнен запрос |
| `sec-ch-ua` | "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24" | Название и версия браузера (Client Hints) |
| `sec-ch-ua-mobile` | ?0 | Признак мобильного устройства |
| `sec-ch-ua-platform` | "Windows" | Операционная система клиента |
| `sec-fetch-dest` | script | Назначение запроса (document, script, image) |
| `sec-fetch-mode` | no-cors | Режим запроса (navigate, cors, no-cors) |
| `sec-fetch-site` | same-origin | Связь источника запроса с целевым сайтом |
| `user-agent` | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gec... | Идентификация браузера и операционной системы |

Таблица 9 – Заголовки ответа

| Заголовок | Значение | Назначение |
|---|---|---|
| `access-control-allow-origin` | * | Каким источникам разрешён кросс-доменный доступ (CORS) |
| `age` | 268 | Сколько секунд ответ пролежал в кэше CDN или прокси |
| `cache-control` | public, max-age=86400 | Правила кэширования ресурса |
| `cf-cache-status` | HIT | Статус кэша Cloudflare (HIT, MISS) |
| `cf-ray` | a4a9cecb894f2d19-WAW | Идентификатор запроса в сети Cloudflare |
| `content-encoding` | br | Применённое сжатие тела ответа |
| `content-type` | text/javascript | Тип и кодировка содержимого |
| `date` | Wed, 14 Oct 2026 21:51:51 GMT | Время формирования ответа сервером |
| `etag` | W/"sWt9Ig" | Идентификатор версии ресурса для условных запросов |
| `expires` | Thu, 15 Oct 2026 21:51:51 GMT | Дата, после которой ответ считается устаревшим |
| `referrer-policy` | strict-origin | Какую часть адреса отправлять в Referer |
| `server` | cloudflare | Программное обеспечение сервера или CDN |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Требует открывать сайт только по HTTPS (HSTS) |
| `vary` | accept-encoding | От каких заголовков запроса зависит кэшированный ответ |
| `x-cloud-trace-context` | 4ce5a37ac1ec327aeb976b774fbdd4b2 | Идентификатор трассировки запроса в Google Cloud |
| `x-content-type-options` | nosniff | Запрет угадывания типа содержимого (nosniff) |
| `x-xss-protection` | 1; mode=block | Устаревший фильтр XSS в браузере |

Таблица 10 – Фазы запроса по вкладке Timing

| Фаза | Время |
|---|---|
| Queued/Stalled | — |
| DNS Lookup | — |
| Initial connection | — |
| SSL | — |
| Request sent | 0 мс |
| Waiting (TTFB) | 28 мс |
| Content Download | 10 мс |

Самая долгая фаза: Waiting (TTFB).

#### 3.3.4 Запрос: xhr, https://app.diagrams.net/resources/dia.txt

Таблица 11 – Общие сведения о запросе

| Метод | Статус |
|---|---|
| GET | 200 |

Таблица 12 – Заголовки запроса

| Заголовок | Значение | Назначение |
|---|---|---|
| `accept` | */* | Типы контента, которые клиент готов принять |
| `accept-encoding` | gzip, deflate, br, zstd | Поддерживаемые алгоритмы сжатия ответа |
| `accept-language` | en-US,en;q=0.9 | — |
| `cache-control` | no-cache | Правила кэширования ресурса |
| `pragma` | no-cache | — |
| `priority` | u=1, i | Приоритет загрузки ресурса (HTTP/2, HTTP/3) |
| `referer` | https://app.diagrams.net/ | Адрес страницы, с которой выполнен запрос |
| `sec-ch-ua` | "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24" | Название и версия браузера (Client Hints) |
| `sec-ch-ua-mobile` | ?0 | Признак мобильного устройства |
| `sec-ch-ua-platform` | "Windows" | Операционная система клиента |
| `sec-fetch-dest` | empty | Назначение запроса (document, script, image) |
| `sec-fetch-mode` | cors | Режим запроса (navigate, cors, no-cors) |
| `sec-fetch-site` | same-origin | Связь источника запроса с целевым сайтом |
| `user-agent` | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gec... | Идентификация браузера и операционной системы |

Таблица 13 – Заголовки ответа

| Заголовок | Значение | Назначение |
|---|---|---|
| `access-control-allow-origin` | * | Каким источникам разрешён кросс-доменный доступ (CORS) |
| `age` | 285 | Сколько секунд ответ пролежал в кэше CDN или прокси |
| `cache-control` | public, max-age=2592000 | Правила кэширования ресурса |
| `cf-cache-status` | HIT | Статус кэша Cloudflare (HIT, MISS) |
| `cf-ray` | a4a9ced29c112d19-WAW | Идентификатор запроса в сети Cloudflare |
| `content-encoding` | br | Применённое сжатие тела ответа |
| `content-type` | text/plain | Тип и кодировка содержимого |
| `date` | Wed, 14 Oct 2026 21:51:52 GMT | Время формирования ответа сервером |
| `etag` | W/"sWt9Ig" | Идентификатор версии ресурса для условных запросов |
| `expires` | Sat, 14 Nov 2026 21:51:52 GMT | Дата, после которой ответ считается устаревшим |
| `referrer-policy` | strict-origin | Какую часть адреса отправлять в Referer |
| `server` | cloudflare | Программное обеспечение сервера или CDN |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Требует открывать сайт только по HTTPS (HSTS) |
| `vary` | accept-encoding | От каких заголовков запроса зависит кэшированный ответ |
| `x-cloud-trace-context` | ee94d72a0d25ec88c0f012c96fff1718 | Идентификатор трассировки запроса в Google Cloud |
| `x-content-type-options` | nosniff | Запрет угадывания типа содержимого (nosniff) |
| `x-xss-protection` | 1; mode=block | Устаревший фильтр XSS в браузере |

Таблица 14 – Фазы запроса по вкладке Timing

| Фаза | Время |
|---|---|
| Queued/Stalled | — |
| DNS Lookup | — |
| Initial connection | — |
| SSL | — |
| Request sent | 0 мс |
| Waiting (TTFB) | 24 мс |
| Content Download | 14 мс |

Самая долгая фаза: Waiting (TTFB).

#### 3.3.5 Кэширование

Таблица 15 – Параметры кэширования

| Ресурс | Cache-Control | ETag | Last-Modified | max-age |
|---|---|---|---|---|
| https://app.diagrams.net/ | public, max-age=600 | — | — | 600 |
| https://app.diagrams.net/js/stencils.min.js | public, max-age=2592000 | W/"sWt9Ig" | — | 2592000 |

#### 3.3.6 Безопасность документа

Таблица 16 – Заголовки безопасности основного документа

| Заголовок | Значение |
|---|---|
| `content-security-policy` | default-src 'self'; script-src https://www.dropbox.com https://api.trello.com... |
| `strict-transport-security` | max-age=31536000; includeSubDomains |
| `x-frame-options` | отсутствует |
| `x-content-type-options` | nosniff |

#### 3.3.7 Cookie

Cookie не передавались и не устанавливались.

#### 3.3.8 Сравнение обычной сети и Fast 3G

Таблица 17 – Сравнение показателей загрузки

| Показатель | Обычная сеть | Fast 3G |
|---|---|---|
| Запросов | 17 | 17 |
| Передано, МиБ | 6.40 | 6.40 |
| DOMContentLoaded, мс | 337 | 1508 |
| onLoad, мс | 1423 | 15168 |
| TTFB документа, мс | 81 | 582 |
