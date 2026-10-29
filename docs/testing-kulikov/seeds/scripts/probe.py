import sys; sys.path.insert(0,'.')
from sclib import *
with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Проба', 'probe%d@example.com' % int(time.time())).register()
    u.go('app/dashboard.html')
    print(u.titles()[:3], u.count_text(), u.quota())
    print(u.diagram('diagram idef0 "Проба"\nbox A1 "Один" {\n input: X\n output: Y\n}\n', typed=True))
    print(u.code())
    u.dash()
    print(u.titles()[:3], u.quota())
    print(list(u.ls().keys()))
    print(u.errors)
