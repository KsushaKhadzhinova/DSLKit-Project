import json
from playwright.sync_api import sync_playwright
BASE="http://localhost:5391"
OUT="../screens/"
JS = """() => {
 const svg=document.querySelector('.canvas__remote svg'); if(!svg) return {noSvg:true};
 const T=[...svg.querySelectorAll('text')].filter(t=>t.textContent.trim()&&t.getBoundingClientRect().width>0).map(t=>({s:t.textContent.trim().slice(0,30),r:t.getBoundingClientRect()}));
 const inter=(a,b)=>{const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return w>0&&h>0?w*h:0};
 const ov=[];
 for(let i=0;i<T.length;i++)for(let j=i+1;j<T.length;j++){const a=T[i].r,b=T[j].r;const ar=Math.min(a.width*a.height,b.width*b.height);const x=inter(a,b);if(ar>0&&x/ar>0.25)ov.push([T[i].s,T[j].s,Math.round(100*x/ar)]);}
 const B=[...svg.querySelectorAll('rect,ellipse')].map(r=>r.getBoundingClientRect()).filter(r=>r.width>12&&r.height>12);
 const bo=[];
 const contains=(a,b)=>a.left<=b.left+1&&a.right>=b.right-1&&a.top<=b.top+1&&a.bottom>=b.bottom-1;
 for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){if(contains(B[i],B[j])||contains(B[j],B[i]))continue;const x=inter(B[i],B[j]);const m=Math.min(B[i].width*B[i].height,B[j].width*B[j].height);if(x/m>0.1)bo.push([i,j,Math.round(100*x/m)]);}
 const vb=svg.getBoundingClientRect(); const cut=T.filter(t=>t.r.right>vb.right+2||t.r.left<vb.left-2||t.r.bottom>vb.bottom+2||t.r.top<vb.top-2).map(t=>t.s);
 return {texts:T.length,blocks:B.length,textOverlaps:ov.slice(0,6),nTextOv:ov.length,blockOverlaps:bo.slice(0,6),nBlockOv:bo.length,clipped:cut.slice(0,5)};
}"""
res={}
with sync_playwright() as p:
    b=p.chromium.launch(channel="msedge")
    ctx=b.new_context(viewport={"width":1366,"height":800})
    ctx.add_init_script("try{localStorage.setItem('dslkit.tour-done','true')}catch(e){}")
    pg=ctx.new_page()
    errs=[]
    pg.on("console",lambda m: errs.append(m.text[:200]) if m.type=="error" else None)
    pg.on("pageerror",lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE+"/app/editor.html?template=bpmn"); pg.wait_for_timeout(800)
    keys=pg.evaluate("import('/js/notations/index.js').then(m=>m.NOTATION_KEYS)")
    for k in keys:
        errs.clear()
        pg.goto(BASE+f"/app/editor.html?template={k}"); pg.wait_for_timeout(1100)
        r=pg.evaluate(JS)
        r["errors"]=list(errs)
        r["caption"]=pg.evaluate("document.querySelector('#canvas-figure figcaption').textContent.trim().slice(0,70)")
        r["problems"]=pg.evaluate("document.querySelector('.code__line--error')?1:0")
        pg.locator("#canvas-figure").screenshot(path=OUT+f"nt-{k}.png")
        res[k]=r
        print(k,json.dumps(r,ensure_ascii=False)[:300],flush=True)
    b.close()
json.dump(res,open("notations.json","w"),ensure_ascii=False,indent=1)
