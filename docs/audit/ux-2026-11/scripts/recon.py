"""Reconnaissance: list the visible controls of the main pages as a guest and as a signed-in user."""
import sys
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5391"
LIST = """() => [...document.querySelectorAll('a,button,input,select,textarea,summary')].filter(e=>e.offsetParent).map(e=>e.tagName+' '+(e.getAttribute('href')||e.type||'')+' | '+((e.innerText||e.getAttribute('aria-label')||e.placeholder||'').trim().slice(0,50))+' | '+(e.id||e.getAttribute('data-action')||e.className||'').toString().slice(0,40)).join('\\n')"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    c = b.new_context(viewport={"width": 1366, "height": 900}, locale="ru-RU")
    pg = c.new_page()
    for u in ["", "app/welcome.html", "app/login.html", "app/register.html", "app/dashboard.html", "app/editor.html", "app/settings.html", "app/docs.html"]:
        pg.goto(f"{base}/{u}")
        pg.wait_for_timeout(700)
        print("=====", u, "->", pg.url, "|", pg.title())
        print(pg.evaluate(LIST))
    b.close()
