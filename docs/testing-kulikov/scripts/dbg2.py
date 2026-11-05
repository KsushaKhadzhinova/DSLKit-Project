import sys; sys.path.insert(0,'.')
from nav_common import *
with sync_playwright() as pw:
    s=Session(pw); p=s.page()
    p.goto(url('app/register.html')); p.wait_for_timeout(1000)
    p.fill('#name','D'); p.fill('#email','dbgx@example.com'); p.fill('#password','Passw0rd!x'); p.fill('#confirm','Passw0rd!x')
    p.click('#auth-form [type=submit]'); p.wait_for_timeout(3000)
    print(p.url, s.errors, p.evaluate("()=>document.querySelector('#auth-error')?.textContent"))
    s.close()
