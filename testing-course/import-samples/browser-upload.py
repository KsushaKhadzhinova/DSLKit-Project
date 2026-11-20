"""Uploads every sample through the editor file input in Edge and Firefox (python playwright) and prints one row per file:
the code of the editor after the import and the status line of the problems. Usage: python browser-upload.py http://localhost:5199"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
here = Path(__file__).parent
SIGN_IN = """() => { try { if (localStorage.getItem('dslkit.accounts') === null) {
  localStorage.setItem('dslkit.accounts', JSON.stringify([{ id: 'e2e0000000000001', name: 'Test User', email: 'e2e@example.com', salt: '00', hash: '00', iterations: 1, role: 'user' }]));
  localStorage.setItem('dslkit.session', JSON.stringify({ userId: 'e2e0000000000001' }));
  localStorage.setItem('dslkit.seeded.e2e0000000000001', 'true'); localStorage.setItem('dslkit.tour-done', '1'); } } catch (e) {} }"""
FILES = [f.name for f in sorted(here.iterdir()) if f.suffix in {".dot", ".svg", ".mmd", ".puml", ".drawio", ".xml", ".bpmn", ".uml", ".xmi", ".graphml", ".gexf", ".excalidraw", ".csv", ".tsv", ".vdx", ".vsdx"} and not f.name.endswith(".out.dot")]
code = "[...document.querySelectorAll('.code__line code')].map(e=>e.textContent).join('\n')"
with sync_playwright() as p:
    for name, launcher in (("edge", lambda: p.chromium.launch(channel="msedge")), ("firefox", lambda: p.firefox.launch())):
        try:
            b = launcher()
        except Exception as e:
            print(name, "NOT AVAILABLE", str(e)[:80]); continue
        for f in FILES:
            ctx = b.new_context(viewport={"width": 1366, "height": 900})
            ctx.add_init_script("(" + SIGN_IN + ")()")
            pg = ctx.new_page(); pg.set_default_timeout(8000)
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            try:
                pg.goto(base + "/editor.html"); pg.wait_for_timeout(600)
                pg.evaluate("document.querySelectorAll('details.editor-menu').forEach(d => d.open = true)")
                pg.set_input_files(".editor-import__file", str(here / f)); pg.wait_for_timeout(1500)
                text = pg.evaluate(code)
                head = text.split("\n")[0][:40]
                status = pg.inner_text(".problems__status").replace("\n", " ")[:70]
                print(f"{name:8}{f:40} lines={len(text.splitlines()):3} head={head!r} status={status!r} pageerrors={len(errs)}")
            except Exception as e:
                print(f"{name:8}{f:40} ERROR {str(e)[:80]}")
            ctx.close()
        b.close()
