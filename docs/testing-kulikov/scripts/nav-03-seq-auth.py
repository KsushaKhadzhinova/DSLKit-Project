"""Sequences: accounts and the protected page (state diagram of the session: guest -> user A -> guest -> user B).
usage: python nav-03-seq-auth.py   -> out/seq-auth.json
"""
import sys, json, time
sys.path.insert(0, '.')
from nav_common import *

R = Report()
STAMP = str(int(time.time()))[-6:]
A = f'a{STAMP}@example.com'
B = f'b{STAMP}@example.com'


def titles(p):
    return p.evaluate("()=>[...document.querySelectorAll('#project-list [data-project]:not([hidden]) .project-card__link')].map(a=>a.textContent.trim())")


def session_user(p):
    return p.evaluate("()=>{const s=JSON.parse(localStorage.getItem('dslkit.session')||'null');return s&&s.userId}")


with sync_playwright() as pw:
    s = Session(pw)
    p = s.page()
    for d in ('dialog',):
        p.on('dialog', lambda dlg: dlg.accept())

    # A01 guest opens the protected page directly
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(800)
    R.add('A01', 'Гость открывает «Мои проекты» по прямому адресу', 'перенаправление на login.html', p.url.replace(BASE, ''), p.url.endswith('login.html'))
    # A02 same in English
    p.goto(url('app/dashboard.html', 'en')); p.wait_for_timeout(800)
    R.add('A02', 'Гость открывает /en/app/dashboard.html', 'перенаправление на вход английской версии', p.url.replace(BASE, ''), p.url.endswith('/en/app/login.html'))
    # A03 register
    register(p, 'Анна Тестова', A)
    R.add('A03', 'Регистрация нового пользователя', 'переход на welcome.html, сессия создана', f"{p.url.replace(BASE,'')} session={session_user(p) is not None}", p.url.endswith('welcome.html') and session_user(p) is not None)
    uidA = session_user(p)
    # A04 dashboard of A has seeded projects
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(600)
    ta = titles(p)
    R.add('A04', 'Вошедший открывает «Мои проекты»', 'видны 6 стартовых диаграмм', f'{len(ta)} проектов', len(ta) == 6)
    # A05 create own project: rename first card
    p.evaluate("()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('dslkit.projects.'));const a=JSON.parse(localStorage[k]);a[0].title='ТолькоУА';localStorage[k]=JSON.stringify(a)}")
    # A06 logout
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(500)
    p.click('[data-auth-logout]'); p.wait_for_timeout(800)
    R.add('A06', 'Выход', 'переход на главную, сессии нет', f"{p.url.replace(BASE,'')} session={session_user(p)}", session_user(p) is None and p.url.endswith('/') or p.url.endswith('index.html'))
    # A07 back after logout
    p.go_back(); p.wait_for_timeout(1000)
    visible = p.locator('#project-list .project-list__item:visible').count() if 'dashboard' in p.url else 0
    R.add('A07', 'После выхода нажать «Назад» (возврат на защищённую страницу)', 'страница «Мои проекты» не показывает проекты, ведёт на вход', f"{p.url.replace(BASE,'')} видимых карточек={visible}", ('login' in p.url) or visible == 0)
    p.go_forward(); p.wait_for_timeout(400)
    # A08 reload protected after logout
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(600)
    R.add('A08', 'После выхода открыть dashboard.html заново', 'перенаправление на вход', p.url.replace(BASE, ''), p.url.endswith('login.html'))
    # A09 wrong password
    p.goto(url('app/login.html')); p.fill('#email', A); p.fill('#password', 'WrongPass1!'); p.click('#auth-form [type=submit]'); p.wait_for_timeout(700)
    err = p.inner_text('#auth-error') if p.locator('#auth-error').is_visible() else ''
    R.add('A09', 'Вход с чужим (неверным) паролем', 'сообщение об ошибке, остаёмся на входе, сессии нет', f'{p.url.replace(BASE,"")} сообщение="{err[:40]}" session={session_user(p)}', 'login' in p.url and err != '' and session_user(p) is None)
    # A10 unknown email
    p.fill('#email', 'nobody%s@example.com' % STAMP); p.fill('#password', 'Passw0rd!x'); p.click('#auth-form [type=submit]'); p.wait_for_timeout(700)
    err2 = p.inner_text('#auth-error') if p.locator('#auth-error').is_visible() else ''
    R.add('A10', 'Вход с несуществующей почтой', 'то же сообщение, что и при неверном пароле', f'"{err2[:40]}" == "{err[:40]}"', err2 == err and err2 != '')
    # A11 password cleared after error
    R.add('A11', 'После неудачного входа поле пароля очищено', 'пустое', repr(p.input_value('#password')), p.input_value('#password') == '')
    # A12 login ok
    p.fill('#email', A.upper()); p.fill('#password', 'Passw0rd!x'); p.click('#auth-form [type=submit]'); p.wait_for_timeout(1200)
    R.add('A12', 'Вход с почтой в ВЕРХНЕМ регистре', 'вход выполнен (почта нечувствительна к регистру)', p.url.replace(BASE, ''), p.url.endswith('dashboard.html'))
    ta2 = titles(p)
    R.add('A13', 'После повторного входа проекты на месте', 'ТолькоУА есть среди проектов', str(ta2[:2]), 'ТолькоУА' in ta2)
    # A14 login page when already signed in
    p.goto(url('app/login.html')); p.wait_for_timeout(800)
    R.add('A14', 'Вошедший открывает login.html', 'перенаправление на dashboard.html', p.url.replace(BASE, ''), p.url.endswith('dashboard.html'))
    p.goto(url('app/register.html')); p.wait_for_timeout(800)
    R.add('A15', 'Вошедший открывает register.html', 'перенаправление на dashboard.html', p.url.replace(BASE, ''), p.url.endswith('dashboard.html'))
    # A16 logout, register B
    p.click('[data-auth-logout]'); p.wait_for_timeout(600)
    register(p, 'Борис Тестов', B)
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(600)
    tb = titles(p)
    R.add('A16', 'Регистрация второго пользователя в том же браузере', 'видит только свои стартовые проекты, без «ТолькоУА»', str(tb[:3]), 'ТолькоУА' not in tb and len(tb) == 6)
    # A17 register existing
    p.click('[data-auth-logout]'); p.wait_for_timeout(500)
    p.goto(url('app/register.html'))
    for email in (A, ' ' + A.upper() + ' '):
        p.fill('#name', 'Дубль'); p.fill('#email', email); p.fill('#password', 'Passw0rd!x'); p.fill('#confirm', 'Passw0rd!x')
        p.click('#auth-form [type=submit]'); p.wait_for_timeout(800)
        e = p.inner_text('#auth-error') if p.locator('#auth-error').is_visible() else ''
        R.add('A17', f'Регистрация существующей почты «{email}»', 'ошибка «аккаунт уже есть», сессии нет', f'{p.url.replace(BASE,"")} "{e[:35]}" session={session_user(p)}', 'register' in p.url and e != '' and session_user(p) is None)
    # A18 client validation
    p.goto(url('app/register.html'))
    cases = [('', 'x@y.ru', 'Passw0rd!x', 'Passw0rd!x', 'пустое имя'), ('Имя', 'не-почта', 'Passw0rd!x', 'Passw0rd!x', 'плохая почта'),
             ('Имя', 'c%s@example.com' % STAMP, 'short', 'short', 'короткий пароль'), ('Имя', 'd%s@example.com' % STAMP, 'Passw0rd!x', 'Other0rd!x', 'пароли не совпадают')]
    for nm, em, pw1, pw2, label in cases:
        p.goto(url('app/register.html'))
        p.fill('#name', nm); p.fill('#email', em); p.fill('#password', pw1); p.fill('#confirm', pw2)
        p.click('#auth-form [type=submit]'); p.wait_for_timeout(500)
        R.add('A18', f'Регистрация: {label}', 'отказ, остаёмся на форме', p.url.replace(BASE, ''), 'register' in p.url and session_user(p) is None)
    # A19 double click on the submit button creates one account
    p.goto(url('app/register.html'))
    p.fill('#name', 'Дабл'); p.fill('#email', 'dbl%s@example.com' % STAMP); p.fill('#password', 'Passw0rd!x'); p.fill('#confirm', 'Passw0rd!x')
    p.dblclick('#auth-form [type=submit]'); p.wait_for_timeout(1500)
    n = p.evaluate("()=>JSON.parse(localStorage.getItem('dslkit.accounts')||'[]').filter(a=>a.email.startsWith('dbl')).length")
    R.add('A19', 'Двойной щелчок по «Регистрация»', 'создан один аккаунт', f'аккаунтов={n}, url={p.url.replace(BASE,"")}', n == 1)
    # A20 damaged session id
    p.evaluate("()=>localStorage.setItem('dslkit.session', JSON.stringify({userId:'u-nonexistent'}))")
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(600)
    R.add('A20', 'Сессия с несуществующим id', 'как гость: перенаправление на вход', p.url.replace(BASE, ''), p.url.endswith('login.html'))
    p.evaluate("()=>localStorage.setItem('dslkit.session', '{bad json')")
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(600)
    R.add('A21', 'Испорченный JSON в сессии', 'как гость, без ошибок', p.url.replace(BASE, ''), p.url.endswith('login.html'))
    p.evaluate("()=>localStorage.setItem('dslkit.accounts', '[1,null,{\"id\":5}]')")
    p.goto(url('app/login.html')); p.fill('#email', A); p.fill('#password', 'Passw0rd!x'); p.click('#auth-form [type=submit]'); p.wait_for_timeout(700)
    e = p.inner_text('#auth-error') if p.locator('#auth-error').is_visible() else ''
    R.add('A22', 'Вход при испорченном списке аккаунтов', 'сообщение «неверная почта», без падения', f'"{e[:40]}"', 'login' in p.url and e != '')

    # two tabs: login in tab 1, logout in tab 2
    s2 = Session(pw)
    t1 = s2.page(); t1.on('dialog', lambda d: d.accept())
    register(t1, 'Вика Два', 'v%s@example.com' % STAMP)
    t1.goto(url('app/dashboard.html')); t1.wait_for_timeout(600)
    t2 = s2.ctx.new_page(); t2.on('dialog', lambda d: d.accept())
    t2.goto(url('app/dashboard.html')); t2.wait_for_timeout(600)
    t2.click('[data-auth-logout]'); t2.wait_for_timeout(600)
    t1.wait_for_timeout(400)
    guest_vis = t1.locator('[data-auth-guest]:visible').count()
    user_vis = t1.locator('[data-auth-user]:visible').count()
    R.add('A23', 'Выход во второй вкладке, смотрим первую (событие storage)', 'меню первой вкладки показывает «Войти», а не имя', f'guest-кнопок={guest_vis}, user-кнопок={user_vis}', guest_vis > 0 and user_vis == 0)
    list_vis = t1.locator('#project-list .project-list__item:visible').count()
    R.add('A24', 'Та же вкладка 1: защищённый список после выхода в другой вкладке', 'список скрыт или переход на вход', f'url={t1.url.replace(BASE,"")}, карточек={list_vis}', 'login' in t1.url or list_vis == 0)
    # act in tab 1 after logout elsewhere: rename -> where does it write?
    t1.click('.project-card__menu >> nth=0'); t1.click('.project-card__actions:visible [data-act=remove]'); t1.wait_for_timeout(500)
    trashed = t1.evaluate("()=>Object.keys(localStorage).filter(k=>k.includes('projects.u')).map(k=>JSON.parse(localStorage[k]).filter(x=>x.trashedAt).length).reduce((a,b)=>a+b,0)")
    R.add('A25', 'Вкладка 1 (сессии уже нет) отправляет проект в корзину', 'действие отклонено: без сессии данные пользователя не меняются', f'проектов отправлено в корзину данных вышедшего пользователя={trashed}', trashed == 0)
    s2.close()
    # remember: lang switch keeps session
    p.evaluate("()=>localStorage.removeItem('dslkit.accounts')")
    R.dump('out/seq-auth.json')
    print(len(R.rows), 'rows; errors:', [e for e in s.errors if e[0] != 'http404'][:10])
    s.close()
