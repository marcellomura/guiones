#!/usr/bin/env python3
"""Maqueta un guion en formato profesional (Courier 12, A4) a partir de un
texto plano con marcas simples.

Marcas:
  INT. / EXT. / INT./EXT.   encabezado de escena
  @NOMBRE                   personaje (las líneas siguientes son diálogo)
  (texto)                   acotación, dentro de un bloque de diálogo
  > TEXTO                   transición, alineada a la derecha
  ! TEXTO                   texto centrado
  # TEXTO                   título de acto, centrado y subrayado
  ===                       salto de página
  cualquier otra cosa       acción

Uso: maquetar_guion.py salida.pdf parte1.txt [parte2.txt ...]
"""
import sys
import textwrap
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

PAGE_W, PAGE_H = A4
FONT, FONT_B, FONT_I = "Courier", "Courier-Bold", "Courier-Oblique"
SIZE = 12
LEAD = 12
CHAR_W = 7.2
TOP = PAGE_H - 72
LINES_PER_PAGE = 55

X_ACTION = 108
W_ACTION = 57
X_DIALOG = 180
W_DIALOG = 35
X_PAREN = 216
W_PAREN = 24
X_CHAR = 266
RIGHT = PAGE_W - 72

TITULO = "TE ESTÁBAMOS ESPERANDO"
MAS = "(MÁS)"
CONT = " (CONT.)"


def parse(text):
    """Devuelve una lista de bloques (tipo, contenido)."""
    blocks = []
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        raw = lines[i].rstrip()
        s = raw.strip()
        if not s:
            i += 1
            continue
        if s == "===":
            blocks.append(("pagebreak", None))
            i += 1
        elif s.startswith("# "):
            blocks.append(("act", s[2:].strip()))
            i += 1
        elif s.startswith("! "):
            blocks.append(("center", s[2:].strip()))
            i += 1
        elif s.startswith("> "):
            blocks.append(("trans", s[2:].strip()))
            i += 1
        elif s.startswith(("INT.", "EXT.", "INT./EXT.")):
            blocks.append(("scene", s))
            i += 1
        elif s.startswith("@"):
            name = s[1:].strip()
            parts = []
            i += 1
            while i < len(lines) and lines[i].strip():
                t = lines[i].strip()
                if t.startswith("(") and t.endswith(")"):
                    parts.append(("paren", t))
                else:
                    if parts and parts[-1][0] == "dialog":
                        parts[-1] = ("dialog", parts[-1][1] + " " + t)
                    else:
                        parts.append(("dialog", t))
                i += 1
            blocks.append(("speech", (name, parts)))
        else:
            para = [s]
            i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith(
                ("@", "> ", "! ", "# ", "INT.", "EXT.", "===")
            ):
                para.append(lines[i].strip())
                i += 1
            blocks.append(("action", " ".join(para)))
    return blocks


def wrap(text, width):
    return textwrap.wrap(text, width=width, break_long_words=False, break_on_hyphens=False) or [""]


class Layout:
    def __init__(self):
        self.pages = [[]]
        self.n = 0  # líneas usadas en la página actual

    def new_page(self):
        self.pages.append([])
        self.n = 0

    def room(self):
        return LINES_PER_PAGE - self.n

    def put(self, x, text, font=FONT, align="left", underline=False):
        self.pages[-1].append((self.n, x, text, font, align, underline))
        self.n += 1

    def blank(self, k=1):
        if self.n == 0:
            return
        self.n += k

    def add_blocks(self, blocks):
        for idx, (kind, data) in enumerate(blocks):
            nxt = blocks[idx + 1][0] if idx + 1 < len(blocks) else None
            if kind == "pagebreak":
                if self.n:
                    self.new_page()
            elif kind == "act":
                if self.room() < 8:
                    self.new_page()
                self.blank(1)
                self.put(PAGE_W / 2, data, FONT_B, "center", True)
                self.blank(1)
            elif kind == "center":
                if self.room() < 3:
                    self.new_page()
                self.blank(1)
                for ln in wrap(data, W_ACTION):
                    self.put(PAGE_W / 2, ln, FONT, "center")
            elif kind == "trans":
                if self.room() < 3:
                    self.new_page()
                self.blank(1)
                self.put(RIGHT, data, FONT, "right")
            elif kind == "scene":
                lns = wrap(data, W_ACTION)
                # el encabezado nunca queda huérfano al pie
                if self.room() < len(lns) + 2 + 3:
                    self.new_page()
                self.blank(2)
                for ln in lns:
                    self.put(X_ACTION, ln, FONT_B)
            elif kind == "action":
                lns = wrap(data, W_ACTION)
                self.blank(1)
                if len(lns) <= self.room():
                    for ln in lns:
                        self.put(X_ACTION, ln)
                elif self.room() >= 3 and len(lns) - (self.room()) >= 2:
                    k = self.room()
                    for ln in lns[:k]:
                        self.put(X_ACTION, ln)
                    self.new_page()
                    for ln in lns[k:]:
                        self.put(X_ACTION, ln)
                else:
                    self.new_page()
                    for ln in lns:
                        self.put(X_ACTION, ln)
            elif kind == "speech":
                self.speech(*data)

    def speech(self, name, parts):
        rows = []
        for t, txt in parts:
            if t == "paren":
                for j, ln in enumerate(wrap(txt, W_PAREN)):
                    rows.append(("paren", ln if j == 0 else " " + ln))
            else:
                for ln in wrap(txt, W_DIALOG):
                    rows.append(("dialog", ln))
        self.blank(1)
        need = 1 + len(rows)
        if need > self.room():
            # ¿se puede partir con dignidad?
            avail = self.room() - 2  # nombre + (MÁS)
            if avail >= 2 and len(rows) - avail >= 2 and rows[avail - 1][0] == "dialog":
                self.put(X_CHAR, name)
                for t, ln in rows[:avail]:
                    self.put(X_PAREN if t == "paren" else X_DIALOG, ln)
                self.put(X_CHAR, MAS)
                self.new_page()
                self.put(X_CHAR, name + CONT)
                for t, ln in rows[avail:]:
                    self.put(X_PAREN if t == "paren" else X_DIALOG, ln)
                return
            self.new_page()
        self.put(X_CHAR, name)
        for t, ln in rows:
            self.put(X_PAREN if t == "paren" else X_DIALOG, ln)


def draw_title(c, autor):
    c.setFont(FONT_B, 12)
    y = PAGE_H - 280
    c.drawCentredString(PAGE_W / 2, y, TITULO)
    w = c.stringWidth(TITULO, FONT_B, 12)
    c.line(PAGE_W / 2 - w / 2, y - 2, PAGE_W / 2 + w / 2, y - 2)
    c.setFont(FONT, 12)
    c.drawCentredString(PAGE_W / 2, y - 36, "Miniserie en siete episodios")
    c.drawCentredString(PAGE_W / 2, y - 84, "Episodio 1")
    c.drawCentredString(PAGE_W / 2, y - 108, "«TE ESTÁBAMOS ESPERANDO»")
    if autor:
        c.drawCentredString(PAGE_W / 2, y - 168, "Escrito por")
        c.drawCentredString(PAGE_W / 2, y - 192, autor)
    c.drawString(X_ACTION, 120, "Guion del episodio piloto")
    c.drawString(X_ACTION, 106, "Primera versión — noviembre de 2026")
    c.showPage()


def render(pages, out, autor=""):
    c = canvas.Canvas(out, pagesize=A4)
    c.setTitle("Te estábamos esperando — Episodio 1 (piloto)")
    c.setAuthor(autor)
    c.setSubject("Guion del episodio piloto")
    draw_title(c, autor)
    for pn, page in enumerate(pages, start=1):
        if pn > 1:
            c.setFont(FONT, SIZE)
            c.drawRightString(RIGHT, PAGE_H - 44, f"{pn}.")
        for row, x, text, font, align, underline in page:
            y = TOP - row * LEAD
            c.setFont(font, SIZE)
            if align == "center":
                c.drawCentredString(x, y, text)
                if underline:
                    w = c.stringWidth(text, font, SIZE)
                    c.line(x - w / 2, y - 2, x + w / 2, y - 2)
            elif align == "right":
                c.drawRightString(x, y, text)
            else:
                c.drawString(x, y, text)
        c.showPage()
    c.save()


def main():
    out = sys.argv[1]
    autor = ""
    files = []
    for a in sys.argv[2:]:
        if a.startswith("--autor="):
            autor = a.split("=", 1)[1]
        else:
            files.append(a)
    text = "\n\n".join(open(f, encoding="utf-8").read() for f in files)
    lay = Layout()
    lay.add_blocks(parse(text))
    pages = [p for p in lay.pages if p]
    render(pages, out, autor)
    words = len(text.split())
    print(f"{len(pages)} páginas de guion (+ portada), {words} palabras en fuente")


if __name__ == "__main__":
    main()
