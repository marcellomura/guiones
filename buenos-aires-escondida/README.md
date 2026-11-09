# Buenos Aires Escondida

Juego original de **objetos ocultos y acertijos** por ocho rincones de Buenos Aires.
Don Ernesto, un viejo fileteador, cortó su último cartel en ocho pedazos y los escondió por la
ciudad. Flor, fotógrafa porteña, te acompaña a buscarlos.

## Cómo se juega

1. **Mapa.** Don Ernesto deja un acertijo de lugar (con voz). Tocá el barrio que describe.
2. **Objetos ocultos.** Encontrá en la escena lo que pide la lista. Hay tres tipos de lista:
   palabras, siluetas y acertijos. La lupa marca un objeto y se recarga sola; los clics a lo loco
   traban la escena unos segundos. Zoom con dos dedos, rueda del mouse o los botones + y −.
3. **Desafío del barrio.** Postal rota (intercambiar fichas), siete diferencias o memotest.
4. **Pregunta porteña** y un dato curioso real, contado por Flor.
5. Cada barrio da un pedazo del cartel. Con los ocho, se arma el cartel final.

Los objetos se reparten al azar en cada partida, así que se puede volver a jugar cualquier barrio.

| Barrio | Lista | Desafío |
| --- | --- | --- |
| Caminito (La Boca) | palabras | postal rota |
| Feria de San Telmo | palabras | diferencias |
| Café de la Avenida de Mayo | acertijos | memotest |
| Teatro Colón | siluetas | postal rota |
| Librería del Gran Teatro (Av. Santa Fe) | acertijos | diferencias |
| Puerto Madero | palabras | memotest |
| Rosedal de Palermo | siluetas | diferencias |
| Avenida Corrientes | acertijos | postal rota |

## Probarlo en la compu

No necesita instalar nada, pero hay que servirlo por HTTP (los navegadores no cargan los
archivos con `file://`):

```bash
cd buenos-aires-escondida
python3 -m http.server 8000
# abrir http://localhost:8000
```

El progreso se guarda en el navegador (`localStorage`). Si no hay almacenamiento disponible,
el juego funciona igual, sin guardar.

## Estructura

```
index.html          página para abrir localmente
artifact.html       la misma página sin <html>/<head>, para publicar como Artifact
css/estilo.css      estilos (identidad de fileteado porteño)
js/content.js       textos: objetos y sus acertijos, diálogos, barrios, preguntas
js/atlas.js         posiciones de cada objeto dentro de su atlas (generado)
js/juego.js         motor del juego
assets/img          escenas, postales, atlas de objetos, logo, mapa, retratos
assets/audio        voces, música y efectos
tools/              scripts para recortar objetos y optimizar los assets
```

## Cómo se hizo el material

Todo el arte, las voces, la música y los efectos se generaron con **ElevenLabs**:

- **Imágenes** (GPT Image 2.5): 8 escenas pintadas a mano, 8 hojas de 16 objetos cada una
  (128 objetos), logo y cartel fileteado, mapa ilustrado, pantalla de título, retratos de Flor y
  Don Ernesto y el dorso de las cartas.
- **Voces** (Eleven v4, español rioplatense): Flor con la voz “Cande - La amiga porteña” y
  Don Ernesto con “Odran – Voz Actoral Argentina”. 30 líneas: presentación, acertijos de lugar,
  datos curiosos y festejos.
- **Música** (Eleven Music): un tango nuevo para el mapa y una milonga tranquila para buscar.
- **Efectos** (Sound Effects): objeto encontrado, error, pista, nivel completo, carta, pieza,
  tranvía y papel.

Los objetos se compusieron sobre las escenas en tiempo real: `tools/extract_sprites.py` los
recorta de las hojas con transparencia y `tools/build_assets.py` arma los atlas, convierte las
imágenes a WebP y normaliza el audio. En cada barrio se evitan los objetos que ya aparecen
pintados en el fondo, para que la lista nunca sea ambigua.

Los personajes, los acertijos y la historia son inventados; los datos curiosos son reales.
