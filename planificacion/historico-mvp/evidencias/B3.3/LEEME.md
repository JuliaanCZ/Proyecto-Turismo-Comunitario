# Evidencias de B3.3 — README, uso de IA y revisión del repositorio

Responsable previsto: Integrante 1 · **Lo asume Julián** (`JuliaanCZ`) en su lugar · Revisor previsto: Integrante 4 (el propio Julián), por lo que **la revisión independiente la debe hacer otra persona** · Fecha: 2026-11-18 · Base: `main` en `5c617c4` (B3.1, B3.2 y B1.11 integrados) · Node.js v24.22.3.

**Resultado: completado con pendientes.** El README, `.env.example`, `docs/mvp/ia.md` y las evidencias están escritos y comprobados por el autor. Quedan pendientes lo que solo puede hacer una persona distinta del autor o el equipo: TM-ENT-01, la revisión del PR, la confirmación individual del uso de IA y las decisiones de publicación.

Las rutas y los comandos de las evidencias corresponden a la [versión con SQLite que integró B3.3](https://github.com/JuliaanCZ/Proyecto-Turismo-Comunitario/tree/f42a3798834ff934af19a4c027faa73c275171cb). Usa ese commit para reproducir las comprobaciones del bloque.

## Archivos de esta carpeta

| Archivo | Qué es | Resultado |
|---|---|---|
| [`clon-limpio.txt`](clon-limpio.txt) y [`reproducir-clon-limpio.ps1`](reproducir-clon-limpio.ps1) | Reproducción automatizada del README en un `git clone` aislado, con comandos, versiones, salidas y códigos de salida reales | Ver «Resultados». **No es TM-ENT-01** |
| [`tm-ent-01-registro.md`](tm-ent-01-registro.md) | Instrucciones exactas y formulario para que **otra persona** repita TM-ENT-01 | **Pendiente** |
| [`autoria.md`](autoria.md) y [`autoria-shortlog.txt`](autoria-shortlog.txt) | Auditoría de autoría sin correos, commits por bloque y desequilibrio | Los cuatro tienen commits propios |
| [`secretos.md`](secretos.md), [`secretos-arbol.txt`](secretos-arbol.txt), [`secretos-historial.txt`](secretos-historial.txt) y [`buscar-secretos.mjs`](buscar-secretos.mjs) | TM-ENT-02: revisión de secretos y datos personales; no imprime valores | Sin credenciales; observaciones y decisiones pendientes |
| [`env-example.txt`](env-example.txt) y [`verificar-env-example.mjs`](verificar-env-example.mjs) | `.env.example` contra `src/config.js` | 16 claves coinciden; solo marcadores |
| [`contenido-heredado.md`](contenido-heredado.md) | PM-11: hallazgos de contenido heredado y propuesta de publicación. **No se movió ni borró nada** | Decisiones pendientes |
| [`enlaces.txt`](enlaces.txt) y [`comprobar-enlaces.mjs`](comprobar-enlaces.mjs) | Enlaces relativos de los documentos de B3.3 (diagramas de B3.1, matriz de B3.2, despliegue de B1.11) | Ver «Resultados» |
| [`npm-test.txt`](npm-test.txt) y [`npm-lint.txt`](npm-lint.txt) | `npm test` y `npm run lint` en el árbol de trabajo del autor al terminar | Ver «Resultados» |

Registro de IA: [`../../ia.md`](../../ia.md).

## Resultados

Los números exactos se copian de los archivos de esta carpeta; si no coinciden, manda el archivo.

- **Reproducción del README en un clon aislado:** ver el «Resumen de pasos» al final de [`clon-limpio.txt`](clon-limpio.txt).
- **TM-ENT-02:** cumple con observaciones (ver [`secretos.md`](secretos.md)).
- **Integración con B1.11:** los pasos de HTTPS y WSS del README resumen y enlazan `docs/mvp/despliegue.md` (puerto, variables, comandos de Caddy y comprobaciones) y no los contradicen. **No se repitió** la ejecución con Caddy: no está instalado en esta máquina. Se cita la evidencia de B1.11.
- **Integración con B3.1 y B3.2:** el README incrusta `docs/mvp/img/arquitectura.svg` y enlaza `arquitectura.md`, `esquema.md`, `pruebas.md` e `historias-de-usuario.md`; [`enlaces.txt`](enlaces.txt) comprueba que todos existen. `pruebas.md` se actualizó solo en las filas R9, R10, O9, O10 y O11 y en sus pendientes.

## Qué no se hizo (a propósito)

- No se reescribió el historial, no se hicieron commits, etiquetas ni push, y no se tocó el `.env` ni las bases de datos locales del autor. Las comprobaciones usaron una carpeta temporal y una base propia dentro de ella.
- No se contrató ni configuró alojamiento: es opcional en el primer bimestre.
- No se resolvieron los pendientes visuales de B2.2 (viñetas de la paginación y ubicación del formulario de la foto); siguen documentados en `demo.md` §8, filas 6 y 7, y en el README.
- No se incluyeron el `.docx` del docente, el temporal de Excel ni el `Reparto-y-secuencia-MVP.xlsx` modificado.

## Uso de IA

El README, `ia.md`, estos documentos y los tres scripts los preparó Claude Code (modelo `claude-sonnet-5-5`, según la sesión) a partir de la lectura del repositorio y de la petición de Julián. Julián debe revisar el contenido, entenderlo y confirmarlo con su propia cuenta; la persona que lo revise debe ser otra.

## Revisión técnica adicional

[Revisión de Codex](revision-codex.md) sobre el commit `403722d`: instalación limpia, 202 pruebas, ESLint y comprobaciones HTTP. Se aclaró el requisito de dependencias del comprobador WSS en el README. Esta revisión asistida por IA no sustituye TM-ENT-01 ni la revisión humana del PR.
