"""Common helpers for nav-*.py (Playwright, sync). Base site: http://localhost:5190"""
import json, time
from playwright.sync_api import sync_playwright

import os
BASE = os.environ.get('DSL_BASE', 'http://localhost:5191')  # own copy of the same site (tools/serve.js site 5191); 5190 works too
PAGES = ['index.html', 'app/login.html', 'app/register.html', 'app/dashboard.html',
         'app/welcome.html', 'app/editor.html', 'app/settings.html']
PROTECTED = ['app/dashboard.html', 'app/welcome.html', 'app/editor.html', 'app/settings.html']


def url(path, lang='ru'):
    return f"{BASE}/{'en/' if lang == 'en' else ''}{path}"


class Session:
    """One browser context with console / page error / failed request collection."""
    def __init__(self, pw, ctx=None, browser=None, **kw):
        self.browser = browser or pw.chromium.launch()
        self.ctx = ctx or self.browser.new_context(viewport={'width': 1366, 'height': 800}, **kw)
        self.errors = []
        self.ctx.on('page', self._watch)

    def _watch(self, page):
        page.on('console', lambda m: self.errors.append(('console', page.url, m.text)) if m.type == 'error' else None)
        page.on('pageerror', lambda e: self.errors.append(('pageerror', page.url, str(e))))
        page.on('response', lambda r: self.errors.append(('http%d' % r.status, r.url, '')) if r.status >= 400 else None)

    def page(self):
        p = self.ctx.new_page()
        p.set_default_timeout(30000)
        return p

    def close(self):
        self.browser.close()


def register(page, name, email, pw='Passw0rd!x', lang='ru'):
    page.goto(url('app/register.html', lang))
    page.fill('#name', name); page.fill('#email', email)
    page.fill('#password', pw); page.fill('#confirm', pw)
    page.click('#auth-form [type=submit]')
    page.wait_for_url('**/welcome.html', timeout=30000)


def login(page, email, pw='Passw0rd!x', lang='ru'):
    page.goto(url('app/login.html', lang))
    page.fill('#email', email); page.fill('#password', pw)
    page.click('#auth-form [type=submit]')
    page.wait_for_url('**/dashboard.html', timeout=30000)


def ls(page):
    return page.evaluate("() => Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))")


class Report:
    def __init__(self):
        self.rows = []
    def add(self, id_, text, expect, fact, ok):
        self.rows.append((id_, text, expect, fact, 'Pass' if ok else 'Fail'))
        print(f"{'PASS' if ok else 'FAIL'} {id_}: {text} -> {fact}", flush=True)
    def dump(self, path):
        json.dump(self.rows, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
