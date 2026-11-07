"""Графики для статьи (ru и en) строго по results.csv; рисунки сохраняются сразу в нужном размере колонки."""
import csv
import statistics as st
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

here = Path(__file__).parent
out = here.parent / "submission-figs"
out.mkdir(exist_ok=True)
rows = [r for r in csv.DictReader(open(here / "results.csv", encoding="utf-8")) if int(r["run"]) >= 1]
sizes = [500, 2000, 10000, 50000]
types = ["random", "hierarchical", "hubs"]

def med(key, **flt):
    return st.median(float(r[key]) for r in rows if all(r[k] == str(v) for k, v in flt.items()))

def over_types(key, n, **flt):
    return st.median(med(key, n=n, type=t, **flt) for t in types)

L = {
    "en": dict(x="Number of nodes", mem="Model memory, MB", hit="Hit-test time, µs (log)",
               rep={"objects": "Object model", "adjacency": "Adjacency lists", "typed": "Typed arrays"},
               m={("objects", "brute"): "Brute force, objects", ("typed", "brute"): "Brute force, arrays",
                  ("typed", "grid"): "Uniform grid", ("typed", "quadtree"): "Quadtree"}, fmt=lambda n: f"{n:,}"),
    "ru": dict(x="Число узлов", mem="Память модели, МБ", hit="Время поиска, мкс (лог.)",
               rep={"objects": "Объекты", "adjacency": "Списки смежности", "typed": "Типизированные массивы"},
               m={("objects", "brute"): "Перебор, объекты", ("typed", "brute"): "Перебор, массивы",
                  ("typed", "grid"): "Сетка", ("typed", "quadtree"): "Quadtree"}, fmt=lambda n: f"{n:,}".replace(",", " ")),
}
plt.rcParams.update({"font.size": 8, "font.family": "DejaVu Sans"})
W, H = 3.0, 2.1  # дюймы: ширина колонки шаблона 7,7 см

for lang, t in L.items():
    fig, ax = plt.subplots(figsize=(W, H), dpi=300)
    for r, mk in [("objects", "o-"), ("adjacency", "s--"), ("typed", "^:")]:
        ax.plot(range(4), [over_types("memMB", n, rep=r, method="brute") for n in sizes], mk, color="black",
                markerfacecolor="white", linewidth=1, markersize=4, label=t["rep"][r])
    ax.set_xticks(range(4), [t["fmt"](n) for n in sizes]); ax.set_xlabel(t["x"]); ax.set_ylabel(t["mem"])
    ax.grid(True, linewidth=0.3); ax.legend(frameon=True, fontsize=6.5, loc="upper left")
    fig.tight_layout(pad=0.3); fig.savefig(out / f"fig-memory-{lang}.png"); plt.close(fig)

    fig, ax = plt.subplots(figsize=(W, H), dpi=300)
    for c, mk in [(("objects", "brute"), "o-"), (("typed", "brute"), "s--"), (("typed", "grid"), "^:"), (("typed", "quadtree"), "D-.")]:
        ax.plot(range(4), [over_types("hitMedUs", n, rep=c[0], method=c[1]) for n in sizes], mk, color="black",
                markerfacecolor="white", linewidth=1, markersize=4, label=t["m"][c])
    ax.set_yscale("log"); ax.set_xticks(range(4), [t["fmt"](n) for n in sizes]); ax.set_xlabel(t["x"]); ax.set_ylabel(t["hit"])
    ax.grid(True, which="both", linewidth=0.3); ax.legend(frameon=True, fontsize=6.5, loc="upper left")
    fig.tight_layout(pad=0.3); fig.savefig(out / f"fig-hit-{lang}.png"); plt.close(fig)
print("ok", sorted(p.name for p in out.iterdir()))
