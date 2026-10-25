import { parseDsl, toDot, toMermaid, sourceKey } from '../../site/js/utils/dataParser.js';
import { createStorage, createMemoryBackend } from '../../site/js/utils/storage.js';
import { validateWaitlist } from '../../site/js/utils/validation.js';

const PAGES = ['/', '/privacy.html', '/thanks.html', '/app/dashboard.html', '/app/editor.html', '/app/settings.html', '/app/welcome.html', '/en/', '/en/privacy.html', '/en/thanks.html'];
const DSL = 'diagram idef0 "Тест"\nbox A "Приём" {\n  input: Заявка\n  output: Результат\n}\nbox B "Проверка"\narrow A.output -> B.input';

const eq = (a, b) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`ожидалось ${JSON.stringify(b)}, получено ${JSON.stringify(a)}`);
};
const yes = (v, msg) => {
  if (!v) throw new Error(msg);
};
const n = (i) => String(i).padStart(2, '0');

// Check = [id, requirement, title, async (ctx) => void]; a thrown error means Failed.
export const smoke = [
  ['SM-01', 'R1', 'Главная страница открывается (200)', async ({ get }) => eq((await get('/')).status, 200)],
  ['SM-02', 'R1', 'Редактор открывается (200)', async ({ get }) => eq((await get('/app/editor.html')).status, 200)],
  ['SM-03', 'R1', 'Панель проектов открывается (200)', async ({ get }) => eq((await get('/app/dashboard.html')).status, 200)],
  ['SM-04', 'R2', 'Стили главной загружаются', async ({ get }) => eq((await get('/css/style.css')).status, 200)],
  ['SM-05', 'R2', 'Скрипт главной загружается', async ({ get }) => eq((await get('/js/script.js')).status, 200)],
  [
    'SM-06',
    'R3',
    'Разбор DSL возвращает 2 блока и 1 стрелку',
    async () => {
      const m = parseDsl(DSL);
      eq([m.boxes.length, m.arrows.length], [2, 1]);
    },
  ],
  ['SM-07', 'R4', 'Форма заявки есть на главной', async ({ get }) => yes((await get('/')).text.includes('id="waitlist-form"'), 'формы нет')],
  ['SM-08', 'R5', 'Несуществующий адрес даёт 404', async ({ get }) => eq((await get('/no-such-page')).status, 404)],
];

export const critical = [
  ...PAGES.map((p, i) => [
    `CP-${n(i + 1)}`,
    'R1',
    `Страница ${p} отдаётся как HTML`,
    async ({ get }) => {
      const r = await get(p);
      eq(r.status, 200);
      yes(/text\/html/.test(r.type), r.type);
    },
  ]),
  [
    'CP-11',
    'R6',
    'Главная: lang="ru", английская версия: lang="en"',
    async ({ get }) => {
      yes(/<html[^>]*lang="ru"/.test((await get('/')).text), 'ru');
      yes(/<html[^>]*lang="en"/.test((await get('/en/')).text), 'en');
    },
  ],
  [
    'CP-12',
    'R6',
    'На каждой странице ровно один h1',
    async ({ get }) => {
      for (const p of PAGES) eq([p, ((await get(p)).text.match(/<h1[\s>]/g) ?? []).length], [p, 1]);
    },
  ],
  [
    'CP-13',
    'R6',
    'У главной есть canonical и alternate',
    async ({ get }) => {
      const t = (await get('/')).text;
      yes(t.includes('rel="canonical"') && t.includes('rel="alternate"'), 'нет ссылок');
    },
  ],
  [
    'CP-14',
    'R6',
    'У каждой страницы есть title и meta viewport',
    async ({ get }) => {
      for (const p of PAGES) {
        const t = (await get(p)).text;
        yes(/<title>[^<]+<\/title>/.test(t) && t.includes('name="viewport"'), p);
      }
    },
  ],
  [
    'CP-15',
    'R2',
    'Все локальные ссылки на ресурсы главной открываются',
    async ({ get }) => {
      const t = (await get('/')).text;
      const urls = [...t.matchAll(/(?:src|href)="(\/?[^"#:]+\.(?:js|css|svg|png|jpg|webp))"/g)].map((m) => m[1]);
      yes(urls.length > 0, 'нет ссылок');
      for (const u of urls) eq([u, (await get(u.startsWith('/') ? u : `/${u}`)).status], [u, 200]);
    },
  ],
  [
    'CP-16',
    'R7',
    'Нет встроенных скриптов (CSP script-src self)',
    async ({ get }) => {
      for (const p of PAGES) yes(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test((await get(p)).text), p);
    },
  ],
  ['CP-17', 'R7', 'Заголовок Content-Security-Policy присутствует', async ({ get }) => yes((await get('/')).headers.get('content-security-policy')?.includes("default-src 'self'"), 'CSP')],
  ['CP-18', 'R7', 'X-Frame-Options = DENY', async ({ get }) => eq((await get('/')).headers.get('x-frame-options'), 'DENY')],
  ['CP-19', 'R7', 'X-Content-Type-Options = nosniff', async ({ get }) => eq((await get('/')).headers.get('x-content-type-options'), 'nosniff')],
  ['CP-20', 'R5', 'POST на статику даёт 405', async ({ base }) => eq((await fetch(`${base}/`, { method: 'POST' })).status, 405)],
  [
    'CP-21',
    'R5',
    'Выход за корень (../) не отдаёт файлы',
    async ({ base }) => {
      const r = await fetch(`${base}/..%2f..%2fpackage.json`);
      yes([400, 403, 404].includes(r.status), String(r.status));
    },
  ],
  ['CP-22', 'R5', 'Страница 404 оформлена как HTML сайта', async ({ get }) => yes((await get('/no-such-page')).text.includes('<html'), 'не HTML')],
  [
    'CP-23',
    'R8',
    'Манифест PWA: корректный JSON с иконками',
    async ({ get }) => {
      const m = JSON.parse((await get('/manifest.webmanifest')).text);
      yes(m.name && m.icons.length >= 2, 'манифест');
    },
  ],
  ['CP-24', 'R8', 'Service worker доступен', async ({ get }) => eq((await get('/sw.js')).status, 200)],
  [
    'CP-25',
    'R8',
    'robots.txt и sitemap.xml доступны',
    async ({ get }) => {
      eq((await get('/robots.txt')).status, 200);
      eq((await get('/sitemap.xml')).status, 200);
    },
  ],
  [
    'CP-26',
    'R3',
    'parseDsl: тип и заголовок диаграммы',
    async () => {
      const m = parseDsl(DSL);
      eq([m.type, m.title], ['idef0', 'Тест']);
    },
  ],
  ['CP-27', 'R3', 'parseDsl: порты блока разобраны', async () => eq(parseDsl(DSL).boxes[0].ports.input, ['Заявка'])],
  ['CP-28', 'R3', 'parseDsl: неизвестная строка попадает в skipped', async () => eq(parseDsl(`${DSL}\nмусор`).skipped.length, 1)],
  ['CP-29', 'R3', 'parseDsl: пустой ввод не падает', async () => eq(parseDsl('').boxes, [])],
  [
    'CP-30',
    'R3',
    'toDot даёт digraph с обоими блоками',
    async () => {
      const d = toDot(parseDsl(DSL));
      yes(d.includes('digraph') && d.includes('Приём') && d.includes('Проверка'), d);
    },
  ],
  ['CP-31', 'R3', 'toMermaid возвращает непустой текст', async () => yes(toMermaid(parseDsl(DSL)).length > 10, 'пусто')],
  [
    'CP-32',
    'R3',
    'sourceKey: один текст даёт один ключ, разные тексты разные',
    async () => {
      eq(sourceKey(DSL), sourceKey(DSL));
      yes(sourceKey(DSL) !== sourceKey('другое'), 'коллизия');
    },
  ],
  [
    'CP-33',
    'R9',
    'Хранилище: set/get возвращает значение',
    async () => {
      const s = createStorage(createMemoryBackend());
      s.set('k', { a: 1 });
      eq(s.get('k'), { a: 1 });
    },
  ],
  [
    'CP-34',
    'R9',
    'Хранилище: remove и значение по умолчанию',
    async () => {
      const s = createStorage(createMemoryBackend());
      s.set('k', 1);
      s.remove('k');
      eq(s.get('k', 'def'), 'def');
    },
  ],
  ['CP-35', 'R4', 'Валидация заявки: корректные данные дают пустой список ошибок', async () => eq(validateWaitlist({ name: 'Анна', email: 'a@b.co', notation: 'erd', team: 3, comment: '', consent: true }), [])],
  [
    'CP-36',
    'R4',
    'Форма: у полей есть label и сообщения об ошибках',
    async ({ get }) => {
      const t = (await get('/')).text;
      for (const f of ['name', 'email', 'team']) yes(t.includes(`for="${f}"`) && t.includes(`id="${f}-error"`), f);
    },
  ],
];
