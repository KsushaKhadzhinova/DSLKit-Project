#!/usr/bin/env python3
"""Генерирует SVG экранов DSLKit для импорта в Figma: wireframes / mockups / designs.
Запуск: python figma/generate.py"""
import html
from pathlib import Path

OUT = Path(__file__).parent
SANS = "Inter, 'Segoe UI', Arial, sans-serif"
MONO = "'JetBrains Mono', Consolas, monospace"

TH = {
 'light': dict(bg='#f8f9fc', sf='#ffffff', br='#dde1e9', tx='#1c1f2e', tx2='#4a5068', tx3='#6b7285', ac='#2563eb', acs='#e8efff', act='#2563eb', on='#ffffff', run='#16a34a', err='#dc2626', wn='#d97706', kw='#7c3aed', st='#15803d', hl='#fff7d6'),
 'dark': dict(bg='#1e1e2e', sf='#181825', br='#313244', tx='#cdd6f4', tx2='#a6adc8', tx3='#7f849c', ac='#2563eb', acs='#27304d', act='#8bb0ff', on='#ffffff', run='#16a34a', err='#f87171', wn='#fbbf24', kw='#c4a5ff', st='#86efac', hl='#3a3520'),
 'mock': dict(bg='#efefef', sf='#ffffff', br='#cccccc', tx='#333333', tx2='#555555', tx3='#888888', ac='#666666', acs='#e4e4e4', act='#444444', on='#ffffff', run='#444444', err='#777777', wn='#999999', kw='#444444', st='#777777', hl='#f0f0f0'),
 'wire': dict(bg='#ffffff', sf='#ffffff', br='#a8a8a8', tx='#666666', tx2='#777777', tx3='#999999', ac='#d4d4d4', acs='#f0f0f0', act='#666666', on='#555555', run='#d9d9d9', err='#bbbbbb', wn='#cccccc', kw='#888888', st='#999999', hl='#f3f3f3'),
}
IC = {
 'play': '<path d="M6 4l10 6-10 6z"/>', 'save': '<path d="M4 4h10l2 2v10H4z"/><path d="M7 4v4h5V4M7 16v-5h6v5"/>',
 'undo': '<path d="M8 5L4 9l4 4"/><path d="M4 9h7a4 4 0 010 8H9"/>', 'redo': '<path d="M12 5l4 4-4 4"/><path d="M16 9H9a4 4 0 000 8h2"/>',
 'share': '<circle cx="5" cy="10" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 9l6-3M7 11l6 3"/>',
 'ai': '<path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z"/>', 'fmt': '<path d="M4 6h12M4 10h8M4 14h10"/>',
 'chk': '<path d="M4 10l4 4 8-8"/>', 'x': '<path d="M5 5l10 10M15 5L5 15"/>', 'warn': '<path d="M10 3l8 14H2z"/><path d="M10 8v4M10 14v.5"/>',
 'err': '<circle cx="10" cy="10" r="7"/><path d="M7 7l6 6M13 7l-6 6"/>', 'search': '<circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/>',
 'gear': '<circle cx="10" cy="10" r="3"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.5 4.5l2 2M13.5 13.5l2 2M15.5 4.5l-2 2M6.5 13.5l-2 2"/>',
 'file': '<path d="M5 3h7l3 3v11H5z"/><path d="M12 3v3h3"/>', 'folder': '<path d="M3 6h5l2 2h7v8H3z"/>', 'plus': '<path d="M10 4v12M4 10h12"/>',
 'chev': '<path d="M6 8l4 4 4-4"/>', 'menu': '<path d="M3 6h14M3 10h14M3 14h14"/>', 'code': '<path d="M7 6l-4 4 4 4M13 6l4 4-4 4"/>',
 'eye': '<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2"/>', 'git': '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="15" r="2"/><circle cx="14" cy="8" r="2"/><path d="M6 7v6M14 10c0 3-4 2-8 4"/>',
 'fit': '<path d="M4 8V4h4M12 4h4v4M16 12v4h-4M8 16H4v-4"/>', 'cloud': '<path d="M6 15a4 4 0 010-8 5 5 0 019.5 1.5A3.2 3.2 0 0115 15z"/>',
 'home': '<path d="M3 10l7-6 7 6M5 9v7h10V9"/>', 'users': '<circle cx="7" cy="7" r="3"/><path d="M2 16c0-3 2-5 5-5s5 2 5 5M14 4a3 3 0 010 6M16 16c0-2-1-4-3-5"/>',
 'dots': '<circle cx="5" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>',
 'trash': '<path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10"/>', 'layout': '<path d="M3 4h14v12H3zM3 8h14M8 8v8"/>', 'sun': '<circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M15.5 4.5l-1.4 1.4M5.9 14.1l-1.4 1.4"/>',
}


def esc(s):
    return html.escape(s).replace('  ', '  ')


class S:
    def __init__(s, w, h, mode, theme):
        s.w, s.h, s.m, s.c, s.o = w, h, mode, TH[theme], []

    def k(s, c):
        return s.c.get(c, c) if c else 'none'

    def g(s, name):
        s.o.append(f'<g id="{name}">')

    def e(s):
        s.o.append('</g>')

    def r(s, x, y, w, h, fill=None, stroke=None, rx=0, sw=1, op=None):
        a = f' opacity="{op}"' if op else ''
        s.o.append(f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx:g}" fill="{s.k(fill)}" stroke="{s.k(stroke)}" stroke-width="{sw}"{a}/>')

    def ci(s, cx, cy, rad, fill=None, stroke=None, sw=1):
        s.o.append(f'<circle cx="{cx:g}" cy="{cy:g}" r="{rad:g}" fill="{s.k(fill)}" stroke="{s.k(stroke)}" stroke-width="{sw}"/>')

    def ln(s, x1, y1, x2, y2, col='br', sw=1):
        s.o.append(f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{s.k(col)}" stroke-width="{sw}"/>')

    def t(s, x, y, txt, size=12, fill='tx', weight=400, mono=False, anchor='start'):
        s.o.append(f'<text x="{x:g}" y="{y:g}" font-family="{MONO if mono else SANS}" font-size="{size}" font-weight="{weight}" fill="{s.k(fill)}" text-anchor="{anchor}">{esc(txt)}</text>')

    def ic(s, n, x, y, size=16, col='tx2'):
        if s.m == 'wire':
            s.r(x, y, size, size, None, 'br', 2)
            s.o.append(f'<path d="M{x:g} {y:g}L{x+size:g} {y+size:g}M{x+size:g} {y:g}L{x:g} {y+size:g}" stroke="{s.k("br")}" stroke-width="1"/>')
            return
        sc = size / 20
        s.o.append(f'<g transform="translate({x:g} {y:g}) scale({sc:g})" fill="none" stroke="{s.k(col)}" stroke-width="{1.25/sc:g}" stroke-linecap="round" stroke-linejoin="round">{IC[n]}</g>')

    def btn(s, x, y, w, h, label, kind='ghost', icon=None):
        fill, stroke, tc = {'run': ('run', None, 'on'), 'blue': ('ac', None, 'on'), 'ghost': (None, 'br', 'tx'), 'soft': ('acs', None, 'act')}[kind]
        s.r(x, y, w, h, fill, stroke, 6)
        tx = x + 10
        if icon:
            s.ic(icon, x + 8, y + (h - 14) / 2, 14, tc)
            tx += 20
        if label:
            s.t(tx, y + h / 2 + 4, label, 12, tc, 500) if icon or w > 36 else None

    def tgl(s, x, y, on):
        s.r(x, y, 30, 16, 'run' if on else 'br', None, 8)
        s.ci(x + 22 if on else x + 8, y + 8, 6, '#ffffff')

    def pill(s, x, y, label, fill='acs', col='act'):
        w = len(label) * 6.4 + 14
        s.r(x, y, w, 18, fill, None, 9)
        s.t(x + w / 2, y + 13, label, 10, col, 600, anchor='middle')
        return w

    def dots(s, x, y, w, h, step=24):
        if s.m == 'wire':
            return
        s.g('Grid')
        for i in range(int(w // step)):
            for j in range(int(h // step)):
                s.ci(x + 12 + i * step, y + 12 + j * step, 1, 'br')
        s.e()

    def zig(s, x, y, w):
        pts, i = [], 0
        while i * 3 <= w:
            pts.append(f'{x + i*3:g},{y + (2 if i % 2 else 0):g}')
            i += 1
        s.o.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{s.k("err")}" stroke-width="1"/>')

    def code(s, x, y, w, lines, err=3, cur=2, lh=20, fs=12):
        s.g('Code')
        cw = fs * 0.6
        for i, segs in enumerate(lines):
            ly = y + i * lh
            if i == cur:
                s.r(x, ly, w, lh, 'hl')
            if i == err:
                s.r(x, ly, w, lh, 'err', None, 0, 1, 0.12)
            if s.m == 'wire':
                s.r(x + 44, ly + 7, sum(len(a) for a, *_ in segs) * cw * .9, 6, 'br', None, 3, 1, 0.5)
                continue
            s.t(x + 32, ly + 14, str(i + 1), fs - 1, 'tx3', 400, True, 'end')
            s.o.append(f'<text x="{x+44:g}" y="{ly+14:g}" font-family="{MONO}" font-size="{fs}" xml:space="preserve">' + ''.join(
                f'<tspan fill="{s.k(c)}" font-weight="{700 if c == "kw" else 400}">{esc(a)}</tspan>' for a, c in segs) + '</text>')
        if s.m != 'wire' and err is not None and err < len(lines):
            s.zig(x + 44 + 2 * cw, y + err * lh + 17, 5 * cw)
        s.e()

    def out(s, path):
        body = '\n'.join(s.o)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{s.w}" height="{s.h}" viewBox="0 0 {s.w} {s.h}">\n<rect id="Background" width="{s.w}" height="{s.h}" fill="{s.k("bg")}"/>\n{body}\n</svg>\n', encoding='utf-8')


K, ST, TX, C3 = 'kw', 'st', 'tx', 'tx3'
CODE = [[('diagram ', K), ('idef0 ', TX), ('"Order process"', ST)], [('box ', K), ('A0 ', TX), ('"Process order" ', ST), ('{', TX)], [('  input', K), (': Order', TX)],
        [('  contro', K), (': Rules', TX)], [('  output', K), (': Invoice', TX)], [('}', TX)], [('box ', K), ('A1 ', TX), ('"Ship goods" ', ST), ('{', TX)],
        [('  input', K), (': Invoice', TX)], [('}', TX)], [('arrow ', K), ('A0.output -> A1.input', TX)]]


def toolbar(s, W, mobile=False):
    s.g('Toolbar')
    s.r(0, 0, W, 40, 'sf')
    s.ln(0, 40, W, 40)
    s.t(14, 25, 'DSLKit', 14, 'tx', 700)
    s.ln(88, 10, 88, 30)
    s.btn(100, 7, 66, 26, 'Run', 'run', 'play')
    s.btn(174, 7, 82, 26, 'Validate', 'ghost')
    s.ln(266, 10, 266, 30)
    s.ic('undo', 278, 12, 16); s.ic('redo', 304, 12, 16)
    s.ln(334, 10, 334, 30)
    s.ic('fmt', 346, 12, 16)
    x = W - 24
    s.ci(x, 20, 12, 'acs'); s.t(x, 24, 'KX', 9, 'act', 700, anchor='middle')
    s.ic('sun', W - 66, 12, 16)
    s.btn(W - 160, 7, 76, 26, 'Share', 'ghost', 'share')
    s.btn(W - 236, 7, 66, 26, 'Save', 'ghost', 'save')
    s.tgl(W - 330, 12, True); s.t(W - 296, 25, 'Autosave', 11, 'tx2', anchor='start') if W > 1200 else None
    s.btn(W - 500 if W > 1200 else W - 470, 7, 130, 26, 'Diagram: IDEF0', 'soft')
    s.e()


def sidebar(s, x, y, h):
    s.g('Sidebar')
    s.r(x, y, 180, h, 'sf'); s.ln(x + 180, y, x + 180, y + h)
    s.t(x + 14, y + 24, 'EXPLORER', 10, 'tx3', 700)
    for i, (n, a) in enumerate([('order.dsl', 1), ('rules.dsl', 0), ('invoice.dsl', 0)]):
        ry = y + 36 + i * 28
        if a: s.r(x + 6, ry, 168, 26, 'acs', None, 5)
        s.ic('file', x + 14, ry + 5, 16, 'act' if a else 'tx2'); s.t(x + 38, ry + 17, n, 12, 'act' if a else 'tx', 500 if a else 400)
    s.t(x + 14, y + 150, 'TEMPLATES', 10, 'tx3', 700)
    for i, n in enumerate(['IDEF0', 'DFD', 'ERD']):
        s.ic('layout', x + 14, y + 164 + i * 28, 16); s.t(x + 38, y + 177 + i * 28, n, 12, 'tx')
    s.r(x + 12, y + h - 62, 156, 48, 'bg', 'br', 8)
    s.t(x + 22, y + h - 42, 'Beta · 3 из 5 сегодня', 10, 'tx2', 500)
    s.r(x + 22, y + h - 30, 136, 5, 'br', None, 3); s.r(x + 22, y + h - 30, 82, 5, 'ac', None, 3)
    s.e()


def activity(s, y, h):
    s.g('ActivityBar')
    s.r(0, y, 40, h, 'sf'); s.ln(40, y, 40, y + h)
    for i, n in enumerate(['folder', 'search', 'git', 'ai']):
        s.ic(n, 11, y + 14 + i * 44, 18, 'act' if i == 0 else 'tx2')
    s.r(0, y + 8, 2, 36, 'ac')
    s.ic('gear', 11, y + h - 36, 18)
    s.e()


def tabs(s, x, y, w):
    s.g('Tabs')
    s.r(x, y, w, 32, 'bg'); s.ln(x, y + 32, x + w, y + 32)
    for i, (n, a, d) in enumerate([('order.dsl', 1, 1), ('rules.dsl', 0, 0)]):
        tx = x + i * 140
        s.r(tx, y, 140, 32, 'sf' if a else 'bg'); s.ln(tx + 140, y, tx + 140, y + 32)
        if a: s.r(tx, y, 140, 2, 'ac')
        s.t(tx + 14, y + 20, n, 12, 'tx' if a else 'tx3', 500 if a else 400)
        if d: s.ci(tx + 96, y + 16, 3.5, 'wn')
        s.r(tx + 112, y + 6, 20, 20, None, None, 4); s.ic('x', tx + 117, y + 11, 10, 'tx3')
    s.e()


def canvas(s, x, y, w, h, scale=1.0):
    s.g('Canvas')
    s.r(x, y, w, h, 'bg'); s.dots(x, y, w, h)
    cx, cy = x + w / 2, y + h / 2
    bw, bh = 150 * scale, 60 * scale
    boxes = [(cx - 190 * scale, cy - 110 * scale, 'A0', 'Process order'), (cx + 30 * scale, cy - 10 * scale, 'A1', 'Ship goods')]
    for bx, by, a, n in boxes:
        s.r(bx, by, bw, bh, 'sf', 'tx2', 4, 1.5)
        s.t(bx + bw / 2, by + bh / 2 - 2, a, 13 * scale if scale < 1 else 13, 'tx', 700, anchor='middle'); s.t(bx + bw / 2, by + bh / 2 + 15, n, 10, 'tx3', anchor='middle')
    ax1, ay1 = boxes[0][0] + bw, boxes[0][1] + bh / 2
    ax2, ay2 = boxes[1][0], boxes[1][1] + bh / 2
    mx = (ax1 + ax2) / 2
    s.o.append(f'<path d="M{ax1:g} {ay1:g}H{mx:g}V{ay2:g}H{ax2-6:g}" fill="none" stroke="{s.k("tx2")}" stroke-width="1.4"/><path d="M{ax2:g} {ay2:g}l-7 -4v8z" fill="{s.k("tx2")}"/>')
    s.t(mx + 6, (ay1 + ay2) / 2, 'Invoice', 10, 'tx3')
    s.r(x + 14, y + 14, 78, 24, 'sf', 'br', 12); s.t(x + 53, y + 30, 'A-0 › A0', 10, 'tx2', 500, anchor='middle')
    s.btn(x + w - 118, y + 12, 104, 26, 'Auto-layout', 'ghost')
    s.r(x + w - 42, y + h - 100, 30, 88, 'sf', 'br', 6)
    s.ic('plus', x + w - 35, y + h - 92, 16); s.ln(x + w - 42, y + h - 70, x + w - 12, y + h - 70)
    s.t(x + w - 27, y + h - 44, '−', 16, 'tx2', anchor='middle'); s.ln(x + w - 42, y + h - 40, x + w - 12, y + h - 40)
    s.ic('fit', x + w - 35, y + h - 30, 16)
    s.e()


def problems(s, x, y, w, h):
    s.g('BottomPanel')
    s.r(x, y, w, h, 'sf'); s.ln(x, y, x + w, y)
    for i, (n, a) in enumerate([('Problems 3', 1), ('AI', 0), ('Output', 0), ('Versions', 0)]):
        s.t(x + 16 + i * 92, y + 22, n, 11, 'tx' if a else 'tx3', 600 if a else 400)
    s.r(x + 16, y + 30, 70, 2, 'ac'); s.ln(x, y + 32, x + w, y + 32)
    rows = [('err', "Unknown property 'contro' — did you mean 'control'?", 'order.dsl:4'), ('err', 'Unclosed block "A1"', 'order.dsl:7'), ('warn', 'Block A1 has no outputs', 'rules.dsl:2')]
    for i, (k, m, p) in enumerate(rows):
        ry = y + 36 + i * 30
        if i == 0: s.r(x, ry, w, 30, 'acs')
        s.ic(k, x + 16, ry + 7, 16, 'err' if k == 'err' else 'wn'); s.t(x + 40, ry + 19, m, 12, 'tx'); s.t(x + 40 + len(m) * 6.4 + 14, ry + 19, p, 11, 'tx3')
        if i == 0: s.btn(x + w - 120, ry + 3, 104, 24, 'Fix with AI', 'ghost', 'ai')
    s.e()


def status(s, y, W):
    s.g('StatusBar')
    s.r(0, y, W, 22, 'sf'); s.ln(0, y, W, y)
    s.t(12, y + 15, 'IDEF0', 10, 'tx2', 600); s.t(62, y + 15, '⊗ 2   ⚠ 1', 10, 'err'); s.t(130, y + 15, '⎇ main', 10, 'tx2')
    s.t(W - 12, y + 15, 'Autosave ON · Ln 4, Col 12', 10, 'tx2', anchor='end')
    s.e()


def ide(s, W, H, side=True, bottom=True):
    toolbar(s, W)
    ax = 40 + (180 if side else 0)
    activity(s, 40, H - 62)
    if side: sidebar(s, 40, 40, H - 62)
    tabs(s, ax, 40, W - ax)
    ph = 170 if bottom else 0
    cw = (W - ax) * 0.382
    s.r(ax, 72, cw, H - 72 - 22 - ph, 'sf')
    s.code(ax, 80, cw, CODE)
    s.ln(ax + cw, 72, ax + cw, H - 22 - ph)
    canvas(s, ax + cw, 72, W - ax - cw, H - 72 - 22 - ph)
    if bottom: problems(s, ax, H - 22 - ph, W - ax, ph)
    status(s, H - 22, W)


def topbar2(s, W, title=None):
    s.g('Topbar')
    s.r(0, 0, W, 56, 'sf'); s.ln(0, 56, W, 56)
    s.t(24, 35, 'DSLKit', 16, 'tx', 700)
    s.r(W / 2 - 220, 12, 440, 32, 'bg', 'br', 8); s.ic('search', W / 2 - 206, 20, 16); s.t(W / 2 - 180, 33, 'Поиск диаграмм…  Ctrl+K', 12, 'tx3')
    s.btn(W - 230, 14, 150, 30, 'Новая диаграмма', 'blue', 'plus')
    s.ci(W - 40, 28, 14, 'acs'); s.t(W - 40, 32, 'KX', 10, 'act', 700, anchor='middle')
    s.e()


def leftnav(s, y, h, active=0, items=None):
    items = items or [('home', 'Мои проекты'), ('layout', 'Шаблоны'), ('users', 'Общие'), ('trash', 'Корзина')]
    s.g('Nav')
    s.r(0, y, 220, h, 'sf'); s.ln(220, y, 220, y + h)
    for i, (ic, n) in enumerate(items):
        ry = y + 16 + i * 38
        if i == active: s.r(10, ry, 200, 32, 'acs', None, 6)
        s.ic(ic, 22, ry + 8, 16, 'act' if i == active else 'tx2'); s.t(48, ry + 21, n, 13, 'act' if i == active else 'tx', 500 if i == active else 400)
    s.e()
    return y


def dashboard(s, W, H):
    topbar2(s, W)
    leftnav(s, 56, H - 56)
    s.r(16, H - 90, 188, 62, 'bg', 'br', 8); s.t(28, H - 66, 'Beta: 3 из 5 диаграмм', 11, 'tx2', 600)
    s.r(28, H - 52, 164, 6, 'br', None, 3); s.r(28, H - 52, 98, 6, 'ac', None, 3); s.t(28, H - 34, 'Pro — без лимитов', 10, 'act', 600)
    s.t(252, 100, 'Мои проекты', 22, 'tx', 700)
    x = 252
    for n in ['Все', 'IDEF0', 'ERD', 'BPMN', 'DFD']:
        w = s.pill(x, 116, n, 'acs' if n == 'Все' else 'bg', 'act' if n == 'Все' else 'tx2') if False else len(n) * 7 + 22
        s.r(x, 116, w, 26, 'acs' if n == 'Все' else 'sf', None if n == 'Все' else 'br', 13); s.t(x + w / 2, 133, n, 11, 'act' if n == 'Все' else 'tx2', 600, anchor='middle'); x += w + 8
    s.t(W - 40, 133, 'Сначала новые ▾', 12, 'tx2', anchor='end')
    cols, gap = 4, 20
    cw = (W - 252 - 40 - gap * (cols - 1)) / cols
    names = [('Order process', 'IDEF0'), ('Shop schema', 'ERD'), ('Hiring flow', 'BPMN'), ('Data pipeline', 'DFD'), ('Warehouse', 'IDEF0'), ('Users & roles', 'ERD'), ('Release process', 'BPMN'), ('Billing', 'DFD')]
    s.g('Cards')
    for i, (n, nt) in enumerate(names):
        cx, cy = 252 + (i % cols) * (cw + gap), 164 + (i // cols) * 250
        s.r(cx, cy, cw, 228, 'sf', 'br', 12); s.r(cx + 10, cy + 10, cw - 20, 130, 'bg', 'br', 8)
        s.r(cx + 30, cy + 34, 70, 34, 'sf', 'tx2', 3, 1.2); s.r(cx + cw - 100, cy + 82, 70, 34, 'sf', 'tx2', 3, 1.2)
        s.ln(cx + 100, cy + 51, cx + cw - 65, cy + 51, 'tx2', 1.2); s.ln(cx + cw - 65, cy + 51, cx + cw - 65, cy + 82, 'tx2', 1.2)
        s.t(cx + 14, cy + 168, n, 14, 'tx', 600); s.pill(cx + 14, cy + 180, nt); s.t(cx + 14, cy + 214, 'Изменён 2 ч назад', 11, 'tx3')
        s.ic('dots', cx + cw - 30, cy + 154, 16, 'tx3')
    s.e()


def welcome(s, W, H):
    topbar2(s, W)
    cx = W / 2
    s.t(cx, 150, 'Добро пожаловать в DSLKit', 30, 'tx', 700, anchor='middle')
    s.t(cx, 182, 'Пишите код — получайте диаграмму. Выберите нотацию, чтобы начать за 30 секунд.', 14, 'tx2', anchor='middle')
    names = ['IDEF0', 'DFD', 'ERD', 'BPMN', 'UML', 'Сети Петри']
    w, h, gap = 230, 150, 20
    x0 = cx - (3 * w + 2 * gap) / 2
    s.g('Templates')
    for i, n in enumerate(names):
        x, y = x0 + (i % 3) * (w + gap), 226 + (i // 3) * (h + gap)
        s.r(x, y, w, h, 'sf', 'br', 12); s.r(x + 10, y + 10, w - 20, 84, 'bg', 'br', 8)
        s.r(x + 34, y + 30, 50, 28, 'sf', 'tx2', 3, 1.2); s.r(x + w - 84, y + 48, 50, 28, 'sf', 'tx2', 3, 1.2); s.ln(x + 84, y + 44, x + w - 84, y + 62, 'tx2', 1.2)
        s.t(x + 14, y + 120, n, 14, 'tx', 600); s.t(x + 14, y + 138, 'Шаблон с примером', 11, 'tx3')
    s.e()
    by = 226 + 2 * h + 2 * gap + 10
    s.btn(cx - 230, by, 140, 36, 'Пустой файл', 'ghost', 'file'); s.btn(cx - 78, by, 230, 36, 'Импорт PlantUML / Mermaid', 'ghost', 'cloud')
    s.btn(cx + 168, by, 120, 36, 'Тур · 5 шагов', 'blue')
    s.t(cx, by + 70, 'Пропустить', 12, 'tx3', anchor='middle')


def settings(s, W, H):
    topbar2(s, W)
    leftnav(s, 56, H - 56, 0, [('code', 'Редактор'), ('layout', 'Холст'), ('sun', 'Тема'), ('gear', 'Горячие клавиши'), ('ai', 'AI и интеграции'), ('users', 'Аккаунт и тариф')])
    x, w = 280, 760
    s.t(x, 110, 'Настройки · Редактор', 22, 'tx', 700)
    rows = [('Размер шрифта кода', '13 px ▾', 'v'), ('Номера строк', None, 1), ('Перенос строк', None, 0), ('Автодополнение', 'По первому символу ▾', 'v'), ('Автосохранение', None, 1), ('Сетка холста', 'Точки ▾', 'v'), ('Направляющие и отступы', None, 1)]
    s.g('Rows')
    s.r(x, 134, w, len(rows) * 52 + 4, 'sf', 'br', 12)
    for i, (n, v, o) in enumerate(rows):
        ry = 134 + 2 + i * 52
        if i: s.ln(x + 16, ry, x + w - 16, ry)
        s.t(x + 20, ry + 31, n, 13, 'tx')
        if v: s.r(x + w - 220, ry + 10, 200, 32, 'bg', 'br', 6); s.t(x + w - 208, ry + 31, v, 12, 'tx2')
        else: s.tgl(x + w - 50, ry + 18, o == 1)
    s.e()
    ty = 134 + len(rows) * 52 + 40
    s.t(x, ty, 'Тема', 16, 'tx', 700)
    s.g('Themes')
    for i, (n, a) in enumerate([('Светлая', 1), ('Тёмная', 0), ('Авто', 0)]):
        px = x + i * 170
        s.r(px, ty + 16, 150, 92, 'sf', 'ac' if a else 'br', 10, 2 if a else 1)
        s.r(px + 12, ty + 28, 126, 56, '#f8f9fc' if i != 1 else '#1e1e2e', 'br', 6); s.t(px + 75, ty + 130, n, 12, 'tx', 500, anchor='middle')
    s.e()


def mobile(s, W, H):
    s.g('StatusArea'); s.t(24, 30, '9:41', 14, 'tx', 600); s.e()
    s.g('Topbar'); s.r(0, 44, W, 52, 'sf'); s.ln(0, 96, W, 96)
    s.ic('menu', 16, 60, 22); s.t(52, 76, 'order.dsl', 15, 'tx', 600); s.ci(130, 71, 3.5, 'wn'); s.btn(W - 84, 56, 68, 30, 'Run', 'run', 'play'); s.e()
    s.g('Segmented'); s.r(16, 108, W - 32, 36, 'bg', 'br', 10)
    s.r(20, 112, (W - 40) / 2, 28, 'sf', 'br', 8); s.t(20 + (W - 40) / 4, 131, 'Код', 13, 'tx2', 500, anchor='middle')
    s.r(20 + (W - 40) / 2, 112, (W - 40) / 2, 28, 'ac', None, 8); s.t(20 + (W - 40) * .75, 131, 'Холст', 13, 'on', 600, anchor='middle'); s.e()
    ch = H - 96 - 56 - 72
    s.g('CanvasArea'); s.r(0, 156, W, ch, 'bg'); s.dots(0, 156, W, ch, 22)
    canvas_mini(s, W, 156, ch)
    s.r(W - 52, 156 + ch - 108, 38, 96, 'sf', 'br', 8); s.ic('plus', W - 43, 156 + ch - 98, 18); s.t(W - 33, 156 + ch - 52, '−', 20, 'tx2', anchor='middle'); s.ic('fit', W - 43, 156 + ch - 34, 18); s.e()
    s.g('ErrorBanner'); s.r(12, H - 72 - 44, W - 24, 36, 'sf', 'err', 8); s.ic('err', 24, H - 72 - 36, 18, 'err'); s.t(52, H - 72 - 21, '2 ошибки в order.dsl', 12, 'tx', 500); s.t(W - 28, H - 72 - 21, '▲', 11, 'tx3', anchor='end'); s.e()
    s.g('BottomNav'); s.r(0, H - 72, W, 72, 'sf'); s.ln(0, H - 72, W, H - 72)
    for i, (n, l) in enumerate([('code', 'Код'), ('layout', 'Холст'), ('folder', 'Файлы'), ('gear', 'Настройки')]):
        px = W / 8 + i * W / 4
        s.ic(n, px - 11, H - 62, 22, 'act' if i == 1 else 'tx3'); s.t(px, H - 20, l, 11, 'act' if i == 1 else 'tx3', 600 if i == 1 else 400, anchor='middle')
    s.e()


def canvas_mini(s, W, y, h):
    cx, cy = W / 2, y + h / 2
    for bx, by, a in [(cx - 120, cy - 90, 'A0'), (cx - 10, cy + 20, 'A1')]:
        s.r(bx, by, 110, 52, 'sf', 'tx2', 4, 1.5); s.t(bx + 55, by + 31, a, 13, 'tx', 700, anchor='middle')
    s.o.append(f'<path d="M{cx-10:g} {cy-64:g}H{cx+0:g}V{cy+46:g}H{cx-12:g}" fill="none" stroke="{s.k("tx2")}" stroke-width="1.4"/>')


SCREENS = {
 'ide-desktop': (1440, 900, lambda s: ide(s, 1440, 900)),
 'ide-tablet': (1024, 768, lambda s: ide(s, 1024, 768, side=False, bottom=False)),
 'ide-mobile': (390, 844, lambda s: mobile(s, 390, 844)),
 'dashboard': (1440, 900, lambda s: dashboard(s, 1440, 900)),
 'welcome': (1440, 900, lambda s: welcome(s, 1440, 900)),
 'settings': (1440, 900, lambda s: settings(s, 1440, 900)),
}
SETS = [('wireframes', 'wire', 'wire', list(SCREENS)), ('mockups', 'mock', 'mock', list(SCREENS)),
        ('designs-light', 'design', 'light', list(SCREENS)), ('designs-dark', 'design', 'dark', ['ide-desktop', 'dashboard', 'ide-mobile'])]

if __name__ == '__main__':
    files = []
    for folder, mode, theme, names in SETS:
        for n in names:
            w, h, fn = SCREENS[n]
            s = S(w, h, mode, theme)
            fn(s)
            s.out(OUT / folder / f'{n}.svg')
            files.append((folder, n, w, h))
    rows = ''.join(f'<h2>{n}</h2><div class="row">' + ''.join(f'<figure><img src="{f}/{n}.svg"><figcaption>{f}</figcaption></figure>' for f, nn, *_ in files if nn == n) + '</div>' for n in SCREENS)
    (OUT / 'index.html').write_text(f'<!doctype html><meta charset="utf-8"><title>DSLKit — макеты</title><style>body{{font:14px Inter,system-ui,sans-serif;margin:24px;background:#f4f5f8;color:#1c1f2e}}.row{{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}}figure{{margin:0;background:#fff;border:1px solid #dde1e9;border-radius:8px;padding:8px}}img{{display:block;height:300px;width:auto;max-width:560px;object-fit:contain}}figcaption{{font-size:12px;color:#6b7285;margin-top:4px}}h2{{margin:28px 0 8px}}</style><h1>DSLKit — вайрфреймы, мокапы, макеты</h1>{rows}', encoding='utf-8')
    print(len(files), 'SVG')
