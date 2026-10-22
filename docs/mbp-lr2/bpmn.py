"""Мини-библиотека для BPMN-диаграмм: PNG (matplotlib) и .drawio из одной модели."""
import math
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Circle, Polygon, Ellipse
from xml.sax.saxutils import escape

FONT = "Times New Roman"
PX = 0.72
plt.rcParams["font.family"] = FONT
GREEN, RED, ORANGE, YELLOW, BLUE = "#a6e38b", "#f2776b", "#f6a85f", "#f7e88a", "#b9c9e8"


def attr(s):
    return escape(s, {'"': "&quot;"}).replace("\n", "&lt;br&gt;")


class Bpmn:
    def __init__(self, name, W, H):
        self.name, self.W, self.H = name, W, H
        self.pools, self.lanes, self.els, self.flows, self.labels = [], [], [], [], []

    # ---- модель ----
    def pool(self, x, y, w, h, text, collapsed=False):
        self.pools.append(dict(x=x, y=y, w=w, h=h, text=text, collapsed=collapsed))

    def lane(self, x, y, w, h, text):
        self.lanes.append(dict(x=x, y=y, w=w, h=h, text=text))

    def task(self, x, y, w, h, text, kind="abstract", loop=False):
        self.els.append(dict(t="task", x=x, y=y, w=w, h=h, text=text, kind=kind))

    def sub(self, x, y, w, h, text):
        self.els.append(dict(t="sub", x=x, y=y, w=w, h=h, text=text))

    def event(self, cx, cy, kind, symbol="none", text="", pos="below", tw=0):
        self.els.append(dict(t="event", cx=cx, cy=cy, kind=kind, symbol=symbol, text=text, pos=pos, tw=tw))

    def gate(self, cx, cy, gtype, text="", pos="above", tw=0):
        self.els.append(dict(t="gate", cx=cx, cy=cy, gtype=gtype, text=text, pos=pos, tw=tw))

    def data(self, cx, cy, text, kind="doc"):
        self.els.append(dict(t="data", cx=cx, cy=cy, text=text, kind=kind))

    def flow(self, pts, kind="seq", label="", lx=None, ly=None, align="center"):
        self.flows.append(dict(pts=pts, kind=kind, label=label, lx=lx, ly=ly, align=align))

    def note(self, x, y, text, align="center", fs=12):
        self.labels.append(dict(x=x, y=y, text=text, align=align, fs=fs))

    # ---- PNG ----
    def png(self, path):
        fig = plt.figure(figsize=(self.W / 100, self.H / 100), dpi=150)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_xlim(0, self.W)
        ax.set_ylim(self.H, 0)
        ax.axis("off")
        for p in self.pools:
            ax.add_patch(Rectangle((p["x"], p["y"]), p["w"], p["h"], fc="white", ec="k", lw=1.6, zorder=1))
            if p["collapsed"]:
                ax.text(p["x"] + p["w"] / 2, p["y"] + p["h"] / 2, p["text"], ha="center", va="center", fontsize=15 * PX, zorder=2)
            else:
                ax.add_patch(Rectangle((p["x"], p["y"]), 34, p["h"], fc="#e6ebf5", ec="k", lw=1.6, zorder=1))
                ax.text(p["x"] + 17, p["y"] + p["h"] / 2, p["text"], rotation=90, ha="center", va="center", fontsize=14 * PX, zorder=2)
        for l in self.lanes:
            ax.add_patch(Rectangle((l["x"], l["y"]), l["w"], l["h"], fc="none", ec="k", lw=1.2, zorder=1))
            ax.add_patch(Rectangle((l["x"], l["y"]), 30, l["h"], fc="#f1f4fa", ec="k", lw=1.2, zorder=1))
            ax.text(l["x"] + 15, l["y"] + l["h"] / 2, l["text"], rotation=90, ha="center", va="center", fontsize=13 * PX, zorder=2)
        for f in self.flows:
            self._flow(ax, f)
        for e in self.els:
            getattr(self, "_draw_" + e["t"])(ax, e)
        for f in self.flows:
            if f["label"]:
                lx, ly = f["lx"], f["ly"]
                ax.text(lx, ly, f["label"], ha=f["align"], va="center", multialignment=f["align"], fontsize=11 * PX,
                        zorder=9, bbox=dict(fc="white", ec="none", pad=1))
        for n in self.labels:
            ax.text(n["x"], n["y"], n["text"], ha=n["align"], va="center", multialignment=n["align"],
                    fontsize=n["fs"] * PX, zorder=9, bbox=dict(fc="white", ec="none", pad=1))
        fig.savefig(path, dpi=150, facecolor="white")
        plt.close(fig)

    def _head(self, ax, a, b, filled):
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        ux, uy = dx / L, dy / L
        s = 11
        base = (b[0] - ux * s, b[1] - uy * s)
        left = (base[0] - uy * 4.5, base[1] + ux * 4.5)
        right = (base[0] + uy * 4.5, base[1] - ux * 4.5)
        ax.add_patch(Polygon([b, left, right], closed=True, fc="k" if filled else "white", ec="k", lw=1.2, zorder=5))

    def _flow(self, ax, f):
        p = f["pts"]
        kind = f["kind"]
        ls = {"seq": "-", "msg": (0, (5, 3)), "assoc": (0, (1, 2.2))}[kind]
        lw = 1.6 if kind != "assoc" else 1.3
        end = p[-1]
        tail = p[:-1] + [(end[0] - (end[0] - p[-2][0]) * 0.0, end[1])]
        for i in range(len(p) - 1):
            ax.plot([p[i][0], p[i + 1][0]], [p[i][1], p[i + 1][1]], color="k", lw=lw, linestyle=ls, zorder=3,
                    solid_capstyle="butt")
        if kind == "assoc":
            dx, dy = end[0] - p[-2][0], end[1] - p[-2][1]
            L = math.hypot(dx, dy) or 1
            ux, uy = dx / L, dy / L
            for sgn in (1, -1):
                ax.plot([end[0], end[0] - ux * 8 - sgn * uy * 4], [end[1], end[1] - uy * 8 + sgn * ux * 4], color="k", lw=1.3, zorder=5)
        else:
            self._head(ax, p[-2], end, kind == "seq")
        if kind == "msg":
            ax.add_patch(Circle(p[0], 4, fc="white", ec="k", lw=1.2, zorder=5))

    def _env(self, ax, cx, cy, filled=False, s=1.0, color="k"):
        w, h = 14 * s, 9.5 * s
        ax.add_patch(Rectangle((cx - w / 2, cy - h / 2), w, h, fc=color if filled else "white", ec=color if not filled else "white" if False else "k", lw=1.0, zorder=7))
        ax.plot([cx - w / 2, cx, cx + w / 2], [cy - h / 2, cy + 1 * s, cy - h / 2], color="white" if filled else "k", lw=0.9, zorder=8)

    def _draw_task(self, ax, e):
        ax.add_patch(FancyBboxPatch((e["x"], e["y"]), e["w"], e["h"], boxstyle="round,pad=0,rounding_size=9", fc=BLUE if False else "#e8eef9", ec="k", lw=1.6, zorder=4))
        ax.text(e["x"] + e["w"] / 2, e["y"] + e["h"] / 2 + 4, e["text"], ha="center", va="center", fontsize=12 * PX, zorder=6, linespacing=1.1)
        if e["kind"] == "send":
            self._env(ax, e["x"] + 15, e["y"] + 12, filled=True)
        elif e["kind"] == "receive":
            self._env(ax, e["x"] + 15, e["y"] + 12, filled=False)
        elif e["kind"] == "user":
            ax.add_patch(Circle((e["x"] + 13, e["y"] + 9), 3, fc="white", ec="k", lw=0.9, zorder=7))
            ax.plot([e["x"] + 8, e["x"] + 8, e["x"] + 18, e["x"] + 18], [e["y"] + 18, e["y"] + 14, e["y"] + 14, e["y"] + 18], color="k", lw=0.9, zorder=7)
        elif e["kind"] == "service":
            ax.add_patch(Circle((e["x"] + 13, e["y"] + 12), 5, fc="white", ec="k", lw=0.9, zorder=7))
            ax.add_patch(Circle((e["x"] + 13, e["y"] + 12), 1.8, fc="k", ec="k", lw=0.5, zorder=8))

    def _draw_sub(self, ax, e):
        self._draw_task(ax, dict(e, kind="abstract"))
        cx, by = e["x"] + e["w"] / 2, e["y"] + e["h"] - 14
        ax.add_patch(Rectangle((cx - 7, by - 7), 14, 14, fc="white", ec="k", lw=1.2, zorder=7))
        ax.plot([cx - 4, cx + 4], [by, by], color="k", lw=1.4, zorder=8)
        ax.plot([cx, cx], [by - 4, by + 4], color="k", lw=1.4, zorder=8)

    def _label_xy(self, cx, cy, r, pos):
        return {"below": (cx, cy + r + 14), "above": (cx, cy - r - 14), "right": (cx + r + 6, cy), "left": (cx - r - 6, cy)}[pos]

    def _draw_event(self, ax, e):
        cx, cy, k = e["cx"], e["cy"], e["kind"]
        r = 18
        if k == "start":
            ax.add_patch(Circle((cx, cy), r, fc=GREEN, ec="k", lw=1.6, zorder=4))
        elif k == "end":
            ax.add_patch(Circle((cx, cy), r, fc=RED, ec="k", lw=4, zorder=4))
        else:
            ax.add_patch(Circle((cx, cy), r, fc=ORANGE, ec="k", lw=1.6, zorder=4))
            ax.add_patch(Circle((cx, cy), r - 4, fc="none", ec="k", lw=1.2, zorder=5))
        s = e["symbol"]
        if s == "message":
            self._env(ax, cx, cy, filled=(k == "end"), s=0.9)
        elif s == "timer":
            ax.add_patch(Circle((cx, cy), 8, fc="white", ec="k", lw=1.0, zorder=7))
            ax.plot([cx, cx], [cy, cy - 5.5], color="k", lw=1.0, zorder=8)
            ax.plot([cx, cx + 4], [cy, cy + 1.5], color="k", lw=1.0, zorder=8)
        if e["text"]:
            x, y = self._label_xy(cx, cy, r, e["pos"])
            ha = "left" if e["pos"] == "right" else "right" if e["pos"] == "left" else "center"
            ax.text(x, y, e["text"], ha=ha, va="center", multialignment=ha, fontsize=11 * PX, zorder=9, bbox=dict(fc="white", ec="none", pad=1))

    def _draw_gate(self, ax, e):
        cx, cy, r = e["cx"], e["cy"], 24
        ax.add_patch(Polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], closed=True, fc=YELLOW, ec="k", lw=1.6, zorder=4))
        if e["gtype"] == "xor":
            ax.plot([cx - 9, cx + 9], [cy - 9, cy + 9], color="k", lw=3, zorder=6)
            ax.plot([cx - 9, cx + 9], [cy + 9, cy - 9], color="k", lw=3, zorder=6)
        else:
            ax.plot([cx - 11, cx + 11], [cy, cy], color="k", lw=3.2, zorder=6)
            ax.plot([cx, cx], [cy - 11, cy + 11], color="k", lw=3.2, zorder=6)
        if e["text"]:
            x, y = self._label_xy(cx, cy, r, e["pos"])
            ha = "left" if e["pos"] == "right" else "right" if e["pos"] == "left" else "center"
            ax.text(x, y, e["text"], ha=ha, va="center", multialignment=ha, fontsize=11 * PX, zorder=9, bbox=dict(fc="white", ec="none", pad=1))

    def _draw_data(self, ax, e):
        cx, cy = e["cx"], e["cy"]
        if e["kind"] == "db":
            w, h = 34, 44
            ax.add_patch(Rectangle((cx - w / 2, cy - h / 2 + 6), w, h - 12, fc=BLUE, ec="k", lw=1.3, zorder=4))
            ax.add_patch(Ellipse((cx, cy + h / 2 - 6), w, 12, fc=BLUE, ec="k", lw=1.3, zorder=4))
            ax.add_patch(Ellipse((cx, cy - h / 2 + 6), w, 12, fc="#d6e0f3", ec="k", lw=1.3, zorder=5))
        else:
            w, h = 30, 40
            x0, y0, f = cx - w / 2, cy - h / 2, 9
            ax.add_patch(Polygon([(x0, y0), (x0 + w - f, y0), (x0 + w, y0 + f), (x0 + w, y0 + h), (x0, y0 + h)], closed=True, fc=BLUE, ec="k", lw=1.3, zorder=4))
            ax.plot([x0 + w - f, x0 + w - f, x0 + w], [y0, y0 + f, y0 + f], color="k", lw=1.0, zorder=5)
        ax.text(cx, cy + 22 + 12, e["text"], ha="center", va="center", multialignment="center", fontsize=11 * PX, zorder=9, bbox=dict(fc="white", ec="none", pad=1))

    # ---- draw.io ----
    def drawio(self, path):
        cells, n = [], [1]

        def nid():
            n[0] += 1
            return f"c{n[0]}"

        def cell(style, x, y, w, h, value=""):
            cells.append(f'<mxCell id="{nid()}" value="{attr(value)}" style="html=1;fontFamily={FONT};{style}" vertex="1" parent="1">'
                         f'<mxGeometry x="{round(x)}" y="{round(y)}" width="{round(w)}" height="{round(h)}" as="geometry"/></mxCell>')

        for p in self.pools:
            if p["collapsed"]:
                cell("rounded=0;whiteSpace=wrap;fontSize=15;fillColor=#FFFFFF;strokeWidth=2;", p["x"], p["y"], p["w"], p["h"], p["text"])
            else:
                cell("swimlane;horizontal=0;startSize=34;fillColor=#E6EBF5;strokeWidth=2;fontSize=14;whiteSpace=wrap;", p["x"], p["y"], p["w"], p["h"], p["text"])
        for l in self.lanes:
            cell("swimlane;horizontal=0;startSize=30;fillColor=#F1F4FA;strokeWidth=1.5;fontSize=13;whiteSpace=wrap;", l["x"], l["y"], l["w"], l["h"], l["text"])
        for e in self.els:
            t = e["t"]
            if t in ("task", "sub"):
                mark = {"send": "✉ ", "receive": "✉ "}.get(e.get("kind"), "")
                st = "rounded=1;arcSize=14;whiteSpace=wrap;fillColor=#E8EEF9;strokeWidth=2;fontSize=12;"
                if t == "sub":
                    st += "verticalAlign=middle;"
                val = mark + e["text"]
                cell(st, e["x"], e["y"], e["w"], e["h"], val)
                if t == "sub":
                    cell("rounded=0;fillColor=#FFFFFF;strokeWidth=1.5;fontSize=14;fontStyle=1;", e["x"] + e["w"] / 2 - 8, e["y"] + e["h"] - 22, 16, 16, "+")
            elif t == "event":
                sym = {"none": "general", "message": "message", "timer": "timer"}[e["symbol"]]
                outline = {"start": "standard", "end": "end", "inter": "catching"}[e["kind"]]
                fill = {"start": "#A6E38B", "end": "#F2776B", "inter": "#F6A85F"}[e["kind"]]
                lab = e["text"].replace("\n", " ")
                cell(f"shape=mxgraph.bpmn.shape;perimeter=ellipsePerimeter;outline={outline};symbol={sym};fillColor={fill};"
                     f"verticalLabelPosition=bottom;verticalAlign=top;labelBackgroundColor=#FFFFFF;fontSize=11;aspect=fixed;",
                     e["cx"] - 18, e["cy"] - 18, 36, 36, lab)
            elif t == "gate":
                gw = "exclusive" if e["gtype"] == "xor" else "parallel"
                lab = e["text"].replace("\n", " ")
                cell(f"shape=mxgraph.bpmn.gateway2;perimeter=rhombusPerimeter;gwType={gw};fillColor=#F7E88A;strokeWidth=2;"
                     f"verticalLabelPosition=bottom;verticalAlign=top;labelBackgroundColor=#FFFFFF;fontSize=11;aspect=fixed;",
                     e["cx"] - 24, e["cy"] - 24, 48, 48, lab)
            elif t == "data":
                if e["kind"] == "db":
                    cell("shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=7;fillColor=#B9C9E8;strokeWidth=1.5;verticalLabelPosition=bottom;verticalAlign=top;labelBackgroundColor=#FFFFFF;fontSize=11;",
                         e["cx"] - 17, e["cy"] - 22, 34, 44, e["text"])
                else:
                    cell("shape=note;size=9;fillColor=#B9C9E8;strokeWidth=1.5;verticalLabelPosition=bottom;verticalAlign=top;labelBackgroundColor=#FFFFFF;fontSize=11;",
                         e["cx"] - 15, e["cy"] - 20, 30, 40, e["text"])
        for f in self.flows:
            p = f["pts"]
            st = {"seq": "endArrow=block;endFill=1;strokeWidth=2;",
                  "msg": "dashed=1;startArrow=oval;startFill=0;endArrow=block;endFill=0;strokeWidth=1.8;",
                  "assoc": "dashed=1;dashPattern=1 3;endArrow=open;endFill=0;strokeWidth=1.5;"}[f["kind"]]
            mid = "".join(f'<mxPoint x="{x}" y="{y}"/>' for x, y in p[1:-1])
            cells.append(f'<mxCell id="{nid()}" style="html=1;rounded=0;edgeStyle=none;strokeColor=#000000;{st}" edge="1" parent="1">'
                         f'<mxGeometry relative="1" as="geometry"><mxPoint x="{p[0][0]}" y="{p[0][1]}" as="sourcePoint"/>'
                         f'<mxPoint x="{p[-1][0]}" y="{p[-1][1]}" as="targetPoint"/><Array as="points">{mid}</Array></mxGeometry></mxCell>')
            if f["label"]:
                lines = f["label"].split("\n")
                w = int(max(len(s) for s in lines) * 6.2) + 10
                h = len(lines) * 14 + 4
                x = f["lx"] - w / 2 if f["align"] == "center" else (f["lx"] if f["align"] == "left" else f["lx"] - w)
                cell(f"text;fillColor=#FFFFFF;strokeColor=none;fontSize=11;align={f['align']};verticalAlign=middle;whiteSpace=nowrap;", x, f["ly"] - h / 2, w, h, f["label"])
        for t in self.labels:
            lines = t["text"].split("\n")
            w = int(max(len(s) for s in lines) * t["fs"] * 0.5) + 10
            h = len(lines) * (t["fs"] + 3) + 4
            x = t["x"] - w / 2 if t["align"] == "center" else (t["x"] if t["align"] == "left" else t["x"] - w)
            cell(f"text;fillColor=#FFFFFF;strokeColor=none;fontSize={t['fs']};align={t['align']};verticalAlign=middle;whiteSpace=nowrap;", x, t["y"] - h / 2, w, h, t["text"])
        xml = (f'<mxfile host="app.diagrams.net"><diagram name="{self.name}" id="{self.name}"><mxGraphModel dx="{self.W}" dy="{self.H}" grid="1" gridSize="10" page="1" '
               f'pageWidth="{self.W}" pageHeight="{self.H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'
               + "".join(cells) + "</root></mxGraphModel></diagram></mxfile>")
        open(path, "w", encoding="utf-8").write(xml)

    def save(self, base):
        self.png(base + ".png")
        self.drawio(base + ".drawio")
