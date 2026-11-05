"""Shared helpers for break-*.py. Base site: DSL_BASE (default http://localhost:5190)."""
import os, time, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('DSL_BASE', 'http://localhost:5190')
PW = 'Passw0rd!x'
def url(p, lang='ru'): return f"{BASE}/{'en/' if lang=='en' else ''}{p}"
class S:
    def __init__(s, pw, **kw):
        s.b = pw.chromium.launch(); s.ctx = s.b.new_context(viewport={'width':1366,'height':800}, **kw)
        s.errs = []; s.ctx.on('page', s._w)
    def _w(s, p):
        p.on('console', lambda m: s.errs.append(('console', m.text[:200])) if m.type=='error' else None)
        p.on('pageerror', lambda e: s.errs.append(('pageerror', str(e)[:200])))
    def page(s):
        p = s.ctx.new_page(); p.set_default_timeout(8000); return p
def register(p, name, email, pw=PW, lang='ru'):
    p.goto(url('app/register.html', lang))
    p.fill('#name', name); p.fill('#email', email); p.fill('#password', pw); p.fill('#confirm', pw)
    p.click('#auth-form [type=submit]'); p.wait_for_url('**/welcome.html', timeout=10000)
