"""dgl: общая графическая библиотека диаграмм МБП.

Одна модель диаграммы выводится двумя способами:
  - PNG (matplotlib) для отчётов;
  - .drawio (mxGraph XML) для редактирования в draw.io, с привязкой стрелок к фигурам.
После отрисовки выполняется проверка вёрстки: наложение подписей, выход текста за фигуру,
пересечение подписи со стрелкой, наклонные отрезки стрелок.
Координаты в пикселях модели, ось Y направлена вниз.
"""
import math
import os
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Ellipse, Polygon, Circle
from matplotlib.path import Path
from matplotlib.patches import PathPatch
from xml.sax.saxutils import escape

FONT = "Times New Roman"
PX = 0.72  # 1 px модели -> pt шрифта (фигура W/100 дюймов)
FS = float(os.environ.get("DGL_FS", "1.45"))  # общий множитель размера шрифта на диаграммах
plt.rcParams["font.family"] = FONT

SIDE = {"l": (0.0, 0.5), "r": (1.0, 0.5), "t": (0.5, 0.0), "b": (0.5, 1.0)}


def esc(s):
    return escape(s, {'"': "&quot;"}).replace("\n", "&lt;br&gt;")


def hexcol(c, default="#FFFFFF"):
    return default if c is None else c


class Scene:
    def __init__(self, name, W, H):
        self.name, self.W, self.H = name, W, H
        self.shapes = []   # фигуры в порядке добавления
        self.edges = []
        self.texts = []    # свободные подписи
        self.byid = {}
        self.warnings = []

    # ------------------------------------------------------------------ модель
    def shape(self, sid, kind, x, y, w, h, text="", **kw):
        s = dict(id=sid, kind=kind, x=x, y=y, w=w, h=h, text=text)
        s.update(kw)
        self.shapes.append(s)
        self.byid[sid] = s
        return s

    def text(self, x, y, txt, align="center", fs=13, bold=False, white=True, valign="center", tag=""):
        t = dict(x=x, y=y, text=txt, align=align, fs=fs, bold=bold, white=white, valign=valign, tag=tag)
        self.texts.append(t)
        return t

    def pt(self, sid, side, f=0.5):
        s = self.byid[sid]
        if side in ("l", "r"):
            return (s["x"] + (0 if side == "l" else s["w"]), s["y"] + s["h"] * f)
        return (s["x"] + s["w"] * f, s["y"] + (0 if side == "t" else s["h"]))

    def edge(self, pts, src=None, tgt=None, style="seq", arrow="block", start="none",
             label=None, lx=None, ly=None, align="center", lfs=11, lw=None, default=False, color="k", free=False):
        e = dict(pts=[(round(a, 1), round(b, 1)) for a, b in pts], src=src, tgt=tgt, style=style,
                 arrow=arrow, start=start, lw=lw, default=default, color=color, free=free)
        self.edges.append(e)
        if label:
            self.text(lx, ly, label, align=align, fs=lfs, tag="edge")
        return e

    def link(self, src, ss, tgt, ts, via=(), sf=0.5, tf=0.5, **kw):
        """Стрелка от стороны ss фигуры src к стороне ts фигуры tgt через точки via."""
        p0 = self.pt(src, ss, sf)
        p1 = self.pt(tgt, ts, tf)
        e = self.edge([p0, *via, p1], **kw)
        e["src"], e["tgt"] = src, tgt
        e["exit"] = (ss, sf)
        e["entry"] = (ts, tf)
        return e

    # ------------------------------------------------------------------ PNG
    def _fig(self):
        fig = plt.figure(figsize=(self.W / 100, self.H / 100), dpi=150)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_xlim(0, self.W)
        ax.set_ylim(self.H, 0)
        ax.axis("off")
        return fig, ax

    def png(self, path, check=True):
        fig, ax = self._fig()
        self._tbox = []
        # контейнеры
        for s in self.shapes:
            if s["kind"] in ("pool", "lane"):
                self._draw(ax, s, 1)
        for e in self.edges:
            self._draw_edge(ax, e)
        for s in self.shapes:
            if s["kind"] not in ("pool", "lane"):
                self._draw(ax, s, 4)
        for t in self.texts:
            self._draw_text(ax, t)
        fig.canvas.draw()
        rend = fig.canvas.get_renderer()
        inv = ax.transData.inverted()
        boxes = []
        for owner, art in self._tbox:
            bb = art.get_window_extent(rend)
            (x0, y0), (x1, y1) = inv.transform((bb.x0, bb.y0)), inv.transform((bb.x1, bb.y1))
            boxes.append((owner, min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)))
        if check:
            self._check(boxes)
        fig.savefig(path, dpi=150, facecolor="white")
        plt.close(fig)

    def _txt(self, ax, owner, x, y, txt, fs, ha="center", va="center", bold=False, white=False, z=6, rot=0, ls=1.15, color="k"):
        art = ax.text(x, y, txt, ha=ha, va=va, multialignment=ha, fontsize=fs * FS * PX, zorder=z, color=color,
                      fontweight="bold" if bold else "normal", linespacing=ls, rotation=rot,
                      bbox=dict(fc="white", ec="none", pad=0.8) if white else None)
        self._tbox.append((owner, art))
        return art

    def _draw_text(self, ax, t):
        ax_ = t["align"]
        self._txt(ax, t, t["x"], t["y"], t["text"], t["fs"], ha=ax_, va=t["valign"], bold=t["bold"],
                  white=t["white"], z=9, ls=1.1)

    def _label_out(self, ax, s, pos, cx, cy, hw, hh):
        gap = 4
        fs = s.get("fs", 11)
        if pos == "below":
            self._txt(ax, s, cx, cy + hh + gap, s["text"], fs, va="top", white=True, z=9)
        elif pos == "above":
            self._txt(ax, s, cx, cy - hh - gap, s["text"], fs, va="bottom", white=True, z=9)
        elif pos == "right":
            self._txt(ax, s, cx + hw + gap, cy, s["text"], fs, ha="left", white=True, z=9)
        elif pos == "left":
            self._txt(ax, s, cx - hw - gap, cy, s["text"], fs, ha="right", white=True, z=9)

    def _draw(self, ax, s, z):
        k = s["kind"]
        x, y, w, h = s["x"], s["y"], s["w"], s["h"]
        cx, cy = x + w / 2, y + h / 2
        fc = hexcol(s.get("fill"))
        lw = s.get("lw", 1.6)
        fs = s.get("fs", 13)
        bold = s.get("bold", False)
        if k == "rect":
            r = s.get("round", 0)
            if r:
                ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec="k", lw=lw, zorder=z))
            else:
                ax.add_patch(Rectangle((x, y), w, h, fc=fc, ec="k", lw=lw, zorder=z))
            if s["text"]:
                self._txt(ax, s, cx + s.get("tdx", 0), cy + s.get("tdy", 0), s["text"], fs, bold=bold)
        elif k == "ellipse":
            ax.add_patch(Ellipse((cx, cy), w, h, fc=fc, ec="k", lw=lw, zorder=z))
            if s["text"]:
                self._txt(ax, s, cx, cy, s["text"], fs, bold=bold)
        elif k == "hexagon":
            d = s.get("inset", 24)
            ax.add_patch(Polygon([(x + d, y), (x + w - d, y), (x + w, cy), (x + w - d, y + h), (x + d, y + h), (x, cy)],
                                 closed=True, fc=fc, ec="k", lw=lw, zorder=z))
            if s["text"]:
                self._txt(ax, s, cx, cy, s["text"], fs, bold=bold)
        elif k == "step":
            d = s.get("inset", 22)
            ax.add_patch(Polygon([(x, y), (x + w - d, y), (x + w, cy), (x + w - d, y + h), (x, y + h)],
                                 closed=True, fc=fc, ec="k", lw=lw, zorder=z))
            if s["text"]:
                self._txt(ax, s, cx - d / 4, cy, s["text"], fs, bold=bold)
        elif k == "oper":      # оператор EPC: круг с символом
            ax.add_patch(Circle((cx, cy), w / 2, fc=fc, ec="k", lw=lw, zorder=z))
            self._txt(ax, s, cx, cy, s["text"], s.get("fs", 14), bold=True)
        elif k == "doc":
            amp = h * 0.08
            xs = [x + w * t / 20 for t in range(21)]
            wave = [y + h - amp - amp * math.sin(2 * math.pi * (t / 20)) for t in range(21)]
            pts = [(x, y), (x + w, y)] + list(zip(xs[::-1], wave[::-1]))
            ax.add_patch(Polygon(pts, closed=True, fc=fc, ec="k", lw=lw, zorder=z))
            if s["text"]:
                self._txt(ax, s, cx, cy - amp, s["text"], fs)
        elif k == "edoc":      # электронный документ: лист с загнутым углом
            f = min(14, w / 4)
            ax.add_patch(Polygon([(x, y), (x + w - f, y), (x + w, y + f), (x + w, y + h), (x, y + h)], closed=True,
                                 fc=fc, ec="k", lw=lw, zorder=z))
            ax.plot([x + w - f, x + w - f, x + w], [y, y + f, y + f], color="k", lw=lw * 0.7, zorder=z + 0.1)
            if s["text"]:
                self._txt(ax, s, cx, cy + 3, s["text"], fs)
        elif k == "db":
            e = min(14, h / 4)
            ax.add_patch(Rectangle((x, y + e / 2), w, h - e, fc=fc, ec="k", lw=lw, zorder=z))
            ax.add_patch(Ellipse((cx, y + h - e / 2), w, e, fc=fc, ec="k", lw=lw, zorder=z))
            ax.add_patch(Rectangle((x + lw * 0.2, y + e / 2), w - lw * 0.4, h - e - e / 2 + 1, fc=fc, ec="none", zorder=z + 0.05))
            ax.add_patch(Ellipse((cx, y + e / 2), w, e, fc=fc, ec="k", lw=lw, zorder=z + 0.1))
            if s["text"]:
                self._txt(ax, s, cx, cy + e / 2, s["text"], fs)
        elif k == "pool":
            hw = s.get("hw", 34)
            ax.add_patch(Rectangle((x, y), w, h, fc="white", ec="k", lw=1.6, zorder=z))
            if s.get("collapsed"):
                self._txt(ax, s, cx, cy, s["text"], fs)
            else:
                ax.add_patch(Rectangle((x, y), hw, h, fc=s.get("fill", "#E6EBF5"), ec="k", lw=1.6, zorder=z))
                self._txt(ax, s, x + hw / 2, cy, s["text"], fs, rot=90)
        elif k == "lane":
            hw = s.get("hw", 30)
            ax.add_patch(Rectangle((x, y), w, h, fc="none", ec="k", lw=1.2, zorder=z))
            ax.add_patch(Rectangle((x, y), hw, h, fc=s.get("fill", "#F1F4FA"), ec="k", lw=1.2, zorder=z))
            self._txt(ax, s, x + hw / 2, cy, s["text"], fs, rot=90)
        elif k == "event":
            self._draw_event(ax, s, cx, cy, z)
        elif k == "gate":
            r = w / 2
            ax.add_patch(Polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], closed=True,
                                 fc=s.get("fill", "#F7E88A"), ec="k", lw=lw, zorder=z))
            m = s.get("marker", "x")
            if m == "x":
                ax.plot([cx - 9, cx + 9], [cy - 9, cy + 9], color="k", lw=3, zorder=z + 1)
                ax.plot([cx - 9, cx + 9], [cy + 9, cy - 9], color="k", lw=3, zorder=z + 1)
            elif m == "+":
                ax.plot([cx - 11, cx + 11], [cy, cy], color="k", lw=3.2, zorder=z + 1)
                ax.plot([cx, cx], [cy - 11, cy + 11], color="k", lw=3.2, zorder=z + 1)
            if s["text"]:
                self._label_out(ax, s, s.get("lpos", "below"), cx, cy, r, r)
        elif k == "task":
            ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=9", fc=s.get("fill", "#E8EEF9"),
                                        ec="k", lw=lw, zorder=z))
            self._txt(ax, s, cx, cy + (6 if s.get("ttype") == "user" or s.get("sub") else 0), s["text"], s.get("fs", 12))
            if s.get("ttype") == "user":
                ax.add_patch(Circle((x + 14, y + 10), 3.2, fc="white", ec="k", lw=0.9, zorder=z + 3))
                ax.add_patch(Polygon([(x + 8, y + 19), (x + 8, y + 15), (x + 20, y + 15), (x + 20, y + 19)], closed=True,
                                     fc="white", ec="k", lw=0.9, zorder=z + 3))
            if s.get("sub"):
                bx, by = cx, y + h - 13
                ax.add_patch(Rectangle((bx - 7, by - 7), 14, 14, fc="white", ec="k", lw=1.2, zorder=z + 3))
                ax.plot([bx - 4, bx + 4], [by, by], color="k", lw=1.4, zorder=z + 4)
                ax.plot([bx, bx], [by - 4, by + 4], color="k", lw=1.4, zorder=z + 4)
        elif k == "plain":      # текст в рамке без заливки, для рамок/штампов
            ax.add_patch(Rectangle((x, y), w, h, fc=s["fill"] if s.get("fill") else "none", ec="k" if lw else "none", lw=lw or 0, zorder=z - 1))
            if s["text"]:
                self._txt(ax, s, x + s.get("tdx", w / 2), y + s.get("tdy", h / 2), s["text"], fs, bold=bold,
                          ha=s.get("talign", "center"), va=s.get("tvalign", "center"), color=s.get("tcolor", "k"))
        elif k == "person":
            pass

    def _draw_event(self, ax, s, cx, cy, z):
        r = s["w"] / 2
        et, sym = s["etype"], s.get("sym", "none")
        if et == "start":
            ax.add_patch(Circle((cx, cy), r, fc="#A6E38B", ec="k", lw=1.6, zorder=z))
        elif et == "end":
            ax.add_patch(Circle((cx, cy), r, fc="#F2776B", ec="k", lw=4, zorder=z))
        else:
            ax.add_patch(Circle((cx, cy), r, fc="#F6A85F", ec="k", lw=1.6, zorder=z))
            ax.add_patch(Circle((cx, cy), r - 4, fc="none", ec="k", lw=1.2, zorder=z + 1))
        if sym == "message":
            w_, h_ = 14, 9.5
            ax.add_patch(Rectangle((cx - w_ / 2, cy - h_ / 2), w_, h_, fc="k" if et == "end" else "white", ec="k", lw=1, zorder=z + 2))
            ax.plot([cx - w_ / 2, cx, cx + w_ / 2], [cy - h_ / 2, cy + 1, cy - h_ / 2], color="white" if et == "end" else "k", lw=0.9, zorder=z + 3)
        elif sym == "timer":
            ax.add_patch(Circle((cx, cy), 8, fc="white", ec="k", lw=1.0, zorder=z + 2))
            ax.plot([cx, cx], [cy, cy - 5.5], color="k", lw=1.0, zorder=z + 3)
            ax.plot([cx, cx + 4], [cy, cy + 1.5], color="k", lw=1.0, zorder=z + 3)
        elif sym == "terminate":
            ax.add_patch(Circle((cx, cy), 8, fc="k", ec="k", lw=1.0, zorder=z + 2))
        if s["text"]:
            self._label_out(ax, s, s.get("lpos", "below"), cx, cy, r, r)

    def _head(self, ax, a, b, kind, z=5, color="k"):
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        ux, uy = dx / L, dy / L
        sz, hw = 11, 4.6
        base = (b[0] - ux * sz, b[1] - uy * sz)
        left = (base[0] - uy * hw, base[1] + ux * hw)
        right = (base[0] + uy * hw, base[1] - ux * hw)
        if kind == "open":
            ax.plot([left[0], b[0], right[0]], [left[1], b[1], right[1]], color=color, lw=1.3, zorder=z)
        else:
            ax.add_patch(Polygon([b, left, right], closed=True, fc="white" if kind == "hollow" else color, ec=color, lw=1.2, zorder=z))

    def _draw_edge(self, ax, e):
        p = e["pts"]
        st = e["style"]
        ls = {"seq": "-", "plain": "-", "idef": "-", "msg": (0, (5, 3)), "assoc": (0, (1, 2.2))}[st]
        lw = e["lw"] or (1.3 if st == "assoc" else 1.6)
        for i in range(len(p) - 1):
            ax.plot([p[i][0], p[i + 1][0]], [p[i][1], p[i + 1][1]], color=e.get("color", "k"), lw=lw, linestyle=ls, zorder=3,
                    solid_capstyle="butt")
        if e["arrow"] != "none":
            self._head(ax, p[-2], p[-1], "open" if st == "assoc" else ("hollow" if st == "msg" else "block"), color=e.get("color", "k"))
        if e["start"] == "oval":
            ax.add_patch(Circle(p[0], 4, fc="white", ec="k", lw=1.2, zorder=5))
        if e["default"]:
            a, b = p[0], p[1]
            L = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
            ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            mx, my = a[0] + ux * 20, a[1] + uy * 20
            ax.plot([mx - uy * 6 - ux * 3, mx + uy * 6 + ux * 3], [my + ux * 6 - uy * 3, my - ux * 6 + uy * 3], color="k", lw=1.6, zorder=5)

    # ------------------------------------------------------------------ проверки
    def _check(self, boxes):
        W = self.warnings
        # 1. подписи между собой
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if a[1] < b[3] - 1 and b[1] < a[3] - 1 and a[2] < b[4] - 1 and b[2] < a[4] - 1:
                    W.append(f"[{self.name}] наложение подписей: «{_short(a[0])}» и «{_short(b[0])}»")
        # 2. подпись внутри фигуры не выходит за её рамку; свободная подпись не пересекает фигуры
        for owner, x0, y0, x1, y1 in boxes:
            if "kind" in owner and owner["kind"] in ("rect", "ellipse", "hexagon", "step", "oper", "doc", "edoc", "db", "task", "plain"):
                s = owner
                if x0 < s["x"] - 1 or x1 > s["x"] + s["w"] + 1 or y0 < s["y"] - 1 or y1 > s["y"] + s["h"] + 1:
                    W.append(f"[{self.name}] текст выходит за фигуру: «{_short(owner)}»")
            elif "kind" in owner and owner["kind"] in ("event", "gate"):
                s = owner
                if not (x1 < s["x"] - 1 or x0 > s["x"] + s["w"] + 1 or y1 < s["y"] - 1 or y0 > s["y"] + s["h"] + 1):
                    W.append(f"[{self.name}] подпись событий/шлюза закрывает фигуру: «{_short(owner)}»")
            elif "tag" in owner and owner.get("tag") != "free-ok":
                for s in self.shapes:
                    if s["kind"] in ("pool", "lane"):
                        continue
                    if s["kind"] == "plain" and not s.get("lw"):
                        continue
                    if not (x1 < s["x"] or x0 > s["x"] + s["w"] or y1 < s["y"] or y0 > s["y"] + s["h"]):
                        # допускается подпись, лежащая целиком внутри «plain»-контейнера
                        if s["kind"] == "plain" and x0 >= s["x"] and x1 <= s["x"] + s["w"] and y0 >= s["y"] and y1 <= s["y"] + s["h"]:
                            continue
                        W.append(f"[{self.name}] подпись «{_short(owner)}» пересекает фигуру «{_short(s)}»")
                        break
        # 3. подпись не пересекает стрелки
        for owner, x0, y0, x1, y1 in boxes:
            if "kind" in owner:
                continue
            for e in self.edges:
                p = e["pts"]
                for i in range(len(p) - 1):
                    if _seg_hits(p[i], p[i + 1], x0, y0, x1, y1):
                        W.append(f"[{self.name}] подпись «{_short(owner)}» пересекает стрелку")
                        break
                else:
                    continue
                break
        # 4. наклонные отрезки
        for e in self.edges:
            p = e["pts"]
            if e.get("free"):
                continue
            for i in range(len(p) - 1):
                if abs(p[i][0] - p[i + 1][0]) > 0.6 and abs(p[i][1] - p[i + 1][1]) > 0.6:
                    W.append(f"[{self.name}] наклонный отрезок стрелки {p[i]} -> {p[i + 1]}")
        # 5. пересечения нестыкующихся фигур
        flat = [s for s in self.shapes if s["kind"] not in ("pool", "lane", "plain") and not s.get("attach")]
        for i in range(len(flat)):
            for j in range(i + 1, len(flat)):
                a, b = flat[i], flat[j]
                if a["x"] < b["x"] + b["w"] - 1 and b["x"] < a["x"] + a["w"] - 1 and a["y"] < b["y"] + b["h"] - 1 and b["y"] < a["y"] + a["h"] - 1:
                    W.append(f"[{self.name}] фигуры пересекаются: «{_short(a)}» и «{_short(b)}»")

    # ------------------------------------------------------------------ draw.io
    def cells(self, idp=""):
        out, n = [], [0]

        def cid():
            n[0] += 1
            return f"{idp}c{n[0]}"

        mapid = {}
        for s in self.shapes:
            mapid[s["id"]] = cid()

        def val(s):
            return esc(s.get("text", ""))

        def geo(s):
            return f'<mxGeometry x="{round(s["x"], 1)}" y="{round(s["y"], 1)}" width="{round(s["w"], 1)}" height="{round(s["h"], 1)}" as="geometry"/>'

        base = f"html=1;fontFamily={FONT};"
        for s in self.shapes:
            k = s["kind"]
            fs = s.get("fs", 13)
            fill = s.get("fill")
            sw = s.get("lw", 1.6)
            sw = max(1, round(sw * 1.25))
            fcol = f"fillColor={fill};" if fill else "fillColor=#FFFFFF;"
            fnt = f"fontSize={round(fs * FS)};" + ("fontStyle=1;" if s.get("bold") else "")
            if k == "rect":
                r = s.get("round", 0)
                st = base + f"rounded={1 if r else 0};" + (f"arcSize={min(50, round(r * 100 / min(s['w'], s['h'])))};" if r else "") + \
                    f"whiteSpace=wrap;{fcol}strokeColor=#000000;strokeWidth={sw};{fnt}align=center;verticalAlign=middle;"
            elif k == "ellipse":
                st = base + f"ellipse;whiteSpace=wrap;{fcol}strokeColor=#000000;strokeWidth={sw};{fnt}"
            elif k == "hexagon":
                st = base + f"shape=hexagon;perimeter=hexagonPerimeter2;fixedSize=1;size={s.get('inset', 24)};whiteSpace=wrap;{fcol}strokeColor=#000000;strokeWidth={sw};{fnt}"
            elif k == "step":
                st = base + f"shape=step;perimeter=stepPerimeter;fixedSize=1;size={s.get('inset', 22)};whiteSpace=wrap;{fcol}strokeColor=#000000;strokeWidth={sw};{fnt}"
            elif k == "oper":
                st = base + f"ellipse;whiteSpace=wrap;{fcol}strokeColor=#000000;strokeWidth={sw};fontSize={round(s.get('fs', 14) * FS)};fontStyle=1;"
            elif k == "doc":
                st = base + f"shape=document;boundedLbl=1;whiteSpace=wrap;{fcol}strokeColor=#000000;strokeWidth={sw};{fnt}"
            elif k == "edoc":
                st = base + f"shape=note;size=14;whiteSpace=wrap;{fcol}strokeColor=#000000;strokeWidth={sw};{fnt}"
            elif k == "db":
                st = base + f"shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=8;whiteSpace=wrap;{fcol}strokeColor=#000000;strokeWidth={sw};{fnt}"
            elif k == "pool":
                if s.get("collapsed"):
                    st = base + f"rounded=0;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;{fnt}"
                else:
                    st = base + f"swimlane;horizontal=0;startSize={s.get('hw', 34)};whiteSpace=wrap;fillColor={fill or '#E6EBF5'};swimlaneFillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;{fnt}"
            elif k == "lane":
                st = base + f"swimlane;horizontal=0;startSize={s.get('hw', 30)};whiteSpace=wrap;fillColor={fill or '#F1F4FA'};swimlaneFillColor=none;strokeColor=#000000;strokeWidth=1;{fnt}"
            elif k == "event":
                outline = {"start": "standard", "end": "end", "inter": "catching", "bound": "boundInt"}[s["etype"]]
                sym = {"none": "general", "message": "message", "timer": "timer", "terminate": "terminate"}[s.get("sym", "none")]
                fillc = {"start": "#A6E38B", "end": "#F2776B", "inter": "#F6A85F", "bound": "#F6A85F"}[s["etype"]]
                lp = s.get("lpos", "below")
                lab = {"below": "verticalLabelPosition=bottom;verticalAlign=top;", "above": "verticalLabelPosition=top;verticalAlign=bottom;",
                       "right": "labelPosition=right;align=left;verticalLabelPosition=middle;verticalAlign=middle;",
                       "left": "labelPosition=left;align=right;verticalLabelPosition=middle;verticalAlign=middle;"}[lp]
                st = (base + f"shape=mxgraph.bpmn.shape;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;outline={outline};symbol={sym};"
                      f"fillColor={fillc};strokeColor=#000000;{lab}labelBackgroundColor=#FFFFFF;fontSize={round(s.get('fs', 11) * FS)};whiteSpace=nowrap;")
            elif k == "gate":
                gw = "exclusive" if s.get("marker", "x") == "x" else "parallel"
                lp = s.get("lpos", "below")
                lab = {"below": "verticalLabelPosition=bottom;verticalAlign=top;", "above": "verticalLabelPosition=top;verticalAlign=bottom;",
                       "right": "labelPosition=right;align=left;verticalLabelPosition=middle;verticalAlign=middle;",
                       "left": "labelPosition=left;align=right;verticalLabelPosition=middle;verticalAlign=middle;"}[lp]
                st = (base + f"shape=mxgraph.bpmn.gateway2;perimeter=rhombusPerimeter;outlineConnect=0;aspect=fixed;gwType={gw};symbol=none;"
                      f"fillColor=#F7E88A;strokeColor=#000000;strokeWidth=2;{lab}labelBackgroundColor=#FFFFFF;fontSize={round(s.get('fs', 11) * FS)};whiteSpace=nowrap;")
            elif k == "task":
                marker = "user" if s.get("ttype") == "user" else "abstract"
                st = (base + f"shape=mxgraph.bpmn.task2;taskMarker={marker};{'isLoopSub=1;' if s.get('sub') else ''}rounded=1;arcSize=14;whiteSpace=wrap;"
                      f"fillColor={fill or '#E8EEF9'};strokeColor=#000000;strokeWidth=2;fontSize={round(s.get('fs', 12) * FS)};")
            elif k == "plain":
                stroke = "strokeColor=#000000;" if s.get("lw") else "strokeColor=none;"
                al = s.get("talign", "center")
                va = {"top": "top", "center": "middle", "bottom": "bottom"}[s.get("tvalign", "center")]
                fc_ = f"fontColor={s['tcolor']};" if s.get("tcolor") else ""
                st = base + f"rounded=0;whiteSpace=wrap;{fcol if fill else 'fillColor=none;'}{stroke}strokeWidth={sw};{fnt}{fc_}align={al};verticalAlign={va};spacingLeft=4;spacingRight=4;"
            else:
                continue
            out.append(f'<mxCell id="{mapid[s["id"]]}" value="{val(s)}" style="{st}" vertex="1" parent="1">{geo(s)}</mxCell>')

        for e in self.edges:
            p = e["pts"]
            st = {"seq": "endArrow=block;endFill=1;strokeWidth=2;", "plain": "endArrow=block;endFill=1;strokeWidth=2;",
                  "idef": "endArrow=block;endFill=1;strokeWidth=2;",
                  "msg": "dashed=1;dashPattern=8 6;startArrow=oval;startFill=0;endArrow=block;endFill=0;strokeWidth=1.8;",
                  "assoc": "dashed=1;dashPattern=1 3;endArrow=open;endFill=0;strokeWidth=1.5;"}[e["style"]]
            if e["arrow"] == "none":
                st = st.replace("endArrow=block;endFill=1;", "endArrow=none;")
            if e["start"] == "oval" and e["style"] != "msg":
                st += "startArrow=oval;startFill=0;"
            if e["default"]:
                st += "startArrow=dash;startFill=0;startSize=10;"
            ex = ""
            if e.get("src") and e["src"] in mapid:
                ss, sf = e.get("exit", ("r", 0.5))
                fx, fy = SIDE[ss]
                if ss in ("l", "r"):
                    fy = sf
                else:
                    fx = sf
                st += f"exitX={fx:.4f};exitY={fy:.4f};exitDx=0;exitDy=0;"
                ex += f' source="{mapid[e["src"]]}"'
            if e.get("tgt") and e["tgt"] in mapid:
                ts, tf = e.get("entry", ("l", 0.5))
                fx, fy = SIDE[ts]
                if ts in ("l", "r"):
                    fy = tf
                else:
                    fx = tf
                st += f"entryX={fx:.4f};entryY={fy:.4f};entryDx=0;entryDy=0;"
                ex += f' target="{mapid[e["tgt"]]}"'
            mid = "".join(f'<mxPoint x="{a}" y="{b}"/>' for a, b in p[1:-1])
            out.append(f'<mxCell id="{cid()}" style="html=1;rounded=0;edgeStyle=none;strokeColor={COL(e)};{st}" edge="1" parent="1"{ex}>'
                       f'<mxGeometry relative="1" as="geometry"><mxPoint x="{p[0][0]}" y="{p[0][1]}" as="sourcePoint"/>'
                       f'<mxPoint x="{p[-1][0]}" y="{p[-1][1]}" as="targetPoint"/><Array as="points">{mid}</Array></mxGeometry></mxCell>')

        for t in self.texts:
            lines = t["text"].split("\n")
            w = int(max(len(s) for s in lines) * t["fs"] * FS * 0.5) + 12
            h = len(lines) * (t["fs"] * FS + 4) + 4
            x = t["x"] - w / 2 if t["align"] == "center" else (t["x"] if t["align"] == "left" else t["x"] - w)
            fillc = "fillColor=#FFFFFF;" if t["white"] else "fillColor=none;"
            out.append(f'<mxCell id="{cid()}" value="{esc(t["text"])}" style="text;html=1;{fillc}strokeColor=none;fontFamily={FONT};'
                       f'fontSize={round(t["fs"] * FS)};{"fontStyle=1;" if t["bold"] else ""}align={t["align"]};verticalAlign=middle;whiteSpace=nowrap;spacing=0;" '
                       f'vertex="1" parent="1"><mxGeometry x="{round(x)}" y="{round(t["y"] - h / 2)}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return out

    def diagram_xml(self, idp=""):
        return (f'<diagram name="{escape(self.name, {chr(34): "&quot;"})}" id="{idp}{abs(hash(self.name)) % 10**8}">'
                f'<mxGraphModel dx="{self.W}" dy="{self.H}" grid="1" gridSize="10" page="1" pageWidth="{self.W}" '
                f'pageHeight="{self.H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'
                + "".join(self.cells(idp)) + "</root></mxGraphModel></diagram>")

    def drawio(self, path):
        with open(path, "w", encoding="utf-8") as f:
            f.write('<mxfile host="app.diagrams.net">' + self.diagram_xml() + "</mxfile>")

    def save(self, base, check=True):
        self.png(base + ".png", check)
        self.drawio(base + ".drawio")
        return self.warnings


def COL(e):
    c = e.get('color', 'k')
    return '#000000' if c == 'k' else c


def _short(o):
    t = o.get("text", "") if isinstance(o, dict) else str(o)
    return t.replace("\n", " ")[:40]


def _seg_hits(a, b, x0, y0, x1, y1, pad=-3.0):
    """Пересекает ли ортогональный отрезок прямоугольник подписи."""
    (ax, ay), (bx, by) = a, b
    if abs(ax - bx) < 0.6:  # вертикальный
        return x0 + pad < ax < x1 - pad and not (max(ay, by) < y0 + pad or min(ay, by) > y1 - pad)
    if abs(ay - by) < 0.6:  # горизонтальный
        return y0 + pad < ay < y1 - pad and not (max(ax, bx) < x0 + pad or min(ax, bx) > x1 - pad)
    return False


def save_multi(path, scenes):
    with open(path, "w", encoding="utf-8") as f:
        f.write('<mxfile host="app.diagrams.net">' + "".join(s.diagram_xml(f"p{i}") for i, s in enumerate(scenes)) + "</mxfile>")


def report(scenes_warnings):
    n = 0
    for w in scenes_warnings:
        print("  !", w)
        n += 1
    print(f"  предупреждений вёрстки: {n}")
    return n
