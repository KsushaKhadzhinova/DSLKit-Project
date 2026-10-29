import sys; sys.path.insert(0,'.')
from nav_common import *
with sync_playwright() as pw:
    b=pw.chromium.launch(); p=b.new_page()
    p.on('console',lambda m:print('C',m.type,m.text[:150])); p.on('pageerror',lambda e:print('PE',e))
    p.goto(url('app/register.html')); p.wait_for_timeout(1500)
    p.fill('#name','D'); p.fill('#email','dbgx@example.com'); p.fill('#password','Passw0rd!x'); p.fill('#confirm','Passw0rd!x')
    p.click('#auth-form [type=submit]'); p.wait_for_timeout(6000)
    print(p.url, p.evaluate("()=>[Object.keys(localStorage), document.querySelector('#auth-error').textContent, document.querySelector('#auth-form [type=submit]').disabled]"))
    b.close()
