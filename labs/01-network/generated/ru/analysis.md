#### 3.3.1 Сводка загрузки

Таблица 1 – Сводные показатели загрузки страницы

| Показатель | Значение |
|---|---|
| Запросов | 17 |
| Передано, МБ | 6.37 |
| Протокол документа | HTTP/2.0 |
| DOMContentLoaded, мс | 3408 |
| onLoad, мс | 4393 |

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
| `priority` | u=0, i | Приоритет загрузки ресурса (HTTP/2, HTTP/3) |
| `sec-ch-ua` | "Not:A-Brand";v="8", "Chromium";v="156", "HeadlessChrome";v="156" | Название и версия браузера (Client Hints) |
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
| `age` | 340 | Сколько секунд ответ пролежал в кэше CDN или прокси |
| `cache-control` | public, max-age=600 | Правила кэширования ресурса |
| `cf-cache-status` | DYNAMIC | Статус кэша Cloudflare (HIT, MISS) |
| `cf-ray` | a4909c8d8b81508e-WAW | Идентификатор запроса в сети Cloudflare |
| `content-encoding` | br | Применённое сжатие тела ответа |
| `content-security-policy` | default-src 'self'; script-src https://www.dropbox.com https://api.trello.com... | Разрешённые источники ресурсов страницы (защита от XSS) |
| `content-type` | text/html | Тип и кодировка содержимого |
| `date` | Sun, 11 Oct 2026 20:28:29 GMT | Время формирования ответа сервером |
| `expires` | Sun, 11 Oct 2026 20:32:49 GMT | Дата, после которой ответ считается устаревшим |
| `permissions-policy` | microphone=() | Доступ страницы к функциям браузера (камера, геолокация) |
| `referrer-policy` | strict-origin | Какую часть адреса отправлять в Referer |
| `server` | cloudflare | Программное обеспечение сервера или CDN |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Требует открывать сайт только по HTTPS (HSTS) |
| `vary` | accept-encoding | От каких заголовков запроса зависит кэшированный ответ |
| `x-cloud-trace-context` | 5ef89efa3007bd5c0781a36430c141df | Идентификатор трассировки запроса в Google Cloud |
| `x-content-type-options` | nosniff | Запрет угадывания типа содержимого (nosniff) |
| `x-xss-protection` | 1; mode=block | Устаревший фильтр XSS в браузере |

Таблица 6 – Фазы запроса по вкладке Timing

| Фаза | Время |
|---|---|
| Queued/Stalled | — |
| DNS Lookup | 511 мс |
| Initial connection | 48 мс |
| SSL | 32 мс |
| Request sent | 0 мс |
| Waiting (TTFB) | 48 мс |
| Content Download | 4 мс |

Самая долгая фаза: DNS Lookup.

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
| `priority` | u=1 | Приоритет загрузки ресурса (HTTP/2, HTTP/3) |
| `referer` | https://app.diagrams.net/ | Адрес страницы, с которой выполнен запрос |
| `sec-ch-ua` | "Not:A-Brand";v="8", "Chromium";v="156", "HeadlessChrome";v="156" | Название и версия браузера (Client Hints) |
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
| `age` | 0 | Сколько секунд ответ пролежал в кэше CDN или прокси |
| `cache-control` | public, max-age=86400 | Правила кэширования ресурса |
| `cf-cache-status` | HIT | Статус кэша Cloudflare (HIT, MISS) |
| `cf-ray` | a4909c8dfce2508e-WAW | Идентификатор запроса в сети Cloudflare |
| `content-encoding` | br | Применённое сжатие тела ответа |
| `content-type` | text/javascript | Тип и кодировка содержимого |
| `date` | Sun, 11 Oct 2026 20:28:29 GMT | Время формирования ответа сервером |
| `etag` | W/"SyJN0w" | Идентификатор версии ресурса для условных запросов |
| `expires` | Mon, 12 Oct 2026 20:28:29 GMT | Дата, после которой ответ считается устаревшим |
| `referrer-policy` | strict-origin | Какую часть адреса отправлять в Referer |
| `server` | cloudflare | Программное обеспечение сервера или CDN |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Требует открывать сайт только по HTTPS (HSTS) |
| `vary` | accept-encoding | От каких заголовков запроса зависит кэшированный ответ |
| `x-cloud-trace-context` | e456fac535de7f926bc773a79dd11a37 | Идентификатор трассировки запроса в Google Cloud |
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
| Waiting (TTFB) | 26 мс |
| Content Download | 8 мс |

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
| `priority` | u=1, i | Приоритет загрузки ресурса (HTTP/2, HTTP/3) |
| `referer` | https://app.diagrams.net/ | Адрес страницы, с которой выполнен запрос |
| `sec-ch-ua` | "Not:A-Brand";v="8", "Chromium";v="156", "HeadlessChrome";v="156" | Название и версия браузера (Client Hints) |
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
| `age` | 119 | Сколько секунд ответ пролежал в кэше CDN или прокси |
| `cache-control` | public, max-age=2592000 | Правила кэширования ресурса |
| `cf-cache-status` | HIT | Статус кэша Cloudflare (HIT, MISS) |
| `cf-ray` | a4909c946a69508e-WAW | Идентификатор запроса в сети Cloudflare |
| `content-encoding` | br | Применённое сжатие тела ответа |
| `content-type` | text/plain | Тип и кодировка содержимого |
| `date` | Sun, 11 Oct 2026 20:28:30 GMT | Время формирования ответа сервером |
| `etag` | W/"SyJN0w" | Идентификатор версии ресурса для условных запросов |
| `expires` | Wed, 11 Nov 2026 20:28:30 GMT | Дата, после которой ответ считается устаревшим |
| `referrer-policy` | strict-origin | Какую часть адреса отправлять в Referer |
| `server` | cloudflare | Программное обеспечение сервера или CDN |
| `strict-transport-security` | max-age=31536000; includeSubDomains | Требует открывать сайт только по HTTPS (HSTS) |
| `vary` | accept-encoding | От каких заголовков запроса зависит кэшированный ответ |
| `x-cloud-trace-context` | 5b8b613ae9d740fe8c756a3058aeecb6 | Идентификатор трассировки запроса в Google Cloud |
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
| Content Download | 7 мс |

Самая долгая фаза: Waiting (TTFB).

#### 3.3.5 Кэширование

Таблица 15 – Параметры кэширования

| Ресурс | Cache-Control | ETag | Last-Modified | max-age |
|---|---|---|---|---|
| https://app.diagrams.net/ | public, max-age=600 | — | — | 600 |
| https://app.diagrams.net/js/stencils.min.js | public, max-age=2592000 | W/"SyJN0w" | — | 2592000 |

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
| Передано, МБ | 6.37 | 6.37 |
| DOMContentLoaded, мс | 3408 | 1412 |
| onLoad, мс | 4393 | 14565 |
| TTFB документа, мс | 48 | 584 |
