# Guía visual del MVP

> Bloque B0.4 · Responsable: Integrante 4 · Para revisión en el PR (PLAN-MVP §2.3).
> Lo implementan `public/css/app.css` (variables y componentes) y `src/web/views/` (plantilla). Las pantallas de cuentas, ofertas y chat la reutilizan; B1.9 la aplica a portada, panel y menú; B2.2 revisa el conjunto.

## Dirección propuesta

La aplicación es una herramienta de trabajo de una PYME ecuatoriana que coordina experiencias de turismo comunitario. Debe sentirse **cercana y confiable**, no corporativa ni publicitaria: papel cálido, verde de selva para actuar y un tono de achiote para lo que importa de cada oferta.

- **Qué se ve primero en una oferta:** el nombre (serif, grande), luego el **lugar** y la **fecha**. La fecha va en achiote y negrita; es el único color cálido de la pantalla, así que se localiza de un vistazo.
- **Qué evita:** gradientes, sombras decorativas, tarjetas dentro de tarjetas, iconos de relleno y textos promocionales genéricos. La tarjeta solo se usa donde agrupa una oferta.
- **Navegación:** cabecera simple sobre fondo blanco, con la marca a la izquierda y pocos enlaces. La página actual se marca con `aria-current` y subrayado grueso, no solo con color.

## Paleta (variables `--tc-*` en `:root`)

| Variable | Valor | Uso |
|---|---|---|
| `fondo` | `#faf6ee` | Fondo de página (crema) |
| `superficie` | `#ffffff` | Cabecera, tarjetas, campos |
| `superficie-suave` | `#f1eadb` | Botón desactivado, hover del botón secundario |
| `texto` | `#26231d` | Texto principal |
| `texto-suave` | `#5a5242` | Ayudas, etiquetas de oferta, pie |
| `borde` / `borde-campo` | `#d6cdb9` / `#857a62` | Separadores / bordes de controles |
| `primario` (+ `-hover`) | `#1e5b45` / `#154333` | Botón principal, enlaces, marca (selva) |
| `acento` | `#9a3b14` | Fecha de la oferta (achiote) |
| `foco` | `#1a4fa0` | Anillo de foco |
| `error` · `exito` · `aviso` (+ `-fondo`) | ver `app.css` | Mensajes de estado |

Los estados **siempre llevan texto** («Error:», «Listo:», «Atención:»), nunca dependen solo del color.

## Tipografía

Fuentes del sistema; no se descarga nada (CSP `style-src 'self'`) y carga al instante.

- Títulos: serif `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia`.
- Texto: `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial`.
- Texto base 17 px con interlineado 1,6 (los campos heredan 17 px: sin zoom automático en iOS). `h1` fluido de 28 a 40 px, `h2` de 22 a 28 px, `h3` 20 px. Líneas de párrafo limitadas a 68 caracteres.

## Espaciado y estructura

Escala de 0,25 rem (`--tc-e1` a `--tc-e7`). Contenedor de 60 rem máximo, con 1 rem de margen lateral en móvil y 1,5 rem desde 48 rem. Controles de **44 px** de alto mínimo. Una sola columna en móvil; en la oferta, etiqueta y valor pasan a dos columnas desde 36 rem.

## Componentes compartidos

| Componente | Clases | Notas |
|---|---|---|
| Botones | `.btn`, `.btn--secundario`, `.btn--peligro`, `[disabled]` | El texto dice la acción («Publicar oferta»), no «Aceptar» |
| Campo | `.campo` + parcial `partials/form-field.ejs` | Etiqueta visible arriba, ayuda opcional y `<p data-error-for>` siempre presente, enlazados con `aria-describedby` |
| Mensajes | `.mensaje--error`, `--exito`, `--aviso` | Empiezan con una palabra que nombra el estado |
| Oferta | `.oferta`, `.oferta__nombre`, `.oferta__datos`, `.oferta__fecha` | `<dl>` con «Lugar» y «Fecha» |
| Estado vacío | `.vacio` | Dice qué falta y ofrece la acción siguiente |
| Accesibilidad | `.saltar`, `.sr-only`, `:focus-visible` | Enlace «Saltar al contenido» hacia `<main id="contenido">` |
| Portada y panel (B1.9) | `.portada`, `.rutas`, `.resumen`, `.resumen__numero`, `.acciones--bloque`, `.insignia` | Sin tarjetas: el resumen va entre dos líneas y la cifra en serif verde; en móvil los botones de `.acciones--bloque` ocupan todo el ancho |

Cada pantalla tiene un `<h1>` y un `<title>` propios (`title` en `res.renderPage`). El formulario lleva su esquema en `data-schema` (JSON; las expresiones regulares como cadenas).

## Cómo se comprobó

Todo se ejecutó; las salidas están en `docs/mvp/evidencias/B0.4/`.

- **Contraste (WCAG 2.1 AA):** `node scripts/check-contraste.js` lee las variables de `app.css` y mide 25 pares: texto 4,5:1 o más (el menor es 6,44:1), bordes de control y foco 3:1 o más (el menor es 3,93:1). Salida en `check-contraste.txt`.
- **Foco visible:** anillo sólido de 3 px a 3 px del control (`outline-offset`), con 6,6 a 7,9:1 sobre las tres superficies. Medido en Chrome con teclado: enlace «Saltar al contenido», botones y campos reportan `:focus-visible` y `solid 3px rgb(26, 79, 160)`. Capturas `foco-saltar.png` y `foco-boton.png`.
- **Móvil:** Chrome a 375 × 812: sin desborde horizontal, ningún control por debajo de 44 px, `lang="es-EC"`, un `<h1>`, todas las etiquetas enlazadas. Capturas `diseno-movil.png` y `errores-formulario.png`; escritorio en `diseno-escritorio.png`.
- **Vista de ejemplo:** `GET /dev/diseno` (solo fuera de producción) reúne todos los componentes. Sus datos son ficticios.

## Límites conocidos

- No hay modo oscuro ni se probó con lector de pantalla ni en Safari o Firefox; solo en Chrome 157.
- La cabecera ya es la definitiva (B1.9, `partials/header.ejs`); `#chat-badge` queda oculto hasta que B1.10 lo llene. Evidencias de portada, panel y menú en `docs/mvp/evidencias/B1.9/`.
- El anillo de foco no se mide contra el verde del botón porque no son adyacentes (hay 3 px de separación); lo documenta `check-contraste.js`.
- Si se agrega una fuente propia hay que permitirla en la CSP (`font-src 'self'`) y coordinarlo con el Integrante 4.
