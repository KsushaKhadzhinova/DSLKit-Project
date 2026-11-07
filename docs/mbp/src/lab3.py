"""ЛР3 (МБП): EPC-модель процесса «Регистрация и управление доступом» (узел A1) сервиса DSLKit.
Правила: методичка ЛР3 (11 правил нотации EPC). Запуск: python lab3.py"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dgl import report, save_multi
from epc_lib import Epc

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ЛР3_EPC")
CX, LX = 640, 210   # главная колонка и колонка ветки ошибок
OX = 1010           # колонка объектов справа


def process():
    d = Epc("EPC Регистрация и управление доступом", 1200, 1650)
    # --- главная цепочка
    d.event("e1", CX, 60, "Пользователь открыл\nформу регистрации")
    d.oper("j1", CX, 150, "xor")
    d.func("f1", CX, 240, "Ввести данные\nрегистрации")
    d.event("e2", CX, 330, "Данные регистрации\nвведены")
    d.func("f2", CX, 420, "Проверить данные\nрегистрации")
    d.oper("s1", CX, 505, "xor")
    d.event("e3", CX, 590, "Данные корректны")
    d.func("f3", CX, 680, "Создать учётную запись")
    d.event("e4", CX, 770, "Учётная запись создана")
    d.func("f4", CX, 860, "Назначить роль\nи тариф Free")
    d.event("e5", CX, 950, "Роль и лимиты назначены")
    d.oper("a1", CX, 1035, "and")
    d.func("f5", 525, 1130, "Отправить письмо\nподтверждения", w=190)
    d.func("f6", 765, 1130, "Записать вход\nв журнал запросов", w=190)
    d.event("e6", 525, 1220, "Письмо отправлено", w=190)
    d.event("e7", 765, 1220, "Запись внесена", w=190)
    d.oper("a2", CX, 1305, "and")
    d.func("f7", CX, 1390, "Открыть доступ\nк редактору")
    d.event("e8", CX, 1480, "Доступ к редактору открыт")
    d.iface("n1", CX, 1570, "Написание и проверка\nDSL-кода (A2)")
    # --- ветка ошибок
    d.event("ee", LX, 590, "Данные некорректны", w=200)
    d.func("fe", LX, 680, "Показать ошибки\nрегистрации", w=200)
    d.event("ee2", LX, 770, "Ошибки показаны", w=200)

    # --- связи (стрелки)
    d.flow("e1", "b", "j1", "t")
    d.flow("j1", "b", "f1", "t")
    d.flow("f1", "b", "e2", "t")
    d.flow("e2", "b", "f2", "t")
    d.flow("f2", "b", "s1", "t")
    d.flow("s1", "b", "e3", "t")
    d.flow("s1", "l", "ee", "t", via=[(LX, 505)])
    d.flow("ee", "b", "fe", "t")
    d.flow("fe", "b", "ee2", "t")
    d.flow("ee2", "l", "j1", "l", via=[(40, 770), (40, 150)])
    d.flow("e3", "b", "f3", "t")
    d.flow("f3", "b", "e4", "t")
    d.flow("e4", "b", "f4", "t")
    d.flow("f4", "b", "e5", "t")
    d.flow("e5", "b", "a1", "t")
    d.flow("a1", "l", "f5", "t", via=[(525, 1035)])
    d.flow("a1", "r", "f6", "t", via=[(765, 1035)])
    d.flow("f5", "b", "e6", "t")
    d.flow("f6", "b", "e7", "t")
    d.flow("e6", "b", "a2", "l", via=[(525, 1305)])
    d.flow("e7", "b", "a2", "r", via=[(765, 1305)])
    d.flow("a2", "b", "f7", "t")
    d.flow("f7", "b", "e8", "t")
    d.flow("e8", "b", "n1", "t")

    # --- объекты и ресурсы
    d.obj("r1", 330, 240, "role", "Пользователь", w=130)
    d.obj("o1", OX, 224, "edoc", "Данные\nрегистрации", w=140, h=48)
    d.obj("o2", OX, 300, "is", "Веб-редактор\nDSLKit")
    d.obj("o3", OX, 420, "is", "Модуль\nавторизации")
    d.obj("o4", OX, 680, "db", "База\nпользователей", h=66)
    d.obj("o5", OX, 844, "edoc", "Профиль\nпользователя", w=140, h=48)
    d.obj("o6", OX, 920, "db", "Справочник\nтарифов", h=66)
    d.obj("o7", 280, 1130, "edoc", "Письмо\nподтверждения", w=140, h=48)
    d.obj("o8", OX, 1130, "db", "Журнал\nзапросов", h=66)
    d.obj("o9", OX, 1390, "is", "Веб-редактор\nDSLKit")
    d.obj("o10", 410, 680, "info", "Список\nошибок", w=120, h=46)
    d.assoc("f1", "l", "r1", "r")
    d.assoc("f1", "r", "o1", "l", sf=0.25)
    d.assoc("f1", "r", "o2", "l", via=[(830, 256), (830, 300)], sf=0.75)
    d.assoc("f2", "r", "o3", "l")
    d.assoc("f3", "r", "o4", "l")
    d.assoc("f4", "r", "o5", "l", sf=0.25)
    d.assoc("f4", "r", "o6", "l", via=[(830, 876), (830, 920)], sf=0.75)
    d.assoc("f5", "l", "o7", "r")
    d.assoc("f6", "r", "o8", "l")
    d.assoc("f7", "r", "o9", "l")
    d.assoc("fe", "r", "o10", "l")
    return d


def build(out=OUT):
    os.makedirs(out, exist_ok=True)
    a = process()
    chk = {"Регистрация и управление доступом": a.check()}
    w = a.save(os.path.join(out, "01_EPC_регистрация_и_управление_доступом"))
    return [a], w, chk


if __name__ == "__main__":
    sc, w, ch = build()
    save_multi(os.path.join(OUT, "ВСЕ_ДИАГРАММЫ_ЛР3.drawio"), sc)
    print("Проверка правил EPC:")
    for k, v in ch.items():
        print(" ", k, "OK" if not v else "")
        for m in v:
            print("    -", m)
    report(w)
