# Лабораторная работа №1. Анализ сетевых протоколов и инструменты разработчика

## 1 Цель работы

Получить практические навыки анализа сетевого трафика веб-приложения: изучить структуру HTTP/HTTPS-запросов и ответов, заголовки, коды состояния, кэширование, cookie, безопасность и временные характеристики на примере сайта, близкого по теме к курсовому проекту DSLKit (веб-IDE для диаграмм как кода).

## 2 Краткие теоретические сведения

**Клиент-серверная модель.** Браузер отправляет HTTP-запрос, сервер возвращает ответ. Каждое сообщение состоит из стартовой строки, заголовков и необязательного тела.

**HTTP и HTTPS.** HTTP работает поверх TCP, HTTP/3 поверх QUIC. HTTPS добавляет шифрование TLS. Версии HTTP/2 и HTTP/3 передают несколько запросов в одном соединении и сжимают заголовки.

**Методы.** GET читает ресурс, POST создаёт данные или отправляет форму, PUT заменяет ресурс, PATCH изменяет его частично, DELETE удаляет.

**Коды состояния.** Класс 1xx обозначает информационный ответ, 2xx успех (200 OK, 204 No Content), 3xx перенаправление и кэш (301, 302, 304 Not Modified), 4xx ошибку клиента (404 Not Found), 5xx ошибку сервера (500 Internal Server Error).

**Заголовки.** Заголовки запроса: `User-Agent`, `Accept`, `Referer`, `Cookie`, `Authorization`. Заголовки ответа: `Content-Type`, `Cache-Control`, `Set-Cookie`, `Location`. Заголовки безопасности: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`.

**Кэширование.** Значение `Cache-Control: max-age` задаёт время жизни копии. Заголовки `ETag` и `Last-Modified` позволяют условным запросом проверить актуальность и получить ответ 304 без тела.

**Cookie.** Небольшие данные, которые сервер устанавливает заголовком `Set-Cookie`, а браузер возвращает заголовком `Cookie`: сессия, настройки, аналитика.

**Timing.** Фазы запроса: Queued и Stalled, DNS Lookup, Initial connection, SSL, Request sent, Waiting (TTFB), Content Download.

## 3 Ход работы

### 3.1 Выбор сайта и обоснование

Тема проекта относится к направлению SaaS, поэтому выбран сайт сервиса такого типа: https://app.diagrams.net/ (draw.io). Это облачный веб-редактор диаграмм со сценариями, которые близки к DSLKit: редактор, холст, шаблоны нотаций и экспорт. Сетевое поведение такого сайта показательно для будущего проекта: тяжёлое клиентское приложение, библиотеки шейпов, обращения к API, сеть доставки контента.

### 3.2 Методика

Страница загружена в Chromium 156 на Windows с пустым кэшем и без cookie. Журнал записан в формате HAR, как при экспорте через пункт «Export HAR» на вкладке Network. Выполнено два прогона: обычная сеть и эмуляция Fast 3G (задержка 562,5 мс, 1,6 Мбит/с на загрузку, 750 Кбит/с на отдачу, как в пресете Chrome DevTools). Режим Fast 3G выбран вместо Slow 3G, потому что задание допускает оба, а объём загрузки составляет 6,37 МБ.

Файлы журналов приложены к работе: `labs/01-network/data/draw-io-normal.har` для обычной сети и `labs/01-network/data/draw-io-fast3g.har` для Fast 3G. Разбор выполнен программой из приложений А, Б и В, её проверки описаны в приложении Г. Вид страницы после загрузки показан на рисунке 1.

![Страница draw.io после загрузки](data/draw-io-normal.png)

Рисунок 1 – Стартовая страница draw.io после полной загрузки

### 3.3 Результаты анализа журнала

Ниже приведены таблицы, которые построила программа. Для трёх разных запросов (основной документ, скрипт и запрос данных) выведены все заголовки запроса и ответа с назначением, что превышает минимум в пять заголовков.

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

### 3.4 Графическое представление результатов

Распределение запросов по типам ресурсов показано на рисунке 2: больше всего запросов относится к скриптам.

![Количество запросов по типам](generated/ru/fig-1-types.svg)

Рисунок 2 – Количество запросов по типам ресурсов

Распределение переданных данных по типам показано на рисунке 3: скрипты занимают 99 процентов трафика.

![Объём данных по типам](generated/ru/fig-2-bytes.svg)

Рисунок 3 – Объём переданных данных по типам ресурсов в мегабайтах

Фазы запроса основного документа показаны на рисунке 4: самой долгой оказалась фаза DNS Lookup.

![Фазы запроса документа](generated/ru/fig-3-timing.svg)

Рисунок 4 – Длительность фаз запроса основного документа в миллисекундах

Влияние медленного соединения показано на рисунке 5: загрузка страницы при Fast 3G заняла втрое больше времени, а TTFB вырос в двенадцать раз.

![Сравнение обычной сети и Fast 3G](generated/ru/fig-4-load.svg)

Рисунок 5 – Время загрузки и TTFB при обычной сети и при Fast 3G

### 3.5 Интерпретация результатов

**Общий вид.** Загружено 17 запросов объёмом 6,37 МБ по протоколу HTTP/2 за 4,4 с (onLoad). Скрипты составляют 8 запросов и 6,31 МБ, самые тяжёлые из них `stencils.min.js` (2,78 МиБ), `app.min.js` (2,08 МиБ) и `extensions.min.js` (1,13 МиБ). Все запросы выполнены методом GET, 16 из них завершились кодом 200, один (пинг `log.diagrams.net`) кодом 204.

**Кэширование.** HTML-документ кэшируется на 10 минут (`max-age=600`), заголовки ETag и Last-Modified у него отсутствуют, поэтому после истечения срока браузер загрузит страницу целиком. Статические ресурсы, например `stencils.min.js`, кэшируются на 30 дней (`max-age=2592000`) и имеют слабый ETag `W/"SyJN0w"`. Одинаковое значение ETag у разных файлов говорит о привязке к версии сборки. Ответ 304 в журнале отсутствует, потому что кэш браузера был пуст.

**Cookie.** В запросах нет заголовка `Cookie`, в ответах нет `Set-Cookie`. При первом заходе сайт не устанавливает cookie, а настройки приложения хранятся не в них.

**Безопасность.** Для документа заданы `Content-Security-Policy`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin` и `Permissions-Policy`. Заголовок `X-Frame-Options` отсутствует. Защиту от встраивания в чужие фреймы можно задавать директивой CSP `frame-ancestors`, но в усечённом значении заголовка она не видна.

**Timing документа.** Самая долгая фаза DNS Lookup (511 мс, холодный запрос имени), далее Initial connection 48 мс, SSL 32 мс, TTFB 48 мс, Content Download 4 мс. Сервер ответил быстро, основное время ушло на разрешение имени и установку защищённого соединения.

**Эмуляция сети.** При Fast 3G полное время загрузки выросло с 4393 до 14565 мс (в 3,3 раза), TTFB документа с 48 до 584 мс (в 12 раз) из-за задержки канала 562,5 мс. Самыми долгими стали запросы `stencils.min.js` (23,5 с), `extensions.min.js` (14,2 с) и `app.min.js` (12,4 с). Объём данных не изменился, поэтому замедление определяется пропускной способностью и задержкой, а не нагрузкой на сервер. Значение DOMContentLoaded в обычном прогоне (3408 мс) оказалось выше, чем при Fast 3G (1412 мс). Это единичные замеры с разным состоянием DNS-кэша, для выводов нужны повторные прогоны.

**Фильтрация по типам.** Больше всего запросов типа `script` (8), затем `stylesheet` (3), `xhr` (3), `image` (2) и `document` (1). По объёму лидируют скрипты. Журнал сохранён в формате HAR.

## 4 Ответы на контрольные вопросы

9. **Влияние медленного соединения.** TTFB документа вырос с 48 до 584 мс, время загрузки страницы с 4,4 до 14,6 с. Задержка канала увеличивает TTFB каждого запроса, а малая пропускная способность увеличивает Content Download крупных файлов: `stencils.min.js` загружался 23,5 с.
10. **Зачем нужен фильтр.** Он оставляет на панели выбранные типы (Doc, CSS, JS, XHR, Img, Font), что упрощает поиск тяжёлых и лишних ресурсов. В работе использованы типы document (1), stylesheet (3), script (8), xhr (3) и image (2).
11. **Что такое CDN и как его определить.** Сеть доставки контента хранит копии ресурсов на серверах рядом с пользователем. Признаки: `server: cloudflare`, `cf-ray`, `cf-cache-status: HIT` у статических файлов (отдано из кэша CDN) и `DYNAMIC` у HTML-документа, который на краю сети не кэшируется.

## Заключение

Сайт draw.io использует HTTPS и HTTP/2, отдаёт статические ресурсы через CDN Cloudflare с кэшем на 30 дней, не устанавливает cookie при первом заходе и строит защиту на CSP, HSTS и `nosniff`. Основной вес страницы, 6,37 МБ, приходится на скрипты (99 процентов), поэтому на медленном соединении время загрузки возрастает в 3,3 раза, с 4,4 до 14,6 с. Для DSLKit отсюда следует: тяжёлые библиотеки (шейпы, ядро на WebAssembly) нужно кэшировать надолго, загружать лениво и сжимать, а HTML-документ держать лёгким.

## Приложение А – Листинг файла analyze-har.js

```js
import { HEADER_DOCS, T } from './i18n.js';

const SECURITY = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options'];
export const PHASES = {
  blocked: 'Queued/Stalled',
  dns: 'DNS Lookup',
  connect: 'Initial connection',
  ssl: 'SSL',
  send: 'Request sent',
  wait: 'Waiting (TTFB)',
  receive: 'Content Download',
};

const find = (headers, name) => headers.find((h) => h.name.toLowerCase() === name)?.value;
const clip = (s) => (s.length > 80 ? `${s.slice(0, 77)}...` : s).replaceAll('|', '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const bytes = (e) => Math.max(e.response._transferSize, 0);
const mb = (n) => (n / 1048576).toFixed(2);
const count = (entries, key) => {
  const out = {};
  for (const e of entries) out[e._resourceType] = (out[e._resourceType] ?? 0) + key(e);
  return out;
};

export const summary = ({ log }) => {
  const [first] = log.entries;
  return {
    requests: log.entries.length,
    bytes: log.entries.reduce((s, e) => s + bytes(e), 0),
    types: count(log.entries, () => 1),
    onLoad: log.pages[0].pageTimings.onLoad,
    domContentLoaded: log.pages[0].pageTimings.onContentLoad,
    protocol: first.response.httpVersion,
    ttfb: first.timings.wait,
  };
};

export const bytesByType = (entries) => count(entries, bytes);

export const pick = (entries) => ['document', 'script', 'xhr'].map((t) => entries.find((e) => e._resourceType === t)).filter(Boolean);

export const headerRows = (headers, lang = 'ru', limit = 20) =>
  headers
    .filter((h) => !h.name.startsWith(':'))
    .slice(0, limit)
    .map((h) => [`\`${h.name}\``, clip(h.value), HEADER_DOCS[lang][h.name.toLowerCase()] ?? '—']);

export const cacheInfo = ({ response: { headers } }) => {
  const cacheControl = find(headers, 'cache-control');
  const maxAge = /max-age=(\d+)/.exec(cacheControl ?? '')?.[1];
  return { cacheControl, etag: find(headers, 'etag'), lastModified: find(headers, 'last-modified'), maxAge: maxAge && Number(maxAge) };
};

export const securityRows = ({ response: { headers } }, lang = 'ru') => SECURITY.map((n) => [`\`${n}\``, clip(find(headers, n) ?? T[lang].absent)]);

export const cookieRows = (entries) =>
  entries.flatMap((e) => [
    ...e.request.cookies.map((c) => [c.name, 'Cookie', e.request.url]),
    ...e.response.cookies.map((c) => [c.name, 'Set-Cookie', e.request.url]),
  ]);

export const timingRows = ({ timings }, lang = 'ru') =>
  Object.entries(PHASES).map(([k, label]) => [label, timings[k] >= 0 ? `${timings[k].toFixed(0)} ${T[lang].ms}` : '—']);

export const slowestPhase = ({ timings }) =>
  Object.entries(PHASES).reduce((best, [k, label]) => (timings[k] > best[1] ? [label, timings[k]] : best), ['—', -1])[0];

export const compareRows = (a, b) => {
  const x = summary(a);
  const y = summary(b);
  return [
    ['requests', x.requests, y.requests],
    ['transferred', mb(x.bytes), mb(y.bytes)],
    ['dcl', x.domContentLoaded, y.domContentLoaded],
    ['onload', x.onLoad, y.onLoad],
    ['ttfb', x.ttfb.toFixed(0), y.ttfb.toFixed(0)],
  ];
};

export const report = (har, slow, lang = 'ru', prefix = '3.3') => {
  const t = T[lang];
  const { log } = har;
  const s = summary(har);
  let tableNo = 0;
  let sectionNo = 0;
  const tbl = (caption, head, rows) => `${t.tableWord} ${++tableNo} – ${caption}\n\n${table(head, rows)}`;
  const section = (title, ...body) => `#### ${prefix}.${++sectionNo} ${title}\n\n${body.join('\n\n')}\n`;
  const parts = [
    section(
      t.summary,
      tbl(
        t.captions.summary,
        [t.metric, t.value],
        [
          [t.requests, s.requests],
          [t.transferred, mb(s.bytes)],
          [t.protocol, s.protocol],
          [t.dcl, s.domContentLoaded],
          [t.onload, s.onLoad],
        ],
      ),
      tbl(
        t.captions.types,
        [t.type, t.requests],
        Object.entries(s.types).sort((p, q) => q[1] - p[1]),
      ),
    ),
  ];
  for (const e of pick(log.entries)) {
    parts.push(
      section(
        `${t.reqLabel}: ${e._resourceType}, ${e.request.url}`,
        tbl(t.captions.general, [t.method, t.status], [[e.request.method, `${e.response.status} ${e.response.statusText}`.trim()]]),
        tbl(t.captions.reqHeaders, [t.header, t.hvalue, t.purpose], headerRows(e.request.headers, lang)),
        tbl(t.captions.resHeaders, [t.header, t.hvalue, t.purpose], headerRows(e.response.headers, lang)),
        tbl(t.captions.timing, [t.phase, t.time], timingRows(e, lang)),
        `${t.slowest}: ${slowestPhase(e)}.`,
      ),
    );
  }
  const biggest = log.entries.reduce((a, b) => (bytes(b) > bytes(a) ? b : a));
  parts.push(
    section(
      t.cache,
      tbl(
        t.captions.cache,
        [t.resource, 'Cache-Control', 'ETag', 'Last-Modified', 'max-age'],
        [log.entries[0], biggest].map((e) => {
          const c = cacheInfo(e);
          return [clip(e.request.url), c.cacheControl ?? '—', c.etag ?? '—', c.lastModified ?? '—', c.maxAge ?? '—'];
        }),
      ),
    ),
  );
  parts.push(section(t.security, tbl(t.captions.security, [t.header, t.hvalue], securityRows(log.entries[0], lang))));
  const cookies = cookieRows(log.entries);
  parts.push(section(t.cookie, cookies.length ? tbl(t.captions.cookies, [t.name, t.type, t.reqLabel], cookies) : t.noCookies));
  if (slow)
    parts.push(
      section(
        t.compare,
        tbl(
          t.captions.compare,
          [t.metric, t.normal, 'Fast 3G'],
          compareRows(har, slow).map(([k, ...v]) => [t[k], ...v]),
        ),
      ),
    );
  return parts.join('\n');
};
```

## Приложение Б – Листинг файла figures.js

```js
import { PHASES, bytesByType, summary } from './analyze-har.js';
import { T } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export const bars = (rows, unit) => {
  const max = Math.max(...rows.map((r) => r[1])) || 1;
  const body = rows
    .map(([label, v], i) => {
      const w = Math.round((v / max) * 380);
      return `<text x="190" y="${i * 30 + 20}" text-anchor="end" font-size="13">${esc(label)}</text><rect x="200" y="${i * 30 + 6}" width="${w}" height="20" fill="#2563eb"/><text x="${206 + w}" y="${i * 30 + 21}" font-size="13">${v} ${unit}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="${rows.length * 30 + 6}" font-family="Arial, sans-serif" fill="#1c1f2e">${body}</svg>\n`;
};

const byValue = (rows) => rows.sort((a, b) => b[1] - a[1]);

export const figures = (har, slow, lang = 'ru') => {
  const f = T[lang].figures;
  const s = summary(har);
  const t = summary(slow);
  const first = har.log.entries[0].timings;
  return {
    'fig-1-types.svg': bars(byValue(Object.entries(s.types)), f.pieces),
    'fig-2-bytes.svg': bars(byValue(Object.entries(bytesByType(har.log.entries)).map(([k, v]) => [k, Number((v / 1048576).toFixed(2))])), f.mb),
    'fig-3-timing.svg': bars(
      Object.entries(PHASES)
        .filter(([k]) => first[k] > 0)
        .map(([k, label]) => [label, Math.round(first[k])]),
      T[lang].ms,
    ),
    'fig-4-load.svg': bars(
      [
        [f.onload, s.onLoad],
        [f.onload3g, t.onLoad],
        [f.ttfb, Math.round(s.ttfb)],
        [f.ttfb3g, Math.round(t.ttfb)],
      ],
      T[lang].ms,
    ),
  };
};
```

## Приложение В – Листинг файла cli.js

```js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { report } from './analyze-har.js';
import { figures } from './figures.js';

const [normalFile, slowFile, lang, dir] = process.argv.slice(2);
const normal = JSON.parse(readFileSync(normalFile, 'utf8'));
const slow = JSON.parse(readFileSync(slowFile, 'utf8'));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'analysis.md'), report(normal, slow, lang));
for (const [name, svg] of Object.entries(figures(normal, slow, lang))) writeFileSync(join(dir, name), svg);
```

## Приложение Г – Листинг тестов analyze-har.test.js

```js
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bytesByType, cacheInfo, compareRows, cookieRows, headerRows, pick, report, securityRows, slowestPhase, summary, timingRows } from './analyze-har.js';
import { bars, figures } from './figures.js';
import { HEADER_DOCS, T } from './i18n.js';

const file = (n) => fileURLToPath(new URL(`./data/${n}`, import.meta.url));
const load = (n) => JSON.parse(readFileSync(file(n), 'utf8'));
const normal = load('draw-io-normal.har');
const fast = load('draw-io-fast3g.har');

const entry = (o = {}) => ({
  _resourceType: 'document',
  request: { method: 'GET', url: 'https://x.test/', headers: [], cookies: [] },
  response: { status: 200, statusText: 'OK', httpVersion: 'HTTP/2.0', headers: [], cookies: [], _transferSize: 10 },
  timings: { dns: 1, connect: 2, ssl: -1, send: 0, wait: 5, receive: 3 },
  ...o,
});
const har = (entries) => ({ log: { entries, pages: [{ pageTimings: { onContentLoad: 7, onLoad: 9 } }] } });
const h = (name, value) => ({ name, value });

test('summary of the recorded draw.io load', () => {
  const s = summary(normal);
  assert.equal(s.requests, 17);
  assert.deepEqual(s.types, { document: 1, stylesheet: 3, script: 8, xhr: 3, image: 2 });
  assert.equal(s.protocol, 'HTTP/2.0');
  assert.equal(s.onLoad, 4393);
  assert.ok(s.bytes > 6e6);
});

test('summary and bytesByType ignore unknown transfer size', () => {
  const e = entry();
  e.response._transferSize = -1;
  assert.equal(summary(har([e])).bytes, 0);
  assert.deepEqual(bytesByType([e, entry()]), { document: 10 });
});

test('pick returns document, script and xhr only when present', () => {
  assert.deepEqual(
    pick(normal.log.entries).map((e) => e._resourceType),
    ['document', 'script', 'xhr'],
  );
  assert.deepEqual(
    pick([entry()]).map((e) => e._resourceType),
    ['document'],
  );
});

test('headerRows skips pseudo headers, limits rows, clips and escapes values', () => {
  const rows = headerRows([h(':path', '/'), h('Accept', 'a|b'), h('x-unknown', 'y'.repeat(100)), h('server', 'cf')], 'ru', 3);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['`Accept`', 'a\\|b', HEADER_DOCS.ru.accept]);
  assert.deepEqual(rows[1], ['`x-unknown`', `${'y'.repeat(77)}...`, '—']);
  assert.equal(headerRows([h('a', '1'), h('b', '2')]).length, 2);
  assert.equal(headerRows([h('Accept', '1')], 'en')[0][2], HEADER_DOCS.en.accept);
});

test('cacheInfo reads cache headers and max-age', () => {
  const e = entry();
  e.response.headers = [h('Cache-Control', 'public, max-age=86400'), h('ETag', '"1"'), h('Last-Modified', 'Mon')];
  assert.deepEqual(cacheInfo(e), { cacheControl: 'public, max-age=86400', etag: '"1"', lastModified: 'Mon', maxAge: 86400 });
  assert.deepEqual(cacheInfo(entry()), { cacheControl: undefined, etag: undefined, lastModified: undefined, maxAge: undefined });
});

test('securityRows marks absent headers in both languages', () => {
  const e = entry();
  e.response.headers = [h('Strict-Transport-Security', 'max-age=1')];
  assert.deepEqual(securityRows(e), [
    ['`content-security-policy`', 'отсутствует'],
    ['`strict-transport-security`', 'max-age=1'],
    ['`x-frame-options`', 'отсутствует'],
    ['`x-content-type-options`', 'отсутствует'],
  ]);
  assert.equal(securityRows(e, 'en')[0][1], 'absent');
});

test('cookieRows lists request and response cookies', () => {
  const e = entry();
  e.request.cookies = [{ name: 'a' }];
  e.response.cookies = [{ name: 'b' }];
  assert.deepEqual(cookieRows([e, entry()]), [
    ['a', 'Cookie', 'https://x.test/'],
    ['b', 'Set-Cookie', 'https://x.test/'],
  ]);
  assert.deepEqual(cookieRows(normal.log.entries), []);
});

test('timingRows and slowestPhase handle missing phases', () => {
  const e = entry();
  assert.deepEqual(
    timingRows(e).map((r) => r[1]),
    ['—', '1 мс', '2 мс', '—', '0 мс', '5 мс', '3 мс'],
  );
  assert.equal(timingRows(e, 'en')[1][1], '1 ms');
  assert.equal(slowestPhase(e), 'Waiting (TTFB)');
  assert.equal(slowestPhase(entry({ timings: {} })), '—');
});

test('compareRows shows a slower page on Fast 3G', () => {
  const rows = compareRows(normal, fast);
  assert.deepEqual(
    rows.map((r) => r[0]),
    ['requests', 'transferred', 'dcl', 'onload', 'ttfb'],
  );
  assert.ok(rows[3][2] > rows[3][1]);
});

test('i18n dictionaries have the same keys in both languages', () => {
  assert.deepEqual(Object.keys(HEADER_DOCS.ru), Object.keys(HEADER_DOCS.en));
  assert.deepEqual(Object.keys(T.ru), Object.keys(T.en));
  assert.deepEqual(Object.keys(T.ru.captions), Object.keys(T.en.captions));
  assert.deepEqual(Object.keys(T.ru.figures), Object.keys(T.en.figures));
});

test('report in both languages with captions and numbering', () => {
  const ru = report(normal, fast);
  assert.match(ru, /#### 3\.3\.1 Сводка загрузки/);
  assert.match(ru, /Таблица 1 – Сводные показатели загрузки страницы/);
  assert.match(ru, /Таблица 2 – Количество запросов по типам ресурсов/);
  assert.match(ru, /Cookie не передавались/);
  assert.match(ru, /Сравнение обычной сети и Fast 3G/);
  const en = report(normal, undefined, 'en', '3.4');
  assert.match(en, /#### 3\.4\.1 Load summary/);
  assert.match(en, /Table 1 – Page load summary/);
  assert.match(en, /No cookies passed in either direction\./);
  assert.doesNotMatch(en, /Fast 3G/);
});

test('report lists cookies and fills missing cache headers', () => {
  const e = entry();
  e.request.cookies = [{ name: 'sid' }];
  const out = report(har([e]), fast);
  assert.match(out, /\| sid \| Cookie \|/);
  assert.match(out, /\| https:\/\/x\.test\/ \| — \| — \| — \| — \|/);
});

test('bars scale to the largest value and survive all zeros', () => {
  assert.match(
    bars(
      [
        ['a', 10],
        ['b', 5],
      ],
      'шт.',
    ),
    /width="380".*width="190"/,
  );
  assert.match(bars([['a', 0]], 'x'), /width="0"/);
  assert.match(bars([['<a>', 1]], 'x'), /&lt;a&gt;/);
});

test('figures build four charts for each language', () => {
  const ru = figures(normal, fast);
  assert.deepEqual(Object.keys(ru), ['fig-1-types.svg', 'fig-2-bytes.svg', 'fig-3-timing.svg', 'fig-4-load.svg']);
  assert.match(ru['fig-4-load.svg'], /onLoad, обычная сеть/);
  assert.match(figures(normal, fast, 'en')['fig-4-load.svg'], /onLoad, regular network/);
});

test('cli writes the analysis and the figures', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'figs-')), 'nested');
  process.argv.splice(2, 4, file('draw-io-normal.har'), file('draw-io-fast3g.har'), 'en', dir);
  await import('./cli.js');
  assert.match(readFileSync(join(dir, 'analysis.md'), 'utf8'), /Comparison of the regular network and Fast 3G/);
  assert.equal(readdirSync(dir).length, 5);
});
```
