#!/usr/bin/env python3
"""Arma los PDF del guion a partir de los archivos de guion/*.fountain.

Uso:
    python3 construir_pdf.py            # genera las dos versiones
    python3 construir_pdf.py --paginas  # además imprime en qué página cae cada capítulo

Versiones:
    OID_MORTALES_guion.pdf        formato de guion estándar, con portada y autor.
    OID_MORTALES_guion_INCAA.pdf  formato que piden las bases de los concursos del INCAA
                                  (Courier 12, márgenes de 2,5 cm, diálogos con 5 cm de
                                  margen, escenas numeradas, todo alineado a la izquierda)
                                  y anónimo: solo figura el título de la obra.

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

TITULO = "OÍD MORTALES"
AUTOR = "Marcello Muratore"

# --- Medidas (puntos). Courier 12: 10 caracteres por pulgada, 6 líneas por pulgada.
ANCHO, ALTO = A4
CM = 72 / 2.54
CAR = 7.2
RENGLON = 12.0

PERFILES = {
    "estandar": {
        "salida": "OID_MORTALES_guion.pdf",
        "izq": 108.0,                 # margen izquierdo: 1,5 pulgadas
        "arriba": 72.0,               # margen superior: 1 pulgada
        "renglones": 58,              # renglones útiles por página
        "cols": 60,                   # ancho de la acción, en caracteres
        "sangria": {"dialogo": 10, "personaje": 22, "acotacion": 16},
        "ancho": {"dialogo": 35, "acotacion": 25},
        "fuentes": ("CP", "CP-B", "CP-I", "CP-BI"),
        "incaa": False,
    },
    # Bases INCAA (Ópera Prima 2026, Anexo I-A, punto B.1.a): Courier 12, interlineado
    # sencillo, 2,5 cm arriba y abajo, 2,5 cm a los lados para encabezados y acción,
    # 5 cm a los lados para los diálogos (unos 40 caracteres), escenas y páginas
    # numeradas, todo alineado a la izquierda y sin datos de productor ni director.
    "incaa": {
        "salida": "OID_MORTALES_guion_INCAA.pdf",
        "izq": 2.5 * CM,
        "arriba": 2.5 * CM,
        "renglones": 58,
        "cols": 62,
        "sangria": {"dialogo": 10, "personaje": 10, "acotacion": 10},
        "ancho": {"dialogo": 42, "acotacion": 42},
        "fuentes": ("Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique"),
        "incaa": True,
    },
}

# Valores del perfil en uso (los fija usar()).
SALIDA = IZQ = PRIMER_RENGLON = RENGLONES = COLS = SANGRIA = ANCHO_DE = FUENTES = None
INCAA = False


def usar(nombre):
    global SALIDA, IZQ, PRIMER_RENGLON, RENGLONES, COLS, SANGRIA, ANCHO_DE, FUENTES, INCAA
    p = PERFILES[nombre]
    SALIDA = os.path.join(AQUI, p["salida"])
    IZQ = p["izq"]
    PRIMER_RENGLON = ALTO - p["arriba"] - 10
    RENGLONES = p["renglones"]
    COLS = p["cols"]
    SANGRIA = p["sangria"]
    ANCHO_DE = p["ancho"]
    normal, negrita, cursiva, ambas = p["fuentes"]
    FUENTES = {
        (False, False): normal,
        (True, False): negrita,
        (False, True): cursiva,
        (True, True): ambas,
    }
    INCAA = p["incaa"]


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


# --- Encabezados para el INCAA: siempre INT./EXT., lugar y DÍA o NOCHE

FRANJA_DE = {
    "TARDE": "DÍA",
    "ATARDECER": "DÍA",
    "AMANECER": "DÍA",
    "MAÑANA": "DÍA",
    "MADRUGADA": "NOCHE",
}
SECUENCIAS = {
    "SECUENCIA - LA MÁQUINA":
        "INT. / EXT. GALPÓN Y CASA BENVENUTO - DÍA / NOCHE (SECUENCIA: LA MÁQUINA)",
    "SECUENCIA - LAS ÚLTIMAS":
        "INT. GALPÓN DEL FONDO - NOCHE / DÍA (SECUENCIA: LAS ÚLTIMAS)",
}


def encabezado_incaa(texto, anterior):
    """Devuelve el encabezado con DÍA o NOCHE explícitos y la franja que queda vigente."""
    t = texto.upper()
    if t in SECUENCIAS:
        return SECUENCIAS[t], anterior
    lugar, _, cola = t.rpartition(" - ")
    extra = ""
    if cola.endswith(")") and " (" in cola:        # p. ej. «AMANECER (EN MOVIMIENTO)»
        cola, _, extra = cola.partition(" (")
        extra = extra[:-1]
    if cola in ("DÍA", "NOCHE"):
        franja, matiz = cola, ""
    elif cola in FRANJA_DE:
        franja, matiz = FRANJA_DE[cola], cola
    elif cola in ("CONTINUO", "MÁS TARDE"):
        franja, matiz = anterior, cola
    else:
        raise ValueError("Encabezado sin DÍA/NOCHE reconocible: %s" % texto)
    notas = ", ".join(x for x in (matiz, extra) if x)
    return "%s - %s%s" % (lugar, franja, " (%s)" % notas if notas else ""), franja


# --- Paginado

FIN_DE_ORACION = (".", "!", "?", "…", "»", ":", ")")


def cierra_oracion(linea):
    return plano(linea).rstrip().endswith(FIN_DE_ORACION)


def renglones_de_accion(duras):
    lineas = []
    for d in duras:
        lineas.extend(partir(estilar(d), COLS))
    return lineas


def renglones_de_dialogo(partes):
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
    return lineas


def tanda_de_accion(lineas, libres, antes):
    """Cuántos renglones de un párrafo de acción entran en lo que queda de página."""
    total = len(lineas)
    if antes + total <= libres:
        return total
    caben = min(libres - antes, total - 2)   # nunca dejar un renglón suelto
    if caben < 2:
        return 0
    for k in range(caben, 1, -1):            # mejor cortar donde termina una oración
        if cierra_oracion(lineas[k - 1]):
            return k
    return caben


def tanda_de_dialogo(lineas, libres, antes):
    """Ídem para un parlamento: solo se parte donde termina una oración."""
    if antes + 1 + len(lineas) <= libres:
        return len(lineas)
    maximo = libres - antes - 2              # personaje + (MÁS)
    for k in range(min(maximo, len(lineas) - 2), 1, -1):
        tipo, linea = lineas[k - 1]
        if tipo == "dialogo" and cierra_oracion(linea):
            return k
    return 0


class Paginador:
    def __init__(self):
        self.paginas = [[]]
        self.fila = 0
        self.marcas = []          # (título de capítulo, índice de página)
        self.pendiente = None
        self.escenas = 0
        self.franja = "DÍA"

    def nueva(self):
        self.paginas.append([])
        self.fila = 0

    def libres(self):
        return RENGLONES - self.fila

    def poner(self, sangria, linea):
        if self.pendiente is not None:
            self.marcas.append((self.pendiente, len(self.paginas) - 1))
            self.pendiente = None
        self.paginas[-1].append((self.fila, sangria, linea))
        self.fila += 1

    def aire(self, renglones):
        if self.fila > 0:
            self.fila += renglones

    # cada bloque -------------------------------------------------------

    def escena(self, texto, siguiente=None):
        self.escenas += 1
        if INCAA:
            texto, self.franja = encabezado_incaa(texto, self.franja)
            texto = "%d. %s" % (self.escenas, texto)
        lineas = partir(estilar(texto.upper(), negrita=True), COLS)
        antes = 2 if self.fila > 0 else 0
        quedan = self.libres() - antes - len(lineas)
        if quedan < 0 or not self.entra_algo(siguiente, quedan):
            self.nueva()
            antes = 0
        self.aire(antes)
        for l in lineas:
            self.poner(0, l)

    @staticmethod
    def entra_algo(bloque, libres):
        """¿Empieza el bloque siguiente en esta misma página? (para no dejar encabezados sueltos)"""
        if bloque is None:
            return True
        t = bloque["tipo"]
        if t == "accion":
            return tanda_de_accion(renglones_de_accion(bloque["lineas"]), libres, 1) > 0
        if t == "dialogo":
            return tanda_de_dialogo(renglones_de_dialogo(bloque["partes"]), libres, 1) > 0
        if t == "centrado":
            return 1 + len(partir(estilar(bloque["texto"]), COLS)) <= libres
        if t == "transicion":
            return 2 <= libres
        return True

    def accion(self, duras):
        lineas = renglones_de_accion(duras)
        while lineas:
            antes = 1 if self.fila > 0 else 0
            k = tanda_de_accion(lineas, self.libres(), antes)
            if k == 0:
                if self.fila == 0:           # párrafo más largo que una página
                    k = RENGLONES
                else:
                    self.nueva()
                    continue
            self.aire(antes)
            for l in lineas[:k]:
                self.poner(0, l)
            lineas = lineas[k:]
            if lineas:
                self.nueva()

    def dialogo(self, personaje, partes):
        lineas = renglones_de_dialogo(partes)
        nombre = personaje.upper()
        while lineas:
            antes = 1 if self.fila > 0 else 0
            k = tanda_de_dialogo(lineas, self.libres(), antes)
            if k == 0:
                if self.fila == 0:           # parlamento más largo que una página
                    k = RENGLONES - 2
                else:
                    self.nueva()
                    continue
            self.aire(antes)
            self.poner(SANGRIA["personaje"], estilar(nombre))
            for tipo, l in lineas[:k]:
                self.poner(SANGRIA[tipo], l)
            lineas = lineas[k:]
            if lineas:
                self.poner(SANGRIA["personaje"], estilar("(MÁS)"))
                if "(CONT.)" not in nombre:
                    nombre += " (CONT.)"
                self.nueva()

    def transicion(self, texto):
        linea = estilar(texto.upper())
        antes = 1 if self.fila > 0 else 0
        if antes + 1 > self.libres():
            self.nueva()
            antes = 0
        self.aire(antes)
        self.poner(0 if INCAA else COLS - len(linea), linea)

    def centrado(self, texto):
        lineas = partir(estilar(texto), COLS)
        antes = 1 if self.fila > 0 else 0
        if antes + len(lineas) + 2 > self.libres():
            self.nueva()
            antes = 0
        self.aire(antes)
        for l in lineas:
            self.poner(0 if INCAA else (COLS - len(l)) / 2.0, l)


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
            siguiente = None
            for otro in bloques[n + 1:]:
                if otro["tipo"] != "capitulo":
                    siguiente = otro
                    break
            p.escena(b["texto"], siguiente)
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

EPIGRAFES = (
    (
        ("«Oíd el ruido de rotas cadenas,", "ved en trono a la noble igualdad.»"),
        "Himno Nacional Argentino, 1813",
    ),
    (
        (
            "«…para nosotros, para nuestra posteridad,",
            "y para todos los hombres del mundo",
            "que quieran habitar en el suelo argentino.»",
        ),
        "Preámbulo de la Constitución Nacional, 1853",
    ),
)


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


def centrar(c, y, texto, fuente, cuerpo=12):
    c.setFont(fuente, cuerpo)
    c.drawCentredString(ANCHO / 2.0, y, texto)


def dibujar_epigrafes(c, y):
    normal, cursiva = FUENTES[(False, False)], FUENTES[(False, True)]
    for versos, fuente_cita in EPIGRAFES:
        for renglon in versos:
            centrar(c, y, renglon, cursiva, 12)
            y -= 16
        y -= 6
        centrar(c, y, fuente_cita, normal, 10)
        y -= 70


def portada(c):
    normal, negrita = FUENTES[(False, False)], FUENTES[(True, False)]
    y = ALTO * 0.62
    centrar(c, y, TITULO, negrita, 26)
    c.setLineWidth(1.1)
    medio = ANCHO / 2.0
    c.line(medio - 118, y - 12, medio + 118, y - 12)
    if INCAA:
        # Concurso anónimo: en la carpeta solo puede figurar el nombre de la obra.
        dibujar_epigrafes(c, y - 150)
        c.showPage()
        return
    centrar(c, y - 62, "guion original de", normal)
    centrar(c, y - 88, AUTOR, negrita, 14)
    c.setFont(normal, 11)
    c.drawString(IZQ, 96, "Largometraje de ficción")
    c.drawString(IZQ, 82, "Ópera prima")
    c.drawRightString(IZQ + COLS * CAR, 96, "Primera versión")
    c.drawRightString(IZQ + COLS * CAR, 82, "Noviembre de 2026")
    c.showPage()
    dibujar_epigrafes(c, ALTO * 0.66)
    c.showPage()


def construir(perfil, mostrar_paginas=False):
    usar(perfil)
    rutas = sorted(glob.glob(os.path.join(AQUI, "guion", "*.fountain")))
    if not rutas:
        sys.exit("No hay archivos en guion/*.fountain")
    p = paginar(leer(rutas))

    c = canvas.Canvas(SALIDA, pagesize=A4, initialFontName=FUENTES[(False, False)])
    c.setTitle("Oíd mortales")
    c.setSubject("Guion de largometraje")
    c.setCreator("construir_pdf.py")
    c.setAuthor("" if INCAA else AUTOR)       # la versión para concursos es anónima

    portada(c)

    marcas = {}
    for titulo, indice in p.marcas:
        marcas.setdefault(indice, []).append(titulo)

    for indice, pagina in enumerate(p.paginas):
        numero = indice + 1
        for titulo in marcas.get(indice, []):
            clave = "cap%d_%d" % (indice, len(titulo))
            c.bookmarkPage(clave)
            c.addOutlineEntry(titulo, clave, level=0)
        if numero > 1 or INCAA:               # el INCAA pide todas las páginas numeradas
            c.setFont(FUENTES[(False, False)], 12)
            c.drawRightString(IZQ + COLS * CAR, ALTO - 44, "%d." % numero)
        for fila, sangria, linea in pagina:
            dibujar_linea(c, IZQ + sangria * CAR, PRIMER_RENGLON - fila * RENGLON, linea)
        c.showPage()
    c.save()

    extra = "portada" if INCAA else "portada y epígrafes"
    print("%s: %d páginas de guion (+ %s), %d escenas" % (
        os.path.basename(SALIDA), len(p.paginas), extra, p.escenas))
    ultimo = p.paginas[-1][-1][0] + 1 if p.paginas[-1] else 0
    print("  última página: %d de %d renglones" % (ultimo, RENGLONES))
    if mostrar_paginas:
        for titulo, indice in p.marcas:
            print("  p. %3d  %s" % (indice + 1, titulo))
    return len(p.paginas)


if __name__ == "__main__":
    registrar_fuentes()
    for perfil in ("estandar", "incaa"):
        construir(perfil, mostrar_paginas="--paginas" in sys.argv)
