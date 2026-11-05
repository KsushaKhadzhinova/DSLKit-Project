import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';

// Russian localization (?lang=ru / the "lang" cookie), see src/i18n.js and src/locales/*.js.
// Every assertion here checks real Russian text and the absence of the matching English UI word -
// technology and notation names (UML, BPMN, DSLKit, URL, request_log, DB_FILE...) are left alone on purpose.

const limits = loadLimits();
const valid = { title: 'ok', notation: 'ERD', description: 'd', code: '', revision: '0' };

const withServer = (name, fn) =>
  test(name, async () => {
    const store = createDiagramStore();
    const server = createApp({ store, limits, log: openRequestLog(), write: () => {}, writeError: () => {} }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      await fn({ base, store });
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

// Opens a page like a browser does and returns the CSRF cookie and the token from the hidden field.
// With ?lang=ru the response carries two Set-Cookie headers (lang and dslkit_csrf), joined by fetch's
// Headers into one comma-separated string; only the first attribute of each cookie is kept and both are
// sent back, exactly like edit-delete.test.js and the other suites do when there is only one cookie.
const session = async (base, path) => {
  const res = await fetch(`${base}${path}`);
  const html = await res.text();
  // None of this app's cookies ever carry a comma (no Expires attribute is used), so a plain split on
  // ", " safely separates the two Set-Cookie headers that fetch's Headers joins into one string.
  const setCookie = res.headers.get('set-cookie') ?? '';
  const cookie = setCookie
    .split(', ')
    .map((part) => part.trim().split(';')[0])
    .join('; ');
  return { cookie, token: html.match(/name="_csrf" value="([0-9a-f]+)"/)[1], html };
};

const post = async (url, body, { cookie, token } = {}) => {
  const fields = new URLSearchParams({ ...body, ...(token ? { _csrf: token } : {}) });
  return fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) },
    body: fields,
  });
};

// English words that must not appear on a Russian page: the English equivalents of translated UI text.
const ENGLISH_UI_WORDS = /\b(Diagrams|Add diagram|Request log|Sign in|Edit diagram|Save diagram|Save changes|Notation|Description|Revision|Delete|Back to the list|Page not found|Server error|Title is required)\b/;

withServer('home: ?lang=ru shows Russian text and none of the English UI words', async ({ base }) => {
  const res = await fetch(`${base}/?lang=ru`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<html lang="ru">/);
  assert.match(html, /Диаграммы/);
  assert.match(html, /Добавить диаграмму/);
  assert.doesNotMatch(html, ENGLISH_UI_WORDS);
});

withServer('header: the Guest/Owner indicator is translated too', async ({ base }) => {
  const guestHtml = await (await fetch(`${base}/?lang=ru`)).text();
  assert.match(guestHtml, /<span class="header__user">Гость<\/span>/);
  assert.doesNotMatch(guestHtml, /header__user">Guest</);
  const ownerHtml = await (await fetch(`${base}/?lang=ru&auth=1`)).text();
  assert.match(ownerHtml, /<span class="header__user">Владелец<\/span>/);
  assert.doesNotMatch(ownerHtml, /header__user">Owner</);
});

withServer('home: no ?lang and no cookie still answers in English (regression)', async ({ base }) => {
  const res = await fetch(`${base}/`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /Diagrams/);
  assert.match(html, /Add diagram/);
  assert.doesNotMatch(html, /Диаграммы/);
  // No "lang" cookie is set for a visitor who never asked for a language.
  const cookies = res.headers.get('set-cookie') ?? '';
  assert.doesNotMatch(cookies, /^lang=|; lang=/);
});

withServer('home: the "lang" cookie set by ?lang=ru is kept on the next request without the parameter', async ({ base }) => {
  const first = await fetch(`${base}/?lang=ru`);
  const setCookie = first.headers.get('set-cookie');
  assert.match(setCookie, /lang=ru; Path=\/; SameSite=Lax/);
  const langCookie = setCookie.split(',').find((part) => part.trim().startsWith('lang='));
  const second = await fetch(`${base}/`, { headers: { cookie: langCookie.trim().split(';')[0] } });
  const html = await second.text();
  assert.match(html, /<html lang="ru">/);
  assert.match(html, /Диаграммы/);
});

withServer('item page: ?lang=ru translates the facts and the buttons', async ({ base }) => {
  const res = await fetch(`${base}/item/1?lang=ru`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Номер/);
  assert.match(html, /Ревизия/);
  assert.match(html, /Создано/);
  assert.match(html, /Назад к списку/);
  assert.doesNotMatch(html, ENGLISH_UI_WORDS);
});

withServer('add form: ?lang=ru&auth=1 translates labels, hints and the submit button', async ({ base }) => {
  const res = await fetch(`${base}/add?auth=1&lang=ru`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Добавить диаграмму/);
  assert.match(html, /Название/);
  assert.match(html, /Описание/);
  assert.match(html, /Нотация/);
  assert.match(html, /Код диаграммы/);
  assert.match(html, /До 500 символов\./);
  assert.match(html, /Необязательно, до 5000 символов\./);
  assert.match(html, />Сохранить диаграмму</);
  assert.doesNotMatch(html, ENGLISH_UI_WORDS);
});

withServer('add form: validation errors are translated when the request asked for Russian', async ({ base }) => {
  const { cookie, token } = await session(base, '/add?auth=1&lang=ru');
  const res = await post(`${base}/add?auth=1&lang=ru`, { title: '', notation: 'nope', description: '', revision: '' }, { cookie, token });
  const html = await res.text();
  assert.equal(res.status, 400);
  assert.match(html, /Введите название\./);
  assert.match(html, /Выберите нотацию из списка/);
  assert.match(html, /Введите описание\./);
  assert.match(html, /Введите ревизию\./);
  assert.doesNotMatch(html, /Title is required|Choose a notation|Description is required|Revision is required/);
});

withServer('edit form: ?lang=ru translates the heading and the submit button', async ({ base }) => {
  const res = await fetch(`${base}/item/2/edit?auth=1&lang=ru`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Изменить диаграмму/);
  assert.match(html, />Сохранить изменения</);
});

withServer('log page: ?lang=ru&auth=1 translates the heading, buttons and table headers', async ({ base }) => {
  const res = await fetch(`${base}/log?auth=1&lang=ru`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Журнал запросов/);
  assert.match(html, /Выгрузить журнал в файл/);
  assert.match(html, /Скачать файл/);
  assert.match(html, /Очистить журнал/);
  assert.match(html, />Время</);
  assert.match(html, />Метод</);
  assert.match(html, />Статус</);
  assert.doesNotMatch(html, ENGLISH_UI_WORDS);
});

withServer('login page: ?lang=ru translates the heading, the lead and the button', async ({ base }) => {
  const res = await fetch(`${base}/login?lang=ru`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Вход/);
  assert.match(html, /Авторизация здесь имитируется/);
  assert.match(html, />Войти как владелец</);
  assert.match(html, /\?auth=1/); // the query flag itself is not translated
  assert.doesNotMatch(html, ENGLISH_UI_WORDS);
});

withServer('404 page: ?lang=ru translates the heading and the three sections', async ({ base }) => {
  const res = await fetch(`${base}/nope?lang=ru`);
  const html = await res.text();
  assert.equal(res.status, 404);
  assert.match(html, /Страница не найдена/);
  assert.match(html, /Что это/);
  assert.match(html, /Почему это произошло/);
  assert.match(html, /Как это исправить/);
  assert.doesNotMatch(html, ENGLISH_UI_WORDS);
});

withServer('403 (CSRF refused) page: ?lang=ru translates the heading and the notice', async ({ base }) => {
  const res = await post(`${base}/add?auth=1&lang=ru`, valid);
  const html = await res.text();
  assert.equal(res.status, 403);
  assert.match(html, /Запрос отклонён/);
  assert.match(html, /Токен формы отсутствует или неверен/);
});

withServer('every page carries the RU/EN switch, each keeping the current path and the auth flag', async ({ base }) => {
  const html = await (await fetch(`${base}/item/1?auth=1`)).text();
  assert.match(html, /href="\/item\/1\?auth=1&amp;lang=ru"/);
  assert.match(html, /href="\/item\/1\?auth=1&amp;lang=en"/);
});

test('a database failure (500) still answers in the requested language', async () => {
  const { join } = await import('node:path');
  const log = openRequestLog(join('package.json', 'blocked', 'i18n-log.db'));
  const server = createApp({ log, limits, write: () => {}, writeError: () => {} }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const ru = await fetch(`${base}/?lang=ru`);
    const ruHtml = await ru.text();
    assert.equal(ru.status, 500);
    assert.match(ruHtml, /Код ошибки: 500/);
    const en = await fetch(`${base}/`);
    const enHtml = await en.text();
    assert.equal(en.status, 500);
    assert.match(enHtml, /Error code: 500/);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
