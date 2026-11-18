# Registro del uso de IA (B3.3)

Este documento detalla el uso de inteligencia artificial que se puede **respaldar** con el historial de Git, los informes y las evidencias del repositorio. Complementa la sección «Uso de IA» del [README del primer bimestre](https://github.com/JuliaanCZ/Proyecto-Turismo-Comunitario/blob/f42a3798834ff934af19a4c027faa73c275171cb/README.md#uso-de-ia). Todo lo que no tiene respaldo figura como **pendiente de confirmar por el equipo**: no se inventan herramientas, versiones, revisores ni intervenciones humanas.

La guía del curso exige declarar la herramienta y su propósito, revisar, probar y comprender lo generado, y poder explicarlo y modificarlo en la defensa. Presentar como propio un contenido generado sin declararlo es una falta de integridad académica.

- **Fecha de revisión:** 2026-11-18, sobre `main` en `5c617c4` y la rama `bloque/B3.3-documentacion`.
- **Fuentes usadas:** `git log --all` (autores, fechas y líneas `Co-authored-by`), la lista pública de pull requests y sus revisiones en GitHub (leída sin credenciales), `docs/mvp/evidencias/` y los documentos de planificación.
- **Cómo se obtuvo cada dato** y las cifras exactas están en [`evidencias/B3.3/autoria.md`](evidencias/B3.3/autoria.md).

## Herramientas con respaldo

| Herramienta | Modelo o versión | Propósito | Dónde consta |
|---|---|---|---|
| Claude (Anthropic), con Claude Code | `Claude Opus 5.5`, según las líneas `Co-Authored-By` de los commits de planificación; versión de la herramienta no registrada | Redacción y revisión cruzada de la planificación (`docs/planificacion/`); diagrama, documento y scripts de comprobación de B3.1; preparación de evidencias | Seis commits del 2026-11-16 (`85c50ac`, `a480bd7`, `381f828`, `4e39b0e`, `c35f57a`, `d635385`); [`evidencias/B3.1/LEEME.md`](evidencias/B3.1/LEEME.md), sección «Uso de IA»; el registro de B0.2 (`evidencias/B0.2/db-migrate.txt`) guarda una carpeta temporal propia de Claude Code |
| Claude Code en B3.3 | `claude-sonnet-5-5`, según la propia sesión | Leer el repositorio y los planes; redactar README, este registro y las evidencias; escribir los scripts de comprobación de `evidencias/B3.3/`; ejecutar y registrar los comandos | Esta rama (aún sin commit). Julián asume el bloque y debe revisar y confirmar |
| Cursor | no registrada | Generación y edición de código, pruebas, evidencias y documentos en los bloques cuyos commits lo declaran | 16 commits de `Matian542` con `Co-authored-by: Cursor`: B0.3 (`0ae5ae4`, `948f147`, `f443410`), B1.1 (`cbdb94d`, `a63d4b5`, `14b431b`), B1.2 (`46c2fd3`, `ae0407e`), B1.3 (`7f67a5b`), B2.1 (`af0b873`, `99942e5`, `880e8ab`, `ca297b5`), B3.2 (`c8b894f`, `b05d967`, `4db4cf1`) |
| Codex (OpenAI) | no registrada | Plan original y comprobación de fuentes de PayPal durante la planificación anterior (consultas con su «navegador de investigación») | `docs/planificacion/referencias/FUENTES-PAYPAL-REVISION.md` (líneas iniciales), `docs/planificacion/00-indice-y-control.md` (línea 572), `docs/planificacion/04-reglas-transacciones-y-concurrencia.md` (línea 2618) y las marcas `codex-file-citation` de `docs/planificacion/referencias/PLAN.md`. No consta qué integrante lo usó |
| Revisión automática de GitHub Copilot | no registrada | Comentarios automáticos de revisión | PR #20 (B2.1): una revisión en estado `COMMENTED`, sin aprobar ni bloquear |

### Indicios sin confirmar

- **Codex en B1.4:** la rama del PR #11 se llamó `codex/B1.4-ofertas`. Como Codex consta en la planificación (fila anterior), es un indicio razonable, pero ningún commit ni informe de B1.4 lo declara. **Pendiente:** el autor del bloque (`Matein0411`, Integrante 2) confirma qué herramienta usó, o que no usó ninguna.
- **Bloques sin ninguna declaración de IA:** B0.1, B0.4, B0.5, B0.6, B0.7, B1.4, B1.5, B1.6, B1.7, B1.8, B1.9, B1.10, B1.11, B2.2, B2.3 y B2.4. Que no conste no significa que no se usara: cada autor debe confirmar «sin IA» o declarar la herramienta.
- **Líneas de coautoría incompletas:** `.claude/settings.json` deja vacía la línea de atribución de los commits (`attribution.commit`), así que los commits hechos con Claude Code desde este repositorio pueden no llevar `Co-Authored-By`. Las líneas de los commits sirven de prueba de uso, no de prueba de no uso.
- **Autoría de planificación:** el commit inicial de planificación (`24363b8`, identidad `juliaan-cz2004`) y los tres commits `docs:` posteriores (`e23edb8`, `176ba0c`, `56a790a`) no declaran herramienta. Los prompts usados se conservan en `docs/planificacion/referencias/PROMPT-*.md` y `mvp-primer-bimestre/PROMPT-MVP.md`.

## Qué se generó y cómo se revisó

Propósito general declarado en el plan: planificación y generación de código **por bloques**, cada uno con un responsable, un revisor distinto del autor, pruebas y evidencias propias. Lo observable es esto:

- **Pruebas:** la matriz y la última ejecución están en [`pruebas.md`](pruebas.md) (202 de 202 en B3.2) y se repitieron en B3.3 en una copia limpia ([`evidencias/B3.3/clon-limpio.txt`](evidencias/B3.3/clon-limpio.txt)). Pasar las pruebas no prueba que cada integrante entienda el código: eso se confirma abajo.
- **Evidencias:** cada bloque guarda las salidas literales de `npm test` y `npm run lint` en `docs/mvp/evidencias/<bloque>/`.
- **Revisión humana documentada de B3.1:** las cinco afirmaciones del diagrama las confirmó el revisor en el PR #23 ([`evidencias/B3.1/afirmaciones-revision.md`](evidencias/B3.1/afirmaciones-revision.md)).
- **Ensayo humano de la demostración:** lo registró Julián el 2026-11-17 con una duración declarada de unos cinco minutos ([`demo.md`](demo.md), §6). La revisión completa de teclado y móvil por una persona sigue pendiente.

## Revisión por bloque

«Previsto» sale de la tabla de bloques de [`PLAN-MVP.md`](../mvp-primer-bimestre/PLAN-MVP.md) §3.5. «Commits» son los usuarios de GitHub que firmaron los commits del bloque. «Revisión en GitHub» son las revisiones públicas del PR, leídas el 2026-11-18; un PR sin revisión formal puede tener comentarios o una revisión hecha fuera de GitHub que aquí no consta. La asignación de usuarios a «Integrante n» es una **inferencia** por autoría de los bloques (PM-08, nombres por confirmar).

| Bloque | PR | Responsable previsto → commits | Revisor previsto | Revisión en GitHub | IA con respaldo | ¿Revisor distinto del autor registrado? |
|---|---|---|---|---|---|---|
| B0.1 | #1 | I4 → `JuliaanCZ` | I3 | `alexisv-275`: cambios solicitados y luego aprobó | — | Sí |
| B0.2 | #4 | I4 → `JuliaanCZ` | I2 | ninguna | Claude Code (carpeta temporal en la evidencia) | No consta |
| B0.3 | #5 | I1 → `Matian542` | I4 | `JuliaanCZ`: cambios solicitados y luego aprobó | Cursor | Sí |
| B0.4 | #6 | I4 → `JuliaanCZ` | I1 | ninguna (comentario de `Matian542`) | — | Comentario, sin aprobación formal |
| B0.5 | #8 | I3 → `alexisv-275` | I2 | ninguna (comentario de `Matein0411`) | — | Comentario, sin aprobación formal |
| B0.6 | #3 | I3 → `alexisv-275` | I1 | ninguna | — | No consta |
| B0.7 | #2 | I2 → `Matein0411` | I3 | `alexisv-275`: aprobó | — | Sí |
| B1.1 | #12 | I1 → `Matian542` | I2 | ninguna (comentario de `Matein0411`) | Cursor | Comentario, sin aprobación formal |
| B1.2 | #15 | I1 → `Matian542` | I4 | `JuliaanCZ`: cambios solicitados; aprobación no registrada | Cursor | Revisión parcial |
| B1.3 | #18 | I1 → `Matian542` | I3 | `alexisv-275`: aprobó | Cursor | Sí |
| B1.4 | #11 | I2 → `Matein0411` | I1 | ninguna (comentario de `Matian542`) | Indicio de Codex por el nombre de la rama (sin confirmar) | Comentario, sin aprobación formal |
| B1.5 | #14 | I2 → `Matein0411` | I4 | `JuliaanCZ`: cambios solicitados; `alexisv-275`: aprobó | — | Sí |
| B1.6 | #9 | I3 → `alexisv-275` | I1 | ninguna (comentario de `Matian542`) | — | Comentario, sin aprobación formal |
| B1.7 | #13 | I3 → `alexisv-275` | I2 | ninguna (comentario de `Matein0411`) | — | Comentario, sin aprobación formal |
| B1.8 | #16 | I3 → `alexisv-275` | I4 | `JuliaanCZ`: cambios solicitados; aprobación no registrada | — | Revisión parcial |
| B1.9 | #10 | I4 → `JuliaanCZ` | I2 | ninguna (comentario de `Matein0411`) | — | Comentario, sin aprobación formal |
| B1.10 | #17 | I4 → `JuliaanCZ` | I3 | `alexisv-275`: cambios solicitados y luego aprobó | — | Sí |
| B1.11 | #7 | I2 → `Matein0411` | I4 | `JuliaanCZ`: cambios solicitados; aprobación no registrada | — | Revisión parcial |
| B2.1 | #20 | I1 → `Matian542` | I3 | `alexisv-275`: cambios solicitados y luego aprobó; Copilot: comentó | Cursor; revisión automática de Copilot | Sí |
| B2.2 | #22 | I4 → `JuliaanCZ` | I1 | ninguna (comentario de `Matian542`) | — | Comentario, sin aprobación formal |
| B2.3 | #19 | I2 → `alexisv-275` (autor distinto del previsto) | I4 | `JuliaanCZ`: cambios solicitados; aprobación no registrada | — | Revisión parcial |
| B2.4 | #21 | I3 → `alexisv-275` | I1 | ninguna (comentario de `Matian542`) | — | Comentario, sin aprobación formal |
| B3.1 | #23 | I4 → `JuliaanCZ` | I2 | ninguna formal; documentada en el repositorio: revisor en lugar del Integrante 2 confirmó las cinco afirmaciones | Claude Code | Sí, por el registro de `afirmaciones-revision.md` (nombre del revisor por confirmar: la evidencia lo escribe distinto al nombre que muestra Git) |
| B3.2 | #24 | I2 → `Matian542` (autor distinto del previsto) | I3 | ninguna | Cursor | No consta |
| B3.3 | pendiente | I1 → Julián (`JuliaanCZ`), que lo asume | I4 (la persona prevista es la que lo escribe) | pendiente | Claude Code | **Pendiente: debe revisarlo otra persona** |

Observaciones:

- De los 24 bloques integrados: ocho tienen una aprobación registrada (o, en B3.1, una revisión documentada en el repositorio) de alguien distinto del autor; cuatro solo tienen «cambios solicitados» sin aprobación posterior registrada; nueve solo tienen comentarios y tres no tienen ninguna constancia. El criterio del plan es «un PR por bloque con revisor distinto»: lo que falte debe cerrarse por el equipo con una revisión posterior o dejarse declarado.
- B2.3 y B3.2 los firmó una persona distinta de la prevista. El plan no explica la sustitución; **pendiente de confirmar** quién hizo cada bloque y por qué.

## Confirmación individual (pendiente)

Cada integrante confirma, con **su propia cuenta** (commit o comentario en el PR de B3.3), lo que declaró y revisó. Mientras no lo haga, la casilla queda sin marcar: este documento no afirma que alguien ya entienda el código.

| Integrante | Herramientas de IA que usó y en qué bloques | Revisó, probó y puede explicar y modificar su parte | Confirmado por |
|---|---|---|---|
| Integrante 1 (`Matian542`) | ☐ pendiente | ☐ pendiente | — |
| Integrante 2 (`Matein0411`) | ☐ pendiente | ☐ pendiente | — |
| Integrante 3 (`alexisv-275`) | ☐ pendiente | ☐ pendiente | — |
| Integrante 4 (`JuliaanCZ`, Julián) | ☐ pendiente | ☐ pendiente | — |

## Uso de IA en B3.3 (este bloque)

- **Qué hizo la IA:** leyó el repositorio y los planes, contrastó el README anterior con el código, escribió el README nuevo, este registro, los documentos de `evidencias/B3.3/` y los scripts `buscar-secretos.mjs`, `verificar-env-example.mjs` y `reproducir-clon-limpio.ps1`, y ejecutó los comandos cuyo resultado se registra.
- **Qué debe hacer la persona:** revisar los textos y los scripts, repetir al menos los comandos del README, y confirmar o corregir los datos que dependen del equipo (nombres, herramientas, revisores).
- **Qué no se hizo:** no se reescribió el historial, no se crearon commits ni etiquetas, no se hizo push, no se contrató ni configuró alojamiento y no se tocaron el `.env` ni las bases locales del autor.
