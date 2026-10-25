from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

screens = Path(__file__).parent / "screens"
GREEN, RED = "C6EFCE", "FFC7CE"


def new_doc(title, intro):
    d = Document()
    s = d.sections[0]
    s.left_margin = s.right_margin = Cm(1.8)
    s.top_margin = s.bottom_margin = Cm(1.8)
    for name, size in (("Normal", 14), ("Heading 1", 16), ("Heading 2", 15), ("Heading 3", 14)):
        st = d.styles[name]
        st.font.name = "Times New Roman"
        st.font.size = Pt(size)
        st.font.color.rgb = RGBColor(0, 0, 0)
        st.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
            st.element.rPr.rFonts.attrib.pop(qn(attr), None)
        if name != "Normal":
            st.font.bold = True
    d.add_paragraph(intro)
    return d


def shade(cell, color):
    tc = cell._tc.get_or_add_tcPr()
    el = OxmlElement("w:shd")
    el.set(qn("w:val"), "clear"); el.set(qn("w:fill"), color)
    tc.append(el)


def table(d, head, rows, widths=None, status_col=None):
    t = d.add_table(rows=1, cols=len(head))
    t.style = "Table Grid"
    for i, h in enumerate(head):
        c = t.rows[0].cells[i]
        c.text = ""
        c.paragraphs[0].add_run(h).bold = True
        shade(c, "D9E2F3")
    for r in rows:
        cells = t.add_row().cells
        for i, v in enumerate(r):
            cells[i].text = str(v)
        if status_col is not None:
            s = str(r[status_col])
            shade(cells[status_col], GREEN if s.startswith("Passed") or "☑" in s else RED)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Cm(w)
    for row in t.rows:
        for c in row.cells:
            for p in c.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(12)
    d.add_paragraph()
    return t


def shot(d, name, caption, width=16):
    d.add_picture(str(screens / name), width=Cm(width))
    d.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    p = d.add_paragraph(caption)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.runs[0].italic = True


def use_case(d, path):
    import json
    rows = json.loads(Path(path).read_text(encoding="utf8"))
    t = d.add_table(rows=0, cols=2)
    t.style = "Table Grid"
    for k, v in rows:
        c = t.add_row().cells
        c[0].text = k; c[1].text = v
        c[0].paragraphs[0].runs[0].bold = True
        c[0].width, c[1].width = Cm(4.2), Cm(13)
        shade(c[0], "F2F2F2")
        for cell in c:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(12)
    d.add_paragraph()
