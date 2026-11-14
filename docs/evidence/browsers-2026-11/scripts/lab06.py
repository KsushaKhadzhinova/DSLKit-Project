"""Lab 6 has no HTML page, it is a JSON API (port 3006, in-memory MongoDB). Writes go through the context HTTP client,
the browser opens the GET endpoints as pages (JSON viewer)."""
from playwright.sync_api import sync_playwright
from evcommon import *

BASE = "http://localhost:3006"
results = []
with sync_playwright() as p:
    for bname in BROWSERS:
        for width, height in WIDTHS:
            watch, steps, ok = Watch(), [], True
            b = launch(p, bname)
            page = b.new_context(viewport={"width": width, "height": height}).new_page()
            watch.attach(page)
            try:
                rq = page.context.request  # Playwright HTTP client of the context: the API sends CSP default-src 'none' and no CORS headers, so a page cannot call it with fetch()
                c = rq.post(BASE + "/diagrams", data={"title": f"Evidence {bname} {width}", "notation": "UML", "sourceCode": "a -> b", "priority": 1, "owner": "evidence", "tags": ["browser"]})
                did = c.json()["id"]
                steps.append(f"POST /diagrams (HTTP client, not the browser) -> {c.status}")
                steps.append(f"PATCH priority -> {rq.patch(BASE + '/diagrams/' + did, data={'priority': 2}).status}")
                steps.append(f"POST comment -> {rq.post(BASE + '/diagrams/' + did + '/comments', data={'author': 'evidence', 'text': 'works'}).status}")
                for path, shot in [("/health", None), (f"/diagrams/{did}", "one"), ("/diagrams/count", None), ("/diagrams/stats", None), ("/diagrams/abc", None), ("/diagrams", "")]:
                    resp = page.goto(BASE + path)
                    txt = page.inner_text("body").strip()
                    steps.append(f"browser GET {path.replace(did, ':id')} -> {resp.status}, {len(txt)} chars, JSON ok: {txt.startswith('{') or txt.startswith('[')}")
                    if path == "/diagrams":
                        page.screenshot(path=str(OUT / "lab-06" / f"{bname}-{width}.png"))
                    if path == f"/diagrams/{did}":
                        ok = ok and "works" in txt
                steps.append(f"DELETE -> {rq.delete(BASE + '/diagrams/' + did).status}")
            except Exception as e:
                ok = False
                steps.append("FAILED: " + str(e).splitlines()[0][:200])
            results.append({"browser": bname, "width": width, "ok": ok, "steps": steps, **watch.summary()})
            print(bname, width, ok, steps)
            b.close()
save(results, "lab-06")
