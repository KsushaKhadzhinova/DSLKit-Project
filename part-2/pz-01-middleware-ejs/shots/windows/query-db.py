import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
for q in sys.argv[2:]:
    cur = c.execute(q)
    print(q)
    print('|'.join(d[0] for d in cur.description))
    for r in cur: print('|'.join('' if v is None else str(v) for v in r))
    print()
