"""Сводка замеров отрисовки: медианы по повторам, таблицы и графики для статей (RU и EN)."""
import json
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

here = Path(__file__).parent
rows, ff, meta = [], [], None
for p in sorted(here.glob("render-chunk*.json")):
    d = json.loads(p.read_text(encoding="utf-8"))
    rows += d["rows"]; ff += d["ff"]; meta = meta or d["meta"]
configs = ["svg", "canvas", "cull-brute", "cull-grid", "lod"]
sizes = sorted({r["n"] for r in rows})

def fps(config, n, view, sc):
    v = [r["fps"] for r in rows if r["config"] == config and r["n"] == n and r["view"] == view and r["scenario"] == sc and r["type"] == "random"]
    return st.median(v) if v else None

def frame_ms(config, n, view, sc):
    v = [r["medMs"] for r in rows if r["config"] == config and r["n"] == n and r["view"] == view and r["scenario"] == sc and r["type"] == "random"]
    return st.median(v) if v else None

def first(config, n, view, key="tFirst"):
    v = [f[key] for f in ff if f["config"] == config and f["n"] == n and f["view"] == view and f["type"] == "random"]
    return st.median(v) if v else None

def drawn(config, n, view):
    v = [f["drawn"] for f in ff if f["config"] == config and f["n"] == n and f["view"] == view and f["type"] == "random" and f.get("drawn") is not None]
    return st.median(v) if v else None

lines = [f"# meta: {json.dumps({k: meta[k] for k in ('dpr','w','h','cores')})} ua={meta['ua']}"]
lines.append("== FPS (median) config,n,view,pan,zoom,drag")
for view in ("fit", "z100"):
    for n in sizes:
        for c in configs:
            vals = [fps(c, n, view, s) for s in ("pan", "zoom", "drag")]
            if any(v is not None for v in vals):
                lines.append(f"{c},{n},{view}," + ",".join("-" if v is None else f"{v:.1f}" for v in vals))
lines.append("== frame ms median config,n,view,pan,zoom,drag")
for view in ("fit", "z100"):
    for n in sizes:
        for c in configs:
            vals = [frame_ms(c, n, view, s) for s in ("pan", "zoom", "drag")]
            if any(v is not None for v in vals):
                lines.append(f"{c},{n},{view}," + ",".join("-" if v is None else f"{v:.1f}" for v in vals))
lines.append("== first frame ms config,n,view,tIndex,tFirst,tTotal,t20,drawn")
for view in ("fit", "z100"):
    for n in sizes:
        for c in configs + ["progressive"]:
            a = first(c, n, view, "tFirst")
            if a is not None:
                t20 = first(c, n, view, "t20") if c == "progressive" else None
                lines.append(f"{c},{n},{view},{first(c,n,view,'tIndex'):.0f},{a:.0f},{first(c,n,view,'tTotal'):.0f},{'-' if t20 is None else round(t20)},{drawn(c,n,view) if c!='progressive' else ''}")
out = "\n".join(lines)
(here / "render-summary.txt").write_text(out, encoding="utf-8")
print(out)

# графики: FPS при панорамировании, масштабировании, перетаскивании (вид «весь граф»), по числу узлов
L = {
    "en": dict(x="Number of nodes", y="FPS", names={"svg": "SVG", "canvas": "Canvas", "cull-brute": "Canvas, brute culling", "cull-grid": "Canvas, grid culling", "lod": "Canvas, grid + LOD"}, fmt=lambda n: f"{n:,}"),
    "ru": dict(x="Число узлов", y="FPS", names={"svg": "SVG", "canvas": "Canvas", "cull-brute": "Canvas, перебор", "cull-grid": "Canvas, сетка", "lod": "Canvas, сетка + LOD"}, fmt=lambda n: f"{n:,}".replace(",", " ")),
}
mk = {"svg": "o-", "canvas": "s--", "cull-brute": "v:", "cull-grid": "^-.", "lod": "D-"}
plt.rcParams.update({"font.size": 8, "font.family": "DejaVu Sans"})
out_dir = here.parent / "submission-figs"
for lang, t in L.items():
    for view in ("fit", "z100"):
        fig, ax = plt.subplots(figsize=(3.0, 2.1), dpi=300)
        for c in configs:
            xs = [i for i, n in enumerate(sizes) if fps(c, n, view, "pan") is not None]
            if not xs:
                continue
            ax.plot(xs, [fps(c, sizes[i], view, "pan") for i in xs], mk[c], color="black", markerfacecolor="white", linewidth=0.8, markersize=3.5, label=t["names"][c])
        ax.set_xticks(range(len(sizes)), [t["fmt"](n) for n in sizes]); ax.set_xlabel(t["x"]); ax.set_ylabel(t["y"]); ax.set_ylim(0, 65); ax.grid(True, linewidth=0.3)
        ax.legend(frameon=True, fontsize=5.5, loc="lower left")
        fig.tight_layout(pad=0.3); fig.savefig(out_dir / f"fig-fps-{view}-{lang}.png"); plt.close(fig)
print("figures ok")
