"""Дополнительные графики: время обхода графа и размер JSON, строго по results.csv и results-serialize.csv."""
import csv
import statistics as st
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

here = Path(__file__).parent
out = here.parent / "submission-figs"
rows = [r for r in csv.DictReader(open(here / "results.csv", encoding="utf-8")) if int(r["run"]) >= 1]
ser = list(csv.DictReader(open(here / "results-serialize.csv", encoding="utf-8")))
sizes = [500, 2000, 10000, 50000]
types = ["random", "hierarchical", "hubs"]

def med(key, **flt):
    return st.median(float(r[key]) for r in rows if all(r[k] == str(v) for k, v in flt.items()))

def over_types(key, n, **flt):
    return st.median(med(key, n=n, type=t, **flt) for t in types)

L = {
    "en": dict(x="Number of nodes", y="Traversal time, ms (log)", rep={"objects": "Object model", "adjacency": "Adjacency lists", "typed": "Typed arrays"},
               ys="JSON size, KB (log)", row="Row-wise JSON", col="Column-wise JSON", fmt=lambda n: f"{n:,}"),
    "ru": dict(x="Число узлов", y="Время обхода, мс (лог.)", rep={"objects": "Объекты", "adjacency": "Списки смежности", "typed": "Типизированные массивы"},
               ys="Размер JSON, КБ (лог.)", row="Строчный JSON", col="Колоночный JSON", fmt=lambda n: f"{n:,}".replace(",", " ")),
}
plt.rcParams.update({"font.size": 8, "font.family": "DejaVu Sans"})
for lang, t in L.items():
    fig, ax = plt.subplots(figsize=(3.0, 2.1), dpi=300)
    for r, mk in [("objects", "o-"), ("adjacency", "s--"), ("typed", "^:")]:
        ax.plot(range(4), [over_types("tTraverseMs", n, rep=r, method="brute") for n in sizes], mk, color="black",
                markerfacecolor="white", linewidth=1, markersize=4, label=t["rep"][r])
    ax.set_yscale("log"); ax.set_xticks(range(4), [t["fmt"](n) for n in sizes]); ax.set_xlabel(t["x"]); ax.set_ylabel(t["y"])
    ax.grid(True, which="both", linewidth=0.3); ax.legend(frameon=True, fontsize=6.5, loc="upper left")
    fig.tight_layout(pad=0.3); fig.savefig(out / f"fig-trav-{lang}.png"); plt.close(fig)

    fig, ax = plt.subplots(figsize=(3.0, 2.1), dpi=300)
    for fmt, mk, key in [("row", "o-", "row"), ("column", "^:", "col")]:
        ax.plot(range(4), [float(r["sizeKB"]) for r in ser if r["format"] == fmt], mk, color="black", markerfacecolor="white",
                linewidth=1, markersize=4, label=t[key])
    ax.set_yscale("log"); ax.set_xticks(range(4), [t["fmt"](n) for n in sizes]); ax.set_xlabel(t["x"]); ax.set_ylabel(t["ys"])
    ax.grid(True, which="both", linewidth=0.3); ax.legend(frameon=True, fontsize=6.5, loc="upper left")
    fig.tight_layout(pad=0.3); fig.savefig(out / f"fig-json-{lang}.png"); plt.close(fig)
print("ok")
