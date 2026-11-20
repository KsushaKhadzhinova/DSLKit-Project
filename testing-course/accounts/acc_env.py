"""Shared helper of the account scenarios (testing-course/accounts/*.py).

Environment
  E2E_OUT        folder of the accounts-*.json results (default: this folder)
  E2E_SHOTS      folder of the screenshots of FAILED checks (default: docs/evidence/accounts-2026-11/screens)
  ACC_BROWSERS   comma list, default "msedge,firefox"; "chromium" is the Playwright build for CI
  ACC_BASE       use an already running site instead of starting `node tools/serve.js site <port>`

Every scenario runs in every browser, the result row has the fields id, title, browser, status, severity, note.
Only test data is used: accounts are made in a clean browser profile through the real sign-up form, the roles
developer and admin are written into the account record of the test profile (the real codes are never used).
"""
import json
import os
import re
import socket
import subprocess
import sys
import time
import urllib.request
from contextlib import contextmanager
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
OUT = Path(os.environ.get("E2E_OUT") or HERE)
SHOTS = Path(os.environ.get("E2E_SHOTS") or ROOT / "docs" / "evidence" / "accounts-2026-11" / "screens")
OUT.mkdir(parents=True, exist_ok=True)
SHOTS.mkdir(parents=True, exist_ok=True)
BROWSERS = [b.strip() for b in os.environ.get("ACC_BROWSERS", "msedge,firefox").split(",") if b.strip()]
PW = "test-phrase-2026"
TOUR_OFF = "try { localStorage.setItem('dslkit.tour-done', 'true'); } catch (e) {}"
SEED_COUNT = 33  # starter diagrams of every new account, one per notation (site/js/storage/seeds.js)
IGNORED_ERRORS = ("kroki", "net::ERR", "Failed to load resource", "NS_ERROR", "NetworkError", "favicon")


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@contextmanager
def site(env=None, port=None):
    """Starts the site as its own process (node tools/serve.js site <port>) and yields the base address."""
    if os.environ.get("ACC_BASE") and env is None:
        yield os.environ["ACC_BASE"].rstrip("/")
        return
    port = port or free_port()
    proc = subprocess.Popen(
        ["node", "tools/serve.js", "site", str(port)],
        cwd=ROOT,
        env={**os.environ, **(env or {})},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base = f"http://localhost:{port}"
    for _ in range(100):
        try:
            urllib.request.urlopen(base + "/", timeout=1).read(10)
            break
        except Exception:  # noqa: BLE001
            time.sleep(0.1)
    try:
        yield base
    finally:
        proc.terminate()
        try:
            proc.wait(5)
        except Exception:  # noqa: BLE001
            proc.kill()


def launch(p, name):
    if name == "firefox":
        return p.firefox.launch()
    if name == "chromium":
        return p.chromium.launch()
    return p.chromium.launch(channel=name)


class Suite:
    """Collects the results of one script. check() never raises: a failure is a row with its screenshot."""

    def __init__(self, name, prefix):
        self.name, self.prefix = name, prefix
        self.results = []
        self.page = None
        self.browser = ""
        for old in SHOTS.glob(f"fail-{prefix}-*"):
            old.unlink()

    def check(self, id_, title, fn, severity="Medium"):
        full = f"{self.prefix}-{id_}"
        t0 = time.time()
        try:
            fn()
            row = {"id": full, "title": title, "browser": self.browser, "status": "Passed", "severity": "", "note": ""}
            print("ok  ", self.browser, full, f"{time.time() - t0:.1f}s", flush=True)
        except Exception as e:  # noqa: BLE001
            note = " ".join(str(e).splitlines()[:6])[:700]
            shot = ""
            try:
                shot = f"fail-{full}-{self.browser}.png"
                self.page.screenshot(path=str(SHOTS / shot))
            except Exception:  # noqa: BLE001
                shot = ""
            row = {"id": full, "title": title, "browser": self.browser, "status": "Failed", "severity": severity, "note": note, "screenshot": shot}
            print("FAIL", self.browser, full, note[:240], flush=True)
        self.results.append(row)

    def info(self, id_, title, note):
        """A recorded observation that is not a failure (a design decision worth knowing)."""
        self.results.append({"id": f"{self.prefix}-{id_}", "title": title, "browser": self.browser, "status": "Passed", "severity": "", "note": "OBSERVATION: " + note})

    def save(self):
        suffix = f"-{BROWSERS[0]}" if len(BROWSERS) == 1 else ""
        f = OUT / f"accounts-{self.name}{suffix}.json"
        f.write_text(json.dumps({"suite": self.name, "results": self.results}, ensure_ascii=False, indent=1), encoding="utf8")
        bad = [r for r in self.results if r["status"] != "Passed"]
        print(f"{self.name}: {len(self.results)} rows, {len(bad)} failed -> {f}")
        return bad


def eq(a, b, msg=""):
    if a != b:
        raise AssertionError(f"{msg} expected {b!r}, got {a!r}")


def yes(v, msg):
    if not v:
        raise AssertionError(msg)


def run_browsers(scenarios, suite, setup=None):
    """Calls scenarios(browser_name, playwright_browser) for every browser of ACC_BROWSERS."""
    with sync_playwright() as p:
        for name in BROWSERS:
            suite.browser = name
            try:
                b = launch(p, name)
            except Exception as e:  # noqa: BLE001
                suite.results.append({"id": f"{suite.prefix}-LAUNCH", "title": f"browser {name} starts", "browser": name, "status": "Failed", "severity": "High", "note": str(e)[:300]})
                continue
            try:
                scenarios(name, b)
            finally:
                b.close()


class Tab:
    """A page with the helpers of the DSLKit UI. `base` is the address of the site."""

    def __init__(self, ctx, base, suite=None, lang="en"):
        self.page = ctx.new_page()
        self.base, self.lang, self.suite = base, lang, suite
        self.errors = []
        self.page.set_default_timeout(60000)
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.page.on("console", lambda m: self.errors.append(m.text) if m.type == "error" and not any(s in m.text for s in IGNORED_ERRORS) else None)
        self.page.on("dialog", lambda d: d.accept())
        if suite is not None:
            suite.page = self.page

    # ---- navigation
    def url(self, path, lang=None):
        lang = lang or self.lang
        return f"{self.base}{'/en' if lang == 'en' else ''}{path}"

    def goto(self, path, lang=None, wait=250):
        self.page.goto(self.url(path, lang), wait_until="domcontentloaded")
        self.page.wait_for_timeout(wait)
        if self.suite is not None:
            self.suite.page = self.page
        return self

    # ---- accounts through the real forms
    def register(self, name, email, pw=PW, expect="ok"):
        self.goto("/app/register.html")
        self.page.fill("#name", name)
        self.page.fill("#email", email)
        self.page.fill("#password", pw)
        self.page.fill("#confirm", pw)
        self.page.click("#auth-form [type=submit]")
        if expect == "ok":
            self.page.wait_for_url("**/welcome.html")
            self.page.wait_for_timeout(250)
        else:
            self.page.wait_for_timeout(900)

    def login(self, email, pw=PW, expect="ok"):
        self.goto("/app/login.html")
        self.page.fill("#email", email)
        self.page.fill("#password", pw)
        self.page.click("#auth-form [type=submit]")
        if expect == "ok":
            self.page.wait_for_url("**/dashboard.html")
            self.page.wait_for_timeout(300)
        else:
            self.page.wait_for_timeout(900)

    def logout(self):
        if self.page.locator("[data-auth-logout]:visible").count() == 0:
            self.goto("/app/dashboard.html", wait=300)
        if self.page.locator("[data-auth-logout]:visible").count() == 0 and self.page.locator(".burger__button").is_visible():
            self.page.locator(".burger__button").click()
        self.page.locator("[data-auth-logout]:visible").first.click()
        self.page.wait_for_timeout(700)

    def menu(self):
        """'user' when the account menu of the page shows the signed-in part, else 'guest' (the menu may sit in a closed burger)."""
        return self.page.evaluate("() => { const u = document.querySelector('[data-auth-user]'); return u && !u.hidden ? 'user' : 'guest'; }")

    def click_hidden(self, selector):
        """Clicks a button that may sit in a closed menu (the editor keeps many actions behind the dots)."""
        self.page.locator(selector).first.evaluate("e => e.click()")

    def session(self):
        return self.page.evaluate("localStorage.getItem('dslkit.session')")

    def user(self):
        """The signed-in account record (without the hash), or None."""
        return self.page.evaluate(
            """() => { try { const s = JSON.parse(localStorage.getItem('dslkit.session')); const a = JSON.parse(localStorage.getItem('dslkit.accounts')) || [];
              const u = a.find(x => x.id === (s && s.userId)); return u ? { id: u.id, name: u.name, email: u.email, role: u.role || 'user' } : null; } catch (e) { return null; } }"""
        )

    def set_role(self, role):
        """Writes the role into the account of the signed-in user (the test stand for the secret codes)."""
        self.page.evaluate(
            """(role) => { const s = JSON.parse(localStorage.getItem('dslkit.session')); const a = JSON.parse(localStorage.getItem('dslkit.accounts'));
              localStorage.setItem('dslkit.accounts', JSON.stringify(a.map(x => x.id === s.userId ? { ...x, role } : x))); }""",
            role,
        )

    # ---- projects
    def code(self):
        return self.page.evaluate("[...document.querySelectorAll('.code__line code')].map(e=>e.textContent).join('\\n')")

    def set_code(self, text):
        self.page.evaluate(
            """(t) => { const lines = document.querySelector('.code__lines'); const first = lines.querySelector('.code__line code');
              first.textContent = t.split('\\n')[0]; first.dispatchEvent(new Event('input', { bubbles: true })); }""",
            text,
        )

    def new_diagram(self, title, template="idef0", save=True):
        """Opens a starter in the editor, renames it and saves it. Returns the project id, or None when the save was refused."""
        self.goto(f"/app/editor.html?template={template}&tl=en", wait=600)
        self.page.evaluate(
            """(t) => { const c = document.querySelector('.code__line code'); c.textContent = c.textContent.replace(/"[^"]*"/, '"' + t + '"'); c.dispatchEvent(new Event('input', {bubbles:true})); }""",
            title,
        )
        self.page.evaluate('document.querySelector(".button--run").click()')
        self.page.wait_for_timeout(300)
        if save:
            self.page.click('[data-action="save"]')
            self.page.wait_for_timeout(450)
        m = re.search(r"[?&]p=([^&#]+)", self.page.url)
        return m.group(1) if m else None

    def storage_keys(self, prefix=""):
        return self.page.evaluate("(p) => Object.keys(localStorage).filter(k => k.startsWith(p))", prefix)

    def dashboard(self, section="mine"):
        self.goto("/app/dashboard.html", wait=350)
        if section != "mine":
            self.page.locator(f"[data-section={section}]").click()
            self.page.wait_for_timeout(150)
        return self

    def titles(self, section="mine"):
        """The titles of the cards shown in a section of the dashboard."""
        sel = {"mine": "[data-project]:not([data-trashed])", "templates": "[data-template]", "trash": "[data-trashed]"}[section]
        self.dashboard(section)
        return self.page.evaluate(
            "(s) => [...document.querySelectorAll(s)].filter(e => !e.hidden && e.offsetParent !== null).map(e => e.querySelector('.project-card__link').textContent.trim())",
            sel,
        )

    def quota_text(self):
        return self.page.inner_text(".app-nav__quota-text")

    def card_action(self, title, act, section="mine"):
        self.dashboard(section)
        card = self.page.locator("[data-project], [data-template]").filter(has=self.page.locator(".project-card__link", has_text=title)).first
        card.locator(".project-card__menu").click()
        card.locator(f'[data-act="{act}"]').click()
        self.page.wait_for_timeout(250)

    def close(self):
        self.page.close()


# A fake clipboard so that Share and "import from the clipboard" work in every browser without permissions:
# window.__clip holds what the page wrote, window.__clipSrc is what the page reads.
CLIP_JS = """(() => { try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
  writeText: async (t) => { window.__clip = t; try { sessionStorage.setItem('__clip', t); } catch (e) {} },
  readText: async () => window.__clipSrc || '' } }); } catch (e) {} })();"""


def new_ctx(b, viewport=None, tour_off=True, clip=True, **kw):
    ctx = b.new_context(viewport=viewport or {"width": 1280, "height": 800}, **kw)
    if tour_off:
        ctx.add_init_script(TOUR_OFF)
    if clip:
        ctx.add_init_script(CLIP_JS)
    return ctx


def api_get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode("utf8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf8", "replace")


def main(fn):
    """Entry point of a script: exit code 1 when any row failed (the gate does the same over the json files)."""
    bad = fn()
    sys.exit(1 if bad else 0)
