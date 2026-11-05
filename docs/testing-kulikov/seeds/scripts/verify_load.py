"""Loads every scenario file with load-snapshot.js (the README way) into a clean context and prints what the dashboard shows."""
import sys, json; sys.path.insert(0, '.')
from common_ops import *
JS = open('../load-snapshot.js', encoding='utf-8').read()
def run(browser, path, idx=None, lang='ru', section='mine'):
    snap = json.load(open(path, encoding='utf-8'))
    if idx is not None: snap = snap['users'][idx]
    u = User(browser, 'x', 'x@x', lang=lang)
    u.p.goto(BASE + '/index.html')
    u.p.evaluate(JS.replace('/* PASTE SNAPSHOT OBJECT HERE */ {}', json.dumps(snap, ensure_ascii=False)).replace("'/app/dashboard.html'", "'" + ('/en' if lang == 'en' else '') + "/app/dashboard.html'"))
    u.p.wait_for_function("()=>location.pathname.endsWith('dashboard.html')"); u.p.wait_for_timeout(800)
    u.p.click(f'[data-section="{section}"]'); u.p.wait_for_timeout(300)
    return u.titles()[:4], u.count_text(), u.quota(), u.errors
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for path, idx, section in [('../scenario-1.json', None, 'mine'), ('../scenario-2.json', None, 'mine'), ('../scenario-3.json', 0, 'mine'), ('../scenario-3.json', 1, 'mine'), ('../scenario-4.json', None, 'trash'), ('../scenario-5.json', None, 'mine'), ('../scenario-5.json', None, 'templates')]:
        for lang in ('ru', 'en'):
            print(path, idx, lang, section, run(b, path, idx, lang, section), flush=True)
