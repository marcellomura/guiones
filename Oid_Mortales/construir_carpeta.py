#!/usr/bin/env python3
"""Arma los PDF de la carpeta de proyecto a partir de carpeta/textos/*.md.

Uso:
    python3 construir_carpeta.py

Cada archivo de carpeta/textos/ da un PDF en carpeta/ con el mismo nombre.
Los PDF son anónimos (solo figura el título de la obra), como piden los
concursos del INCAA. Los archivos cuyo nombre contiene BORRADOR llevan esa
marca en el encabezado: hay que completarlos antes de presentarlos.

Formato de los textos:
    # Título del documento
    ## Subtítulo
    - ítem de lista
    **negrita**  *cursiva*
    Los párrafos se separan con una línea en blanco.
"""
import glob
import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

AQUI = os.path.dirname(os.path.abspath(__file__))
TEXTOS = os.path.join(AQUI, "carpeta", "textos")
SALIDA = os.path.join(AQUI, "carpeta")
OBRA = "OÍD MORTALES"
MARGEN = 2.5 * cm
GRIS = colors.Color(0.38, 0.38, 0.38)

CUERPO = ParagraphStyle(
    "cuerpo", fontName="Times-Roman", fontSize=11.5, leading=16.2,
    alignment=TA_JUSTIFY, spaceAfter=8,
)
FICHA = ParagraphStyle("ficha", parent=CUERPO, alignment=TA_LEFT, spaceAfter=5)
ITEM = ParagraphStyle(
    "item", parent=CUERPO, alignment=TA_LEFT, leftIndent=14, bulletIndent=2, spaceAfter=4,
)
SUBTITULO = ParagraphStyle(
    "subtitulo", fontName="Times-Bold", fontSize=12.5, leading=16, spaceBefore=10, spaceAfter=5,
)
ANTETITULO = ParagraphStyle("antetitulo", fontName="Times-Bold", fontSize=9.5, leading=12, textColor=GRIS)
TITULO = ParagraphStyle("titulo", fontName="Times-Bold", fontSize=20, leading=25, spaceAfter=4)
COMPLETAR = ParagraphStyle(
    "completar", parent=CUERPO, alignment=TA_LEFT, backColor=colors.Color(0.93, 0.93, 0.93),
    borderColor=GRIS, borderWidth=0.6, borderPadding=7, spaceBefore=6, spaceAfter=14,
)


def marcar(texto):
    """Convierte **negrita** y *cursiva* al marcado de ReportLab."""
    texto = texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    texto = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", texto)
    return re.sub(r"\*(.+?)\*", r"<i>\1</i>", texto)


def leer(ruta):
    """Devuelve (título, lista de (tipo, texto)) a partir del archivo."""
    with open(ruta, encoding="utf-8") as f:
        bloques = [b.strip() for b in re.split(r"\n\s*\n", f.read()) if b.strip()]
    titulo, partes = "", []
    for b in bloques:
        lineas = [l.strip() for l in b.split("\n")]
        if b.startswith("# "):
            titulo = b[2:].strip()
        elif b.startswith("## "):
            partes.append(("subtitulo", b[3:].strip()))
        elif all(l.startswith("- ") for l in lineas):
            for l in lineas:
                partes.append(("item", l[2:].strip()))
        else:
            partes.append(("parrafo", " ".join(lineas)))
    return titulo, partes


def construir(ruta):
    nombre = os.path.splitext(os.path.basename(ruta))[0]
    titulo, partes = leer(ruta)
    borrador = "BORRADOR" in nombre
    destino = os.path.join(SALIDA, "OID_MORTALES_%s.pdf" % nombre)
    es_ficha = all(t != "parrafo" or p.startswith("**") for t, p in partes[:3])

    historia = [Paragraph(OBRA, ANTETITULO), Paragraph(marcar(titulo), TITULO),
                HRFlowable(width="100%", thickness=0.8, color=colors.black, spaceAfter=12)]
    for tipo, texto in partes:
        if tipo == "subtitulo":
            historia.append(Paragraph(marcar(texto), SUBTITULO))
        elif tipo == "item":
            historia.append(Paragraph(marcar(texto), ITEM, bulletText="•"))
        elif texto.startswith("**[COMPLETAR"):
            historia.append(Paragraph(marcar(texto), COMPLETAR))
        else:
            historia.append(Paragraph(marcar(texto), FICHA if es_ficha else CUERPO))
    historia.append(Spacer(1, 1))

    def pie(lienzo, doc):
        lienzo.saveState()
        lienzo.setFont("Times-Roman", 9)
        lienzo.setFillColor(GRIS)
        if borrador:
            lienzo.drawRightString(A4[0] - MARGEN, A4[1] - 1.4 * cm, "BORRADOR · completar antes de presentar")
        if doc.page > 1:
            lienzo.drawString(MARGEN, 1.4 * cm, "Oíd mortales · %s" % titulo)
            lienzo.drawRightString(A4[0] - MARGEN, 1.4 * cm, str(doc.page))
        lienzo.restoreState()

    doc = SimpleDocTemplate(
        destino, pagesize=A4, leftMargin=MARGEN, rightMargin=MARGEN,
        topMargin=MARGEN, bottomMargin=MARGEN,
        title="Oíd mortales · %s" % titulo, author="", subject="Carpeta de proyecto",
        creator="construir_carpeta.py",
    )
    doc.build(historia, onFirstPage=pie, onLaterPages=pie)
    print("%s: %d página%s" % (os.path.basename(destino), doc.page, "" if doc.page == 1 else "s"))
    return nombre, doc.page


if __name__ == "__main__":
    rutas = sorted(glob.glob(os.path.join(TEXTOS, "*.md")))
    if not rutas:
        sys.exit("No hay archivos en carpeta/textos/*.md")
    for ruta in rutas:
        nombre, paginas = construir(ruta)
        if "sinopsis" in nombre and paginas > 1:
            print("  ¡OJO! El INCAA pide la sinopsis en una carilla como máximo.")
