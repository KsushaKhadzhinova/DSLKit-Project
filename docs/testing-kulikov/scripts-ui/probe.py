from projects_helpers import *
with sync_playwright() as p:
    t=T("probe"); t.start(p); pg=setup(t)
    for name in ["Новое имя","<b>x</b>","Ё"*600,"🦔"]:
        m=act(pg,"rename",0,answer=name); print("rename",name[:10],"->",titles(pg)[0][:20],"| dlg",m)
    before=titles(pg)[0]
    for ans in ["","   "]:
        try:
            m=act(pg,"rename",0,answer=ans); print("ans",repr(ans),"->",titles(pg)[0][:20],m)
        except Exception as e:
            print("ERR",str(e)[:200]); pg.screenshot(path=SC+"probe-rename-fail.png"); print(pg.evaluate("[...document.querySelectorAll('.project-card__actions:not([hidden])')].length"))
            break
