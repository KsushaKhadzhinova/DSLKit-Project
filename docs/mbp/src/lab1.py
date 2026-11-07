"""ЛР1 (МБП): IDEF0 A-0 и A0, дерево узлов, организационная структура DSLKit.
Запуск: python lab1.py  (результат в ..\\ЛР1_Анализ_предметной_области)"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dgl import Scene, report
from idef0 import Idef0, ICOM

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ЛР1_Анализ_предметной_области")
TITLE = "Предоставление сервиса диаграмм как кода DSLKit"


def a_minus_0():
    d = Idef0("A-0 Контекстная", "A-0", TITLE, "—", "TOP")
    d.block(1, 350, 310, 800, 220, "Предоставление сервиса\nдиаграмм как кода DSLKit", fs=22)
    for y, c in zip((360, 420, 480), ("I1", "I2", "I3")):
        d.arrow("I", ICOM[c], [(30, y), (350, y)], tgt=1, lbl=(190, y - 24, "center"))
    for x, c in zip((450, 650, 850, 1050), ("C1", "C2", "C3", "C4")):
        d.arrow("C", ICOM[c], [(x, 82), (x, 310)], tgt=1, lbl=(x - 8, 150, "right"))
    for y, c in zip((360, 420, 480), ("O1", "O2", "O3")):
        d.arrow("O", ICOM[c], [(1150, y), (1470, y)], src=1, lbl=(1310, y - 24, "center"))
    for x, c in zip((450, 650, 850, 1050), ("M1", "M2", "M3", "M4")):
        d.arrow("M", ICOM[c], [(x, 830), (x, 530)], tgt=1, lbl=(x - 8, 770, "right"))
    return d


def a0():
    d = Idef0("A0 Декомпозиция", "A0", TITLE, "A-0", "A-0")
    X1, X2, X3, X4, W_ = 130, 440, 750, 1060, 230
    d.block(1, X1, 170, W_, 140, "Регистрация и\nуправление доступом")
    d.block(2, X2, 300, W_, 140, "Написание и проверка\nDSL-кода")
    d.block(3, X3, 430, W_, 140, "Построение и экспорт\nдиаграммы")
    d.block(4, X4, 560, W_, 140, "Хранение проектов и\nадминистрирование")
    # --- входы
    d.arrow("I", ICOM["I1"], [(30, 225), (X1, 225)], "I1", tgt=1, lbl=(78, 190, "center"), code_at=(46, 245))
    d.arrow("I", ICOM["I2"], [(30, 370), (X2, 370)], "I2", tgt=2, lbl=(340, 338, "center"), code_at=(46, 390))
    d.arrow("I", ICOM["I3"], [(30, 680), (X4, 680)], "I3", tgt=4, lbl=(400, 654, "center"), code_at=(46, 700))
    # --- управление
    d.arrow("C", ICOM["C1"], [(X1 + 115, 82), (X1 + 115, 170)], "C1", tgt=1, lbl=(X1 + 107, 135, "right"), code_at=(X1 + 131, 94))
    d.arrow("C", ICOM["C2"], [(X2 + 200, 82), (X2 + 200, 300)], "C2", tgt=2, lbl=(X2 + 208, 140, "left"), code_at=(X2 + 224, 94))
    d.arrow("C", ICOM["C4"], [(X3 + 110, 82), (X3 + 110, 430)], "C4", tgt=3, lbl=(X3 + 118, 150, "left"), code_at=(X3 + 134, 94))
    d.arrow("C", ICOM["C3"], [(X4 + 110, 82), (X4 + 110, 560)], "C3", tgt=4, lbl=(X4 + 118, 150, "left"), code_at=(X4 + 134, 94))
    # --- механизмы
    d.arrow("M", ICOM["M4"], [(X1 + 115, 830), (X1 + 115, 310)], "M4", tgt=1, lbl=(X1 + 123, 785, "left"), code_at=(X1 + 139, 822))
    d.arrow("M", ICOM["M1"], [(X2 + 115, 830), (X2 + 115, 440)], "M1", tgt=2, lbl=(X2 + 123, 785, "left"), code_at=(X2 + 139, 822))
    d.arrow("M", ICOM["M3"], [(X3 + 115, 830), (X3 + 115, 570)], "M3", tgt=3, lbl=(X3 + 123, 785, "left"), code_at=(X3 + 139, 822))
    d.arrow("M", ICOM["M2"], [(X4 + 115, 830), (X4 + 115, 700)], "M2", tgt=4, lbl=(X4 + 123, 785, "left"), code_at=(X4 + 139, 822))
    # --- выходы
    d.arrow("O", ICOM["O1"], [(X3 + W_, 520), (1480, 520)], "O1", src=3, lbl=(1305, 492, "center"), code_at=(1472, 538))
    d.arrow("O", ICOM["O2"], [(X4 + W_, 610), (1480, 610)], "O2", src=4, lbl=(1385, 582, "center"), code_at=(1472, 628))
    d.arrow("O", ICOM["O3"], [(X4 + W_, 660), (1480, 660)], "O3", src=4, lbl=(1385, 636, "center"), code_at=(1472, 678))
    # --- внутренние стрелки
    d.arrow("C", "Роль и лимиты\nтарифа", [(X1 + W_, 230), (X2 + 60, 230), (X2 + 60, 300)], src=1, tgt=2, lbl=(X2 + 68, 262, "left"))
    d.arrow("I", "Проверенный код", [(X2 + W_, 350), (X2 + W_ + 40, 350), (X2 + W_ + 40, 500), (X3, 500)], src=2, tgt=3,
            lbl=(X2 + W_ + 48, 392, "left"))
    d.arrow("I", "Исходный код\nпроекта", [(X2 + W_, 405), (X2 + W_ + 20, 405), (X2 + W_ + 20, 640), (X4, 640)], src=2, tgt=4,
            lbl=(775, 611, "center"))
    d.arrow("I", "Диаграмма", [(X3 + W_, 550), (X3 + W_ + 50, 550), (X3 + W_ + 50, 600), (X4, 600)], src=3, tgt=4,
            lbl=(X3 + W_ + 42, 583, "right"))
    d.arrow("C", "Данные об использовании\nи квотах", [(X3 + W_, 448), (1395, 448), (1395, 105), (X1 + 185, 105), (X1 + 185, 170)], src=3, tgt=1,
            lbl=(1290, 405, "center"))
    return d

def tree(name, root, bw, bh, ygap, xgap, fs, margin=40):
    """root = (текст, [дочерние], необязательно цвет)"""
    leaves, pos = [0], {}

    def lay(node, depth):
        if not node[1]:
            x = leaves[0]
            leaves[0] += 1
        else:
            xs = [lay(k, depth + 1) for k in node[1]]
            x = sum(xs) / len(xs)
        pos[id(node)] = (x, depth)
        return x

    lay(root, 0)
    maxd = max(dp for _, dp in pos.values())
    W = int((leaves[0] - 1) * xgap + bw + 2 * margin)
    H = int(maxd * ygap + bh + 2 * margin)
    s = Scene(name, W, H)
    ids = {}

    def place(node):
        x, depth = pos[id(node)]
        sid = f"n{len(ids)}"
        fill = node[2] if len(node) > 2 else "#FFFFFF"
        s.shape(sid, "rect", margin + x * xgap, margin + depth * ygap, bw, bh, node[0], fs=fs, lw=2.0, fill=fill)
        ids[id(node)] = sid
        for k in node[1]:
            place(k)

    place(root)

    def link(node):
        p = ids[id(node)]
        for k in node[1]:
            c = ids[id(k)]
            x1, y1 = s.pt(p, "b")
            x2, y2 = s.pt(c, "t")
            ym = (y1 + y2) / 2
            s.link(p, "b", c, "t", via=[(x1, ym), (x2, ym)] if abs(x1 - x2) > 0.5 else [], style="plain", arrow="none")
            link(k)

    link(root)
    return s


def node_tree():
    root = ("A-0\nПредоставление сервиса\nдиаграмм как кода DSLKit",
            [("A0\nПредоставление сервиса\nдиаграмм как кода DSLKit", [
                ("A1\nРегистрация и\nуправление доступом", [("EPC (ЛР3)\nпроцесс «Регистрация\nи управление доступом»", [], "#E3F1DF")]),
                ("A2\nНаписание и проверка\nDSL-кода", [("BPMN (ЛР2)\nпроцесс «Написание\nи проверка DSL-кода»", [], "#E8EEF9")]),
                ("A3\nПостроение и экспорт\nдиаграммы", []),
                ("A4\nХранение проектов и\nадминистрирование", [])])])
    return tree("Дерево узлов", root, 200, 80, 130, 230, 14)


def org():
    root = ("Руководитель\nпроекта DSLKit", [
        ("Разработка", [("Клиентская часть\n(React)", []), ("Серверная часть\n(Node.js, API)", [])]),
        ("Качество", [("Тестирование", [])]),
        ("DevOps и\nинфраструктура", [("Развёртывание\n(Docker)", []), ("Сопровождение\nбазы данных", [])]),
        ("Продукт и дизайн", [("Аналитика\nи тарифы", []), ("UX и дизайн\nинтерфейса", [])]),
        ("Поддержка\nпользователей", [("Служба\nподдержки", []), ("Документация", [])]),
    ])
    return tree("Оргструктура", root, 160, 64, 140, 185, 15)


def build(out=OUT):
    os.makedirs(out, exist_ok=True)
    scenes, allw, checks = [], [], {}
    a = a_minus_0()
    checks["A-0"] = a.check()
    allw += a.save(os.path.join(out, "01_IDEF0_A-0_контекстная"))
    scenes.append(a.s)
    b = a0()
    checks["A0"] = b.check(parent_icom=ICOM)
    allw += b.save(os.path.join(out, "02_IDEF0_A0_декомпозиция"))
    scenes.append(b.s)
    t = node_tree()
    allw += t.save(os.path.join(out, "03_Дерево_узлов"))
    scenes.append(t)
    o = org()
    allw += o.save(os.path.join(out, "04_Организационная_структура"))
    scenes.append(o)
    return scenes, allw, checks


if __name__ == "__main__":
    from dgl import save_multi
    sc, w, ch = build()
    save_multi(os.path.join(OUT, "ВСЕ_ДИАГРАММЫ_ЛР1.drawio"), sc)
    print("Проверка правил IDEF0:")
    for k, v in ch.items():
        print(" ", k, "OK" if not v else "")
        for m in v:
            print("    -", m)
    report(w)
