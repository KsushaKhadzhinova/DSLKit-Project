"""BPMN поверх dgl: элементы и проверка правил методички ЛР2 (диаграммы «для людей»)."""
from dgl import Scene


class Bpmn(Scene):
    def pool(self, sid, x, y, w, h, text, collapsed=False):
        self.shape(sid, "pool", x, y, w, h, text, collapsed=collapsed, hw=34, fs=14 if not collapsed else 15)

    def lane(self, sid, x, y, w, h, text):
        self.shape(sid, "lane", x, y, w, h, text, hw=30, fs=13)

    def ev(self, sid, cx, cy, etype, text="", sym="none", lpos="below", attach=False):
        self.shape(sid, "event", cx - 18, cy - 18, 36, 36, text, etype=etype, sym=sym, lpos=lpos, attach=attach, fs=11)

    def task(self, sid, x, y, w, h, text, ttype="none", sub=False):
        self.shape(sid, "task", x, y, w, h, text, ttype=ttype, sub=sub, fs=12)

    def gate(self, sid, cx, cy, marker="x", text="", lpos="below"):
        self.shape(sid, "gate", cx - 24, cy - 24, 48, 48, text, marker=marker, lpos=lpos, fs=11)

    def data(self, sid, cx, cy, text, kind="edoc"):
        w, h = (30, 40) if kind == "edoc" else (34, 44)
        self.shape(sid, kind, cx - w / 2, cy - h / 2, w, h, "")
        self.text(cx, cy + h / 2 + 14, text, fs=11, tag="edge")

    # ------------------------------------------------------------ проверки
    def check(self):
        """Возвращает список нарушений правил BPMN для диаграмм «для людей»."""
        out = []
        shp = self.byid
        seq = [e for e in self.edges if e["style"] == "seq"]
        msg = [e for e in self.edges if e["style"] == "msg"]
        inc = {k: 0 for k in shp}
        outg = {k: 0 for k in shp}
        for e in seq:
            if e.get("src"):
                outg[e["src"]] += 1
            if e.get("tgt"):
                inc[e["tgt"]] += 1
        for k, s in shp.items():
            kind = s["kind"]
            if kind == "task":
                if s.get("ttype") not in ("user", "none"):
                    out.append(f"задача «{s['text']}»: недопустимый тип")
                first = s["text"].replace("\n", " ").split()[0]
                if not first.endswith("ть") and not first.endswith("чь"):
                    out.append(f"задача «{s['text']}» названа не по схеме Глагол-Существительное")
            if kind == "gate" and s.get("marker") not in ("x", "+"):
                out.append(f"шлюз {k}: допустимы только XOR и AND")
            if kind == "event":
                if s["etype"] == "start" and inc[k]:
                    out.append(f"стартовое событие «{s['text']}» имеет входящий поток")
                if s["etype"] == "end" and outg[k]:
                    out.append(f"конечное событие «{s['text']}» имеет исходящий поток")
                if s.get("sym", "none") not in ("none", "timer", "message", "terminate"):
                    out.append(f"событие «{s['text']}»: недопустимый тип триггера")
            if kind in ("task", "gate") or (kind == "event" and s["etype"] in ("inter", "bound")):
                if inc[k] == 0 and not (kind == "event" and s["etype"] == "bound"):
                    out.append(f"{k}: нет входящего потока управления")
                if outg[k] == 0:
                    out.append(f"{k}: нет исходящего потока управления")
            if kind == "event" and s["etype"] == "start" and outg[k] == 0:
                out.append(f"стартовое событие {k}: нет исходящего потока")
            if kind == "event" and s["etype"] == "end" and inc[k] == 0:
                out.append(f"конечное событие {k}: нет входящего потока")
        # шлюзы-ветвления: подписи у исходящих потоков
        for k, s in shp.items():
            if s["kind"] == "gate" and outg[k] > 1 and s.get("marker") == "x":
                labelled = sum(1 for e in seq if e.get("src") == k and e.get("branch"))
                if labelled < outg[k]:
                    out.append(f"шлюз {k}: не все исходящие потоки подписаны")
                if s.get("marker") == "x" and not s["text"]:
                    out.append(f"шлюз {k}: у ветвящегося XOR нет вопроса")
        # потоки сообщений не присоединяются к шлюзам
        for e in msg:
            for end in (e.get("src"), e.get("tgt")):
                if end and shp[end]["kind"] == "gate":
                    out.append("поток сообщений присоединён к шлюзу")
        return out
