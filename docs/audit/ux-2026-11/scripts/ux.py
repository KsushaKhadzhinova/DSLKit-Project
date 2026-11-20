"""Shared helpers of the UX audit: browsers, test users, a task recorder with a step counter and a timer, compressed shots.

BASE (no AI)     http://127.0.0.1:5391
BASE_AI (fake)   http://127.0.0.1:5392   (OpenAI-compatible fake on :5393, never a real key)
"""
import io
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
ROOT = HERE.parent
SHOTS = ROOT / "shots"
LOGS = ROOT / "logs"
SHOTS.mkdir(exist_ok=True)
LOGS.mkdir(exist_ok=True)
BASE = os.environ.get("UX_BASE", "http://127.0.0.1:5391")
BASE_AI = os.environ.get("UX_BASE_AI", "http://127.0.0.1:5392")

SIGN_IN = """() => { try { if (localStorage.getItem('dslkit.accounts') === null) {
    localStorage.setItem('dslkit.accounts', JSON.stringify([{ id: 'ux0000000000001', name: 'Test User', email: 'ux@example.com', salt: '00', hash: '00', iterations: 1, role: 'user' }]));
    localStorage.setItem('dslkit.session', JSON.stringify({ userId: 'ux0000000000001' }));
    localStorage.setItem('dslkit.seeded.ux0000000000001', 'true'); } } catch (e) {} }"""
SIGN_IN_SEEDED = SIGN_IN.replace("localStorage.setItem('dslkit.seeded.ux0000000000001', 'true'); ", "")


def launch(p, engine="edge"):
    if engine == "firefox":
        return p.firefox.launch()
    return p.chromium.launch(channel="msedge")


def new_ctx(b, *, lang="ru", device="desktop", signed_in=True, seeded=False, base=BASE, init=None, reduced=False, downloads=True):
    kw = dict(locale="ru-RU" if lang == "ru" else "en-US", accept_downloads=downloads)
    if device == "mobile":
        kw.update(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    else:
        kw.update(viewport={"width": 1366, "height": 900})
    if reduced:
        kw["reduced_motion"] = "reduce"
    ctx = b.new_context(**kw)
    if signed_in:
        ctx.add_init_script("(" + (SIGN_IN_SEEDED if seeded else SIGN_IN) + ")()")
    if init:
        ctx.add_init_script(init)
    return ctx


def page(ctx, errors=None):
    pg = ctx.new_page()
    pg.set_default_timeout(45000)
    _g = pg.goto
    pg.goto = lambda url, **k: _g(url, wait_until="domcontentloaded", timeout=60000)
    if errors is not None:
        pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:200]))
        pg.on("console", lambda m: errors.append("console: " + m.text[:200]) if m.type == "error" else None)
    return pg


def shot(pg, name, full=False):
    """Save a compressed JPEG shot; returns the relative path."""
    try:
        from PIL import Image
    except ImportError:
        Image = None
    path = SHOTS / f"{name}.jpg"
    raw = pg.screenshot(full_page=full, type="jpeg", quality=50)
    if Image:
        im = Image.open(io.BytesIO(raw))
        if im.width > 900:
            im = im.resize((900, int(im.height * 900 / im.width)))
        im.convert("RGB").save(path, "JPEG", quality=50, optimize=True)
    else:
        path.write_bytes(raw)
    return f"shots/{name}.jpg"


class Task:
    """One task of one user: every action is a counted step with a time; friction points are noted by hand."""

    ALL = []

    def __init__(self, tid, title, lang="ru", device="desktop", browser="edge"):
        self.id, self.title, self.lang, self.device, self.browser = tid, title, lang, device, browser
        self.steps, self.friction, self.success, self.t0, self.evidence = [], [], None, time.time(), []
        Task.ALL.append(self)

    def s(self, label, fn=None, *, expect=None):
        """A counted step. fn runs the action; an exception makes the task fail but the run goes on."""
        t = time.time()
        res, err = None, None
        try:
            res = fn() if fn else None
        except Exception as e:  # noqa: BLE001
            err = " ".join(str(e).splitlines()[:2])[:200]
        self.steps.append({"n": len(self.steps) + 1, "label": label, "ms": int((time.time() - t) * 1000), "error": err})
        if err:
            self.friction.append(f"step {len(self.steps)} '{label}' failed: {err}")
        return res

    def f(self, text):
        """Note a friction point (what the user stumbled on)."""
        self.friction.append(text)

    def done(self, ok, note=""):
        self.success = ok
        self.secs = round(time.time() - self.t0, 1)
        self.note = note
        return self

    def dump(self):
        return dict(id=self.id, title=self.title, lang=self.lang, device=self.device, browser=self.browser, steps=len(self.steps),
                    secs=getattr(self, "secs", None), success=self.success, note=getattr(self, "note", ""), friction=self.friction,
                    log=self.steps, evidence=self.evidence)


def save(name):
    (LOGS / f"{name}.json").write_text(json.dumps([t.dump() for t in Task.ALL], ensure_ascii=False, indent=1), encoding="utf-8")
