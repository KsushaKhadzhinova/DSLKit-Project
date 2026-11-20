"""Role permissions, import by every role, templates, trash restore/purge, versions restore. Writes accounts-roles.json."""
from acc_env import SEED_COUNT, Suite, Tab, eq, main, new_ctx, run_browsers, site, yes

S = Suite("roles", "ROL")

MERMAID_FLOW = "flowchart TD\n  A[Start] --> B{Ok?}\n  B -->|yes| C[Done]\n  B -->|no| A\n"
MERMAID_SEQ = "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi\n"
MERMAID_STATE = "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy: start\n  Busy --> [*]\n"
PUML_SEQ = "@startuml\nAlice -> Bob: Hello\nBob --> Alice: Hi\n@enduml\n"
PUML_STATE = "@startuml\n[*] --> Idle\nIdle --> Busy : start\nBusy --> [*]\n@enduml\n"
DSL = 'diagram idef0 "Imported DSL"\n  node a "A"\n'
FORMATS = [("flow.mmd", MERMAID_FLOW), ("seq.mmd", MERMAID_SEQ), ("state.mmd", MERMAID_STATE), ("seq.puml", PUML_SEQ), ("state.puml", PUML_STATE), ("a.dsl", DSL)]


def scenarios(name, b, base):
    sfx = name[:2]
    ctx = new_ctx(b)
    t = Tab(ctx, base, S)
    people = {}

    def make(role):
        c = new_ctx(b)
        u = Tab(c, base, S)
        if role != "guest":
            u.register(role.title(), f"{role}-{sfx}@example.com")
            if role != "user":
                u.set_role(role)
        people[role] = (c, u)
        return u

    for r in ("guest", "user", "developer", "admin"):
        make(r)

    def docs_perm():
        for role, can in (("guest", False), ("user", False), ("developer", True), ("admin", False)):
            _, u = people[role]
            u.goto("/app/docs.html", wait=500)
            visible = u.page.locator("[data-docs-edit]").is_visible()
            eq(visible, can, f"edit button of the documentation for {role}:")
        # wrong code and signed-out message
        _, g = people["guest"]
        g.page.fill(".docs__role-input", "definitely-wrong-code")
        g.page.locator("[data-docs-role]").evaluate("f => f.requestSubmit()")
        g.page.wait_for_timeout(700)
        yes(g.page.locator("[data-docs-role-off]").is_hidden(), "a guest got a role with a wrong code")
        _, usr = people["user"]
        usr.goto("/app/docs.html")
        usr.page.fill(".docs__role-input", "definitely-wrong-code")
        usr.page.locator("[data-docs-role]").evaluate("f => f.requestSubmit()")
        usr.page.wait_for_timeout(700)
        eq(usr.user()["role"], "user", "role after a wrong code:")
        # developer edits a section, the user sees the change marked
        _, d = people["developer"]
        d.goto("/app/docs.html")
        d.page.locator("[data-docs-edit]").click()
        d.page.locator(".docs__editor textarea, [data-docs-text], textarea").first.fill("# Edited by developer\n\nText.")
        d.page.locator("[data-docs-save]").click()
        d.page.wait_for_timeout(400)
        yes("Edited by developer" in d.page.inner_text("main"), "developer edit is not shown")
        d.page.locator("[data-docs-reset]").click() if d.page.locator("[data-docs-reset]").is_visible() else None

    S.check("01", "Documentation: only the developer sees and uses Edit; guest/user/admin do not; wrong codes give no role", docs_perm)

    def expert_perm():
        for role, can in (("guest", False), ("user", False), ("developer", True), ("admin", False)):
            _, u = people[role]
            u.goto("/app/expert.html", wait=500)
            n = u.page.locator("[data-expert-edit]:visible").count()
            eq(n > 0, can, f"rule editing for {role}:")

    S.check("02", "Expert rules: only the developer can edit rules", expert_perm)

    S.info("03", "Admin role scope", "role admin = no daily limit only; admin cannot edit documentation or expert rules (only developer can) and the site has no admin screen or example-publishing action")

    def imports(role):
        def run():
            _, u = people[role]
            for fname, text in FORMATS:
                u.goto("/app/editor.html?template=idef0&tl=en", wait=500)
                before = u.code()
                u.page.set_input_files(".editor-import__file", {"name": fname, "mimeType": "text/plain", "buffer": text.encode()})
                u.page.wait_for_timeout(500)
                after = u.code()
                yes(after != before and after.strip() != "", f"{role}: {fname} not imported, status: {u.page.inner_text('.canvas__status')[:80]}")
                yes(u.page.locator(".canvas__remote svg").count() == 1, f"{role}: {fname} imported but no drawing")
            u.goto("/app/editor.html?template=idef0&tl=en", wait=500)
            before = u.code()
            u.page.set_input_files(".editor-import__file", {"name": "junk.txt", "mimeType": "text/plain", "buffer": b"hello, nothing here"})
            u.page.wait_for_timeout(400)
            eq(u.code(), before, f"{role}: garbage replaced the code:")
            u.page.set_input_files(".editor-import__file", {"name": "huge.mmd", "mimeType": "text/plain", "buffer": b"flowchart TD\n" + b"A-->B\n" * 60000})
            u.page.wait_for_timeout(500)
            eq(u.code(), before, f"{role}: an oversized file replaced the code:")
            u.page.evaluate("window.__clipSrc = arguments", None) if False else None
            u.page.evaluate("(t) => { window.__clipSrc = t; }", MERMAID_SEQ)
            u.page.locator('[data-import="clipboard"]').evaluate("b => b.click()")
            u.page.wait_for_timeout(500)
            yes(u.code() != before, f"{role}: clipboard import did nothing")

        return run

    for i, role in enumerate(("guest", "user", "developer", "admin")):
        S.check(f"1{i}", f"Import (Mermaid flow/sequence/state, PlantUML sequence/state, DSL, junk, oversized, clipboard) as {role}", imports(role))

    def trash_cycle():
        _, u = people["user"]
        u.new_diagram("Cycle one")
        u.card_action("Cycle one", "remove")
        yes("Cycle one" not in u.titles("mine"), "trashed project still listed")
        yes("Cycle one" in u.titles("trash"), "not in trash")
        u.page.goto(u.url("/app/editor.html?p=zzz"))  # unrelated
        u.card_action("Cycle one", "restore", "trash")
        yes("Cycle one" in u.titles("mine"), "restore failed")
        u.card_action("Cycle one", "remove")
        u.card_action("Cycle one", "purge", "trash")
        yes("Cycle one" not in u.titles("trash") and "Cycle one" not in u.titles("mine"), "purge failed")
        # empty trash
        u.new_diagram("Cycle two")
        u.card_action("Cycle two", "remove")
        u.dashboard("trash")
        u.page.locator("button", has_text="Empty the trash").click()
        u.page.wait_for_timeout(300)
        eq(u.titles("trash"), [], "trash after Empty:")
        # a trashed project cannot be opened by its address
        pid = u.new_diagram("Cycle three")
        u.card_action("Cycle three", "remove")
        u.goto(f"/app/editor.html?p={pid}", wait=500)
        yes("Cycle three" not in u.code(), "a trashed project opens by its address")

    S.check("20", "Trash: move, restore, delete forever, empty, a trashed project does not open", trash_cycle)

    def expiry():
        _, u = people["user"]
        pid = u.new_diagram("Old trash")
        u.card_action("Old trash", "remove")
        u.page.evaluate(
            """() => { const k = Object.keys(localStorage).find(k => k.startsWith('dslkit.projects.')); const l = JSON.parse(localStorage.getItem(k));
              localStorage.setItem(k, JSON.stringify(l.map(p => p.trashedAt ? { ...p, trashedAt: Date.now() - 31 * 864e5 } : p))); }"""
        )
        eq("Old trash" in u.titles("trash"), False, "a project older than 30 days stays in the trash:")

    S.check("21", "Trash: items older than 30 days are erased", expiry)

    def templates_by_role():
        for role in ("user", "developer", "admin"):
            _, u = people[role]
            u.new_diagram(f"Tpl {role}")
            u.card_action(f"Tpl {role}", "template")
            yes(f"Tpl {role}" in u.titles("templates"), f"{role}: template not created")
            u.card_action(f"Tpl {role}", "remove-template", "templates")
            eq(u.titles("templates"), [], f"{role}: templates after delete:")

    S.check("22", "Templates: create from a project and delete, for user, developer and admin", templates_by_role)

    def versions():
        _, u = people["developer"]
        u.goto("/app/editor.html?template=idef0&tl=en", wait=600)
        u.set_code('diagram idef0 "Version one"')
        u.page.locator('[data-panel="git"]').click()
        u.page.locator('.editor-tools__view:visible button', has_text="Commit").first.click()
        u.page.wait_for_timeout(300)
        u.set_code('diagram idef0 "Version two"')
        u.page.wait_for_timeout(200)
        u.page.locator('.editor-tools__commit [data-act="restore"]').first.click()
        u.page.wait_for_timeout(400)
        yes("Version one" in u.code(), "restore did not return the committed code: " + u.code()[:40])
        u.page.locator('[data-problems-tab="versions"]').click()
        yes(u.page.locator(".problems__extra:visible li").count() >= 1, "Versions tab empty")

    S.check("23", "Versions: commit, change, restore returns the committed code, Versions tab lists it", versions)

    def role_persist():
        _, u = people["developer"]
        u.page.reload()
        eq(u.user()["role"], "developer", "role after reload:")
        u.logout()
        u.login(f"developer-{sfx}@example.com")
        eq(u.user()["role"], "developer", "role after sign-out and sign-in:")
        _, usr = people["user"]
        eq(usr.user()["role"], "user", "other account role:")

    S.check("24", "Role belongs to the account: kept after reload and re-login, other accounts unchanged", role_persist)

    for c, _ in people.values():
        c.close()
    t.close()
    ctx.close()


def run():
    with site() as base:
        run_browsers(lambda n, b: scenarios(n, b, base), S)
    return S.save()


if __name__ == "__main__":
    main(run)
