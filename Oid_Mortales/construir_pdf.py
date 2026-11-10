#!/usr/bin/env python3
"""Arma el PDF del guion a partir de los archivos de guion/*.fountain.

Uso:
    python3 construir_pdf.py            # genera OID_MORTALES_guion.pdf
    python3 construir_pdf.py --paginas  # además imprime en qué página cae cada capítulo

Formato de los archivos fuente (Fountain reducido):
    INT. / EXT. ...        encabezado de escena
    NOMBRE                 (línea en mayúsculas seguida de texto) personaje
    (acotación)            acotación dentro de un diálogo
    > CORTE A:             transición, alineada a la derecha
    > TEXTO <              texto centrado
    # Título               capítulo (no se imprime: marcador del PDF)
    ===                    salto de página
    !TEXTO                 fuerza una línea como acción
    **negrita**  *cursiva*  _subrayado_
"""
import glob
import os
import sys

from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "OID_MORTALES_guion.pdf")

TITULO = "OÍD MORTALES"
AUTOR = "Marcello Muratore"

# --- Medidas (puntos). Courier 12: 10 caracteres por pulgada, 6 líneas por pulgada.
ANCHO, ALTO = A4
CAR = 7.2
RENGLON = 12.0
IZQ = 108.0                      # margen izquierdo: 1,5 pulgadas
PRIMER_RENGLON = ALTO - 72 - 10  # margen superior: 1 pulgada
RENGLONES = 56                   # renglones útiles por página
COLS = 60                        # ancho de la acción, en caracteres

SANGRIA = {"dialogo": 10, "personaje": 22, "acotacion": 16}
ANCHO_DE = {"dialogo": 35, "acotacion": 25}

FUENTES = {
    (False, False): "CP",
    (True, False): "CP-B",
    (False, True): "CP-I",
    (True, True): "CP-BI",
}


def registrar_fuentes():
    carpeta = os.path.join(AQUI, "fuentes")
    for nombre, archivo in [
        ("CP", "CourierPrime-Regular.ttf"),
        ("CP-B", "CourierPrime-Bold.ttf"),
        ("CP-I", "CourierPrime-Italic.ttf"),
        ("CP-BI", "CourierPrime-BoldItalic.ttf"),
    ]:
        pdfmetrics.registerFont(TTFont(nombre, os.path.join(carpeta, archivo)))


# --- Texto con estilo: lista de (carácter, negrita, cursiva, subrayado)

def estilar(texto, negrita=False, cursiva=False):
    out = []
    b, i, u = negrita, cursiva, False
    k, n = 0, len(texto)
    while k < n:
        c = texto[k]
        if c == "\\" and k + 1 < n:
            out.append((texto[k + 1], b, i, u))
            k += 2
            continue
        if texto.startswith("**", k):
            b = not b
            k += 2
            continue
        if c == "*":
            i = not i
            k += 1
            continue
        if c == "_":
            u = not u
            k += 1
            continue
        out.append((c, b, i, u))
        k += 1
    return out


def partir(chars, ancho):
    """Corta una lista de caracteres con estilo en renglones de hasta `ancho`."""
    renglones = []
    ini, n = 0, len(chars)
    while ini < n:
        while ini < n and chars[ini][0] == " ":
            ini += 1
        if ini >= n:
            break
        if n - ini <= ancho:
            fin, sig = n, n
        else:
            corte = -1
            for j in range(ini + ancho, ini, -1):
                if chars[j][0] == " ":
                    corte = j
                    break
            if corte == -1:
                fin, sig = ini + ancho, ini + ancho
            else:
                fin, sig = corte, corte + 1
        linea = chars[ini:fin]
        while linea and linea[-1][0] == " ":
            linea.pop()
        renglones.append(linea)
        ini = sig
    return renglones or [[]]


def plano(linea):
    return "".join(c[0] for c in linea)


# --- Lectura de los fuentes

def es_escena(linea):
    s = linea.strip()
    return s.startswith(("INT.", "EXT.", "INT/EXT", "I/E.")) or (
        s.startswith(".") and not s.startswith("..")
    )


def es_personaje(linea):
    s = linea.strip()
    if s.startswith("@"):
        return True
    if not s or s.startswith(("!", ">", "(", "#", "=")) or es_escena(s):
        return False
    return any(ch.isalpha() for ch in s) and s == s.upper()


def leer(rutas):
    bloques = []
    for ruta in rutas:
        with open(ruta, encoding="utf-8") as f:
            lineas = f.read().split("\n")
        k, n = 0, len(lineas)
        while k < n:
            linea = lineas[k].rstrip()
            s = linea.strip()
            if not s:
                k += 1
                continue
            if s == "===":
                bloques.append({"tipo": "salto"})
                k += 1
                continue
            if s.startswith("#"):
                bloques.append({"tipo": "capitulo", "texto": s.lstrip("#").strip()})
                k += 1
                continue
            if s.startswith(">"):
                if s.endswith("<"):
                    bloques.append({"tipo": "centrado", "texto": s[1:-1].strip()})
                else:
                    bloques.append({"tipo": "transicion", "texto": s[1:].strip()})
                k += 1
                continue
            if es_escena(s):
                bloques.append({"tipo": "escena", "texto": s.lstrip(".").strip()})
                k += 1
                continue
            siguiente = lineas[k + 1].strip() if k + 1 < n else ""
            if es_personaje(s) and siguiente:
                partes, acum = [], []
                k += 1
                while k < n and lineas[k].strip():
                    t = lineas[k].strip()
                    if t.startswith("(") and t.endswith(")"):
                        if acum:
                            partes.append(("dialogo", " ".join(acum)))
                            acum = []
                        partes.append(("acotacion", t))
                    elif t.startswith("~"):
                        if acum:
                            partes.append(("dialogo", " ".join(acum)))
                            acum = []
                        partes.append(("verso", t[1:].strip()))
                    else:
                        acum.append(t)
                    k += 1
                if acum:
                    partes.append(("dialogo", " ".join(acum)))
                bloques.append(
                    {"tipo": "dialogo", "personaje": s.lstrip("@").strip(), "partes": partes}
                )
                continue
            parrafo = []
            while k < n and lineas[k].strip():
                t = lineas[k].strip()
                if parrafo and (
                    t.startswith((">", "#")) or t == "===" or es_escena(t)
                ):
                    break
                parrafo.append(t[1:] if t.startswith("!") else t)
                k += 1
            bloques.append({"tipo": "accion", "lineas": parrafo})
    return bloques


# --- Paginado

class Paginador:
    def __init__(self):
        self.paginas = [[]]
        self.fila = 0
        self.marcas = []          # (título de capítulo, índice de página)
        self.pendiente = None

    def nueva(self):
        self.paginas.append([])
        self.fila = 0

    def libres(self):
        return RENGLONES - self.fila

    def poner(self, sangria, linea, alinear="izq"):
        if self.pendiente is not None:
            self.marcas.append((self.pendiente, len(self.paginas) - 1))
            self.pendiente = None
        self.paginas[-1].append((self.fila, sangria, linea, alinear))
        self.fila += 1

    def aire(self, renglones):
        if self.fila > 0:
            self.fila += renglones

    # cada bloque -------------------------------------------------------

    def escena(self, texto, sigue=2):
        lineas = partir(estilar(texto.upper(), negrita=True), COLS)
        antes = 2 if self.fila > 0 else 0
        if antes + len(lineas) + 1 + sigue > self.libres():
            self.nueva()
            antes = 0
        self.aire(antes)
        for l in lineas:
            self.poner(0, l)

    def accion(self, duras):
        lineas = []
        for d in duras:
            lineas.extend(partir(estilar(d), COLS))
        antes = 1 if self.fila > 0 else 0
        total = len(lineas)
        if antes + total <= self.libres():
            self.aire(antes)
            for l in lineas:
                self.poner(0, l)
            return
        caben = self.libres() - antes
        if caben >= 2 and total - caben >= 2:
            self.aire(antes)
            for l in lineas[:caben]:
                self.poner(0, l)
            resto = lineas[caben:]
        else:
            resto = lineas
        while resto:
            self.nueva()
            tanda, resto = resto[:RENGLONES], resto[RENGLONES:]
            for l in tanda:
                self.poner(0, l)

    def dialogo(self, personaje, partes):
        lineas = []
        for tipo, texto in partes:
            if tipo == "acotacion":
                for l in partir(estilar(texto), ANCHO_DE["acotacion"]):
                    lineas.append(("acotacion", l))
            elif tipo == "verso":
                for l in partir(estilar(texto, cursiva=True), ANCHO_DE["dialogo"]):
                    lineas.append(("dialogo", l))
            else:
                for l in partir(estilar(texto), ANCHO_DE["dialogo"]):
                    lineas.append(("dialogo", l))
        nombre = personaje.upper()
        antes = 1 if self.fila > 0 else 0

        def volcar(tanda, cabecera):
            self.poner(SANGRIA["personaje"], estilar(cabecera))
            for tipo, l in tanda:
                self.poner(SANGRIA[tipo], l)

        while True:
            if antes + 1 + len(lineas) <= self.libres():
                self.aire(antes)
                volcar(lineas, nombre)
                return
            # ¿se puede partir? cabecera + k renglones + (MÁS)
            maximo = self.libres() - antes - 2
            mejor = None
            for k in range(min(maximo, len(lineas) - 2), 1, -1):
                if lineas[k - 1][0] != "dialogo":
                    continue
                if mejor is None:
                    mejor = k
                if plano(lineas[k - 1][1]).rstrip().endswith((".", "!", "?", "…", "»")):
                    mejor = k
                    break
            if mejor is None:
                self.nueva()
                antes = 0
                if 1 + len(lineas) > RENGLONES:
                    mejor = RENGLONES - 2
                else:
                    continue
            self.aire(antes)
            volcar(lineas[:mejor], nombre)
            self.poner(SANGRIA["personaje"], estilar("(MÁS)"))
            lineas = lineas[mejor:]
            if "(CONT.)" not in nombre:
                nombre = nombre + " (CONT.)"
            self.nueva()
            antes = 0

    def transicion(self, texto):
        linea = estilar(texto.upper())
        antes = 1 if self.fila > 0 else 0
        if antes + 1 > self.libres():
            self.nueva()
            antes = 0
        self.aire(antes)
        self.poner(COLS - len(linea), linea)

    def centrado(self, texto):
        lineas = partir(estilar(texto), COLS)
        antes = 1 if self.fila > 0 else 0
        if antes + len(lineas) + 2 > self.libres():
            self.nueva()
            antes = 0
        self.aire(antes)
        for l in lineas:
            self.poner((COLS - len(l)) / 2.0, l)


def minimo(b):
    """Renglones que un bloque necesita, como mínimo, en la página donde empieza."""
    t = b["tipo"]
    if t == "accion":
        n = sum(len(partir(estilar(d), COLS)) for d in b["lineas"])
        return n if n <= 3 else 2
    if t == "dialogo":
        n = 0
        for tipo, texto in b["partes"]:
            ancho = ANCHO_DE["acotacion"] if tipo == "acotacion" else ANCHO_DE["dialogo"]
            n += len(partir(estilar(texto), ancho))
        return 1 + n if n <= 3 else 4
    if t == "centrado":
        return len(partir(estilar(b["texto"]), COLS))
    if t == "transicion":
        return 1
    return 0


def paginar(bloques):
    p = Paginador()
    for n, b in enumerate(bloques):
        t = b["tipo"]
        if t == "salto":
            if p.fila > 0:
                p.nueva()
        elif t == "capitulo":
            p.pendiente = b["texto"]
        elif t == "escena":
            sigue = 2
            for otro in bloques[n + 1:]:
                if otro["tipo"] not in ("capitulo",):
                    sigue = minimo(otro)
                    break
            p.escena(b["texto"], sigue)
        elif t == "accion":
            p.accion(b["lineas"])
        elif t == "dialogo":
            p.dialogo(b["personaje"], b["partes"])
        elif t == "transicion":
            p.transicion(b["texto"])
        elif t == "centrado":
            p.centrado(b["texto"])
    if not p.paginas[-1]:
        p.paginas.pop()
    return p


# --- Dibujo

def dibujar_linea(c, x, y, linea, cuerpo=12):
    k, n = 0, len(linea)
    escala = cuerpo / 12.0
    while k < n:
        _, b, i, u = linea[k]
        j = k
        while j < n and linea[j][1:] == (b, i, u):
            j += 1
        tramo = "".join(ch[0] for ch in linea[k:j])
        c.setFont(FUENTES[(b, i)], cuerpo)
        x0 = x + k * CAR * escala
        c.drawString(x0, y, tramo)
        if u:
            c.setLineWidth(0.7)
            c.line(x0, y - 1.6, x0 + (j - k) * CAR * escala, y - 1.6)
        k = j


def centrar(c, y, texto, fuente="CP", cuerpo=12):
    c.setFont(fuente, cuerpo)
    c.drawCentredString(ANCHO / 2.0, y, texto)


def portada(c):
    y = ALTO * 0.62
    centrar(c, y, TITULO, "CP-B", 26)
    c.setLineWidth(1.1)
    medio = ANCHO / 2.0
    c.line(medio - 118, y - 12, medio + 118, y - 12)
    centrar(c, y - 62, "guion original de")
    centrar(c, y - 88, AUTOR, "CP-B", 14)
    c.setFont("CP", 11)
    c.drawString(IZQ, 96, "Largometraje de ficción")
    c.drawString(IZQ, 82, "Ópera prima")
    c.drawRightString(IZQ + COLS * CAR, 96, "Primera versión")
    c.drawRightString(IZQ + COLS * CAR, 82, "Buenos Aires, noviembre de 2026")
    c.showPage()


def epigrafes(c):
    y = ALTO * 0.66
    for renglon in (
        "«Oíd el ruido de rotas cadenas,",
        "ved en trono a la noble igualdad.»",
    ):
        centrar(c, y, renglon, "CP-I", 12)
        y -= 16
    y -= 6
    centrar(c, y, "Himno Nacional Argentino, 1813", "CP", 10)
    y -= 70
    for renglon in (
        "«…para nosotros, para nuestra posteridad,",
        "y para todos los hombres del mundo",
        "que quieran habitar en el suelo argentino.»",
    ):
        centrar(c, y, renglon, "CP-I", 12)
        y -= 16
    y -= 6
    centrar(c, y, "Preámbulo de la Constitución Nacional, 1853", "CP", 10)
    c.showPage()


def construir(mostrar_paginas=False):
    registrar_fuentes()
    rutas = sorted(glob.glob(os.path.join(AQUI, "guion", "*.fountain")))
    if not rutas:
        sys.exit("No hay archivos en guion/*.fountain")
    p = paginar(leer(rutas))

    c = canvas.Canvas(SALIDA, pagesize=A4)
    c.setTitle("Oíd mortales")
    c.setAuthor(AUTOR)
    c.setSubject("Guion de largometraje")
    c.setCreator("construir_pdf.py")

    portada(c)
    epigrafes(c)

    marcas = {}
    for titulo, indice in p.marcas:
        marcas.setdefault(indice, []).append(titulo)

    for indice, pagina in enumerate(p.paginas):
        numero = indice + 1
        for titulo in marcas.get(indice, []):
            clave = "cap%d_%d" % (indice, len(titulo))
            c.bookmarkPage(clave)
            c.addOutlineEntry(titulo, clave, level=0)
        if numero > 1:
            c.setFont("CP", 12)
            c.drawRightString(IZQ + COLS * CAR, ALTO - 44, "%d." % numero)
        for fila, sangria, linea, _ in pagina:
            dibujar_linea(c, IZQ + sangria * CAR, PRIMER_RENGLON - fila * RENGLON, linea)
        c.showPage()
    c.save()

    print("%s: %d páginas de guion (+ portada y epígrafes)" % (os.path.basename(SALIDA), len(p.paginas)))
    ultimo = p.paginas[-1][-1][0] + 1 if p.paginas[-1] else 0
    print("última página: %d de %d renglones" % (ultimo, RENGLONES))
    if mostrar_paginas:
        for titulo, indice in p.marcas:
            print("  p. %3d  %s" % (indice + 1, titulo))
    return len(p.paginas)


if __name__ == "__main__":
    construir(mostrar_paginas="--paginas" in sys.argv)
