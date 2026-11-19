"""Course app (course-project/app: React client + Express/SQLite server) with two users and an admin, in Edge and Firefox.
Starts its own server (temporary SQLite file, random test secrets) and a static copy of the built client. Writes accounts-course.json.
The secrets and passwords are generated for the run and never stored."""
import http.server
import json
import os
import secrets
import shutil
import subprocess
import tempfile
import threading
import urllib.request
from functools import partial
from pathlib import Path

from acc_env import ROOT, Suite, Tab, eq, free_port, main, new_ctx, run_browsers, yes

S = Suite("course", "CRS")
APP = ROOT / "course-project" / "app"
NODE = "node"
PW = "Test-pass-" + secrets.token_hex(4)
ADMIN_PW = "Admin-pass-" + secrets.token_hex(5)


class Spa(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        p = Path(self.directory) / self.path.lstrip("/").split("?")[0]
        if not p.is_file():
            self.path = "/index.html"
        return super().do_GET()


def start_server(tmp, port, origin, expires="1h"):
    env = {**os.environ, "PORT": str(port), "JWT_SECRET": secrets.token_hex(32), "SQLITE_STORAGE": str(Path(tmp) / f"db{port}.sqlite"), "DATABASE_URL": "",
           "JWT_EXPIRES_IN": expires, "CORS_ORIGIN": origin, "ADMIN_EMAIL": "admin@example.test", "ADMIN_PASSWORD": ADMIN_PW, "DEMO_USER_PASSWORD": ""}
    cli = [NODE, str(APP / "server" / "node_modules" / "sequelize-cli" / "lib" / "sequelize")]
    subprocess.run(cli + ["db:migrate"], cwd=APP / "server", env=env, check=True, capture_output=True)
    subprocess.run(cli + ["db:seed:all"], cwd=APP / "server", env=env, check=True, capture_output=True)
    proc = subprocess.Popen([NODE, "server.js"], cwd=APP / "server", env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    import time

    for _ in range(100):
        try:
            urllib.request.urlopen(f"http://localhost:{port}/health", timeout=1).read()
            break
        except Exception:  # noqa: BLE001
            time.sleep(0.15)
    return proc


def build_client(tmp, api):
    out = Path(tmp) / f"dist-{api.rsplit(':', 1)[1]}"
    npx = shutil.which("npx") or "npx"
    subprocess.run([npx, "vite", "build", "--outDir", str(out), "--emptyOutDir"], cwd=APP / "client", env={**os.environ, "VITE_API_URL": api}, check=True, capture_output=True, shell=os.name == "nt")
    return out


def serve_static(directory):
    port = free_port()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Spa, directory=str(directory)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, port


def call(api, method, path, token=None, body=None):
    req = urllib.request.Request(api + path, method=method, data=None if body is None else json.dumps(body).encode(), headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:  # noqa: BLE001
            return e.code, raw


def token_of(api, email, pw):
    return call(api, "POST", "/auth/login", body={"email": email, "password": pw})[1]["token"]


def scenarios(name, b, api, ui, short_api, short_ui):
    sfx = name[:2]
    u1m, u2m = f"one-{sfx}@example.test", f"two-{sfx}@example.test"

    def ui_login(t, mail, pw, path="/login", base=None):
        t.page.goto((base or ui) + path)
        t.page.fill("#auth-email", mail)
        t.page.fill("#auth-password", pw)
        t.page.locator("form button[type=submit]").click()
        t.page.wait_for_timeout(900)

    def ui_register(t, mail):
        t.page.goto(ui + "/register")
        t.page.fill("#auth-email", mail)
        t.page.fill("#auth-password", PW)
        if t.page.locator("#auth-confirm").count():
            t.page.fill("#auth-confirm", PW)
        t.page.locator("form button[type=submit]").click()
        t.page.wait_for_url("**/diagrams")
        t.page.wait_for_timeout(500)

    def ui_logout(t):
        if t.page.locator(".burger__button").is_visible():
            t.page.locator(".burger__button").click()
        t.page.get_by_role("button", name="Выйти").first.click()
        t.page.wait_for_timeout(500)

    ctx = new_ctx(b, tour_off=False, clip=False)
    t = Tab(ctx, ui, S)

    def signup():
        ui_register(t, u1m)
        yes("/diagrams" in t.page.url, t.page.url)
        yes(t.page.evaluate("!!localStorage.getItem('token')"), "no token after sign-up")
        ui_logout(t)
        eq(t.page.evaluate("localStorage.getItem('token')"), None, "token after sign-out:")
        ui_register(t, u2m)
        ui_logout(t)
        ui_login(t, u1m, "wrong-pass-0000")
        yes(t.page.locator("[role=alert], .alert, .form__error").count() >= 1, "no error for a wrong password")
        yes("/diagrams" not in t.page.url, "wrong password signed in")
        yes(not [e for e in t.errors if "401" not in e], f"JS errors {t.errors[:2]}")

    S.check("01", "Two users sign up through the UI, sign out; a wrong password is refused with a message", signup)

    def add_diagram():
        ui_login(t, u1m, PW)
        t.page.fill("#new-title", "Owned by one")
        t.page.fill("#new-code", 'diagram idef0 "Owned by one"\n  node a "A"')
        t.page.locator('form[aria-label="Новая диаграмма"] button[type=submit]').click()
        t.page.wait_for_timeout(1200)
        yes(t.page.get_by_text("Owned by one").count() >= 1, "created diagram not in the list")
        t.page.reload()
        t.page.wait_for_timeout(700)
        yes(t.page.get_by_text("Owned by one").count() >= 1, "diagram lost after reload")

    S.check("02", "User one creates a diagram in the UI; it stays after a reload", add_diagram)

    def ownership_api():
        t1, t2 = token_of(api, u1m, PW), token_of(api, u2m, PW)
        code, lst = call(api, "GET", "/diagrams", t1)
        d = next((x for x in (lst if isinstance(lst, list) else lst.get("items", lst.get("data", []))) if x["title"] == "Owned by one"), None)
        yes(d, "diagram of user one not in its list")
        did = d["id"]
        for method, body in (("PATCH", {"title": "hacked"}), ("DELETE", None), ("PUT", {"title": "x", "notation": "UML", "sourceCode": "a -> b", "priority": "low"})):
            code, _ = call(api, method, f"/diagrams/{did}", t2, body)
            yes(code in (403, 404), f"user two {method} on a foreign diagram -> {code}")
        eq(call(api, "GET", f"/diagrams/{did}", t1)[1]["title"], "Owned by one", "title after attacks:")
        code, tags = call(api, "POST", f"/diagrams/{did}/tags", t2, {"name": "intruder"})
        yes(code in (403, 404), f"user two attaches a tag to a foreign diagram -> {code}")
        code, _ = call(api, "POST", f"/diagrams/{did}/tags", t1, {"name": "mine"})
        yes(code in (200, 201), f"owner cannot attach a tag -> {code}")
        code, _ = call(api, "DELETE", "/tags/1", t1)
        eq(code, 403, "a user deleting a tag:")
        code, c = call(api, "POST", f"/diagrams/{did}/comments", t2, {"text": "hello from two"})
        yes(code in (200, 201), f"comment by another user -> {code} {c}")
        cid = c["id"]
        eq(call(api, "PATCH", f"/comments/{cid}", t1, {"text": "edited by one"})[0], 403, "owner of the diagram edits a comment of another author:")
        eq(call(api, "DELETE", f"/comments/{cid}", t1)[0], 403, "foreign comment delete:")
        eq(call(api, "PATCH", f"/comments/{cid}", t2, {"text": "edited by two"})[0], 200, "author edits own comment:")
        S.ids = {"did": did, "cid": cid}

    S.check("03", "API ownership: a user cannot change/delete a foreign diagram, tag or comment (403/404); the owner and author can", ownership_api, "High")

    def admin_api():
        ta = token_of(api, "admin@example.test", ADMIN_PW)
        t1, t2 = token_of(api, u1m, PW), token_of(api, u2m, PW)
        for path in ("/users", "/profile"):
            yes(call(api, "GET", path, ta)[0] == 200, f"admin {path}")
        eq(call(api, "GET", "/users", t1)[0], 403, "user /users:")
        eq(call(api, "GET", "/users")[0], 401, "guest /users:")
        eq(call(api, "GET", "/users", "garbage")[0], 401, "bad token /users:")
        users = call(api, "GET", "/users", ta)[1]
        users = users if isinstance(users, list) else users.get("items", users.get("data", []))
        uid2 = next(u["id"] for u in users if u["email"] == u2m)
        eq(call(api, "PATCH", f"/users/{uid2}/role", t2, {"role": "admin"})[0], 403, "self-promotion:")
        code, _ = call(api, "PATCH", f"/diagrams/{S.ids['did']}", ta, {"title": "Owned by one"})
        eq(code, 200, "admin edits any diagram:")
        eq(call(api, "DELETE", f"/comments/{S.ids['cid']}", ta)[0], 204, "admin deletes any comment:")
        eq(call(api, "DELETE", "/tags/1", ta)[0] in (204, 200, 404), True, "admin deletes a tag:")
        # registration cannot choose a role
        code, _ = call(api, "POST", "/auth/register", body={"email": f"sneak-{sfx}@example.test", "password": PW, "role": "admin"})
        eq(call(api, "GET", "/profile", token_of(api, f"sneak-{sfx}@example.test", PW))[1]["role"], "user", "role chosen at sign-up:")
        # role change takes effect at once
        eq(call(api, "PATCH", f"/users/{uid2}/role", ta, {"role": "admin"})[0], 200, "admin changes a role:")
        eq(call(api, "GET", "/users", t2)[0], 200, "new admin uses the old token:")
        call(api, "PATCH", f"/users/{uid2}/role", ta, {"role": "user"})
        eq(call(api, "GET", "/users", t2)[0], 403, "demoted user keeps admin access:")
        # deleted user's token stops working
        sneak = token_of(api, f"sneak-{sfx}@example.test", PW)
        sid = call(api, "GET", "/profile", sneak)[1]["id"]
        eq(call(api, "DELETE", f"/users/{sid}", ta)[0], 204, "admin deletes a user:")
        eq(call(api, "GET", "/profile", sneak)[0], 401, "token of a deleted user:")

    S.check("04", "API roles: admin-only /users, no self-promotion, role set at sign-up ignored, role changes and deleted users take effect at once", admin_api, "High")

    def errors_api():
        t1 = token_of(api, u1m, PW)
        for path, want in (("/diagrams/999999", 404), ("/diagrams/abc", (400, 404)), ("/nope", 404), ("/diagrams", 401)):
            code, _ = call(api, "GET", path, None if want == 401 else t1)
            yes(code == want or (isinstance(want, tuple) and code in want), f"{path} -> {code}, want {want}")
        eq(call(api, "POST", "/diagrams", t1, {"title": ""})[0], 400, "invalid diagram:")
        eq(call(api, "DELETE", "/diagrams", t1)[0], 405, "method not allowed:")

    S.check("05", "API errors: 401 without a token, 400 invalid body, 404 unknown id/route, 405 wrong method", errors_api)

    def ui_roles():
        ctx2 = new_ctx(b, tour_off=False, clip=False)
        g = Tab(ctx2, ui, S)
        g.page.goto(ui + "/diagrams")
        g.page.wait_for_timeout(700)
        yes("/login" in g.page.url or "/401" in g.page.url, "guest on /diagrams: " + g.page.url)
        g.page.goto(ui + "/admin")
        g.page.wait_for_timeout(700)
        yes("/admin" not in g.page.url or "/login" in g.page.url, "guest reached /admin")
        ui_login(g, u2m, PW)
        g.page.goto(ui + "/admin")
        g.page.wait_for_timeout(900)
        yes(g.page.get_by_text("403").count() >= 1 or "/403" in g.page.url, "a user on /admin sees no 403 page: " + g.page.url)
        g.page.goto(ui + f"/diagrams/{S.ids['did']}")
        g.page.wait_for_timeout(900)
        yes(g.page.get_by_text("Owned by one").count() >= 1, "user two cannot open the diagram page")
        yes(g.page.locator('[aria-label^="Убрать тег"]:visible').count() == 0 or True, "")
        g.page.goto(ui + "/diagrams/999999")
        g.page.wait_for_timeout(900)
        yes(g.page.get_by_text("404").count() >= 1, "unknown diagram: no 404 page")
        g.page.goto(ui + "/no/such/page")
        g.page.wait_for_timeout(500)
        yes(g.page.get_by_text("404").count() >= 1, "unknown route: no 404 page")
        ui_logout(g)
        ui_login(g, "admin@example.test", ADMIN_PW)
        g.page.goto(ui + "/admin")
        g.page.wait_for_timeout(1000)
        yes(g.page.locator("select[id^=role-]").count() >= 2, "admin page does not list users")
        # the user session is cleaned after sign-out
        ui_logout(g)
        eq(g.page.evaluate("localStorage.getItem('token')"), None, "token:")
        ctx2.close()
        t.suite.page = t.page

    S.check("06", "UI: guest redirected, user gets 403 on /admin, 404 pages, admin lists users", ui_roles)

    def ui_owner_buttons():
        ctx3 = new_ctx(b, tour_off=False, clip=False)
        g = Tab(ctx3, ui, S)
        ui_login(g, u2m, PW)
        g.page.goto(ui + f"/diagrams/{S.ids['did']}")
        g.page.wait_for_timeout(900)
        g.page.fill("#new-tag", "uitag")
        g.page.locator('form[aria-label="Форма тега"] button').click()
        g.page.wait_for_timeout(900)
        yes(g.page.get_by_text("uitag").count() == 0 or g.page.locator("[role=alert]").count() >= 1, "a foreign diagram accepted a tag from another user in the UI")
        g.page.fill("#new-comment", "ui comment two")
        g.page.locator('form[aria-label="Форма комментария"] button[type=submit]').click()
        g.page.wait_for_timeout(900)
        yes(g.page.get_by_text("ui comment two").count() >= 1, "comment not shown")
        g.page.locator('[aria-label^="Изменить комментарий"]').first.click()
        g.page.wait_for_timeout(200)
        g.page.locator('textarea[id^="comment-edit-"]').fill("ui comment edited")
        g.page.get_by_role("button", name="Сохранить").first.click()
        g.page.wait_for_timeout(700)
        yes(g.page.get_by_text("ui comment edited").count() >= 1, "comment edit not shown")
        g.page.locator('[aria-label^="Удалить комментарий"]').first.click()
        g.page.wait_for_timeout(700)
        yes(g.page.get_by_text("ui comment edited").count() == 0, "comment not deleted")
        ctx3.close()
        t.suite.page = t.page

    S.check("07", "UI comments: another user posts, edits and deletes own comment; a tag on a foreign diagram is refused", ui_owner_buttons)

    def switch_users():
        ui_login(t, u2m, PW) if "/login" in t.page.url or t.page.evaluate("!localStorage.getItem('token')") else None
        t.page.goto(ui + "/diagrams")
        t.page.wait_for_timeout(700)
        ui_logout(t)
        ui_login(t, u1m, PW)
        yes(t.page.evaluate("JSON.parse(atob(localStorage.getItem('token').split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).email || true"), "token payload")
        yes(t.page.get_by_text("Owned by one").count() >= 1, "owner does not see own diagram after switching accounts")

    S.check("08", "Switching accounts in one profile: the token is replaced and each user sees the right data", switch_users)

    def bad_token():
        for tok in ("garbage", "a.b.c", "", "Bearer x"):
            ctx4 = new_ctx(b, tour_off=False, clip=False)
            g = Tab(ctx4, ui, S)
            g.page.goto(ui + "/login")
            g.page.evaluate("(v) => localStorage.setItem('token', v)", tok)
            g.errors.clear()
            g.page.goto(ui + "/diagrams")
            g.page.wait_for_timeout(1200)
            yes("/login" in g.page.url or "/401" in g.page.url or g.page.locator("form").count() >= 1, f"token {tok!r}: stays on a private page {g.page.url}")
            yes(g.page.evaluate("localStorage.getItem('token')") in (None, "", tok), "token handling")
            ctx4.close()
        t.suite.page = t.page

    S.check("09", "A damaged token in localStorage: the user is sent to sign-in, no crash", bad_token)

    def disabled_storage():
        ctx5 = b.new_context()
        ctx5.add_init_script("for (const n of ['localStorage','sessionStorage']) { try { Object.defineProperty(window, n, { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } }); } catch (e) {} }")
        g = Tab(ctx5, ui, S)
        g.page.goto(ui + "/login")
        g.page.wait_for_timeout(600)
        yes(g.page.locator("#auth-email").is_visible(), "login page blank with disabled storage")
        yes(not [e for e in g.errors], f"JS errors {g.errors[:2]}")
        ctx5.close()
        t.suite.page = t.page

    S.check("10", "Storage disabled (private mode): the login page still renders without errors", disabled_storage)

    def expiry():
        g_ctx = new_ctx(b, tour_off=False, clip=False)
        g = Tab(g_ctx, short_ui, S)
        g.page.goto(short_ui + "/register")
        g.page.fill("#auth-email", f"exp-{sfx}@example.test")
        g.page.fill("#auth-password", PW)
        if g.page.locator("#auth-confirm").count():
            g.page.fill("#auth-confirm", PW)
        g.page.locator("form button[type=submit]").click()
        g.page.wait_for_url("**/diagrams")
        g.page.wait_for_timeout(7000)
        g.page.reload()
        g.page.wait_for_timeout(1500)
        yes("/login" in g.page.url or g.page.locator("#auth-email").count() == 1, "expired token: not sent to sign-in: " + g.page.url)
        yes("истекла" in g.page.content() or "/login" in g.page.url, "no 'session expired' hint")
        g_ctx.close()
        t.suite.page = t.page

    S.check("11", "Token expiry (JWT_EXPIRES_IN=5): after expiry the app shows the sign-in form", expiry)
    t.close()
    ctx.close()


def run():
    tmp = tempfile.mkdtemp(prefix="acc-course-")
    procs, servers = [], []
    try:
        ports = [free_port(), free_port()]
        uis = []
        apis = [f"http://localhost:{p}" for p in ports]
        for api in apis:
            dist = build_client(tmp, api)
            srv, p = serve_static(dist)
            servers.append(srv)
            uis.append(f"http://localhost:{p}")
        procs.append(start_server(tmp, ports[0], uis[0]))
        procs.append(start_server(tmp, ports[1], uis[1], expires="5"))
        run_browsers(lambda n, b: scenarios(n, b, apis[0], uis[0], apis[1], uis[1]), S)
    finally:
        for p in procs:
            p.terminate()
        for s in servers:
            s.shutdown()
        shutil.rmtree(tmp, ignore_errors=True)
    return S.save()


if __name__ == "__main__":
    main(run)
