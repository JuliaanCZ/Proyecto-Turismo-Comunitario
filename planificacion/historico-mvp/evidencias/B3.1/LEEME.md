# Evidencias de B3.1 — Diagrama de arquitectura y coherencia con el código

Responsable: Integrante 4 · Revisor: Integrante 2 · Fecha: 2026-11-17 · Base: `main` en `4ac9c4f` (B2.2 integrado) · Node.js v24.22.3.

Entregable: [`../../arquitectura.md`](../../arquitectura.md) con el diagrama Mermaid, [`../../img/arquitectura.svg`](../../img/arquitectura.svg) y [`../../img/arquitectura.png`](../../img/arquitectura.png).

## Archivos de esta carpeta

| Archivo | Qué es | Resultado |
|---|---|---|
| `tm-arq-01-rutas.txt` | Salida de `comprobar-rutas.sh`: `test -e` sobre cada ruta, nombre de archivo y enlace del documento | Ver «Resultados» |
| `comprobar-rutas.sh` | TM-ARQ-01: extrae las rutas de `arquitectura.md` y las comprueba | — |
| `tm-arq-01-control-negativo.txt` | Salida del script ante una copia del documento con cuatro referencias inventadas | Falla (código 1) y nombra las cuatro |
| `afirmaciones-revision.md` | Cinco afirmaciones con referencias línea a línea y comandos para que el Integrante 2 las revise | **Cinco confirmadas** por el revisor |
| `reglas-dependencia.txt` | Salida de `comprobar-dependencias.sh`: reglas de dependencia, `npm run lint` y controles negativos de ESLint | Todas pasan |
| `comprobar-dependencias.sh` | Comprueba las diez reglas de la sección «Reglas reales de dependencia» | — |
| `esquema-contraste.txt` | Salida de `contrastar-esquema.mjs`: `esquema.md` frente a las migraciones aplicadas en memoria | 295 comprobaciones, 0 fallos |
| `contrastar-esquema.mjs` | Aplica `db/migrations` en `:memory:` y compara columnas, tipos, PK, FK, UK, relaciones del ER, `ON DELETE`, índices y migraciones | — |
| `generar-diagrama.sh` | Exporta el bloque Mermaid a SVG y PNG | — |
| `npm-lint.txt`, `npm-test.txt` | `npm run lint` y `npm test` al terminar | Lint sin errores; 202 de 202 pruebas |

## Resultados

- **TM-ARQ-01 (rutas):** cada carpeta y archivo nombrado en `arquitectura.md` existe. El resumen y el veredicto están al final de `tm-arq-01-rutas.txt`. El script termina con código 1 si falta algo, y se comprobó con un control negativo (ver abajo).
- **TM-ARQ-01 (cinco afirmaciones):** preparadas en `afirmaciones-revision.md` y **confirmadas las cinco** por el revisor (Dilan Calvache, en reemplazo del Integrante 2) en la revisión del PR #23.
- **Esquema:** `esquema.md` coincide con las migraciones reales; no se modificó. No hay una prueba automática equivalente en el repositorio: el contraste es el script de esta carpeta, que no forma parte de `npm test`.
- **Prerrequisito:** B2.2 integrado (PR #22 en `main`); `npm run lint` y `npm test` en verde antes y después de los cambios de B3.1 (no se tocó código).

### Control negativo de TM-ARQ-01

Se probó el script con una copia temporal de `arquitectura.md` (ya borrada) a la que se añadieron cuatro referencias inventadas: una ruta dentro del bloque Mermaid, una ruta en código en línea, un nombre de archivo suelto y un enlace relativo roto. El script las nombró las cuatro y terminó con código 1. Registro: `tm-arq-01-control-negativo.txt`.

## Inspección visual de la imagen exportada

Se abrieron el PNG (3168 × 3246 px) y el SVG renderizado en Chrome 157 (captura a 2030 × 2080 px) y se revisaron texto, flechas, colores y orden de lectura:

- **Texto:** todo el texto es legible sin ampliar en la captura del SVG; el SVG usa elementos `<text>` (50) y ningún `foreignObject`, así que no depende del renderizador de HTML. No hay etiquetas HTML visibles (`<b>`, `<br/>`): en un borrador anterior sí aparecían y se corrigió.
- **Flechas:** todas terminan en un nodo (los destinos de subgrafo, que dejaban flechas en el vacío, se sustituyeron por nodos). Se distinguen las continuas (llamadas) y las punteadas (proxy, suscripción a evento, enlace externo).
- **Contenido presente:** navegador, proxy TLS, WhatsApp como enlace externo, `http.Server` único, middlewares en orden, rutas, bandeja de pruebas, vistas EJS, Socket.IO, contenedor, tres módulos, capa de datos, SQLite y cuadro «Fuera del MVP».
- **Defectos menores que quedan:** algunas etiquetas de flecha se apoyan sobre una línea cercana («peticiones HTTP», «container.accounts offers · chat»), y la caja «Fuera del MVP» queda separada bajo SQLite. No impiden la lectura.
- **Falta por hacer:** ver la imagen incrustada en el README y en las diapositivas (B3.3 y B3.4); no se probó en PowerPoint.

## Cómo reproducir

```bash
bash docs/mvp/evidencias/B3.1/comprobar-rutas.sh
bash docs/mvp/evidencias/B3.1/comprobar-dependencias.sh
node docs/mvp/evidencias/B3.1/contrastar-esquema.mjs .
# La exportación de la imagen requiere Mermaid CLI: ver «Cómo se genera la imagen» en arquitectura.md
```

## Uso de IA

El diagrama, el documento, los scripts de comprobación y las evidencias se prepararon con Claude Code (Anthropic) a partir de la lectura del código del repositorio. El responsable debe revisar el contenido, entenderlo y confirmarlo con su propia cuenta al hacer el commit.
