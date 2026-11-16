# PLAN-PROMPTS — Un prompt por bloque del MVP del primer bimestre

> **Estado:** planificación. Ningún bloque está implementado y **todos los comandos son previstos**: se marcan como verificados solo cuando alguien los ejecuta y copia su salida real.
> **Fecha de redacción:** 2026-11-16. **Archivo hermano:** `PLAN-MVP.md`, que define el alcance, los contratos (§5.1), las fichas de bloque (§4) y el reparto (§5). Los identificadores de fases (`F0`–`F3`) y de bloques (`B0.1`–`B3.5`) son los mismos en ambos.
> **Alcance:** primer bimestre, sin pagos. Stack: Node.js + Express + EJS + JavaScript, Socket.IO y SQLite. La ruta del segundo bimestre y del producto completo está solo como resumen en `PLAN-MVP.md` §7; aquí no hay prompts para ella.

## Cómo usar este archivo

1. Elige un bloque cuyos **prerrequisitos estén integrados en `main`** (columna «Prerrequisitos» de la tabla de su fase). Puedes empezar un bloque en cuanto se cumplan los suyos, sin esperar a que cierre toda la fase.
2. Abre una **sesión nueva** de tu asistente de IA en la raíz del repositorio (el contexto son los archivos del repositorio, no esta conversación).
3. Copia **solo el prompt de tu bloque** (el recuadro `text`) y sustituye «Integrante n» por tu nombre. Cada prompt es autónomo: incluye qué leer, qué debe existir, qué implementar, qué contratos respetar, cómo comprobar y el informe final.
4. Revisa el código y las pruebas con calma: tienes que poder explicarlos y modificarlos en la defensa. Ejecuta tú los comandos y no des por buenos los resultados que no hayas visto.
5. Confirma con **tu propia cuenta** de Git, abre el PR con el informe del prompt y pide la revisión al revisor indicado. Quien revisa ejecuta `npm test` y el criterio de cierre antes de aprobar (`PLAN-MVP.md` §6.2).
6. Si un prerrequisito falta o un contrato es incompatible, el prompt pide **detenerse y señalarlo** antes de improvisar. Nunca se parchea un bloque ajeno.

Los bloques de integración (B0.4, B1.2, B1.3, B1.7, B1.10, B2.1 a B2.4, B3.3 y B3.5) incluyen una sección de **comprobaciones de integración** específica.

---

## Fase F0 — Base común ejecutable

Un bloque puede empezar cuando sus prerrequisitos estén integrados. Cierre de fase: Desde un clon limpio, `npm ci`, `npm run db:migrate` y `npm test` terminan en verde; `npm start` sirve `/salud` y `/` y un cliente Socket.IO conecta por `websocket` al mismo puerto; el esquema completo está migrado y documentado; los contratos de §5.1 existen como código (`createApp`, `createContainer`, `requireAuth` inyectable, `validate`, arnés de pruebas) y los tres módulos tienen su esqueleto; los documentos B0.6 y B0.7 están revisados; todos los PR de la fase están integrados en `main` con un revisor distinto del autor.

| Bloque | Título | Responsable | Revisor | Prerrequisitos | Orden de ejecución / paralelo |
|---|---|---|---|---|---|
| B0.1 | Repositorio, herramientas y servidor mínimo | Integrante 4 | Integrante 3 | — | Ola 1 (sin prerrequisitos) · en paralelo con B0.6, B0.7 |
| B0.2 | SQLite, migraciones y esquema inicial | Integrante 4 | Integrante 2 | B0.1 | Ola 2 · en paralelo con B0.3 |
| B0.3 | Núcleo compartido: validación, errores y reloj | Integrante 1 | Integrante 4 | B0.1 | Ola 2 · en paralelo con B0.2 |
| B0.4 | Núcleo web: aplicación Express, EJS, origen y CSRF | Integrante 4 | Integrante 1 | B0.2, B0.3 | Ola 3 · sin bloques en paralelo en su ola |
| B0.5 | Arnés de pruebas HTTP y WebSocket | Integrante 3 | Integrante 2 | B0.1, B0.2, B0.4 | Ola 4 · sin bloques en paralelo en su ola |
| B0.6 | Problema, objetivos, cronograma y roles | Integrante 3 | Integrante 1 | — | Ola 1 (sin prerrequisitos) · en paralelo con B0.1, B0.7 |
| B0.7 | Historias de usuario priorizadas (borrador) | Integrante 2 | Integrante 3 | — | Ola 1 (sin prerrequisitos) · en paralelo con B0.1, B0.6 |

### B0.1 — Repositorio, herramientas y servidor mínimo

> Responsable: Integrante 4 · Revisor: Integrante 3 · Esfuerzo: S · Prerrequisitos: — · Habilita: B0.2, B0.3, B0.5, B1.11

````text
BLOQUE B0.1 — Repositorio, herramientas y servidor mínimo
Responsable: Integrante 4 (sustituye por tu nombre) · Revisor: Integrante 3 · Fase: F0 · Esfuerzo: S

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B0.1 en §4.
- PLAN-MVP §2.2 (arquitectura), §2.6 (decisiones DM) y §5.1 (C-ENV)
- `docs/planificacion/09` §2 (clon limpio en Windows y Bash) y §3 (variables de entorno), solo como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- Ninguno: este bloque no depende de otros bloques. Debe existir el repositorio Git con la rama `main`.
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Un clon limpio instala las dependencias y arranca un único proceso Node con Express (`GET /salud` y una portada mínima) y Socket.IO adjunto al mismo servidor HTTP; un script comprueba el handshake WebSocket contra cualquier URL.
Archivos o módulos previstos:
- `package.json` (`"type": "module"`, `engines.node`, scripts `start`, `dev`, `test`, `lint`), `package-lock.json`, `.nvmrc`, `.gitignore`, `.env.example`, `eslint.config.js`
- `server.js` (arranque), `src/server.js` (`createHttpServer(app)`), `src/config.js` (lectura y validación de variables de entorno)
- `scripts/check-ws.js`, `tests/base/servidor.test.js`
- `README.md` (reescrito para el MVP; enlaza `docs/planificacion/referencias/PLAN.md` y `docs/planificacion/` como diseño anterior de referencia) y carpeta `docs/mvp/`
Pasos, en orden:
1. Inspeccionar el repositorio y crear la rama `bloque/B0.1-base`. No modificar `docs/planificacion/referencias/PLAN.md`, `docs/planificacion/` ni `mvp-primer-bimestre/`.
2. Inicializar `package.json` con módulos ES, `engines.node` `>=24` y `.nvmrc` con la versión LTS instalada (24.22.3 en el equipo donde se redactó este plan).
3. Instalar ejecución: `express`, `ejs`, `socket.io`, `better-sqlite3`, `argon2`, `helmet`, `cookie`; desarrollo: `socket.io-client`, `supertest`, `eslint`. Fijar versiones exactas en el lockfile. Comprobar que `better-sqlite3` y `argon2` instalan en Windows sin compilar a mano; si alguno falla, registrar el error exacto y aplicar la alternativa de §2.6 (`node:sqlite` tras la capa de datos; `bcryptjs`) como decisión nueva.
4. `src/config.js`: leer y validar **todas** las variables de C-ENV (§5.1) con valores por defecto de desarrollo; fallar nombrando la variable inválida sin imprimir su valor. El arranque usa `node --env-file=.env server.js`.
5. `src/server.js`: `createHttpServer(app)` crea `http.Server` y le adjunta `new Server(httpServer)` de Socket.IO; devuelve `{ httpServer, io }`. `server.js` lo usa con una app Express provisional (`GET /salud` → `{"status":"ok"}`, `GET /` → texto).
6. `scripts/check-ws.js <url>`: conecta con `socket.io-client` forzando `transports: ['websocket']` e imprime el transporte, `connect` o `connect_error` (con su código) y termina con código de salida distinto de 0 si no hubo respuesta.
7. `.env.example` con todas las claves de C-ENV y valores ficticios; `.gitignore` con `node_modules/`, `.env`, `data/`, `*.sqlite*`.
8. README mínimo: qué es, requisitos (Node LTS), `npm ci`, `npm start`, `npm test`; el resto se completa en B3.3.
9. Escribir la prueba `tests/base/servidor.test.js` y ejecutar `npm ci`, `npm test` y `npm start`.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- `createHttpServer(app) → { httpServer, io }`: es la única forma de crear el servidor; ningún bloque abre otro puerto ni otro servidor WebSocket.
- C-ENV: los nombres de variables de §5.1 quedan fijados aquí; los demás bloques solo leen `config`, nunca `process.env`.
- Scripts npm: `start`, `dev`, `test`, `lint` (los demás los añade el bloque que crea el script).

NO HAGAS (fuera de este bloque)
Base de datos, rutas de negocio, plantillas EJS, seguridad HTTP y cualquier módulo de cuentas, ofertas o chat.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-BASE-01 — arranque en puerto efímero: `GET /salud` responde 200 con `{"status":"ok"}`.
- TM-BASE-02 — un cliente `socket.io-client` conecta al mismo puerto por `websocket` (`socket.io.engine.transport.name === 'websocket'`).
Comando previsto (no verificado hasta que lo ejecutes): `npm ci && npm test` · `node scripts/check-ws.js http://localhost:3000` (con `npm start` en otra terminal).
Evidencia que debes guardar: Salida literal de `npm ci`, `npm test` y `check-ws.js` en `docs/mvp/evidencias/B0.1/` (prevista; se genera al ejecutar).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B0.1)
En un clon limpio `npm ci` y `npm test` terminan sin errores; `npm start` responde 200 en `/salud`; `scripts/check-ws.js` informa transporte `websocket` contra el mismo puerto; `.env` está ignorado por Git y `.env.example` no contiene secretos reales.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B0.1: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B0.2 (Integrante 4), B0.3 (Integrante 1), B0.5 (Integrante 3), B1.11 (Integrante 2) y qué archivo o contrato de este bloque necesitan.
````

### B0.2 — SQLite, migraciones y esquema inicial

> Responsable: Integrante 4 · Revisor: Integrante 2 · Esfuerzo: M · Prerrequisitos: B0.1 · Habilita: B0.4, B0.5, B1.11

````text
BLOQUE B0.2 — SQLite, migraciones y esquema inicial
Responsable: Integrante 4 (sustituye por tu nombre) · Revisor: Integrante 2 · Fase: F0 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B0.2 en §4.
- PLAN-MVP §2.4 (datos) y §5.1 (C-DAT)
- `docs/planificacion/03` §3.0 (longitudes en puntos de código, nombres), §3.1 (`Session`, `PasswordResetToken`), §3.2 (`OfferVersion`), §3.4 (`ChatMessage`) y §9.1 (reglas de migración), como referencia de campos

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.1 — Repositorio, herramientas y servidor mínimo (Integrante 4)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: `npm run db:migrate` crea desde cero el esquema completo del MVP (todas las tablas con claves, restricciones e índices) en un archivo SQLite; las pruebas usan bases en memoria aisladas; el esquema queda documentado con diagrama entidad-relación.
Archivos o módulos previstos:
- `src/shared/db.js` (`openDb`, `withTransaction`), `src/shared/migrate.js`, `scripts/migrate.js`
- `db/migrations/001_base.sql`, `010_accounts.sql`, `020_offers.sql`, `030_chat.sql`
- `docs/mvp/esquema.md` (tablas, columnas, restricciones, índices con la consulta que sirven, diagrama ER)
- `tests/unit/db-migraciones.test.js`
Pasos, en orden:
1. `openDb(file)` con `better-sqlite3`: `PRAGMA journal_mode = WAL` (en archivo), `foreign_keys = ON`, `busy_timeout = 5000`; `':memory:'` para pruebas. `withTransaction(db, fn)` abre `BEGIN IMMEDIATE`, confirma o revierte y devuelve el resultado de `fn`.
2. Migrador: aplica `db/migrations/*.sql` en orden lexicográfico, una transacción por archivo, y registra `version`, `checksum` (SHA-256 del contenido) y `applied_at` en `schema_migrations`; reejecutar no cambia nada; si un archivo ya aplicado cambió, falla con un mensaje claro.
3. Escribir el DDL de §2.4 respetando la numeración reservada: `001` base (`schema_migrations`), `010` cuentas (`users`, `sessions`, `password_reset_tokens`, `mail_outbox`), `020` ofertas (`offers`), `030` chat (`chat_messages`). Cambios posteriores usan números nuevos dentro del rango del módulo (011, 012…; 021…; 031…).
4. Restricciones `CHECK` de longitudes y rangos (en SQLite `length()` cuenta caracteres Unicode), `CHECK` de las 24 provincias, claves foráneas con `ON DELETE` explícito y marcas de tiempo `INTEGER` en milisegundos UTC.
5. Índices: `idx_offers_owner_province_starts (owner_id, province, starts_at, id)`, `idx_offers_owner_starts (owner_id, starts_at, id)`, `idx_chat_room_id (room, id)`, `idx_sessions_user (user_id)` y los únicos de §2.4.
6. `scripts/migrate.js` toma `DATABASE_FILE` de `config`, crea la carpeta `data/` si falta y añade `db:migrate` a `package.json`.
7. Redactar `docs/mvp/esquema.md`: una tabla por entidad con módulo propietario, columnas, restricciones, índices y consulta a la que sirve cada índice, más un diagrama ER (Mermaid).
8. Pruebas sobre `:memory:` y ejecución real de `npm run db:migrate` sobre un archivo nuevo.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-DAT (§5.1): propietario de cada tabla, nombres de tablas y columnas de §2.4, tiempos en milisegundos UTC, números de migración por módulo.
- `openDb(file)` y `withTransaction(db, fn)` son la única forma de abrir la base y de transaccionar.
- Una migración ya integrada en `main` no se edita: se añade otra (el checksum lo impide).

NO HAGAS (fuera de este bloque)
Datos de demostración, repositorios por módulo (los escribe cada responsable) y cualquier tabla de reservas, pagos, entradas o auditoría.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-DB-01 — aplicar las migraciones a `:memory:` crea las tablas e índices esperados (consulta a `sqlite_master`).
- TM-DB-02 — reejecutar el migrador no cambia nada; modificar un archivo ya aplicado hace fallar el migrador.
- TM-DB-03 — claves foráneas activas: insertar una oferta con `owner_id` inexistente falla.
- TM-DB-04 — `UNIQUE (author_id, client_message_id)` y `UNIQUE (email)` rechazan duplicados.
- TM-DB-05 — los `CHECK` rechazan capacidad 0, título de 4 caracteres, texto de chat vacío y provincia desconocida.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/unit/db-migraciones.test.js` · `npm run db:migrate` sobre un archivo nuevo.
Evidencia que debes guardar: Salida de `db:migrate` y de la prueba; `docs/mvp/esquema.md` con el diagrama ER (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B0.2)
`npm run db:migrate` sobre un archivo nuevo crea las seis tablas del MVP más `schema_migrations`, con sus índices; una segunda ejecución no cambia nada; las pruebas de restricciones pasan; `docs/mvp/esquema.md` indica el módulo propietario de cada tabla y la consulta que justifica cada índice.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B0.2: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B0.4 (Integrante 4), B0.5 (Integrante 3), B1.11 (Integrante 2) y qué archivo o contrato de este bloque necesitan.
````

### B0.3 — Núcleo compartido: validación, errores y reloj

> Responsable: Integrante 1 · Revisor: Integrante 4 · Esfuerzo: M · Prerrequisitos: B0.1 · Habilita: B0.4, B1.1, B1.4

````text
BLOQUE B0.3 — Núcleo compartido: validación, errores y reloj
Responsable: Integrante 1 (sustituye por tu nombre) · Revisor: Integrante 4 · Fase: F0 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B0.3 en §4.
- PLAN-MVP §5.1 (C-VAL, C-ERR) y §2.5
- `docs/planificacion/02` §10.1–§10.2 (modelo y catálogo de errores) y `docs/planificacion/03` §3.0 (reglas 4 y 5), §6 y §7, como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.1 — Repositorio, herramientas y servidor mínimo (Integrante 4)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Una función pura `validate(schema, input)` que corre igual en Node y en el navegador, un catálogo de errores `AppError` y un reloj inyectable con ayudantes de la zona horaria de Ecuador.
Archivos o módulos previstos:
- `src/shared/validation/validate.js` (sin importaciones de Node; se servirá al navegador)
- `src/shared/errors.js`, `src/shared/clock.js`, `src/shared/time.js`
- `tests/unit/validate.test.js`, `tests/unit/time.test.js`
Pasos, en orden:
1. Fijar el formato de esquema C-VAL (§5.1): por campo `type` (`string`, `int`, `email`, `localDateTime`, `enum`), `label`, `required`, `min`, `max`, `pattern`, `values`, `equalsField` y `message` opcional. Resultado: `{ ok, values, errors }` con `errors = { campo: [mensaje] }`.
2. Normalizar antes de validar: recorte, NFC y colapso de espacios donde corresponda; medir longitudes en puntos de código (`[...texto].length`); enteros estrictos (sin decimales ni notación científica); correo en minúsculas, formato razonable y máximo 254.
3. Mensajes en español, claros y por regla (obligatorio, mínimo, máximo, formato, número, coincidencia).
4. `time.js`: convertir `YYYY-MM-DDTHH:mm` en hora de Ecuador (UTC−5, sin horario de verano) a milisegundos UTC y de vuelta; formatear «15 de diciembre de 2026, 09:30 (hora de Ecuador)»; rechazar fechas inexistentes como 2026-02-30.
5. `errors.js`: `AppError(code, status, message, { fieldErrors, details })` y el catálogo C-ERR de §5.1.
6. `clock.js`: `systemClock` y `fixedClock(ms)` con `advance(ms)` para pruebas.
7. Pruebas unitarias con aserciones por regla y por borde.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-VAL y C-ERR (§5.1): forma del esquema, del resultado y del error; el mismo archivo lo importa el servidor y lo sirve B0.4 al navegador en `/js/shared/validate.js`.
- Longitudes siempre en puntos de código, nunca en unidades UTF-16.
- Los módulos reciben `clock` por inyección; ningún servicio llama a `Date.now()` directamente.

NO HAGAS (fuera de este bloque)
Esquemas de formularios concretos de cuentas, ofertas o chat (los define cada módulo) y el código de navegador que lee `data-schema` (B0.4).

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-VAL-01 — campos obligatorios, recorte y mensajes por campo.
- TM-VAL-02 — longitudes en puntos de código (un emoji cuenta 1) y NFC.
- TM-VAL-03 — enteros: rechaza `1.5`, `1e3` y `abc`; respeta mínimo y máximo.
- TM-VAL-04 — correo válido e inválido, minúsculas y máximo de 254.
- TM-VAL-05 — `equalsField` y `enum`.
- TM-VAL-06 — `localDateTime`: ida y vuelta con Ecuador (UTC−5) y rechazo de `2026-02-30T10:00`.
- TM-VAL-07 — el archivo `validate.js` no contiene `import`, `require` ni `node:` (se lee su fuente).
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/unit/validate.test.js tests/unit/time.test.js`
Evidencia que debes guardar: Salida de las pruebas en `docs/mvp/evidencias/B0.3/` (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B0.3)
Las siete pruebas pasan; `validate.js` se importa sin errores desde Node y carece de dependencias de Node (TM-VAL-07); cada regla incumplida devuelve un mensaje en español asociado a su campo.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B0.3: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B0.4 (Integrante 4), B1.1 (Integrante 1), B1.4 (Integrante 2) y qué archivo o contrato de este bloque necesitan.
````

### B0.4 — Núcleo web: aplicación Express, EJS, origen y CSRF

> Responsable: Integrante 4 · Revisor: Integrante 1 · Esfuerzo: M · Prerrequisitos: B0.2, B0.3 · Habilita: B0.5, B1.1, B1.4, B1.6, B1.9

````text
BLOQUE B0.4 — Núcleo web: aplicación Express, EJS, origen y CSRF
Responsable: Integrante 4 (sustituye por tu nombre) · Revisor: Integrante 1 · Fase: F0 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B0.4 en §4.
- PLAN-MVP §2.2, §2.5 (controles), §5.1 (C-SES, C-HTTP, C-ERR) y §6.1 (archivos compartidos)
- `docs/planificacion/02` §4 (dirección de dependencias) y §8 (sesión), `docs/planificacion/05` §1 y §2 (regla `safeNext`), `docs/planificacion/06` §3.3 y §3.5, como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.2 — SQLite, migraciones y esquema inicial (Integrante 4)
- B0.3 — Núcleo compartido: validación, errores y reloj (Integrante 1)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: `createApp(container)` monta Express con cabeceras de seguridad, estáticos, EJS con plantilla y parciales, protección de origen y CSRF, resolución de sesión inyectable (`attachPrincipal`, `requireAuth`) y manejador de errores; los tres módulos quedan con su esqueleto para que cada responsable edite solo sus archivos.
Archivos o módulos previstos:
- `src/container.js` (único punto de composición), `src/app.js`
- `src/shared/http/{origin,csrf,auth,error-handler,safe-next}.js`
- `src/web/views/{layout.ejs,partials/header.ejs,partials/form-field.ejs,errors/404.ejs,errors/500.ejs}`
- `src/web/{accounts,offers,chat,panel}.routes.js` (routers vacíos montados)
- `src/modules/{accounts,offers,chat}/index.js` (fábricas que lanzan `NOT_IMPLEMENTED`, con las firmas de §5.1), `src/realtime/gateway.js` (esqueleto)
- `public/css/app.css`, `public/js/form-validate.js` (lee `data-schema`, valida al enviar y al salir del campo, escribe los errores en `[data-error-for]`)
- `tests/integration/web-base.test.js`, regla `no-restricted-imports` en `eslint.config.js`
Pasos, en orden:
1. `createContainer(config, overrides)`: crea `db`, `clock`, `sessionEvents` (un `EventEmitter`) y los servicios; `overrides` permite inyectar servicios falsos en pruebas.
2. `createApp(container)`: `helmet` con CSP sin inline (`default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `connect-src 'self'` más `ws:`/`wss:` del origen), `express.urlencoded` y `express.json` con límite de 16 kB, lectura de cookies, estáticos `/css` y `/js`, y `/js/shared` apuntando a `src/shared/validation`. `app.set('trust proxy', config.trustProxy)`.
3. `originGuard`: toda petición distinta de `GET`, `HEAD` u `OPTIONS` exige `Origin` presente e igual a `APP_ORIGIN`; si no, 403 `ORIGIN_MISMATCH`. `csrf`: token HMAC-SHA256 del id de sesión con `CSRF_SECRET`, exigido en el campo `_csrf` o en la cabecera `x-csrf-token` cuando hay sesión; expuesto como `res.locals.csrfToken`.
4. `attachPrincipal(resolveSession)` lee la cookie `tc_session` (o `__Host-tc_session`) y fija `req.principal` (o `null`); `requireAuth`: páginas → 302 a `/ingreso?next=<ruta segura>`; `/api/*` → 401 JSON `UNAUTHENTICATED`; respuestas de `/panel` y `/api` con `Cache-Control: no-store`.
5. `safeNext(raw)`: acepta solo rutas internas que empiezan por `/panel`, sin `//`, `\` ni caracteres de control, y confirma con `new URL(raw, APP_ORIGIN)` que el origen no cambia; si no, devuelve `/panel`.
6. Plantilla: `layout.ejs` con `<title>` por página, enlace «Saltar al contenido», `<main>`, parcial de cabecera y parcial de campo con su mensaje de error; todo dato se imprime con `<%= %>`.
7. Manejador de errores: `AppError` → página o JSON según la ruta; cualquier otro error → `INTERNAL_ERROR` sin trazas hacia el cliente.
8. Esqueleto: `index.js` de cada módulo exporta `create<Modulo>Service(deps)` que lanza `NOT_IMPLEMENTED`; routers vacíos montados en `createApp`; reglas ESLint: `src/modules/**` no importa `express`, `socket.io`, `ejs`, `src/web` ni `src/realtime`; un módulo importa a otro solo por su `index.js`.
9. Pruebas con servicios falsos inyectados.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-SES y C-HTTP (§5.1): `req.principal`, `requireAuth`, `safeNext`, `res.locals.csrfToken`, cookie `tc_session`.
- `createContainer(config, overrides)` y `createApp(container)`: un bloque nuevo se registra editando solo su router, su servicio y sus vistas.
- Archivos compartidos y su responsable: ver §6.1.

NO HAGAS (fuera de este bloque)
Lógica de cuentas, ofertas o chat; el contenido del panel (B1.9); el gateway real (B1.6).

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-WEB-01 — `POST` sin `Origin` → 403 `ORIGIN_MISMATCH`.
- TM-WEB-02 — `POST` con `Origin` de otro sitio → 403.
- TM-WEB-03 — con sesión simulada, `POST` sin token CSRF → 403; con token → pasa el guardián.
- TM-WEB-04 — `/panel` sin sesión → 302 a `/ingreso?next=%2Fpanel`; `/api/x` sin sesión → 401 JSON.
- TM-WEB-05 — `safeNext` rechaza `//evil.test`, `/\evil`, `https://x` y acepta `/panel/ofertas?pagina=2`.
- TM-WEB-06 — cabeceras: CSP, `X-Content-Type-Options` y `no-store` en `/panel`.
- TM-WEB-07 — una ruta inexistente muestra la página 404 sin trazas.
- TM-WEB-08 — `npm run lint` rechaza un import prohibido (fixture) y `/js/shared/validate.js` se sirve idéntico al archivo de `src/shared/validation`.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/integration/web-base.test.js` · `npm run lint`
Evidencia que debes guardar: Salida de pruebas y de `lint` en `docs/mvp/evidencias/B0.4/` (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Converge B0.2 (la base inyectada en `createContainer`) y B0.3 (`validate.js` servido al navegador, `AppError` en el manejador): comprobar que `createContainer` abre la base migrada de B0.2 y que `public/js/form-validate.js` importa `/js/shared/validate.js`.
- Confirmar con el revisor (Integrante 1) que `AppError` y los códigos de C-ERR son los de B0.3, sin duplicarlos.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B0.4)
Las ocho pruebas pasan; `npm start` muestra la portada con la plantilla; un `POST` sin `Origin` o sin token es rechazado; el navegador descarga el mismo `validate.js` que usa el servidor; cada módulo tiene su carpeta con `index.js` y su router sin que dos responsables compartan archivo.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B0.4: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B0.5 (Integrante 3), B1.1 (Integrante 1), B1.4 (Integrante 2), B1.6 (Integrante 3), B1.9 (Integrante 4) y qué archivo o contrato de este bloque necesitan.
````

### B0.5 — Arnés de pruebas HTTP y WebSocket

> Responsable: Integrante 3 · Revisor: Integrante 2 · Esfuerzo: M · Prerrequisitos: B0.1, B0.2, B0.4 · Habilita: B1.1, B1.4, B1.6, B1.9

````text
BLOQUE B0.5 — Arnés de pruebas HTTP y WebSocket
Responsable: Integrante 3 (sustituye por tu nombre) · Revisor: Integrante 2 · Fase: F0 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B0.5 en §4.
- PLAN-MVP §2.4 (datos) y §5.1 (C-SES, C-EVT)
- `docs/planificacion/08` §1–§2 y §3.6.1 (ayudantes CHAT-D1 a CHAT-D6), como ideas de diseño

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.1 — Repositorio, herramientas y servidor mínimo (Integrante 4)
- B0.2 — SQLite, migraciones y esquema inicial (Integrante 4)
- B0.4 — Núcleo web: aplicación Express, EJS, origen y CSRF (Integrante 4)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Ayudantes reutilizables para crear un contexto de prueba con base en memoria, usuarios y sesiones válidas según C-SES sin usar el módulo de cuentas, un servidor en puerto efímero y clientes Socket.IO con cookie y `Origin` elegibles.
Archivos o módulos previstos:
- `tests/helpers/{context.js,factories.js,auth.js,ws.js}`
- `tests/base/arnes.test.js`
- `docs/mvp/pruebas.md` (convenciones: prefijo `TM-`, ubicación de pruebas, cómo ejecutarlas, ejemplo de uso)
Pasos, en orden:
1. `createTestContext({ overrides, clock })`: abre `:memory:`, aplica las migraciones, crea el contenedor con `createContainer(config, overrides)` de B0.4 y devuelve `{ db, container, app, clock, close }` (`app` = `createApp(container)`). Mientras B0.4 no esté integrado se puede avanzar en la rama con `ws.js`, `factories.js` y `auth.js`, que solo dependen del esquema de B0.2, pero el bloque no se cierra hasta usar el contenedor real.
2. `factories`: `createUser(ctx, { email, displayName })` inserta la fila con un `password_hash` de relleno; `createOffer(ctx, ownerId, datos)` y `createMessages(ctx, n, { authors })` insertan por SQL conforme a §2.4.
3. `auth.createSessionFor(ctx, userId, { ttlMs })` genera un token de 32 bytes, guarda su SHA-256 en `sessions` y devuelve `{ token, sessionId, cookie }`; `revokeInDb(ctx, sessionId)` y `fakeAccounts(map)` (un `resolveSession` falso para inyectar en el contenedor).
4. `startTestServer(appOrContext)` usa `createHttpServer` en el puerto 0 y devuelve `{ url, port, close }`.
5. `ws.connect({ url, cookie, origin, transports })` devuelve un cliente con `received[]`, `waitFor(evento, n)` y `expectNoEvent(cliente, evento, testigo)`: afirma que algo no llegó esperando un mensaje testigo posterior, nunca con esperas fijas.
6. Documentar en `docs/mvp/pruebas.md` un ejemplo de menos de 15 líneas (usuario + sesión + cliente conectado).
7. Probar el propio arnés con el contexto real y, para el cliente WebSocket, con un servidor Socket.IO mínimo creado dentro de la prueba.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-SES (§5.1): el helper de sesión guarda `sha256(token)` en hexadecimal minúscula y la cookie se llama `tc_session`; B1.2 comprobará que el servicio real acepta estas sesiones.
- Ningún helper usa `setTimeout` fijo para esperar eventos; todos esperan una condición.
- Los helpers insertan por SQL y no importan servicios de módulos (para que los bloques avancen en paralelo).

NO HAGAS (fuera de este bloque)
Pruebas de negocio de cualquier módulo.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-ARN-01 — `createSessionFor` guarda un hash de 64 hexadecimales y no el token.
- TM-ARN-02 — `waitFor` espera `n` eventos y falla con mensaje claro si no llegan.
- TM-ARN-03 — `expectNoEvent` detecta correctamente un evento ausente y uno presente (con testigo).
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/base/arnes.test.js`
Evidencia que debes guardar: Salida de la prueba y ejemplo documentado en `docs/mvp/pruebas.md` (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B0.5)
Las tres pruebas del arnés pasan; el ejemplo de `docs/mvp/pruebas.md` crea usuario, sesión y cliente conectado en menos de 15 líneas; ningún helper usa esperas fijas.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B0.5: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B1.1 (Integrante 1), B1.4 (Integrante 2), B1.6 (Integrante 3), B1.9 (Integrante 4) y qué archivo o contrato de este bloque necesitan.
````

### B0.6 — Problema, objetivos, cronograma y roles

> Responsable: Integrante 3 · Revisor: Integrante 1 · Esfuerzo: S · Prerrequisitos: — · Habilita: —

````text
BLOQUE B0.6 — Problema, objetivos, cronograma y roles
Responsable: Integrante 3 (sustituye por tu nombre) · Revisor: Integrante 1 · Fase: F0 · Esfuerzo: S

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B0.6 en §4.
- PLAN-MVP §1 (matriz de la rúbrica, fila R1), §3 y §5
- Word, «Evaluación → Primer bimestre» (fila 1) y «Presentación» (contenido común)

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- Ninguno: este bloque no depende de otros bloques. Debe existir el repositorio Git con la rama `main`.
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: `docs/mvp/problema-objetivos-cronograma.md` con la PYME ficticia y su problema justificado, el objetivo general y los específicos medibles, el cronograma por fases y el reparto de roles de los cuatro integrantes.
Archivos o módulos previstos:
- `docs/mvp/problema-objetivos-cronograma.md`
Pasos, en orden:
1. Releer la fila 1 de la rúbrica del Word («Planteamiento del problema, objetivos y cronograma») y la lista de contenido común de la presentación.
2. Describir la PYME ficticia de turismo comunitario y el problema: ofertas y comunicación del equipo dispersas; justificar por qué centralizarlas importa.
3. Redactar un objetivo general y al menos tres específicos medibles (por ejemplo: «implementar el CRUD de ofertas con filtro por provincia y paginación de 10, verificado con pruebas automatizadas»; «lograr que dos usuarios intercambien mensajes persistentes por WebSocket autenticado»).
4. Copiar el cronograma por fases y bloques de PLAN-MVP §3 con sus responsables; las fechas reales quedan «por fijar» hasta resolver PM-01.
5. Sustituir «Integrante 1» a «Integrante 4» por los nombres reales y describir el rol de cada uno (§5).
6. Pedir la revisión de coherencia con PLAN-MVP al revisor.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- El documento no inventa fechas ni resultados; lo no conocido figura como pendiente (PM-01, PM-08).

NO HAGAS (fuera de este bloque)
Historias de usuario (B0.7) y diagramas (B3.1).

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-DOC-01 — lista de comprobación: problema, justificación, objetivo general, al menos tres específicos medibles, cronograma con responsables y los cuatro roles (revisión del revisor; sin prueba automatizada).
Comando previsto (no verificado hasta que lo ejecutes): — (revisión de pares) · `git diff --stat`
Evidencia que debes guardar: El documento aprobado por el revisor (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B0.6)
El documento contiene problema justificado, objetivo general, al menos tres objetivos específicos medibles, cronograma por fases con responsable y los cuatro roles, y marca como pendientes las fechas que aún no se conocen.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B0.6: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: ninguno (último eslabón de su cadena) y qué archivo o contrato de este bloque necesitan.
````

### B0.7 — Historias de usuario priorizadas (borrador)

> Responsable: Integrante 2 · Revisor: Integrante 3 · Esfuerzo: M · Prerrequisitos: — · Habilita: —

````text
BLOQUE B0.7 — Historias de usuario priorizadas (borrador)
Responsable: Integrante 2 (sustituye por tu nombre) · Revisor: Integrante 3 · Fase: F0 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B0.7 en §4.
- PLAN-MVP §1, §2.1 (actores y recorrido) y §2.3 (pantallas)
- `docs/planificacion/01` §4 (casos de uso), solo como contexto

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- Ninguno: este bloque no depende de otros bloques. Debe existir el repositorio Git con la rama `main`.
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: `docs/mvp/historias-de-usuario.md` con historias HU-01 a HU-15, cada una con criterios de aceptación verificables, prioridad, bloque previsto y prueba prevista, y una sección de lo aplazado.
Archivos o módulos previstos:
- `docs/mvp/historias-de-usuario.md`
Pasos, en orden:
1. Releer la fila 2 de la rúbrica («completos, priorizados y consistentes con lo implementado»).
2. Redactar HU-01 Registro, HU-02 Ingreso, HU-03 Recuperar clave, HU-04 Salir, HU-05 Panel principal, HU-06 Crear oferta, HU-07 Listar con filtro por provincia y paginación, HU-08 Ver detalle por ID, HU-09 Editar, HU-10 Eliminar con confirmación, HU-11 Enviar y recibir mensajes, HU-12 Ver historial, HU-13 Ver usuarios conectados, HU-14 Aviso de nuevo mensaje en el panel y HU-15 Conexión WebSocket autenticada.
3. Para cada una: «Como… quiero… para…», criterios de aceptación observables, prioridad, bloque previsto (§4) y prueba prevista (`TM-…`). Todas son obligatorias según el Word; la prioridad (Alta o Media) ordena el trabajo y el tiempo de demo por el peso de su ítem de la rúbrica: Alta para CRUD (3,0 puntos) y chat (2,5), Media para el resto; justificarla en una línea.
4. Añadir «Fuera del MVP» con lo aplazado: reservas, pagos, entradas QR, control de ingreso, revisión de ofertas y roles, y el motivo.
5. Dejar una columna «Estado» para completarla en B3.2.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- Cada HU usa los nombres de rutas, pantallas y eventos de PLAN-MVP §2.3 y §5.1; si una HU necesita un cambio de alcance, se anota como pendiente y no se asume.

NO HAGAS (fuera de este bloque)
Estado final de las historias (B3.2) y matriz de trazabilidad con resultados.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-DOC-02 — lista de comprobación: todas las funciones de §2.3 aparecen en una HU y cada HU tiene criterios verificables, prioridad y bloque (revisión del revisor).
Comando previsto (no verificado hasta que lo ejecutes): — (revisión de pares) · `git diff --stat`
Evidencia que debes guardar: Documento aprobado por el revisor (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B0.7)
Las quince historias tienen criterios de aceptación observables, prioridad y bloque asignado; todas las pantallas y eventos de §2.3 y §5.1 están cubiertos por alguna historia; lo aplazado figura con su motivo.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B0.7: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: ninguno (último eslabón de su cadena) y qué archivo o contrato de este bloque necesitan.
````

---

## Fase F1 — Módulos en paralelo

Cierre de fase: Cada módulo cumple el criterio de aceptación de sus bloques y está integrado en `main`: se puede registrar, ingresar, salir, recuperar la clave y proteger `/panel`; el CRUD de ofertas propias funciona con filtro, paginación y confirmación; dos sockets autenticados intercambian mensajes persistentes, ven la presencia y reciben el aviso adicional; el despliegue con HTTPS y WSS está verificado o declarado pendiente (PM-03); `npm test` y `npm run lint` pasan con todo integrado.

| Bloque | Título | Responsable | Revisor | Prerrequisitos | Orden de ejecución / paralelo |
|---|---|---|---|---|---|
| B1.1 | Registro y almacenamiento seguro de contraseñas | Integrante 1 | Integrante 2 | B0.3, B0.4, B0.5 | Ola 1 · en paralelo con B1.4, B1.6, B1.9, B1.11 |
| B1.2 | Ingreso, sesión, cierre y rutas protegidas | Integrante 1 | Integrante 4 | B1.1 | Ola 2 · en paralelo con B1.5, B1.7, B1.10 |
| B1.3 | Recuperación de clave con token de un solo uso | Integrante 1 | Integrante 3 | B1.2 | Ola 3 · en paralelo con B1.8 |
| B1.4 | Ofertas: reglas, validación y acceso a datos | Integrante 2 | Integrante 1 | B0.3, B0.4, B0.5 | Ola 1 · en paralelo con B1.1, B1.6, B1.9, B1.11 |
| B1.5 | Ofertas: pantallas CRUD, filtro y paginación | Integrante 2 | Integrante 4 | B1.4 | Ola 2 · en paralelo con B1.2, B1.7, B1.10 |
| B1.6 | Gateway Socket.IO autenticado y cierre por sesión | Integrante 3 | Integrante 1 | B0.4, B0.5 | Ola 1 · en paralelo con B1.1, B1.4, B1.9, B1.11 |
| B1.7 | Chat: mensajes persistentes, historial y pantalla | Integrante 3 | Integrante 2 | B1.6 | Ola 2 · en paralelo con B1.2, B1.5, B1.10 |
| B1.8 | Presencia de usuarios conectados | Integrante 3 | Integrante 4 | B1.7 | Ola 3 · en paralelo con B1.3 |
| B1.9 | Panel principal y navegación coherente | Integrante 4 | Integrante 2 | B0.4, B0.5 | Ola 1 · en paralelo con B1.1, B1.4, B1.6, B1.11 |
| B1.10 | Aviso de nuevo mensaje en el panel | Integrante 4 | Integrante 3 | B1.6, B1.9 | Ola 2 · en paralelo con B1.2, B1.5, B1.7 |
| B1.11 | Despliegue con HTTPS y WSS | Integrante 2 | Integrante 4 | B0.1, B0.2 | Ola 1 · en paralelo con B1.1, B1.4, B1.6, B1.9 |

### B1.1 — Registro y almacenamiento seguro de contraseñas

> Responsable: Integrante 1 · Revisor: Integrante 2 · Esfuerzo: M · Prerrequisitos: B0.3, B0.4, B0.5 · Habilita: B1.2

````text
BLOQUE B1.1 — Registro y almacenamiento seguro de contraseñas
Responsable: Integrante 1 (sustituye por tu nombre) · Revisor: Integrante 2 · Fase: F1 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.1 en §4.
- PLAN-MVP §2.4 (`users`), §2.5 (controles) y §5.1 (C-VAL, C-ERR)
- `docs/planificacion/06` §3.1 (hash y política de contraseña), `docs/planificacion/05` §3.2 (`registerAction`) y `docs/planificacion/03` §3.1, como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.3 — Núcleo compartido: validación, errores y reloj (Integrante 1)
- B0.4 — Núcleo web: aplicación Express, EJS, origen y CSRF (Integrante 4)
- B0.5 — Arnés de pruebas HTTP y WebSocket (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Un visitante crea una cuenta en `/registro` con validación en el navegador y en el servidor; la contraseña se guarda con Argon2id y sal; el correo es único.
Archivos o módulos previstos:
- `src/modules/accounts/index.js`, `domain/schemas.js`, `domain/password-policy.js`, `service/register.js`, `service/hasher.js`, `data/users.repo.js`
- `src/web/accounts.routes.js` (ruta de registro), `src/web/views/accounts/registro.ejs`
- `tests/unit/cuentas-politica.test.js`, `tests/integration/cuentas-registro.test.js`
Pasos, en orden:
1. `schemas.js` (C-VAL): `displayName` 2–80, `email` válido (≤254, minúsculas), `password` 10–128, `passwordConfirm` igual a `password`.
2. `password-policy.js`: la contraseña no puede ser igual al correo ni estar en una lista corta de contraseñas comunes (unas 20 entradas); se permite pegar.
3. `hasher.js`: Argon2id con `ARGON2_MEMORY_KIB`, `ARGON2_TIME_COST` y `ARGON2_PARALLELISM` de `config` (por defecto 19 456 KiB, 2 pasadas, 1 hilo); funciones `hash(plain)` y `verify(hash, plain)`; la sal la genera la librería; nunca se registra la contraseña.
4. `users.repo.js`: sentencias preparadas `insertUser` y `findByEmail`.
5. `registerUser(input)`: validar en servidor, normalizar (recorte, NFC, correo en minúsculas), comprobar la política, calcular el hash y guardar; ante `SQLITE_CONSTRAINT_UNIQUE` devolver `EMAIL_TAKEN` (409, campo `email`).
6. Ruta `GET/POST /registro`: renderiza el formulario con `data-schema`; si hay errores, 422 y se repinta sin la contraseña; si todo va bien, 302 a `/ingreso?aviso=cuenta-creada` (no inicia sesión).
7. Vista con `<label>` por campo, `autocomplete` (`name`, `email`, `new-password`), resumen de errores y mensajes junto a cada campo.
8. Pruebas y ejecución real.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- `accounts.registerUser({ displayName, email, password, passwordConfirm }) → { userId }`; errores `VALIDATION_ERROR` (con `fieldErrors`) y `EMAIL_TAKEN`.
- `users.password_hash` contiene una cadena `$argon2id$…`; `accounts.hasher` es el único lugar donde se hashea y verifica.
- La política de contraseña (10–128, distinta del correo, no común) es la misma que usará B1.3.

NO HAGAS (fuera de este bloque)
Inicio y cierre de sesión (B1.2), recuperación (B1.3), límites de intentos y verificación de correo.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-CTA-01 — registro válido crea una fila en `users` con hash `$argon2id$` distinto de la contraseña.
- TM-CTA-02 — dos usuarios con la misma contraseña tienen hashes distintos (sal).
- TM-CTA-03 — cada regla incumplida (nombre corto, correo inválido, contraseña corta, igual al correo, común, confirmación distinta) devuelve error en su campo y no inserta.
- TM-CTA-04 — correo duplicado, también con otra capitalización → 409 `EMAIL_TAKEN`.
- TM-CTA-05 — `POST /registro` sin `Origin` válido → 403 y sin fila.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/unit/cuentas-politica.test.js tests/integration/cuentas-registro.test.js`
Evidencia que debes guardar: Salida de las pruebas y captura de `/registro` con errores (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B0.4: el formulario usa `form-validate.js` y `csrfToken`; con B0.3: el mismo `validate` valida en servidor y navegador (probar un campo inválido con JavaScript desactivado).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.1)
Con datos válidos `POST /registro` crea una fila con hash Argon2id y redirige a `/ingreso`; cada regla incumplida devuelve 422 con su mensaje junto al campo y no crea fila; un correo repetido da 409; ni las respuestas ni los registros contienen la contraseña.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.1: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B1.2 (Integrante 1) y qué archivo o contrato de este bloque necesitan.
````

### B1.2 — Ingreso, sesión, cierre y rutas protegidas

> Responsable: Integrante 1 · Revisor: Integrante 4 · Esfuerzo: L · Prerrequisitos: B1.1 · Habilita: B1.3, B2.1, B2.3

````text
BLOQUE B1.2 — Ingreso, sesión, cierre y rutas protegidas
Responsable: Integrante 1 (sustituye por tu nombre) · Revisor: Integrante 4 · Fase: F1 · Esfuerzo: L

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.2 en §4.
- PLAN-MVP §2.5, §5.1 (C-SES, C-HTTP)
- `docs/planificacion/04` TX-14 (sesiones y efecto sobre HTTP y WebSocket), `docs/planificacion/06` §3.1 (token, cookie, fijación, expiración) y `docs/planificacion/05` §2 (`safeNext`), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.1 — Registro y almacenamiento seguro de contraseñas (Integrante 1)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Un usuario registrado ingresa en `/ingreso`, recibe una sesión del lado del servidor en una cookie segura, accede a `/panel` y cierra sesión; `resolveSession` real sustituye al falso y las rutas protegidas redirigen sin sesión.
Archivos o módulos previstos:
- `src/modules/accounts/service/sessions.js`, `service/login.js`, `data/sessions.repo.js`
- `src/web/accounts.routes.js` (ingreso y salida), `src/web/views/accounts/ingreso.ejs`
- `src/container.js` (cablear `accounts` real; cambio mínimo acordado con el Integrante 4)
- `tests/integration/cuentas-sesion.test.js`
Pasos, en orden:
1. `createSession(userId)`: token aleatorio de 32 bytes en base64url, guarda `sha256(token)` en hexadecimal, `expires_at = ahora + SESSION_TTL_HOURS` (8 h por defecto), `id` UUID.
2. `resolveSession(token, now)`: una consulta con `JOIN` a `users` que exige `revoked_at IS NULL AND expires_at > now`; devuelve el `Principal` de C-SES o `null`.
3. `authenticate(email, password)`: buscar por correo normalizado; si no existe, verificar contra un hash ficticio para igualar el tiempo; mensaje único `INVALID_CREDENTIALS` (401) en ambos casos.
4. `POST /ingreso`: validar campos obligatorios en servidor, autenticar, crear una sesión nueva (ignora cualquier cookie presentada: sin fijación), fijar la cookie `tc_session` (`__Host-tc_session` y `Secure` si `COOKIE_SECURE`) con `HttpOnly`, `SameSite=Lax`, `Path=/` y `Max-Age` igual al TTL; redirigir a `safeNext(next)` o `/panel`.
5. `POST /salir` (con CSRF): `revokeSession(sessionId, 'LOGOUT')` (`revoked_at`, `revoke_reason`), borrar la cookie, y tras confirmar emitir `sessionEvents.emit('session-revoked', { sessionId })`; es idempotente.
6. Dos niveles para revocar todas las sesiones de un usuario: `sessions.revokeAllInTx(db, userId, reason, now)` (solo actualiza filas, para usarla dentro de otra transacción) y `accounts.revokeAllSessions(userId, reason)` (la envuelve en su propia transacción y emite `session-revoked { userId }` **después** de confirmar). B1.3 usa la primera dentro de su transacción.
7. Cablear el servicio real en `createContainer` y proteger `/panel` con `requireAuth`.
8. Pruebas, incluida la comprobación cruzada con el helper de sesión de B0.5.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-SES completo (§5.1): cookie, TTL, `resolveSession(token, now) → Principal | null`, `revokeSession`, `revokeAllSessions`, evento `session-revoked`.
- Mensaje de error de ingreso idéntico para correo inexistente y contraseña incorrecta.
- Una sesión vencida o revocada nunca da acceso: se valida en base en cada petición, sin caché.

NO HAGAS (fuera de este bloque)
Recuperación de clave (B1.3), cierre efectivo de sockets (lo hace el gateway, B1.6; se prueba en B2.1), límites de intentos y renovación deslizante.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-CTA-06 — ingreso correcto: la cookie es `HttpOnly` y `SameSite=Lax`; en la base solo está el hash del token.
- TM-CTA-07 — contraseña incorrecta y correo inexistente devuelven el mismo estado y el mismo mensaje.
- TM-CTA-08 — `/panel` sin cookie → 302 a `/ingreso`; con cookie válida → 200.
- TM-CTA-09 — tras `POST /salir`, la cookie anterior ya no abre `/panel` y `resolveSession` devuelve `null`; salir dos veces da el mismo resultado.
- TM-CTA-10 — una sesión vencida (reloj +8 h) no da acceso.
- TM-CTA-11 — cada ingreso genera un token distinto y no reutiliza la cookie presentada (sin fijación).
- TM-CTA-12 — `next=https://evil.test` o `//evil.test` se ignora y se redirige a `/panel`.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/integration/cuentas-sesion.test.js`
Evidencia que debes guardar: Salida de las pruebas y captura de las cabeceras `Set-Cookie` en el navegador (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B0.4: `attachPrincipal` usa `container.accounts.resolveSession` real y `requireAuth` redirige con `safeNext`.
- Con B0.5: una sesión creada con `createSessionFor` debe ser aceptada por `resolveSession` (si no, corregir el helper o el servicio y avisar a ambos responsables).
- Con B1.6 (más adelante): confirmar que `session-revoked` lleva `{ sessionId }` o `{ userId }` tal como lo espera el gateway.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.2)
Un usuario registrado ingresa y llega a `/panel`; la base guarda solo el hash del token; la cookie tiene `HttpOnly` y `SameSite=Lax` (y `Secure` con `COOKIE_SECURE=true`); tras salir, la cookie anterior no abre ninguna ruta protegida; el helper de sesión de B0.5 y `resolveSession` aceptan las mismas filas.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.2: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B1.3 (Integrante 1), B2.1 (Integrante 1), B2.3 (Integrante 2) y qué archivo o contrato de este bloque necesitan.
````

### B1.3 — Recuperación de clave con token de un solo uso

> Responsable: Integrante 1 · Revisor: Integrante 3 · Esfuerzo: M · Prerrequisitos: B1.2 · Habilita: B2.1

````text
BLOQUE B1.3 — Recuperación de clave con token de un solo uso
Responsable: Integrante 1 (sustituye por tu nombre) · Revisor: Integrante 3 · Fase: F1 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.3 en §4.
- PLAN-MVP §2.4 (`password_reset_tokens`, `mail_outbox`), §2.5 y §5.1 (C-SES)
- `docs/planificacion/04` TX-13 (restablecer contraseña), `docs/planificacion/06` §3.1 (fila «Recuperación») y `docs/planificacion/03` §3.1 (`PasswordResetToken`), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.2 — Ingreso, sesión, cierre y rutas protegidas (Integrante 1)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Desde `/recuperar` un usuario pide un enlace; una bandeja de pruebas controlada muestra el mensaje con un token aleatorio; en `/restablecer` fija una contraseña nueva una sola vez y antes de 30 minutos; todas sus sesiones quedan revocadas.
Archivos o módulos previstos:
- `src/modules/accounts/service/password-reset.js`, `service/mailer.js` (escribe en `mail_outbox`), `data/reset-tokens.repo.js`, `data/mailbox.repo.js`
- `src/web/accounts.routes.js` (recuperar, restablecer, bandeja), `src/web/views/accounts/{recuperar,restablecer,bandeja}.ejs`
- `tests/integration/cuentas-recuperacion.test.js`
Pasos, en orden:
1. `requestPasswordReset(email)`: validar formato; si existe el usuario, generar un token de 32 bytes en base64url y guardarlo como `sha256` con `INSERT … ON CONFLICT(user_id) DO UPDATE` (un solo token activo por usuario, `expires_at = ahora + 30 min`, `used_at = NULL`); escribir en `mail_outbox` un mensaje con el enlace `APP_ORIGIN/restablecer?token=<token>` (nunca construido con la cabecera `Host`). La respuesta es siempre la misma exista o no la cuenta.
2. `GET /restablecer?token=`: muestra el formulario con el token en un campo oculto **sin consumirlo**; responde con `Referrer-Policy: no-referrer`.
3. `resetPassword({ token, newPassword, newPasswordConfirm })`: validar con la política de B1.1; calcular el hash Argon2id **antes** de abrir la transacción (better-sqlite3 es síncrono); en una transacción `BEGIN IMMEDIATE`: `UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?` (0 filas → `TOKEN_INVALID`, mensaje único), actualizar `users.password_hash` y llamar a `sessions.revokeAllInTx(db, userId, 'PASSWORD_RESET', now)` (de B1.2). Solo **después** de confirmar la transacción, emitir `session-revoked` con `{ userId }`. No inicia sesión; redirige a `/ingreso?aviso=clave-cambiada`.
4. Bandeja de pruebas: `GET /dev/bandeja` solo si `DEMO_MAILBOX_ENABLED=true`, protegida con autenticación básica usando `DEMO_MAILBOX_PASSWORD`; lista destinatario, asunto y enlace de los mensajes recientes; con la bandeja desactivada responde 404. El enlace no se imprime en consola ni en registros.
5. Vistas `recuperar`, `restablecer` y `bandeja` con validación en cliente y servidor y mensajes claros.
6. Pruebas con reloj falso.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- `accounts.requestPasswordReset(email) → { accepted: true }` siempre; `accounts.resetPassword(...) → {}` o `TOKEN_INVALID`.
- `mail_outbox` pertenece a `accounts`; cualquier otro módulo que necesite enviar correo lo hará por `accounts`.
- Token: 32 bytes aleatorios, solo su hash en la base, un uso, 30 minutos, uno activo por usuario.

NO HAGAS (fuera de este bloque)
Servidor SMTP real, correo de aviso posterior al cambio y límites de solicitudes.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-CTA-13 — solicitud con correo existente e inexistente: mismo estado y mismo cuerpo.
- TM-CTA-14 — el token se guarda solo como hash y el enlace usa `APP_ORIGIN`.
- TM-CTA-15 — un token válido cambia la clave una vez; el segundo uso → `TOKEN_INVALID`.
- TM-CTA-16 — un token vencido (reloj +31 min) → `TOKEN_INVALID`.
- TM-CTA-17 — dos solicitudes seguidas dejan un solo token utilizable (el último).
- TM-CTA-18 — tras restablecer, una sesión anterior ya no abre `/panel` y se emitió `session-revoked` con `userId`.
- TM-CTA-19 — `/dev/bandeja` responde 404 si está desactivada y 401 sin la clave.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/integration/cuentas-recuperacion.test.js`
Evidencia que debes guardar: Salida de las pruebas y captura de la bandeja con el enlace de la demo (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B1.2: una sesión creada por el ingreso real queda revocada tras el restablecimiento y `/panel` la rechaza.
- Con el gateway (B1.6, aún por integrar): el evento `session-revoked { userId }` es el contrato que cerrará los sockets; la desconexión efectiva se prueba en B2.1.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.3)
El flujo `/recuperar` → bandeja → `/restablecer` cambia la contraseña exactamente una vez; el token usado o vencido da el mismo mensaje de error; las sesiones previas quedan revocadas y el evento `session-revoked` sale con `userId`; la bandeja no está accesible sin activarla y sin clave.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.3: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B2.1 (Integrante 1) y qué archivo o contrato de este bloque necesitan.
````

### B1.4 — Ofertas: reglas, validación y acceso a datos

> Responsable: Integrante 2 · Revisor: Integrante 1 · Esfuerzo: M · Prerrequisitos: B0.3, B0.4, B0.5 · Habilita: B1.5

````text
BLOQUE B1.4 — Ofertas: reglas, validación y acceso a datos
Responsable: Integrante 2 (sustituye por tu nombre) · Revisor: Integrante 1 · Fase: F1 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.4 en §4.
- PLAN-MVP §2.4 (`offers`), §2.5 y §5.1 (C-MOD, C-VAL)
- `docs/planificacion/03` §3.2 (`OfferVersion`: campos y longitudes), §3.0 (provincias) y §6, `docs/planificacion/05` §3.3 (tipos de entrada), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.3 — Núcleo compartido: validación, errores y reloj (Integrante 1)
- B0.4 — Núcleo web: aplicación Express, EJS, origen y CSRF (Integrante 4)
- B0.5 — Arnés de pruebas HTTP y WebSocket (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: El servicio `offers` está completo y probado sin HTTP: crear, listar (filtro por provincia, 10 por página, orden estable), consultar por ID, actualizar y eliminar ofertas propias; cualquier acceso a una oferta ajena responde `NOT_FOUND`.
Archivos o módulos previstos:
- `src/modules/offers/index.js`, `domain/schemas.js`, `domain/provinces.js`, `domain/pagination.js`, `service/offers.service.js`, `data/offers.repo.js`
- `tests/unit/ofertas-validacion.test.js`, `tests/integration/ofertas-servicio.test.js`
Pasos, en orden:
1. `provinces.js`: las 24 provincias con código y etiqueta (lista en `docs/planificacion/03` §3.0), `PROVINCES` y `provinceLabel(code)`.
2. `schemas.js` (C-VAL): `title` 5–120, `description` 20–2000, `province` (enum), `locationText` 5–200, `startsAt` (`YYYY-MM-DDTHH:mm`, hora de Ecuador), `capacity` entero 1–1000. La fecha debe ser futura al crear y al cambiarla; la comprueba el servicio con el reloj inyectado.
3. `offers.repo.js`: sentencias preparadas `insert`, `selectByIdAndOwner`, `listByOwner(ownerId, province|null, limit, offset)`, `countByOwner(ownerId, province|null)`, `updateByIdAndOwner` y `deleteByIdAndOwner`; todas con parámetros, sin concatenar texto.
4. Servicio: `createOffer(principal, input)`, `listOffers(principal, { provincia, pagina })` → `{ items, page, pageSize: 10, total, totalPages, provincia }`, `getOffer(principal, id)`, `updateOffer(principal, id, input)` y `deleteOffer(principal, id, { confirm })`; `deleteOffer` exige `confirm === true` (si no, `VALIDATION_ERROR`).
5. Reglas del listado: orden `starts_at ASC, id ASC`; `pagina` inválida o menor que 1 → 1; mayor que la última → la última; `provincia` desconocida se ignora; solo ofertas del propietario.
6. Propiedad: toda consulta lleva `owner_id`; un `id` ajeno o inexistente produce el mismo `NOT_FOUND`.
7. Pruebas con el arnés de B0.5 y sesión simulada.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- API de `offers` (C-MOD, §5.1): las cinco operaciones y su DTO `{ id, title, description, province, provinceLabel, locationText, startsAt, startsAtLocal, capacity, createdAt, updatedAt }`.
- De otro módulo solo usa `principal.userId`; no consulta `users`.
- Códigos: `VALIDATION_ERROR`, `NOT_FOUND`.

NO HAGAS (fuera de este bloque)
Pantallas y rutas HTTP (B1.5), versiones, revisión, precio y condiciones de la oferta anterior.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-OFE-01 — crear con datos válidos persiste los seis atributos y devuelve el DTO.
- TM-OFE-02 — cada regla de validación (tipo, formato, longitud, fecha pasada) devuelve error por campo y no inserta.
- TM-OFE-03 — el listado filtrado devuelve solo la provincia pedida y solo ofertas propias.
- TM-OFE-04 — con 25 ofertas, las páginas son 10, 10 y 5, en orden estable por fecha e id, sin repetir ni omitir.
- TM-OFE-05 — consultar, editar o eliminar la oferta de otro usuario → `NOT_FOUND` y la fila no cambia.
- TM-OFE-06 — eliminar sin `confirm` → `VALIDATION_ERROR`; con `confirm: true` borra.
- TM-OFE-07 — `provincia = "' OR 1=1 --"` se ignora; un título con comillas se guarda literal.
- TM-OFE-08 — `EXPLAIN QUERY PLAN` del listado filtrado usa `idx_offers_owner_province_starts`.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/unit/ofertas-validacion.test.js tests/integration/ofertas-servicio.test.js`
Evidencia que debes guardar: Salida de las pruebas y del plan de consulta (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B0.2: las columnas e índices usados existen con los nombres de §2.4 (si falta alguno, pedir la migración al Integrante 4 y no crear tablas desde este bloque).
- Con B0.3: los mensajes de `validate` llegan al servicio sin reescribirse.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.4)
Las ocho pruebas pasan; ningún acceso a una oferta ajena tiene éxito ni revela si existe; el listado filtrado usa el índice previsto; la capa de datos usa solo sentencias preparadas.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.4: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B1.5 (Integrante 2) y qué archivo o contrato de este bloque necesitan.
````

### B1.5 — Ofertas: pantallas CRUD, filtro y paginación

> Responsable: Integrante 2 · Revisor: Integrante 4 · Esfuerzo: L · Prerrequisitos: B1.4 · Habilita: B2.2, B2.3, B2.4

````text
BLOQUE B1.5 — Ofertas: pantallas CRUD, filtro y paginación
Responsable: Integrante 2 (sustituye por tu nombre) · Revisor: Integrante 4 · Fase: F1 · Esfuerzo: L

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.5 en §4.
- PLAN-MVP §2.3 (pantallas y rutas), §2.5 y §5.1 (C-HTTP, C-VAL)
- `docs/planificacion/07` §1 (principios) y §6.1 (estados compartidos), `docs/planificacion/05` §2 (`/panel/ofertas?provincia&pagina`), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.4 — Ofertas: reglas, validación y acceso a datos (Integrante 2)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: El usuario autenticado gestiona sus ofertas desde `/panel/ofertas`: listado paginado con filtro por provincia, alta y edición con validación en navegador y servidor, detalle por ID y eliminación con página de confirmación.
Archivos o módulos previstos:
- `src/web/offers.routes.js`
- `src/web/views/offers/{lista,detalle,formulario,eliminar}.ejs`
- `tests/integration/ofertas-http.test.js`
Pasos, en orden:
1. Rutas protegidas con `requireAuth`: `GET /panel/ofertas?provincia=&pagina=`, `GET /panel/ofertas/nueva`, `POST /panel/ofertas`, `GET /panel/ofertas/:id`, `GET /panel/ofertas/:id/editar`, `POST /panel/ofertas/:id/editar`, `GET /panel/ofertas/:id/eliminar` (confirmación) y `POST /panel/ofertas/:id/eliminar`. Un `:id` no entero responde 404.
2. Listado: selector de las 24 provincias con `<label>`, enlace «Quitar filtro», título, provincia, fecha local con «hora de Ecuador» y cupo, paginación como `<nav aria-label>` con `aria-current` que conserva el filtro, estado vacío y enlace «Nueva oferta».
3. Formulario con `data-schema` generado desde el mismo esquema del servidor, campo `datetime-local`, mensajes por campo; ante un error 422 se repinta con los valores escritos.
4. Detalle con todos los atributos y acciones Editar, Eliminar y Volver al listado.
5. Eliminar: página que repite el título y pide confirmar; `POST` sin `confirm` → 422; con `confirm=on` y CSRF la ruta llama al servicio con `confirm: true` → 302 al listado con `?aviso=eliminada`.
6. Avisos solo por `?aviso=creada|actualizada|eliminada` (lista blanca). Todo texto del usuario con `<%= %>`.
7. Pruebas con sesión simulada (B0.5) y captura de pantallas.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- Usa únicamente la API de `offers` y `res.locals.csrfToken`; no cambia el servicio ni el esquema.
- Layout y cabecera son de B0.4/B1.9: este bloque no los modifica.
- Rutas y parámetros (`provincia`, `pagina`) tal como figuran en §2.3.

NO HAGAS (fuera de este bloque)
Cambios en el servicio de ofertas, catálogo público de ofertas ajenas y cualquier función de reservas.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-OFE-09 — ciclo completo por HTTP: alta → listado → detalle por ID → edición → eliminación con confirmación.
- TM-OFE-10 — un `POST` inválido devuelve 422 con el mensaje junto al campo y conserva los valores.
- TM-OFE-11 — sin sesión, todas las rutas de ofertas redirigen a `/ingreso`.
- TM-OFE-12 — la oferta de otro usuario devuelve 404 en detalle, edición y eliminación.
- TM-OFE-13 — un título `<script>alert(1)</script>` aparece escapado en lista y detalle.
- TM-OFE-14 — con 25 ofertas y filtro, se muestran 10 por página y los enlaces de paginación conservan la provincia.
- TM-OFE-15 — `POST` de eliminación sin `confirm` no borra.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/integration/ofertas-http.test.js`
Evidencia que debes guardar: Salida de las pruebas y capturas de lista, formulario con errores, detalle y confirmación (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B0.4: la cabecera y el layout aparecen sin duplicarse; el formulario usa `form-validate.js` y `csrfToken`.
- Con B1.4: la forma exacta del DTO y de `fieldErrors` coincide con la usada en las vistas.
- En F2 (B2.2) se repite el ciclo con ingreso real en lugar de sesión simulada.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.5)
Las siete pruebas pasan; desde el navegador se completa alta, edición, detalle por ID y eliminación con confirmación; el listado pagina de 10 en 10 y filtra por provincia; la oferta de otro usuario devuelve 404 y el texto del usuario se muestra escapado.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.5: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B2.2 (Integrante 4), B2.3 (Integrante 2), B2.4 (Integrante 3) y qué archivo o contrato de este bloque necesitan.
````

### B1.6 — Gateway Socket.IO autenticado y cierre por sesión

> Responsable: Integrante 3 · Revisor: Integrante 1 · Esfuerzo: M · Prerrequisitos: B0.4, B0.5 · Habilita: B1.7, B1.10, B2.1

````text
BLOQUE B1.6 — Gateway Socket.IO autenticado y cierre por sesión
Responsable: Integrante 3 (sustituye por tu nombre) · Revisor: Integrante 1 · Fase: F1 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.6 en §4.
- PLAN-MVP §5.1 (C-EVT, C-SES) y §2.5
- `docs/planificacion/05` §5 (Socket.IO), `docs/planificacion/04` TX-14, `docs/planificacion/06` §3.3 y `docs/planificacion/08` §3.6.3 (T-CHAT-01, 02, 11, 12), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.4 — Núcleo web: aplicación Express, EJS, origen y CSRF (Integrante 4)
- B0.5 — Arnés de pruebas HTTP y WebSocket (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Todo cliente Socket.IO debe presentar `Origin` igual a `APP_ORIGIN` y una cookie de sesión válida en el handshake; cada socket queda asociado a su sesión y usuario, y se cierra al revocarse o vencer la sesión.
Archivos o módulos previstos:
- `src/realtime/gateway.js` (`attachGateway(io, container)`), `src/realtime/session-guard.js`
- `docs/mvp/websocket.md` (explicación y verificación para la defensa)
- `tests/ws/gateway-handshake.test.js`
Pasos, en orden:
1. `attachGateway(io, container)` (se invoca desde `src/server.js`): `maxHttpBufferSize` de 16 kB, mismo origen y sin CORS.
2. Middleware `io.use`: (a) `Origin` ausente o distinto de `APP_ORIGIN` → error con `data.code = 'ORIGIN_MISMATCH'`; (b) cookie ausente, malformada o sesión no válida según `container.accounts.resolveSession` → `data.code = 'UNAUTHENTICATED'`; (c) si es válida: `socket.data = { principal, token }`, unirse a `user:<id>` y `session:<id>`.
3. `guard(socket, handler)`: envoltorio para todo evento entrante que vuelve a validar la sesión; si ya no es válida, emite `session:expired { reason }`, responde `{ ok: false, error: { code: 'UNAUTHENTICATED' } }` cuando hay confirmación y desconecta.
4. Temporizador por socket hasta `sessionExpiresAt` (acotado): emite `session:expired { reason: 'expired' }` y desconecta.
5. Suscribirse a `container.sessionEvents` (`session-revoked`): con `{ sessionId }` cierra la sala `session:<id>`; con `{ userId }` la sala `user:<id>`; antes emite `session:expired { reason: 'revoked' }` y llama a `disconnectSockets(true)`.
6. Exponer el enlace con el chat: `gateway.onMessageStored(fn)` registra una función y `gateway.messageStored(message)` las invoca; `gateway.roomMembers('chat:general')` devuelve los sockets de la sala.
7. Redactar `docs/mvp/websocket.md`: cómo se pasa de HTTP a WebSocket (`GET /socket.io/?EIO=4&transport=websocket` con `Upgrade`, respuesta 101), qué son los paquetes de Engine.IO y los eventos de Socket.IO (tramas `42[…]`), qué es el respaldo por sondeo largo y por qué el cliente fuerza `websocket`, reconexión y latido (valores por defecto de Socket.IO 4: comprobar los de la versión instalada), y cómo verificarlo en DevTools (Network → WS → Headers y Messages), con `socket.io.engine.transport.name` y con `scripts/check-ws.js`; `wss://` en el despliegue (B1.11).
8. Pruebas con `container.accounts` falso (B0.5).

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-EVT (§5.1): handshake, códigos `UNAUTHENTICATED` y `ORIGIN_MISMATCH` en `err.data.code`, salas `user:<id>`, `session:<id>`, `chat:general`, evento `session:expired`, `gateway.onMessageStored` y `gateway.messageStored`.
- `session-revoked` con `{ sessionId }` o `{ userId }` (C-SES).
- El servidor WebSocket vive en el mismo proceso y puerto que HTTP; no se usa ningún servicio externo.

NO HAGAS (fuera de este bloque)
Mensajes de chat, presencia y aviso (B1.7, B1.8, B1.10) y límites de frecuencia.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-WS-01 — conectar sin cookie → `connect_error` con `UNAUTHENTICATED` y sin unirse a ninguna sala.
- TM-WS-02 — cookie válida con `Origin` ajeno o ausente → `ORIGIN_MISMATCH`.
- TM-WS-03 — cookie de una sesión revocada o vencida → rechazo.
- TM-WS-04 — con cookie válida el socket conecta por `websocket` y entra en `user:` y `session:`.
- TM-WS-05 — `session-revoked` por `sessionId` cierra solo los sockets de esa sesión; por `userId`, todos los del usuario.
- TM-WS-06 — con la sesión revocada en la base y sin evento, un mensaje entrante recibe `UNAUTHENTICATED` y el socket se desconecta.
- TM-WS-07 — al llegar `expires_at` (reloj falso) el socket recibe `session:expired` y se cierra.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/ws/gateway-handshake.test.js`
Evidencia que debes guardar: Salida de las pruebas y captura de DevTools con el WebSocket 101 y sus tramas, citada en `docs/mvp/websocket.md` (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B0.5: las pruebas usan el cliente `ws.connect` y `fakeAccounts`; no dependen de B1.2.
- Con B1.2/B1.3: confirmar que el servicio real emite `session-revoked` con la forma pactada (la prueba con servicios reales es B2.1).
- Con B1.7, B1.8 y B1.10: `onMessageStored` y las salas son su punto de enganche; no cambiar sus firmas sin avisar a los Integrantes 3 y 4.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.6)
Las siete pruebas pasan; ningún cliente sin cookie válida y `Origin` correcto llega a una sala; la sesión revocada o vencida pierde el socket; `docs/mvp/websocket.md` permite a cualquier integrante explicar y verificar handshake, eventos y respaldo.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.6: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B1.7 (Integrante 3), B1.10 (Integrante 4), B2.1 (Integrante 1) y qué archivo o contrato de este bloque necesitan.
````

### B1.7 — Chat: mensajes persistentes, historial y pantalla

> Responsable: Integrante 3 · Revisor: Integrante 2 · Esfuerzo: L · Prerrequisitos: B1.6 · Habilita: B1.8, B2.1

````text
BLOQUE B1.7 — Chat: mensajes persistentes, historial y pantalla
Responsable: Integrante 3 (sustituye por tu nombre) · Revisor: Integrante 2 · Fase: F1 · Esfuerzo: L

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.7 en §4.
- PLAN-MVP §2.3, §5.1 (C-EVT, C-MOD) y §2.5
- `docs/planificacion/05` §4–§5, `docs/planificacion/04` TX-15, `docs/planificacion/03` §3.4 (`ChatMessage`), `docs/planificacion/07` §4.7 y `docs/planificacion/08` §3.6.3 (T-CHAT-03 a 08, 13, 14), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.6 — Gateway Socket.IO autenticado y cierre por sesión (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: En `/panel/chat` dos usuarios autenticados intercambian mensajes en la sala general sin recargar; cada mensaje se guarda en SQLite antes de emitirse; el historial se muestra al abrir la sala y se completa tras una reconexión.
Archivos o módulos previstos:
- `src/modules/chat/index.js`, `domain/schemas.js`, `service/chat.service.js`, `data/messages.repo.js`
- `src/realtime/chat.handlers.js`
- `src/web/chat.routes.js` (`GET /panel/chat`, `GET /api/chat/mensajes`), `src/web/views/chat/sala.ejs`, `public/js/chat.js`
- `tests/integration/chat-servicio.test.js`, `tests/ws/chat-mensajes.test.js`
Pasos, en orden:
1. `schemas.js`: `clientMessageId` UUID y `text` de 1 a 500 puntos de código tras recorte y NFC, no solo espacios.
2. `messages.repo.js`: `insertOrGet(authorId, authorName, clientMessageId, text, now)` con `INSERT … ON CONFLICT(author_id, client_message_id) DO NOTHING` y relectura del existente, `listBefore(id, limit)`, `listAfter(id, limit)` y `lastId()`.
3. `chat.postMessage(principal, { clientMessageId, text }) → { message, duplicated }` con `message = { id, author: { id, displayName }, text, createdAt, clientMessageId }`; guarda `author_name` como copia del `displayName` del principal.
4. `chat.handlers.js`: `chat:join` (une al socket a `chat:general`; confirma `{ ok: true, lastMessageId }`; B1.8 añade la presencia), `chat:leave` y `chat:send`. Orden: validar → guardar → confirmar al emisor `{ ok: true, message }` → si no es duplicado, `io.to('chat:general').emit('chat:message', message)` → `gateway.messageStored(message)`. Todos los eventos pasan por `guard` (B1.6). No hay cola: la inserción síncrona de SQLite ya serializa los mensajes.
5. `GET /api/chat/mensajes?before=<id>&limit=30` y `?after=<id>&limit=100`: `limit` entre 1 y 100 (fuera de rango o no numérico → 422), respuesta `{ messages: […en orden ascendente], hasMore }`, `Cache-Control: no-store`; sin sesión → 401 JSON `UNAUTHENTICATED`.
6. Pantalla: EJS pinta los últimos 30 mensajes con el texto escapado y `data-first-id` y `data-last-id`; `public/js/chat.js` conecta con `io({ transports: ['websocket'] })`, envía con `crypto.randomUUID()`, muestra cada mensaje propio como pendiente → confirmado o fallido con «Reintentar» (mismo id), añade mensajes con `textContent` (nunca `innerHTML`), carga anteriores con `before`, y al reconectar pide `after=<último id>` y descarta repetidos por `id`; muestra el transporte activo; la lista usa `role="log"` y `aria-live="polite"`; al abrir `/panel/chat` borra la clave `chatNuevos` de `sessionStorage` (contador del aviso de B1.10).
7. Pruebas de servicio y de WebSocket con dos clientes.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-EVT: `chat:join`, `chat:leave`, `chat:send` (con confirmación), `chat:message`; forma del mensaje y de la confirmación.
- API del historial (cursor entero, `before`/`after`, `hasMore`) y `chat.postMessage`, `chat.getHistory`, `chat.lastMessageId` (C-MOD).
- `chat_messages` pertenece al módulo `chat`; el nombre del autor se guarda como copia, de modo que `chat` no consulta `users`.

NO HAGAS (fuera de este bloque)
Presencia (B1.8), aviso en el panel (B1.10), límite de frecuencia, cola por sala y varias salas.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-CHAT-01 — un envío válido se guarda antes de emitirse y lo recibe el otro cliente.
- TM-CHAT-02 — texto vacío, solo espacios, 501 puntos de código, tipo incorrecto o UUID inválido → `VALIDATION_ERROR`, sin fila ni emisión.
- TM-CHAT-03 — reenviar el mismo `clientMessageId` → una fila y un solo `chat:message`.
- TM-CHAT-04 — historial por cursor: 75 mensajes en páginas de 30, 30 y 15, ascendentes, sin repetir ni omitir.
- TM-CHAT-05 — tras reconectar, `after=<n>` entrega los mensajes perdidos una sola vez.
- TM-CHAT-06 — el historial sobrevive al reinicio (se cierra el servidor y se abre otro sobre el mismo archivo SQLite temporal).
- TM-CHAT-07 — un mensaje con `<script>` se guarda y se entrega literal; la página lo muestra escapado.
- TM-CHAT-08 — `GET /api/chat/mensajes` sin sesión → 401 JSON.
- TM-CHAT-09 — enviar con la sesión revocada en la base → `UNAUTHENTICATED`, sin fila.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/integration/chat-servicio.test.js tests/ws/chat-mensajes.test.js`
Evidencia que debes guardar: Salida de las pruebas y capturas del chat con dos navegadores (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B1.6: el chat solo se enlaza por `attachGateway`, `guard` y `gateway.messageStored`; el aviso de B1.10 depende de que `messageStored` se invoque solo tras guardar un mensaje nuevo.
- Con B0.4: la página usa el layout y el CSRF vigentes; `chat.js` no usa `innerHTML` (la regla ESLint lo comprueba).
- Con B1.8 (siguiente): dejar `chat:join` listo para añadir la presencia sin cambiar su firma.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.7)
Las nueve pruebas pasan; dos usuarios con sesión intercambian mensajes en tiempo real sin recargar; el historial aparece al abrir `/panel/chat`, sobrevive al reinicio y se completa tras una reconexión; el contenido se muestra siempre como texto.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.7: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B1.8 (Integrante 3), B2.1 (Integrante 1) y qué archivo o contrato de este bloque necesitan.
````

### B1.8 — Presencia de usuarios conectados

> Responsable: Integrante 3 · Revisor: Integrante 4 · Esfuerzo: S · Prerrequisitos: B1.7 · Habilita: B2.2

````text
BLOQUE B1.8 — Presencia de usuarios conectados
Responsable: Integrante 3 (sustituye por tu nombre) · Revisor: Integrante 4 · Fase: F1 · Esfuerzo: S

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.8 en §4.
- PLAN-MVP §5.1 (C-EVT)
- `docs/planificacion/05` §5 (presencia), `docs/planificacion/08` §3.6.3 (T-CHAT-09), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.7 — Chat: mensajes persistentes, historial y pantalla (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: La sala muestra la lista de usuarios únicos conectados y se actualiza en vivo al entrar o salir; varias pestañas del mismo usuario cuentan como una presencia.
Archivos o módulos previstos:
- `src/realtime/presence.js`
- cambios acotados en `src/realtime/chat.handlers.js`, `src/web/views/chat/sala.ejs` y `public/js/chat.js`
- `tests/ws/chat-presencia.test.js`
Pasos, en orden:
1. `presence.js`: mapa en memoria `userId → conjunto de sockets` solo de los sockets unidos a `chat:general`.
2. `chat:join`, `chat:leave` y la desconexión actualizan el mapa; se emite `presence:update { users: [{ id, displayName }], count }` a `chat:general` únicamente cuando un usuario pasa de 0 a 1 o de 1 a 0 sockets.
3. La confirmación de `chat:join` incluye `presence` para que el recién llegado vea la lista actual.
4. La desconexión abrupta se detecta por el latido de Socket.IO; el cierre por sesión revocada llega como una desconexión normal.
5. Interfaz: bloque «Conectados (N)» con los nombres como texto; la carga no incluye correos.
6. Pruebas con el cliente de B0.5.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-EVT: `presence:update { users: [{ id, displayName }], count }`; la presencia es por usuario, no por socket; un socket conectado pero no unido a la sala no cuenta.
- No cambia la firma de `chat:join` ni el contenido de `chat:message`.

NO HAGAS (fuera de este bloque)
Notificación en el panel (B1.10), presencia en otras salas y persistencia de presencia.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-CHAT-10 — dos usuarios unidos se ven mutuamente en la lista.
- TM-CHAT-11 — dos pestañas de Ana cuentan como una presencia: cerrar una no la quita; cerrar la segunda sí.
- TM-CHAT-12 — un socket conectado que no se unió a la sala no aparece.
- TM-CHAT-13 — al cerrar la sesión (`session-revoked`), el usuario sale de la presencia.
- TM-CHAT-14 — la carga de `presence:update` contiene solo `id` y `displayName`.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/ws/chat-presencia.test.js`
Evidencia que debes guardar: Salida de las pruebas y captura con dos navegadores mostrando «Conectados (2)» (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B1.7: no se alteran los eventos de mensajes ni el historial (repetir TM-CHAT-01 a 09).
- Con B1.6: el cierre por `session-revoked` debe terminar en desconexión para que la presencia se limpie.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.8)
Las cinco pruebas pasan; la lista de conectados cuenta usuarios únicos y se actualiza sin recargar al entrar, salir o cerrar sesión.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.8: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B2.2 (Integrante 4) y qué archivo o contrato de este bloque necesitan.
````

### B1.9 — Panel principal y navegación coherente

> Responsable: Integrante 4 · Revisor: Integrante 2 · Esfuerzo: S · Prerrequisitos: B0.4, B0.5 · Habilita: B1.10, B2.2

````text
BLOQUE B1.9 — Panel principal y navegación coherente
Responsable: Integrante 4 (sustituye por tu nombre) · Revisor: Integrante 2 · Fase: F1 · Esfuerzo: S

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.9 en §4.
- PLAN-MVP §2.3 (pantallas y rutas)
- `docs/planificacion/07` §1 (principios), §3 (navegación) y §4 (estructura común de pantalla), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.4 — Núcleo web: aplicación Express, EJS, origen y CSRF (Integrante 4)
- B0.5 — Arnés de pruebas HTTP y WebSocket (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: `/panel` es la pantalla principal protegida: saluda al usuario, enlaza a «Mis ofertas» y «Chat», muestra un resumen y permite cerrar sesión; la portada `/` y las páginas de error completan una navegación coherente.
Archivos o módulos previstos:
- `src/web/panel.routes.js`, `src/web/views/panel/inicio.ejs`, `src/web/views/portada.ejs`
- `src/web/views/partials/header.ejs` (menú final) y `public/css/app.css`
- `tests/integration/panel-navegacion.test.js`
Pasos, en orden:
1. Menú único en todas las pantallas autenticadas: Inicio (`/panel`), Mis ofertas (`/panel/ofertas`), Chat (`/panel/chat`), contenedor `#chat-badge` para la insignia de B1.10, nombre del usuario y botón «Salir» (formulario `POST` con CSRF); en las públicas: Ingresar y Crear cuenta.
2. `GET /` portada con enlaces; con sesión, «Ir a mi panel».
3. `GET /panel` exige sesión y muestra el resumen con el número de ofertas propias (`offers.listOffers(principal, { pagina: 1 }).total`) y accesos al chat y a la creación de ofertas.
4. Estilos responsivos y accesibles: contraste suficiente, foco visible, enlace «Saltar al contenido», un `<h1>` y un `<title>` propios por pantalla.
5. Páginas 404 y 403 con enlace de regreso.
6. Pruebas con sesión simulada y servicios falsos.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- El menú y la insignia `#chat-badge` son el contrato con B1.10; el menú se escribe una sola vez en `header.ejs`.
- No modifica servicios; usa `offers.listOffers` solo para el resumen.

NO HAGAS (fuera de este bloque)
Contenido de ofertas y chat, insignia en tiempo real (B1.10) y cualquier función de reservas o catálogo público.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-NAV-01 — `/panel` sin sesión redirige a `/ingreso`.
- TM-NAV-02 — con sesión, el menú muestra Inicio, Mis ofertas, Chat y Salir.
- TM-NAV-03 — una ruta inexistente muestra el 404 con enlace de regreso y sin trazas.
- TM-NAV-04 — el nombre del usuario se muestra escapado (`<b>Ana</b>` aparece como texto).
- TM-NAV-05 — el resumen refleja el número real de ofertas del usuario.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/integration/panel-navegacion.test.js`
Evidencia que debes guardar: Salida de las pruebas y capturas de portada y panel (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B0.4: este bloque reemplaza el contenido provisional de `header.ejs` y del panel sin tocar el resto de la plantilla.
- Con B1.5 y B1.7 (aún no integrados): los enlaces pueden dar 404 hasta entonces; el recorrido de todos los enlaces se prueba en B2.2.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.9)
Las cinco pruebas pasan; el menú es idéntico en todas las pantallas autenticadas; `/panel` solo abre con sesión y enlaza a ofertas, chat y salida.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.9: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B1.10 (Integrante 4), B2.2 (Integrante 4) y qué archivo o contrato de este bloque necesitan.
````

### B1.10 — Aviso de nuevo mensaje en el panel

> Responsable: Integrante 4 · Revisor: Integrante 3 · Esfuerzo: M · Prerrequisitos: B1.6, B1.9 · Habilita: B2.2

````text
BLOQUE B1.10 — Aviso de nuevo mensaje en el panel
Responsable: Integrante 4 (sustituye por tu nombre) · Revisor: Integrante 3 · Fase: F1 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.10 en §4.
- PLAN-MVP §5.1 (C-EVT)
- `docs/planificacion/05` §5 («Mensaje, presencia y notificación (no se confunden)») y `docs/planificacion/08` §3.6.3 (T-CHAT-10); supuesto S-04 de `docs/planificacion/00` §6, como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.6 — Gateway Socket.IO autenticado y cierre por sesión (Integrante 3)
- B1.9 — Panel principal y navegación coherente (Integrante 4)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Un usuario conectado que no está en la pantalla del chat recibe un aviso en tiempo real cuando otro usuario envía un mensaje: la insignia del menú muestra «N mensajes nuevos» sin recargar; el aviso es distinto de la entrega del mensaje a la sala y no llega al autor.
Archivos o módulos previstos:
- `src/realtime/notifications.js` (`registerNotifications(gateway)`)
- `public/js/notificaciones.js`, insignia en `src/web/views/partials/header.ejs` (acordada con B1.9)
- `src/server.js` (una línea que invoca `registerNotifications` tras `attachGateway`)
- `tests/ws/aviso-mensaje.test.js`
Pasos, en orden:
1. `registerNotifications(gateway)`: `gateway.onMessageStored(message => …)` recorre los sockets conectados; a cada socket cuyo usuario no es el autor y que no está en `chat:general` le emite `notification:new-message { messageId, authorDisplayName, createdAt }` (sin texto ni correo).
2. `notificaciones.js` se carga en todas las pantallas autenticadas salvo `/panel/chat`: abre `io({ transports: ['websocket'] })` sin unirse a la sala; al recibir el aviso incrementa un contador guardado en `sessionStorage` (sobrevive a la navegación) y actualiza `#chat-badge` con texto («1 mensaje nuevo», «3 mensajes nuevos») dentro de una región `aria-live="polite"`.
3. `chat.js` (B1.7) borra el contador al abrir el chat; este bloque solo lee y escribe la misma clave de `sessionStorage` acordada en el contrato.
4. Pruebas invocando `gateway.messageStored(message)` directamente.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-EVT: `notification:new-message { messageId, authorDisplayName, createdAt }`; llega a sockets de otros usuarios fuera de `chat:general`; nunca al autor ni a quien está en la sala.
- La clave de `sessionStorage` del contador es `chatNuevos`.
- El gateway y el chat no se modifican: este bloque solo usa `gateway.onMessageStored`.

NO HAGAS (fuera de este bloque)
Persistencia de avisos entre sesiones, notificaciones por correo y avisos de otros eventos del negocio.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-NOT-01 — Luis conectado fuera de la sala recibe `notification:new-message` y no recibe `chat:message`.
- TM-NOT-02 — quien está unido a `chat:general` recibe `chat:message` y no el aviso.
- TM-NOT-03 — el autor no recibe el aviso, tampoco en otra pestaña.
- TM-NOT-04 — la carga del aviso no contiene el texto del mensaje ni correos.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/ws/aviso-mensaje.test.js`
Evidencia que debes guardar: Salida de las pruebas y captura de la insignia «1 mensaje nuevo» sin recargar (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B1.6: usa `onMessageStored` y las salas de C-EVT; no cambia sus firmas.
- Con B1.7 y B1.9: el aviso real con mensajes guardados por el chat y la insignia del menú se comprueban de extremo a extremo en B2.2 (incluido que un mensaje rechazado o repetido no genera aviso).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.10)
Las cuatro pruebas pasan; en dos navegadores, el usuario que está en `/panel` ve aparecer la insignia sin recargar cuando el otro escribe en el chat, y el autor no la ve.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.10: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B2.2 (Integrante 4) y qué archivo o contrato de este bloque necesitan.
````

### B1.11 — Despliegue con HTTPS y WSS

> Responsable: Integrante 2 · Revisor: Integrante 4 · Esfuerzo: M · Prerrequisitos: B0.1, B0.2 · Habilita: B3.3

````text
BLOQUE B1.11 — Despliegue con HTTPS y WSS
Responsable: Integrante 2 (sustituye por tu nombre) · Revisor: Integrante 4 · Fase: F1 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B1.11 en §4.
- PLAN-MVP §2.2, §5.1 (C-ENV) y §6.6 (pendientes externos)
- `docs/planificacion/09` §6.1–§6.4 (requisitos del alojamiento y alternativa de servidor virtual) y `docs/planificacion/06` §3.5 (HSTS y CSP), como referencia; el alojamiento con PostgreSQL de ese documento no aplica

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B0.1 — Repositorio, herramientas y servidor mínimo (Integrante 4)
- B0.2 — SQLite, migraciones y esquema inicial (Integrante 4)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: La aplicación corre fuera del equipo de desarrollo detrás de HTTPS, con SQLite en almacenamiento persistente, y un cliente Socket.IO se conecta por `wss://` al mismo origen; los pasos y la evidencia quedan documentados.
Archivos o módulos previstos:
- `docs/mvp/despliegue.md`
- configuración del proxy o de la plataforma elegida (por ejemplo `deploy/Caddyfile`), si aplica
- ajustes acotados a `scripts/check-ws.js` y a `server.js` (cierre ordenado ante `SIGTERM`), acordados con el Integrante 4
Pasos, en orden:
1. Registrar la decisión de alojamiento (PM-03) con los requisitos mínimos: un proceso Node persistente, WebSocket, HTTPS gestionado, disco persistente para el archivo SQLite, variables secretas. Si al iniciar no hay proveedor, usar la variante local (proxy inverso con certificado local, por ejemplo Caddy con `tls internal` o mkcert) y dejar el despliegue público como pendiente.
2. Variables de producción: `APP_ENV=production`, `APP_ORIGIN=https://<dominio>`, `COOKIE_SECURE=true` (cookie `__Host-tc_session`), `TRUST_PROXY=1`, `DATABASE_FILE` dentro del volumen persistente y secretos distintos de los de desarrollo; `DEMO_MAILBOX_ENABLED` solo durante la demo y con su propia clave.
3. Arranque: `npm ci --omit=dev && npm run db:migrate && npm start`, un solo proceso; `server.js` cierra HTTP, Socket.IO y la base al recibir `SIGTERM`.
4. Proxy: reenviar `Upgrade` y `Connection` para WebSocket y conservar `Host` y `Origin`.
5. Verificar HTTPS: `curl -I https://<host>/salud` devuelve 200 con certificado válido y la cabecera `Strict-Transport-Security`.
6. Verificar WSS: `node scripts/check-ws.js https://<host>` informa `transport=websocket` y, sin cookie, `connect_error` con `UNAUTHENTICATED` (prueba que el handshake sobre TLS llegó a la aplicación); en el navegador, DevTools → Network → WS muestra `wss://…`, estado 101 y tramas `42[…]`.
7. Registrar la versión de Node del entorno y comprobar que `better-sqlite3` y `argon2` quedaron instalados en él (PM-04).
8. Comprobar la persistencia: crear una oferta, reiniciar el proceso y confirmar que sigue ahí.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-ENV (§5.1): las variables de producción; el proxy no altera `Origin`.
- La aplicación no asume otro puerto que `PORT` ni otro esquema que el de `APP_ORIGIN`.

NO HAGAS (fuera de este bloque)
Contenedores y CI/CD (segundo bimestre), copias automáticas, varias instancias y cualquier pasarela de pago.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-DEP-01 — HTTPS: `curl -I` a `/salud` con certificado válido y HSTS (manual).
- TM-DEP-02 — WSS: `check-ws.js` contra `https://<host>` y captura de DevTools con `wss://` y 101 (manual).
- TM-DEP-03 — persistencia: una oferta creada sobrevive al reinicio del proceso (manual).
Comando previsto (no verificado hasta que lo ejecutes): `curl -I https://<host>/salud` · `node scripts/check-ws.js https://<host>`
Evidencia que debes guardar: Salidas de los comandos y capturas en `docs/mvp/evidencias/B1.11/`, con la URL real o la indicación «local con certificado propio» (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B1.11)
Queda registrada una de dos situaciones: (a) URL pública con HTTPS y WSS verificados con evidencia, o (b) variante local con TLS verificada y despliegue público declarado pendiente (PM-03); en ambos casos `docs/mvp/despliegue.md` permite repetir los pasos y la persistencia tras reinicio está comprobada.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B1.11: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B3.3 (Integrante 1) y qué archivo o contrato de este bloque necesitan.
````

---

## Fase F2 — Integración y evidencias

Cierre de fase: El recorrido completo (registro, ingreso, CRUD, chat entre dos usuarios con historial, presencia y aviso, salida) pasa en una prueba automatizada y manualmente con dos navegadores; tras cerrar sesión o restablecer la clave, `/panel`, `/panel/chat` y el WebSocket pierden el acceso; las pruebas de seguridad de B2.4 pasan; el informe de rendimiento de B2.3 contiene cifras reales de dos ejecuciones.

| Bloque | Título | Responsable | Revisor | Prerrequisitos | Orden de ejecución / paralelo |
|---|---|---|---|---|---|
| B2.1 | Integración de sesión HTTP y WebSocket | Integrante 1 | Integrante 3 | B1.2, B1.3, B1.6, B1.7 | Ola 1 · en paralelo con B2.3 |
| B2.2 | Integración del panel y datos de demostración | Integrante 4 | Integrante 1 | B1.5, B1.8, B1.9, B1.10, B2.1 | Ola 2 · en paralelo con B2.4 |
| B2.3 | Medición de rendimiento del listado filtrado | Integrante 2 | Integrante 4 | B1.2, B1.5 | Ola 1 · en paralelo con B2.1 |
| B2.4 | Pruebas de seguridad y demostración de seguridad | Integrante 3 | Integrante 1 | B2.1, B1.5 | Ola 2 · en paralelo con B2.2 |

### B2.1 — Integración de sesión HTTP y WebSocket

> Responsable: Integrante 1 · Revisor: Integrante 3 · Esfuerzo: M · Prerrequisitos: B1.2, B1.3, B1.6, B1.7 · Habilita: B2.2, B2.4

````text
BLOQUE B2.1 — Integración de sesión HTTP y WebSocket
Responsable: Integrante 1 (sustituye por tu nombre) · Revisor: Integrante 3 · Fase: F2 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B2.1 en §4.
- PLAN-MVP §5.1 (C-SES, C-EVT) y §6.2 (integración)
- `docs/planificacion/04` TX-13 y TX-14, `docs/planificacion/05` §5 (validación de la sesión) y `docs/planificacion/08` §3.6.3 (T-CHAT-11 y T-CHAT-12), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.2 — Ingreso, sesión, cierre y rutas protegidas (Integrante 1)
- B1.3 — Recuperación de clave con token de un solo uso (Integrante 1)
- B1.6 — Gateway Socket.IO autenticado y cierre por sesión (Integrante 3)
- B1.7 — Chat: mensajes persistentes, historial y pantalla (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Con cuentas reales, el panel y el chat pierden el acceso en cuanto la sesión se cierra o se restablece la contraseña: la cookie anterior deja de abrir `/panel` y `/panel/chat`, el historial HTTP responde 401 y los sockets abiertos se cierran.
Archivos o módulos previstos:
- `tests/integration/sesion-http-ws.test.js`
- ajustes mínimos en `src/container.js` y `src/server.js` si falta cablear el servicio real y `sessionEvents` en el gateway (acordados con el Integrante 4)
- `docs/mvp/evidencias/B2.1/` (salida de pruebas y pasos de la comprobación manual con dos navegadores)
Pasos, en orden:
1. Cablear en el arranque real: `accounts` real como resolvedor del gateway y el mismo `sessionEvents` compartido entre cuentas y tiempo real.
2. Prueba de extremo a extremo con servidor real en puerto efímero: registrar e ingresar a Ana y a Luis por HTTP con cookies reales y conectar a ambos al chat.
3. Cierre de sesión de Ana (`POST /salir`): su socket recibe `session:expired` y se desconecta; `GET /panel` y `GET /panel/chat` con la cookie vieja → 302 a `/ingreso`; `GET /api/chat/mensajes` → 401; reconectar con la cookie vieja → `connect_error` `UNAUTHENTICATED`; Luis sigue conectado.
4. Restablecimiento de clave de Luis (flujo de B1.3): todos sus sockets se cierran y su cookie anterior pierde acceso.
5. Revalidación por evento: revocar una sesión directamente en la base, sin emitir evento, y enviar `chat:send` → `UNAUTHENTICATED` y ninguna fila nueva.
6. Documentar la comprobación manual (dos navegadores: cerrar sesión en uno y observar que el chat del otro lado, abierto con esa sesión, se desconecta).
7. Si una prueba falla por un contrato incompatible, devolverla con el nombre de la prueba al responsable del bloque (B1.2, B1.3, B1.6 o B1.7) en lugar de corregir su código.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- C-SES y C-EVT tal como están en §5.1; este bloque no los cambia, solo los verifica con servicios reales.
- Evento `session-revoked` con `{ sessionId }` o `{ userId }`, emitido por `accounts` solo después de confirmar la transacción.

NO HAGAS (fuera de este bloque)
Funciones nuevas de cuentas o chat y cambios de contrato.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-INT-01 — tras `POST /salir`, el socket de esa sesión se cierra y la cookie anterior no abre `/panel`, `/panel/chat` ni el historial; las demás sesiones siguen activas.
- TM-INT-02 — restablecer la clave cierra todos los sockets del usuario y sus cookies pierden acceso.
- TM-INT-03 — reconectar con una cookie de sesión revocada → `connect_error` `UNAUTHENTICATED`.
- TM-INT-04 — con la sesión revocada solo en la base, `chat:send` → `UNAUTHENTICATED` y 0 filas nuevas.
- TM-INT-05 — con la sesión vencida (reloj +8 h) el socket se cierra y `/panel` redirige.
Comando previsto (no verificado hasta que lo ejecutes): `node --test tests/integration/sesion-http-ws.test.js`
Evidencia que debes guardar: Salida de las pruebas y registro de la comprobación manual con dos navegadores (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Converge B1.2/B1.3 (cuentas), B1.6 (gateway) y B1.7 (chat): comprobar que `accounts` emite `session-revoked` después del `COMMIT`, que el gateway lo escucha del mismo `sessionEvents` y que `chat:send` pasa por `guard`.
- Cualquier fallo se registra con el nombre de la prueba y el bloque responsable.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B2.1)
Las cinco pruebas pasan con servicios reales; tras cerrar sesión o restablecer la clave, `/panel`, `/panel/chat`, el historial y el WebSocket de esa sesión dejan de funcionar mientras las demás sesiones siguen vivas; la comprobación manual queda documentada.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B2.1: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B2.2 (Integrante 4), B2.4 (Integrante 3) y qué archivo o contrato de este bloque necesitan.
````

### B2.2 — Integración del panel y datos de demostración

> Responsable: Integrante 4 · Revisor: Integrante 1 · Esfuerzo: M · Prerrequisitos: B1.5, B1.8, B1.9, B1.10, B2.1 · Habilita: B3.1, B3.2, B3.4

````text
BLOQUE B2.2 — Integración del panel y datos de demostración
Responsable: Integrante 4 (sustituye por tu nombre) · Revisor: Integrante 1 · Fase: F2 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B2.2 en §4.
- PLAN-MVP §2.1 (recorrido de demostración), §2.3 y §6.4
- `docs/planificacion/12` §2–§3 (guion y datos semilla del diseño anterior), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.5 — Ofertas: pantallas CRUD, filtro y paginación (Integrante 2)
- B1.8 — Presencia de usuarios conectados (Integrante 3)
- B1.9 — Panel principal y navegación coherente (Integrante 4)
- B1.10 — Aviso de nuevo mensaje en el panel (Integrante 4)
- B2.1 — Integración de sesión HTTP y WebSocket (Integrante 1)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: El recorrido completo de la demo funciona de extremo a extremo con datos ficticios sembrados y una prueba automatizada lo recorre sin intervención.
Archivos o módulos previstos:
- `scripts/seed-demo.js` (idempotente, usa los servicios de los módulos), script `seed:demo` en `package.json`
- `tests/integration/recorrido-completo.test.js`
- `docs/mvp/demo.md` (datos de demostración y comprobaciones previas; el guion es de B3.4), `docs/mvp/evidencias/B2.2/`
Pasos, en orden:
1. `seed-demo.js`: cuentas `ana@demo.test` y `luis@demo.test` con la contraseña de `SEED_DEMO_PASSWORD` (no versionada), 12 ofertas ficticias de Ana repartidas en 4 provincias (suficientes para paginar y filtrar), 3 de Luis y 5 mensajes de chat iniciales; ejecutarlo dos veces no duplica datos.
2. Prueba de recorrido sin intervención: registro → ingreso → crear oferta → listar, filtrar y paginar → detalle por ID → editar → eliminar con confirmación → recuperar la clave con la bandeja → chat entre dos usuarios (dos sockets) → historial tras recargar → presencia → aviso adicional en el panel → cierre de sesión.
3. Incluir en la prueba: recorrido de todos los enlaces del menú (todos responden 200 y repiten el menú) y que un mensaje rechazado o repetido no genera aviso.
4. Lista de comprobación manual con dos navegadores (perfil normal y ventana privada) en `docs/mvp/demo.md`.
5. Medir y anotar cuánto tarda el recorrido manual para dimensionar el guion de B3.4.
6. Corregir solo incompatibilidades de contrato devolviéndolas a su responsable; este bloque no parcha módulos ajenos.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- Contratos de §5.1 sin cambios; el seed solo usa las API públicas de `accounts`, `offers` y `chat`.
- Datos ficticios y dominio reservado `@demo.test`; ninguna contraseña real en el repositorio.

NO HAGAS (fuera de este bloque)
Guion y presentación (B3.4) y cualquier dato de reservas, pagos o entradas.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-INT-06 — recorrido automatizado completo (registro hasta cierre de sesión) pasa sin intervención.
- TM-NAV-06 — todos los enlaces del menú responden 200 con sesión real y repiten el menú.
- TM-NOT-05 — un mensaje rechazado o repetido no genera aviso; uno válido sí.
- TM-INT-07 — `npm run seed:demo` dos veces deja las mismas filas (idempotente).
Comando previsto (no verificado hasta que lo ejecutes): `npm run seed:demo && node --test tests/integration/recorrido-completo.test.js`
Evidencia que debes guardar: Salida de las pruebas y registro de la comprobación manual con dos navegadores, con tiempos (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Converge B1.5 (ofertas), B1.8 (presencia), B1.9 (panel), B1.10 (aviso) y B2.1 (sesión): ejecutar el recorrido contra `main` con todo integrado y anotar qué bloque falla ante cada error.
- Repetir TM-OFE-09 con ingreso real y TM-CHAT-01 a 03 con cuentas reales.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B2.2)
El recorrido automatizado pasa; con la base sembrada, dos navegadores completan manualmente el recorrido de la demo sin errores; el menú lleva a todas las pantallas; el seed es idempotente y no contiene credenciales reales.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B2.2: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B3.1 (Integrante 4), B3.2 (Integrante 2), B3.4 (Integrante 3) y qué archivo o contrato de este bloque necesitan.
````

### B2.3 — Medición de rendimiento del listado filtrado

> Responsable: Integrante 2 · Revisor: Integrante 4 · Esfuerzo: M · Prerrequisitos: B1.2, B1.5 · Habilita: B3.2, B3.4

````text
BLOQUE B2.3 — Medición de rendimiento del listado filtrado
Responsable: Integrante 2 (sustituye por tu nombre) · Revisor: Integrante 4 · Fase: F2 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B2.3 en §4.
- PLAN-MVP §2.4 (índices) y §6.3
- `docs/planificacion/08` §7 y §7.1 (método y formato del informe de rendimiento) y la ficha `PE-01` de `docs/planificacion/10`, como referencia; la medición sobre PostgreSQL de ese diseño se adapta a SQLite

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B1.2 — Ingreso, sesión, cierre y rutas protegidas (Integrante 1)
- B1.5 — Ofertas: pantallas CRUD, filtro y paginación (Integrante 2)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Un informe repetible del tiempo de respuesta del listado filtrado y paginado con 20 000 ofertas ficticias, con volumen, comandos, versiones y resultados reales, comparando con y sin índice.
Archivos o módulos previstos:
- `scripts/perf-seed.js`, `scripts/perf-catalog.js`; scripts `perf:seed` y `perf:catalog` en `package.json`
- `docs/mvp/evidencias/B2.3/rendimiento.md` y la salida literal de los comandos
- `tests/integration/rendimiento-datos.test.js` (verificación del sembrado con un volumen reducido)
Pasos, en orden:
1. `perf:seed`: crea `data/perf.sqlite` (se niega si el nombre no termina en `perf.sqlite`; nunca toca la base de desarrollo), aplica las migraciones, crea el usuario `perf@demo.test` y 20 000 ofertas ficticias del mismo usuario repartidas en las 24 provincias con fechas futuras, en una sola transacción; imprime el volumen y el reparto por provincia.
2. `perf:catalog`: arranca el servidor con `NODE_ENV=production` sobre esa base, ingresa una vez y mide `GET /panel/ofertas?provincia=PICHINCHA` (primera página) y una página profunda: 50 peticiones de calentamiento descartadas, 1000 muestras con concurrencia 10 y 3 repeticiones; calcula mediana y percentil 95 por rango más cercano, mínimo, máximo y errores (las respuestas distintas de 200 cuentan como errores y no entran en los percentiles).
3. Medir también la consulta SQL aislada (reloj monótono dentro del proceso) y guardar `EXPLAIN QUERY PLAN`.
4. Variante `--sin-indice`: copia de la base sin `idx_offers_owner_province_starts` para comparar.
5. Plantilla del informe con: identificación (fecha UTC, commit, quién), entorno (CPU, memoria, sistema, versiones de Node y SQLite), datos reales tras sembrar, parámetros y comando exacto, resultados por repetición y resumen, plan de consulta, lectura honesta y limitaciones (una sola máquina, caché caliente). Estado inicial `PENDIENTE DE EJECUCIÓN`; solo pasa a `EJECUTADO` con las cifras copiadas de la salida real.
6. El revisor repite la medición en su equipo; ambos resultados figuran en el informe. El criterio de referencia (p95 ≤ 300 ms en la página) es una **propuesta**, no un resultado.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- No modifica el servicio ni el esquema; si el índice de B0.2 no sirve a la consulta, se informa al Integrante 4 con el plan de consulta.
- El informe nunca contiene cifras estimadas ni de ejemplo.

NO HAGAS (fuera de este bloque)
Optimizaciones de código, Lighthouse y pruebas de carga del chat.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-PERF-01 — el sembrado reducido (por ejemplo 2 400 filas) crea las 24 provincias con 100 ofertas cada una (verificación SQL).
- TM-PERF-02 — `EXPLAIN QUERY PLAN` del listado usa `idx_offers_owner_province_starts`.
- TM-PERF-03 — el informe no tiene celdas vacías ni «—» y declara el estado `EJECUTADO` (lista de comprobación manual).
Comando previsto (no verificado hasta que lo ejecutes): `npm run perf:seed && npm run perf:catalog` · `npm run perf:catalog -- --sin-indice`
Evidencia que debes guardar: `docs/mvp/evidencias/B2.3/rendimiento.md` con salida real de dos ejecuciones (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B1.5: el listado medido es el de la ruta real `/panel/ofertas`; con B0.2: se comprueba el índice de verdad, no un supuesto.
- Con B1.2: el script usa el servicio de ingreso real para obtener la cookie.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B2.3)
`perf:seed` crea 20 000 filas verificadas por SQL; `perf:catalog` imprime mediana, p95, mínimo, máximo y errores por repetición; el informe indica volumen, comando, entorno y plan de consulta, compara con y sin índice y fue repetido por otra persona; ninguna cifra es estimada.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B2.3: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B3.2 (Integrante 2), B3.4 (Integrante 3) y qué archivo o contrato de este bloque necesitan.
````

### B2.4 — Pruebas de seguridad y demostración de seguridad

> Responsable: Integrante 3 · Revisor: Integrante 1 · Esfuerzo: M · Prerrequisitos: B2.1, B1.5 · Habilita: B3.2, B3.4

````text
BLOQUE B2.4 — Pruebas de seguridad y demostración de seguridad
Responsable: Integrante 3 (sustituye por tu nombre) · Revisor: Integrante 1 · Fase: F2 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B2.4 en §4.
- PLAN-MVP §2.5 (controles) y §5.1
- Word, «Requisitos no funcionales → Seguridad»; `docs/planificacion/06` §2 (matriz de amenazas) y §3.1–§3.6, `docs/planificacion/08` §3.7 (T-SEG), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B2.1 — Integración de sesión HTTP y WebSocket (Integrante 1)
- B1.5 — Ofertas: pantallas CRUD, filtro y paginación (Integrante 2)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Un conjunto de pruebas automatizadas y un guion de tres minutos demuestran hash con sal, validación en el servidor, rutas protegidas, CSRF, XSS, inyección SQL y WebSocket autenticado.
Archivos o módulos previstos:
- `tests/security/*.test.js`
- `docs/mvp/seguridad.md` (matriz control → requisito del Word → archivo → prueba → cómo mostrarlo en vivo)
- regla `no-restricted-properties` para `innerHTML` en `public/js` dentro de `eslint.config.js` (acordada con el Integrante 4)
Pasos, en orden:
1. Redactar la matriz de `docs/mvp/seguridad.md` a partir de §2.5 y de la sección «Seguridad» del Word.
2. TM-SEG-01 (hash): en la base el valor empieza por `$argon2id$`, no contiene la contraseña y dos cuentas con la misma contraseña difieren.
3. TM-SEG-02 (validación en servidor): `POST` directo, sin JavaScript, con datos inválidos → 422 y nada en la base (cuentas y ofertas).
4. TM-SEG-03 (rutas protegidas): recorrer la tabla de rutas de §2.3 sin sesión → 302 o 401.
5. TM-SEG-04 (CSRF): `POST` sin `Origin`, con `Origin` ajeno o sin token → 403 y sin efecto, en ofertas y en `/salir`.
6. TM-SEG-05 (XSS): títulos y mensajes con `<img onerror>` y `<script>` salen escapados; `npm run lint` impide `innerHTML` en `public/js`; comprobación visual en el navegador con captura.
7. TM-SEG-06 (inyección SQL): cargas maliciosas en `provincia`, `pagina`, el correo de ingreso y los campos de oferta no producen error 500 ni filas ajenas y las tablas siguen intactas.
8. TM-SEG-07 (WebSocket): sin cookie, con `Origin` ajeno, con cargas inválidas (`text` objeto, 600 caracteres) y con sesión revocada → rechazo sin persistir.
9. TM-SEG-08 (cookies): `Set-Cookie` con `HttpOnly` y `SameSite=Lax`; con `COOKIE_SECURE=true`, `Secure` y prefijo `__Host-`.
10. TM-SEG-09 (secretos): `.env` está ignorado por Git, `.env.example` contiene solo marcadores y las claves coinciden con `src/config.js`.
11. TM-SEG-10 (cabeceras): CSP, `nosniff` y `frame-ancestors` presentes.
12. Guion de demostración de seguridad de tres minutos para B3.4.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- No cambia contratos ni código de otros bloques: cada fallo se devuelve con el nombre de la prueba al responsable.
- Los riesgos conocidos no cubiertos (límites de intentos, enumeración al registrar, sin inactividad de sesión) se listan como riesgo residual en `docs/mvp/seguridad.md`.

NO HAGAS (fuera de este bloque)
Corregir defectos en módulos ajenos, escaneos automáticos de dependencias y pruebas de penetración externas.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-SEG-01 — hash Argon2id con sal.
- TM-SEG-02 — validación en servidor sin JavaScript.
- TM-SEG-03 — rutas protegidas sin sesión.
- TM-SEG-04 — CSRF: origen y token.
- TM-SEG-05 — XSS escapado y regla contra `innerHTML`.
- TM-SEG-06 — inyección SQL sin efecto.
- TM-SEG-07 — WebSocket: autenticación, origen y cargas inválidas.
- TM-SEG-08 — atributos de la cookie de sesión.
- TM-SEG-09 — secretos fuera del repositorio.
- TM-SEG-10 — cabeceras de seguridad.
Comando previsto (no verificado hasta que lo ejecutes): `node --test "tests/security/*.test.js"` · `npm run lint`
Evidencia que debes guardar: Salida de las pruebas, matriz de `docs/mvp/seguridad.md` y capturas del guion de demostración (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Converge cuentas (B1.1 a B1.3), ofertas (B1.5), chat (B1.7) y la base común (B0.4): ejecutar contra `main` con todo integrado; cada fallo se asigna al bloque responsable.
- Confirmar con B2.1 que la comprobación de sesión del WebSocket no se duplica entre ambos bloques.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B2.4)
Las diez pruebas pasan; la matriz relaciona cada control con su requisito del Word, su archivo y su prueba; los riesgos residuales están declarados; el guion de tres minutos puede ejecutarse en vivo con las cuentas sembradas.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B2.4: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B3.2 (Integrante 2), B3.4 (Integrante 3) y qué archivo o contrato de este bloque necesitan.
````

---

## Fase F3 — Entrega y demostración

Cierre de fase: La lista de §6.3 está completa o cada pendiente figura con su motivo: README y `.env.example` verificados en un clon limpio por otra persona, historias y matriz con resultados reales, diagrama coherente con el código, presentación lista, ensayo de 15 + 5 minutos con los cuatro, repositorio público con commits de los cuatro, etiqueta `v1.0-b1` y evidencias subidas.

| Bloque | Título | Responsable | Revisor | Prerrequisitos | Orden de ejecución / paralelo |
|---|---|---|---|---|---|
| B3.1 | Diagrama de arquitectura y coherencia con el código | Integrante 4 | Integrante 2 | B2.2 | Ola 1 · en paralelo con B3.2 |
| B3.2 | Historias finales y matriz de trazabilidad con pruebas | Integrante 2 | Integrante 3 | B2.2, B2.3, B2.4 | Ola 1 · en paralelo con B3.1 |
| B3.3 | README, uso de IA y revisión del repositorio | Integrante 1 | Integrante 4 | B3.1, B3.2, B1.11 | Ola 2 · en paralelo con B3.4 |
| B3.4 | Presentación y guion de demo | Integrante 3 | Integrante 1 | B2.2, B2.3, B2.4, B3.1 | Ola 2 · en paralelo con B3.3 |
| B3.5 | Ensayo general y cierre de entrega | Integrante 4 | Integrante 2 | B3.3, B3.4 | Ola 3 · sin bloques en paralelo en su ola |

### B3.1 — Diagrama de arquitectura y coherencia con el código

> Responsable: Integrante 4 · Revisor: Integrante 2 · Esfuerzo: S · Prerrequisitos: B2.2 · Habilita: B3.3, B3.4

````text
BLOQUE B3.1 — Diagrama de arquitectura y coherencia con el código
Responsable: Integrante 4 (sustituye por tu nombre) · Revisor: Integrante 2 · Fase: F3 · Esfuerzo: S

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B3.1 en §4.
- PLAN-MVP §2.2 (arquitectura) y §2.4
- Word, «Qué significa monolítica» y fila 3 de la rúbrica; `docs/planificacion/02` §2 y §4, como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B2.2 — Integración del panel y datos de demostración (Integrante 4)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: `docs/mvp/arquitectura.md` contiene el diagrama del monolito (capas, SQLite y servidor WebSocket) exportado como imagen, actualizado con el código real y listo para el README y las diapositivas.
Archivos o módulos previstos:
- `docs/mvp/arquitectura.md`, `docs/mvp/img/arquitectura.svg` (o `.png`)
- actualización de `docs/mvp/esquema.md` si el esquema final difiere
Pasos, en orden:
1. Partir del diagrama de PLAN-MVP §2.2 y de la tabla de componentes.
2. Contrastar cada componente con el árbol real (`git ls-files src public db`) y con las rutas registradas en `createApp`; corregir lo que no coincida.
3. Dibujar el diagrama en Mermaid y exportarlo a imagen; incluir navegador, Express (rutas, middlewares), vistas EJS, módulos `accounts`, `offers` y `chat`, capa de datos, SQLite, Socket.IO en el mismo `http.Server` y la bandeja de pruebas.
4. Añadir la tabla «componente → carpeta → responsabilidad» y las reglas de dependencia entre módulos.
5. Actualizar el diagrama entidad-relación de `esquema.md` contra las migraciones reales.
6. El revisor verifica cinco afirmaciones del diagrama contra el código y anota cuáles.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- El diagrama no promete nada que el código no tenga: lo aplazado se marca como fuera del MVP.

NO HAGAS (fuera de este bloque)
Diagramas de la evolución al segundo bimestre y cualquier cambio de código.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-ARQ-01 — cada carpeta y archivo nombrado en el diagrama existe (comprobación con `test -e` sobre una lista) y el revisor confirma cinco afirmaciones.
Comando previsto (no verificado hasta que lo ejecutes): `git ls-files src public db scripts` y una lista de comprobación de rutas
Evidencia que debes guardar: Diagrama exportado, tabla de coherencia y registro de las cinco afirmaciones verificadas (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B3.1)
Todos los componentes y carpetas del diagrama existen en el repositorio; el diagrama muestra capas, base de datos y servidor WebSocket en un solo proyecto; el revisor confirmó cinco afirmaciones contra el código.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B3.1: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B3.3 (Integrante 1), B3.4 (Integrante 3) y qué archivo o contrato de este bloque necesitan.
````

### B3.2 — Historias finales y matriz de trazabilidad con pruebas

> Responsable: Integrante 2 · Revisor: Integrante 3 · Esfuerzo: S · Prerrequisitos: B2.2, B2.3, B2.4 · Habilita: B3.3

````text
BLOQUE B3.2 — Historias finales y matriz de trazabilidad con pruebas
Responsable: Integrante 2 (sustituye por tu nombre) · Revisor: Integrante 3 · Fase: F3 · Esfuerzo: S

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B3.2 en §4.
- PLAN-MVP §1 (matriz y obligaciones) y §6.3
- `docs/mvp/historias-de-usuario.md` (B0.7) y `docs/mvp/pruebas.md` (B0.5)

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B2.2 — Integración del panel y datos de demostración (Integrante 4)
- B2.3 — Medición de rendimiento del listado filtrado (Integrante 2)
- B2.4 — Pruebas de seguridad y demostración de seguridad (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: `historias-de-usuario.md` queda actualizado con lo realmente implementado y `docs/mvp/pruebas.md` contiene la matriz requisito → historia → prueba → resultado real de la última ejecución.
Archivos o módulos previstos:
- `docs/mvp/historias-de-usuario.md` (columna «Estado»), `docs/mvp/pruebas.md` (matriz y conteo)
- `docs/mvp/evidencias/B3.2/npm-test.txt` (salida completa de `npm test`)
Pasos, en orden:
1. Ejecutar `npm test` completo sobre `main` y guardar la salida literal.
2. Marcar cada historia como implementada, parcial o aplazada según el código y las pruebas reales; corregir criterios que ya no coincidan.
3. Construir la matriz: cada ítem de la rúbrica (R1–R11) y cada obligación (O1–O15) con su historia, sus pruebas (`TM-…`) y su estado (pasa / falla / pendiente / manual).
4. Contar las pruebas automatizadas relevantes por categoría (validación, cuentas, CRUD, chat, seguridad) y declarar el total real.
5. Registrar como pendiente todo criterio sin evidencia.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- Los resultados provienen únicamente de ejecuciones reales; nada se rellena por estimación.

NO HAGAS (fuera de este bloque)
Escribir pruebas nuevas o cambiar código para que la matriz cuadre.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-ENT-06 — cada R y cada O de PLAN-MVP §1 tiene al menos una prueba o evidencia en la matriz, o está marcado como pendiente (revisión del revisor).
Comando previsto (no verificado hasta que lo ejecutes): `npm test`
Evidencia que debes guardar: `npm-test.txt`, matriz actualizada y conteo de pruebas (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B3.2)
La matriz cubre los once ítems de la rúbrica y las quince obligaciones; todas las historias tienen estado; el conteo de pruebas coincide con la salida de `npm test`; los criterios sin evidencia figuran como pendientes.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B3.2: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B3.3 (Integrante 1) y qué archivo o contrato de este bloque necesitan.
````

### B3.3 — README, uso de IA y revisión del repositorio

> Responsable: Integrante 1 · Revisor: Integrante 4 · Esfuerzo: M · Prerrequisitos: B3.1, B3.2, B1.11 · Habilita: B3.5

````text
BLOQUE B3.3 — README, uso de IA y revisión del repositorio
Responsable: Integrante 1 (sustituye por tu nombre) · Revisor: Integrante 4 · Fase: F3 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B3.3 en §4.
- PLAN-MVP §6.3 (checklist de entrega)
- Word, «Repositorio y entrega» e «Integridad académica y uso de inteligencia artificial»; `docs/planificacion/12` §5 y §6 (declaración de IA, commits auténticos), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B3.1 — Diagrama de arquitectura y coherencia con el código (Integrante 4)
- B3.2 — Historias finales y matriz de trazabilidad con pruebas (Integrante 2)
- B1.11 — Despliegue con HTTPS y WSS (Integrante 2)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: `README.md` completo (PYME y problema, stack, pasos de ejecución, variables de entorno, diagramas, integrantes con roles y «Uso de IA»), `.env.example` verificado y repositorio listo para hacerse público sin secretos ni datos personales reales, con la autoría de los cuatro comprobada.
Archivos o módulos previstos:
- `README.md`, `.env.example`, `docs/mvp/ia.md` (registro de uso de IA por bloque)
- `docs/mvp/evidencias/B3.3/` (autoría, búsqueda de secretos, instalación en clon limpio)
Pasos, en orden:
1. README con las secciones que exige el Word: descripción de la PYME y del problema, stack, pasos para ejecutar (`npm ci`, `npm run db:migrate`, `npm run seed:demo`, `npm start`, `npm test`), variables de entorno con `.env.example`, diagramas (B3.1 y `esquema.md`), integrantes con sus roles y la sección «Uso de IA».
2. «Uso de IA»: herramientas y versiones, propósito (planificación y generación de código por bloques), qué se generó, cómo se revisó (tabla bloque → revisor distinto del autor, pruebas ejecutadas) y la declaración de que cada integrante puede explicar y modificar lo suyo; `docs/mvp/ia.md` guarda el detalle por bloque.
3. Verificar `.env.example` contra `src/config.js`: todas las claves, solo marcadores.
4. Revisar secretos: `.env` no versionado (`git ls-files`), búsqueda de patrones de claves en el historial y en el árbol, contraseñas solo ficticias.
5. Revisar el contenido heredado antes de publicar (PM-11): `docs/planificacion/referencias/PLAN.md` (contiene rutas locales de otra persona en sus citas), `docs/planificacion/referencias/FUENTES-PAYPAL-REVISION.md`, `docs/planificacion/referencias/PROMPT-*.md`, `.claude/`, el `.docx` de la guía y `mvp-primer-bimestre/`; decidir y anotar qué se publica, qué se mueve a una carpeta de referencia y qué se retira, sin reescribir historia.
6. Auditoría de autoría: `git shortlog -sne` y `git log --format='%an' | sort | uniq -c`; cada integrante debe tener commits propios; cualquier desequilibrio se declara en el README y no se corrige reescribiendo historia ni alterando fechas.
7. Un integrante distinto del autor sigue solo el README en un clon limpio y registra el resultado.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- La declaración de IA es veraz: no atribuye trabajo a quien no lo hizo ni oculta herramientas usadas.
- No se suben credenciales, tokens, claves privadas ni archivos `.env` reales.

NO HAGAS (fuera de este bloque)
Crear la etiqueta (B3.5), preparar la presentación (B3.4) y cualquier función nueva.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-ENT-01 — clon limpio + README: `npm ci`, `npm run db:migrate`, `npm run seed:demo`, `npm test` y `npm start` funcionan siguiendo solo el README (lo ejecuta una persona distinta del autor).
- TM-ENT-02 — lista de secretos: `.env` ignorado, `.env.example` solo con marcadores, sin patrones de claves en el árbol ni el historial.
Comando previsto (no verificado hasta que lo ejecutes): `git clone <repo> limpio && cd limpio && npm ci && npm run db:migrate && npm run seed:demo && npm test`
Evidencia que debes guardar: Registro de la instalación en clon limpio, salida de `git shortlog` y resultado de la revisión de secretos (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Con B1.11: los pasos de despliegue del README coinciden con `docs/mvp/despliegue.md`.
- Con B3.1 y B3.2: los diagramas y la matriz enlazados existen y son los finales.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B3.3)
El README contiene todas las secciones del Word y permite ejecutar el proyecto desde cero; el registro de IA está completo; no hay secretos ni datos personales reales; los cuatro integrantes aparecen con commits propios (o el desequilibrio queda declarado); se decidió qué contenido heredado se publica.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B3.3: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B3.5 (Integrante 4) y qué archivo o contrato de este bloque necesitan.
````

### B3.4 — Presentación y guion de demo

> Responsable: Integrante 3 · Revisor: Integrante 1 · Esfuerzo: M · Prerrequisitos: B2.2, B2.3, B2.4, B3.1 · Habilita: B3.5

````text
BLOQUE B3.4 — Presentación y guion de demo
Responsable: Integrante 3 (sustituye por tu nombre) · Revisor: Integrante 1 · Fase: F3 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B3.4 en §4.
- PLAN-MVP §6.4 (guion de demo) y §1 (matriz)
- Word, «Presentación (ambos bimestres)»; `docs/planificacion/12` §2 y §7 (guion y contingencia del diseño anterior), como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B2.2 — Integración del panel y datos de demostración (Integrante 4)
- B2.3 — Medición de rendimiento del listado filtrado (Integrante 2)
- B2.4 — Pruebas de seguridad y demostración de seguridad (Integrante 3)
- B3.1 — Diagrama de arquitectura y coherencia con el código (Integrante 4)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Una presentación en PowerPoint o Canva con el contenido común y el específico del primer bimestre, un guion de demo de 15 minutos con presentador y minutos por tramo, y un banco de preguntas por integrante.
Archivos o módulos previstos:
- archivo de la presentación (o enlace público) y `docs/mvp/guion-demo.md`
- `docs/mvp/preguntas.md` (banco de preguntas y responsables)
Pasos, en orden:
1. Diapositivas según el Word: introducción y problema, objetivos, cronograma y roles, historias de usuario, diagrama de arquitectura del monolito, modelo de datos, enlace al repositorio con evidencia de commits de todos, demostración, pruebas y resultados, declaración de uso de IA y conclusiones; además las pantallas realizadas, la demostración de seguridad (hash, validación en servidor, WebSocket autenticado) y el diagrama del monolito.
2. Guion de 15 minutos proporcional a los pesos de la rúbrica (ver §6.4): quién presenta cada tramo (los cuatro), qué se muestra y qué evidencia se enseña.
3. Plan alternativo: base sembrada y comprobada antes de empezar, dos navegadores listos, capturas de evidencias reales rotuladas con fecha, comprobación local si el despliegue público falla; nunca se presenta una captura antigua como actual.
4. Banco de preguntas con responsable: cómo funcionan el handshake, los eventos y el respaldo de Socket.IO; por qué Argon2id con sal; cómo se evita CSRF y XSS; cómo se garantiza la propiedad de las ofertas; por qué SQLite; qué falta y cómo evoluciona.
5. Marcar en las diapositivas cada resultado como real o como evidencia prevista según el estado verificado en ese momento.
6. El revisor comprueba que todo resultado mostrado existe en `docs/mvp/evidencias/`.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- Los resultados mostrados proceden de las evidencias reales de B1.11, B2.1 a B2.4 y B3.2; ninguno se inventa.

NO HAGAS (fuera de este bloque)
Ensayo general y etiqueta (B3.5) y diapositivas de pagos, reservas o QR.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-ENT-07 — cada tramo del guion tiene presentador, minutos y evidencia enlazada, y los cuatro integrantes exponen (revisión del revisor).
Comando previsto (no verificado hasta que lo ejecutes): — (revisión de pares y lectura cronometrada)
Evidencia que debes guardar: Presentación, `guion-demo.md` y `preguntas.md` (prevista).

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B3.4)
La presentación contiene todo el contenido común y el específico del Word; el guion suma 15 minutos con los cuatro integrantes; cada resultado mostrado tiene su evidencia; el banco de preguntas asigna un responsable por tema.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B3.4: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: B3.5 (Integrante 4) y qué archivo o contrato de este bloque necesitan.
````

### B3.5 — Ensayo general y cierre de entrega

> Responsable: Integrante 4 · Revisor: Integrante 2 · Esfuerzo: M · Prerrequisitos: B3.3, B3.4 · Habilita: —

````text
BLOQUE B3.5 — Ensayo general y cierre de entrega
Responsable: Integrante 4 (sustituye por tu nombre) · Revisor: Integrante 2 · Fase: F3 · Esfuerzo: M

CONTEXTO
Proyecto universitario de Aplicaciones Web Avanzadas (MVP del primer bimestre): aplicación web monolítica de turismo comunitario con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite, sin pagos. Un solo proceso Node con vistas renderizadas en servidor y WebSocket propio.

LEE ANTES (en el repositorio)
- mvp-primer-bimestre/PLAN-MVP.md: §5.1 (contratos), §6.1 (archivos compartidos) y la ficha del bloque B3.5 en §4.
- PLAN-MVP §6.3 (checklist), §6.4 (guion) y §6.6 (pendientes externos)
- `docs/planificacion/12` §6.2 y §7, como referencia

PRERREQUISITOS (deben estar integrados en main antes de empezar)
- B3.3 — README, uso de IA y revisión del repositorio (Integrante 1)
- B3.4 — Presentación y guion de demo (Integrante 3)
(y los prerrequisitos de estos, ya integrados en `main`)
Comprueba con git log, la estructura de carpetas y la ejecución de las pruebas que existen y funcionan. Si falta alguno, detente: indica qué falta y no improvises un contrato incompatible.

IMPLEMENTA
Resultado esperado: Un ensayo cronometrado con los cuatro integrantes, la lista de entrega completa, la etiqueta `v1.0-b1` sobre el commit final y las evidencias y la presentación entregadas donde indique el docente.
Archivos o módulos previstos:
- `docs/mvp/evidencias/B3.5/ensayo.md` (tiempos, problemas y correcciones), lista de entrega marcada
- etiqueta Git `v1.0-b1`
Pasos, en orden:
1. Congelar `main`: ningún cambio nuevo salvo defectos que bloqueen la demo, corregidos por el responsable del bloque con su revisor.
2. Recorrer la lista de §6.3 y marcar cada punto con su evidencia o como pendiente.
3. Ensayo completo de 15 minutos más 5 de preguntas, cronometrado, en el entorno de la demo (dos navegadores; WSS si hay despliegue) con los cuatro presentando; registrar tiempos reales, fallos y decisiones.
4. Ronda de preguntas individuales: cada integrante responde una pregunta del banco sin ayuda y se anota qué falló.
5. Crear la etiqueta anotada `v1.0-b1` sobre el commit final, empujarla y comprobar que el repositorio es público y que la etiqueta aparece en el remoto.
6. Subir el enlace (o ZIP) y la presentación a la plataforma indicada (PM-02) y guardar el comprobante con fecha.
7. Registrar los pendientes reales y las evidencias que siguen siendo previstas.

CONTRATOS QUE DEBES CONSERVAR O CREAR
- No se reescribe historia ni se simulan commits; la etiqueta apunta al commit que se probó.
- Todo lo que el ensayo no pudo demostrar se declara como pendiente.

NO HAGAS (fuera de este bloque)
Nuevas funciones, refactorizaciones o cambios de contrato.

COMPRUEBA
Pruebas que debes escribir y hacer pasar:
- TM-ENT-03 — `git tag -l v1.0-b1` y `git ls-remote --tags origin` muestran la etiqueta en el commit final.
- TM-ENT-04 — el ensayo cronometrado dura 15 minutos o menos con los cuatro presentando.
- TM-ENT-05 — cada integrante responde una pregunta del banco sin ayuda (registro del ensayo).
Comando previsto (no verificado hasta que lo ejecutes): `git tag -a v1.0-b1 -m "Entrega primer bimestre" && git push origin v1.0-b1` · `git ls-remote --tags origin`
Evidencia que debes guardar: `ensayo.md`, lista de entrega marcada y comprobante de subida (prevista).
Comprobaciones de integración (convergen varios integrantes):
- Converge a los cuatro integrantes: antes de etiquetar, `npm ci && npm test` verde en un clon limpio y los PR de todos los bloques integrados.
- Si un integrante no puede presentar o responder, se declara en el ensayo y se decide con el equipo, sin cambiar los registros de autoría.

CRITERIO DE CIERRE (idéntico al de PLAN-MVP.md §4, B3.5)
La lista de §6.3 está completa o cada pendiente figura con su motivo; el ensayo cronometrado cabe en 15 minutos con los cuatro presentando; la etiqueta `v1.0-b1` está en el remoto sobre el commit final y el repositorio es público; evidencias y presentación entregadas con comprobante.

REGLAS COMUNES
- Antes de modificar nada, inspecciona el repositorio (git status, estructura de carpetas, package.json, migraciones, pruebas existentes) y lee los documentos indicados. No supongas que algo existe: compruébalo.
- Trabaja solo en este bloque y en los archivos que le corresponden. No adelantes otros bloques ni cambies los contratos de PLAN-MVP.md §5.1; si crees que un contrato debe cambiar, déjalo escrito como propuesta en el informe y avisa al responsable afectado.
- Respeta los límites de módulos: modules/*/domain y modules/*/service no importan express, socket.io ni EJS; el acceso a SQLite vive solo en modules/*/data; un módulo importa a otro solo por su index.js.
- Seguridad: consultas parametrizadas; salida EJS escapada (<%= %>), sin innerHTML en public/js; nunca registres contraseñas, tokens ni cookies; los secretos solo en .env (no versionado) y valores ficticios en .env.example.
- Escribe las pruebas indicadas con aserciones reales y ejecútalas. Informa el resultado real de cada comando; si algo falla o no pudiste ejecutarlo, dilo. No inventes cifras ni evidencias.
- No hagas commit ni push. Propón el mensaje de commit con el prefijo "B3.5: ". La persona responsable revisa y entiende el cambio y lo confirma con su propia cuenta; si usó IA, queda declarado en el informe.

INFORME FINAL (breve; pégalo en la descripción del PR)
1. Resultado: completado / completado con pendientes / bloqueado (una frase).
2. Archivos creados o modificados.
3. Comandos ejecutados y resultado real de cada uno (pasó / falló y la salida relevante).
4. Pruebas: identificador -> pasa / falla / no escrita.
5. Pendiente o decisiones nuevas (con el documento que habría que actualizar).
6. Siguiente bloque habilitado: ninguno (último eslabón de su cadena) y qué archivo o contrato de este bloque necesitan.
````
