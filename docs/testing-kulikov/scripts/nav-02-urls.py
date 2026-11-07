"""Direct URLs: odd parameters, junk, unicode, missing pages, traversal, methods.
usage: python nav-02-urls.py   -> out/urls.json
"""
import sys, json, urllib.request, urllib.error, http.client
sys.path.insert(0, '.')
from nav_common import *

rows = []


def raw(path, method='GET'):
    host = BASE.replace('http://', '')
    c = http.client.HTTPConnection(host, timeout=15)
    try:
        c.request(method, path)
        r = c.getresponse(); body = r.read(300)
        return r.status, r.getheader('Content-Type', ''), body[:60]
    except Exception as ex:
        return 'ERR', str(ex)[:40], b''
    finally:
        c.close()


# --- HTTP level ---
http_cases = [
    '/', '/index.html', '/en/', '/en/index.html', '/app/', '/app', '/en/app/', '/index', '/app/dashboard', '/app/nope.html', '/en/app/nope.html', '/nope', '/nope/',
    '/%D1%82%D0%B5%D1%81%D1%82.html', '/app/%00.html', '/..%2f..%2ftools/server.js', '/%2e%2e/%2e%2e/package.json', '/app/..%5c..%5cpackage.json', '/tools/server.js',
    '/package.json', '/.git/config', '/js/script.js', '/js/', '/css/', '/sw.js', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml', '/privacy.html', '/en/privacy.html',
    '/thanks.html', '/en/thanks.html', '/errors/404.html', '/errors/500.html', '/api', '/api/render', '/INDEX.HTML', '/app/Dashboard.html', '//app/login.html', '/app//login.html',
    '/app/login.html/extra', '/app/login.html?x=' + 'a' * 2000, '/favicon.ico', '/images/favicon.svg', '/%', '/%zz', '/app/login.html%20',
]
for c in http_cases:
    st, ct, body = raw(c)
    rows.append(('HTTP GET', c[:80], st, ct[:30], body.decode('utf-8', 'replace').replace('\n', ' ')[:40]))
for m in ('POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE'):
    st, ct, body = raw('/index.html', m)
    rows.append((f'HTTP {m}', '/index.html', st, ct[:30], ''))

# --- Browser level: odd parameters on app pages ---
PARAMS = ['', '?p=', '?p=nope', '?p=%00', '?p=' + 'x' * 500, '?my=', '?my=nope', '?tpl=', '?tpl=nope', '?template=', '?template=nope', '?template=idef0', '?template=__proto__',
          '?template=constructor', '?template=toString', '?q=', '?q=<b>x</b>', '?q=%E0%A4%A', '?q=' + 'я' * 300, '?p=a&p=b', '?p[]=1', '?%D0%BF=1', '?p=%F0%9F%98%80', '?p=../../etc/passwd',
          '?template=idef0&p=nope&tpl=nope&my=nope', '?lang=en', '?theme=dark', '#', '#x', '#main', '?#', '?a=1#b']
with sync_playwright() as pw:
    s = Session(pw)
    p = s.page()
    register(p, 'Адрес Проверкин', 'url%d@example.com' % int(time.time()))
    json.dump(rows, open('out/urls.json', 'w'))
    for path in ['app/editor.html', 'app/dashboard.html', 'app/welcome.html', 'app/settings.html', 'app/docs.html']:
        for q in PARAMS:
            for lang in ('ru',):
                err0 = len(s.errors); dialogs = []
                h = lambda d, dialogs=dialogs: (dialogs.append(d.message[:30]), d.dismiss())
                p.on('dialog', h)
                st = None
                try:
                    r = p.goto(url(path + q, lang), timeout=30000); st = r.status if r else None
                    p.wait_for_timeout(700)
                    final = p.url.replace(BASE, '')
                    title = p.title()
                    text = p.evaluate("()=>document.body.innerText.length")
                    inj = p.evaluate("()=>!!document.querySelector('main b, #project-list b, .code b')")
                    note = p.evaluate("()=>document.querySelector('.editor-status__saved')?.textContent||''")
                    res = f'{st} -> {final[:60]} | title="{title[:25]}" | text={text} | note="{note[:35]}" | dialogs={len(dialogs)} | inj={inj}'
                except Exception as ex:
                    res = f'ERROR {str(ex)[:80]}'
                errs = [f'{k}:{m[:60]}' for k, u, m in s.errors[err0:] if 'kroki' not in (u + m).lower()]
                p.remove_listener('dialog', h)
                rows.append(('PAGE', (path + q)[:90], res, '; '.join(errs)[:200], ''))
                print(rows[-1], flush=True)
                if 'crashed' in res or 'Target' in res:
                    p = s.page()
    # missing pages in a browser: look of the 404 page
    for u in ['/nope.html', '/app/nope.html', '/en/nope.html', '/en/app/nope.html']:
        r = p.goto(BASE + u); p.wait_for_timeout(300)
        links = p.evaluate("()=>[...document.querySelectorAll('a')].map(a=>a.getAttribute('href'))")
        rows.append(('404PAGE', u, r.status, p.title()[:40], str(links)))
        try:
            p.click('a >> nth=0'); p.wait_for_timeout(500); rows.append(('404LINK', u, p.url.replace(BASE, ''), '', ''))
        except Exception as ex:
            rows.append(('404LINK', u, 'no link', str(ex)[:50], ''))
    json.dump(rows, open('out/urls.json', 'w'), indent=1)
    s.close()
print('done', len(rows))
