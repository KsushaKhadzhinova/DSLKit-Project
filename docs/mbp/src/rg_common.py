"""Общее для скриптов отчётов: пути проектов report-gen, запись content, копирование диаграмм."""
import os
import shutil

RG = r"E:\report-gen\projects"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DIAGRAMS = {
    "mbp-lr1": [("ЛР1_Анализ_предметной_области\\04_Организационная_структура.png", "org_structure.png"),
                ("ЛР1_Анализ_предметной_области\\01_IDEF0_A-0_контекстная.png", "idef0_a0_context.png"),
                ("ЛР1_Анализ_предметной_области\\02_IDEF0_A0_декомпозиция.png", "idef0_a0.png"),
                ("ЛР1_Анализ_предметной_области\\03_Дерево_узлов.png", "node_tree.png")],
    "mbp-lr2": [("ЛР2_BPMN\\01_BPMN_написание_и_проверка_кода.png", "bpmn_main.png"),
                ("ЛР2_BPMN\\02_BPMN_подпроцесс_проверка_кода.png", "bpmn_subprocess.png")],
    "mbp-lr3": [("ЛР3_EPC\\01_EPC_регистрация_и_управление_доступом.png", "epc_registration.png")],
    "mbp-lr4": [("ЛР4_ССП\\01_Справочники_целей_и_показателей.png", "bsc_catalog.png"),
                ("ЛР4_ССП\\02_Стратегическая_карта.png", "bsc_map.png")],
}


def w(proj, name, text):
    path = os.path.join(RG, proj, "content", name)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text.strip() + "\n")


def copy_diagrams():
    for proj, items in DIAGRAMS.items():
        os.makedirs(os.path.join(RG, proj, "diagrams"), exist_ok=True)
        for src, dst in items:
            shutil.copyfile(os.path.join(ROOT, src), os.path.join(RG, proj, "diagrams", dst))
