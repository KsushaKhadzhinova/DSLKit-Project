export const HEADER_DOCS = {
  accept: 'Типы контента, которые клиент готов принять',
  'accept-encoding': 'Поддерживаемые алгоритмы сжатия ответа',
  'accept-ranges': 'Сервер поддерживает загрузку части ресурса',
  'access-control-allow-origin': 'Каким источникам разрешён кросс-доменный доступ (CORS)',
  age: 'Сколько секунд ответ пролежал в кэше CDN или прокси',
  'alt-svc': 'Сообщает об альтернативном протоколе (например, HTTP/3)',
  'cache-control': 'Правила кэширования ресурса',
  'cf-cache-status': 'Статус кэша Cloudflare (HIT, MISS)',
  'cf-ray': 'Идентификатор запроса в сети Cloudflare',
  'content-encoding': 'Применённое сжатие тела ответа',
  'content-length': 'Размер тела ответа в байтах',
  'content-security-policy': 'Разрешённые источники ресурсов страницы (защита от XSS)',
  'content-security-policy-report-only': 'Политика CSP в режиме отчётов без блокировки',
  'content-type': 'Тип и кодировка содержимого',
  'cross-origin-opener-policy': 'Изоляция окна от страниц других источников',
  'cross-origin-resource-policy': 'Кто может подключать ресурс на своих страницах',
  date: 'Время формирования ответа сервером',
  etag: 'Идентификатор версии ресурса для условных запросов',
  expires: 'Дата, после которой ответ считается устаревшим',
  'last-modified': 'Время последнего изменения ресурса',
  'permissions-policy': 'Доступ страницы к функциям браузера (камера, геолокация)',
  priority: 'Приоритет загрузки ресурса (HTTP/2, HTTP/3)',
  referer: 'Адрес страницы, с которой выполнен запрос',
  'referrer-policy': 'Какую часть адреса отправлять в Referer',
  'report-to': 'Куда браузеру отправлять отчёты о нарушениях',
  'sec-ch-ua': 'Название и версия браузера (Client Hints)',
  'sec-ch-ua-mobile': 'Признак мобильного устройства',
  'sec-ch-ua-platform': 'Операционная система клиента',
  'sec-fetch-dest': 'Назначение запроса (document, script, image)',
  'sec-fetch-mode': 'Режим запроса (navigate, cors, no-cors)',
  'sec-fetch-site': 'Связь источника запроса с целевым сайтом',
  'sec-fetch-storage-access': 'Статус доступа к хранилищу в сторонних контекстах',
  'sec-fetch-user': 'Запрос вызван действием пользователя',
  server: 'Программное обеспечение сервера или CDN',
  'strict-transport-security': 'Требует открывать сайт только по HTTPS (HSTS)',
  'timing-allow-origin': 'Каким источникам доступны данные Resource Timing',
  'upgrade-insecure-requests': 'Клиент предпочитает защищённую версию ресурса',
  'user-agent': 'Идентификация браузера и операционной системы',
  vary: 'От каких заголовков запроса зависит кэшированный ответ',
  'x-cloud-trace-context': 'Идентификатор трассировки запроса в Google Cloud',
  'x-content-type-options': 'Запрет угадывания типа содержимого (nosniff)',
  'x-frame-options': 'Запрет встраивания страницы во фреймы',
  'x-xss-protection': 'Устаревший фильтр XSS в браузере',
};

const SECURITY = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options'];
const PHASES = { blocked: 'Queued/Stalled', dns: 'DNS Lookup', connect: 'Initial connection', ssl: 'SSL', send: 'Request sent', wait: 'Waiting (TTFB)', receive: 'Content Download' };

const find = (headers, name) => headers.find((h) => h.name.toLowerCase() === name)?.value;
const clip = (s) => (s.length > 80 ? `${s.slice(0, 77)}...` : s).replaceAll('|', '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const bytes = (e) => Math.max(e.response._transferSize, 0);
const mb = (n) => (n / 1048576).toFixed(2);

export const summary = ({ log }) => {
  const [first] = log.entries;
  const types = {};
  for (const e of log.entries) types[e._resourceType] = (types[e._resourceType] ?? 0) + 1;
  return {
    requests: log.entries.length,
    bytes: log.entries.reduce((s, e) => s + bytes(e), 0),
    types,
    onLoad: log.pages[0].pageTimings.onLoad,
    domContentLoaded: log.pages[0].pageTimings.onContentLoad,
    protocol: first.response.httpVersion,
    ttfb: first.timings.wait,
  };
};

export const pick = (entries) => ['document', 'script', 'xhr'].map((t) => entries.find((e) => e._resourceType === t)).filter(Boolean);

export const headerRows = (headers, limit = 20) =>
  headers.filter((h) => !h.name.startsWith(':')).slice(0, limit).map((h) => [`\`${h.name}\``, clip(h.value), HEADER_DOCS[h.name.toLowerCase()] ?? '—']);

export const cacheInfo = ({ response: { headers } }) => {
  const cacheControl = find(headers, 'cache-control');
  const maxAge = /max-age=(\d+)/.exec(cacheControl ?? '')?.[1];
  return { cacheControl, etag: find(headers, 'etag'), lastModified: find(headers, 'last-modified'), maxAge: maxAge && Number(maxAge) };
};

export const securityRows = ({ response: { headers } }) => SECURITY.map((n) => [`\`${n}\``, clip(find(headers, n) ?? 'отсутствует')]);

export const cookieRows = (entries) =>
  entries.flatMap((e) => [...e.request.cookies.map((c) => [c.name, 'Cookie', e.request.url]), ...e.response.cookies.map((c) => [c.name, 'Set-Cookie', e.request.url])]);

export const timingRows = ({ timings }) =>
  Object.entries(PHASES).map(([k, label]) => [label, timings[k] >= 0 ? `${timings[k].toFixed(0)} мс` : '—']);

export const slowestPhase = ({ timings }) =>
  Object.entries(PHASES).reduce((best, [k, label]) => (timings[k] > best[1] ? [label, timings[k]] : best), ['—', -1])[0];

export const compareRows = (a, b) => {
  const x = summary(a);
  const y = summary(b);
  return [
    ['Запросов', x.requests, y.requests],
    ['Передано, МБ', mb(x.bytes), mb(y.bytes)],
    ['DOMContentLoaded, мс', x.domContentLoaded, y.domContentLoaded],
    ['onLoad, мс', x.onLoad, y.onLoad],
    ['TTFB документа, мс', x.ttfb.toFixed(0), y.ttfb.toFixed(0)],
  ];
};

const section = (title, body) => `## ${title}\n\n${body}\n`;

export const report = (har, slow) => {
  const { log } = har;
  const s = summary(har);
  const parts = [
    section('Сводка', table(['Показатель', 'Значение'], [['Запросов', s.requests], ['Передано, МБ', mb(s.bytes)], ['Протокол документа', s.protocol], ['DOMContentLoaded, мс', s.domContentLoaded], ['onLoad, мс', s.onLoad]]) +
      `\n\n${table(['Тип', 'Запросов'], Object.entries(s.types).sort((p, q) => q[1] - p[1]))}`),
  ];
  for (const e of pick(log.entries)) {
    parts.push(section(`${e._resourceType}: ${e.request.url}`,
      `${table(['Метод', 'Статус'], [[e.request.method, `${e.response.status} ${e.response.statusText}`.trim()]])}\n\n### Request headers\n\n${table(['Заголовок', 'Значение', 'Назначение'], headerRows(e.request.headers))}\n\n### Response headers\n\n${table(['Заголовок', 'Значение', 'Назначение'], headerRows(e.response.headers))}\n\n### Timing\n\n${table(['Фаза', 'Время'], timingRows(e))}\n\nСамая долгая фаза: ${slowestPhase(e)}`));
  }
  const biggest = log.entries.reduce((a, b) => (bytes(b) > bytes(a) ? b : a));
  parts.push(section('Кэширование', table(['Ресурс', 'Cache-Control', 'ETag', 'Last-Modified', 'max-age, с'], [log.entries[0], biggest].map((e) => {
    const c = cacheInfo(e);
    return [clip(e.request.url), c.cacheControl ?? '—', c.etag ?? '—', c.lastModified ?? '—', c.maxAge ?? '—'];
  }))));
  parts.push(section('Безопасность документа', table(['Заголовок', 'Значение'], securityRows(log.entries[0]))));
  const cookies = cookieRows(log.entries);
  parts.push(section('Cookie', cookies.length ? table(['Имя', 'Тип', 'Запрос'], cookies) : 'Cookie не передавались и не устанавливались.'));
  if (slow) parts.push(section('Сравнение: обычная сеть и Fast 3G', table(['Показатель', 'Обычная', 'Fast 3G'], compareRows(har, slow))));
  return parts.join('\n');
};
