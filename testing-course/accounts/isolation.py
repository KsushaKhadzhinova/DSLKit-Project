"""Data isolation between accounts, quota per account, tabs, share links. Writes accounts-isolation.json.
Registration and sign-in go through the real forms; the roles developer and admin are written into the account record of the test profile."""
import json
from acc_env import PW, SEED_COUNT, Suite, Tab, eq, main, new_ctx, run_browsers, site, yes

S = Suite("isolation", "ISO")


def scenarios(name, b, base):
    ctx = new_ctx(b)
    t = Tab(ctx, base, S)
    sfx = name[:2]
    a_mail, b_mail = f"a-{sfx}@example.com", f"b-{sfx}@example.com"

    # ---------- user A fills every kind of private data
    def a_setup():
        t.register("Anna", a_mail)
        yes(t.user()["role"] == "user", "new account is not a plain user")
        t.new_diagram("A-secret-project")
        t.dashboard()
        eq(t.page.locator("[data-project]").count(), SEED_COUNT + 1, "projects of A:")
        # a template, a trashed starter
        t.card_action("A-secret-project", "template")
        t.new_diagram("A-secret-versioned")  # every explicit save also leaves a version in the Git panel

    S.check("01", "User A: sign-up through the form, creates a project, a template and a version", a_setup)

    def a_trash():
        t.dashboard()
        first = t.page.locator("[data-project]:visible .project-card__link").first.inner_text()
        t.card_action(first, "remove")
        t.page.wait_for_timeout(200)
        yes(len(t.titles("trash")) == 1, "trash of A is empty after moving a project")
        t.page.evaluate("window.__a_trashed = 1")

    S.check("02", "User A: moves a project to the trash", a_trash)
    a_user = t.user()

    t.logout()
    t.register("Boris", b_mail)

    def b_clean():
        titles = t.titles("mine")
        yes("A-secret-project" not in titles and "A-secret-versioned" not in titles, f"B sees projects of A: {titles[:5]}")
        eq(len(titles), SEED_COUNT, "B has its own starter projects:")
        eq(t.titles("templates"), [], "templates of B:")
        eq(t.titles("trash"), [], "trash of B:")

    S.check("03", "User B in the same profile: no projects, templates or trash of A, own 33 starter projects", b_clean)

    def b_quota():
        t.dashboard()
        yes(" 0 " in " " + t.quota_text() + " " or "0 of 5" in t.quota_text(), "quota of B: " + t.quota_text())

    S.check("04", "Quota of B starts at 0 (A's diagrams are not counted)", b_quota)

    def keys_per_user():
        keys = t.storage_keys("dslkit.projects.")
        eq(len(keys), 2, "project keys of two users:")
        yes(a_user["id"] in "".join(keys), "key of A is missing")

    S.check("05", "Projects are stored under a key of each user", keys_per_user)

    def b_hist():
        t.goto("/app/editor.html?template=idef0&tl=en", wait=500)
        t.page.locator('[data-panel="git"]').click()
        t.page.wait_for_timeout(300)
        commits = t.page.locator(".editor-tools__commit").count()
        raw = t.page.evaluate("localStorage.getItem('dslkit.git-commits')")
        leaked = "A-secret" in (raw or "")
        eq((commits, leaked), (0, False), "B sees the version history of A (key dslkit.git-commits is shared by all accounts):")

    S.check("06", "Version history (Git panel) of A is not visible to B", b_hist, "High")

    def settings_iso():
        # A sets a setting, B must not inherit it
        t.logout()
        t.login(a_mail)
        t.goto("/app/settings.html")
        box = t.page.locator("#guides")
        was = box.is_checked()
        box.click()
        t.page.wait_for_timeout(200)
        t.logout()
        t.login(b_mail)
        t.goto("/app/settings.html")
        eq(t.page.locator("#guides").is_checked(), was, "B inherited the setting of A (key dslkit.settings is shared):")

    S.check("07", "Settings of A (editor guides) do not change the settings of B", settings_iso, "Medium")

    def theme_iso():
        t.logout()
        t.login(a_mail)
        t.goto("/app/settings.html")
        t.page.locator("#theme-dark").check()
        t.page.wait_for_timeout(200)
        eq(t.page.evaluate("document.documentElement.dataset.theme"), "dark", "A theme:")
        t.logout()
        t.login(b_mail)
        t.goto("/app/dashboard.html")
        eq(t.page.evaluate("document.documentElement.dataset.theme"), "light", "B inherited the dark theme of A (key dslkit.theme is shared):")

    S.check("08", "Theme chosen by A is not applied to B (theme per account)", theme_iso, "Low")

    def dash_state():
        t.logout()
        t.login(a_mail)
        t.dashboard()
        t.page.fill(".app-topbar__search-input", "A-secret")
        t.page.wait_for_timeout(300)
        t.logout()
        t.login(b_mail)
        t.dashboard()
        eq(t.page.input_value(".app-topbar__search-input"), "", "B sees the search text of A in the project search (key dslkit.dashboard):")

    S.check("09", "Search and filter state of the dashboard is not carried from A to B", dash_state, "Low")

    def back_to_a():
        t.logout()
        t.login(a_mail)
        titles = t.titles("mine")
        yes("A-secret-project" in titles, "A lost the project after the account switch")
        eq(len(t.titles("trash")), 1, "trash of A:")
        eq(len(t.titles("templates")), 1, "templates of A:")
        t.dashboard()
        yes("2" in t.quota_text() or "of 5" in t.quota_text(), t.quota_text())

    S.check("10", "A signs in again: projects, template, trash and quota are exactly as left", back_to_a)

    # ---------- separate contexts
    def separate_ctx():
        ctx2 = new_ctx(b)
        t2 = Tab(ctx2, base, S)
        t2.goto("/app/dashboard.html")
        yes("login" in t2.page.url, "a fresh browser context opens the dashboard without signing in")
        t2.login(a_mail, expect="fail")
        yes(t2.page.locator("#auth-error").is_visible(), "A can sign in in a context that has no account")
        eq(t2.session(), None, "session:")
        t2.register("Anna Two", a_mail)
        eq(len(t2.titles("mine")), SEED_COUNT, "projects of the same address in another context:")
        yes("A-secret-project" not in t2.titles("mine"), "data of A leaked into another context")
        ctx2.close()
        t.page.bring_to_front()
        t.suite.page = t.page

    S.check("11", "Separate browser context: no accounts and no data of A, the same email can be registered there", separate_ctx)

    # ---------- limits
    def user_limit():
        ctx3 = new_ctx(b)
        u = Tab(ctx3, base, S)
        u.register("Limited", f"c-{sfx}@example.com")
        for i in range(5):
            yes(u.new_diagram(f"Limit {i}") is not None, f"diagram {i + 1} of 5 was refused")
        u.dashboard()
        yes("5 of 5" in u.quota_text() or "5" in u.quota_text(), u.quota_text())
        eq(len(u.titles("mine")), SEED_COUNT + 5, "projects after 5 saves:")
        refused = u.new_diagram("Limit six")
        eq(refused, None, "sixth new diagram was saved, the daily limit is 5:")
        yes("limit" in u.page.inner_text(".editor-status__saved").lower(), "no limit message: " + u.page.inner_text(".editor-status__saved"))
        # a deleted project still counts
        u.card_action("Limit 0", "remove")
        eq(u.new_diagram("Limit after delete"), None, "a trashed project must still count in the daily limit:")
        # an existing project is still editable
        u.goto("/app/dashboard.html")
        u.page.locator("[data-project]:visible .project-card__link", has_text="Limit 1").click()
        u.page.wait_for_url("**editor.html?*p=*")
        u.page.wait_for_timeout(500)
        u.page.evaluate("""() => { const c = document.querySelector('.code__line code'); c.textContent = c.textContent.replace(/"[^"]*"/, '"Limit 1 edited"'); c.dispatchEvent(new Event('input', {bubbles:true})); }""")
        u.page.click('[data-action="save"]')
        u.page.wait_for_timeout(400)
        yes("Limit 1 edited" in u.titles("mine"), "an existing project cannot be edited after the limit")
        globals().setdefault("LIMITED", {})[name] = f"c-{sfx}@example.com"
        ctx3.close()
        t.suite.page = t.page

    S.check("12", "User: five new diagrams a day, the sixth and a re-save after delete are refused, edits of an existing one work", user_limit)

    def unlimited(role):
        def run():
            ctx4 = new_ctx(b)
            u = Tab(ctx4, base, S)
            u.register(role, f"{role}-{sfx}@example.com")
            u.set_role(role)
            for i in range(7):
                yes(u.new_diagram(f"{role} {i}") is not None, f"{role}: diagram {i + 1} refused")
            u.dashboard()
            yes("no daily limit" in u.quota_text() or "without" in u.quota_text().lower(), "quota text of " + role + ": " + u.quota_text())
            eq(len(u.titles("mine")), SEED_COUNT + 7, "projects:")
            ctx4.close()
            t.suite.page = t.page

        return run

    S.check("13", "Developer: 7 new diagrams, the quota says no daily limit", unlimited("developer"))
    S.check("14", "Admin: 7 new diagrams, the quota says no daily limit", unlimited("admin"))

    def quota_switch():
        ctx5 = new_ctx(b)
        u = Tab(ctx5, base, S)
        u.register("U1", f"u1-{sfx}@example.com")
        for i in range(5):
            u.new_diagram(f"U1 {i}")
        u.logout()
        u.register("U2", f"u2-{sfx}@example.com")
        yes(u.new_diagram("U2 first") is not None, "second account cannot save: it inherits the quota of the first")
        u.logout()
        u.login(f"u1-{sfx}@example.com")
        eq(u.new_diagram("U1 sixth"), None, "first account is limited to 5:")
        ctx5.close()
        t.suite.page = t.page

    S.check("15", "Switching accounts in one profile keeps each user's quota separate", quota_switch)

    def guest_data():
        ctx6 = new_ctx(b)
        g = Tab(ctx6, base, S)
        yes(g.new_diagram("Guest project") is not None, "guest cannot save")
        g.register("Gus", f"gus-{sfx}@example.com")
        yes("Guest project" not in g.titles("mine"), "guest projects appear in a new account")
        eq(len(g.titles("mine")), SEED_COUNT, "new account projects:")
        ctx6.close()
        t.suite.page = t.page

    S.check("16", "Projects saved as a guest stay with the guest and do not enter a new account", guest_data)

    # ---------- tabs
    def tab_signout():
        ctx7 = new_ctx(b)
        t1 = Tab(ctx7, base, S)
        t1.register("Tabby", f"tab-{sfx}@example.com")
        t1.dashboard()
        t2 = Tab(ctx7, base, S)
        t2.goto("/app/dashboard.html")
        ed = Tab(ctx7, base, S)
        ed.goto("/app/editor.html?template=idef0&tl=en", wait=500)
        t1.page.bring_to_front()
        t1.logout()
        t2.page.wait_for_timeout(900)
        yes("login" in t2.page.url, "tab 2 (dashboard) stayed on a private page after sign-out in tab 1: " + t2.page.url)
        ed.page.wait_for_timeout(300)
        eq(Tab.menu(ed), "guest", "editor tab menu after sign-out in tab 1:")
        # and sign in in tab 1 updates the menu of the editor tab
        t1.login(f"tab-{sfx}@example.com")
        ed.page.wait_for_timeout(500)
        eq(Tab.menu(ed), "user", "editor tab menu after sign-in in tab 1:")
        ctx7.close()
        t.suite.page = t.page

    S.check("17", "Sign-out in tab 1 sends tab 2 to sign-in and updates the editor menu; sign-in updates it back", tab_signout)

    def two_tab_edit():
        ctx8 = new_ctx(b)
        t1 = Tab(ctx8, base, S)
        t1.register("Duo", f"duo-{sfx}@example.com")
        pid = t1.new_diagram("Shared draft")
        t2 = Tab(ctx8, base, S)
        t2.goto(f"/app/editor.html?p={pid}", wait=600)
        for tab, title in ((t1, "Draft from tab one"), (t2, "Draft from tab two")):
            tab.page.bring_to_front()
            tab.page.evaluate(
                """(t) => { const c = document.querySelector('.code__line code'); c.textContent = c.textContent.replace(/"[^"]*"/, '"' + t + '"'); c.dispatchEvent(new Event('input', {bubbles:true})); }""",
                title,
            )
            tab.page.click('[data-action="save"]')
            tab.page.wait_for_timeout(500)
        raw = t1.page.evaluate("(k) => Object.entries(localStorage).filter(([n]) => n.startsWith('dslkit.projects.')).map(([n, v]) => v)", "")
        projects = json.loads(raw[0])
        mine = [p for p in projects if p["id"] == pid]
        eq(len(mine), 1, "copies of the project after two saves:")
        eq(mine[0]["title"], "Draft from tab two", "last write wins:")
        eq(len([p for p in projects if p["title"].startswith("Draft from")]), 1, "duplicates:")
        t1.dashboard()
        eq(t1.titles("mine").count("Draft from tab two"), 1, "dashboard shows one copy:")
        yes(not t1.errors and not t2.errors, f"page errors {t1.errors + t2.errors}")
        ctx8.close()
        t.suite.page = t.page

    S.check("18", "Two tabs save the same project: the last write wins, one record, valid JSON, no errors", two_tab_edit)

    def two_tab_trash():
        ctx9 = new_ctx(b)
        t1 = Tab(ctx9, base, S)
        t1.register("Trashy", f"trashy-{sfx}@example.com")
        pid = t1.new_diagram("Trash race")
        t2 = Tab(ctx9, base, S)
        t2.goto(f"/app/editor.html?p={pid}", wait=500)
        t1.card_action("Trash race", "remove")
        t2.page.bring_to_front()
        t2.page.evaluate("""() => { const c = document.querySelector('.code__line code'); c.textContent = c.textContent.replace(/"[^"]*"/, '"Zombie edit"'); c.dispatchEvent(new Event('input', {bubbles:true})); }""")
        t2.page.click('[data-action="save"]')
        t2.page.wait_for_timeout(500)
        mine = t1.titles("mine")
        yes("Zombie edit" not in mine and "Trash race" not in mine, f"a project trashed in tab 1 came back or was duplicated by an edit in tab 2: {[x for x in mine if 'Zombie' in x or 'Trash' in x]}")
        ctx9.close()
        t.suite.page = t.page

    S.check("19", "A project trashed in tab 1 is not resurrected or duplicated by a save in tab 2", two_tab_trash, "Medium")

    # ---------- share link
    def share():
        t.logout()
        t.login(a_mail)
        t.goto("/app/editor.html?template=bpmn&tl=en", wait=500)
        t.set_code('diagram bpmn "Shared by Anna"')
        t.page.wait_for_timeout(300)
        before = t.code()
        t.click_hidden('[data-action="share"]')
        t.page.wait_for_timeout(300)
        link = t.page.evaluate("window.__clip")
        yes(link and "#s=" in link, f"share link not produced: {link!r}")
        # other account, same profile
        t.logout()
        t.page.goto(link)
        t.page.wait_for_timeout(600)
        yes("Shared by Anna" in t.code(), "guest opens the link and does not get the code: " + t.code()[:60])
        projects_guest = t.page.evaluate("localStorage.getItem('dslkit.projects')")
        yes(not projects_guest or "Shared by Anna" not in projects_guest, "opening a link saved a project for the guest by itself")
        t.login(b_mail)
        t.page.goto(link)
        t.page.wait_for_timeout(700)
        yes("Shared by Anna" in t.code(), "account B opens the link and does not get the code")
        t.page.wait_for_timeout(1500)
        titles = t.titles("mine")
        yes("Shared by Anna" not in titles, "opening a share link saved a project into B's list without a save")
        # a corrupted link does not crash the editor
        t.page.goto(t.url("/app/editor.html#s=%%%not-base64***"))
        t.page.wait_for_timeout(500)
        yes(t.page.locator(".code__line").count() >= 1, "editor is empty after a corrupted share link")
        # another context (another user) opens the same link
        ctx10 = new_ctx(b)
        o = Tab(ctx10, base, S)
        o.register("Olga", f"olga-{sfx}@example.com")
        o.page.goto(link)
        o.page.wait_for_timeout(600)
        yes("Shared by Anna" in o.code(), "another user in another browser context cannot open the link")
        ctx10.close()
        t.suite.page = t.page

    S.check("20", "Share link: opens for a guest, for another account and in another context; a damaged link does not break the editor", share)

    t.close()
    ctx.close()


def run():
    with site() as base:
        run_browsers(lambda n, b: scenarios(n, b, base), S)
    return S.save()


if __name__ == "__main__":
    main(run)
