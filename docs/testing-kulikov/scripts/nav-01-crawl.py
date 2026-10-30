"""Click every visible interactive element of every page and record what happens.
usage: python nav-01-crawl.py <ru|en> <guest|user> [page ...]   -> out/crawl-<lang>-<auth>[-tag].json
"""
import sys, json
sys.path.insert(0, '.')
from nav_common import *

lang, auth = sys.argv[1], sys.argv[2]
pages = sys.argv[3:] or PAGES
SEL = 'a, button, input, select, textarea, summary, [role=tab], [role=button], [role=switch], [tabindex="0"]'

TAG = "() => { let n = 0; document.querySelectorAll(%r).forEach(e => { e.dataset.navI = n++; }); return n; }" % SEL
DESCR = """(i) => { const e = document.querySelector('[data-nav-i="'+i+'"]'); if(!e) return null;
  const r = e.getBoundingClientRect(); const vis = !e.hidden && !!(e.offsetParent || e.getClientRects().length) && r.width>0;
  return {tag:e.tagName.toLowerCase(), href:e.getAttribute('href'), type:e.getAttribute('type'), id:e.id,
   act:e.dataset.action||e.dataset.act||e.dataset.section||e.dataset.view||e.dataset.template||e.dataset.panel||'',
   text:(e.getAttribute('aria-label')||e.textContent||e.value||'').replace(/\\s+/g,' ').trim().slice(0,50), vis, dis: e.disabled||e.getAttribute('aria-disabled')==='true'}; }"""
SIG = """() => { const s = document.body.innerHTML + '|' + [...document.querySelectorAll('[aria-pressed],[aria-expanded],[aria-checked],[aria-selected],[open],.modal')].map(e=>e.outerHTML.slice(0,200)).join('') + '|' + document.documentElement.dataset.theme + '|' + document.activeElement.tagName; let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))|0; return h + ':' + s.length; }"""


def storage_sig(page):
    return json.dumps(ls(page), sort_keys=True)


out = []
with sync_playwright() as pw:
    s = Session(pw)
    ctx = s.ctx
    p = s.page()
    if auth == 'user':
        register(p, 'Тест Кролик', 'crawl-%s@example.com' % lang, lang=lang)
    p.goto(url('index.html', lang)); p.wait_for_timeout(300)
    for path in pages:
        full = url(path, lang)
        p.goto(full); p.wait_for_timeout(900)
        snap = ls(p)
        p.goto(full); p.wait_for_timeout(600)
        n = p.evaluate(TAG)
        descs = [p.evaluate(DESCR, i) for i in range(n)]
        print(f'== {lang} {auth} {path}: {n} elements', flush=True)
        json.dump(out, open(f'out/crawl-{lang}-{auth}.partial.json', 'w', encoding='utf-8'), ensure_ascii=False)
        seen = {}
        for i, d in enumerate(descs):
            rec = dict(page=path, lang=lang, auth=auth, i=i, **d)
            kk = (d['tag'], d['act'], (d['href'] or '').split('=')[0], '' if d['act'] else d['text'][:6]) if path.endswith('dashboard.html') else None
            if kk is not None:
                seen[kk] = seen.get(kk, 0) + 1
                if seen[kk] > 2:
                    rec['result'] = 'same as the previous cards (repeated element, not clicked again)'; rec['errors'] = []; out.append(rec); continue
            dialogs = []

            def on_dialog(dlg, dialogs=dialogs):
                dialogs.append((dlg.type, dlg.message[:80]))
                try:
                    dlg.dismiss() if dlg.type == 'confirm' else dlg.accept()
                except Exception:
                    pass
            nav_log = []

            def on_resp(r, nav_log=nav_log):
                if r.request.resource_type == 'document':
                    nav_log.append((r.status, r.url))
            p.on('dialog', on_dialog); p.on('response', on_resp)
            err0 = len(s.errors); pages0 = len(ctx.pages)
            try:
                p.goto(full)
                p.evaluate("(s)=>{localStorage.clear(); for (const k in s) localStorage.setItem(k, s[k]);}", snap)
                p.goto(full); p.wait_for_timeout(500)
                p.evaluate(TAG)
                nav_log.clear()
                if not d['vis'] and path.endswith('dashboard.html'):
                    if d['act'] in ('like', 'copy', 'copy-template') or 'template=' in (d['href'] or ''):
                        p.click('[data-section="shared"]'); p.wait_for_timeout(200)
                    elif d['act'] in ('restore', 'purge'):
                        p.evaluate("()=>{const k=Object.keys(localStorage).find(k=>/^projects/.test(k)); const a=JSON.parse(localStorage[k]); a[0].trashedAt=Date.now(); localStorage[k]=JSON.stringify(a);}")
                        p.reload(); p.wait_for_timeout(400); p.evaluate(TAG)
                        p.click('[data-section="trash"]'); p.wait_for_timeout(200)
                    elif d['act'] in ('edit', 'remove-template') or (d['act'] == 'rename' and False):
                        p.evaluate("()=>{const k=Object.keys(localStorage).find(k=>/^templates/.test(k))||'templates'; localStorage[k]=JSON.stringify([{id:'tx1',title:'T1',notation:'idef0',source:'x',created:1,updated:1}]);}")
                        p.reload(); p.wait_for_timeout(400); p.evaluate(TAG)
                        p.click('[data-section="templates"]'); p.wait_for_timeout(200)
                    p.evaluate("(i)=>{const e=document.querySelector('[data-nav-i=\"'+i+'\"]'); const m=e&&e.closest('.project-card')?.querySelector('.project-card__menu'); if(m && e.closest('.project-card__actions')?.hidden) m.click();}", i)
                el = p.locator(f'[data-nav-i="{i}"]')
                if el.count() == 0 or not el.is_visible():
                    rec['result'] = 'NOT-CLICKABLE (hidden in this state)'
                    out.append(rec); p.remove_listener('dialog', on_dialog); p.remove_listener('response', on_resp); continue
                before_sig = p.evaluate(SIG); before_store = storage_sig(p); before_url = p.url
                tag = d['tag']
                if tag in ('input', 'textarea') and d['type'] not in ('checkbox', 'radio', 'file', 'button', 'submit'):
                    el.click(timeout=3000); el.fill('проверка'); p.keyboard.press('Enter')
                elif tag == 'select':
                    if el.locator('option').count() > 1:
                        el.select_option(index=1)
                elif d['type'] == 'file':
                    rec['result'] = 'file input (see import tests)'
                    out.append(rec); p.remove_listener('dialog', on_dialog); p.remove_listener('response', on_resp); continue
                elif (d['href'] or '').startswith('#'):
                    el.focus(); p.keyboard.press('Enter')
                else:
                    try:
                        el.click(timeout=2500)
                    except Exception:
                        el.click(timeout=2500, force=True); rec['note'] = 'needed force click (covered or invisible)'
                p.wait_for_timeout(500)
                after_url = p.url
                new_tab = len(ctx.pages) > pages0
                parts = []
                if after_url != before_url:
                    parts.append(f'URL -> {after_url.replace(BASE, "")}')
                if nav_log:
                    parts.append('HTTP ' + ', '.join(f'{c} {u.replace(BASE, "")}' for c, u in nav_log[-3:]))
                if new_tab:
                    parts.append('new tab')
                try:
                    if after_url == before_url:
                        if p.evaluate(SIG) != before_sig:
                            parts.append('DOM changed')
                        if storage_sig(p) != before_store:
                            parts.append('storage changed')
                except Exception:
                    pass
                if dialogs:
                    parts.append('dialog: ' + '; '.join(f'{t} "{m}"' for t, m in dialogs))
                rec['result'] = ' | '.join(parts) if parts else 'NO VISIBLE EFFECT'
                for q in ctx.pages[pages0:]:
                    try:
                        q.close()
                    except Exception:
                        pass
            except Exception as ex:
                rec['result'] = 'ERROR ' + str(ex).splitlines()[0][:120]
            rec['errors'] = [f'{k}:{u.replace(BASE, "")}:{m[:100]}' for k, u, m in s.errors[err0:]]
            p.remove_listener('dialog', on_dialog); p.remove_listener('response', on_resp)
            out.append(rec)
    json.dump(out, open(f'out/crawl-{lang}-{auth}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    s.close()
print('done', len(out))
