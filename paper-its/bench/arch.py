"""Схема конвейера под ширину колонки шаблона (7,7 см), RU и EN. Это схема, а не данные измерений."""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle

out = Path(__file__).parent.parent / "submission-figs"
out.mkdir(exist_ok=True)

L = {
    "ru": ["Текстовый\nDSL", "Парсер\nDSL", "Модель\nграфа", "Простр.\nиндекс", "Планировщик\nвидимости", "Поэтапный\nрендерер", "Слой\nвзаимодействия"],
    "en": ["Text\nDSL", "DSL\nparser", "Graph\nmodel", "Spatial\nindex", "Visibility\nscheduler", "Progressive\nrenderer", "Interaction\nlayer"],
}
FB = {"ru": "pan / zoom / выделение / перетаскивание", "en": "pan / zoom / selection / dragging"}

for lang, names in L.items():
    fig, ax = plt.subplots(figsize=(3.0, 1.75), dpi=300)
    ax.set_xlim(0, 30); ax.set_ylim(0, 17.5); ax.axis("off")
    bw, bh = 6.4, 3.6
    xs1 = [0.3, 7.9, 15.5, 23.1]
    y1 = 12.2
    xs2 = [1.4, 11.0, 20.6]
    y2 = 4.6
    boxes = []
    for i, n in enumerate(names):
        x, y = (xs1[i], y1) if i < 4 else (xs2[i - 4], y2)
        ax.add_patch(Rectangle((x, y), bw if i < 4 else 7.8, bh, fill=False, linewidth=0.45))
        ax.text(x + (bw if i < 4 else 7.8) / 2, y + bh / 2, n, ha="center", va="center", fontsize=5.6, fontweight="bold", linespacing=1.0)
        boxes.append((x, y, bw if i < 4 else 7.8))
    def arrow(p, q, style="-|>", rad=0.0):
        ax.add_patch(FancyArrowPatch(p, q, arrowstyle=style, mutation_scale=4, linewidth=0.45, color="black", connectionstyle=f"arc3,rad={rad}"))
    for i in range(3):
        arrow((boxes[i][0] + boxes[i][2], y1 + bh / 2), (boxes[i + 1][0], y1 + bh / 2))
    # из индекса вниз в планировщик
    arrow((boxes[3][0] + boxes[3][2] / 2, y1), (boxes[4][0] + boxes[4][2] / 2, y2 + bh), rad=0.0)
    for i in (4, 5):
        arrow((boxes[i][0] + boxes[i][2], y2 + bh / 2), (boxes[i + 1][0], y2 + bh / 2))
    # обратная связь от слоя взаимодействия к планировщику
    xi = boxes[6][0] + boxes[6][2] / 2
    ax.plot([xi, xi], [y2, 1.3], color="black", linewidth=0.45)
    xs = boxes[4][0] + boxes[4][2] / 2
    ax.plot([xi, xs], [1.3, 1.3], color="black", linewidth=0.45)
    arrow((xs, 1.3), (xs, y2))
    ax.text((xi + xs) / 2, 0.25, FB[lang], ha="center", va="bottom", fontsize=5.0)
    fig.subplots_adjust(0, 0, 1, 1)
    fig.savefig(out / f"fig-arch-col-{lang}.png"); plt.close(fig)
print("ok")
