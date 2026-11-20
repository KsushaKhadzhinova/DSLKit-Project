"""Orientation mockups of DSLKit, shot from the real UI, and one annotated overview sheet per screen.

Usage: python docs/design-contest/orientation/make-orientation-sheets.py [base_url]   (default http://localhost:5173; serve the site first:
node tools/serve.js site 5173). Writes the frames next to this file as <screen>-<device>-<portrait|landscape>-<light|dark>.png and
sheet-<screen>.png (portrait next to landscape, the layout rules in RU and EN). Needs playwright and Pillow; E2E_BROWSER as in e2e_env.py.

Figma: the frames are plain PNG files; in Figma use File > Place image (Shift+Cmd/Ctrl+K) and drop the whole folder, one frame per image;
nothing is uploaded from here (the existing upload path lives on the design/figma-assets-ru-en branch).
"""
import io
import os
import sys
from html import escape
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
SCREENS = {
    "home": "/index.html",
    "dashboard": "/app/dashboard.html",
    "editor": "/app/editor.html",
    "editor-panel": "/app/editor.html",
    "settings": "/app/settings.html",
    "login": "/app/login.html",
}
# device -> (portrait, landscape) as Playwright device names or plain sizes
DEVICES = {
    "phone": ("iPhone 13", "iPhone 13 landscape"),
    "tablet": ("iPad (gen 7)", "iPad (gen 7) landscape"),
    "foldable": ("Galaxy Z Fold 6", "Galaxy Z Fold 6 landscape"),
}
EXTRA = {"ultrawide": (2560, 1080), "square": (900, 900)}
MAX_WIDTH = 1100  # frames wider than this are shrunk, to keep the folder small
RULES = {
    "home": ("Телефон: одна колонка; в альбомной ориентации поля безопасности слева и справа, шапка ниже. Планшет: две колонки в обеих ориентациях.", "Phone: one column; on its side the safe areas sit left and right and the header is lower. Tablet: two columns in both orientations."),
    "dashboard": ("Портрет: карточки в 1-2 колонки; альбом: сетка из 3-4 колонок, боковая навигация узкая. Сверхширокий экран: содержимое по центру, строка не длиннее 80 знаков.", "Portrait: 1-2 columns of cards; landscape: a 3-4 column grid with a narrow side navigation. Ultra-wide: content centred, line length capped at 80 characters."),
    "editor": ("Портрет телефона: нижняя навигация, код и холст по очереди. Альбом: боковая рейка вместо нижней панели, код и холст рядом, разделитель двигается. Портрет планшета: код над холстом.", "Phone portrait: bottom navigation, code and canvas in turn. Landscape: a side rail instead of the bottom bar, code and canvas side by side with a movable divider. Tablet portrait: code above the canvas."),
    "editor-panel": ("Панели (файлы, поиск, Git) открываются поверх рабочей области, при повороте остаются на месте или закрываются чисто; холст подгоняется заново, если не менялся масштаб вручную.", "Panels (files, search, Git) open over the workspace and stay put or close cleanly on rotation; the canvas refits unless the zoom was changed by hand."),
    "settings": ("Портрет: одна колонка карточек; альбом и планшет: две колонки, навигация слева. Сверхширокий экран: колонка настроек по центру.", "Portrait: one column of cards; landscape and tablet: two columns with the navigation on the left. Ultra-wide: the settings column is centred."),
    "login": ("Форма по центру в любой ориентации; в альбомном телефоне карточка прижата кверху и прокручивается, поля безопасности соблюдены; цели не меньше 44 px.", "The form stays centred in any orientation; on a phone on its side the card sits at the top and scrolls, the safe areas are kept; targets stay at least 44 px."),
}


def shrink(png):
    """Shrink a wide frame and store it as an 8-bit palette PNG."""
    image = Image.open(io.BytesIO(png)).convert("RGB")
    if image.width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(image.height * MAX_WIDTH / image.width)), Image.LANCZOS)
    out = io.BytesIO()
    image.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(out, "PNG", optimize=True)
    return out.getvalue()


def shoot(p, browser):
    jobs = [(name, device, orient) for name, pair in DEVICES.items() for device, orient in zip(pair, ("portrait", "landscape"))]
    jobs += [(name, size, "wide") for name, size in EXTRA.items()]
    for scheme in ("light", "dark"):
        for name, spec, orient in jobs:
            options = dict(p.devices[spec]) if isinstance(spec, str) else {"viewport": {"width": spec[0], "height": spec[1]}}
            ctx = browser.new_context(color_scheme=scheme, locale="ru-RU", **options)
            ctx.add_init_script("try{localStorage.setItem('dslkit.tour-done','true')}catch(e){}")
            page = ctx.new_page()
            for screen, path in SCREENS.items():
                page.goto(BASE + path, wait_until="domcontentloaded")
                page.wait_for_timeout(600)
                if screen == "editor-panel":
                    page.evaluate("() => (document.querySelector('[data-panel=\"files\"]') || document.querySelector('[data-action=\"sidebar\"]'))?.click()")
                    page.wait_for_timeout(300)
                (HERE / f"{screen}-{name}-{orient}-{scheme}.png").write_bytes(shrink(page.screenshot()))
            ctx.close()


def sheet(browser, screen):
    cells = ""
    for name, (a, b) in DEVICES.items():
        cells += f"<section><h3>{name}</h3><div>" + "".join(f'<figure><img src="{screen}-{name}-{o}-light.png"><figcaption>{o}</figcaption></figure>' for o in ("portrait", "landscape")) + "</div></section>"
    cells += "<section><h3>ultrawide / square</h3><div>" + "".join(f'<figure><img src="{screen}-{n}-wide-light.png"><figcaption>{n}</figcaption></figure>' for n in EXTRA) + "</div></section>"
    ru, en = RULES[screen]
    html = (
        '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;width:1800px;background:#fff;font:15px Inter,Segoe UI,sans-serif;color:#1c1f2e}'
        "h1{margin:0 0 12px}h3{margin:8px 0}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:start}section>div{display:flex;gap:8px;align-items:flex-start}"
        "figure{margin:0;flex:1}img{width:100%;border:1px solid #dde1e9;border-radius:8px}figcaption{font-size:12px;color:#5a6075}"
        ".rules{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;padding:16px;border:1px solid #dde1e9;border-radius:12px;background:#f6f8fc}</style>"
        f"<h1>{escape(screen)}: portrait / landscape</h1><main>{cells}</main>"
        f'<div class="rules"><p><b>RU.</b> {escape(ru)}</p><p><b>EN.</b> {escape(en)}</p></div>'
    )
    (HERE / f"sheet-{screen}.html").write_text(html, encoding="utf8")
    page = browser.new_page(viewport={"width": 1850, "height": 900})
    page.goto((HERE / f"sheet-{screen}.html").as_uri())
    page.wait_for_timeout(500)
    page.screenshot(path=str(HERE / f"sheet-{screen}.png"), full_page=True)
    page.close()
    (HERE / f"sheet-{screen}.html").unlink()


with sync_playwright() as p:
    channel = os.environ.get("E2E_BROWSER", "msedge")
    browser = p.chromium.launch() if channel == "chromium" else p.chromium.launch(channel=channel)
    shoot(p, browser)
    for screen in SCREENS:
        sheet(browser, screen)
    browser.close()
print("done")
