"""Сводка results.csv: медианы по прогонам (первый прогон отбрасывается) и графики для статьи."""
import csv
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

here = Path(__file__).parent
rows = list(csv.DictReader(open(here / "results.csv", encoding="utf-8")))
rows = [r for r in rows if int(r["run"]) >= 1]

def med(key, **flt):
    vals = [float(r[key]) for r in rows if all(r[k] == str(v) for k, v in flt.items())]
    return st.median(vals) if vals else float("nan")

def quart(key, **flt):
    vals = sorted(float(r[key]) for r in rows if all(r[k] == str(v) for k, v in flt.items()))
    return (vals[len(vals) // 4], vals[(3 * len(vals)) // 4]) if vals else (float("nan"),) * 2

sizes = [500, 2000, 10000, 50000]
types = ["random", "hierarchical", "hubs"]
reps = ["objects", "adjacency", "typed"]

# усреднение по типам графов: медиана медиан
def over_types(key, n, **flt):
    return st.median([med(key, n=n, type=t, **flt) for t in types])

lines = []
lines.append("metric,n," + ",".join(reps))
for key, name in [("memMB", "memory_MB"), ("tBuildMs", "build_ms"), ("tTraverseMs", "traverse_ms"), ("tParseMs", "parse_ms")]:
    for n in sizes:
        lines.append(f"{name},{n}," + ",".join(f"{over_types(key, n, rep=r, method='brute'):.3f}" for r in reps))
lines.append("")
lines.append("metric,n,objects_brute,typed_brute,typed_grid,typed_quadtree")
combos = [("objects", "brute"), ("typed", "brute"), ("typed", "grid"), ("typed", "quadtree")]
for key, name in [("hitMedUs", "hit_med_us"), ("hitP95Us", "hit_p95_us"), ("cullMedUs", "cull_med_us"), ("tIndexMs", "index_build_ms")]:
    for n in sizes:
        lines.append(f"{name},{n}," + ",".join(f"{over_types(key, n, rep=r, method=m):.3f}" for r, m in combos))
lines.append("")
lines.append("avg_visible_nodes_per_viewport,n,value")
for n in sizes:
    lines.append(f"avg_visible,{n},{over_types('avgVisible', n, rep='typed', method='brute'):.1f}")
lines.append("")
lines.append("hit_med_us_by_graph_type,n,type,objects_brute,typed_brute,typed_grid,typed_quadtree")
for n in [10000, 50000]:
    for t in types:
        lines.append(f"hit,{n},{t}," + ",".join(f"{med('hitMedUs', n=n, type=t, rep=r, method=m):.3f}" for r, m in combos))
(here / "summary.csv").write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines))

# графики: числа только из results.csv
plt.rcParams.update({"font.size": 8, "font.family": "DejaVu Sans"})
names = {"objects": "Object model", "adjacency": "Adjacency lists", "typed": "Typed arrays"}
marks = {"objects": "o-", "adjacency": "s--", "typed": "^:"}
fig, ax = plt.subplots(figsize=(3.0, 2.15), dpi=300)
for r in reps:
    ys = [over_types("memMB", n, rep=r, method="brute") for n in sizes]
    ax.plot(range(len(sizes)), ys, marks[r], color="black", markerfacecolor="white", label=names[r], linewidth=1, markersize=4)
ax.set_xticks(range(len(sizes)), [f"{n:,}" for n in sizes])
ax.set_xlabel("Number of nodes"); ax.set_ylabel("Model memory, MB"); ax.grid(True, linewidth=0.3)
ax.legend(frameon=True, fontsize=6.5)
fig.tight_layout(); fig.savefig(here.parent / "fig-memory.png"); plt.close(fig)

cn = {("objects", "brute"): "Brute force, objects", ("typed", "brute"): "Brute force, arrays", ("typed", "grid"): "Uniform grid", ("typed", "quadtree"): "Quadtree"}
cm = {("objects", "brute"): "o-", ("typed", "brute"): "s--", ("typed", "grid"): "^:", ("typed", "quadtree"): "D-."}
fig, ax = plt.subplots(figsize=(3.0, 2.15), dpi=300)
for c in combos:
    ys = [over_types("hitMedUs", n, rep=c[0], method=c[1]) for n in sizes]
    ax.plot(range(len(sizes)), ys, cm[c], color="black", markerfacecolor="white", label=cn[c], linewidth=1, markersize=4)
ax.set_yscale("log")
ax.set_xticks(range(len(sizes)), [f"{n:,}" for n in sizes])
ax.set_xlabel("Number of nodes"); ax.set_ylabel("Hit-test time, µs (log)"); ax.grid(True, which="both", linewidth=0.3)
ax.legend(frameon=True, fontsize=6.5)
fig.tight_layout(); fig.savefig(here.parent / "fig-hit.png"); plt.close(fig)
print("figures written")
