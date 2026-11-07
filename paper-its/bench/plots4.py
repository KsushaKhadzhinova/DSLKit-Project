"""Время отбора видимых узлов в окне 1600x900 по n, строго по results.csv."""
import csv
import statistics as st
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

here = Path(__file__).parent
out = here.parent / "submission-figs"
rows = [r for r in csv.DictReader(open(here / "results.csv", encoding="utf-8")) if int(r["run"]) >= 1 and r["rep"] == "typed"]
sizes = [500, 2000, 10000, 50000]
types = ["random", "hierarchical", "hubs"]

def val(n, method):
    return st.median(st.median(float(r["cullMedUs"]) for r in rows if r["n"] == str(n) and r["type"] == t and r["method"] == method) for t in types)

L = {
    "en": dict(x="Number of nodes", y="Selection time, µs (log)", m={"brute": "Brute force", "grid": "Uniform grid", "quadtree": "Quadtree"}, fmt=lambda n: f"{n:,}"),
    "ru": dict(x="Число узлов", y="Время отбора, мкс (лог.)", m={"brute": "Перебор", "grid": "Сетка", "quadtree": "Quadtree"}, fmt=lambda n: f"{n:,}".replace(",", " ")),
}
plt.rcParams.update({"font.size": 8, "font.family": "DejaVu Sans"})
for lang, t in L.items():
    fig, ax = plt.subplots(figsize=(3.0, 2.1), dpi=300)
    for m, mk in [("brute", "s--"), ("grid", "^:"), ("quadtree", "D-.")]:
        ax.plot(range(4), [val(n, m) for n in sizes], mk, color="black", markerfacecolor="white", linewidth=1, markersize=4, label=t["m"][m])
    ax.set_yscale("log"); ax.set_xticks(range(4), [t["fmt"](n) for n in sizes]); ax.set_xlabel(t["x"]); ax.set_ylabel(t["y"])
    ax.grid(True, which="both", linewidth=0.3); ax.legend(frameon=True, fontsize=6.5, loc="upper left")
    fig.tight_layout(pad=0.3); fig.savefig(out / f"fig-cull-{lang}.png"); plt.close(fig)
print("ok", [round(val(n, 'grid'), 1) for n in sizes])
