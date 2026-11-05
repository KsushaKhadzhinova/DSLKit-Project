from lib import *
import time
with sync_playwright() as p:
    t = T("perf"); t.start(p); C = t.check
    for n in [30, 80, 150, 300]:
        t.new_ctx(); pg = t.pg
        def run(n=n):
            pg.goto(BASE + "/app/editor.html?template=dag"); pg.wait_for_selector(".canvas__remote svg"); pg.wait_for_timeout(600)
            big = 'diagram dag "Большая"\n' + "\n".join(f'task t{i} "Задача {i}"' for i in range(n)) + "\n" + "\n".join(f"t{i} -> t{i+1}" for i in range(n - 1))
            t0 = time.time()
            pg.set_default_timeout(60000)
            pg.fill(".code__input", big)
            pg.wait_for_function("(n) => document.querySelectorAll('.canvas__remote .notation__node[data-id]').length >= n * 0.9", arg=n, timeout=60000)
            dt = time.time() - t0
            yes(dt < 8, f"{n} блоков: отрисовка заняла {dt:.1f} с")
            return f"{n} блоков: {dt:.1f} с"
        C(f"PERF-{n}", f"Диаграмма из {n} блоков и {n-1} связей: время от ввода до отрисовки (порог 8 с)", run, shot=True)
        t.pg.set_default_timeout(12000)
    t.save()
