from lib import *
with sync_playwright() as p:
    t=T("probe"); t.start(p); pg=t.pg
    pg.goto(BASE+"/app/register.html")
    print("maxlength", pg.evaluate("['name','email','password','confirm'].map(i=>i+':'+document.getElementById(i).maxLength)"))
    def tryname(n):
        pg.goto(BASE+"/app/register.html"); pg.fill("#name",n); pg.fill("#email","x%d@example.com"%len(n)); pg.fill("#password","test-phrase-2026"); pg.fill("#confirm","test-phrase-2026")
        pg.click("#auth-form [type=submit]"); pg.wait_for_timeout(1300)
        ok="register" not in pg.url
        nm=pg.evaluate("JSON.parse(localStorage.getItem('dslkit.accounts')||'[]').map(a=>a.name.length)")
        pg.evaluate("localStorage.clear()")
        print(repr(n[:25]),len(n),"accepted" if ok else "rejected", nm)
    for n in ["Ксения","漢字名","مرحبا","Ёжик 🦔","Анна-Мария","O'Brien","J. R.","Ксения2","A"*60,"A"*61,"A"*5000,"Ab","A"]:
        tryname(n)
