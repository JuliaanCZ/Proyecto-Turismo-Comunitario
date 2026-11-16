# 11 — Prompts para la IA implementadora

> **ESTADO: REDACTADO — los 38 prompts por paquete redactados el 2026-11-16 (uno por cada ficha del catálogo de 10 §4).**
> Contiene el **prompt maestro**, la **plantilla de informe**, el formato de **`ESTADO-IMPLEMENTACION.md`** y los **38 prompts** (fases 0 a 6 y fase PE; `PE-05` opcional), apoyados en las fichas de [10 §5](10-fases-y-paquetes-implementables.md). **Todos los comandos son previstos y ninguno está probado.** Quedan pendientes externos que ningún prompt resuelve: Q-04, Q-01/Q-02/Q-03/Q-07/Q-09/Q-11, privacidad (D7-6), **Q-08 (T-PAG-24 y EV-07)** y las decisiones abiertas D5-x y D6-x.
> **Siguiente paso exacto en la planificación:** documento 12, §2 (guion minuto a minuto), y después §6 (plan de commits) y §7 (contingencia).

---

## 1. Cómo usar este documento

1. Elegir el siguiente paquete cuyo estado en `ESTADO-IMPLEMENTACION.md` tenga todas sus dependencias «probadas» (grafo en [10 §4](10-fases-y-paquetes-implementables.md)).
2. Abrir una conversación nueva con la IA en la carpeta del repositorio.
3. Pegar el **prompt maestro** (§2) seguido del **prompt del paquete** (§4).
4. Revisar el informe final (§3), el código y las pruebas; hacer la revisión humana indicada en la ficha.
5. Confirmar el cambio con un commit propio del integrante responsable.

## 2. Prompt maestro (reutilizable)

```text
Vas a implementar UN paquete de un proyecto ya planificado. Trabaja como ingeniero de software
cuidadoso: el diseño está decidido y tu tarea es ejecutarlo, no rediseñarlo.

ANTES DE ESCRIBIR CÓDIGO
1. Lee docs/planificacion/00-indice-y-control.md (registro de decisiones, supuestos y hallazgos).
2. Lee ESTADO-IMPLEMENTACION.md y cualquier archivo de instrucciones locales (AGENTS.md, CLAUDE.md,
   README.md).
3. Inspecciona el repositorio real: estructura, package.json, migraciones, pruebas existentes y
   git status. No supongas que algo existe: compruébalo.
4. Lee la ficha del paquete en docs/planificacion/10-fases-y-paquetes-implementables.md y los
   apartados de los documentos 02 a 09 que esa ficha cite.
5. Comprueba que las dependencias del paquete están implementadas y probadas. Si alguna falta o
   está rota, DETENTE: describe el bloqueo y lo que sí verificaste. No improvises una
   implementación incompatible.

MIENTRAS IMPLEMENTAS
- Implementa solo el paquete solicitado. No amplíes el alcance ni adelantes otros paquetes.
- Respeta nombres de entidades, estados, eventos, rutas y códigos de error de la planificación.
- Las reglas de negocio viven en src/modules/*/application. Los adaptadores (src/app,
  src/realtime, src/jobs) no deciden nada.
- Versiones: usa las fijadas en docs/planificacion/02 §5. Prisma debe ser 7.10.1 exacta.
  Consulta la documentación de la versión INSTALADA antes de usar una API; si la API real
  difiere de lo planificado, adáptate y regístralo como decisión nueva.
- Seguridad: valida en servidor sesión, origen, datos y permisos en cada mutación. Nunca
  registres contraseñas, tokens, códigos QR ni credenciales. Nunca pongas secretos en el
  repositorio; usa .env (no versionado) y actualiza .env.example con valores ficticios.
- No ejecutes operaciones destructivas (borrar bases, reiniciar migraciones, reescribir
  historial de Git, borrar archivos ajenos al paquete) sin autorización explícita.
- Escribe las pruebas indicadas por identificador (T-...) junto con el código.

ANTES DE TERMINAR
- Ejecuta los comandos de verificación de la ficha y los pertinentes del proyecto (análisis,
  tipos, pruebas). Informa los resultados REALES, con la salida relevante. Si algo falla y no
  puedes resolverlo, dilo: no ocultes fallos ni marques como hecho lo que no pasó.
- No inventes resultados, cifras de rendimiento, capturas ni evidencias.
- Si una decisión de la planificación tuvo que cambiar, actualiza el documento correspondiente
  en docs/planificacion/ y la fila de decisiones del índice, explicando la razón.
- Actualiza README.md (comandos nuevos) y ESTADO-IMPLEMENTACION.md.
- Entrega el informe final con la plantilla indicada.
- No hagas commit ni push salvo que se te pida; propón el mensaje de commit.

PAQUETE A IMPLEMENTAR:
<pegar aquí el prompt del paquete>
```

## 3. Plantilla de informe al terminar

```markdown
# Informe del paquete <ID> — <título>

## Resultado
<Completado | Completado con pendientes | Bloqueado> — una frase.

## Archivos creados o modificados
| Archivo | Cambio |

## Migraciones
<nombre de cada migración y qué crea; SQL manual añadido> | Ninguna

## Comandos ejecutados y resultados reales
| Comando | Resultado (pasó / falló) | Salida relevante |

## Pruebas
| Identificador | Estado (pasa / falla / no escrita) | Observación |

## Verificaciones pendientes
<lo que no pudo ejecutarse y por qué; pasos manuales para el equipo>

## Decisiones nuevas o cambiadas
<identificador, qué cambió, por qué, documentos actualizados> | Ninguna

## Riesgos y deuda detectados

## Variables de entorno o servicios nuevos

## Mensaje de commit propuesto

## Siguiente paquete habilitado y contexto de traspaso
<qué debe saber la siguiente sesión que no esté ya en la documentación>
```

## 4. Prompts por paquete

### 4.0 Cómo se usan estos prompts

- **Se pega el prompt maestro de §2 y, a continuación, un solo prompt de este apartado.** El prompt del paquete **no repite** el prompt maestro ni la ficha: solo añade lo propio del paquete. La **ficha** de [10 §5](10-fases-y-paquetes-implementables.md) es la fuente del detalle (tareas, contratos, riesgos, traspaso). Si el prompt y la ficha difieren, **manda la ficha**: la IA lo registra como decisión nueva y no improvisa (§2).
- **Estado de los comandos.** Todos los comandos de estos prompts son **previstos: ninguno se ha ejecutado ni probado** (el repositorio aún no contiene código). Quien implementa los ejecuta, anota en el informe de §3 qué comandos **sí** probó con su salida real y deja el resto como «previstos». Un comando no ejecutado **no** se marca como verificado.
- **Orden de la fase 0 (obligatorio):** `P0-01`, `P0-03`, `P0-04`, `P0-02`, `P0-05`, `P0-06`. `P0-02` va **después** de `P0-03` y `P0-04` (D0-1); **Vitest mínimo lo instala `P0-04`** y **el arnés completo lo prepara `P0-05`** (D0-2); **T-SEG-07 y T-DB-02 empiezan en `P0-06`** (D0-7).
- **Cada paquete deja el repositorio ejecutable.** No se hace *commit* ni *push* sin que se pida; se propone el mensaje de la ficha.

### 4.1 Estructura común

```text
PAQUETE <ID> — <título>
Objetivo observable: …
Requisitos que satisface: …
Dependencias que deben estar probadas: …
Lee antes: <documentos y apartados concretos>; decisiones <D-nn>.
Alcance exacto: <qué sí> / Fuera de este paquete: <qué no>.
Cambios esperados: <archivos o módulos y responsabilidad>.
Contratos que introduces: … / Contratos que debes conservar: …
Reglas que no puedes romper: <invariantes INV-nn>.
Pruebas que debes escribir y hacer pasar: <T-...>.
Verificación: <comandos>.
Terminas cuando: <criterio de finalización>.
Si quedas a medias: <cómo dejar el repositorio>.
```

### 4.2 Fase 0 — Base ejecutable (`P0-01`, `P0-03`, `P0-04`, `P0-02`, `P0-05`, `P0-06`)

#### Prompt de `P0-01`

```text
PAQUETE P0-01 — Repositorio, proyecto Next.js y convenciones
Ficha: 10 §5, P0-01 (tareas, riesgos y traspaso). Prompt maestro: 11 §2 (no se repite).
Objetivo observable: un proyecto Next.js 16.4 con TypeScript en la raíz del repositorio que compila y pasa el análisis desde un clon limpio, con las convenciones de carpetas y de dependencias de 02 §3 y §4, README.md y ESTADO-IMPLEMENTACION.md iniciales.
Requisitos que satisface: RO-04 (parte: dependencias bloqueadas y scripts de análisis y compilación), RO-10 (Git desde la fase 0), RE-06 (README inicial).
Dependencias que deben estar probadas: ninguna. Prerrequisitos del entorno: Node >= 24.12, npm 11 y git (compruébalo y anótalo). El repositorio ya contiene docs/ y PLAN.md; NO los borres ni los muevas.
Lee antes: la ficha P0-01; 02 §3 (árbol y notas de create-next-app), §4 (reglas de dependencia), §5 (versiones) y §6 (ajustes de Next); 09 §1 y §4; 00 §8.1 (D-03, D-08); 01 (RO-04, RO-10, RE-06); 11 §3 y §5.
Alcance exacto: crear el proyecto con src/ y Cache Components DESACTIVADO (create-next-app propone lo contrario; D-03); next.config.ts (cacheComponents false, poweredByHeader false, typedRoutes true); alias @/ -> src/; ESLint con no-restricted-imports para las reglas 1 y 2 de 02 §4; scripts lint, typecheck y build; .gitignore (excluye .env* salvo ejemplos, backups/, *.dump, src/generated/), .nvmrc, .editorconfig (end_of_line = lf, propuesta); estructura vacía de src/modules, src/shared, src/ui, tests/ y docs/evidencias/; src/app/layout.tsx y page.tsx mínimos; README.md (requisitos y los pasos de 09 §2 marcados como PREVISTOS) y ESTADO-IMPLEMENTACION.md con el formato de 11 §5.
Fuera de este paquete: servidor propio y Socket.IO (P0-02), Docker, Prisma y base (P0-03), env.ts, errores, registros y Vitest (P0-04), Playwright y CI (P0-05), cuentas (P0-06). No instales dependencias de otros paquetes.
Cambios esperados: package.json y package-lock.json (versiones de 02 §5; engines), tsconfig.json, eslint.config.mjs, next.config.ts, .gitignore, .nvmrc, .editorconfig, README.md, ESTADO-IMPLEMENTACION.md y los archivos mínimos de src/.
Contratos que introduces: alias @/, estructura de carpetas de 02 §3, reglas de dependencia y los scripts lint, typecheck y build. Contratos que debes conservar: ninguno previo.
Reglas que no puedes romper: ningún secreto en el repositorio (comprueba .gitignore antes de cualquier commit); TypeScript 5.9.3 (no 7.x); no uses "next lint" (se ejecuta eslint); no declares verificado lo que no ejecutaste.
Pruebas que debes escribir y hacer pasar: ninguna T- (el catálogo indica "compilación y análisis"). Comprobación puntual: una importación prohibida de prueba es rechazada por ESLint (se elimina después).
Verificación (comandos PREVISTOS, no probados): node --version; npm --version; npm ci; npm run lint; npm run typecheck; npm run build; git status.
Evidencia: salida literal de esos comandos en docs/evidencias/P0-01/, informe de 11 §3 y actualización de ESTADO-IMPLEMENTACION.md. Distingue en el informe los comandos que ejecutaste de los previstos que no.
Decisiones y comprobaciones que te afectan: D0-6 (API real de ESLint 10 y Tailwind 4.3: consulta la documentación de la versión instalada), D0-11 (remoto y autoría de los commits: no asumas acceso ni hagas push).
Terminas cuando: npm ci, lint, typecheck y build terminan sin error desde un clon limpio, git status no muestra secretos ni archivos ignorables, README y ESTADO-IMPLEMENTACION existen y no afirman nada no ejecutado, y el informe está entregado.
Si quedas a medias: el paquete solo crea archivos; deja el repositorio compilable o revierte tus cambios (git restore de los archivos del paquete); no toques docs/planificacion salvo por una decisión cambiada, que registras.
```

#### Prompt de `P0-03`

```text
PAQUETE P0-03 — PostgreSQL, Prisma 7, roles de base y Mailpit
Ficha: 10 §5, P0-03. Prompt maestro: 11 §2.
Objetivo observable: PostgreSQL 18 y Mailpit levantan con Docker Compose; existen los roles tc_migrator y tc_app con privilegios mínimos y las bases turismo_dev, turismo_test, turismo_e2e y turismo_perf; Prisma 7.10.1 (exacta) queda configurado con el adaptador pg; existen el cliente único y withTx con lock_timeout.
Requisitos que satisface: RO-03, RO-08 (bandeja SMTP; se completa con T-CTA-18 en P1-05), RS-24.
Dependencias que deben estar probadas: P0-01. Prerrequisito del entorno: Docker 28.x o compatible en marcha.
Lee antes: la ficha P0-03; 02 §5.2 (Prisma exacta; "latest" es 8.0 RC), §9 (Prisma no carga .env) y §11; 03 §8.5, §9.1 y §9.4; 04 §5 (SET LOCAL y adaptador pg); 09 §2, §3 (DATABASE_URL, MIGRATION_DATABASE_URL, DB_POOL_MAX, DB_LOCK_TIMEOUT_MS) y §5.
Alcance exacto: docker-compose.yml (db: postgres:18 con volumen con nombre, comprobación pg_isready y puerto solo en localhost; mail: axllent/mailpit:v1.33, SMTP 1025 e interfaz 8025); prisma/sql/00-roles.sql (roles, contraseñas ficticias locales y las cuatro bases; tc_app sin DDL ni CREATE en public ni SET ROLE a tc_migrator); prisma y @prisma/client y @prisma/adapter-pg 7.10.1 EXACTOS (sin ^) y pg; prisma.config.ts (carga dotenv/config; URL de migración con tc_migrator); prisma/schema.prisma SOLO con generator y datasource (sin modelos); src/shared/db/prisma.ts (instancia única en globalThis.__tcPrisma) y src/shared/db/tx.ts (withTx: READ COMMITTED, SET LOCAL lock_timeout como primera sentencia, defecto DB_LOCK_TIMEOUT_MS = 5000 y opts.lockTimeoutMs); scripts db:up, db:down, db:generate, db:migrate y db:migrate:deploy.
Fuera de este paquete: validación completa del entorno con Zod (P0-04; aquí lee las variables de forma mínima y déjalo anotado), servidor y /api/salud (P0-02), arnés, db:test:prepare y db:reset (P0-05), cualquier tabla de negocio y la semilla (P0-06). T-SEG-07 y T-DB-02 NO se asignan aquí (D0-7).
Cambios esperados: docker-compose.yml, prisma/sql/00-roles.sql, prisma.config.ts, prisma/schema.prisma, src/shared/db/{prisma,tx}.ts, ajustes de package.json y de .gitignore/.env.example si procede.
Contratos que introduces: roles y nombres de base, withTx(opts), variables DATABASE_URL, MIGRATION_DATABASE_URL, DB_POOL_MAX y DB_LOCK_TIMEOUT_MS, SMTP de Mailpit. Contratos que debes conservar: scripts y convenciones de P0-01.
Reglas que no puedes romper: ningún secreto real (contraseñas ficticias solo locales); Prisma 7.10.1 exacta; tc_app no ejecuta DDL; MIGRATION_DATABASE_URL no entra en el entorno de la aplicación en producción (06 A-43); no ejecutes docker compose down -v ni borres volúmenes sin autorización explícita.
Pruebas que debes escribir y hacer pasar: ninguna T- automatizada (no hay tablas ni arnés). Comprobaciones MANUALES: tc_app rechaza CREATE TABLE y SET ROLE tc_migrator mientras tc_migrator puede crear; withTx aplica el lock_timeout (prueba de humo); Mailpit acepta un correo de prueba.
Verificación (comandos PREVISTOS, no probados): docker compose config; npm run db:up; docker compose ps; docker compose exec db psql -U tc_app -d turismo_dev -c "CREATE TABLE x()" (debe fallar); npm run db:generate; npm run lint; npm run typecheck; npm run build.
Evidencia: salidas literales y el listado de roles y privilegios en docs/evidencias/P0-03/; informe de 11 §3.
Decisiones y comprobaciones que te afectan: D0-8 (si tc_migrator tiene CREATEDB o puede DROP/CREATE DATABASE; privilegios de 00-roles.sql frente a 03 §8.5; createdb con el rol administrador), D0-15 (opciones del pool de PrismaPg; SET LOCAL y $executeRaw con el adaptador pg), D0-6. Todo lo no confirmado se registra como verificación pendiente.
Terminas cuando: los servicios levantan, las comprobaciones manuales pasan y están registradas, db:generate funciona, el cliente y withTx existen, y el informe indica qué quedó para P0-06 (T-SEG-07 y T-DB-02) y las versiones reales instaladas.
Si quedas a medias: deja el compose y la configuración consistentes o revierte los archivos del paquete; el volumen local solo se recrea con autorización.
```

#### Prompt de `P0-04`

```text
PAQUETE P0-04 — Núcleo compartido: entorno, errores, registros, reloj, dinero y fechas
Ficha: 10 §5, P0-04. Prompt maestro: 11 §2.
Objetivo observable: utilidades transversales sin dependencias de módulos: env validado al importar, AppError con el catálogo de códigos, registros pino con redacción, Clock inyectable, dinero en centavos, fechas en UTC con presentación "hora de Ecuador" y edad; Vitest 5 con configuración MÍNIMA y la primera prueba (T-SEG-08a).
Requisitos que satisface: RS-20, RS-23, RO-06, RA-01 y RO-04 (.env.example).
Dependencias que deben estar probadas: P0-01. (Con el orden P0-01, P0-03, P0-04, P0-02, ya existe P0-03: conecta withTx y el cliente de base a env sustituyendo cualquier lectura directa de process.env, con un cambio mínimo que registras.)
Lee antes: la ficha P0-04; 02 §9 (reglas de entorno), §10.1 a §10.3 (errores, códigos y registros) y §11 (reloj); 03 §3.0 (reglas 4 y 5: puntos de código y NFC); 09 §3 y §3.4 (variables y DB_LOCK_TIMEOUT_MS); 08 §3.7 (T-SEG-05, T-SEG-08); 01 (RS-20, RS-23, RO-06, RA-01).
Alcance exacto: src/shared/config/env.ts (Zod 4; falla al importar; nombra la variable inválida SIN su valor; reglas cruzadas de 02 §9; ninguna NEXT_PUBLIC_*; DB_LOCK_TIMEOUT_MS entero con defecto 5000, rango 100 a 30 000 como PROPUESTA); src/shared/errors (AppError, ErrorCode con todos los códigos de 02 §10.2 y su estado HTTP, ActionResult); src/shared/logging (pino JSON, campos fijos y lista de redacción de 02 §10.3); src/shared/http/request-id.ts; src/shared/time (Clock inyectable y monótono con reloj falso, zona America/Guayaquil, edad); src/shared/money (centavos y texto USD, sin coma flotante); src/shared/validation (longitud en puntos de código y NFC); .env.example y .env.test.example con los borradores de 09 §3.2 y §3.3; Vitest 5 mínimo (proyecto unit, alias @/, scripts test y test:unit) y vitest.config.ts.
Fuera de este paquete: shared/security (HMAC en P1-01; token y comparación en P1-02; D0-9), servidor y /api/salud (P0-02), proyectos de integración y concurrencia, Playwright y CI (P0-05), flujos completos de T-SEG-05 y T-SEG-08b/08c (se completan cuando existan flujos y páginas).
Cambios esperados: los archivos anteriores, vitest.config.ts, scripts test y test:unit, tests/unit/ con las pruebas.
Contratos que introduces: env, AppError/ErrorCode/ActionResult, logger, Clock, utilidades de dinero y fechas, archivos de ejemplo de entorno. Contratos que debes conservar: scripts y utilidades de P0-01 y P0-03.
Reglas que no puedes romper: nunca escribas el valor de un secreto; los módulos con secretos importan server-only; los instantes en UTC e importes en centavos enteros (RO-06); producción exige paypal, https://, llavero y Argon2 mínimo (02 §9).
Pruebas que debes escribir y hacer pasar: T-SEG-08a (cada regla de 02 §9 impide el arranque y el mensaje nombra la variable y no su valor; es la PRIMERA prueba y fija el prerrequisito de Vitest), T-SEG-05c (el arranque con secretos centinela no los escribe) y la prueba unitaria de redacción de 02 §10.3, más las tablas unitarias de dinero, fechas, edad y longitud.
Verificación (comandos PREVISTOS, no probados): npm run lint; npm run typecheck; npm run test:unit; npm run build.
Evidencia: informe de test:unit y la salida del arranque con variables inválidas en docs/evidencias/P0-04/; informe de 11 §3 con los códigos de error definidos y los subcasos de T-SEG-05 y T-SEG-08 que quedan abiertos.
Decisiones y comprobaciones que te afectan: D0-6 (API real de Zod 4.6, pino 10 y Vitest 5), D0-10 (DB_LOCK_TIMEOUT_MS aún no figura en 02 §9 y §11: impleméntala según 09 §3.4 y regístralo como alineación pendiente, sin editar 02).
Terminas cuando: las pruebas unitarias pasan, env.ts rechaza cada configuración inválida sin imprimir valores, los archivos de ejemplo existen, Vitest mínimo funciona con el alias @/ y el informe lo documenta.
Si quedas a medias: deja el paquete compilable; las utilidades no usadas por nadie no rompen otros paquetes; no dejes pruebas fallando.
```

#### Prompt de `P0-02`

```text
PAQUETE P0-02 — Servidor propio HTTP + Socket.IO + puente de runtime
Ficha: 10 §5, P0-02. Prompt maestro: 11 §2.
Objetivo observable: un único server.ts sirve Next.js y Socket.IO en el mismo puerto, expone GET /api/salud, fija cabeceras propias, registra el acceso y se apaga de forma ordenada; el puente registerRuntime/getRuntime queda disponible.
Requisitos que satisface: RO-02 y RO-09 (parte: salud y apagado ordenado).
Dependencias que deben estar probadas: P0-01, P0-03 y P0-04 (D0-1: el esqueleto importa env y logger y /api/salud hace SELECT 1). Prerrequisito: la base local en marcha (npm run db:up). Para T-OPS-03 necesitas Linux o WSL (en Windows SIGTERM no es representativo).
Lee antes: la ficha P0-02; 02 §2, §7.1 a §7.5, §10.3 (registro de acceso) y §11.3; 05 §4 (/api/salud); 08 §3.7 (T-OPS-01 a 03); 09 §4 y §6.2; 00 (D-05, D-08).
Alcance exacto: server.ts (hostname, port y httpServer pasados a next()); src/shared/http/prepare-request.ts (elimina x-request-id y x-tc-client-ip entrantes y los fija con valores propios antes de handle); registro de acceso con ruta SIN cadena de consulta y sin cuerpos, cookies ni Authorization; src/realtime/gateway.ts mínimo en /socket.io/ (handshake PROVISIONAL, D0-3: déjalo marcado y no lo expongas en producción); src/shared/runtime/registry.ts (registerRuntime y getRuntime con implementación nula, interfaz RealtimePort de 02 §7.2); src/jobs/scheduler.ts sin trabajos (respeta JOBS_ENABLED); apagado ordenado (503 en /api/salud, detener trabajos <= 5 s, io.close, httpServer.close, límite total 20 s, salida 0); src/app/api/salud/route.ts (SELECT 1 con límite de 2 s; 200 {"status":"ok"} o 503 sin datos internos); scripts/build-server.mjs (esbuild: ESM, platform=node, alias @/, dependencias externas) y los scripts dev, build (con prisma generate) y start.
Fuera de este paquete: Vitest de integración, Playwright y CI (P0-05: aquí T-OPS-01 a 03 son MANUALES), autenticación del gateway y cierre por sesión (P6-01), trabajos reales, proxy.ts y CSP (P1-06).
Cambios esperados: server.ts, scripts/build-server.mjs, los módulos de src/shared/http, src/shared/runtime, src/realtime, src/jobs, el módulo de apagado y src/app/api/salud/route.ts; socket.io y socket.io-client 4.8.x (misma versión).
Contratos que introduces: GET /api/salud (05 §4), RealtimePort, las cabeceras internas y los scripts dev y start. Contratos que debes conservar: lint, typecheck y build de P0-01; env, logger y withTx.
Reglas que no puedes romper: nadie fuera del servidor propio fija x-request-id ni la IP de confianza; el mismo server.ts en desarrollo y producción; el puente es una optimización, no una garantía (02 §7.2); no declares verificado lo que no ejecutaste.
Pruebas que debes escribir y hacer pasar: ninguna automatizada de integración (llegan en P0-05). Comprobaciones MANUALES: T-OPS-01 (HTTP y un cliente Socket.IO en el mismo puerto; /api/salud 200), T-OPS-02a (200 sin sesión ni datos internos), T-OPS-02b (503 en menos de 2 s al detener la base y 200 al volver) y T-OPS-03 (SIGTERM con una petición retenida: termina, sockets cerrados, código 0) SOLO en Linux o WSL. Si añades una prueba unitaria (p. ej. de prepareRequest) usa el Vitest mínimo de P0-04.
Verificación (comandos PREVISTOS, no probados): npm run dev; curl http://localhost:3000/api/salud (PowerShell: Invoke-RestMethod); un script corto con socket.io-client contra el mismo puerto; npm run build && npm run start; en Linux o WSL, kill -TERM <pid> con una petición retenida.
Evidencia: salidas de esos comandos y el resultado del humo con recarga en caliente en docs/evidencias/P0-02/; informe de 11 §3 con qué comprobaciones quedan por automatizar en P0-05.
Decisiones y comprobaciones que te afectan: D0-3 (qué acepta el handshake antes de P6-01), D0-4 (convivencia de la recarga en caliente de Next.js con Socket.IO sobre el mismo http.Server: si choca, documenta la alternativa), D0-5 (T-OPS-03 solo en Linux o CI; plazo de gracia por fijar).
Terminas cuando: el servidor arranca en dev y tras build/start, /api/salud responde con la base real, el apagado ordenado funciona (en Linux o WSL) o queda declarado como no verificado, y el informe lista lo manual y lo pendiente de P0-05.
Si quedas a medias: deja server.ts funcional o revierte los archivos del paquete; nunca dejes un handshake sin autenticar marcado como definitivo.
```

#### Prompt de `P0-05`

```text
PAQUETE P0-05 — Arnés de pruebas (Vitest, barrera, Playwright) y CI
Ficha: 10 §5, P0-05. Prompt maestro: 11 §2.
Objetivo observable: infraestructura de pruebas y flujo de CI de 08 §1, §2 y §6: proyectos de Vitest (unitario, integración y concurrencia), ayudantes de pruebas con la barrera por bloqueo de fila y el reloj falso, Playwright sobre el build de producción, utilidades de base con guardas y .github/workflows/ci.yml.
Requisitos que satisface: RE-02, RO-03 (las pruebas se niegan a correr contra una base que no sea de pruebas) y RS-28 (parte: npm audit informativo).
Dependencias que deben estar probadas: P0-02, P0-03 y P0-04 (servidor, base, entorno y reloj). Vitest ya está instalado con configuración MÍNIMA en P0-04: AMPLÍALA, no la rehagas. Aún no hay tablas de negocio.
Lee antes: la ficha P0-05; 08 §1, §2, §6 y §3.7 (T-OPS-04, SEG-D6); 09 §2.3, §5.2 (regla por utilidad) y §5.3; 02 §3 (tests/); 03 §9.4.
Alcance exacto: vitest.config.ts con proyectos unit, integration y concurrency y los scripts test:integration, test:concurrency, test:e2e y test:a11y; playwright.config.ts sobre el build de producción con turismo_e2e, puerto 3100 y PAYMENT_PROVIDER=fake (propuesta de 09 §2.3); tests/helpers (conexion('tc_app'|'tc_migrator'), reloj falso, barrera por bloqueo de fila con espera por pg_stat_activity); utilidades con la regla por utilidad de 09 §5.2: limpieza y semilla de pruebas SOLO en _test, _e2e y _perf, db:reset en turismo_dev y esas tres, solo en local y con --confirm=<nombre>, y siempre sin enviar sentencias cuando se niegan; db:test:prepare idempotente (migra; la semilla base se añade en P0-06); .github/workflows/ci.yml según 08 §6.1 (postgres:18, PAYMENT_PROVIDER=fake, sin credenciales de PayPal, falla ante skip/todo/only, publica informes con if: always(), npm audit --omit=dev informativo); automatizar T-OPS-01 y 02 si P0-02 las dejó manuales.
Fuera de este paquete: tablas, migraciones y semilla (P0-06), cualquier prueba de negocio, el adaptador de pagos, la medición de rendimiento.
Cambios esperados: los archivos anteriores y las pruebas de las propias utilidades.
Contratos que introduces: scripts test:*, db:test:prepare, db:reset, los ayudantes de tests/helpers y el flujo de CI. Contratos que debes conservar: los de fases previas.
Reglas que no puedes romper: ninguna utilidad destructiva actúa sobre una base que no sea de pruebas (excepto db:reset sobre turismo_dev en local con confirmación); sin credenciales de PayPal en CI; la barrera nunca usa esperas fijas; no hagas push ni abras la CI en el remoto sin que se pida.
Pruebas que debes escribir y hacer pasar: T-OPS-04 (las utilidades se niegan —código distinto de 0 y sin sentencias— con turismo_dev para limpieza y semilla, turismo, turismo_prod, turismo_test_prod, turismo_demo, turismo_restore, mayúsculas, parámetros en la URL y cambio de variable; db:reset admite turismo_dev; y actúan con _test, _e2e y _perf). La barrera se prueba con una TABLA TEMPORAL creada por la propia prueba. Automatiza T-OPS-01 y 02 si procede.
Verificación (comandos PREVISTOS, no probados): npm run db:test:prepare; npm run test:unit; npm run test:integration; npm run test:concurrency; npm run test:e2e; en CI, el flujo ci.yml.
Evidencia: informes JUnit y de Playwright y, si se ejecutó, el enlace a la ejecución de CI (EV-04) en docs/evidencias/P0-05/; informe de 11 §3 con qué subcasos son automáticos o manuales.
Decisiones y comprobaciones que te afectan: D0-6 (API real de Vitest 5), D0-5 (T-OPS-03 exige Linux o CI), D0-11 (el remoto existe según el equipo: VERIFICA antes de afirmar nada sobre Actions, protección de main o secretos; si no puedes, declara la CI como diseñada y sin ejecutar), D0-12 (paralelismo por esquema: arranca en serie y registra la decisión).
Terminas cuando: los proyectos de Vitest y Playwright corren, T-OPS-04 pasa, las guardas están probadas, el flujo de CI está escrito y (si hay remoto operativo) ejecutado en verde, y el informe distingue lo ejecutado de lo previsto.
Si quedas a medias: el paquete añade configuración; deja los scripts existentes funcionando; no dejes pruebas ni CI en rojo sin explicarlo.
```

#### Prompt de `P0-06`

```text
PAQUETE P0-06 — Modelo de cuentas, hash de contraseñas y semilla base
Ficha: 10 §5, P0-06. Prompt maestro: 11 §2.
Objetivo observable: la migración M1 con User, RoleAssignment, Gad y Attraction (enums Role y Province), el hash Argon2id y la semilla base (2 GAD, 2 atracciones y 8 cuentas @demo.test), con db:seed y db:test:prepare completos.
Requisitos que satisface: RF-06 (roles y vínculos por semilla) y RS-01 (Argon2id con sal).
Dependencias que deben estar probadas: P0-03, P0-04 y P0-05 (base y roles, entorno validado, arnés y utilidades protegidas).
Lee antes: la ficha P0-06; 03 §3.0 (enumeraciones y reglas), §3.1 (las cuatro entidades), §8.3 y §8.5, §9.1 (M1), §9.2, §9.3 (semilla base) y §10.2; 02 §5.2 (argon2) y §6 (serverExternalPackages); 09 §3 (ARGON2_*, SEED_DEMO_PASSWORD) y §4; 08 (T-CTA-20, T-DB-01, T-DB-02, T-SEG-07); 06 A-47.
Alcance exacto: prisma/schema.prisma (Role, Province y los cuatro modelos con onDelete y onUpdate explícitos); migración <marca>_p0_06_cuentas con prisma migrate dev --create-only y SQL manual bajo "-- MANUAL (no modelado por Prisma)": ck_user_email, ck_user_displayname, ck_user_passwordhash, ck_gad_name, ck_attraction_name, ck_roleassignment_scope, el índice ux_roleassignment_scope con NULLS NOT DISTINCT (Prisma no lo expresa) y los GRANT de 03 §8.5 (User: S,I,U; RoleAssignment: S,I; Gad y Attraction: S); comprobación de deriva (una segunda migrate dev no propone cambios; sonda con prisma migrate diff); src/modules/accounts/infra/password.ts (hashPassword y verifyPassword, Argon2id con ARGON2_*); prisma/seed/index.ts y accounts.ts (seedUuid, seedBase({ now }), RoleAssignment por búsqueda previa u ON CONFLICT DO NOTHING, nunca upsert; se ejecuta con MIGRATION_DATABASE_URL; se niega sin SEED_DEMO_PASSWORD válido); script db:seed; db:test:prepare con la semilla base; comprobación de serverExternalPackages para argon2, pino y el cliente Prisma.
Fuera de este paquete: AuditEvent y sesiones (P1-01, P1-02), registro y ingreso (P1-02, P1-03), ofertas y su semilla (P2-01), semilla de demostración (PE-04).
Cambios esperados: schema.prisma, la migración M1, password.ts, prisma/seed/, scripts, ajustes de db:test:prepare y de next.config.ts si hace falta.
Contratos que introduces: M1, Role y Province, hashPassword/verifyPassword y db:seed. Contratos que debes conservar: los de P0-01 a P0-05.
Reglas que no puedes romper: una migración aplicada no se edita (un error se corrige con otra); passwordHash nunca se registra ni se devuelve; "User" va entre comillas dobles en el SQL manual; la semilla es incremental y no destructiva (crea lo que falta y no modifica lo existente); sin secretos en el repositorio.
Pruebas que debes escribir y hacer pasar (T-SEG-07 y T-DB-02 EMPIEZAN aquí, D0-7): T-CTA-20 (cuentas de los cuatro roles con sus alcances); T-DB-01 en los subcasos de 03 §8.7 que afectan a M1 y su repetición tras una segunda migrate; T-DB-02 en su alcance de esta fase (migrar desde cero con M1, semilla base dos veces sin cambios ni duplicados, tc_app no puede ejecutarla); T-SEG-07 (07a: DDL y privilegios de las tablas de M1; 07d: el pool de la aplicación usa tc_app). Se amplían en paquetes posteriores.
Verificación (comandos PREVISTOS, no probados): npx prisma validate; npx prisma migrate dev --create-only --name p0_06_cuentas; npm run db:migrate; npm run db:generate; npm run db:seed (dos veces); npm run db:test:prepare; npm run test:integration.
Evidencia: salida de migrate, de la sonda de deriva, de las dos semillas y los recuentos en docs/evidencias/P0-06/; informe de 11 §3 con la sintaxis real de Prisma 7 que usaste y los subcasos de T-DB-01 que quedan.
Decisiones y comprobaciones que te afectan: D0-13 (si la semilla se niega en APP_ENV=production, 06 A-47), D0-14 (deriva de ux_roleassignment_scope y objetos manuales, prisma validate, sintaxis de migrate diff, argon2 en Windows y serverExternalPackages). Lo no confirmado se registra como verificación pendiente.
Terminas cuando: M1 se aplica desde cero, la segunda migrate no propone cambios, las pruebas de T-CTA-20, T-DB-01 (M1), T-DB-02 y T-SEG-07 (07a y 07d) pasan, la semilla es repetible, y el informe habilita la fase 1 (P1-01).
Si quedas a medias: no edites una migración aplicada; si la migración quedó a medias en local, recrea la base con db:reset SOLO con autorización; deja la semilla desactivada si falla.
```

### 4.3 Fase 1 — Cuentas, sesión y panel (`P1-01` a `P1-06`)

**Reglas de la fase 1 (valen para los seis prompts, no se repiten en cada uno).**
- **Orden:** `P1-01`, `P1-02`, `P1-03`, `P1-04`, `P1-05`, `P1-06` (el de las dependencias de [10 §4](10-fases-y-paquetes-implementables.md)). `P1-06` solo depende de `P1-02` y podría adelantarse, pero se recomienda al final para recorrer también `/restablecer`.
- **Prerrequisito de toda la fase:** la fase 0 cerrada y probada (`P0-06`: migración M1 aplicada, semilla base, arnés con `test:integration`, `test:concurrency` y `test:e2e`, `db:test:prepare` y utilidades protegidas).
- **Condición que se conserva (R de `P1-02`):** **hasta cerrar `P1-04` no se expone el inicio de sesión públicamente**: nada de despliegue público (`PE-02` puede adelantarse tras la fase 1, no antes de `P1-04`) ni de URL alcanzable desde fuera con `/ingreso` o `/registro` abiertos. Hasta entonces el ingreso **no tiene límite de intentos**.
- **J4 (purga) queda fuera:** la purga de `Session`, `PasswordResetToken` y `LoginThrottle` **no es de ningún paquete de esta fase**; sigue como **propuesta `P3-04` fuera del catálogo** (10 §5, fase 2, y D1-7). No la implementes ni la insinúes.
- **Cada migración** (M2 a M5) lleva sus `CHECK`, índices y `GRANT` como SQL manual; la ejecución de `T-DB-01` sobre sus objetos se propone en cada paquete (D1-2). El SQL de 03 §8 **no está ejecutado**: lo no confirmado se registra como verificación pendiente (D1-13).
- **Pruebas:** cada prompt separa «**se comprueban al cerrar**» de «**dependen de otro paquete posterior**». Comandos **previstos, ninguno probado**; el informe de §3 distingue lo ejecutado.

#### Prompt de `P1-01`

```text
PAQUETE P1-01 — Auditoría base
Ficha: 10 §5, P1-01. Prompt maestro: 11 §2.
Objetivo observable: AuditEvent existe como tabla de solo inserción para la aplicación y un servicio recordAudit escribe eventos con la lista cerrada de claves de metadata.
Requisitos que satisface: RF-38 (base), RS-20.
Dependencias que deben estar probadas: P0-06 (M1 aplicada, semilla base, arnés) y P0-04 (Clock, env con RATE_LIMIT_SECRET, errores y registros).
Lee antes: la ficha P1-01; 03 §3.4 (AuditEvent, §3.4.1 reglas de escritura, §3.4.2 catálogo y lista cerrada), §8.3 (ck_audit_*), §8.5 (solo S e I), §9.1 (M2); 02 §10.3; 06 §2 (A-43) y §4.6; 08 §3.7 (T-SEG-11, T-SEG-07, SEG-D4 y SEG-D5).
Alcance exacto: migración <marca>_p1_01_auditoria (M2) con AuditActorType, AuditResult y AuditEvent, ck_audit_actor y demás ck_audit_*, los cuatro índices y GRANT SELECT, INSERT a tc_app SIN UPDATE, DELETE ni TRUNCATE; src/modules/audit (domain/actions.ts con el catálogo COMPLETO de 03 §3.4.2 como constantes tipadas y las claves permitidas por acción; application/record-audit.ts; index.ts); src/shared/security/hmac.ts (ipHash: HMAC-SHA-256 con RATE_LIMIT_SECRET truncado a 32 hexadecimales, nunca la IP); src/shared/http/request-context.ts (RequestContext con requestId e ip). recordAudit descarta toda clave fuera de la lista cerrada, fija occurredAt con clock.now(), inserta el éxito EN LA MISMA transacción (si falla, aborta la operación) y escribe rechazos, conflictos y fallos APARTE tras revertir (un fallo al auditarlos solo se registra).
Fuera de este paquete: las acciones concretas que auditarán los flujos (cada paquete posterior), account.anonymize y su utilidad (06 §4; no existe en el catálogo), la vista de auditoría (PE-05, opcional), audit.read, la purga.
Cambios esperados: schema.prisma, migración M2, módulo audit, hmac.ts, request-context.ts y las pruebas.
Contratos que introduces: recordAudit, el catálogo de acciones, RequestContext y shared/security/hmac (D0-9 resuelta: el HMAC nace aquí). Contratos que debes conservar: withTx, Clock, el registro con redacción y las utilidades de base de P0-05.
Reglas que no puedes romper: la protección de solo inserción es de PRIVILEGIOS (tc_app sin UPDATE, DELETE ni TRUNCATE); nunca correo, nombre, texto libre, token, QR ni identificadores de pasarela en metadata; una migración aplicada no se edita.
Pruebas por ID. Se comprueban al cerrar: T-SEG-11 en lo que ya existe (11a: extraer las cadenas action del código y compararlas con el catálogo; 11c: fallo del INSERT en un éxito aborta y en un rechazo no cambia la respuesta; unitaria del selector de claves); T-SEG-07 sobre AuditEvent (07a: tc_app no puede UPDATE, DELETE ni TRUNCATE y sí INSERT y SELECT; 07b: caracterización de tc_migrator, que se DOCUMENTA y no se afirma impedido, A-43; 07e: búsqueda estática de auditEvent.update y deleteMany); T-DB-01 sobre ck_audit_* (propuesta D1-2); T-DB-02 repetible con M2. Dependen de paquetes posteriores: T-SEG-11b (una fila por acción del catálogo) se completa cuando exista cada flujo; 07c llega con PE-02.
Verificación (comandos PREVISTOS, no probados): npx prisma validate; npm run db:migrate; npm run db:generate; npm run db:test:prepare; npm run test:unit; npm run test:integration.
Evidencia: salida de migrate, de T-SEG-07 y de la comparación 11a en docs/evidencias/P1-01/; informe de 11 §3.
Decisiones que te afectan: D1-2, D1-13 (SQL no ejecutado), D1-12 (APIs al usarlas).
Terminas cuando: M2 se aplica, las pruebas de «al cerrar» pasan, no existe ninguna ruta de UPDATE o DELETE sobre AuditEvent para tc_app, el informe lista qué subcasos de T-SEG-11 quedan y habilita P1-02.
Si quedas a medias: no edites una migración aplicada; en local, db:reset solo con autorización; no dejes pruebas en rojo.
```

#### Prompt de `P1-02`

```text
PAQUETE P1-02 — Sesiones, ingreso, cierre, principal y panel protegido
Ficha: 10 §5, P1-02. Prompt maestro: 11 §2.
Objetivo observable: una persona sembrada inicia y cierra sesión, el servidor resuelve su principal en cada petición y /panel está protegido en cada página.
Requisitos que satisface: RF-02, RF-03, RF-05, RS-02, RS-06, RS-07.
Dependencias que deben estar probadas: P1-01 (recordAudit, RequestContext, hmac), P0-06 (cuentas y hash), P0-04 (Clock, errores) y P0-02 (puente de runtime).
CONDICIÓN: este paquete deja el ingreso SIN límite de intentos hasta P1-04. NO expongas ni despliegues el inicio de sesión públicamente hasta cerrar P1-04.
Lee antes: la ficha P1-02; 02 §7.2 y §8; 03 §3.1 (Session) y §9.1 (M3); 04 TX-14; 05 §1, §2 (regla safeNext), §3 (envoltorio action) y §3.2 (loginAction, logoutAction); 06 §3.1 y §3.3; 08 §3.1 (T-CTA-04, 05, 08, 09, 15, 16, 19) y §3.7 (T-SEG-01, 12).
Alcance exacto: migración M3 (p1_02_sesiones) con SessionRevokeReason y Session, ck_session_tokenhash, ck_session_times, ck_session_revoke y GRANT S,I,U,D; src/shared/security/token.ts (token de 32 bytes, SHA-256 y comparación en tiempo constante); src/shared/http/action.ts y origin.ts (envoltorio: Origin exacto -> principal -> Zod -> servicio -> traducción de AppError; ORIGIN_MISMATCH y auditoría security.origin_mismatch); src/modules/accounts (Principal con la unión de asignaciones, login, logout, getPrincipal con cache() de React, requirePrincipal, repositorio de sesiones, safeNext con las cinco comprobaciones); login según TX-14 (verificación Argon2 FICTICIA si el correo no existe; transacción con User FOR KEY SHARE, nueva comprobación de passwordChangedAt y Session con expiresAt = now + 8 h con now tras el bloqueo; auditoría session.login; rehash si los parámetros guardados son inferiores); cookie HttpOnly, SameSite=Lax, Path=/, sin Domain (tc_session en local y __Host-tc_session con Secure en despliegue; regla de selección propuesta D1-3); logout idempotente con getRuntime().realtime.disconnectSession; /ingreso con marcado SIMPLE (D1-4) y /panel con los accesos de las asignaciones, protegidos en CADA página y no en el layout (02 §8).
Fuera de este paquete: registro y componentes accesibles (P1-03), límites de intentos (P1-04), recuperación (P1-05), cabeceras, CSP y matriz (P1-06), el cierre real de sockets (P6-01: el puente es nulo hasta entonces), la purga de sesiones (J4: propuesta P3-04 fuera del catálogo).
Cambios esperados: schema.prisma, migración M3, shared/security/token.ts, shared/http/{action,origin}.ts, módulo accounts, páginas /ingreso y /panel, pruebas.
Contratos que introduces: Principal, getPrincipal y requirePrincipal, action(), safeNext, la cookie de sesión, loginAction y logoutAction (05 §3.2) y la ruta /panel. Contratos que debes conservar: /api/salud, recordAudit y el puente de runtime.
Reglas que no puedes romper: sin sesión anónima ni fijación (cada ingreso emite un token nuevo e ignora la cookie presentada); solo el hash del token en base; mensaje único INVALID_CREDENTIALS; ningún secreto en errores ni registros; la autorización se hace en cada página y acción, no en el layout.
Pruebas por ID. Se comprueban al cerrar: T-CTA-04 (cookie y hash), 05 (mismo mensaje y una sola verificación ficticia), 08 (salir revoca), 09 (vence a las 8 h con reloj falso), 15 (token nuevo en cada ingreso), 16 (16a a 16d, safeNext), T-SEG-01 (01a sobre las acciones que ya existen), T-SEG-12 (12a y 12c), T-DB-01 sobre ck_session_* (D1-2). Dependen de paquetes posteriores: T-CTA-19 completo (otras pantallas y acciones desde P2), T-SEG-01a sobre las 23 acciones (se amplía por paquete y se genera de la matriz en P1-06), T-SEG-12b (cookie __Host- con https: PE-02), cierre de sockets (T-CHAT-01, 02, 11 y 12: P6-01), T-CTA-13b (P1-05).
Verificación (comandos PREVISTOS, no probados): npm run db:migrate; npm run test:integration; npm run test:e2e; npm run build.
Evidencia: informes de las pruebas y la lectura real de Set-Cookie en docs/evidencias/P1-02/; informe de 11 §3 con una nota explícita de que el ingreso aún no tiene límites.
Decisiones que te afectan: D1-3 (nombre de la cookie), D1-4 (/ingreso simple y su migración en P1-03), D1-11 (medir el coste real de Argon2), D1-12 (Zod 4 y Vitest 5), D1-13 y D1-2.
Terminas cuando: las pruebas de «al cerrar» pasan, las cookies y la revocación se comprueban, ninguna página privada autoriza vía layout y el informe repite la condición de no exponer el ingreso hasta P1-04.
Si quedas a medias: no edites una migración aplicada; revierte el código del paquete antes de dejar un ingreso a medias accesible.
```

#### Prompt de `P1-03`

```text
PAQUETE P1-03 — Registro público y componentes de formulario accesibles
Ficha: 10 §5, P1-03. Prompt maestro: 11 §2.
Objetivo observable: una persona se registra como TOURIST con errores por campo anunciados y existen componentes de formulario accesibles reutilizables (también /ingreso migra a ellos).
Requisitos que satisface: RF-01, RS-05, RA-03.
Dependencias que deben estar probadas: P1-02 (principal, action(), /ingreso). Sigue vigente: sin límites de intentos hasta P1-04, no expongas el registro ni el ingreso públicamente.
Lee antes: la ficha P1-03; 03 §3.1 (User, RoleAssignment; normalización del correo) y §3.0; 05 §3.1 y §3.2 (registerAction); 06 §3.1 (política de contraseña); 07 (principios de formularios y estados VAL); 08 §3.1 (T-CTA-01 a 03) y §3.7 (T-A11Y-03).
Alcance exacto: correo con recorte -> NFKC -> minúsculas (el CHECK no impone la minúscula) y formato Zod; política de contraseña (10 a 128 caracteres, distinta del correo y lista corta de comunes, cuyo contenido se decide aquí, D1-5); register (INSERT User y RoleAssignment TOURIST en UNA transacción; EMAIL_TAKEN desde la unicidad 23505 como resultado de dominio y no INTERNAL_ERROR; auditoría account.register SUCCESS o CONFLICT; NO inicia sesión); strip de Zod (se ignoran role, gadId y attractionId); /registro y src/ui/forms (campo, resumen de errores con el foco, aria-invalid, aria-describedby, autocomplete correctos, etiquetas y botón de envío); migrar /ingreso a esos componentes.
Fuera de este paquete: límite de registro por IP (P1-04), recuperación (P1-05), cabeceras y CSP (P1-06), verificación de correo (no hay, S-06).
Cambios esperados: módulo accounts (domain, application, infra), páginas, src/ui/forms y pruebas.
Contratos que introduces: registerAction (05 §3.2), /registro, la política de contraseña y los componentes de src/ui/forms. Contratos que debes conservar: los de P1-02.
Reglas que no puedes romper: longitudes en PUNTOS DE CÓDIGO (03 §3.0, no unidades UTF-16); el registro SÍ revela si el correo existe (riesgo aceptado, 06 §3.2); dos registros simultáneos con el mismo correo terminan en EMAIL_TAKEN; ninguna entrada concede rol ni pertenencia.
Pruebas por ID. Se comprueban al cerrar: T-CTA-01 (hash $argon2id$ con sal distinta, una RoleAssignment TOURIST), T-CTA-02 (errores por campo y duplicado con otra capitalización o espacios; sin el subcaso 02c), T-CTA-03 (campos de rol rechazados o ignorados), T-A11Y-03 (foco al resumen y asociación de errores en /registro e /ingreso). Dependen de paquetes posteriores: T-CTA-02c (límite de registro, P1-04), T-A11Y-01, 02, 06 y 07 y las comprobaciones manuales MC y MP de 07 §7.1 (PE-03).
Verificación (comandos PREVISTOS, no probados): npm run test:integration; npm run test:a11y; npm run build; npm run lint.
Evidencia: informes de Vitest y de Playwright en docs/evidencias/P1-03/; informe de 11 §3.
Decisiones que te afectan: D1-5 (lista de contraseñas comunes), D1-12 (API de Zod 4), D1-4.
Terminas cuando: las pruebas de «al cerrar» pasan, /registro e /ingreso usan los componentes accesibles, el registro no inicia sesión y el informe repite que el ingreso sigue sin límites hasta P1-04.
Si quedas a medias: sin migración propia; revierte el código del paquete antes de dejar un registro a medias accesible.
```

#### Prompt de `P1-04`

```text
PAQUETE P1-04 — Límites de intentos y antienumeración
Ficha: 10 §5, P1-04. Prompt maestro: 11 §2.
Objetivo observable: el ingreso y el registro se bloquean temporalmente por cuenta y por origen y las respuestas no permiten distinguir si una cuenta existe. CERRAR ESTE PAQUETE es la condición para poder exponer el inicio de sesión públicamente.
Requisitos que satisface: RS-03.
Dependencias que deben estar probadas: P1-03 (registro y componentes), P1-02 (login), P1-01 (auditoría), RATE_LIMIT_SECRET validado y x-tc-client-ip de P0-02.
Lee antes: la ficha P1-04; 03 §3.1 (LoginThrottle) y §9.1 (M4); 06 §3.2 (umbrales PROPUESTOS); 04 TX-14; 05 §3.2; 08 §3.1 (T-CTA-06, 07) y §3.7 (T-SEG-13, SEG-D3).
Alcance exacto: migración M4 (p1_04_limites) con los CINCO valores de ThrottleScope, LoginThrottle, ck_throttle_keyhash (64 hexadecimales), attempts >= 0, único (scope, keyHash) y GRANT S,I,U,D; src/modules/accounts/infra/throttle.ts (clave = HMAC del correo normalizado o de la IP, nunca el dato en claro; incremento atómico INSERT ... ON CONFLICT DO UPDATE con ventana fija); integración en login y register (ingreso: 5 fallos por cuenta y 20 por IP en 15 min con bloqueo de 15 min; registro: 10 por hora y por IP; umbrales PROPUESTOS); RATE_LIMITED con retryAfterSeconds y el mismo texto exista o no la cuenta; se bloquea AUNQUE la contraseña sea correcta; el contador se reinicia al llegar a blockedUntil; auditoría session.login DENIED con scope e ipHash, sin correo. Los ámbitos de recuperación (RECOVERY_*) se definen en el enum pero los usa P1-05.
Fuera de este paquete: la recuperación y sus límites (P1-05), cabeceras (P1-06), la purga de LoginThrottle (J4: propuesta P3-04 fuera del catálogo; NO la implementes; las filas se purgarán después).
Cambios esperados: schema.prisma, migración M4, throttle.ts, ajustes de login y register, pruebas.
Contratos que introduces: el servicio de límites y el uso de RATE_LIMITED con retryAfterSeconds. Contratos que debes conservar: loginAction y registerAction con el mismo contrato de errores.
Reglas que no puedes romper: el límite por cuenta no bloquea a la IP y viceversa (A-02); respuestas indistinguibles con una sola verificación Argon2 por caso; nunca el correo ni la IP en claro en LoginThrottle ni en la auditoría.
Pruebas por ID. Se comprueban al cerrar: T-CTA-06 (límite por cuenta con reloj falso: el 6.º bloqueado aunque la contraseña sea correcta; liberación en blockedUntil), T-CTA-07 (límite por IP), T-SEG-13 (13a ingreso y 13c registro duplicado), T-CTA-02c (límite de registro por IP, que quedó pendiente de P1-03), T-DB-01 sobre ck_throttle_* (D1-2). Dependen de paquetes posteriores: T-SEG-13b y T-CTA-17 (recuperación, P1-05); la comparación de tiempos es solo indicativa (margen por definir, 08 §3.7.3).
Verificación (comandos PREVISTOS, no probados): npm run db:migrate; npm run test:integration; npm run test:e2e; npm run build.
Evidencia: informes y filas de LoginThrottle sin datos personales en docs/evidencias/P1-04/; informe de 11 §3 que indica expresamente si ya se cumple la condición para exponer el ingreso (con la nota de que el despliegue sigue sujeto al alojamiento, Q-04).
Decisiones que te afectan: D1-6 (respuesta exacta del 5.º fallo, qué cuenta como intento y si un ingreso correcto reinicia el contador: deja registrado lo que elijas), D1-7 (J4 sin paquete: no la hagas), D1-10 (margen de la comparación de tiempos), D1-13, D1-2.
Terminas cuando: las pruebas de «al cerrar» pasan, ningún dato en claro aparece en LoginThrottle ni en la auditoría, y el informe declara que P1-04 está cerrado y habilita P1-05 y, con Q-04, un despliegue.
Si quedas a medias: no edites una migración aplicada; vaciar LoginThrottle solo en pruebas; no marques cerrado el paquete si el ingreso sigue sin límites.
```

#### Prompt de `P1-05`

```text
PAQUETE P1-05 — Recuperación y restablecimiento de contraseña
Ficha: 10 §5, P1-05. Prompt maestro: 11 §2.
Objetivo observable: una persona recupera su contraseña por un enlace de correo de UN SOLO USO y 30 minutos; al restablecerla se revocan TODAS sus sesiones y se cierran sus sockets.
Requisitos que satisface: RF-04, RS-04, RO-08.
Dependencias que deben estar probadas: P1-04 (límites y ámbitos RECOVERY_*), P1-02 (sesiones y puente de runtime), P1-01, y Mailpit (P0-03).
Lee antes: la ficha P1-05; 03 §3.1 (PasswordResetToken, corrección H-28) y §9.1 (M5); 04 TX-13 y TX-14; 05 §2 y §3.2; 06 §3.1 y §3.2; 02 §11 (correo tras confirmar); 08 §3.1 (T-CTA-10 a 14, 17, 18) y §3.7 (T-SEG-13b).
Alcance exacto: migración M5 (p1_05_recuperacion) con userId ÚNICO, tokenHash único, ck_prt_tokenhash, ck_prt_times y GRANT S,I,U,D; src/modules/accounts/infra/mailer.ts (puerto Mailer, adaptador nodemailer y adaptador en memoria para las pruebas); request-password-reset: respuesta y tiempo uniformes, límites de 3 por hora y por cuenta y de 10 por hora y por IP, INSERT ... ON CONFLICT (userId) DO UPDATE (el último enlace sustituye al anterior), token de 32 bytes con hash SHA-256, correo enviado DESPUÉS del COMMIT con el enlace construido con APP_ORIGIN (nunca con Host); reset-password según TX-13: hash Argon2 ANTES de la transacción, orden User -> PasswordResetToken -> Session, UPDATE condicional del token (usedAt IS NULL AND expiresAt > now: CONSUMO ÚNICO), cambio de contraseña y passwordChangedAt, REVOCACIÓN de TODAS las sesiones del usuario con SessionRevokeReason PASSWORD_RESET en la MISMA transacción y auditoría password.reset con sessionsRevoked; tras el COMMIT, cierre de sockets por el puente de runtime (RealtimePort.disconnectUser de 02 §7.2; el nombre frente a disconnectSessions de 04 TX-13 es D6-9, abierto) y correo de aviso; NO inicia sesión; el token va en un campo oculto y la página /restablecer NO lo consume con GET; /recuperar y /restablecer.
Fuera de este paquete: el cierre real de sockets (P6-01: el puente es nulo hasta entonces; aquí solo se invoca), cabeceras y CSP (P1-06), la purga de tokens y sesiones (J4: propuesta P3-04 fuera del catálogo; NO la implementes), un SMTP de alojamiento (PE-02, RB-02).
Cambios esperados: schema.prisma, migración M5, mailer.ts, servicios, páginas, pruebas.
Contratos que introduces: requestPasswordResetAction y resetPasswordAction (05 §3.2), el puerto Mailer, /recuperar y /restablecer. Contratos que debes conservar: sesiones, safeNext y el contrato de errores (TOKEN_INVALID único para inexistente, usado o vencido).
Reglas que no puedes romper: el token se usa una sola vez aunque lleguen dos consumos simultáneos (se serializan en el bloqueo de User: un cambio de contraseña y un TOKEN_INVALID); la ventana es de 30 minutos; ninguna sesión anterior sobrevive (también la creada por un ingreso simultáneo con la clave antigua: se recomprueba passwordChangedAt al crear la sesión); nada de tokens en registros ni auditoría; el correo que falla no revierte el cambio.
Pruebas por ID. Se comprueban al cerrar: T-CTA-10 (respuesta idéntica y solo se envía al correo existente), 11 (token vencido), 12 (token ya usado), 13 (dos consumos simultáneos con barrera sobre User, y subcaso 13b: ingreso simultáneo), 14 (restablecer revoca todas las sesiones anteriores), 17 (límite de recuperación), 18 (recorrido completo con Mailpit en E), T-SEG-13b, T-DB-01 sobre ck_prt_* (D1-2). Dependen de paquetes posteriores: el cierre efectivo de los sockets (T-CHAT-11, P6-01); el SMTP alcanzable desde el alojamiento (PE-02).
Verificación (comandos PREVISTOS, no probados): npm run db:up; npm run db:migrate; npm run test:integration; npm run test:concurrency; npm run test:e2e; npm run build.
Evidencia: informes, el correo recibido en Mailpit y la prueba de que el token no está en registros ni auditoría, en docs/evidencias/P1-05/; informe de 11 §3.
Decisiones que te afectan: D1-9 (dónde se fija Referrer-Policy: no-referrer en /restablecer), D1-12 (API de nodemailer 10), D1-13, D1-2, D6-9.
Terminas cuando: las pruebas de «al cerrar» pasan, el consumo único y la revocación de sesiones están demostrados (incluida la concurrencia), el token solo viaja en el enlace y el informe lista lo que depende de P6-01 y de PE-02.
Si quedas a medias: no edites una migración aplicada; no dejes un enlace de recuperación funcional sin revocar sesiones.
```

#### Prompt de `P1-06`

```text
PAQUETE P1-06 — Cabeceras de seguridad, CSP y matriz de permisos automatizada
Ficha: 10 §5, P1-06. Prompt maestro: 11 §2.
Objetivo observable: las respuestas llevan las cabeceras de seguridad y una CSP con nonce, las páginas privadas son no-store y existe una matriz de permisos generada desde una única tabla.
Requisitos que satisface: RS-21, RS-22, RS-27.
Dependencias que deben estar probadas: P1-02 (principal y acciones). Se recomienda tener P1-05 para recorrer también /restablecer.
Lee antes: la ficha P1-06; 06 §3.3 a §3.5; 02 §3 (proxy.ts) y §6; 01 §8 (matriz de permisos); 05 §1 y §3; 08 §3.7 (T-SEG-02, 03, 04, 06, 10 y SEG-D2).
Alcance exacto: proxy.ts (nonce por petición y CSP de 06 §3.5: default-src self, script-src con nonce y strict-dynamic, sin unsafe-inline ni unsafe-eval en producción, form-action self y https://www.sandbox.paypal.com, frame-ancestors none; la UBICACIÓN de proxy.ts, raíz o src, se confirma); next.config.ts (nosniff, Referrer-Policy, Permissions-Policy, HSTS solo en despliegue); Cache-Control no-store en /panel/**; proxy.ts NO autoriza ni consulta la base (D-06); tests/security/matriz.ts (tabla única generada desde 01 §8 y 05 §3, con la comprobación de que cada acción existente figura en ella); sondas de inyección SQL con las comillas y metacaracteres de T-SEG-06; regla de ESLint contra dangerouslySetInnerHTML y consultas sin parámetros.
Fuera de este paquete: no-store del QR y del historial (P5-01, P6-02), las filas de la matriz de acciones futuras (cada paquete añade las suyas), la política de caché de páginas públicas (por definir, 08 §3.7.3), la compatibilidad con PayPal de form-action (P4-06).
Cambios esperados: proxy.ts, next.config.ts, regla de ESLint, tests/security/matriz.ts y pruebas.
Contratos que introduces: las cabeceras y la CSP, no-store en /panel/** y la tabla matriz. Contratos que debes conservar: safeNext y action().
Reglas que no puedes romper: sin scripts de terceros; el nonce exige render dinámico (cacheComponents false); no confundir ausencia de errores de CSP en los recorridos actuales con cobertura de pantallas futuras.
Pruebas por ID. Se comprueban al cerrar: T-SEG-02 (02a y 02b en el build de producción), T-SEG-03 (03a no-store de /panel y 03b «Atrás» tras salir), T-SEG-04 (04a, 04b y 04h sobre las acciones y rutas EXISTENTES), T-SEG-06 (06a y 06b sobre los campos existentes), T-SEG-10 (10a a 10d). Dependen de paquetes posteriores: no-store del QR y del historial (T-ENT-03a, T-CHAT-07e), la matriz completa de las 23 acciones y de WebSocket (se amplía por paquete), la política de caché pública, la compatibilidad de la CSP con los estilos de Tailwind y Next (D1-8) y form-action con PayPal (P4-06).
Verificación (comandos PREVISTOS, no probados): npm run build; npm run test:e2e; npm run test:integration; npm run lint.
Evidencia: cabeceras reales por ruta, informe de la matriz y consola sin violaciones de CSP en docs/evidencias/P1-06/; informe de 11 §3.
Decisiones que te afectan: D1-8 (CSP frente a estilos en línea y ubicación de proxy.ts: resuélvelo al empezar), D1-9 (Referrer-Policy de /restablecer), D1-10.
Terminas cuando: las pruebas de «al cerrar» pasan, la CSP no produce violaciones en los recorridos existentes, la matriz cubre las acciones y rutas actuales y el informe indica cómo la amplían los paquetes siguientes.
Si quedas a medias: solo configuración y código; revierte la CSP antes de dejar páginas rotas.
```

### 4.4 Fase 2 — Ofertas, revisión y catálogo (`P2-01` a `P2-05`)

**Reglas de la fase 2 (valen para los cinco prompts, no se repiten en cada uno).**
- **Orden:** `P2-01`, `P2-02`, `P2-03`, `P2-04`, `P2-05`. `P2-02` depende de `P2-01` **y de `P1-03`** (componentes de formulario accesibles; dependencia corregida en 10 §4); `P2-04` y `P2-05` dependen de `P2-03` y pueden hacerse en cualquiera de los dos órdenes, pero se recomienda `P2-04` antes de la fase 3.
- **Prerrequisito de toda la fase:** las fases 0 y 1 cerradas y probadas (en especial `P1-03` para `P2-02`).
- **Las reservas no existen hasta `P3-01`.** Hasta `P2-03` las ofertas `OPEN`, `SUSPENDED` y `ARCHIVED` de partida de las pruebas se arman **por SQL de tres pasos con el migrador** (D2-11); desde `P2-03` se arman con los servicios. **Cada prompt separa tres clases de pruebas:** las que se comprueban **al cerrar**; las que **necesitan reservas** (`HELD` o `EXPIRED`) y son ejecutables **desde `P3-01`**; y las que necesitan una **reserva `CONFIRMED` con pago y entradas** y son ejecutables **desde `P4-02`** (T-OFE-15a, la parte de conservación de pagos y entradas de T-OFE-16a y la parte `CONFIRMED` de 22a; D4-5). No las des por pasadas antes.
- **Propuestas que siguen pendientes de decisión** (regístralas como tales, no como contrato): D2-3 (listado del GAD: orden, provincia y `pagina` inválida) y D2-4 (catálogo: orden, `provincia` desconocida, `pagina` inválida y fuera de rango). **Ya fijado:** «futuro» es `startsAt > now` estricto (03 §7, 04 TX-02, TX-03 y TX-05).
- **J4 queda fuera:** la purga no es de esta fase (propuesta `P3-04`, fuera del catálogo).
- **SQL de M6:** no está ejecutado (03 §10.2, D2-12). Comandos **previstos, ninguno probado**.

#### Prompt de `P2-01`

```text
PAQUETE P2-01 — Modelo de ofertas, restricciones y semilla de ofertas
Ficha: 10 §5, P2-01. Prompt maestro: 11 §2.
Objetivo observable: Offer y OfferVersion existen con sus restricciones y disparadores, y la semilla de ofertas es repetible.
Requisitos que satisface: RF-07 y RF-10 (nivel de base de datos).
Dependencias que deben estar probadas: P1-02 (y por transitividad P0-06 y P1-01). Existen Gad, Attraction, User, el arnés y las utilidades protegidas.
Lee antes: la ficha P2-01; 03 §3.2 (Offer, OfferVersion y §3.2.1 orden de inserción), §4.1 y §4.2 (estados), §8.2 (claves compuestas), §8.3 (ck_offer_*, ck_ov_*), §8.4 (disparadores incrementales), §8.5, §8.7 (T-DB-01), §9.1 (M6), §9.3 (semilla de ofertas) y §10.2; 08 §3.2 (T-OFE-11).
Alcance exacto: migración <marca>_p2_01_ofertas (M6) y schema.prisma (OfferStatus, OfferVersionStatus, Offer, OfferVersion con onDelete y onUpdate explícitos y las claves compuestas (attractionId, gadId), (publicVersionId, id) y (workingVersionId, id)); SQL manual: ck_offer_pointers, ck_offer_statusmeta, ck_ov_ranges, ck_ov_lengths, ck_ov_review, tg_offerversion_guard, tg_offer_guard SIN el bloque [P3-01] (Reservation no existe) y tg_offer_pointer_status; GRANT S,I,U,D a tc_app (el DELETE solo es efectivo sobre filas no publicadas por los disparadores); sonda de deriva con prisma migrate diff (decide si prisma validate acepta la clave primaria en fields o se usan punteros escalares con la clave compuesta solo en SQL); prisma/seed/offers.ts y el paso de ofertas en db:seed: patrón de TRES PASOS (INSERT Offer inédita -> INSERT OfferVersion -> un solo UPDATE Offer), >= 25 ofertas en >= 10 provincias, 09:00 de America/Guayaquil y 4 h, una por cada estado, una OPEN con minAge 12, una con capacity 1 y una con dos versiones, autor = usuario GAD y revisor = operador distinto, con MIGRATION_DATABASE_URL, seedBase({ now }) y sin tocar lo existente.
Fuera de este paquete: servicios y pantallas de ofertas (P2-02 en adelante), el bloque [P3-01] de fn_offer_guard y las claves de reservas (P3-01), la semilla de rendimiento y de demostración.
Cambios esperados: schema.prisma, migración M6, prisma/seed/offers.ts y pruebas.
Contratos que introduces: entidades y estados de 03 §4, nombres de restricciones ck_*, fk_* y tg_*, la semilla de ofertas. Contratos que debes conservar: M1 a M5.
Reglas que no puedes romper: una versión APPROVED es inmutable (disparador); el catálogo solo verá versiones apuntadas por el puntero público; una migración aplicada no se edita; la semilla es incremental y no destructiva.
Pruebas por ID. Se comprueban al cerrar: T-DB-01 (a existencia de los objetos de M6; b claves compuestas de M6; c cada ck_* de M6 incluido ck_ov_review; d tg_offerversion_guard y el DELETE de una oferta publicada; f puntero a versión de otra oferta y oferta con atracción de otro GAD; i deriva tras una segunda migrate), T-DB-02 con la semilla de ofertas (repetible, sin duplicados) y T-OFE-11 en su parte de base (11b: UPDATE y DELETE directos sobre una versión APPROVED => TC_APPROVED_IMMUTABLE). Dependen de paquetes posteriores: T-OFE-11a (INVALID_STATE por el servicio, P2-02 y P2-03); T-DB-01e y las claves compuestas de reservas (P3-01); el bloque [P3-01] de fn_offer_guard (P3-01).
Verificación (comandos PREVISTOS, no probados): npx prisma validate; npx prisma migrate dev --create-only --name p2_01_ofertas; npm run db:migrate; npm run db:generate; npm run db:seed (dos veces); npm run test:integration.
Evidencia en docs/evidencias/P2-01/: salida de migrate y de la sonda de deriva, recuentos de la semilla e informe de T-DB-01; informe de 11 §3 que indique si los punteros quedaron como relación Prisma o como escalares.
Decisiones y comprobaciones que te afectan: D2-5 (prisma validate con relaciones compuestas y deriva de objetos manuales), D2-12 (SQL de M6 sin ejecutar), D2-11.
Terminas cuando: M6 se aplica desde cero, la segunda migrate no propone cambios, T-DB-01 (objetos de M6), T-DB-02 y T-OFE-11b pasan y el informe habilita P2-02.
Si quedas a medias: no edites una migración aplicada; en local, db:reset solo con autorización; desactiva el paso de ofertas de db:seed si falla.
```

#### Prompt de `P2-02`

```text
PAQUETE P2-02 — CRUD del GAD
Ficha: 10 §5, P2-02. Prompt maestro: 11 §2.
Objetivo observable: un miembro del GAD crea y edita la versión de trabajo de una oferta de su institución, ve su listado y detalle, descarta la versión de trabajo y elimina ofertas inéditas; otro GAD no ve ni modifica nada ajeno.
Requisitos que satisface: RF-07, RF-08 (listado del GAD), RF-11 (eliminar), RF-14, RS-09 (parte).
Dependencias que deben estar probadas: P2-01 Y P1-03 (componentes de formulario accesibles; dependencia conservada), y por transitividad action(), el principal y recordAudit.
Lee antes: la ficha P2-02; 04 OFF.1 a OFF.5, TX-01 (§§1 a 7) y TX-16; 05 §2, §3.1 y §3.3; 07 §4.4 y §6; 03 §3.2 y §3.4.2 (acciones offer.*); 08 §3.2 (T-OFE-01 a 04, 14, 19, 24) y §3.2.1.
Alcance exacto: offerVersionContentSchema (OFF.3: rangos de 03 §8.3, puntos de código, precio en texto a centavos sin coma flotante, fechas locales de America/Guayaquil a UTC, strip; que startsAt sea futuro NO se valida al crear ni al editar); createOffer (oferta inédita, versión 1 DRAFT y workingVersionId en UNA transacción; la atracción debe ser del GAD); updateWorkingVersion (FOR KEY SHARE, rev condicional, AUTOR como regla de identidad: FORBIDDEN a otro miembro, STALE_VERSION, comprobación de fechas de cortesía); discardWorkingVersion y deleteOffer (TX-16 con el orden explícito de D-78; cualquier miembro del GAD; confirm exactamente true); lockOffer y lockOfferShared en modules/offers/infra/inventory.ts; listado y detalle del GAD (recurso ajeno => 404 idéntico al inexistente, D-14); pantallas /panel/ofertas, /nueva, /[offerId] y /editar con contadores en puntos de código y el motivo de devolución; auditoría offer.create, offer.version.update, offer.version.discard y offer.delete (solo nombres de campo y longitudes, nunca textos); fábricas de prueba de estados por SQL de tres pasos con el migrador. LISTADO: 10 por página; ORDEN, filtro por provincia y PÁGINA INVÁLIDA son PROPUESTAS pendientes (D2-3): orden createdAt y id descendentes, provincia de la versión de trabajo si existe y si no la pública, pagina no entera o < 1 => 1, fuera de rango => lista vacía con enlace a la primera; impleméntalo como propuesta, regístralo como tal y no cambies 05 ni 07.
Fuera de este paquete: enviar a revisión, aprobar y abrir versión nueva (P2-03), suspender y archivar (P2-04), catálogo público (P2-05), reglas que leen Reservation (P3-01 en adelante).
Cambios esperados: módulo offers (domain, application, infra), páginas y Server Actions del GAD, tests/helpers y pruebas.
Contratos que introduces: createOfferAction, updateWorkingVersionAction, discardWorkingVersionAction y deleteOfferAction (05 §3.3), las rutas /panel/ofertas, lockOffer/lockOfferShared y offerVersionContentSchema. Contratos que debes conservar: Principal, action() y los componentes de P1-03.
Reglas que no puedes romper: UNA SOLA versión de trabajo por oferta (workingVersionId único); autorización sobre la fila BLOQUEADA (orden de OFF.1: rol, alcance, identidad, estado, rev, negocio); el principal nunca viaja en el cuerpo; el alta puede duplicarse con doble clic (dos borradores descartables, se acepta).
Pruebas por ID. Se comprueban al cerrar: T-OFE-01 (01a a 01c y bordes), T-OFE-02 (con la propuesta D2-3), T-OFE-03 (03a sobre editar, descartar, eliminar y consultar, y 03d), T-OFE-04 (04a a 04c, barrera OfferVersion), T-OFE-14 (14a, 14b, 14c, 14f, 14g; las ofertas OPEN y ARCHIVED de partida se siembran por SQL con el migrador), T-OFE-19 (19a en lo de editar), T-OFE-24 (24a y 24b en lo de crear y editar). Dependen de paquetes posteriores: T-OFE-14d y 14e (frente a aprobar) y lo de enviar de 03a, 19a y 24b (P2-03); lo de archivar y abrir versión nueva de 03a (P2-04 y P2-03); T-OFE-22a y lo que usa reservas HELD o EXPIRED (desde P3-01); lo que exige una reserva CONFIRMED con pago y entradas (desde P4-02).
Verificación (comandos PREVISTOS, no probados): npm run test:integration; npm run test:concurrency; npm run test:e2e; npm run build; npm run lint.
Evidencia en docs/evidencias/P2-02/: informes y la salida de la barrera de 04c; informe de 11 §3 con el reparto de pruebas anterior y la nota de que el listado es propuesta.
Decisiones que te afectan: D2-3 (propuesta de listado), D2-6 (frontera startsAt > now, ya fijada en 03 §7), D2-11, D1-12.
Terminas cuando: las pruebas de «al cerrar» pasan, otro GAD recibe 404 idéntico en todo, la versión de trabajo es única, y el informe deja documentado cómo se arman las ofertas de prueba por SQL hasta P2-03.
Si quedas a medias: solo código; no dejes acciones sin autorización por identidad.
```

#### Prompt de `P2-03`

```text
PAQUETE P2-03 — Revisión y publicación de versiones
Ficha: 10 §5, P2-03. Prompt maestro: 11 §2.
Objetivo observable: el autor envía su versión a revisión, un operador de la atracción la aprueba o la devuelve, la aprobación publica mediante el puntero y se puede abrir una versión nueva conservando el historial.
Requisitos que satisface: RF-09, RF-10, RS-08, RS-09 (parte).
Dependencias que deben estar probadas: P2-02 (lockOffer, lockOfferShared, esquema de contenido y pantallas del GAD).
Lee antes: la ficha P2-03; 04 TX-02, TX-03 (§§1 a 7) y TX-01 (abrir versión); OFF.1, OFF.2 y OFF.4; 05 §3.3; 07 §4.4 y §4.5; 03 §4.2 y §8.4; 08 §3.2 (T-OFE-05 a 13, 18).
Alcance exacto: submitVersion (FOR KEY SHARE, revalida el contenido, exige startsAt > now con la hora tomada tras el bloqueo, anticipa SCHEDULE_LOCKED como cortesía); decideVersion (bloqueo exclusivo; comprobaciones 1 a 10 de TX-03 en el orden fijo de OFF.1; APPROVED, movimiento del puntero público y estado OPEN en UNA transacción; aprobar sobre SUSPENDED NO la reanuda); PROHIBICIÓN DE AUTOAPROBACIÓN por IDENTIDAD (principal.userId distinto de authorId; una persona con GAD y OPERATOR no decide su versión pero sí la de otro; ck_ov_review como segunda barrera); el operador debe serlo de la ATRACCIÓN de la oferta (otro operador => NOT_FOUND); startNewVersion (copia de la pública; UNA SOLA versión de trabajo: WORKING_VERSION_EXISTS con details.workingVersionId; numeración creciente sin reutilizar números); CONSERVACIÓN DEL HISTORIAL (la versión anterior queda histórica, no se borra); pantallas /panel/revisiones y /[versionId] con «Antes / Ahora» en texto y botones Aprobar y Devolver separados; auditoría offer.version.submit, .approve, .request_changes y .open; PUERTO inventory (countCommitted y reservationsExist) con implementación provisional «sin reservas» (la tabla Reservation no existe): P3-01 la sustituye por la consulta real (D2-2, D3-1).
Fuera de este paquete: suspender y archivar (P2-04), catálogo (P2-05), la implementación real del inventario (P3-01).
Cambios esperados: application/{submit-version, decide-version, start-new-version}.ts, infra/inventory.ts (puerto), páginas del operador, ampliación de /panel/ofertas/[offerId] y pruebas.
Contratos que introduces: submitVersionAction, approveVersionAction, requestChangesAction y startNewVersionAction (05 §3.3), /panel/revisiones y el puerto inventory. Contratos que debes conservar: los de P2-02.
Reglas que no puedes romper: una versión APPROVED es inmutable (servicio y disparador); el catálogo conserva la versión anterior hasta aprobar la nueva; la hora se toma DESPUÉS del último bloqueo (D-69); el orden en que PostgreSQL concede el bloqueo no está prometido: las aserciones de carrera valen para ambos órdenes (PC-OFE-3).
Pruebas por ID. Se comprueban al cerrar: T-OFE-05 (05a, 05c, 05d, 05f, 05g), 06 (06a y 06b; la oferta SUSPENDED se siembra con el migrador), 07 (aprobar y devolver con otra atracción), 08 (08a a 08d: autoaprobación por identidad), 09, 10 (carreras con barrera offer), 11 (11a y 11b), 12 (12a), 13 (13a y 13b: versión de trabajo única), 18 (numeración), y T-OFE-14d y 14e aplazadas desde P2-02. Se prueban a NIVEL DE LÓGICA con el puerto simulado las comprobaciones 9 y 10 de TX-03 (T-OFE-21 y 22 en su parte lógica). Dependen de paquetes posteriores: T-OFE-05e (envío frente a archivo) y 16c (P2-04); con Reservation real (HELD o EXPIRED): T-OFE-21, T-OFE-22 (22c y 22d) y T-RES-17, ejecutables desde P3-01 (el catálogo las asigna a P3-03); con una reserva CONFIRMED con pago y entradas: la parte CONFIRMED de 22a, desde P4-02.
Verificación (comandos PREVISTOS, no probados): npm run test:integration; npm run test:concurrency; npm run test:e2e.
Evidencia en docs/evidencias/P2-03/: informes con ambos órdenes de PC-OFE-3 en las carreras; informe de 11 §3 que indique que el puerto inventory es provisional y qué pruebas esperan a P3-01 y a P4-02.
Decisiones que te afectan: D2-2 (puerto provisional, adoptado en la ficha de P3-01), D2-6 (frontera startsAt > now, fijada en 03 §7), D2-11.
Terminas cuando: las pruebas de «al cerrar» pasan, la autoaprobación está rechazada por servicio y base, una sola versión de trabajo por oferta, el historial se conserva y el informe habilita P2-04 y P2-05.
Si quedas a medias: solo código; no dejes una aprobación que mueva el puntero sin cambiar el estado en la misma transacción.
```

#### Prompt de `P2-04`

```text
PAQUETE P2-04 — Suspensión, reanudación, archivo y moderación
Ficha: 10 §5, P2-04. Prompt maestro: 11 §2.
Objetivo observable: el operador suspende y reanuda las ventas de su atracción, el GAD o el administrador (con motivo) archivan de forma terminal y el archivo conserva todo el historial.
Requisitos que satisface: RF-11 (archivar), RF-12.
Dependencias que deben estar probadas: P2-03 (ofertas OPEN creadas por los servicios y estados publicados).
Lee antes: la ficha P2-04; 04 TX-04 (§§1 a 6) y TX-16 (historial); OFF.1 y OFF.2; 05 §3.3; 07 §4.4, §4.5 y §4.8; 03 §4.1 y §3.6; 08 §3.2 (T-OFE-15, 16).
Alcance exacto: changeOfferStatus con bloqueo exclusivo (OPEN <-> SUSPENDED y archivar desde un estado publicado; statusReason, statusChangedAt y statusChangedById); AUTORIZACIÓN: suspender y reanudar solo el operador de la atracción (el administrador NO suspende); archivar el GAD de la oferta o ADMIN con motivo OBLIGATORIO; ARCHIVED es TERMINAL: NO se borra ninguna versión, reserva, pago ni entrada, la versión de trabajo queda INERTE y las entradas emitidas siguen válidas (D-79); la oferta archivada sale del catálogo y no admite nuevas retenciones; pantallas /panel/actividades (sin conteos hasta P3-03) y /panel/admin/ofertas y la acción «Archivar» con confirmación explícita (confirm true, foco atrapado, Escape); auditoría offer.suspend, offer.resume y offer.archive (solo la longitud del motivo).
Fuera de este paquete: conteos de cupos y de entradas (P3-03 y P4-02), el catálogo (P2-05), reservas (P3-01 en adelante).
Cambios esperados: application/change-offer-status.ts, páginas, ampliación de /panel/ofertas/[offerId] y pruebas.
Contratos que introduces: suspendOfferAction, resumeOfferAction y archiveOfferAction (05 §3.3), /panel/actividades y /panel/admin/ofertas. Contratos que debes conservar: los de P2-03.
Reglas que no puedes romper: tg_offer_guard impide todo UPDATE tras ARCHIVED (el archivo es el último cambio); archivar es irreversible (se advierte en la interfaz); el motivo no entra en la auditoría; recurso ajeno => NOT_FOUND.
Pruebas por ID. Se comprueban al cerrar: T-OFE-15 (15b y 15c), T-OFE-16 (16a en lo de estado terminal, versión de trabajo inerte, fuera del catálogo y permisos de GAD, administrador sin y con motivo y otro GAD; 16b, 16b' y 16c en ambos órdenes) y los pendientes de P2-03: T-OFE-05e y 07 en lo de suspender y reanudar. Dependen de paquetes posteriores: con reservas HELD o EXPIRED, ejecutables desde P3-01 (con P2-04 cerrado): T-OFE-16d (archivar frente a reservar), T-RES-13 y la retención de 16a; T-RES-18 a más tardar en P3-03; con una reserva CONFIRMED con pago y entradas, desde P4-02: T-OFE-15a y la parte de 16a que comprueba que NO cambian reservas, pagos ni entradas; los conteos de cupos y de entradas de /panel/actividades (P3-03 y P4-02).
Verificación (comandos PREVISTOS, no probados): npm run test:integration; npm run test:concurrency; npm run test:e2e.
Evidencia en docs/evidencias/P2-04/: informes y la comprobación de que archivar no borra filas; informe de 11 §3 con la clasificación de pruebas anterior.
Decisiones que te afectan: D2-9 (conteos hasta P3-03), D2-10 y D3-11 (pruebas con reservas).
Terminas cuando: las pruebas de «al cerrar» pasan, archivar conserva todo el historial, el administrador no puede suspender y el informe habilita la fase 3.
Si quedas a medias: solo código; no dejes un archivo que borre versiones.
```

#### Prompt de `P2-05`

```text
PAQUETE P2-05 — Portada y catálogo público
Ficha: 10 §5, P2-05. Prompt maestro: 11 §2.
Objetivo observable: un visitante ve la portada, el catálogo paginado con filtro por provincia y el detalle de la versión pública de las ofertas abiertas.
Requisitos que satisface: RF-08 (catálogo), RF-13, RF-39.
Dependencias que deben estar probadas: P2-03 (ofertas publicadas por los servicios); la semilla de ofertas de P2-01 sirve de datos.
Lee antes: la ficha P2-05; 03 §3.2 (índice OfferVersion(province, startsAt), H-20); 05 §2 (/, /ofertas y /ofertas/[offerId]); 07 §4.2 y §6; 06 §3.5; 08 §3.2 (T-OFE-17, 20).
Alcance exacto: consulta del catálogo SOLO de ofertas OPEN futuras con los datos de su VERSIÓN PÚBLICA, filtro por la provincia de esa versión, orden startsAt ascendente con desempate por id y 10 por página; detalle: OPEN o SUSPENDED (esta con «Ventas suspendidas temporalmente» y sin botón), 404 en otro caso; «quedan N» o «Agotada» desde el puerto inventory (hasta P3-01 no hay reservas: N = capacidad); portada con próximas ofertas y accesos; etiqueta «hora de Ecuador continental»; los botones «Reservar» e «Ingresar para reservar» NO se muestran hasta que exista /ofertas/[offerId]/reservar (P3-02; D2-8). COMPORTAMIENTO DE PARÁMETROS INVÁLIDOS: es PROPUESTA pendiente (D2-4): provincia fuera de los 24 códigos => se ignora el filtro sin error; pagina inválida => 1; fuera de rango => página vacía con enlace a la primera, sin 404; impleméntalo como propuesta, regístralo como tal y que nunca dé 500.
Fuera de este paquete: reservar (P3-02), la medición de rendimiento y el análisis de la paginación profunda (PE-01), la política de caché de páginas públicas (por definir, 08 §3.7.3).
Cambios esperados: application/{list-catalog, get-public-offer}.ts, src/app/page.tsx, src/app/ofertas, componentes de tarjeta y paginación en src/ui y pruebas.
Contratos que introduces: /, /ofertas (?provincia&pagina) y /ofertas/[offerId]. Contratos que debes conservar: los de fases previas.
Reglas que no puedes romper: nunca se muestran datos de la versión de trabajo; parámetros siempre parametrizados (T-SEG-06); render dinámico (cacheComponents false); estados con texto, no solo color.
Pruebas por ID. Se comprueban al cerrar: T-OFE-17 (17a y 17b: solo OPEN futuras con versión pública, la v2 DRAFT no se ve, detalle 404 para inédita y archivada y aviso para la suspendida, filtro, paginación y estado vacío con «Quitar filtro») y T-OFE-20 hasta «aparece en la portada y el catálogo» (E: GAD crea, operador aprueba). Dependen de paquetes posteriores: la aserción de «pagina» y «provincia» inválidas (depende de D2-4; también T-SEG-06a); el «Ingresar para reservar» de T-OFE-20 (desde P3-02); el «quedan N» con reservas reales (desde P3-01); la política de caché pública; T-A11Y-01 (PE-03) y T-PERF-01 (PE-01).
Verificación (comandos PREVISTOS, no probados): npm run test:integration; npm run test:e2e; npm run test:a11y; npm run build.
Evidencia en docs/evidencias/P2-05/: informes de Vitest y de Playwright; informe de 11 §3 que declare los parámetros inválidos como propuesta.
Decisiones que te afectan: D2-4 (propuesta de parámetros inválidos), D2-7 (caché pública), D2-8.
Terminas cuando: las pruebas de «al cerrar» pasan, el catálogo solo muestra versiones públicas de ofertas abiertas futuras y el informe habilita P3-02.
Si quedas a medias: solo código; no muestres un botón de reservar que lleve a una ruta inexistente.
```

### 4.5 Fase 3 — Reserva grupal y cupos (`P3-01` a `P3-03`)

**Reglas de la fase 3 (valen para los tres prompts, no se repiten en cada uno).**
- **Orden:** `P3-01`, `P3-02`, `P3-03`. `P3-02` depende de `P3-01` y `P2-05`; `P3-03` de `P3-01` y `P2-04`. **Prerrequisito de toda la fase:** las fases 0 a 2 cerradas y probadas, **incluida `P2-04`** (orden recomendado: sin ella T-OFE-16d, T-RES-13 con ofertas cerradas por los servicios y T-RES-18 no se pueden ejecutar).
- **Reglas ya fijadas y alineadas (2026-11-16), no las trates como pendientes:** «futuro» es `startsAt > now` estricto (03 §7); una retención es vigente solo si `expiresAt > now` (03 §4.3, §4.6 y §8.6); el límite de **tres retenciones** (1 por comprador y oferta, 3 por comprador) cuenta las reservas `HELD` **o `REVIEW_REQUIRED`** vigentes y **no** las `CONFIRMED` (03 §8.6, consulta 3); el 29 de febrero está resuelto en 03 §7 (decisión D-36).
- **Clasificación de pruebas (cada prompt la aplica):** (1) **se habilitan en la fase 3**, con reservas `HELD`, `EXPIRED` o `REVIEW_REQUIRED` sembradas con el migrador; (2) **requieren pagos y entradas de `P4-01` y `P4-02`**: toda reserva `CONFIRMED` (la fábrica de OFE-D5 inserta el conjunto completo y la comprobación diferida lo exige) y todo `Payment`; (3) dependen de otro paquete de la fase 3. **No des por pasadas las de la clase 2 antes de `P4-02`** (D4-5): T-RES-07f (tras confirmar), T-RES-11f (pago `ORDER_CREATED`, necesita `P4-01`), T-RES-11g, T-RES-12d y T-RES-15f, y de la fase 2 T-OFE-15a, la conservación de pagos y entradas de T-OFE-16a y la parte `CONFIRMED` de T-OFE-22a.
- **J4 queda fuera:** la purga no es de esta fase (propuesta `P3-04`, **fuera del catálogo**, sin prompt).
- El SQL de 03 §8 de M7 **no está ejecutado** (D3-10). Comandos **previstos, ninguno probado**.

#### Prompt de `P3-01`

```text
PAQUETE P3-01 — Modelo de reservas, inventario y servicio de retención
Ficha: 10 §5, P3-01 (incluye «Cómo entra el inventario real»). Prompt maestro: 11 §2.
Objetivo observable: Reservation y Attendee existen con sus restricciones y un comprador reserva para 1 a 10 asistentes con retención de 15 minutos, idempotencia y sin sobreventa; el inventario provisional de P2-03 queda SUSTITUIDO por el cálculo real de cupos.
Requisitos que satisface: RF-15 a RF-20, RS-10, RS-11, RS-25, RS-29.
Dependencias que deben estar probadas: P2-03 (ofertas publicadas, lockOffer, puerto inventory provisional); para las pruebas con suspender y archivar, P2-04. Existen ageOn, Clock, withTx, el arnés y las barreras.
Lee antes: la ficha P3-01; 03 §3.3 (Reservation, Attendee), §4.3 (R-1 a R-8), §5, §6, §7 y §8.2 a §8.6, §9.1 (M7); 04 TX-05 (§§1 a 7), TX-06 y OFF.4; 05 §3.4 (createReservationAction); 06 (RS-25); 08 §3.3 (T-RES-01 a 09, 12, 13, 15, 16 y 3.3.1).
Alcance exacto: (1) migración <marca>_p3_01_reservas (M7) y schema.prisma (ReservationStatus, ReviewReason, Reservation, Attendee) con SQL manual: ck_res_* (rangos, expiresAt > createdAt, estado y campos de revisión, moneda USD), ck_att_ranges, clave compuesta (offerVersionId, offerId), tg_reservation_guard y tg_attendee_guard (solo se admite anular birthDate), fn_check_reservation en su versión de ASISTENTES con los disparadores diferidos _r y _a, los índices de 03 §3.3, el único (buyerId, requestKey), CREATE OR REPLACE fn_offer_guard con el bloque [P3-01] y GRANT SELECT, INSERT, UPDATE sin DELETE. (2) SUSTITUCIÓN DEL INVENTARIO: reemplaza SOLO la implementación de modules/offers/infra/inventory.ts, con la MISMA firma: countCommitted(tx, offerId, now, excludeId) con la consulta 2 de 03 §8.6 (confirmadas más HELD o REVIEW_REQUIRED con expiresAt > now, sin la reserva excluida) y reservationsExist(tx, offerId) (cualquier reserva en cualquier estado); disponibilidad = capacidad de la VERSIÓN PÚBLICA menos comprometido; TX-05 la calcula bajo el bloqueo de Offer con now tomado tras los bloqueos; el catálogo y el detalle (P2-05) la leen SIN bloqueo y solo como información. TX-02, TX-03 y el catálogo NO cambian de código: pasan a leer datos reales y las comprobaciones 9 y 10 de TX-03 quedan ACTIVAS; no debe quedar ninguna implementación provisional. (3) createReservation (TX-05): formato y requestHash fuera de la transacción; reconsulta por (buyerId, requestKey) ANTES del bloqueo (reintento idempotente: mismo hash devuelve la reserva existente con replayed true, otro hash IDEMPOTENCY_KEY_REUSED); bloqueo asesor del comprador y lockOffer; comprobaciones 2 a 8 en el orden fijo de TX-05.1; INSERT de la reserva, los asistentes y la auditoría reservation.create en la misma transacción; manejo de 23505 (A11) con relectura tras revertir y reintento ante 40P01; expiresAt = min(now + 15 min, startsAt); edad con ageOn en la fecha local de inicio; birthDate solo si hay minAge; createReservationAction delgada. (4) tests/helpers: crearOfertaAbierta, crearReservaRetenida, sembrarReserva (con el migrador y en una transacción) y barrera.comprador.
Fuera de este paquete: formulario y pantallas (P3-02), J1 expire-holds y agregados (P3-03), Payment, pagos y entradas (P4-01 y P4-02: no crees sembrado de reservas CONFIRMED ni de Payment), la purga J4 (propuesta P3-04 fuera del catálogo).
Cambios esperados: schema.prisma, migración M7, módulo reservations, inventory.ts real, createReservationAction, tests/helpers y pruebas.
Contratos que introduces: createReservationAction y createReservation, countCommitted y reservationsExist reales, la disponibilidad, el uso de HOLD_LIMIT_REACHED, INSUFFICIENT_CAPACITY, VERSION_CHANGED e IDEMPOTENCY_KEY_REUSED, y la tabla Reservation. Contratos que debes conservar: la firma de inventory, los de P2-03 y los códigos de 02 §10.2.
Reglas que no puedes romper: comprometido <= capacidad pública en todo momento (INV-01; PC-RES-3 calculado con SQL propio de la prueba); una retención es vigente solo si expiresAt > now (la igualdad NO cuenta); precio y total salen de la versión pública y el cliente no influye; el comprador es siempre el principal; nunca nombres ni fechas de nacimiento en la auditoría; orden de bloqueos: asesor del comprador, Offer, Reservation.
Pruebas por ID. Se habilitan y se comprueban al cerrar (con reservas HELD, EXPIRED o REVIEW_REQUIRED): T-RES-01 a 04, 05 (05a y 05c: la convención del 29 de febrero está en 03 §7), 06, 07 (07a a 07e y 07f en lo anterior a la confirmación), 08 (08a1, 08a2, 08b, 08c, 08d), 09 (COMPETENCIA POR EL ÚLTIMO CUPO: 09a, 09b, 09c y 09d con barrera offer; éxitos = cupos y el resto INSUFFICIENT_CAPACITY), 10 (VENCIMIENTO EXACTO: 10a, 10a', 10b con la hora tras la espera, y 10c y 10d en el borde: con expiresAt = now la retención ya no cuenta), 12 (12a, 12b y 12c), 13 (13a a 13g con ofertas SUSPENDED y ARCHIVED, frontera startsAt > now en 13c y 13d), 15 (15a a 15c; 15d; Y 15g: una REVIEW_REQUIRED con expiresAt > now, sembrada con el migrador y motivo UNCERTAIN_RESULT, CUENTA para el límite de tres y para scope BUYER u OFFER; vencida no cuenta), 16, 17 (reserva frente a aprobación que reduce la capacidad, ambos órdenes), T-DB-01 (a, b, c, d, e en lo de asistentes, f, h e i sobre M7), T-DB-02 (M7 desde cero), T-SEG-07 (07a sobre Reservation y Attendee: sin DELETE) y, con el inventario real, las pruebas de la fase 2 habilitadas: T-OFE-21 (21a y 21b), T-OFE-22 (22a en lo de HELD y EXPIRED, 22b, 22c y 22d), T-OFE-16a con una retención, T-OFE-16d y T-OFE-17 con «quedan N» real (con P2-04 cerrado para las que lo necesitan). Prueba de sustitución: T-OFE-21 y 22 ejecutan TX-03 con reservas REALES y fallarían si siguiera el puerto provisional. Dependen de otro paquete: T-RES-11 y 18 (P3-03), T-RES-14 y 19 (P3-02), T-RES-15e (J1, P3-03); REQUIEREN PAGOS Y ENTRADAS (P4-01 y P4-02): T-RES-15f (una CONFIRMED queda fuera del límite), T-RES-12d, T-RES-07f tras confirmar, T-OFE-15a, la conservación de pagos y entradas de T-OFE-16a y la parte CONFIRMED de T-OFE-22a.
Verificación (comandos PREVISTOS, no probados): npx prisma validate; npm run db:migrate; npm run db:generate; npm run test:integration; npm run test:concurrency; npm run build.
Evidencia en docs/evidencias/P3-01/: salida de migrate y de la sonda de deriva, informes con PC-RES-3 en cada prueba y la prueba de sustitución; informe de 11 §3 que declare que ya no existe el inventario provisional y liste las pruebas de la clase 2 que esperan a P4-02.
Decisiones y comprobaciones que te afectan: D3-1 (sustitución, adoptada en la ficha), D3-6 (fábricas con el migrador y una transacción), D3-10 (pg_advisory_xact_lock, FOR UPDATE con $executeRaw, 23505 y disparadores diferidos con Prisma 7 y el adaptador pg: lo no confirmado se registra), D3-11.
Terminas cuando: M7 se aplica desde cero, la segunda migrate no propone cambios, las pruebas de «al cerrar» pasan (en ambos órdenes de PC-RES-4 las de concurrencia), TX-03 lee reservas reales y el informe habilita P3-02 y P3-03.
Si quedas a medias: no edites una migración aplicada; en local, db:reset solo con autorización; no dejes la aprobación sin comprobaciones 9 y 10 reales (si no puedes sustituir el inventario, no marques cerrado el paquete).
```

#### Prompt de `P3-02`

```text
PAQUETE P3-02 — Formulario de reserva grupal y vistas del comprador
Ficha: 10 §5, P3-02. Prompt maestro: 11 §2.
Objetivo observable: el turista reserva para un grupo desde el detalle de la oferta y ve sus reservas, su estado y el vencimiento de la retención.
Requisitos que satisface: RF-15, RF-19, RF-21, RA-08.
Dependencias que deben estar probadas: P3-01 (createReservationAction, inventario real) y P2-05 (detalle de oferta). Existen los componentes de formulario de P1-03.
Lee antes: la ficha P3-02; 05 §2 y §3.4; 07 §4.2 (/ofertas/[offerId]/reservar), §4.3 (/panel/reservas y [reservationId]), §5 y §6; 04 TX-05.6; 08 §3.3 (T-RES-14, T-RES-19).
Alcance exacto: /ofertas/[offerId]/reservar (selector de cantidad 1 a 10 que genera un fieldset por asistente, fecha de nacimiento solo si hay edad mínima y con su razón, casilla de aceptación con las condiciones visibles, requestKey generada AL CARGAR y total calculado por el servidor); manejo de VERSION_CHANGED (condiciones nuevas, se conservan los asistentes, clave NUEVA y foco en el resumen), INSUFFICIENT_CAPACITY (details.available), HOLD_LIMIT_REACHED (scope), OFFER_NOT_OPEN y ACTIVITY_NOT_FUTURE; replayed true lleva a la reserva sin error; /panel/reservas (Retenida, Confirmada, Vencida, En verificación) y /panel/reservas/[reservationId] con vencimiento en «hora de Ecuador continental», cuenta atrás INFORMATIVA (el servidor decide, RA-08) con avisos a 5 y 1 minuto en región polite, «Tu retención venció» y «Reservar de nuevo con los mismos asistentes» (clave nueva); mostrar «Reservar» e «Ingresar para reservar» en /ofertas/[offerId] (cierra D2-8); acceso desde /panel.
Fuera de este paquete: pago y botón «Pagar con PayPal» (P4-04), tarjetas de entradas y QR (P5-01), agregados del GAD y asistentes del operador (P3-03), J1.
Cambios esperados: páginas indicadas, application/{list-my-reservations, get-my-reservation}.ts, ajuste de /ofertas/[offerId] y pruebas.
Contratos que introduces: /ofertas/[offerId]/reservar, /panel/reservas y /panel/reservas/[reservationId]. Contratos que debes conservar: createReservationAction y los de P2-05.
Reglas que no puedes romper: ninguna decisión de negocio depende del reloj del navegador; recurso ajeno => 404 idéntico al inexistente; sin JavaScript el formulario funciona por POST; no muestres un botón de pago que aún no existe.
Pruebas por ID. Se comprueban al cerrar: T-RES-14 (14a y 14c: el comprador ve solo las suyas y la ajena da 404), T-RES-19 pasos 1 a 3 (reserva con tres asistentes y total; conflicto de versión con el foco en el aviso y el formulario conservado; doble clic = una sola reserva) y el «Ingresar para reservar» de T-OFE-20. Dependen de otro paquete: T-RES-14b (agregados del GAD y asistentes del operador, P3-03); T-RES-19 paso 4 (vencimiento con reloj acelerado y botón de pago deshabilitado: exige el hook de reloj del fake de P4-01, D4-3, y el botón de P4-04; D3-9); las secciones de pago y entradas del detalle (P4-04 y P5-01); T-A11Y-02, 03, 04 y 07 y las listas MC y MP (PE-03).
Verificación (comandos PREVISTOS, no probados): npm run test:integration; npm run test:e2e; npm run test:a11y; npm run build.
Evidencia en docs/evidencias/P3-02/: informes de Playwright y de las pruebas del comprador; informe de 11 §3 con el reparto anterior.
Decisiones que te afectan: D3-8 (T-RES-14 partida), D3-9 (reloj acelerado del E2E), D4-3.
Terminas cuando: las pruebas de «al cerrar» pasan, el formulario conserva los asistentes ante VERSION_CHANGED y el informe habilita P4-04 y P5-01 sobre estas pantallas.
Si quedas a medias: solo código; no dejes el botón «Reservar» enlazando a una ruta rota.
```

#### Prompt de `P3-03`

```text
PAQUETE P3-03 — Vencimiento, reglas de inventario al publicar y agregados
Ficha: 10 §5, P3-03. Prompt maestro: 11 §2.
Objetivo observable: el trabajo J1 normaliza a EXPIRED las retenciones vencidas, las reglas de inventario al publicar (capacidad y fechas) quedan verificadas con reservas reales, y el GAD y el operador ven cupos agregados sin datos personales.
Requisitos que satisface: RF-18, RF-22, RF-23, RO-07.
Dependencias que deben estar probadas: P3-01 (inventario real, reservas) y P2-04 (suspender y archivar). Existen el planificador (P0-02), recordAudit y el arnés.
Lee antes: la ficha P3-03; 04 TX-06, TX-03.1 (comprobaciones 9 y 10) y TX-04.6; 03 §4.3 (R-3) y §5; 02 §11.1 (J1); 07 §4.4 y §4.5; 05 §2; 08 §3.3 (T-RES-10, 11, 17, 18) y §3.2 (T-OFE-21, 22, 23).
Alcance exacto: J1 expire-holds (src/jobs/expire-holds.ts y alta en el planificador): UPDATE ... SET status = 'EXPIRED' por lotes de 500 con FOR UPDATE SKIP LOCKED, SIN bloquear Offer, WHERE expiresAt <= now, idempotente, un AuditEvent reservation.expire_batch por lote solo si afectó filas, cada 60 s y al arrancar, desactivado con JOBS_ENABLED=false; agregados sin datos personales (capacidad, confirmadas, retenidas y disponibles por oferta) en /panel/ofertas/[offerId]; conteos de CUPOS en /panel/actividades (los de entradas esperan a P4-02, D3-7); lista de asistentes de su atracción para el operador con los campos que permita 01 §8.4; verificar que aprobación y envío leen el inventario real y completar los casos que hayan quedado fuera.
Fuera de este paquete: conteos de entradas (P4-02), la purga J4 (propuesta P3-04 fuera del catálogo: NO la implementes aquí aunque comparta el planificador), pagos y conciliación (J2, P4-05).
Cambios esperados: jobs/expire-holds.ts y scheduler, application/get-offer-aggregates.ts, ampliación de las pantallas indicadas y pruebas.
Contratos que introduces: el trabajo J1 y los agregados. Contratos que debes conservar: la disponibilidad de P3-01.
Reglas que no puedes romper: J1 solo normaliza el estado; los cupos se liberan igual con J1 detenido (RO-07); una retención es vigente solo si expiresAt > now; el GAD nunca ve nombres, fechas de nacimiento ni correos (RS-07, A-16); una fila bloqueada por otra transacción se salta y se recoge en la pasada siguiente.
Pruebas por ID. Se comprueban al cerrar: T-RES-11 (11a a 11e; 11e con la fila bloqueada por ctrl), T-RES-10, 17 y 18 si no se ejecutaron ya (10 y 17 son ejecutables desde P3-01; 18 necesita P2-04), T-RES-15e (una de las tres pasa a EXPIRED por J1), T-RES-14b, T-OFE-21, 22 y 23 (23 ya era ejecutable desde P2-02 y P2-03) y T-OFE-16d y T-RES-13 si faltan. Requieren pagos y entradas (P4-01 y P4-02): T-RES-11f (HELD vencida con Payment ORDER_CREATED), T-RES-11g (CONFIRMED con expiresAt pasado) y T-RES-15f. Dependen de otro paquete: los conteos de entradas de /panel/actividades (P4-02); T-OPS-06 (los trabajos corren al arrancar) y la purga J4 (propuesta P3-04); el calendario de J2 (P4-05).
Verificación (comandos PREVISTOS, no probados): npm run test:integration; npm run test:concurrency; npm run test:e2e.
Evidencia en docs/evidencias/P3-03/: informes de J1 con el recuento de lotes y de las pruebas en ambos órdenes; informe de 11 §3 con la clasificación de pruebas anterior.
Decisiones y comprobaciones que te afectan: D3-7 (conteos de entradas), D3-8 (T-RES-14b), D3-10 (SKIP LOCKED con Prisma 7 y el adaptador pg), D3-11.
Terminas cuando: J1 es idempotente y no toca lo vigente ni lo CONFIRMED, las pruebas de «al cerrar» pasan, ninguna vista del GAD muestra datos personales y el informe lista lo que espera a P4-01 y P4-02.
Si quedas a medias: solo código; deja J1 desactivado por JOBS_ENABLED si falla; no mezcles aquí la purga.
```

### 4.6 Fase 4 — Pago de prueba y conciliación (`P4-01` a `P4-03`)

**Reglas de este lote (valen para los tres prompts, no se repiten).**
- **Orden:** `P4-01`, `P4-02`, `P4-03`. **`P4-02` depende de `P3-01` y de `P4-01`** (dependencia conservada en 10 §4): su migración **M9 redefine `fn_check_reservation` con los bloques `[P4-01]` y `[P4-02]` y sigue a M8**, así que no puede ejecutarse antes. `P4-03` depende de `P4-01`, `P4-02` y `P3-03`. **Prerrequisito:** las fases 0 a 3 cerradas.
- **Datos preparados frente a liquidación.** Desde **`P4-02`** existe la fábrica completa `sembrarReserva({ estado: 'CONFIRMED' })` (pago `CAPTURED` y una entrada por asistente, con el migrador y en una transacción): sirve a las pruebas que solo necesitan **datos de partida**. Las pruebas que ejecutan **`settlePayment`** (la liquidación) solo se habilitan en **`P4-03`**. No las confundas.
- **Las llamadas a PayPal nunca van dentro de una transacción de base de datos.** Los servicios de inicio y captura (`P4-04`) y el webhook y J2 (`P4-05`) llaman a la pasarela **fuera** de transacción y pasan a `settlePayment` una instantánea **ya traducida**; la liquidación no llama a la pasarela.
- **Lo que depende de otros paquetes o de Sandbox** se indica en cada prompt con su paquete (`P4-04`, `P4-05`, `P4-06`, `P4-07`, `P5-01`). **`T-PAG-24` y toda comprobación real contra PayPal Sandbox siguen pendientes por Q-08** y ningún prompt de este lote las da por hechas (el `fake` y las instantáneas escritas a mano **aproximan** a PayPal, no lo verifican).
- **J4 queda fuera** (propuesta `P3-04`, fuera del catálogo). El SQL de M8 y M9 **no está ejecutado** (D4-6, D4-7). Comandos **previstos, ninguno probado**.

#### Prompt de `P4-01`

```text
PAQUETE P4-01 — Puerto de pagos, adaptador fake y modelo de pagos
Ficha: 10 §5, P4-01. Prompt maestro: 11 §2.
Prerrequisitos: P3-01 cerrado (Reservation y Attendee; M7 aplicada); env con PAYMENT_PROVIDER y la prohibición de fake en producción (P0-04); arnés y barreras (P0-05).
Lee antes: la ficha; 03 §3.3 (Payment, PaymentEvent), §4.4 (P-1 a P-6), §8.2 (clave compuesta de pago), §8.3 (ck_pay_*, ck_pe_*), §8.4 (tg_payment_guard y el bloque [P4-01] de fn_check_reservation), §8.5, §9.1 (M8); 05 §6.1 (puerto), §6.3 (fake) y §6.4; 02 §7.2 (dos grafos: el almacén del fake es único); 08 §3.4.1 (PAG-D3).
Cambios esperados: migración M8 (p4_01_pagos) y schema.prisma (PaymentProvider, PaymentStatus, PaymentEventOutcome, Payment, PaymentEvent); SQL manual: ck_pay_amounts, ck_pay_state, ck_pay_attempt, ck_pe_fields, clave compuesta (reservationId, amountCents) -> Reservation(id, totalCents), únicos (reservationId, providerOrderId, providerCaptureId, (provider, providerEventId)), tg_payment_guard, CREATE OR REPLACE fn_check_reservation con el bloque [P4-01] y el disparador diferido _p, GRANT S,I,U en Payment y S,I en PaymentEvent; src/modules/payments/domain (PaymentGateway con createOrder, captureOrder, getOrder y verifyWebhook; OrderSnapshot, CaptureOutcome, GatewayError); adaptador fake en infra/fake (almacén de órdenes en el registro global del proceso, compuerta fake.gate/waitInFlight/release, modos RETURN_SAME, FAIL_SECOND, CREATE_TWO y DUPLICATE_INVOICE, regla «una orden se captura una sola vez», program(...), calls(op), ids FAKE-, firma de webhook HMAC con FAKE_PAYMENT_WEBHOOK_SECRET); getGateway() por PAYMENT_PROVIDER que rechaza fake con APP_ENV=production; helpers de prueba del fake. Fuera: pantalla /pasarela-simulada (P4-04), servicios de inicio y captura (P4-04), webhook y conciliación (P4-05), adaptador PayPal (P4-06).
Reglas: Payment.amountCents y currency son inmutables y el importe esperado es el total de la reserva; PaymentEvent guarda solo el digest y un summary con claves permitidas; approvalUrl y cuerpos de PayPal nunca en registros; una migración aplicada no se edita.
Pruebas por ID. Se comprueban al cerrar: T-DB-01 (a, b, c, d, e en lo del bloque de pagos —CONFIRMED sin captura y DISCREPANT sin revisión—, f con importe distinto del total, g con dos pagos sin providerOrderId, h e i), T-DB-02, T-SEG-07 (07a sobre Payment y PaymentEvent) y las pruebas de CONFORMIDAD del fake que exige PAG-D3 (compuerta, modos, calls, firma HMAC, clave repetida). Con datos preparados desde P4-01: T-RES-11f (HELD vencida con Payment ORDER_CREATED). Dependen de otro paquete: T-PAG-01, 02, 03 y 18 (servicio de inicio, P4-04), T-PAG-21 (contrato del adaptador PayPal con respuestas grabadas, P4-06); el hook de reloj acelerado del E2E (D4-3, definir aquí o en P4-04). SOLO CON PAYPAL SANDBOX (Q-08, PENDIENTE): que el fake aproxime la conducta real de la clave repetida y de la captura, y T-PAG-24.
Verificación (PREVISTOS, no probados): npx prisma validate; npm run db:migrate; npm run db:generate; npm run test:unit; npm run test:integration; npm run build.
Evidencia en docs/evidencias/P4-01/: salida de migrate y de la sonda de deriva, informe de T-DB-01 y de la conformidad del fake; informe de 11 §3 con lo que quedó para P4-04.
Decisiones que te afectan: D4-3 (reloj acelerado, solo con APP_ENV=test y PAYMENT_PROVIDER=fake), D4-6 (nombres de restricciones y updateMany con captureAttemptKey null en Prisma 7.10.1).
Terminas cuando: M8 se aplica desde cero, la segunda migrate no propone cambios, T-DB-01, T-DB-02, T-SEG-07 y la conformidad del fake pasan, getGateway rechaza fake en producción y el informe habilita P4-02.
Si quedas a medias: no edites una migración aplicada; en local db:reset solo con autorización; no dejes el fake accesible con APP_ENV=production.
```

#### Prompt de `P4-02`

```text
PAQUETE P4-02 — Modelo de entradas, llavero y servicio de emisión
Ficha: 10 §5, P4-02. Prompt maestro: 11 §2.
Prerrequisitos: P3-01 Y P4-01 cerrados (dependencia conservada: M9 sigue a M8 y redefine fn_check_reservation con los bloques [P4-01] y [P4-02]); TICKET_KEYRING y TICKET_ACTIVE_KEY_ID validados (P0-04); shared/security (P1-01 y P1-02).
Lee antes: la ficha; 03 §3.3 (Ticket), §4.5 (T-1 a T-3), §8.3 y §8.4 (tg_ticket_guard y el bloque [P4-02]), §9.1 (M9); 05 §7 (token, hash, cifrado, llavero y rotación); 02 §4 (issueTicketsInTx); 09 §4 (scripts); 08 §3.5 (T-ENT-01, 02, 12, 15).
Cambios esperados: migración M9 (p4_02_entradas) y Ticket con TicketStatus; SQL manual: ck_ticket_token, ck_ticket_state, longitud de tokenNonce y de tokenCiphertext (48 si se cifran los 32 bytes brutos, 63 si el texto TC1.…: decisión D4-4, propuesta 48), únicos attendeeId y tokenHash, tg_ticket_guard, CREATE OR REPLACE fn_check_reservation con los bloques [P4-01] y [P4-02] y el disparador diferido _t, GRANT S,I,U sin DELETE; src/modules/tickets (token de 32 bytes de crypto.randomBytes con texto TC1. + base64url, tokenHash = SHA-256 de los 32 bytes, cifrado AES-256-GCM con nonce de 12 bytes y el id de la entrada como dato asociado: el id lo genera la aplicación ANTES de cifrar, llavero k1:<base64>[,k2:…], issueTicketsInTx(tx, reservation, attendees, now): UNA entrada por asistente, inserción en lote SIN ignorar duplicados, dentro de la transacción de quien la llama); scripts/rotate-ticket-key.ts y scripts/reissue-tickets.ts (tickets:rotate-key y tickets:reissue); fábrica sembrarReserva({ estado: 'CONFIRMED' }) COMPLETA (pago CAPTURED y entradas, con el migrador y en una transacción) y sembrarEntradas con datos preparados. Fuera: pantallas y QR (P5-01), consulta e ingreso (P5-02), la liquidación que llama a issueTicketsInTx (P4-03).
Reglas: el token nunca en URL, registros ni auditoría; una entrada USED es terminal; la rotación no cambia el token (solo recifra) y es idempotente y reanudable; perder una clave del llavero impide mostrar el QR (RB-10); una migración aplicada no se edita.
Pruebas por ID. Se comprueban al cerrar: T-ENT-01 (01a a 01d), T-ENT-02 en lo directo (02b: un segundo issueTicketsInTx falla por unicidad y revierte todo), T-ENT-12 (12a y 12b), T-ENT-15 (15a a 15c), T-DB-01 (a, b, c, d con Ticket USED, e con entradas de una reserva no CONFIRMED, h e i), T-DB-02 y T-SEG-07 (07a sobre Ticket). DATOS PREPARADOS DESDE P4-02 (sin ejecutar la liquidación) habilitan las pruebas anteriores que necesitan una reserva CONFIRMED con pago y entradas: T-OFE-15a, la conservación de pagos y entradas de T-OFE-16a, la parte CONFIRMED de T-OFE-22a, T-RES-11g, T-RES-12d, T-RES-15f (una CONFIRMED queda fuera del límite de tres) y T-RES-07f tras confirmar. Requieren EJECUTAR LA LIQUIDACIÓN (P4-03): T-ENT-02a y 02c y todo T-PAG de liquidación. Dependen de otros paquetes: T-ENT-03 y 04 (P5-01), T-ENT-05 a 11, 13 y 14 (P5-02 y P5-03). SOLO CON PAYPAL SANDBOX: nada (esta área no depende de PayPal; Q-08 sigue pendiente para T-PAG-24).
Verificación (PREVISTOS, no probados): npm run db:migrate; npm run test:unit; npm run test:integration; npm run tickets:rotate-key y npm run tickets:reissue contra la base de pruebas.
Evidencia en docs/evidencias/P4-02/: informes de T-ENT-01, 12 y 15 y la prueba de que el token no aparece en Ticket, AuditEvent ni PaymentEvent (01d); informe de 11 §3 con la longitud elegida del texto cifrado.
Decisiones que te afectan: D4-4 (longitud de tokenCiphertext: decide al escribir M9 y deja el CHECK y el cifrado coherentes), D4-7 (disparadores diferidos con Ticket insertada con la reserva CONFIRMED en la misma transacción).
Terminas cuando: M9 se aplica desde cero, las pruebas de «al cerrar» pasan, la fábrica de reservas CONFIRMED completa funciona, la rotación es idempotente y el informe habilita P4-03 y las pruebas de la clase de datos preparados.
Si quedas a medias: no edites una migración aplicada; RB-10 para el llavero; no dejes emisión sin comprobación diferida.
```

#### Prompt de `P4-03`

```text
PAQUETE P4-03 — Liquidación: confirmación atómica y casos en revisión
Ficha: 10 §5, P4-03. Prompt maestro: 11 §2.
Prerrequisitos: P4-01, P4-02 y P3-03 cerrados (al empezar ya existen M8 y M9 y fn_check_reservation tiene sus tres bloques); lockOffer, countCommitted con exclusión, Clock y recordAudit; fábricas crearReservaConPago e instantaneaCompleta.
Lee antes: la ficha; 04 TX-09 (§§1 a 8), §1 y §2 (orden de bloqueos y now tras ellos); 03 §4.3 (R-2 a R-7), §4.4 (P-3, P-4, P-5b) y §4.5 (T-1), §8.4; 05 §6.1; 06 §2 (amenazas de pagos y webhooks); 08 §3.4.1, §3.4.3 y §3.5 (T-ENT-02).
Cambios esperados: src/modules/payments/domain/{classify.ts (K0a, K0b, K1, K2, K3, K4), decide-settlement.ts (reglas L-01 a L-18)} como funciones PURAS; src/modules/payments/application/settle-payment.ts; uso de issueTicketsInTx; tests/helpers. settlePayment(input, { clock }) recibe una instantánea YA TRADUCIDA o evidencia y NO llama a la pasarela ni autoriza: cada invocador (P4-04, P4-05 y P4-07) autoriza y llama a PayPal FUERA de la transacción. DENTRO de UNA transacción: lecturas previas solo de columnas inmutables, bloqueos Offer -> Reservation -> Payment, now tomado TRAS el último bloqueo, comprobación de evento ya registrado y decisión de la tabla; CONFIRMAR = pago CAPTURED (capturedAmountCents = amountCents) y cierre del intento (captureAttemptKey a NULL en el mismo UPDATE, ck_pay_attempt), reserva CONFIRMED con confirmedAt, issueTicketsInTx con UNA ENTRADA POR ASISTENTE, PaymentEvent si hay evento y auditoría reservation.confirm (late, ticketsIssued): todo o nada, y la comprobación diferida rechaza un CONFIRMED sin pago CAPTURED o sin exactamente quantity entradas; captura tardía (L-10 con cupo; L-11 sin cupo, oferta no abierta o actividad iniciada: pago CAPTURED y reserva REVIEW_REQUIRED sin entradas); discrepancias (L-08, sin providerCaptureId si la referencia no coincide); incierto, K0a solo con la clave del intento y monotonía (L-12 a L-17); aviso REFUND_AFTER_CONFIRMATION; 23505, BUSY_TRY_AGAIN, 40P01 y defectos TC_ => INTERNAL_ERROR; ningún parche toca amountCents ni currency. Fuera: inicio de pago y captura (P4-04), webhook y J2 (P4-05), adaptador PayPal (P4-06), pantallas del administrador (P4-07).
Reglas: una reserva CONFIRMED nunca se degrada ni reemite entradas; un choque de unicidad en Ticket es un DEFECTO que revierte todo; ningún plazo vuelve concluyente a K0b; sin cuerpos de proveedor, nombres ni fechas en reviewDetail, PaymentEvent ni auditoría (PC-PAG-2).
Pruebas por ID. Se comprueban al cerrar, ejecutando la liquidación con instantáneas escritas a mano: unitarias L-01 a L-18, classify y la regla de K0b; integración con los disparadores diferidos activos: T-PAG-05, 06 (06a y 06b), 07 (07a, 07b, 07c: 07c comprueba la reversión total), 09, 10, 11, 12 y 17 en los subcasos de settlePayment directo (rótulos de 08 §3.4.3; anota la correspondencia con TX-09.8, D4-1), 13 (y 13a), 14 (y 14c), 15 (15a y 15b), 16, T-ENT-02 (02a y 02c) y PC-PAG-1 al final de cada prueba. Dependen de otros paquetes: T-PAG-06c a 06e y 12 por la captura (P4-04), T-PAG-01 a 04, 18, 23 y 25 (P4-04), T-PAG-07d, 06g, 17 por webhook, 19 y 20 (P4-05), T-PAG-14d y 14e (P4-05 y P4-07), T-PAG-21 (P4-06). SOLO CON PAYPAL SANDBOX (Q-08, PENDIENTE): que las instantáneas escritas a mano reflejen las respuestas reales (estados, importes, errores de captura, consistencia de getOrder tras capturar), la verificación real de un webhook y T-PAG-24.
Verificación (PREVISTOS, no probados): npm run test:unit; npm run test:integration; npm run test:concurrency (barrera offer, en ambos órdenes de PC-OFE-3); npm run build.
Evidencia en docs/evidencias/P4-03/: informes de L-01 a L-18 y de PC-PAG-1; informe de 11 §3 que indique qué subcasos usó cada paquete y qué espera a P4-04 a P4-07.
Decisiones que te afectan: D4-1 (reparto y rótulos repetidos de T-PAG-06, 07, 12 y 17), D4-6 y D4-7 (Prisma, disparadores diferidos).
Terminas cuando: las pruebas de «al cerrar» pasan, la confirmación y la emisión son UNA transacción demostrada (07c), PC-PAG-1 se cumple en cada prueba y el informe habilita P4-04.
Si quedas a medias: solo código; ante un COMMIT fallido nada queda aplicado; no dejes una confirmación sin sus entradas.
```

### 4.7 Fase 4 (continuación) — `P4-04` a `P4-07`

**Reglas de este lote (valen para los cuatro prompts, no se repiten).**
- **Orden:** `P4-04`, `P4-05`, `P4-06`, `P4-07`. `P4-05` depende de `P4-03` **y `P4-04`** (reutiliza `claimCaptureAttempt`, `driveCapture` y `getOrderWithRetries`); `P4-06` de `P4-04` y `P4-05`; **`P4-07` de `P4-03` y `P4-05`** (necesita `checkGateway`, los casos agotados y los avisos de reembolso que escriben J2 y el webhook) y puede hacerse antes de `P4-06`. **Prerrequisito:** `P4-01` a `P4-03` cerrados.
- **Las llamadas a PayPal van siempre fuera de una transacción** de base de datos y la liquidación (`settlePayment`) recibe instantáneas ya traducidas.
- **Una captura incierta se reanuda con la MISMA clave** (`captureAttemptKey`); una clave nueva solo existe tras un **rechazo definitivo** de esa solicitud. Cerrar un intento exige evidencia concluyente, nunca un plazo, una consulta sin captura ni el agotamiento de la conciliación.
- **El calendario de conciliación es PROPUESTA** (`RECONCILE_DELAYS_MIN` y `MAX_CHECKS = 13`, ≈ 76 h; D4-10): impleméntalo como constantes de dominio y regístralo como pendiente de confirmar.
- **Qué demuestra el `fake`:** todo lo de `P4-04` a `P4-07` se automatiza con el `fake` o con instantáneas manuales y demuestra **nuestra** lógica. **`T-PAG-24` y EV-07 siguen PENDIENTES por Q-08** y requieren, además, un despliegue alcanzable (`PE-02`, D4-16): ningún prompt las da por hechas.
- **J4 queda fuera** (propuesta `P3-04`, fuera del catálogo). Comandos **previstos, ninguno probado**.

#### Prompt de `P4-04`

```text
PAQUETE P4-04 — Inicio de pago, retorno y captura
Ficha: 10 §5, P4-04. Prompt maestro: 11 §2.
Prerrequisitos: P4-03 y P3-02 cerrados (settlePayment, el fake con compuerta y modos, /panel/reservas/[id], lockOffer).
Lee antes: la ficha; 04 TX-07 (§§1 a 7) y TX-08 (§§0 a 7) y los principios de §1; 05 §2, §3.4 y §6.1; 07 §4.3 (reserva retenida, retorno, cancelado y pasarela simulada); 03 §4.4 (P-1, P-2, P-5, P-5b); 08 §3.4.3 y T-PAG-25.
Implementar: startPayment (fase A bajo el bloqueo de la reserva con now posterior y margen de 30 s; INSERT Payment CREATED ANTES de llamar; createOrder con idempotencyKey = createKey(paymentId), custom_id = reservationId, invoice_id = paymentId y description constante; fase B UPDATE ... WHERE status = 'CREATED'; la URL solo se entrega tras guardar la orden); capturePayment (validaciones en orden con la de intento en curso antes que HOLD_EXPIRED; claimCaptureAttempt con arrendamiento de 60 s que SOLO EXCLUYE; MISMA CLAVE al reanudar un resultado incierto y clave nueva solo tras un rechazo definitivo; getOrder hasta 2 veces; IN_PROGRESS no es un error; settlePayment con snapshot o evidence; reintento de BUSY_TRY_AGAIN); startPaymentAction y capturePaymentAction (05 §3.4); páginas de retorno (nunca capturan al cargar; componente que envía la captura por POST y botón «Confirmar pago» sin JavaScript) y cancelado; /pasarela-simulada/[orderId] solo con fake (404 si no); «Pagar con PayPal» en /panel/reservas/[id]. Cambios en src/modules/payments/application, páginas, acciones y tests.
Reglas: ninguna redirección del navegador confirma un pago; ningún importe ni estado del cliente; llamadas a la pasarela fuera de transacción (peor caso ≈ 31 s); recurso ajeno => NOT_FOUND; no hay API para buscar una orden por invoice_id (04 §5.2).
Pruebas por ID. Al cerrar, con el fake: T-PAG-01 (01a a 01c), 02 (02a a 02c), 03 (03a a 03c), 04 (04a a 04e), 06 (06c1, 06c2, 06d, 06d', 06e: la misma clave k1 se ve dos veces en fake.calls), 12 (12a a 12i; 12i falta en el catálogo y va aquí), 18 (18a a 18g), 23 (23a a 23c), las unitarias (createKey, mapDrive, claimCaptureAttempt que nunca inicia un intento en modo RECONCILER, el 4xx no reconocido como UNCERTAIN), T-RES-19 paso 4 y T-PAG-25 hasta «reserva confirmada». Dependen de otro paquete: T-PAG-25 paso 2 «sus entradas» (P5-01) y el reloj acelerado (D4-3); el rescate de un intento desconocido por J2 (T-PAG-20, P4-05). SOLO CON PAYPAL SANDBOX (Q-08, PENDIENTE): que PayPal devuelva la misma orden al repetir la creación, la conducta real de la clave repetida en captura y los errores 422 reales (T-PAG-24).
Verificación (PREVISTOS, no probados): npm run test:unit; npm run test:integration; npm run test:concurrency; npm run test:e2e (PAYMENT_PROVIDER=fake); npm run build.
Evidencia en docs/evidencias/P4-04/: informes y las llamadas del fake que muestran la misma clave al reanudar; informe de 11 §3.
Decisiones que te afectan: D4-3 (reloj acelerado), D4-12 (12i), D4-14 (intervalo de consulta del estado local en «Confirmando tu pago…»).
Terminas cuando: las pruebas de «al cerrar» pasan, ninguna ruta del navegador confirma por sí misma, reanudar usa SIEMPRE la misma clave y el informe habilita P4-05.
Si quedas a medias: solo código; no dejes una clave nueva sobre un intento abierto.
```

#### Prompt de `P4-05`

```text
PAQUETE P4-05 — Webhook y conciliación automática
Ficha: 10 §5, P4-05. Prompt maestro: 11 §2.
Prerrequisitos: P4-03 Y P4-04 cerrados (settlePayment, claimCaptureAttempt, driveCapture, getOrderWithRetries; planificador y fake con verifyWebhook).
Lee antes: la ficha; 04 TX-10 (§§1 a 9) y TX-11 (§§1 a 9); 05 §4 y §6.2; 03 §4.4 (P-6); 02 §11.1 (J2 y J3); 06 §3.2 (A-25); 08 §3.4.1 y §3.4.3.
Implementar: POST /api/pagos/paypal/webhook (cuerpo en bytes sin transformar con tope de 256 KB => 413, cabeceras exigidas => 400, SIN cookie ni Origin, verifyWebhook: INVALID => 400 con DENIED y UNAVAILABLE => 503, nunca 400; presupuesto WEBHOOK_BUDGET_MS); las categorías de TX-10.2 (duplicado, tipo no suscrito, orden desconocida => 200 e ignorado, normal o fuera de orden, CONTRADICTORIO => no se registra, nextCheckAt adelantado ≈ 30 s y 200; pasarela no disponible o BUSY => 200 pending si se escribió el trabajo, 503 si no); settlePayment con origin WEBHOOK y el aviso REFUND_AFTER_CONFIRMATION; J2 reconcile-payments (cada 60 s y al arrancar): reclama la comprobación con checkAttempts y nextCheckAt condicionados, consulta getOrder y liquida; REANUDA un intento desconocido con la MISMA clave mientras la retención esté vigente con margen y NUNCA inicia un intento; AGOTAMIENTO: tras la comprobación 13, settlePayment con snapshot null y context RECONCILIATION_EXHAUSTED ESCALA a REVIEW_REQUIRED (UNCERTAIN_RESULT) y cierra solo el calendario (lastErrorCode RECONCILE_EXHAUSTED); EL INTENTO SIGUE ABIERTO con su clave y el pago ORDER_CREATED: no se cierra por plazo; checkGateway (solo consulta, nunca captura ni toca el calendario); auditoría webhook.receive y payment.reconcile; helpers runReconcilePayments y calendario(k). CALENDARIO: constantes de dominio, PROPUESTA pendiente (D4-10).
Reglas: el cuerpo del webhook solo se hashea (payloadDigest); importe, moneda y estados del evento se ignoran (la verdad es getOrder); el webhook acelera, no es la fuente de verdad; ningún límite por origen para firmas inválidas todavía (A-25, D4-13).
Pruebas por ID. Al cerrar, con el fake y firma HMAC local: T-PAG-07 (07d), 08 (08a y 08b), 17 (17a, 17c, 17d, 17e), 22, 26 (26a a 26d), 06 (06g), 19 en el SERVICIO checkGateway (19a a 19c y 19e), 20 (20a a 20j y 20k de 08: el caso escalado se aplica tras el agotamiento y escalar no equivale a cerrar), T-OPS-06 en lo de J2 y las unitarias del calendario (horas de la tabla, scheduleNext en la 13.ª, claimCheck). Dependen de otro paquete: la acción, los permisos y las pantallas de T-PAG-19 y 14d y 14e con origen administrador (P4-07); T-PAG-21 (P4-06). SOLO CON PAYPAL SANDBOX (Q-08, PENDIENTE): la verificación real por postback, el plazo real de respuesta del webhook, las reentregas reales, la vida de una orden y la búsqueda por invoice_id; los eventos del simulador no cuentan.
Verificación (PREVISTOS, no probados): npm run test:unit; npm run test:integration; npm run test:concurrency; npm run build.
Evidencia en docs/evidencias/P4-05/: informe de 20d con el listado de comprobaciones por hora y la prueba de que captureAttemptKey se conserva; informe de 11 §3 que declare el calendario como propuesta.
Decisiones que te afectan: D4-10 (calendario: si cambia, cambian 20d, 20h y 20k), D4-11 (reparto de T-PAG-19), D4-13 (A-25), D4-15 (plazos del webhook).
Terminas cuando: las pruebas de «al cerrar» pasan, un caso agotado queda ESCALADO y su intento abierto, los códigos del webhook coinciden con 05 §4 y el informe habilita P4-06 y P4-07.
Si quedas a medias: solo código; J2 recoge lo vencido al arrancar; no dejes el calendario cerrando intentos.
```

#### Prompt de `P4-06`

```text
PAQUETE P4-06 — Adaptador PayPal Sandbox
Ficha: 10 §5, P4-06. Prompt maestro: 11 §2.
Prerrequisitos: P4-04 y P4-05 cerrados (puerto, servicios y fake de referencia); PAYPAL_* validadas (P0-04). Para T-PAG-24 hacen falta credenciales de Sandbox (Q-08) y una URL pública HTTPS (despliegue, PE-02): NO son prerrequisito para cerrar este paquete.
Lee antes: la ficha; 05 §6.1, §6.2 y §6.4; 04 §4 y §5 (grado de cada fuente); 06 §3.5 (CSP y form-action); 02 §5.4 (sin SDK); 08 §3.4.1 a §3.4.3 (T-PAG-21 y 24).
Implementar (src/modules/payments/infra/paypal): cliente fetch con AbortSignal.timeout de 10 s y solo el anfitrión de Sandbox, OAuth 2 de credenciales de cliente con el token en memoria; createOrder (intent CAPTURE, custom_id, invoice_id, user_action PAY_NOW, shipping_preference NO_SHIPPING, PayPal-Request-Id de 36 caracteres) y enlace payer-action o approve; captureOrder con PayPal-Request-Id = la clave del INTENTO (la misma al reanudar) y Prefer return=representation, con los 422 traducidos por issue (ORDER_NOT_APPROVED y PAYER_ACTION_REQUIRED => NOT_APPROVED, INSTRUMENT_DECLINED => DECLINED, ORDER_ALREADY_CAPTURED => ALREADY_CAPTURED); un 4xx no reconocido y un tiempo agotado => UNCERTAIN, NUNCA rechazo; getOrder con la captura en purchase_units[0].payments.captures[0]; verifyWebhook por postback con el cuerpo sin volver a serializar y UNAVAILABLE distinto de INVALID; importes como texto decimal a centavos exactos; la fábrica elige paypal solo con PAYMENT_PROVIDER=paypal; tests/contract/paypal con respuestas grabadas (hoy solo existen las del fake); docs/evidencias/P4-06/.
Reglas: sin SDK de navegador (D-37); sin credenciales en el repositorio, en CI ni en registros; cuerpos y cabeceras solo por un selector de campos; el diseño no depende de lo no confirmado de PayPal (04 §5.2).
Pruebas por ID. COMPROBACIONES CON EL ADAPTADOR FAKE (se hacen al cerrar): T-PAG-21 (21a, nivel K) contra las respuestas grabadas DEL FAKE: traducción a los tipos del puerto, 4xx no reconocido y tiempo agotado como UNCERTAIN, 5xx como UNAVAILABLE, DUPLICATE_INVOICE_ID, importes sin coma flotante, firma inválida frente al verificador caído, ningún dato personal; la fábrica rechaza cualquier base que no sea de Sandbox. PENDIENTE POR Q-08: T-PAG-24 (manual: compra completa con la cuenta personal, repetir «Pagar», cancelar y volver, webhook real por postback, reenvío, firma alterada, rechazo del medio de pago, corte de red), las respuestas grabadas REALES de Sandbox que sustituirán a las del fake, la conducta real de la clave de idempotencia, la vida de una orden y form-action con la redirección a PayPal. EV-07 queda PENDIENTE: NO la crees ni la simules y no afirmes T-PAG-24 hecha hasta que se ejecute y se guarde con fecha y versión (sin credenciales). Este paquete puede cerrarse «con pendientes manuales» (RE-11).
Verificación (PREVISTOS, no probados): npm run test:unit y la suite tests/contract/paypal con PAYMENT_PROVIDER=fake; T-PAG-24 solo a mano con PAYMENT_PROVIDER=paypal, PAYPAL_API_BASE de Sandbox y credenciales de la persona operadora.
Evidencia en docs/evidencias/P4-06/: informe de T-PAG-21 con el origen de cada respuesta grabada (fake) y la lista de lo pendiente por Q-08; informe de 11 §3.
Decisiones que te afectan: D4-16 (T-PAG-24 exige credenciales y despliegue; PE-02), D4-19 (las respuestas reales de Sandbox no existen).
Terminas cuando: T-PAG-21 pasa con el fake, el adaptador cumple el puerto sin cambiar ninguna firma, no hay credenciales en el repositorio y el informe declara T-PAG-24 y EV-07 como pendientes por Q-08.
Si quedas a medias: vuelve a PAYMENT_PROVIDER=fake; nunca dejes credenciales ni respuestas con datos reales guardadas.
```

#### Prompt de `P4-07`

```text
PAQUETE P4-07 — Casos en revisión del administrador
Ficha: 10 §5, P4-07. Prompt maestro: 11 §2.
Prerrequisitos: P4-03 y P4-05 cerrados (settlePayment, checkGateway, J2 que escribe los casos agotados y el webhook que escribe los avisos de reembolso); panel del administrador (P1-02). Puede hacerse antes de P4-06.
Lee antes: la ficha; 05 §2 (/panel/admin/revision-pagos con sus secciones A y B y la nota de resumen de avisos) y §3.4 (checkGatewayAction); 07 §4.8 y §4.9; 04 TX-11.1 a TX-11.3, TX-09 (L-17) y TX-10.3; 03 §3.4.2; 08 §3.4.3 (T-PAG-19, 14d, 14e, 20h, 20k).
Implementar: sección A de /panel/admin/revision-pagos: reservas REVIEW_REQUIRED con motivo, importe esperado y antigüedad (reviewFlaggedAt, la más antigua primero), con la etiqueta «Conciliación automática agotada» (lastErrorCode RECONCILE_EXHAUSTED) y el filtro «Solo agotados»; sección B SOLO LECTURA: lectura FIJA de AuditEvent con action payment.reconcile, result CONFLICT y reasonCode REFUND_AFTER_CONFIRMATION, orden occurredAt descendente, paginada (tamaño por fijar), sin filtros del cliente y sin Server Action nueva, mostrando fecha, origen, paymentId y la reserva resuelta en el servidor y NUNCA actorUserId, ipHash, nombres ni fechas de nacimiento, sin estado «atendido»; detalle del caso con AdminPaymentSummary y «Consultar pasarela» (checkGatewayAction, rol ADMIN, solo REVIEW_REQUIRED, texto fijo «Consulta, no captura; no cambia el calendario»); BANNER del caso agotado («el sistema no afirma que no hubo cargo… se resuelve fuera del sistema (RB-09)») SIN botón de cerrar ni liberar; detalle de un aviso de reembolso SOLO LECTURA y sin «Consultar pasarela»; otro rol => 404 en la ruta y FORBIDDEN en la acción; fila de la matriz de permisos. La lectura de la sección B no se audita (propuesto).
Reglas: el administrador no ve datos personales (01 §8.5); un reembolso hecho fuera del sistema NO cierra el caso dentro de la aplicación (sigue en REVIEW_REQUIRED; el estado «resuelto fuera del sistema» es pendiente de diseño, 09 §7.3); no se ofrece ninguna acción sobre los avisos.
Pruebas por ID. PRUEBAS DE SERVICIO (checkGateway) de T-PAG-19 (19a a 19c y 19e): ya cerradas en P4-05; aquí NO se rehacen. PRUEBAS DE ACCIÓN, PERMISOS Y PANTALLA, al cerrar: T-PAG-19 (19d: permisos y errores de checkGatewayAction, con la fila de T-SEG-04, y el resumen mostrado), T-PAG-14d y 14e con origen administrador, T-PAG-20h y 20k (variante del administrador) y pruebas de las dos secciones (el caso agotado aparece con su etiqueta; el aviso de reembolso aparece solo en lectura, sin nombres ni fechas de nacimiento en el HTML ni en la carga de datos). Dependen de otro paquete: las comprobaciones manuales de 07 §7.1 de estas pantallas (PE-03). SOLO CON PAYPAL SANDBOX (Q-08, PENDIENTE): que getOrder real muestre la captura o el reembolso que el administrador espera (T-PAG-24).
Verificación (PREVISTOS, no probados): npm run test:integration; npm run test:e2e; npm run test:a11y; npm run build.
Evidencia en docs/evidencias/P4-07/: informes y la prueba de que no hay nombres en el HTML; informe de 11 §3.
Decisiones que te afectan: D4-11 (reparto de T-PAG-19), D4-17 (valores definitivos de reason y availability, ilustrativos en 05 §6.6, y tamaño de página de los avisos).
Terminas cuando: las pruebas de acción, permisos y pantalla pasan, las secciones A y B son las del contrato, la sección B es solo lectura y el informe habilita la fase 5.
Si quedas a medias: solo código; no dejes botones sobre los avisos.
```

### 4.8 Fase 5 — Entradas e ingreso (`P5-01` a `P5-03`)

**Reglas de la fase 5 (valen para los tres prompts, no se repiten).**
- **Orden:** `P5-01`, `P5-02`, `P5-03`. `P5-01` depende de `P4-03` y `P3-02`; **`P5-02` de `P4-02`, `P4-03` y `P2-04`** (**`P4-03` se conserva como prerrequisito**: los datos de prueba, `sembrarEntradas` de ENT-D4, se crean **mediante `settlePayment`**, la emisión real y no SQL); `P5-03` de `P5-02`. **Prerrequisito:** las fases 0 a 4 cerradas (la fase 1 completa para la matriz de permisos y `no-store`).
- **Tres funciones separadas:** **descarga del comprador** (`P5-01`: imagen QR y código de texto de su reserva confirmada), **consulta del operador** (`P5-02`: `lookupTicketAction`, que **nunca consume**) y **registro del ingreso** (`P5-02`: `checkInTicketAction`, la única que consume `VALID → USED`, en un segundo paso con su propio botón). La cámara (`P5-03`) solo rellena el código de la consulta.
- **D-79:** consultar y registrar **no miran `Offer.status`**: una oferta `SUSPENDED` o `ARCHIVED` con entradas emitidas sigue admitiendo ingreso; la ventana horaria, el rol, la atracción, la actividad seleccionada y la reserva `CONFIRMED` se siguen aplicando. Cobertura: operador en T-ENT-06a a 06d y 10d; comprador en **T-ENT-03f, que es una PROPUESTA** (hoy ninguna prueba la cubre).
- **Verificación local:** toda la fase se prueba **con el `fake` y la liquidación real**, sin PayPal. **Siguen PENDIENTES:** **`T-ENT-14d`, prueba MANUAL** con cámara y QR reales (no depende de Sandbox) y, en Sandbox (**Q-08**), el paso 1 de `T-PAG-24` (entradas tras una captura real) y EV-07: ningún prompt las da por hechas.
- **Decisiones abiertas de la fase (se registran como tales; cada prompt remite a las pruebas afectadas):** D5-2 (longitud de la copia cifrada, 48 o 63: T-ENT-01 (01b, 01c), T-ENT-12, T-ENT-03a y T-DB-01c), D5-3 (frontera horaria del ingreso: T-ENT-10 (10a a 10d), 06a (iii), 06b1), D5-4 (respuesta sin sesión de la descarga, propuesta 401: T-ENT-03 (03b), T-SEG-04 (04c, 04h), T-SEG-03a), D5-5 (umbral y alcance del límite de 30 consultas por minuto, A-30: T-ENT-11 (11a a 11d)) y D5-6 (consulta previa exigida o no: T-ENT-06e).
- **J4 queda fuera** (propuesta `P3-04`, fuera del catálogo). Comandos **previstos, ninguno probado**.

#### Prompt de `P5-01`

```text
PAQUETE P5-01 — Entradas del comprador y descarga de QR
Ficha: 10 §5, P5-01. Prompt maestro: 11 §2.
Prerrequisitos: P4-03 y P3-02 cerrados: existen entradas VALID emitidas por settlePayment (una por asistente), el llavero con sus claves, el descifrado de tokenCiphertext con el id de la entrada como dato asociado y /panel/reservas/[reservationId].
Lee antes: la ficha; 03 §3.3 (Ticket) y §4.5 (T-1); 04 TX-09 (emisión); 05 §3.5 (revealTicketCodeAction), §4 (GET /api/entradas/[ticketId]/qr) y §7; 07 §4.3 (reserva confirmada y D-79); 06 §3.5; 08 §3.5.1, §3.5.3 (T-ENT-03 y 04) y §3.7 (T-SEG-03, 05).
Implementar: GET /api/entradas/[ticketId]/qr con cookie (comprador dueño y reserva CONFIRMED): PNG cuyo contenido es SOLO el token TC1.… descifrado de la copia, Content-Type image/png, Cache-Control no-store, X-Content-Type-Options nosniff y, con ?descarga=1, Content-Disposition attachment; recurso ajeno, inexistente o ticketId que no es UUID => 404 IDÉNTICO en cuerpo y cabeceras; OPERATOR, GAD y ADMIN no obtienen acceso; la respuesta SIN SESIÓN es una DECISIÓN ABIERTA (D5-4: propuesta 401 UNAUTHENTICATED con no-store, distinta del 404); revealTicketCodeAction (devuelve { code } con no-store solo al comprador y audita ticket.reveal_code con SOLO reservationId); tarjeta por asistente en /panel/reservas/[id] (nombre, Válida o Usada el …, QR con alt «Código QR de la entrada de {nombre}» sin el token, «Descargar», «Copiar código»); D-79: con la oferta SUSPENDED o ARCHIVED la reserva muestra «Las ventas de esta actividad están cerradas; tus entradas siguen siendo válidas» y la descarga y el código siguen funcionando; fila de la matriz de permisos para el handler y la acción. Cambios en src/app/api/entradas, application/{get-ticket-image, reveal-ticket-code}.ts, la pantalla de reserva y tests.
Reglas: el token nunca en URL, registros ni auditoría; una clave del llavero que falta da un error sin token (RB-10); la descarga es solo lectura.
Pruebas por ID. Al cerrar, con sembrarEntradas de 5 asistentes (vía settlePayment): T-ENT-03 (03a a 03e), T-ENT-04 (04a y 04b), T-SEG-03a (no-store del QR), la parte del QR de T-SEG-05 y T-PAG-25 pasos 1 a 3 (entradas visibles solo tras la captura). PROPUESTA (no contrato): T-ENT-03f, descarga y revelado con la oferta SUSPENDED y ARCHIVED (D-79 del comprador). Dependen de decisiones abiertas: la respuesta sin sesión (03b, T-SEG-04 04c y 04h, T-SEG-03a: D5-4) y la longitud cifrada (03a, T-ENT-01, T-ENT-12, T-DB-01c: D5-2). Dependen de otro paquete: T-PAG-25 paso 4 (reloj acelerado, D4-3), T-A11Y y las listas MC y MP (PE-03). SOLO CON PAYPAL SANDBOX (Q-08, PENDIENTE): paso 1 de T-PAG-24 (entradas tras una captura real) y EV-07.
Verificación (PREVISTOS, no probados): npm run test:integration; npm run test:e2e; npm run build.
Evidencia en docs/evidencias/P5-01/: informes y la búsqueda del token centinela sin resultados (PC-ENT-3); informe de 11 §3 que registre D5-2 y D5-4 como abiertas y T-ENT-03f como propuesta.
Terminas cuando: las pruebas de «al cerrar» pasan, el token solo existe en la imagen y el código revelado, el 404 es idéntico para terceros y el informe habilita P5-02.
Si quedas a medias: solo código y sin migración; no dejes un handler que sirva QR sin comprobar al dueño.
```

#### Prompt de `P5-02`

```text
PAQUETE P5-02 — Consulta y registro de ingreso
Ficha: 10 §5, P5-02. Prompt maestro: 11 §2.
Prerrequisitos: P4-02, P4-03 Y P2-04 cerrados (P4-03 se conserva: sembrarEntradas confirma la reserva con settlePayment, la emisión real; P2-04 da suspender y archivar); CHECKIN_EARLY_MINUTES validado; principal con la atracción que gestiona.
Lee antes: la ficha; 04 TX-12 (todo) y D-79; 03 §4.5 (T-2), §4.6 y §3.4.2 (ticket.lookup, ticket.check_in); 05 §2 (/panel/ingresos) y §3.5; 07 §4.6; 06 §3.2 (A-30); 08 §3.5.1 a §3.5.3 (T-ENT-05 a 11, 13 y 14).
Implementar. CONSULTA (lookupTicket): rol OPERATOR; límite por operador en memoria; formato TC1. + 43 base64url ANTES de leer la base (si no, TICKET_NOT_FOUND); lectura Ticket -> Attendee -> Reservation -> Offer SIN bloqueos; devuelve EXACTAMENTE { attendeeName, status, usedAt, offerTitle, startsAt, endsAt }; audita ticket.lookup; NUNCA escribe en Ticket. ORDEN DE COMPROBACIÓN de TX-12: atracción gestionada (TICKET_NOT_FOUND idéntico a «no existe»), actividad seleccionada (WRONG_ACTIVITY), reserva CONFIRMED, ventana [startsAt - CHECKIN_EARLY_MINUTES, endsAt] (OUTSIDE_CHECKIN_WINDOW). REGISTRO (checkInTicket): las mismas comprobaciones y, en una transacción corta con now justo antes, UPDATE Ticket SET status='USED', usedAt, usedById WHERE id = $id AND status = 'VALID'; una fila => ingreso con AuditEvent ticket.check_in; cero filas => se relee y TICKET_ALREADY_USED con el MISMO usedAt; no bloquea Offer. DOBLE INGRESO CONCURRENTE: el segundo espera la fila y recibe TICKET_ALREADY_USED; las demás entradas de la reserva no cambian. D-79: ni consulta ni registro miran Offer.status. Selector /panel/ingresos (ofertas OPEN de sus atracciones y las SUSPENDED o ARCHIVED con al menos una entrada emitida, con «N usadas de M emitidas», sin filtrar por ventana; /panel/ingresos/[offerId] ajeno => 404). ALTERNATIVA MANUAL A LA CÁMARA (RA-04): campo para pegar el código SIEMPRE visible, formulario por POST que funciona sin JavaScript, «Consultar» y «Registrar ingreso» como botones DISTINTOS (aria-disabled con la razón en texto), «Cancelar» que limpia sin llamar al servidor y resultado en región polite. El servicio NO exige consulta previa (D5-6). Cambios en src/modules/tickets, las dos acciones, el limitador, las páginas /panel/ingresos y tests/helpers (sembrarEntradas, barrera.ticket, descifrarToken).
Reglas: el token solo en el cuerpo de los POST; el campo no usa autocomplete ni localStorage; la auditoría solo lleva offerId; consultar o escanear nunca consume.
Pruebas por ID. Al cerrar: T-ENT-05 (05a y 05b; 05c con el campo pegado), 06 (06 y 06e), 06a y 06b (D-79: oferta SUSPENDED y ARCHIVED con la actividad en curso, y las demás condiciones se siguen aplicando), 06c (cambio de estado entre consultar y registrar, también con barrera offer), 06d (selector), 07 (07a a 07d: DOBLE INGRESO CONCURRENTE, un éxito y los demás TICKET_ALREADY_USED con el mismo usedAt), 08, 09, 10 (10a a 10d; 10d: la ventana se sigue aplicando con la oferta cerrada), 11, 13 (Cancelar sin petición), 14 (14a solo con teclado y 14b sin JavaScript), T-SEG-01, 04 y 05 para las dos acciones y T-OFE-15a y 16a (partes con entradas), ya habilitadas desde P4-02. Dependen de decisiones abiertas: frontera horaria (T-ENT-10 (10a a 10d), 06a (iii), 06b1: D5-3), umbral y alcance de las consultas (T-ENT-11 (11a a 11d): D5-5), consulta previa (T-ENT-06e: D5-6) y longitud cifrada solo si usas el descifrado (D5-2). Dependen de otro paquete: T-ENT-14c y la lectura de QR de 05c (P5-03). T-ENT-14d es MANUAL y sigue PENDIENTE (P5-03). SOLO CON PAYPAL SANDBOX: nada; las entradas de partida salen de settlePayment.
Verificación (PREVISTOS, no probados): npm run test:integration; npm run test:concurrency (barrera ticket); npm run test:e2e; npm run test:a11y; npm run build.
Evidencia en docs/evidencias/P5-02/: informes de 07a a 07d con ambos órdenes de PC-ENT-1 y de 06a y 06b; informe de 11 §3 que registre D5-3, D5-5 y D5-6 como abiertas.
Terminas cuando: las pruebas de «al cerrar» pasan, consultar no consume nunca, el registro consume una sola vez bajo concurrencia, D-79 se cumple con oferta cerrada y el ingreso se completa solo con teclado y sin cámara; el informe habilita P5-03.
Si quedas a medias: solo código; no dejes un registro que consuma sin la acción explícita.
```

#### Prompt de `P5-03`

```text
PAQUETE P5-03 — Lector con cámara y accesibilidad del ingreso
Ficha: 10 §5, P5-03. Prompt maestro: 11 §2.
Prerrequisitos: P5-02 cerrado (campo manual, consulta y registro); Permissions-Policy camera=(self) (P1-06) y CSP sin wasm ni workers.
Lee antes: la ficha; 07 §4.6 y §7 (MC y MP del ingreso); 06 §3.5; 02 §5.2 (jsqr); 08 §3.5.3 (T-ENT-14, 05c) y §3.7 (T-A11Y-05); 00 §10.4 (BarcodeDetector).
Implementar: componente de cliente del lector en /panel/ingresos/[offerId] con BarcodeDetector y, si no existe, jsqr (sin WebAssembly ni workers); al leer un QR la cámara SE DETIENE hasta «Escanear otra» para no agotar el límite de consultas; el valor leído solo RELLENA el campo y dispara la CONSULTA (leer nunca consume); cámara denegada o inexistente => aviso en texto y el campo manual sigue usable (alternativa manual a la cámara conservada); objetivos táctiles de al menos 24 px, región polite sin mover el foco y orden de foco lógico; el valor leído no se guarda en el navegador ni se registra. No añade acciones ni rutas. Cambios solo en el componente y su estilo.
Reglas: la cámara es un complemento, nunca el único camino; el token solo viaja en el cuerpo del POST.
Pruebas por ID. Al cerrar: T-ENT-14 (14a a 14c: 14c con cámara denegada o inexistente), T-ENT-05c (lectura simulada con vídeo de prueba y sin pulsar «Registrar») y T-A11Y-05; 14a y 14b siguen pasando. PENDIENTE (MANUAL): T-ENT-14d, con una cámara y un QR reales en el teléfono del equipo y luz variable (MC y MP de 07 §7.1): NO la des por hecha, regístrala como pendiente de ejecución. Dependen de verificaciones técnicas: BarcodeDetector en los dispositivos de la demostración, rendimiento de jsqr y cámara simulada en Playwright (D5-8, por confirmar). SOLO CON PAYPAL SANDBOX: nada.
Verificación (PREVISTOS, no probados): npm run test:e2e; npm run test:a11y; npm run build.
Evidencia en docs/evidencias/P5-03/: informes de Playwright y, SOLO cuando se ejecute, el registro manual de 14d con fecha y dispositivo; informe de 11 §3.
Terminas cuando: 14a a 14c, 05c y T-A11Y-05 pasan, la cámara se detiene tras leer, el campo manual funciona siempre y el informe declara 14d como pendiente manual.
Si quedas a medias: solo código; deja el campo manual intacto.
```

### 4.9 Fase 6 — Chat y notificación (`P6-01` a `P6-03`)

**Reglas de la fase 6 (valen para los tres prompts, no se repiten).**
- **Orden:** `P6-01`, `P6-02`, `P6-03`. **`P6-01` depende de `P1-02`, `P1-05` y `P0-02`** (**`P1-05` se conserva** para probar que restablecer la contraseña cierra **todos** los sockets del usuario); `P6-02` de `P6-01`; `P6-03` de `P6-02`. **Prerrequisito:** las fases 0 a 5 cerradas (con el orden recomendado están disponibles `src/ui` de `P1-03` y la CSP de `P1-06`, que suponen T-CHAT-14 y 15).
- **Alcance por paquete:** `P6-01` autentica el *handshake* y cierra por revocación; `P6-02` **persiste antes de emitir** y **deduplica**; `P6-03` cubre **presencia con varias pestañas**, **recuperación del historial al reconectar** y la **notificación adicional del panel**.
- **Todo se verifica en local** con un servidor Socket.IO real, `socket.io-client` y `turismo_test`; **nada de la fase depende de PayPal ni de Sandbox**.
- **Decisiones abiertas D6-1 a D6-12 (siguen abiertas; regístralas como tales y no las resuelvas en silencio):** D6-1 límite de frecuencia (ventana, qué cuenta, reinicio); **D6-2 qué confirma el servidor si la emisión falla tras guardar** (`ok: true` o `INTERNAL_ERROR`; propuesta `ok: true`); D6-3 mismo `clientMessageId` con otro texto; D6-4 parámetros del historial; D6-5 precedencia `ORIGIN_MISMATCH` frente a `UNAUTHENTICATED`; D6-6 si el cierre por el puente emite `session:expired`; D6-7 notificación por socket o por usuario; D6-8 limpieza de la insignia; D6-9 `disconnectUser` frente a `disconnectSessions`; D6-10 volumen de la auditoría del *handshake*; D6-11 401 del historial sin sesión (misma familia que D5-4); D6-12 intervalos de latido y barrido reducibles. Cada prompt remite a las **pruebas que dependen** de ellas.
- **J4 queda fuera** (propuesta `P3-04`, fuera del catálogo). Comandos **previstos, ninguno probado**.

#### Prompt de `P6-01`

```text
PAQUETE P6-01 — Gateway Socket.IO autenticado y cierre por sesión
Ficha: 10 §5, P6-01. Prompt maestro: 11 §2.
Prerrequisitos: P1-02, P1-05 Y P0-02 cerrados (Session, validateSession, logout con disconnectSession, puente registerRuntime con RealtimePort, planificador; recuperación de contraseña de P1-05 para T-CHAT-11b) y la auditoría (P1-01).
Lee antes: la ficha; 04 TX-14 y TX-13; 05 §5 (conexión y validación de la sesión); 02 §7.2 y §11.1 (J3); 03 §3.4.2 (realtime.handshake); 06 §3.3; 08 §3.6.1 a §3.6.3 (T-CHAT-01, 02, 11, 12).
Implementar (src/realtime, src/jobs, tests/helpers/ws.ts): HANDSHAKE que exige Origin = APP_ORIGIN y la cookie de una sesión vigente (revokedAt IS NULL AND expiresAt > now), si no connect_error con ORIGIN_MISMATCH o UNAUTHENTICATED; cada socket entra en user:<userId> y session:<sessionId>; mensaje máximo de 16 KB; CADA EVENTO ENTRANTE REVALIDA la sesión (si ya no vale: session:expired con expired o revoked, UNAUTHENTICATED en la confirmación y desconexión); TRES VÍAS DE CIERRE: inmediata tras el COMMIT de salida o de restablecimiento por el puente, temporizador por socket hasta expiresAt y barrido J3 cada 30 s (el puente es una optimización, no la garantía); implementación real de RealtimePort registrada desde server.ts; auditoría realtime.handshake DENIED sin cookie ni token; RETIRAR el handshake provisional de P0-02 (D0-3) y que T-OPS-01 conecte con cookie; intervalos reducibles en pruebas (propuesta); helpers conectar, esperarEvento, puente.desactivar, ejecutarBarridoSockets y revocarEnBase.
Reglas: SameSite no protege el WebSocket, Origin y cookie se comprueban siempre; ningún camino acepta una conexión sin sesión; un socket revocado puede recibir contenido hasta 30 s (limitación conocida: la garantía es de cierre y de rechazo de envío).
Pruebas por ID. Al cerrar: T-CHAT-01 (01a a 01c), T-CHAT-02 (02a y 02b), T-CHAT-11 (11a salida de S1 sin afectar a S2 e idempotente; 11b RESTABLECER LA CONTRASEÑA CIERRA TODOS LOS SOCKETS del usuario, con P1-05; 11c sin puente: el envío da UNAUTHENTICATED y el barrido cierra el resto; 11d revocar en base sin puente), T-CHAT-12 (12a a 12d) y T-OPS-01 con cookie. Los envíos rechazados de 01c, 11c y 12c se comprueban aquí solo contra la ausencia de procesamiento; que no dejan fila (PC-CHAT-1) se completa en P6-02, que crea la tabla. DEPENDEN DE DECISIONES ABIERTAS: precedencia de códigos con ambos fallos (02a: D6-5), si el puente emite session:expired (11a, 11b, 12a: D6-6), el nombre de la función de cierre de todos los sockets de un usuario (11b y T-CTA-14: D6-9), el volumen de la auditoría del handshake (01a y 02a: D6-10) y los intervalos reducibles (09c, 11c, 12b: D6-12).
Verificación (PREVISTOS, no probados): npm run test:integration (servidor real y socket.io-client sobre turismo_test); npm run test:e2e; npm run build.
Evidencia en docs/evidencias/P6-01/: informes con el connect_error por caso y la prueba de cierre sin puente; informe de 11 §3 que registre D6-5, D6-6, D6-9, D6-10 y D6-12 como abiertas.
Terminas cuando: las pruebas de «al cerrar» pasan, ninguna conexión sin sesión válida se acepta, restablecer la contraseña cierra todos los sockets y el informe habilita P6-02.
Si quedas a medias: solo código; revierte antes de dejar un handshake sin autenticar.
```

#### Prompt de `P6-02`

```text
PAQUETE P6-02 — Chat con historial
Ficha: 10 §5, P6-02. Prompt maestro: 11 §2.
Prerrequisitos: P6-01 cerrado (gateway autenticado, puente y barreras).
Lee antes: la ficha; 04 TX-15 (todo) y los principios de §1 y §2; 05 §4 (GET /api/chat/mensajes) y §5; 03 §3.4 (ChatMessage, H-31), §8.5 y §9.1 (M10); 06 §3.2 y §3.5; 07 §4.7 y §6; 08 §3.6 (T-CHAT-03 a 07, 13, 14 y 16).
Implementar: migración M10 (p6_02_chat) y ChatMessage con ck_chat_text (1 a 500 y no solo espacios), único (authorId, clientMessageId), índice (room, id), GRANT SELECT, INSERT sin UPDATE ni DELETE y USAGE de la secuencia; src/modules/chat (post-message, list-history); src/realtime/chat.handlers.ts (chat:join, chat:leave, chat:send, chat:message); GET /api/chat/mensajes con ?before=<id>&limit=30 y ?after=<id>&limit=100 (cursor por id, orden ascendente, no-store, sesión obligatoria); /panel/chat (lista role=log y aria-live polite, contador de 500, «Cargar anteriores», mensaje pendiente, confirmado o fallido con «Reintentar» con el mismo clientMessageId); limitador de 5 mensajes cada 10 s por usuario en memoria; texto plano de 1 a 500 puntos de código tras recortar y NFC. PERSISTENCIA ANTES DE EMITIR: cola en proceso POR SALA que serializa insertar, confirmar y emitir; la fila se confirma con COMMIT y SOLO DESPUÉS se emite chat:message. DEDUPLICACIÓN: si (authorId, clientMessageId) existe se devuelve el mensaje guardado SIN emitir; si dos envíos chocan en el INSERT el perdedor revierte, RELEE CON UNA CONSULTA NUEVA y devuelve el existente (sin 25P02); el chat NO se audita.
Reglas: texto plano mostrado con white-space pre-wrap y prohibido dangerouslySetInnerHTML; el contenido no entra en registros ni auditoría (PC-CHAT-3); el cursor por id exige una cola por sala y un solo proceso (H-31); si la emisión falla el mensaje YA EXISTE y se recupera por historial.
Pruebas por ID. Al cerrar: T-CHAT-03 (03a: la fila ya está confirmada y visible desde otra conexión cuando llega el evento; 03c: orden por id con cuatro usuarios a la vez; 03b se comprueba en lo del historial), T-CHAT-04, T-CHAT-05 (05a a 05e: una fila y una emisión por reintento, la carrera con una fila sin confirmar sin INTERNAL_ERROR), T-CHAT-06, T-CHAT-07 (07a a 07e), T-CHAT-13 (13a), T-CHAT-14 (texto con marcado como texto; la parte de CSP exige P1-06), T-CHAT-16, T-DB-01 (objetos de M10), T-DB-02 y T-SEG-07 (07a sobre ChatMessage). Los envíos rechazados de P6-01 completan aquí PC-CHAT-1. DEPENDEN DE DECISIONES ABIERTAS: QUÉ CONFIRMA EL SERVIDOR SI LA EMISIÓN FALLA TRAS GUARDAR (03b, y 08e y 13b en P6-03: D6-2; propuesta ok true con el mensaje guardado y fallo de emisión solo registrado), ventana y alcance del límite (06a en el borde de los 10 s, 06d, 04 y 13c: D6-1), mismo clientMessageId con otro texto (05b: D6-3), parámetros del historial (07d: D6-4) y el 401 del historial sin sesión (16a y T-SEG-04: D6-11). Dependen de otro paquete: 13b y la recuperación en el cliente (P6-03).
Verificación (PREVISTOS, no probados): npx prisma validate; npm run db:migrate; npm run test:integration; npm run test:concurrency; npm run test:e2e; npm run build.
Evidencia en docs/evidencias/P6-02/: informes de 03, 05 y 07 y la prueba de que el texto no está en AuditEvent ni en los registros; informe de 11 §3 que registre D6-1 a D6-4 y D6-11 como abiertas.
Terminas cuando: las pruebas de «al cerrar» pasan, el mensaje persiste antes de emitirse, un reintento no duplica fila ni emisión y el informe habilita P6-03.
Si quedas a medias: no edites una migración aplicada; no dejes el chat sin sesión obligatoria.
```

#### Prompt de `P6-03`

```text
PAQUETE P6-03 — Presencia, notificación adicional y reconexión
Ficha: 10 §5, P6-03. Prompt maestro: 11 §2.
Prerrequisitos: P6-02 cerrado (chat:message, cola por sala, historial por cursor y limitador).
Lee antes: la ficha; 05 §5 (presencia, notification:new-message y recuperación del historial); 04 TX-15; 07 §4.7 y §6; 08 §3.6 (T-CHAT-08, 09, 10, 15) y §3.7 (T-A11Y-04).
Implementar: PRESENCIA en src/realtime/presence.ts: mapa en memoria userId -> conjunto de sockets en la sala; presence:update solo en las transiciones 0 a 1 y 1 a 0 sockets de ESE usuario, con { users: [{ id, displayName }], count } de usuarios ÚNICOS (varias pestañas y varias sesiones cuentan una vez); latido para la desconexión abrupta (25 s + 20 s); un socket conectado pero no unido no cuenta. NOTIFICACIÓN ADICIONAL: tras el COMMIT, notification:new-message { messageId, authorDisplayName, createdAt } SIN texto a los sockets fuera de chat:general Y QUE NO SON DEL AUTOR; un reenvío deduplicado, un mensaje inválido o uno limitado NO notifican; insignia en la cabecera de /panel con texto («3 mensajes nuevos») y región polite sin mover el foco. RECUPERACIÓN AL RECONECTAR: GET ?after=<último id>&limit=100 repetido hasta hasMore false, comparación con lastMessageId tras chat:join, petición del hueco si llega un id > último + 1 (una vez, sin bucle), descarte por id y emparejamiento del propio por clientMessageId; estados de conexión en texto y «Tu sesión terminó».
Reglas: mensaje, presencia y aviso son eventos distintos; presence:update y la notificación no llevan correo ni texto (PC-CHAT-3); la presencia vive en memoria y se reconstruye al reconectar.
Pruebas por ID. Al cerrar: T-CHAT-08 (08a a 08f: tras reconectar se reciben los perdidos una vez y en orden, también con más de 100 pendientes y con un hueco por inserción revertida), T-CHAT-09 (09a a 09f: presencia de usuarios únicos con dos pestañas, con chat:leave, con caída abrupta, con dos sesiones y tras un reinicio), T-CHAT-10 (10a a 10e: el aviso llega a quien está fuera de la sala y no al autor, solo tras persistir y sin texto), T-CHAT-13 (13b), T-CHAT-15 y T-A11Y-04 (parte automática). DEPENDEN DE DECISIONES ABIERTAS: CONFIRMACIÓN SI FALLA LA EMISIÓN TRAS GUARDAR (08e y 13b: D6-2), notificación por socket o por usuario (10c: D6-7), limpieza de la insignia al abrir /panel/chat (10e y T-A11Y-04: D6-8), reintento deduplicado y límite (06d de P6-02: D6-1) e intervalos de latido reducibles (09c: D6-12). Dependen de otro paquete: la parte manual con lector de pantalla de T-A11Y-04 y las listas MC y MP del chat (PE-03).
Verificación (PREVISTOS, no probados): npm run test:integration; npm run test:e2e; npm run test:a11y; npm run build.
Evidencia en docs/evidencias/P6-03/: informes de 08 y 09 y de Playwright con dos contextos (setOffline); informe de 11 §3 que registre D6-2, D6-7, D6-8 y D6-12 como abiertas.
Terminas cuando: las pruebas de «al cerrar» pasan, la presencia cuenta usuarios únicos, el aviso no llega al autor ni lleva texto, la reconexión no duplica ni pierde mensajes y el informe cierra la fase 6.
Si quedas a medias: solo código; no dejes la presencia contando sockets en lugar de usuarios.
```

### 4.10 Fase PE — Evidencia y entrega (`PE-01` a `PE-05`)

**Reglas de la fase PE (valen para los cinco prompts, no se repiten).**
- **Orden de dependencias** (10 §4): `PE-01` (`P2-05`), `PE-02` (`P0-06` como mínimo para empezar; **cierra tras `P4-06` y `P6-03`**), `PE-03` (fases 1 a 6), `PE-04` (`PE-01`, `PE-02` y `PE-03`) y `PE-05` (`P1-01`; **opcional**: **la entrega no depende de él**).
- **Cada prompt distingue tres cosas:** lo que **puede completarse con la información actual**; lo que **queda pendiente por un asunto externo** —**alojamiento (Q-04)**, **guías académicas (Q-01, Q-02, Q-03, Q-07, Q-09, Q-11)**, **privacidad** (adoptar la purga `P3-04`, D7-6) y **PayPal Sandbox (Q-08)**—; y lo que solo demuestra una evidencia real. **Nada pendiente se afirma como cumplido** y ninguna cifra ni evidencia se inventa (prompt maestro, §2).
- **T-PAG-24 y EV-07 siguen PENDIENTES** de la verificación real en Sandbox (Q-08): se ejecutan **después** de los cierres de `P4-06` y `PE-02` y no son criterio de cierre de ninguno. **T-OPS-05 conserva alcance parcial:** se cierra con la lista de borrados vacía (D7-3).
- **Decisiones que habilitan cierres:** `PE-02`: Q-04 y D7-1; `PE-03`: Q-02, D7-6, D7-7 y D7-8; `PE-04`: Q-01, Q-03, Q-11, D4-3 (T-E2E-01) y D7-10. **D6-1 a D6-12 siguen abiertas** y ninguna bloquea esta fase.
- **Todos los comandos son previstos y ninguno está probado.** `P3-04` (purga J4) sigue **fuera del catálogo**.

#### Prompt de `PE-01`

```text
PAQUETE PE-01 — Medición de rendimiento del catálogo
Ficha: 10 §5, PE-01. Prompt maestro: 11 §2.
Prerrequisitos: P2-05 cerrado (catálogo y filtro por provincia) y, por transitividad, P2-01 (índice OfferVersion(province, startsAt)); base turismo_perf y la guarda _perf (P0-03 y P0-05).
Lee antes: la ficha; 08 §7 y T-PERF-01 (§3.7.4); 03 §3.2 (índice, H-20) y §9.3 (etapa de rendimiento); 09 §3.4 y §5; 02 §3 (scripts/perf-catalog.ts, D-61); 05 §2; 12 §2 (bloque de rendimiento).
Tareas (PROTOCOLO, consérvalo tal cual): perf:seed aplica las migraciones y carga 20 000 ofertas OPEN repartidas UNIFORMEMENTE entre las 24 provincias (≈ 833 por provincia), con versión pública APPROVED, startsAt futuros repartidos en el tiempo, tres pasos en SQL por lotes e identificadores deterministas (seedUuid); build de producción con NODE_ENV=production, PAYMENT_PROVIDER=fake, JOBS_ENABLED=false y las URL de turismo_perf (con APP_ENV=production el arranque exige PayPal: usa APP_ENV=local con el build de producción, PROPUESTA D7-2), puerto propio (propuesta 3200) y .env.perf.example; perf:catalog mide GET /ofertas?provincia=<código> (HTML de la primera página; provincia fija, propuesta PICHINCHA) con 50 peticiones de calentamiento DESCARTADAS y 1000 con concurrencia 10; reporta mediana, p95 (rango más cercano), mínimo, máximo y errores (toda respuesta distinta de 200); repite CON y SIN el índice OfferVersion(province, startsAt) (se elimina y se recrea solo en turismo_perf con el rol migrador; tres repeticiones por variante); EXPLAIN (ANALYZE, BUFFERS) de la consulta del catálogo; paginación profunda (páginas 1, 10, 100, 1000 y 2000 sin filtro y la última con filtro): solo se analiza, no se optimiza; informe EV-06 en docs/evidencias/PE-01/informe-rendimiento.md (equipo, sistema, versiones de Node, PostgreSQL y Next.js, commit y fecha UTC, parámetros, tabla con y sin índice, extractos de EXPLAIN, conclusión y limitaciones).
Pruebas por ID: T-PERF-01 (manual). EXIGE RESULTADOS REALES: ejecuta el protocolo y guarda la salida literal; NO inventes, estimes ni redondees cifras; si no puedes ejecutarlo, declara T-PERF-01 PENDIENTE y no completes el informe. Se comprueba al cerrar que el plan CON índice usa el índice. El criterio PROPUESTO de 08 §7 (p95 <= 300 ms en la página y <= 20 ms en la consulta con índice) es un objetivo por validar: si no se cumple se registra el hallazgo y decide el equipo; no impide cerrar. Pendiente externo: si la guía fija herramienta, volumen o umbral (Q-09) se repite con esos valores; mientras tanto el método es propuesta y así se declara. Alojamiento y Sandbox: no afectan.
Verificación (PREVISTOS, no probados): npm run db:up; npm run perf:seed; npm run build; npm run start (otra consola); npm run perf:catalog.
Evidencia en docs/evidencias/PE-01/: informe, planes de EXPLAIN y la salida literal del script (EV-06); informe de 11 §3.
Decisiones que te afectan: D7-2 (entorno de medición, nombre real del índice, formato del informe y análisis de la paginación profunda: PROPUESTAS).
Terminas cuando: la medición se ejecutó con los parámetros anteriores y su informe real está guardado, el plan con índice usa el índice y una segunda persona puede repetir el comando; o, si no se ejecutó, T-PERF-01 consta como pendiente.
Si quedas a medias: deja turismo_perf reconstruible con perf:seed y el índice recreado; no dejes cifras provisionales en el informe.
```

#### Prompt de `PE-02`

```text
PAQUETE PE-02 — Despliegue con HTTPS y WSS
Ficha: 10 §5, PE-02. Prompt maestro: 11 §2.
Prerrequisitos: P0-06 como mínimo para empezar; CIERRA tras P4-06 y P6-03. Si se adelanta tras la fase 1, NO exponer el ingreso antes de cerrar P1-04.
Lee antes: la ficha; 09 §1, §5, §6 (propuesta de alojamiento, plan gratuito y alternativa de servidor virtual §6.4), §7 y §8; 02 §7.4, §9 y §13; 06 §3.5 y A-43; 08 §3.7 (T-OPS-01 a 05, T-SEG-02, 07c y 12b); 12 §7.
COMPLETABLE CON LA INFORMACIÓN ACTUAL (preparación independiente del proveedor): Dockerfile y .dockerignore (npm ci && npm run build, arranque npm run start, escucha en 0.0.0.0:PORT); salud sobre /api/salud y apagado ordenado con SIGTERM; migraciones con una orden aparte y credencial separada (MIGRATION_DATABASE_URL fuera del entorno de la aplicación, A-43); copia con pg_dump y restauración de prueba (09 §5.4 y §5.5); documentación del despliegue en README y 09; T-OPS-03 en Linux o CI; T-OPS-05 con ALCANCE PARCIAL.
PENDIENTE POR ASUNTO EXTERNO (no lo afirmes): ALOJAMIENTO (Q-04): proveedor, presupuesto y dominio; SIN ellos PE-02 NO cierra y solo existe la preparación; D7-1: con APP_ENV=production el arranque exige PAYMENT_PROVIDER=paypal y prohíbe fake (02 §9), así que un despliegue público sin credenciales de Sandbox NO arranca en modo producción (esperar a Q-08 o decidir un entorno declarado, que cambiaría 02 §9); PAYPAL SANDBOX (Q-08): T-PAG-24 y EV-07 se ejecutan DESPUÉS del despliegue y NO son criterio de cierre; guías académicas: no afectan; SMTP alcanzable (RB-02, 09 §6.3).
Tareas: imagen y configuración del proveedor elegido; HTTPS y WSS en el mismo puerto con APP_ORIGIN https://, TRUST_PROXY_HOPS según el proxy; secretos solo en el entorno del servicio; PostgreSQL 18 con TLS; cookie __Host-tc_session con Secure, HSTS y CSP; URL del webhook pública y estable en el puerto 443; revisión de configuración sin MIGRATION_DATABASE_URL.
Pruebas por ID. Al cerrar (con proveedor): T-OPS-01 en el despliegue (HTTP y WSS en el mismo puerto, HSTS, __Host- y Secure), T-OPS-02 (02a y 02b), T-OPS-05 (restauración de una copia real), T-SEG-07c, T-SEG-02 y T-SEG-12b en el despliegue. T-OPS-05 CONSERVA SU ALCANCE PARCIAL: la reaplicación de borrados (09 §5.5, paso 7) usa la utilidad de 06 §4.5, que NINGÚN paquete crea y está fuera del MVP; con ninguna solicitud procesada la lista es VACÍA y el paso se registra como «sin solicitudes procesadas» (D7-3); NO prueba el camino de reaplicación (T-SEG-11d a 11i) y, si se procesara una solicitud, T-OPS-05 no se da por superada.
Verificación (PREVISTOS, no probados): docker build; npm run db:migrate:deploy (credencial separada); curl https://<dominio>/api/salud; un cliente Socket.IO con cookie; pg_dump y pg_restore según 09 §5.
Evidencia en docs/evidencias/PE-02/: salida de salud, cabeceras reales, registro de la restauración y de la revisión de configuración; informe de 11 §3 que enumere lo completado y lo pendiente por Q-04, D7-1 y Q-08.
Terminas cuando: con proveedor elegido, el recorrido principal y el chat funcionan en la URL pública, la salud responde, la restauración se probó y el despliegue es repetible; SIN proveedor, el informe declara PE-02 NO cerrado y solo la preparación hecha.
Si quedas a medias: RB-01, RB-06, RB-08, RB-11 y RB-12; nunca dejes secretos en la imagen ni el fake accesible en producción.
```

#### Prompt de `PE-03`

```text
PAQUETE PE-03 — Revisión de seguridad, accesibilidad y privacidad
Ficha: 10 §5, PE-03. Prompt maestro: 11 §2.
Prerrequisitos: las fases 1 a 6 cerradas (10 §4).
Lee antes: la ficha; 06 §2 (48 amenazas), §4 y §5; 08 §3.7 (T-SEG-09, T-A11Y-01 a 07, matriz de cobertura) y §5; 07 §7.1 (listas MC y MP); 01 (RS-26, RS-28, RA-02); 00 §10.4 (WCAG 2.2 citado de memoria).
COMPLETABLE CON LA INFORMACIÓN ACTUAL: npm audit --omit=dev y revisión de dependencias (T-SEG-09, manual); análisis automático de accesibilidad y EJECUCIÓN de las listas manuales MC y MP con teclado, lector de pantalla y contraste (T-A11Y-01 a 07); verificar los criterios de WCAG 2.2 citados de memoria contra la fuente oficial (D7-8); completar la matriz de seguridad con el resultado real de cada T-SEG y cerrar las filas «Falta» de 06 §2 (A-08, A-16, A-34, A-35, A-45); decidir A-25 (D7-7).
PENDIENTE POR ASUNTO EXTERNO O DE DECISIÓN (no lo afirmes): GUÍAS ACADÉMICAS: Q-02, RS-26 (correspondencia con los objetivos Common Criteria de la propuesta): la matriz conserva la columna «objetivo de la propuesta» como PENDIENTE y NO se declara certificación ni equivalencia con OWASP; Q-01 impide afirmar conformidad con la guía; PRIVACIDAD: la revisión de RS-25 y A-41 solo puede cerrarse si se adopta la purga P3-04 (fuera del catálogo; D7-6): si no, se declara PENDIENTE; ALOJAMIENTO: las comprobaciones sobre HTTPS real (T-SEG-12b) son de PE-02; SANDBOX (Q-08): la verificación real del webhook por postback sigue en T-PAG-24, fuera de este paquete.
Pruebas por ID: T-SEG-09 (manual) y T-A11Y-01 a 07 (con la parte manual EJECUTADA y registrada: las pruebas manuales no se dan por hechas sin registro).
Verificación (PREVISTOS, no probados): npm audit --omit=dev; npm run test:a11y; npm run test:e2e; las listas manuales.
Evidencia en docs/evidencias/PE-03/: informes, listas ejecutadas y la matriz de seguridad con resultados reales (EV-05); informe de 11 §3 con lo completado y lo pendiente por Q-02, D7-6, D7-7 y D7-8.
Terminas cuando: cada fila de la matriz tiene su resultado real o su pendiente explícito, npm audit no deja hallazgos altos o críticos sin justificar, el análisis automático no tiene infracciones graves o críticas y las listas manuales están ejecutadas; RS-26 queda PENDIENTE por Q-02 y la privacidad queda pendiente si no se adopta P3-04.
Si quedas a medias: las correcciones se hacen por paquete; no cierres filas de la matriz sin evidencia.
```

#### Prompt de `PE-04`

```text
PAQUETE PE-04 — Datos de demostración y documentación de entrega
Ficha: 10 §5, PE-04. Prompt maestro: 11 §2.
Prerrequisitos: PE-01, PE-02 y PE-03 (y por transitividad las fases 1 a 6). Si no hay despliegue (PE-02 sin cerrar), se entrega con la contingencia local de 12 §7 y se declara.
Lee antes: la ficha; 12 (guion, datos, entregables, declaración de IA, commits y contingencia) y 01 §9 (RE-01 a RE-12); 08 §5 (EV-01 a EV-11) y T-E2E-01; 03 §9.3 (etapa de demostración); 09 §5 y §6; 11 §3 y §5.
COMPLETABLE CON LA INFORMACIÓN ACTUAL: semilla de demostración prisma/seed/demo.ts (actividad en curso con entradas VALID, oferta con un solo cupo libre, caso REVIEW_REQUIRED, reserva vencida y unos 10 mensajes de chat; repetible y refrescada poco antes de la demostración, R-15); README con pasos de ejecución y DECLARACIÓN VERAZ de uso de IA (12 §5); ESTADO-IMPLEMENTACION.md final; EV-01 y EV-02 (diagramas), EV-03 con resultados reales, EV-04 a EV-06; guion minuto a minuto, plan de commits y contingencia de 12; presentación de 15 minutos y 5 de preguntas; repositorio con commits de CADA integrante con su propia cuenta y la etiqueta v1.0-b1 SIN simular autoría ni actividad.
PENDIENTE POR ASUNTO EXTERNO (no lo afirmes): GUÍAS ACADÉMICAS Y EQUIPO: conformidad y formato de entrega (Q-01), significado de la «notificación adicional» (Q-07), umbral de la medición (Q-09), integrantes, fechas y reparto (Q-03) y dónde y con qué visibilidad se publica el repositorio (Q-11; EV-09 exige público y se verifica el remoto, D7-10); COMMON CRITERIA: Q-02 vía PE-03; ALOJAMIENTO: Q-04 vía PE-02; PAYPAL SANDBOX: EV-07 queda PENDIENTE hasta ejecutar T-PAG-24 con credenciales (Q-08): una demostración con el adaptador fake NO es evidencia de PayPal y se dice expresamente.
Pruebas por ID: T-E2E-01 (recorrido principal sobre el build: oferta, aprobación, reserva de 5, pago con el fake, 5 QR, ingresos uno a uno y repetición rechazada; depende además del reloj acelerado del fake, D4-3, abierto) y T-DB-02 con la semilla de demostración.
Verificación (PREVISTOS, no probados): npm run db:seed; npm run build; npm run test:e2e (T-E2E-01); git tag v1.0-b1.
Evidencia en docs/evidencias/PE-04/: los EV-01 a EV-11 que existan, cada uno con su estado real; informe de 11 §3 que liste cada pendiente externo con su efecto sobre lo que puede afirmarse.
Terminas cuando: todo lo que no depende de terceros está entregado y cada pendiente externo figura en el README y en el informe de entrega con su efecto; no antes.
Si quedas a medias: contingencia de 12 §7; nunca sustituyas una evidencia pendiente por una simulada.
```

#### Prompt de `PE-05` (opcional)

```text
PAQUETE PE-05 — Vista de auditoría del administrador (OPCIONAL)
Ficha: 10 §5, PE-05. Prompt maestro: 11 §2. Este paquete es OPCIONAL: LA ENTREGA NO DEPENDE DE ÉL (ninguna fila de 10 §4 lo cita como dependencia; RF-38 se cubre con P1-01 y T-SEG-11; los avisos de reembolso se leen en /panel/admin/revision-pagos; el guion de 12 no lo usa). Hazlo solo si el equipo lo decide (D7-9).
Prerrequisitos: P1-01 cerrado (AuditEvent y recordAudit) y, por transitividad, el principal y el panel del administrador.
Lee antes: la ficha; 05 §2 (/panel/admin/auditoria, única consulta general, opcional); 07 §4.8; 03 §3.4 (índices, audit.read); 06 §4.6; 01 §8.
Tareas: /panel/admin/auditoria de solo lectura para ADMIN (404 a los demás) con tabla paginada (fecha, acción, resultado, actor con id corto y recurso), filtros por ACCIÓN de la lista cerrada y por fecha, SIN texto libre ni datos personales, <caption> y estado vacío; la lectura audita audit.read (propuesta); consulta parametrizada y acotada, nunca metadata fuera de la lista cerrada.
Pruebas por ID: el catálogo no asigna ninguna; se PROPONEN: una fila en la matriz de permisos (T-SEG-04, ruta solo ADMIN), ausencia de datos personales y T-A11Y-01 sobre la pantalla.
Verificación (PREVISTOS, no probados): npm run test:integration; npm run test:e2e; npm run build.
Evidencia en docs/evidencias/PE-05/ si se implementa; informe de 11 §3. Si NO se implementa, declarar «no hecho (opcional)» en ESTADO-IMPLEMENTACION.md.
Terminas cuando: las comprobaciones propuestas pasan y ningún dato personal aparece; o cuando el equipo decide no hacerlo y queda declarado.
Si quedas a medias: retira la ruta; la entrega no se ve afectada.
```

#### Estado de los prompts de §4

**Redactados: 38 de 38**, uno por cada ficha del catálogo de [10 §4](10-fases-y-paquetes-implementables.md): fase 0 (`P0-01`, `P0-03`, `P0-04`, `P0-02`, `P0-05`, `P0-06`), fase 1 (`P1-01` a `P1-06`), fase 2 (`P2-01` a `P2-05`), fase 3 (`P3-01` a `P3-03`), fase 4 (`P4-01` a `P4-07`), fase 5 (`P5-01` a `P5-03`), fase 6 (`P6-01` a `P6-03`) y fase PE (`PE-01` a `PE-05`; `PE-05` opcional). La purga J4 (`P3-04`) sigue como propuesta **fuera del catálogo** y no tiene prompt. **Todos los comandos son previstos y ninguno está probado.**

## 5. Formato propuesto de `ESTADO-IMPLEMENTACION.md`

Archivo en la raíz del repositorio, creado en P0-01 y actualizado al final de cada paquete. Separa cuatro niveles que no deben confundirse:

- **Diseñado:** existe en `docs/planificacion/`.
- **Implementado:** el código existe en el repositorio.
- **Probado:** sus pruebas automatizadas pasan (con fecha y comando).
- **Demostrado:** se mostró funcionando en el entorno indicado (local, despliegue, Sandbox real).

```markdown
# Estado de implementación

Última actualización: <fecha> — <quién o qué sesión>

## Resumen
- Fase actual: <n>
- Último paquete completado: <ID>
- Siguiente paquete: <ID>
- Bloqueos: <lista o «ninguno»>

## Paquetes
| ID | Diseñado | Implementado | Probado | Demostrado | Fecha | Commit | Notas |
|---|---|---|---|---|---|---|---|
| P0-01 | sí | no | no | no | — | — | — |

## Pruebas
| Identificador | Estado | Última ejecución | Comando |

## Verificaciones manuales pendientes
| Qué | Depende de | Estado |
| PayPal Sandbox real (T-PAG-24) | Credenciales (Q-08) | Pendiente |

## Decisiones cambiadas durante la implementación
| Decisión | Cambio | Razón | Documento actualizado |

## Entorno conocido
- Versiones instaladas reales: <node, next, prisma, …>
- Servicios externos configurados: <ninguno | Sandbox | alojamiento>

## Contexto para la siguiente sesión
<lo imprescindible que no esté en la documentación>
```
