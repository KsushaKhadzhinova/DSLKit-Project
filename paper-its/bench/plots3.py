"""Структура времени загрузки (разбор текста и построение модели) для 50 000 узлов, по results.csv."""
import csv
import statistics as st
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

here = Path(__file__).parent
out = here.parent / "submission-figs"
rows = [r for r in csv.DictReader(open(here / "results.csv", encoding="utf-8")) if int(r["run"]) >= 1 and r["method"] == "brute" and r["n"] == "50000"]
types = ["random", "hierarchical", "hubs"]
reps = ["objects", "adjacency", "typed"]

def over_types(key, rep):
    return st.median(st.median(float(r[key]) for r in rows if r["rep"] == rep and r["type"] == t) for t in types)

parse = [over_types("tParseMs", r) for r in reps]
build = [over_types("tBuildMs", r) for r in reps]
print("parse", parse, "build", build, "share", [p / (p + b) for p, b in zip(parse, build)])
L = {
    "en": dict(reps=["Objects", "Lists", "Arrays"], parse="Text parsing", build="Model construction", y="Load time, ms"),
    "ru": dict(reps=["Объекты", "Списки", "Массивы"], parse="Разбор текста", build="Построение модели", y="Время загрузки, мс"),
}
plt.rcParams.update({"font.size": 8, "font.family": "DejaVu Sans"})
for lang, t in L.items():
    fig, ax = plt.subplots(figsize=(3.0, 2.1), dpi=300)
    ax.bar(range(3), parse, width=0.55, color="white", edgecolor="black", hatch="////", label=t["parse"])
    ax.bar(range(3), build, width=0.55, bottom=parse, color="black", edgecolor="black", label=t["build"])
    ax.set_xticks(range(3), t["reps"]); ax.set_ylabel(t["y"]); ax.grid(True, axis="y", linewidth=0.3)
    ax.legend(frameon=True, fontsize=6.5, loc="upper right"); ax.set_ylim(0, max(p + b for p, b in zip(parse, build)) * 1.35)
    fig.tight_layout(pad=0.3); fig.savefig(out / f"fig-load-{lang}.png"); plt.close(fig)
print("ok")
