"""Собирает mockups/dslkit-100-ab-tests.html из исходников в ab-src/.
Запуск: python mockups/ab-src/build.py"""
import json
from pathlib import Path

src = Path(__file__).parent
read = lambda n: (src / n).read_text(encoding="utf-8")
questions = json.loads(read("questions.json"))
js = "\n".join(read(f) for f in ["lib.js", "p1.js", "p2.js", "p3.js", "p4.js", "p5.js"])

page = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DSLKit — 100 A/B тестов</title>
<style>
{read("lib.css")}
</style>
</head>
<body>
<header class="hd">
  <div class="hd-row">
    <div><h1>DSLKit — 100 A/B тестов интерфейса</h1><p>Кликните по макету, который нравится больше. Ответы сохраняются автоматически.</p></div>
    <div class="sp1"></div>
    <span class="hy" style="margin:0">Отвечено <b id="cnt">0 / 100</b> · A: <b id="a">0</b> · B: <b id="b">0</b></span>
    <button class="hbtn" id="todo">Только без ответа</button>
    <button class="hbtn" id="theme">☀ Светлая</button>
    <button class="hbtn" id="copy">Скопировать итог</button>
    <button class="hbtn" id="dl">Скачать .md</button>
    <button class="hbtn" id="reset">Сбросить</button>
  </div>
  <div class="pg"><i id="pg"></i></div>
</header>
<div class="lay">
  <nav class="nav" id="nav"></nav>
  <main class="ct" id="ct"></main>
</div>
<script>
const Q={json.dumps(questions, ensure_ascii=False)};
{js}
</script>
<script>
{read("app.js")}
</script>
</body>
</html>
"""
out = src.parent / "dslkit-100-ab-tests.html"
out.write_text(page, encoding="utf-8")
print(f"{out} — {len(page) // 1024} KB, вопросов: {len(questions)}")
