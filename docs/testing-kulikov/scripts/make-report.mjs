// Builds docs/testing-kulikov/30-api-test-run.md from results.json written by run-all.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

const results = [
  ...JSON.parse(readFileSync(new URL('./results.json', import.meta.url), 'utf8')),
  ...JSON.parse(readFileSync(new URL('./results-external.json', import.meta.url), 'utf8')),
];
const cell = (s) =>
  String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .replace(/`/g, "'");
const groups = [...new Set(results.map((r) => r.group))];
const pass = results.filter((r) => r.pass).length;
const date = process.env.RUN_DATE ?? new Date().toISOString().slice(0, 10);

let md = `# Протокол прогона тестов API и безопасности (метод чёрного ящика)\n\n`;
md += `Дата прогона: ${date}. Объект: собственный API отрисовки DSLKit (\`tools/render-api.js\`) и статический сервер (\`tools/server.js\`).\n`;
md += `Сервер: \`node tools/serve.js site 5195\` (тот же код, что на порту 5190; отдельный порт выбран, чтобы тяжёлые запросы не блокировали рабочий сервер).\n`;
md += `Скрипты: \`docs/testing-kulikov/scripts/\` (запуск: \`PORT=5195 node docs/testing-kulikov/scripts/run-all.mjs\`, затем \`node docs/testing-kulikov/scripts/make-report.mjs\`). Сырые данные: \`scripts/results.json\`.\n\n`;
md += `Методы по Куликову: граничные значения (размер 0, 1, 99999, 100000, 100001), эквивалентные классы (типы полей, Content-Type, методы), предугадывание ошибок (\`__proto__\`, \`\\u0000\`, обход путей, XSS, большие графы), проверка кодов ответов и заголовков.\n\n`;
md += `## Итоги\n\n| Показатель | Значение |\n|---|---|\n| Всего проверок | ${results.length} |\n| Pass | ${pass} |\n| Fail | ${results.length - pass} |\n\n`;
md += `| Группа | Проверок | Pass | Fail |\n|---|---|---|---|\n`;
for (const g of groups) {
  const rs = results.filter((r) => r.group === g);
  md += `| ${g} | ${rs.length} | ${rs.filter((r) => r.pass).length} | ${rs.filter((r) => !r.pass).length} |\n`;
}
md += `\nОжидание в таблицах - требование, которое тестировщик считает правильным для HTTP/REST и для заявленного поведения API (лимит 100000 символов, коды 200/400/404/405/413/422/500). Fail означает расхождение факта с ожиданием; расхождения разобраны в \`31-api-bug-reports.md\`. Строки с пометкой \`Informational\` ничего не утверждают и всегда Pass.\n\n`;
md += `## Провалы\n\n| ID | Проверка | Факт | Баг-репорт |\n|---|---|---|---|\n`;
let bugMap = {};
try {
  bugMap = JSON.parse(readFileSync(new URL('./bug-map.json', import.meta.url), 'utf8'));
} catch {}
for (const r of results.filter((x) => !x.pass)) md += `| ${r.id} | ${cell(r.title)} | ${cell(r.actual).slice(0, 140)} | ${bugMap[r.id] ?? ''} |\n`;
for (const g of groups) {
  md += `\n## ${g}\n\n| ID | Проверка | Запрос | Ожидание | Факт | Результат |\n|---|---|---|---|---|---|\n`;
  for (const r of results.filter((x) => x.group === g)) {
    md += `| ${r.id} | ${cell(r.title)} | ${cell(r.request).slice(0, 150)} | ${cell(r.expect)} | ${cell(r.actual).slice(0, 200)}${r.note ? ` (${cell(r.note).slice(0, 160)})` : ''} | ${r.pass ? 'Pass' : '**Fail**'} |\n`;
  }
}
writeFileSync(new URL('../30-api-test-run.md', import.meta.url), md);
console.log(`written: ${results.length} rows`);
