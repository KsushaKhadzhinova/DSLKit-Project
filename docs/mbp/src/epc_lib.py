"""EPC поверх dgl и проверка правил из методички ЛР3 (11 правил моделирования процессов в нотации EPC)."""
from collections import defaultdict
from dgl import Scene

FUNC, EVENT, IFACE = "#CDE8C6", "#F4C7C3", "#FFF2CC"
IS_C, DB_C, DOC_C = "#D9E2F3", "#E7E6E6", "#FFFFFF"


class Epc(Scene):
    def func(self, sid, cx, cy, text, w=240, h=64):
        self.shape(sid, "rect", cx - w / 2, cy - h / 2, w, h, text, fill=FUNC, round=12, lw=1.8, fs=13, epc="func")

    def event(self, sid, cx, cy, text, w=240, h=52):
        self.shape(sid, "hexagon", cx - w / 2, cy - h / 2, w, h, text, fill=EVENT, inset=24, lw=1.8, fs=13, epc="event")

    def oper(self, sid, cx, cy, kind, d=40):
        t = {"and": "AND", "or": "OR", "xor": "XOR"}[kind]
        self.shape(sid, "oper", cx - d / 2, cy - d / 2, d, d, t, fill="#E7E6E6", lw=1.8, fs=11, epc="oper", okind=kind)

    def iface(self, sid, cx, cy, text, w=260, h=60):
        self.shape(sid, "step", cx - w / 2, cy - h / 2, w, h, text, fill=IFACE, inset=24, lw=1.8, fs=13, epc="iface")

    def obj(self, sid, cx, cy, kind, text, w=150, h=46):
        """kind: edoc, doc, db, is (информационная система), role."""
        k = {"edoc": "edoc", "doc": "doc", "db": "db", "is": "rect", "role": "rect", "info": "rect"}[kind]
        fill = {"edoc": DOC_C, "doc": DOC_C, "db": DB_C, "is": IS_C, "role": "#FCE4D6", "info": "#FFFFFF"}[kind]
        extra = {"round": 4} if kind in ("is", "role", "info") else {}
        self.shape(sid, k, cx - w / 2, cy - h / 2, w, h, text, fill=fill, lw=1.3, fs=12, objkind=kind, **extra)

    def flow(self, a, sa, b, sb, via=(), **kw):
        return self.link(a, sa, b, sb, via=via, style="plain", **kw)

    def assoc(self, a, sa, b, sb, via=(), sf=0.5, tf=0.5):
        return self.link(a, sa, b, sb, via=via, sf=sf, tf=tf, style="assoc", arrow="none", lw=1.3)

    # ------------------------------------------------------------ проверки
    def check(self):
        out = []
        nodes = {k: s for k, s in self.byid.items() if s.get("epc")}
        succ, pred = defaultdict(list), defaultdict(list)
        for e in self.edges:
            if e["style"] != "plain":
                continue
            succ[e["src"]].append(e["tgt"])
            pred[e["tgt"]].append(e["src"])
        typ = lambda k: nodes[k]["epc"]

        def real(k, nbrs, seen=None):
            """Ближайшие не-операторные соседи (событие/функция), пропуская операторы."""
            res = []
            for n in nbrs[k]:
                if typ(n) == "oper":
                    res += real(n, nbrs)
                else:
                    res.append(n)
            return res

        # 1 старт и конец
        starts = [k for k in nodes if typ(k) == "event" and not pred[k]]
        ends = [k for k in nodes if typ(k) == "event" and (not succ[k] or all(typ(n) == "iface" for n in succ[k]))]
        if not starts:
            out.append("1: нет стартового события")
        if not ends:
            out.append("1: нет конечного события")
        # 2 чередование
        for k in nodes:
            if typ(k) in ("event", "func"):
                for n in real(k, succ):
                    if typ(n) == typ(k):
                        out.append(f"2: подряд идут два элемента одного типа: «{nodes[k]['text']}» и «{nodes[n]['text']}»".replace("\n", " "))
        # 3 число функций
        nf = sum(1 for k in nodes if typ(k) == "func")
        if nf > 20:
            out.append(f"3: функций {nf} (больше 20)")
        # 4 одна входящая и одна исходящая у событий и функций
        for k in nodes:
            if typ(k) in ("event", "func"):
                if len(pred[k]) > 1:
                    out.append(f"4: у «{nodes[k]['text']}» больше одной входящей связи".replace("\n", " "))
                if len(succ[k]) > 1:
                    out.append(f"4: у «{nodes[k]['text']}» больше одной исходящей связи".replace("\n", " "))
        # 6 нет объектов без связей
        linked = {e[x] for e in self.edges for x in ("src", "tgt") if e.get(x)}
        for k, s in self.byid.items():
            if s.get("epc") or s.get("objkind"):
                if k not in linked:
                    out.append(f"6: «{s['text']}» без связей".replace("\n", " "))
        # 7, 8, 9, 10 операторы
        for k in nodes:
            if typ(k) != "oper":
                continue
            ni, no = len(pred[k]), len(succ[k])
            kind = nodes[k]["okind"]
            if not ((ni >= 2 and no == 1) or (ni == 1 and no >= 2)):
                out.append(f"7: оператор {k} имеет {ni} вх. и {no} исх. связей")
            ins = [typ(n) for n in real(k, pred)] if False else [typ(n) for n in pred[k]]
            outs = [typ(n) for n in succ[k]]
            tin = [typ(n) if typ(n) != "oper" else "oper" for n in pred[k]]
            if any(t in ("event", "func") for t in tin) and any(t in ("event", "func") for t in outs):
                if "event" in tin and "event" in outs or "func" in tin and "func" in outs:
                    out.append(f"8: оператор {k}: вход и выход одного типа")
            if len({t for t in tin if t != "oper"}) > 1:
                out.append(f"10: оператор {k} объединяет функции и события")
            if len({t for t in outs if t != "oper"}) > 1:
                out.append(f"10: оператор {k} разветвляет функции и события")
            if ni == 1 and no >= 2 and kind in ("or", "xor") and "event" in tin:
                out.append(f"9: после одиночного события стоит разветвляющий оператор {kind.upper()}")
        # 11 пары ветвление/слияние
        def first_join(split):
            seen = defaultdict(set)
            for i, n in enumerate(succ[split]):
                stack, vis = [n], set()
                while stack:
                    x = stack.pop()
                    if x in vis:
                        continue
                    vis.add(x)
                    stack += succ[x]
                if split in vis:      # ветка-цикл возвращается к ветвлению, это не параллельная ветка
                    continue
                for x in vis:
                    seen[x].add(i)
            cand = [x for x, br in seen.items() if len(br) >= 2 and typ(x) == "oper"]
            return min(cand, key=lambda x: len(nx(x))) if cand else None

        def nx(x):
            return pred[x]

        for k in nodes:
            if typ(k) == "oper" and len(succ[k]) >= 2:
                j = first_join(k)
                if j:
                    a, b = nodes[k]["okind"], nodes[j]["okind"]
                    if not (a == b or (a == "and" and b == "or")):
                        out.append(f"11: ветвление {a.upper()} закрыто слиянием {b.upper()}")
        return out
