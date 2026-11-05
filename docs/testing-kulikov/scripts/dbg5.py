import sys,os,time; sys.path.insert(0,'.')
from nav_common import *
with sync_playwright() as pw:
    s=Session(pw); s.ctx.add_init_script("try{localStorage.setItem('dslkit.tour-done','true')}catch(e){}")
    p=s.page(); p.set_default_timeout(15000)
    p.goto(url('app/editor.html')); p.wait_for_timeout(1000)
    for name in ['html.txt','unsupported.txt','mermaid.txt']:
        t=time.time()
        try:
            p.set_input_files('.editor-import__file', os.path.join('out',name)); p.wait_for_timeout(900)
            print(name,'ok',round(time.time()-t,1),p.evaluate("()=>document.querySelector('.canvas__status').textContent"))
        except Exception as e: print(name,'ERR',str(e)[:100]); break
    s.close()
