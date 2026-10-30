import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE="http://localhost:5391"
SC=str(Path(__file__).parent.parent/"screens")+"/"
class T:
    def __init__(s, name):
        s.name=name; s.rows=[]; s.errors=[]; s.p=None; s.pg=None; s.ctx=None; s.b=None
    def start(s, p, w=1366, h=800, tour=True, lang=None):
        s.p=p
        s.b=p.chromium.launch(channel="msedge")
        s.new_ctx(w,h,tour)
    def new_ctx(s,w=1366,h=800,tour=True, **kw):
        if s.ctx: s.ctx.close()
        s.ctx=s.b.new_context(viewport={"width":w,"height":h}, **kw)
        if tour: s.ctx.add_init_script("try{if(!sessionStorage.getItem('__wiped')){localStorage.setItem('dslkit.tour-done','true')}}catch(e){}")
        s.pg=s.page()
    def page(s, ctx=None):
        pg=(ctx or s.ctx).new_page(); pg.set_default_timeout(30000)
        _g=pg.goto
        pg.goto=lambda url,**k: _g(url,**{"wait_until":"domcontentloaded",**k})
        pg.on("pageerror",lambda e: s.errors.append(("pageerror",pg.url,str(e)[:200])))
        pg.on("console",lambda m: s.errors.append(("console",pg.url,m.text[:200])) if m.type=="error" and "favicon" not in m.text else None)
        return pg
    def check(s, id_, what, fn, shot=None):
        n0=len(s.errors)
        try:
            r=fn()
            note=r if isinstance(r,str) else ""
            res="Pass"
        except AssertionError as e:
            res="Fail"; note=str(e)[:300]
        except Exception as e:
            res="Fail"; note="Исключение теста: "+" ".join(str(e).splitlines()[:2])[:250]
        ne=[e for e in s.errors[n0:]]
        if ne and res=="Pass" and not any(k in id_ for k in ()):
            note=(note+" ").lstrip()+"Консоль: "+"; ".join(f"{x[0]}:{x[2][:80]}" for x in ne[:2])
            if any(x[0]=="pageerror" for x in ne): res="Fail"
        if res=="Fail" or shot:
            try: s.pg.screenshot(path=SC+f"{id_}.png")
            except Exception: pass
        s.rows.append({"id":id_,"what":what,"res":res,"note":note})
        print(res,id_,note[:150],flush=True)
    def save(s):
        json.dump(s.rows,open(Path(__file__).parent/f"{s.name}.json","w"),ensure_ascii=False,indent=1)
def yes(c,m):
    if not c: raise AssertionError(m)
def eq(a,b,m=""):
    if a!=b: raise AssertionError(f"{m} ожидалось {b!r}, получено {a!r}")
