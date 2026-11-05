import sys; sys.path.insert(0,'.')
from sclib import *

def clear_projects(u):
    """Moves every project (the starter ones too) to the trash and empties it - through the buttons of the page."""
    u.dash('mine')
    n = 0
    while u.p.locator('#project-list .project-list__item:not([hidden])').count() > 0 and n < 200:
        u.card_act(0, 'remove'); n += 1
    u.p.click('[data-section="trash"]'); u.p.wait_for_timeout(300)
    u.p.locator('[data-new-template] + button').click()
    u.p.wait_for_timeout(300)
    return n

def search(u, q):
    u.p.fill('.app-topbar__search-input', q); u.p.wait_for_timeout(250)
    r = (u.titles(), u.count_text()); return r

def chip(u, f):
    u.p.click(f'.filter__chip[data-filter="{f}"]'); u.p.wait_for_timeout(250)
    return u.titles()

def sort(u, v):
    u.p.select_option('#project-sort', v); u.p.wait_for_timeout(250)
    return u.titles()
