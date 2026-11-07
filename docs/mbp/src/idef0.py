"""IDEF0 поверх dgl: рамка со штампом, блоки, стрелки ICOM и проверка правил нотации."""
from dgl import Scene

DATE = "07.11.2026"
AUTHOR = "Хаджинова К.А."
PROJECT = "DSLKit"

# Граничные стрелки контекстной диаграммы A-0: порядок кодов задаёт ICOM
ICOM = {
    "I1": "Данные\nрегистрации",
    "I2": "Замысел диаграммы\n(описание на DSL)",
    "I3": "Обращения и запросы\nадминистрирования",
    "C1": "Условия тарифов,\nзаконодательство",
    "C2": "Правила нотаций\n(UML, IDEF0, BPMN)",
    "C3": "Политика\nбезопасности и\nхранения данных",
    "C4": "Параметры\nрендеринга\nи экспорта",
    "O1": "Построенная диаграмма\n(SVG, PNG)",
    "O2": "Сохранённые проекты\nи версии",
    "O3": "Отчёт о работе\nсервиса",
    "M1": "Веб-редактор\nDSLKit",
    "M2": "Сервер API\nи база данных",
    "M3": "Сервис рендеринга\nKroki",
    "M4": "Модуль\nавторизации",
}


class Idef0:
    W, H = 1500, 920

    def __init__(self, name, node, title, used_at, context, status=0):
        self.s = Scene(name, self.W, self.H)
        self.node, self.title = node, title
        self.blocks = {}
        self.arrows = []   # dict(kind, label, pts, code, src, tgt)
        self._frame(used_at, context, status)

    def _frame(self, used_at, context, status):
        s, W, H = self.s, self.W, self.H
        s.shape("frame", "plain", 10, 10, W - 20, H - 20, "", lw=1.8)
        hy, hh = 10, 64
        cells = [(10, 200, f"ИСПОЛЬЗУЕТСЯ В:\n{used_at}"),
                 (210, 410, f"АВТОР: {AUTHOR}\nПРОЕКТ: {PROJECT}"),
                 (620, 280, f"ДАТА: {DATE}\nВЕРСИЯ: 1.0"),
                 (1130, 200, "ЧИТАТЕЛЬ:\nДАТА:"),
                 (1330, 160, f"КОНТЕКСТ:\n{context}")]
        for i, (x, w, t) in enumerate(cells):
            s.shape(f"h{i}", "plain", x, hy, w, hh, t, lw=1.2, fs=12, talign="left", tdx=8, tvalign="center")
        rows = ["РАБОЧАЯ ВЕРСИЯ", "ЧЕРНОВИК", "РЕКОМЕНДОВАНО", "ОПУБЛИКОВАНО"]
        for i, r in enumerate(rows):
            on = i == 0
            s.shape(f"st{i}", "plain", 900, hy + i * 16, 230, 16, r, lw=1.0, fs=10, talign="left", tdx=8,
                    fill="#000000" if on else None)
            if on:
                s.byid[f"st{i}"]["tcolor"] = "white"
        fy = H - 75
        s.shape("f0", "plain", 10, fy, 200, 65, "", lw=1.2)
        s.shape("f1", "plain", 210, fy, 1040, 65, "", lw=1.2)
        s.shape("f2", "plain", 1250, fy, 240, 65, "", lw=1.2)
        s.text(18, fy + 12, "УЗЕЛ:", align="left", fs=11, white=False, tag="free-ok")
        s.text(110, fy + 41, self.node, fs=24, white=False, tag="free-ok")
        s.text(218, fy + 12, "НАЗВАНИЕ:", align="left", fs=11, white=False, tag="free-ok")
        s.text(730, fy + 41, self.title, fs=22, white=False, tag="free-ok")
        s.text(1258, fy + 12, "НОМЕР:", align="left", fs=11, white=False, tag="free-ok")

    def block(self, n, x, y, w, h, text, fs=15):
        self.s.shape(f"b{n}", "rect", x, y, w, h, text, lw=2.6, fs=fs)
        self.s.text(x + w - 8, y + h - 12, str(n if self.node != "A-0" else 0), align="right", fs=14, bold=True, white=False, tag="free-ok")
        self.blocks[n] = dict(n=n, x=x, y=y, w=w, h=h, text=text)

    def arrow(self, kind, label, pts, code=None, src=None, tgt=None, lbl=None, code_at=None):
        """kind: I,C,O,M; src/tgt — номера блоков (None для границы диаграммы)."""
        s = self.s
        e = s.edge(pts, style="idef", lw=2.0)
        if src:
            e["src"] = f"b{src}"
            b = self.blocks[src]
            e["exit"] = ("r", (pts[0][1] - b["y"]) / b["h"]) if abs(pts[0][0] - (b["x"] + b["w"])) < 1 else ("b", (pts[0][0] - b["x"]) / b["w"])
        if tgt:
            e["tgt"] = f"b{tgt}"
            b = self.blocks[tgt]
            p = pts[-1]
            if abs(p[0] - b["x"]) < 1:
                e["entry"] = ("l", (p[1] - b["y"]) / b["h"])
            elif abs(p[1] - b["y"]) < 1:
                e["entry"] = ("t", (p[0] - b["x"]) / b["w"])
            elif abs(p[1] - (b["y"] + b["h"])) < 1:
                e["entry"] = ("b", (p[0] - b["x"]) / b["w"])
        if lbl:
            x, y, al = lbl
            s.text(x, y, label, align=al, fs=14, tag="edge")
        if code and code_at:
            s.text(code_at[0], code_at[1], code, align="center", fs=11, bold=True, white=False)
        self.arrows.append(dict(kind=kind, label=label, pts=pts, code=code, src=src, tgt=tgt))
        return e

    # ---------------------------------------------------------------- проверки правил
    def check(self, parent_icom=None):
        out = []
        n = len(self.blocks)
        if self.node != "A-0":
            if not 3 <= n <= 6:
                out.append(f"число блоков {n} вне диапазона 3–6")
        else:
            if n != 1:
                out.append("контекстная диаграмма должна содержать один блок")
        for k, b in self.blocks.items():
            ins = [a for a in self.arrows if a["tgt"] == k]
            ctl = [a for a in ins if a["kind"] == "C"]
            outs = [a for a in self.arrows if a["src"] == k]
            if not ctl:
                out.append(f"блок {k}: нет стрелки управления")
            if not outs:
                out.append(f"блок {k}: нет выходной стрелки")
            if not any(a["kind"] == "I" for a in ins) and n > 1:
                out.append(f"блок {k}: нет входной стрелки (допустимо для блока управления, проверить смысл)")
        # диагональное расположение (ступенька): каждый следующий блок правее и ниже предыдущего
        ks = sorted(self.blocks)
        for a, b in zip(ks, ks[1:]):
            A, B = self.blocks[a], self.blocks[b]
            if not (B["x"] > A["x"] and B["y"] > A["y"]):
                out.append(f"блоки {a} и {b} не образуют ступеньку «сверху вниз, слева направо»")
        # согласованность граничных стрелок с родителем
        if parent_icom is not None:
            child = {a["code"]: a["label"] for a in self.arrows if a["code"]}
            for code, lab in parent_icom.items():
                if code not in child:
                    out.append(f"граничная стрелка {code} «{lab.replace(chr(10), ' ')}» есть у родителя, но отсутствует на диаграмме")
                elif child[code] != lab:
                    out.append(f"граничная стрелка {code}: название не совпадает с родительским")
            for code in child:
                if code not in parent_icom:
                    out.append(f"граничная стрелка {code} не соответствует стрелке родителя")
        # стрелки не заходят на не свои стороны: вход слева, управление сверху, механизм снизу
        for a in self.arrows:
            p = a["pts"][-1]
            if a["tgt"]:
                b = self.blocks[a["tgt"]]
                side = "l" if abs(p[0] - b["x"]) < 1 else "t" if abs(p[1] - b["y"]) < 1 else "b" if abs(p[1] - (b["y"] + b["h"])) < 1 else "r"
                need = {"I": "l", "C": "t", "M": "b"}.get(a["kind"])
                if need and side != need:
                    out.append(f"стрелка «{a['label'].replace(chr(10), ' ')}» ({a['kind']}) подходит к стороне {side}, нужна {need}")
            if a["src"] and a["kind"] == "O":
                b = self.blocks[a["src"]]
                q = a["pts"][0]
                if abs(q[0] - (b["x"] + b["w"])) > 1:
                    out.append(f"выход «{a['label'].replace(chr(10), ' ')}» начинается не с правой стороны блока")
        return out

    def save(self, base):
        return self.s.save(base)
