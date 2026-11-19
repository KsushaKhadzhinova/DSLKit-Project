"""AI panels (no key, fake OpenAI-compatible server, errors/garbage), offline mode (service worker), 390 px mobile flow.
Writes accounts-ai.json. The fake provider is a tiny local HTTP server; the key is the fake string below."""
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from acc_env import SEED_COUNT, Suite, Tab, api_get, eq, free_port, main, new_ctx, run_browsers, site, yes

S = Suite("ai", "AIO")
FAKE_KEY = "fake-test-key-0000"
MODE = {"v": "ok"}
CODE = 'diagram idef0 "AI made"\n  node a "A"\n'


class Fake(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        self.rfile.read(int(self.headers.get("content-length") or 0))
        m = MODE["v"]
        if m == "hang":
            time.sleep(4)
            self.close_connection = True
            return
        if m == "drop":
            self.connection.close()
            return
        code, body = 200, {"choices": [{"message": {"content": "```\n" + CODE + "```"}}]}
        if m == "500":
            code, body = 500, {"error": "boom " + FAKE_KEY}
        elif m == "429":
            code, body = 429, {"error": "slow down"}
        elif m == "empty":
            body = {"choices": []}
        raw = b"<<<not json>>>" if m == "garbage" else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def post(base, text="a shop sells goods"):
    import urllib.request

    req = urllib.request.Request(base + "/api/ai/generate", data=json.dumps({"mode": "idea", "text": text, "lang": "en"}).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode()
    except Exception as e:  # noqa: BLE001
        if hasattr(e, "code"):
            return e.code, e.read().decode()
        return 0, str(e)


def ai_scenarios(name, b, nokey, keyed):
    sfx = name[:2]
    ctx = new_ctx(b)
    t = Tab(ctx, nokey, S)

    def review_ai_visible(tab, expect):
        tab.goto("/app/editor.html?template=idef0&tl=en", wait=500)
        tab.click_hidden("[data-review-open]")
        tab.page.wait_for_timeout(900)
        shown = tab.page.locator(".review__actions button:visible").count()
        eq(shown == 2, expect, "AI button shown:")

    def nokey_check():
        t.register("NoKey", f"nk-{sfx}@example.com")
        status, body = api_get(nokey + "/api/ai/status")
        yes(json.loads(body).get("available") is False, "status without key: " + body[:80])
        review_ai_visible(t, False)
        yes(not t.errors, f"JS errors {t.errors[:2]}")
        code, body = post(nokey)
        yes(code in (503, 400, 429) and FAKE_KEY not in body, f"generate without key: {code} {body[:80]}")

    S.check("01", "AI without a key: status says unavailable, the AI button is hidden, the rules-based review works, the API answers 503", nokey_check)

    ctx2 = new_ctx(b)
    k = Tab(ctx2, keyed, S)
    k.register("Keyed", f"kk-{sfx}@example.com")

    def ok_mode():
        MODE["v"] = "ok"
        review_ai_visible(k, True)
        k.page.locator(".review__actions button:visible").nth(1).click()
        k.page.wait_for_timeout(1500)
        txt = k.page.inner_text(".review__status")
        yes("failed" not in txt.lower() and "unavailable" not in txt.lower(), "AI ok mode status: " + txt)
        code, body = post(keyed)
        yes(code == 200 and "AI made" in body, f"api ok: {code} {body[:120]}")

    S.check("02", "Fake provider answering correctly: AI button appears and the review/generate answers with code", ok_mode)

    def bad_modes():
        for m in ("500", "429", "garbage", "empty", "drop"):
            MODE["v"] = m
            k.errors.clear()
            review_ai_visible(k, True)
            k.page.locator(".review__actions button:visible").nth(1).click()
            k.page.wait_for_timeout(2500)
            yes(k.page.locator(".review__status").inner_text() != "", f"{m}: no status")
            yes(k.page.locator(".review__actions button").first.is_enabled(), f"{m}: panel stuck busy")
            yes(k.page.locator("[aria-busy=true]").count() == 0, f"{m}: still busy")
            yes(not k.errors, f"{m}: JS errors {k.errors[:2]}")
            code, body = post(keyed)
            yes(code >= 400 and code < 600 and FAKE_KEY not in body, f"{m}: api {code} {body[:100]}")
            yes("<<<" not in body, f"{m}: provider garbage is passed through: {body[:80]}")
        MODE["v"] = "ok"

    S.check("03", "Provider errors (500, 429, garbage, empty, dropped connection): UI shows a failure, never stays busy, no JS error, key never leaked", bad_modes)

    def slow():
        MODE["v"] = "hang"
        review_ai_visible(k, True)
        k.page.locator(".review__actions button:visible").nth(1).click()
        k.page.wait_for_timeout(600)
        yes(k.page.locator(".review__actions button").nth(1).is_disabled(), "no busy state during a slow answer")
        k.page.wait_for_timeout(6000)
        yes(k.page.locator(".review__actions button").nth(1).is_enabled(), "busy state never ends")
        MODE["v"] = "ok"

    S.check("04", "Slow provider: the button is disabled while waiting and enabled again after the failure", slow)

    def guest_ai():
        c3 = new_ctx(b)
        g = Tab(c3, keyed, S)
        review_ai_visible(g, True)
        c3.close()
        k.suite.page = k.page

    S.check("05", "AI panel for a guest works the same as for a signed-in user (server-side key)", guest_ai)

    def other_clients():
        # clarify panel and automation wizard open without errors with and without a key
        for base_, label in ((nokey, "no key"), (keyed, "key")):
            c4 = new_ctx(b)
            u = Tab(c4, base_, S)
            u.goto("/app/editor.html?template=idef0&tl=en", wait=500)
            u.errors.clear()
            u.click_hidden("[data-clarify-open]")
            u.page.wait_for_timeout(800)
            yes(not u.errors, f"{label}: clarify panel errors {u.errors[:2]}")
            c4.close()
        k.suite.page = k.page

    S.check("06", "Clarify panel opens without errors with and without a key", other_clients)
    ctx2.close()
    ctx.close()


def offline_mobile(name, b, base):
    sfx = name[:2]

    def offline():
        ctx = new_ctx(b)
        u = Tab(ctx, base, S)
        u.register("Off", f"off-{sfx}@example.com")
        pid = u.new_diagram("Offline project")
        for p in ("/app/dashboard.html", f"/app/editor.html?p={pid}", "/app/settings.html", "/app/docs.html"):
            u.goto(p, wait=400)
        u.page.evaluate("navigator.serviceWorker.ready.then(() => 1)")
        u.page.reload()
        u.page.wait_for_timeout(1500)
        yes(u.page.evaluate("!!navigator.serviceWorker.controller"), "the page is not controlled by the service worker after reload")
        ctx.set_offline(True)
        try:
            for p, marker in (("/app/dashboard.html", "Offline project"), (f"/app/editor.html?p={pid}", "Offline project")):
                u.goto(p, wait=900)
                yes(marker in u.page.content() or marker in u.code(), f"offline: {p} did not open with the saved project")
            u.goto("/app/settings.html", wait=500)
            yes(u.page.locator(".settings").count() == 1, "offline: settings not shown")
            u.goto("/app/docs.html", wait=500)
            yes(u.page.locator("[data-docs-kind]").count() >= 1, "offline: docs not shown")
            u.goto("/app/editor.html?template=idef0&tl=en", wait=700)
            yes(u.page.locator(".canvas__remote svg").count() == 1, "offline: editor does not draw")
            # an offline save works (the data is local)
            u.set_code('diagram idef0 "Saved offline"')
            u.page.click('[data-action="save"]')
            u.page.wait_for_timeout(400)
            yes("p=" in u.page.url, "offline: save failed")
            u.logout()
            yes(u.session() is None, "offline: sign-out failed")
            u.login(f"off-{sfx}@example.com")
            yes(u.user() is not None, "offline: sign-in failed")
            r = u.page.goto(u.url("/privacy.html"), wait_until="domcontentloaded")
            yes(r is not None, "offline: an uncached page gives no answer at all")
        finally:
            ctx.set_offline(False)
        yes(not [e for e in u.errors if "Failed" not in e and "fetch" not in e.lower()], f"JS errors {u.errors[:2]}")
        ctx.close()

    S.page = None
    S.check("07", "Offline (service worker): dashboard, editor, settings, docs open, saving, sign-out and sign-in work", offline)

    def mobile():
        ctx = new_ctx(b, viewport={"width": 390, "height": 844}, is_mobile=False)
        u = Tab(ctx, base, S)

        def no_hscroll(label):
            w = u.page.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
            yes(w[0] <= w[1] + 1, f"{label}: horizontal scroll {w}")

        u.goto("/", wait=500)
        no_hscroll("home")
        u.register("Mob", f"mob-{sfx}@example.com")
        no_hscroll("welcome")
        u.page.locator(".template-card__link").first.click()
        u.page.wait_for_url("**/editor.html?template=*")
        u.page.wait_for_timeout(700)
        no_hscroll("editor")
        u.set_code('diagram idef0 "Phone diagram"')
        u.page.wait_for_timeout(300)
        saved = u.page.locator('[data-action="save"]:visible')
        if saved.count() == 0 and u.page.locator(".burger__button").is_visible():
            u.page.locator(".burger__button").click()
        u.page.evaluate('document.querySelector(\'[data-action="save"]\').click()')
        u.page.wait_for_timeout(500)
        yes("p=" in u.page.url, "phone: first diagram is not saved: " + u.page.url)
        u.goto("/app/dashboard.html", wait=500)
        no_hscroll("dashboard")
        yes("Phone diagram" in u.titles("mine"), "phone: saved diagram not in the list")
        u.goto("/app/login.html")
        no_hscroll("login")
        yes(u.page.locator("#email").is_visible(), "phone: login form not visible")
        u.goto("/app/dashboard.html")
        u.page.locator(".burger__button").click() if u.page.locator(".burger__button").is_visible() else None
        yes(u.page.locator("[data-auth-logout]:visible").count() >= 1, "phone: no sign-out in the menu")
        u.logout()
        yes(u.session() is None, "phone: sign-out failed")
        ctx.close()

    S.check("08", "390 px phone: sign-up -> template -> first saved diagram -> list -> sign-out, no horizontal scroll", mobile)


def run():
    with site(env={'AI_API_KEY': '', 'ANTHROPIC_API_KEY': '', 'AI_PROVIDER': ''}) as plain:
        fake_port = free_port()
        srv = ThreadingHTTPServer(("127.0.0.1", fake_port), Fake)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        env = {"AI_PROVIDER": "openai", "AI_API_KEY": FAKE_KEY, "AI_BASE_URL": f"http://127.0.0.1:{fake_port}", "AI_MODEL": "fake-model"}
        with site(env=env) as keyed:

            def go(n, b):
                ai_scenarios(n, b, plain, keyed)
                offline_mobile(n, b, plain)

            run_browsers(go, S)
        srv.shutdown()
    return S.save()


if __name__ == "__main__":
    main(run)
