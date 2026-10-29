import sys; sys.path.insert(0,'.')
from sclib import *
from dsl import *
with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Проверка', 'chk%d@example.com' % int(time.time())).register()
    for name, d in {**COURSE, **COMPANY}.items():
        st = u.diagram(d)
        print(name, st)
    print(u.errors)
