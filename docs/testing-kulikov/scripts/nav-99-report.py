"""Builds docs/testing-kulikov/40-navigation-matrix.md and 41-sequences-run.md from out/*.json.
usage: python nav-99-report.py
"""
import json, glob, os, collections

D = '..'


def load(path):
    try:
        return json.load(open(path, encoding='utf-8'))
    except Exception:
        return []


def esc(x):
    return str(x).replace('|', '\\|').replace('\n', ' ')


# ---------- 40: matrix ----------
crawl = []
for f in sorted(glob.glob('out/crawl-*.json')):
    if f.endswith('.partial.json'):
        base = f.replace('.partial.json', '.json')
        if os.path.exists(base):
            continue
    crawl += [dict(r, src=os.path.basename(f), **({'page': 'app/editor.html (меню ⋯ и панели)'} if 'editormenus' in f else {})) for r in load(f)]
seen = set(); rows = []
for r in crawl:
    k = (r['lang'], r['auth'], r['page'], r['i'])
    if k in seen:
        continue
    seen.add(k); rows.append(r)
cnt = collections.Counter()
out = ['# Матрица переходов: страница × элемент → результат', '',
       'Источник: `scripts/nav-01-crawl.py` (Playwright). Каждый видимый элемент (ссылка, кнопка, поле, переключатель, вкладка) нажимался на свежезагруженной странице с восстановленным хранилищем. '
       'Результат: куда ушёл адрес, код ответа, изменился ли DOM или localStorage, диалоги confirm/prompt, ошибки консоли.', '']
by = collections.defaultdict(list)
for r in rows:
    by[(r['lang'], r['auth'], r['page'])].append(r)
clicked = sum(1 for r in rows if not r.get('result', '').startswith(('NOT-CLICKABLE', 'file input')))
out.append(f'Строк в матрице: **{len(rows)}** в {len(by)} сочетаниях «язык × гость/вошедший × страница»; из них нажато **{clicked}**, остальные скрыты в данном состоянии (кнопка «Выйти» у гостя, пункты меню ⋯ и панелей редактора, которые проверены отдельно скриптом `nav-01b-editor-menus.py`, только для русской версии: 100 элементов) или относятся к полям файла (проверены в E23). Повторяющиеся карточки проектов на дашборде проверены на первых двух, остальные помечены «same as the previous cards».')
out.append('')
for key in sorted(by):
    lang, auth, page = key
    out += [f'## {page} — {lang.upper()}, {"гость" if auth == "guest" else "вошедший пользователь"}', '', '| № | Элемент | Тип | href / действие | Результат | Ошибки консоли |', '|---|---|---|---|---|---|']
    for r in by[key]:
        res = r.get('result', '')
        flag = ''
        if res.startswith('NO VISIBLE EFFECT'):
            flag = ' **(нет действия)**'; cnt['noeffect'] += 1
        if 'HTTP 404' in res or 'HTTP 5' in res:
            flag += ' **(404/5xx)**'; cnt['dead'] += 1
        if res.startswith('ERROR'):
            cnt['error'] += 1
        if r.get('errors'):
            cnt['console'] += 1
        out.append(f"| {r['i']} | {esc(r['text'][:40])} | {r['tag']}{('/' + r['type']) if r.get('type') else ''} | {esc((r.get('href') or r.get('act') or r.get('id') or '')[:50])} | {esc(res)[:150]}{flag} | {esc('; '.join(r.get('errors', []))[:120])} |")
    out.append('')
out.insert(5, open('40-extra.md', encoding='utf-8').read())
out.insert(4, f'Элементов без видимого эффекта: {cnt["noeffect"]}; ссылок на 404/5xx: {cnt["dead"]}; ошибок выполнения проверки: {cnt["error"]}; элементов с ошибкой консоли: {cnt["console"]}.')
open(f'{D}/40-navigation-matrix.md', 'w', encoding='utf-8').write('\n'.join(out) + '\n')

# ---------- 41: sequences ----------
seqs = []
for f in ['out/seq-auth.json', 'out/seq-projects.json', 'out/seq-editor.json', 'out/seq-new.json']:
    seqs += load(f)
o = ['# Прогон последовательностей (по Куликову)', '',
     'Скрипты: `scripts/nav-03-seq-auth.py`, `nav-04-seq-projects.py`, `nav-05-seq-editor.py`, `nav-06-new.py`. Приёмы: диаграмма состояний сессии (гость → пользователь A → гость → пользователь B), допустимые и недопустимые последовательности, '
     'предугадывание ошибок (две вкладки, устаревшие карточки, испорченные данные, граничные сроки).', '',
     f'Всего: **{len(seqs)}**, Pass: **{sum(1 for r in seqs if r[4] == "Pass")}**, Fail: **{sum(1 for r in seqs if r[4] == "Fail")}**.', '',
     '| ID | Последовательность | Ожидание | Факт | Результат |', '|---|---|---|---|---|']
for r in seqs:
    o.append('| ' + ' | '.join(esc(x)[:230] for x in r) + ' |')
open(f'{D}/41-sequences-run.md', 'w', encoding='utf-8').write('\n'.join(o) + '\n')
print(len(rows), 'matrix rows;', len(seqs), 'sequence rows')
