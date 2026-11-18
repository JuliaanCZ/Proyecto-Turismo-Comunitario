# Revisión de secretos y datos personales (TM-ENT-02, B3.3)

**Fecha:** 2026-11-18 · **Base:** `main` en `5c617c4` más los cambios sin commit de B3.3 · **Resultado:** **sin credenciales, tokens ni claves privadas** en el árbol ni en el historial; quedan **observaciones de datos personales y de contenido heredado** que el equipo debe decidir (ver [`contenido-heredado.md`](contenido-heredado.md)).

Esta revisión **no imprime ningún valor sensible**: solo archivo, ubicación y tipo de hallazgo. Las salidas completas están en [`secretos-arbol.txt`](secretos-arbol.txt) y [`secretos-historial.txt`](secretos-historial.txt); el script que las produce es [`buscar-secretos.mjs`](buscar-secretos.mjs).

## Lista de comprobación

| # | Comprobación | Resultado |
|---|---|---|
| 1 | `.env` no está versionado: `git ls-files` no lo lista y `git check-ignore -v .env` lo ignora por `.gitignore` (`.env`, `.env.*`, con excepción de `.env.example`) | Pasa |
| 2 | `.env` y cualquier `.env.*` **nunca** se añadieron al historial: `git log --all --diff-filter=A -- .env '.env.*'` solo muestra `.env.example`; tampoco hay `*.pem`, `*.key`, `*.sqlite` ni `*.db` versionados ni añadidos | Pasa |
| 3 | `.env.example` solo trae marcadores: [`verificar-env-example.mjs`](verificar-env-example.mjs) comprueba sus 16 claves contra `src/config.js` (ninguna falta, ninguna sobra), que los tres secretos son textos «ejemplo…», que `WHATSAPP_BOOKING_NUMBER` va vacío, que se carga con `loadConfig` y que producción rechaza el secreto ficticio ([`env-example.txt`](env-example.txt)) | Pasa (exit 0) |
| 4 | Patrones de claves en el **árbol** (366 archivos versionados o no ignorados): claves privadas, AWS, tokens de GitHub, Slack, Google, `sk-…`, JWT | Sin hallazgos |
| 5 | Los mismos patrones en el **historial** (92 commits, todas las ramas, líneas añadidas) | Sin hallazgos |
| 6 | Los valores del `.env` local del autor no aparecen en el árbol ni en el historial. La comparación se hizo **en memoria** (modo `env-local` del script) y no se imprimió ni guardó ningún valor. De 6 variables comparables, 4 no aparecen; las otras 2 son `APP_ORIGIN` (público, `localhost`) y `CSRF_SECRET`, cuyo valor local es el marcador ficticio de `.env.example`. **El número de WhatsApp local no aparece en ningún archivo ni commit** | Pasa |
| 7 | Contraseñas solo ficticias: las claves de las cuentas de demostración vienen de `SEED_DEMO_PASSWORD` (marcador en `.env.example`); `seed:demo` no las imprime («la de SEED_DEMO_PASSWORD (no se muestra)»); las pruebas usan literales legibles. La única cadena de apariencia aleatoria en `tests/`, `scripts/` y `evidencias/` es un valor con forma de hash `$argon2id$` de 44 caracteres en `tests/unit/db-migraciones.test.js` (línea 61), demasiado corto para ser un hash real y usado solo para la restricción `CHECK` | Pasa |
| 8 | Bases locales fuera del control de versiones: `data/` y `*.sqlite*` están ignorados y `git ls-files` no lista ninguna base | Pasa |

## Hallazgos del escáner y su clasificación

Ninguno es una credencial real. Se informan archivo y tipo, sin valores.

| Tipo | Dónde | Clasificación |
|---|---|---|
| URL con usuario y clave | `docs/planificacion/09-entorno-despliegue-y-operacion.md` (6 líneas, también en el historial desde `85c50ac`) | Cadenas de ejemplo de PostgreSQL del diseño anterior (`localhost`); las claves son marcadores. Contenido heredado: ver decisión H-06 |
| Literales asignados a nombres como `password` o `token` | 9 archivos de `tests/` y `evidencias/` más variables de código en `src/` y `scripts/` | Contraseñas de prueba legibles y valores generados en tiempo de ejecución; no son secretos reales |
| Correos con dominio no reservado | `tests/integration/web-base.test.js` y una evidencia de B0.4 (`@ejemplo.ec`); `tests/unit/validate.test.js` (un dominio institucional con parte local genérica) | Ejemplos ficticios |
| Teléfono | `tests/integration/ofertas-http.test.js` | El número ficticio de las pruebas; nunca se envía a WhatsApp |
| Ruta local de una cuenta de Windows | `docs/mvp/evidencias/B0.2/db-migrate.txt` (3 líneas) y `docs/mvp/evidencias/B2.3/sembrado.txt` (1): carpeta de usuario del equipo del autor | Dato personal de bajo riesgo en evidencias: decisión H-08 |
| Ruta local de otra persona | `docs/planificacion/referencias/PLAN.md` (línea 13) y `docs/planificacion/referencias/PROMPT-CONTINUAR-PLANIFICACION.md` (línea 8) | Datos personales de bajo riesgo; el primero ya estaba previsto en PM-11: decisión H-01 |

## Datos personales en los metadatos de Git

Las direcciones de correo de los integrantes (nueve distintas, algunas personales) forman parte de cada commit. No se pueden retirar sin reescribir el historial, y el repositorio **ya es público** (ver [`contenido-heredado.md`](contenido-heredado.md), H-00). Decisión pendiente (H-09): aceptarlo y declararlo, o, si algún integrante no quiere publicar su correo, resolverlo con el procedimiento que el equipo acuerde (por ejemplo, un `.mailmap` solo ayuda a presentar nombres, no oculta correos).

## Límites de esta revisión

- Es una búsqueda por patrones y no sustituye a una herramienta dedicada (gitleaks o TruffleHog no están instaladas aquí). Una clave sin formato conocido y sin nombre sospechoso no se detecta.
- No se inspeccionaron una por una las capturas PNG de `docs/mvp/evidencias/` ni el `.docx` del docente (que no se versiona). **Pendiente:** una mirada humana a las capturas (¿alguna muestra datos personales, el `.env` o una barra de pestañas con cuentas reales?).
- Se revisó el contenido de Git. No se revisaron los comentarios de los PR, los issues, las ramas ajenas del remoto ni los avisos de «secret scanning» de GitHub; **pendiente:** que alguien con acceso al repositorio los consulte.
- Si algún día se detectara un secreto real, hay que **invalidarlo y reemplazarlo** (así lo pide el Word): borrarlo del árbol no lo retira del historial público.

## Cómo repetirlo

```bash
node docs/mvp/evidencias/B3.3/buscar-secretos.mjs arbol       # exit 1 = hay «posible secreto» (hoy: 1 por las URL de ejemplo heredadas)
node docs/mvp/evidencias/B3.3/buscar-secretos.mjs historial
node docs/mvp/evidencias/B3.3/buscar-secretos.mjs env-local   # compara TU .env sin imprimir valores
node docs/mvp/evidencias/B3.3/verificar-env-example.mjs
git ls-files .env ; git check-ignore -v .env
git log --all --diff-filter=A --name-only --format= -- .env '.env.*' '*.pem' '*.key' '*.sqlite' '*.db'
```

El script marca como «POSIBLE SECRETO» los patrones fuertes y las URL con credenciales: la única marca actual es la de las URL de ejemplo de `docs/planificacion/09-…` descrita arriba. TM-ENT-02 se da por cumplido cuando esa marca está explicada y no queda ningún patrón fuerte.
