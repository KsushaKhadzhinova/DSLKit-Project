"""ЛР2 (МБП): BPMN-модель процесса «Написание и проверка DSL-кода» (узел A2) и подпроцесса «Проверить код».
Правила: методичка ЛР2, раздел «Рекомендации по использованию BPMN» (диаграммы для людей).
Запуск: python lab2.py"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dgl import report, save_multi
from bpmn_lib import Bpmn

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ЛР2_BPMN")


def main_process():
    d = Bpmn("BPMN Процесс", 1700, 860)
    d.pool("p1", 40, 40, 1620, 620, "Написание и проверка DSL-кода")
    d.lane("l1", 74, 40, 1586, 250, "Пользователь")
    d.lane("l2", 74, 290, 1586, 370, "Система DSLKit")
    d.pool("p2", 40, 740, 1620, 60, "Сервис рендеринга Kroki", collapsed=True)

    # --- пользователь
    d.ev("s", 160, 165, "start", "Пользователь\nоткрыл\nредактор")
    d.task("t1", 215, 130, 130, 70, "Выбрать нотацию", "user")
    d.gate("m", 380, 165, "x", "")
    d.task("t3", 450, 130, 140, 70, "Написать DSL-код", "user")
    d.ev("b", 520, 200, "bound", "Прошло\n30 минут", "timer", lpos="right", attach=True)
    d.task("t4", 660, 130, 140, 70, "Отправить код\nна проверку", "user")
    d.task("t8", 1115, 130, 130, 70, "Исправить ошибки", "user")
    # --- система
    d.task("t2", 215, 440, 130, 70, "Создать заготовку\nкода")
    d.data("d1", 280, 590, "Заготовка кода")
    d.task("t9", 450, 420, 140, 70, "Сохранить черновик")
    d.data("db2", 520, 590, "База проектов", "db")
    d.ev("e3", 700, 455, "end", "Черновик\nсохранён")
    d.gate("g1", 870, 475, "x", "Лимит тарифа\nпревышен?", lpos="left")
    d.task("t5", 800, 560, 140, 70, "Предложить\nтариф Pro")
    d.ev("e2", 1000, 595, "end", "Ввод отклонён", "terminate")
    d.task("sp", 960, 435, 140, 80, "Проверить код", sub=True)
    d.gate("g2", 1180, 475, "x", "Код допустим?", lpos="below")
    d.task("t6", 1250, 440, 170, 70, "Сохранить проверенный\nкод в проекте")
    d.data("db1", 1335, 590, "База проектов", "db")
    d.ev("e1", 1500, 475, "end", "Код передан\nна построение", "message", lpos="above")
    d.task("t7", 1115, 320, 130, 70, "Показать ошибки\nи подсказки")
    d.data("d2", 1030, 355, "Список ошибок")

    # --- потоки управления
    d.link("s", "r", "t1", "l")
    d.link("t1", "b", "t2", "t")
    d.link("t2", "r", "m", "b", via=[(380, 475)])
    d.link("m", "r", "t3", "l")
    d.link("t3", "r", "t4", "l")
    d.link("t4", "r", "g1", "t", via=[(870, 165)])
    e = d.link("g1", "b", "t5", "t", label="Да", lx=884, ly=525, align="left"); e["branch"] = True
    d.link("t5", "r", "e2", "l")
    e = d.link("g1", "r", "sp", "l", label="Нет", lx=927, ly=462, default=True); e["branch"] = True
    d.link("sp", "r", "g2", "l")
    e = d.link("g2", "r", "t6", "l", label="Да", lx=1227, ly=462); e["branch"] = True
    d.link("t6", "r", "e1", "l")
    e = d.link("g2", "t", "t7", "b", label="Нет", lx=1194, ly=428, align="left", default=True); e["branch"] = True
    d.link("t7", "t", "t8", "b")
    d.link("t8", "t", "m", "t", via=[(1180, 95), (380, 95)])
    d.link("b", "b", "t9", "t")
    d.link("t9", "r", "e3", "l")
    # --- ассоциации с данными
    d.link("t2", "b", "d1", "t", style="assoc", arrow="open")
    d.link("t7", "l", "d2", "r", style="assoc", arrow="open")
    d.link("t6", "b", "db1", "t", style="assoc", arrow="open")
    d.link("t9", "b", "db2", "t", style="assoc", arrow="open")
    # --- поток сообщений во внешний пул
    d.link("e1", "b", "p2", "t", tf=(1500 - 40) / 1620, style="msg", start="oval", label="Проверенный DSL-код", lx=1512, ly=700, align="left")
    return d


def sub_process():
    d = Bpmn("BPMN Подпроцесс", 1300, 640)
    d.pool("p1", 40, 60, 1220, 520, "Проверка кода")
    d.lane("l1", 74, 60, 1186, 520, "Система DSLKit")
    d.ev("s", 150, 310, "start", "Получен код\nна проверку")
    d.gate("a1", 240, 310, "+", "", lpos="below")
    d.task("t1", 320, 200, 150, 70, "Проверить\nсинтаксис")
    d.task("t2", 320, 350, 150, 70, "Проверить правила\nнотации")
    d.gate("a2", 560, 310, "+", "", lpos="below")
    d.gate("g", 690, 310, "x", "Ошибки\nнайдены?", lpos="below")
    d.task("t3", 780, 170, 150, 70, "Сформировать\nсписок ошибок")
    d.data("d1", 855, 310, "Список ошибок")
    d.ev("e1", 1060, 205, "end", "Код отклонён", "terminate")
    d.ev("e2", 780, 430, "end", "Код принят")
    d.link("s", "r", "a1", "l")
    d.link("a1", "t", "t1", "l", via=[(240, 235)])
    d.link("a1", "b", "t2", "l", via=[(240, 385)])
    d.link("t1", "r", "a2", "t", via=[(560, 235)])
    d.link("t2", "r", "a2", "b", via=[(560, 385)])
    d.link("a2", "r", "g", "l")
    e = d.link("g", "t", "t3", "l", via=[(690, 205)], label="Да", lx=702, ly=192, align="left"); e["branch"] = True
    e = d.link("g", "b", "e2", "l", via=[(690, 430)], label="Нет", lx=702, ly=400, align="left", default=True); e["branch"] = True
    d.link("t3", "r", "e1", "l")
    d.link("t3", "b", "d1", "t", style="assoc", arrow="open")
    return d


def build(out=OUT):
    os.makedirs(out, exist_ok=True)
    a, b = main_process(), sub_process()
    checks = {"Процесс": a.check(), "Подпроцесс": b.check()}
    w = a.save(os.path.join(out, "01_BPMN_написание_и_проверка_кода")) + b.save(os.path.join(out, "02_BPMN_подпроцесс_проверка_кода"))
    return [a, b], w, checks


if __name__ == "__main__":
    sc, w, ch = build()
    save_multi(os.path.join(OUT, "ВСЕ_ДИАГРАММЫ_ЛР2.drawio"), sc)
    print("Проверка правил BPMN:")
    for k, v in ch.items():
        print(" ", k, "OK" if not v else "")
        for m in v:
            print("    -", m)
    report(w)
