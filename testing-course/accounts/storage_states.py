"""Session and storage behaviour: reload, cleared site data, corrupted entries, full storage, disabled storage, language switch.
Writes accounts-storage.json."""
import json
from acc_env import SEED_COUNT, TOUR_OFF, Suite, Tab, eq, main, new_ctx, run_browsers, site, yes

S = Suite("storage", "STO")

FULL_JS = """(() => { const real = Storage.prototype.setItem; window.__full = false;
  Storage.prototype.setItem = function (k, v) { if (window.__full || sessionStorage.getItem('__full') === '1') { if (!String(k).startsWith('__')) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); } return real.call(this, k, v); }; })();"""
DISABLED_JS = """(() => { for (const n of ['localStorage', 'sessionStorage']) { try { Object.defineProperty(window, n, { configurable: true, get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } }); } catch (e) {} } })();"""

PAGES = ["/", "/app/login.html", "/app/register.html", "/app/dashboard.html", "/app/editor.html?template=idef0&tl=en", "/app/settings.html", "/app/welcome.html", "/app/docs.html"]


def scenarios(name, b, base):
    sfx = name[:2]
    mail = f"s-{sfx}@example.com"
    ctx = new_ctx(b)
    t = Tab(ctx, base, S)

    def reload_keeps():
        t.register("Stan", mail)
        t.new_diagram("Persist me")
        t.dashboard()
        for _ in range(2):
            t.page.reload()
            t.page.wait_for_timeout(400)
        yes(t.user() is not None, "session lost after reload")
        yes("Persist me" in t.titles("mine"), "project lost after reload")
        t.goto("/app/editor.html", wait=300)
        t.page.reload()
        t.page.wait_for_timeout(400)
        eq(t.menu(), "user", "signed-in menu after reload in the editor:")

    S.check("01", "Reload keeps the session and the projects (dashboard and editor)", reload_keeps)

    def cleared():
        t.page.evaluate("localStorage.clear(); sessionStorage.clear()")
        ctx.clear_cookies()
        t.goto("/app/dashboard.html")
        yes("login" in t.page.url, "after clearing the site data a private page stayed open: " + t.page.url)
        t.login(mail, expect="fail")
        yes(t.page.locator("#auth-error").is_visible(), "no message when the account is gone")
        t.register("Stan again", mail)
        eq(len(t.titles("mine")), SEED_COUNT, "projects after re-registration (data is gone with the site data):")
        yes("Persist me" not in t.titles("mine"), "old project reappeared")

    S.check("02", "Clearing site data: guest again, old login fails with a message, the same email registers again with a clean state", cleared)

    def corrupt(key_suffix, payloads, label):
        def run():
            ctx2 = new_ctx(b)
            u = Tab(ctx2, base, S)
            u.register("Corr", f"corr-{sfx}-{label}@example.com")
            uid = u.user()["id"]
            key = key_suffix.replace("<id>", uid)
            orig = u.page.evaluate("(k) => localStorage.getItem(k)", key)
            try:
                for payload in payloads:
                    for path in ("/app/dashboard.html", "/app/editor.html?template=idef0&tl=en", "/app/settings.html", "/app/login.html"):
                        u.page.evaluate("([k, v]) => localStorage.setItem(k, v)", [key, payload])
                        u.errors.clear()
                        u.goto(path, wait=450)
                        yes(not u.errors, f"{label}={payload[:30]!r} on {path}: JS errors {u.errors[:2]}")
                        yes(u.page.locator("main, .app-page, body").first.is_visible(), f"{label}={payload[:30]!r}: blank page on {path}")
                        if "dashboard" in path and key_suffix not in ("dslkit.accounts", "dslkit.session"):
                            yes(u.page.locator("#project-list").count() == 1, f"{label}={payload[:30]!r}: no project list")
            finally:
                if orig is None:
                    u.page.evaluate("(k) => localStorage.removeItem(k)", key)
                else:
                    u.page.evaluate("([k, v]) => localStorage.setItem(k, v)", [key, orig])
                ctx2.close()
                t.suite.page = t.page

        return run

    bad = ["{bad json", '"a string"', "123", "null", '{"a":1}', "[1,null,{\"id\":1}]", "[]", "true", "x" * 5000]
    S.check("03", "Corrupted dslkit.accounts (8 payloads x 4 pages): no JS errors, pages render", corrupt("dslkit.accounts", bad, "accounts"))
    S.check("04", "Corrupted dslkit.session", corrupt("dslkit.session", bad, "session"))
    S.check("05", "Corrupted dslkit.projects.<id>", corrupt("dslkit.projects.<id>", bad + ['[{"id":"x","title":1,"source":"a","notation":"b","updated":1}]', '[{"id":"p1","title":"T","source":"diagram idef0 \\"T\\"","notation":"idef0","updated":"now"}]'], "projects"))
    S.check("06", "Corrupted dslkit.templates.<id>", corrupt("dslkit.templates.<id>", bad, "templates"))
    S.check("07", "Corrupted dslkit.seeded.<id>, settings, theme, dashboard, git-commits, editor-source", lambda: [corrupt(k, bad[:6], k.split(".")[1])() for k in ("dslkit.seeded.<id>", "dslkit.settings", "dslkit.theme", "dslkit.dashboard", "dslkit.git-commits", "dslkit.editor-source")])

    def tour_flag():
        for payload in (None, "{bad", '"yes"', "false", "0"):
            ctx3 = b.new_context(viewport={"width": 1280, "height": 800})
            u = Tab(ctx3, base, S)
            u.goto("/app/register.html")
            if payload is not None:
                u.page.evaluate("(v) => localStorage.setItem('dslkit.tour-done', v)", payload)
            u.errors.clear()
            u.goto("/app/editor.html?template=idef0&tl=en", wait=800)
            yes(not u.errors, f"tour flag {payload!r}: {u.errors[:2]}")
            shown = u.page.locator(".tour").count() > 0
            if payload is None:
                yes(shown, "the tour does not open for a new visitor")
                u.page.locator(".tour button", has_text="Skip").click()
                eq(u.page.evaluate("localStorage.getItem('dslkit.tour-done')"), "true", "tour flag after Skip:")
                u.page.reload()
                u.page.wait_for_timeout(500)
                eq(u.page.locator(".tour").count(), 0, "tour shows again after Skip:")
            ctx3.close()
        t.suite.page = t.page

    S.check("08", "Tour flag absent / corrupted: the tour opens for a new visitor, Skip stores the flag, no JS errors", tour_flag)

    def dangling_session():
        ctx4 = new_ctx(b)
        u = Tab(ctx4, base, S)
        u.goto("/app/register.html")
        u.page.evaluate("localStorage.setItem('dslkit.session', JSON.stringify({ userId: 'ghost' }))")
        u.goto("/app/dashboard.html")
        yes("login" in u.page.url, "a session of a missing account opened the dashboard")
        u.goto("/app/editor.html?p=missing", wait=500)
        yes("not found" in u.page.inner_text(".editor-status__saved").lower() or u.code() != "", "editor has no message for a missing project")
        ctx4.close()
        t.suite.page = t.page

    S.check("09", "Session of a deleted account and a missing project id: sent to sign-in / a clear note, not a crash", dangling_session)

    def foreign_project():
        # A opens the address of a project of B (?p=<id of B>): must not open it
        ctx5 = new_ctx(b)
        u = Tab(ctx5, base, S)
        u.register("OwnerB", f"ownb-{sfx}@example.com")
        pid = u.new_diagram("Owner B secret")
        u.logout()
        u.register("IntruderA", f"intr-{sfx}@example.com")
        u.goto(f"/app/editor.html?p={pid}", wait=600)
        yes("Owner B secret" not in u.code(), "user A opened the project of user B by its address")
        ctx5.close()
        t.suite.page = t.page

    S.check("10", "The address ?p=<id> of another user's project does not open it", foreign_project)

    # ---- full and disabled storage
    def full_signup():
        ctx6 = b.new_context(viewport={"width": 1280, "height": 800})
        ctx6.add_init_script(TOUR_OFF)
        ctx6.add_init_script(FULL_JS)
        u = Tab(ctx6, base, S)
        u.goto("/app/register.html")
        u.page.evaluate("sessionStorage.setItem('__full', '1')")
        u.errors.clear()
        u.register("Full", f"full-{sfx}@example.com", expect="fail")
        yes(u.page.locator("#auth-error").is_visible(), "sign-up with full storage shows no message")
        eq(u.page.evaluate("localStorage.getItem('dslkit.session')"), None, "session:")
        yes(not u.errors, f"JS errors {u.errors[:2]}")
        ctx6.close()
        t.suite.page = t.page

    S.check("11", "Full storage (QuotaExceededError): sign-up shows the storage message, no session, no JS error", full_signup)

    def full_work():
        ctx7 = b.new_context(viewport={"width": 1280, "height": 800})
        ctx7.add_init_script(TOUR_OFF)
        ctx7.add_init_script(FULL_JS)
        u = Tab(ctx7, base, S)
        u.register("Full2", f"full2-{sfx}@example.com")
        u.page.evaluate("sessionStorage.setItem('__full', '1')")
        u.errors.clear()
        u.goto("/app/editor.html?template=idef0&tl=en", wait=500)
        u.set_code('diagram idef0 "Lost in full storage"')
        u.page.click('[data-action="save"]')
        u.page.wait_for_timeout(600)
        note = u.page.inner_text(".editor-status__saved")
        saved_claim = "saved" in note.lower() and "not saved" not in note.lower()
        u.page.evaluate("sessionStorage.setItem('__full', '0')")
        u.dashboard()
        in_list = "Lost in full storage" in u.titles("mine")
        yes(not (saved_claim and not in_list), f"the editor says '{note}' but the project was not stored (the write failure of the project store is ignored)")
        yes(not u.errors, f"JS errors {u.errors[:2]}")
        ctx7.close()
        t.suite.page = t.page

    S.check("12", "Full storage while saving a project: the page must not claim 'Saved' when nothing was stored", full_work, "High")

    def full_settings():
        ctx8 = b.new_context(viewport={"width": 1280, "height": 800})
        ctx8.add_init_script(TOUR_OFF)
        ctx8.add_init_script(FULL_JS)
        u = Tab(ctx8, base, S)
        u.register("Full3", f"full3-{sfx}@example.com")
        u.page.evaluate("sessionStorage.setItem('__full', '1')")
        u.goto("/app/settings.html")
        u.page.locator("#guides").click()
        u.page.wait_for_timeout(400)
        toast = u.page.inner_text(".toast") if u.page.locator(".toast").count() else ""
        yes("saved" not in toast.lower() or "not" in toast.lower(), f"settings page reports '{toast}' while the storage is full")
        ctx8.close()
        t.suite.page = t.page

    S.check("13", "Full storage on the settings page: no false 'The setting is saved'", full_settings, "Low")

    def disabled():
        ctx9 = b.new_context(viewport={"width": 1280, "height": 800})
        ctx9.add_init_script(DISABLED_JS)
        u = Tab(ctx9, base, S)
        for path in PAGES:
            u.errors.clear()
            u.goto(path, wait=500)
            real = [e for e in u.errors]
            yes(not real, f"{path}: JS errors with storage disabled: {real[:2]}")
            yes(u.page.locator("body").inner_text().strip() != "", f"{path}: blank page")
        u.errors.clear()
        u.goto("/app/register.html")
        u.page.fill("#name", "Priv")
        u.page.fill("#email", f"priv-{sfx}@example.com")
        u.page.fill("#password", "test-phrase-2026")
        u.page.fill("#confirm", "test-phrase-2026")
        u.page.click("#auth-form [type=submit]")
        u.page.wait_for_timeout(900)
        yes(u.page.locator("#auth-error").is_visible() or "welcome" in u.page.url, "sign-up with disabled storage: no message")
        yes("welcome" not in u.page.url, "sign-up reported success with disabled storage")
        u.goto("/app/editor.html?template=idef0&tl=en", wait=600)
        yes(u.page.locator(".canvas__remote svg").count() == 1, "the editor does not draw a diagram without storage")
        ctx9.close()
        t.suite.page = t.page

    S.check("14", "Disabled storage (private mode simulation): every page opens, sign-up says why it fails, the editor still draws", disabled, "High")

    # ---- language switch
    def lang_switch():
        ctx10 = new_ctx(b)
        u = Tab(ctx10, base, S, lang="ru")
        u.register("Lang", f"lang-{sfx}@example.com")
        pid = u.new_diagram("Lang project")
        u.set_code('diagram idef0 "Lang project edited"')
        u.page.wait_for_timeout(200)
        u.page.locator("a[hreflang=en]").first.click()
        u.page.wait_for_url("**/en/app/editor.html*")
        u.page.wait_for_timeout(600)
        yes(f"p={pid}" in u.page.url, "the project id is lost in the language switch: " + u.page.url)
        yes("Lang project edited" in u.code(), "the unsaved edit is lost when switching language: " + u.code()[:50])
        yes(u.user() is not None, "session lost in the language switch")
        u.page.locator("a[hreflang=ru]").first.click()
        u.page.wait_for_url("**/app/editor.html*")
        u.page.wait_for_timeout(500)
        eq(u.menu(), "user", "menu after switching back:")
        # dashboard: section hash and filter
        u.goto("/app/dashboard.html#trash", lang="ru")
        u.page.locator("a[hreflang=en]").first.click()
        u.page.wait_for_timeout(500)
        yes("#trash" in u.page.url, "the section hash is lost in the language switch: " + u.page.url)
        ctx10.close()
        t.suite.page = t.page

    S.check("15", "Language switch (RU <-> EN) keeps the session, the open project, the unsaved edit and the dashboard section", lang_switch)

    t.close()
    ctx.close()


def run():
    with site() as base:
        run_browsers(lambda n, b: scenarios(n, b, base), S)
    return S.save()


if __name__ == "__main__":
    main(run)
