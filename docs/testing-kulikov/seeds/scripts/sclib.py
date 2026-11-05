"""Helpers for the manual seed scenarios (Playwright sync, one browser context per user). Site: http://localhost:5190"""
import json, os, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get('DSL_BASE', 'http://localhost:5190')
PW = 'Passw0rd!x'
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DLG = {'accept': True, 'text': None, 'log': []}


def url(path, lang='ru'):
    return f"{BASE}/{'en/' if lang == 'en' else ''}{path}"


def on_dialog(d):
    DLG['log'].append((d.type, d.message[:80]))
    if not DLG['accept']:
        d.dismiss()
    elif d.type == 'prompt':
        d.accept(DLG['text'] if DLG['text'] is not None else d.default_value)
    else:
        d.accept()


class User:
    def __init__(self, browser, name, email, lang='ru', viewport=(1366, 800)):
        self.name, self.email, self.lang = name, email, lang
        self.ctx = browser.new_context(viewport={'width': viewport[0], 'height': viewport[1]})
        self.errors = []
        self.ctx.on('page', self._watch)
        self.p = self.page()

    def _watch(self, page):
        page.on('console', lambda m: self.errors.append(('console', page.url, m.text)) if m.type == 'error' else None)
        page.on('pageerror', lambda e: self.errors.append(('pageerror', page.url, str(e))))
        page.on('dialog', on_dialog)

    def page(self):
        p = self.ctx.new_page()
        p.set_default_timeout(20000)
        return p

    def register(self):
        p = self.p
        p.goto(url('app/register.html', self.lang))
        p.fill('#name', self.name); p.fill('#email', self.email)
        p.fill('#password', PW); p.fill('#confirm', PW)
        p.click('#auth-form [type=submit]')
        p.wait_for_function("()=>location.pathname.endsWith('welcome.html')", timeout=30000)
        return self

    def go(self, path, lang=None):
        self.p.goto(url(path, lang or self.lang))
        self.p.wait_for_timeout(500)
        self.skip_tour()

    def skip_tour(self):
        p = self.p
        try:
            p.evaluate("()=>{try{localStorage.setItem('dslkit.tour-done','1')}catch(e){}}")
        except Exception:
            pass

    def ls(self):
        return self.p.evaluate("() => Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))")

    def key(self, prefix):
        return self.p.evaluate("(pre)=>Object.keys(localStorage).find(k=>k.startsWith('dslkit.'+pre))", prefix)

    def get(self, prefix):
        k = self.key(prefix)
        return json.loads(self.p.evaluate("(k)=>localStorage.getItem(k)", k)) if k else None

    def setj(self, prefix, value):
        k = self.key(prefix)
        self.p.evaluate("([k,v])=>localStorage.setItem(k,v)", [k, json.dumps(value, ensure_ascii=False)])

    # ---- editor ----
    def editor_new(self):
        self.go('app/editor.html')
        self.p.wait_for_selector('.code__input', state='attached')

    def set_code_typed(self, dsl):
        """Types the code key by key. Auto-indent of the editor is respected: leading blanks are dropped, a closing brace steps back by itself."""
        p = self.p
        ta = p.locator('.code__input')
        ta.click(force=True)
        p.keyboard.press('Control+A'); p.keyboard.press('Delete')
        lines = dsl.strip('\n').split('\n')
        for i, line in enumerate(lines):
            p.keyboard.type(line.strip(), delay=0)
            if i < len(lines) - 1:
                p.keyboard.press('Enter')
        p.wait_for_timeout(900)

    def set_code_fill(self, dsl):
        if len(dsl) > 50000:  # a 100 KB paste: set the value and fire the input event like a paste does
            self.p.evaluate("(v)=>{const t=document.querySelector('.code__input');t.value=v;t.dispatchEvent(new Event('input',{bubbles:true}))}", dsl)
            self.p.wait_for_timeout(2500)
        else:
            self.p.fill('.code__input', dsl)
        self.p.wait_for_timeout(900)

    def code(self):
        return self.p.evaluate("()=>document.querySelector('.code__input').value")

    def status(self):
        return self.p.evaluate("()=>({saved:(document.querySelector('.editor-status__saved')||{}).textContent,errors:document.querySelectorAll('.problems__item--error, .code__line--error').length,nodes:document.querySelectorAll('.notation__node').length,run:(document.querySelector('.button--run')||{}).getAttribute&&document.querySelector('.button--run').getAttribute('aria-disabled')})")

    def save(self):
        self.p.keyboard.press('Control+S')
        self.p.wait_for_timeout(500)

    def diagram(self, dsl, typed=False):
        """Creates a new diagram by typing the code into a blank editor, saves it, returns the status."""
        self.editor_new()
        (self.set_code_typed if typed else self.set_code_fill)(dsl)
        self.save()
        return self.status()

    # ---- dashboard ----
    def dash(self, section='mine', lang=None):
        self.go('app/dashboard.html', lang)
        self.p.click(f'[data-section="{section}"]')
        self.p.wait_for_timeout(300)

    def titles(self):
        return self.p.evaluate("()=>[...document.querySelectorAll('#project-list .project-list__item:not([hidden])')].map(a=>a.querySelector('.project-card__link').textContent.trim())")

    def count_text(self):
        return self.p.evaluate("()=>document.querySelector('#project-count').textContent.trim()")

    def quota(self):
        return self.p.evaluate("()=>{const t=document.querySelector('.app-nav__quota-text'),b=document.querySelector('.app-nav__progress');return {text:t&&t.textContent.trim(),value:b&&b.value,max:b&&b.max}}")

    def card_act(self, nth, act):
        p = self.p
        item = p.locator('#project-list .project-list__item:not([hidden])').nth(nth)
        if item.locator('.project-card__actions').first.is_hidden():
            item.locator('.project-card__menu').click()
        item.locator(f'[data-act="{act}"]').first.click()
        p.wait_for_timeout(250)

    def card_act_title(self, title, act):
        p = self.p
        idx = self.titles().index(title)
        self.card_act(idx, act)


def snapshot(user, path):
    data = {k: v for k, v in user.ls().items()}
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'origin': BASE, 'user': user.email, 'savedAt': int(time.time() * 1000), 'localStorage': data}, f, ensure_ascii=False, indent=1)
    return data


def login(user):
    p = user.p
    p.goto(url('app/login.html', user.lang))
    p.fill('#email', user.email); p.fill('#password', PW)
    p.click('#auth-form [type=submit]')
    p.wait_for_function("()=>location.pathname.endsWith('dashboard.html')", timeout=30000)


def load_snapshot(user, path, user_index=None):
    """Loads a scenario-N.json into the empty context the same way the README script does it in the console."""
    data = json.load(open(path, encoding='utf-8'))
    if user_index is not None:
        data = data['users'][user_index]
    user.p.goto(BASE + '/index.html')
    user.p.evaluate("(d)=>{localStorage.clear();for(const [k,v] of Object.entries(d)) localStorage.setItem(k,v)}", data['localStorage'])
    user.p.goto(url('app/dashboard.html', user.lang))
    user.p.wait_for_timeout(600)
