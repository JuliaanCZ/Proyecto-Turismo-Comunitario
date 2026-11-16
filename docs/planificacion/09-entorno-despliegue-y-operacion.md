# 09 — Entorno, despliegue y operación

> **ESTADO: REDACTADO (2026-11-16) con pendientes explícitos.** Todos los apartados tienen contenido; **nada se ha ejecutado** y varias decisiones siguen abiertas (ver abajo).
> Contiene: requisitos (§1), preparación reproducible desde un clon limpio con PowerShell y Bash (§2), variables y borradores de `.env.example` y `.env.test.example` con `DB_LOCK_TIMEOUT_MS` (§3), scripts previstos (§4), bases, reinicios, copias con `pg_dump` y restauración aislada con cobros posteriores (§5), despliegue administrado y alternativa con servidor virtual (§6), registros y diagnóstico por síntoma (§7), doce *runbooks* (§8). **Pendientes explícitos:** decisión de alojamiento (Q-04; §6.2 y §6.4 sin elegir); propuestas sin decidir de §8.13 (retención y ubicación de copias, invalidación de sesiones tras restaurar, modo de restauración, `RESTORE` en `account.anonymize`, `db:reset-demo`); **tres puntos pendientes de diseño** (§7.3: intervención sobre sesiones ajenas, estado «resuelto fuera del sistema» para reembolsos manuales, disparar la comprobación de pagos restaurados sin intento abierto); verificaciones técnicas de PostgreSQL y Prisma (§8.14) y de PayPal (04 §5.2); `data:purge` sin alcance definido; `.env.restore` y valores marcados «por fijar».
> **Siguiente paso exacto:** pasar a 10 §5 (fichas de paquete, desde `P0-01`).
> **Nada de esto existe ni se ha ejecutado:** scripts, archivos y comandos son los previstos.

---

## 1. Requisitos del equipo (decidido)

Node.js 24 LTS (≥ 24.12), npm 11, Git, Docker Desktop (o Docker Engine + Compose). Versiones exactas en [02 §5](02-arquitectura-y-decisiones.md).

## 2. Preparación reproducible

**Nada de esto se ha ejecutado:** no existe el repositorio de código, `package.json`, `docker-compose.yml` ni `.env.example`. Los comandos son los **previstos** (scripts de §4) y se comprobarán al crear cada paquete. Se usa el mismo nombre de script que en [08 §6](08-pruebas-y-evidencias.md) y [03 §9](03-datos-estados-e-invariantes.md), de modo que lo que corre en local es lo que corre la CI.

### 2.1 Requisitos previos (comprobar antes de empezar)

Mismos comandos en PowerShell y Bash:

```
node --version          # v24.12 o superior (02 §5)
npm --version           # 11.x
git --version
docker --version
docker compose version  # Docker Desktop o Docker Engine con Compose
```

Docker debe estar **en ejecución** (en Windows, Docker Desktop abierto). Puertos libres: `3000` (aplicación), `5432` (PostgreSQL), `1025` y `8025` (Mailpit). Para las pruebas de extremo a extremo se propone además `3100` (§2.3).

### 2.2 Secuencia desde un clon limpio (desarrollo)

Solo cambian los pasos 3 y 4 (copiar y generar secretos) y la comprobación del paso 8. El resto es idéntico.

1. **Clonar** (común): `git clone <URL del repositorio>` y entrar en la carpeta del proyecto.
2. **Instalar** (común): `npm ci` (usa `package-lock.json`; no `npm install`).
3. **Crear `.env`** a partir del borrador de §3.2:

   | PowerShell | Bash |
   |---|---|
   | `Copy-Item .env.example .env` | `cp .env.example .env` |

4. **Generar los secretos** (valores aleatorios de 32 bytes en base64) y pegarlos a mano en `.env`; no hay script que edite el archivo, para no depender de `sed` ni de la codificación de PowerShell. Se necesitan cuatro: `RATE_LIMIT_SECRET`, `FAKE_PAYMENT_WEBHOOK_SECRET`, la clave de `TICKET_KEYRING` (el valor completo queda como `k1:<resultado>`) y, a su gusto, `SEED_DEMO_PASSWORD`.

   | PowerShell (5.1 y 7) | Bash |
   |---|---|
   | `$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)` | `openssl rand -base64 32` |

   Ejecutar el comando una vez por secreto: **no repetir valores** entre variables ni entre `.env` y `.env.test`.
5. **Levantar los servicios** (común): `npm run db:up`. Esperar a que la base esté lista: `docker compose ps` debe mostrar `db` como `healthy` (la comprobación de salud con `pg_isready` es **propuesta** para `docker-compose.yml`). La primera vez, `prisma/sql/00-roles.sql` crea los roles `tc_migrator` y `tc_app` y las cuatro bases (`turismo_dev`, `turismo_test`, `turismo_e2e`, `turismo_perf`).
6. **Preparar la base de desarrollo** (común): `npm run db:generate`, `npm run db:migrate` (Prisma Migrate con el rol migrador; en desarrollo aplica y detecta deriva) y `npm run db:seed` (con `MIGRATION_DATABASE_URL`, 03 §9.2; crea lo que falta y no modifica lo existente, 03 §9.3). La semilla llega por etapas: *base* (P0-06) y *ofertas* (P2-01); la de *demostración* exige P4-02 (PE-04).
7. **Arrancar** (común): `npm run dev`; abrir `http://localhost:3000`. Correo de pruebas en `http://localhost:8025`.
8. **Comprobar** que responde:

   | PowerShell | Bash |
   |---|---|
   | `Invoke-RestMethod http://localhost:3000/api/salud` | `curl -s http://localhost:3000/api/salud` |

   Después, iniciar sesión con una cuenta sembrada (03 §9.3), por ejemplo `admin@demo.test` y la contraseña de `SEED_DEMO_PASSWORD`.

**Detener:** `Ctrl+C` en `npm run dev` y `npm run db:down` (conserva los datos en el volumen).

**Empezar de cero en local.** `docker compose down -v` borra el volumen, es decir **todas** las bases locales (desarrollo, pruebas, E2E y rendimiento), y es irreversible; después repetir los pasos 5 y 6 y `npm run db:test:prepare` (§2.3). Para rehacer **una sola** base (por ejemplo solo `turismo_dev`) se usa `npm run db:reset` (§5.2); `docker compose down -v` es el camino drástico (diferencias en §5.3). `db:reset-demo` es solo una **propuesta pendiente** (03 §9.4, D-67): no se usa ni se documenta como disponible.

### 2.3 Preparar y ejecutar las pruebas en local

Las pruebas usan **bases y archivo de entorno propios**, nunca los de desarrollo (reglas de [08 §6.2](08-pruebas-y-evidencias.md)):

1. Crear `.env.test` a partir del borrador de §3.3 (mismos comandos de copia que en el paso 3, con `.env.test.example` y `.env.test`) y generar **secretos distintos** de los de `.env` (paso 4).
2. Servicios arriba (`npm run db:up`) y `npm run db:test:prepare`: comprueba las guardas de nombre y de `APP_ENV`, migra `turismo_test` y `turismo_e2e` con `prisma migrate deploy` y carga la semilla base. Es idempotente.
3. Ejecutar por grupo: `npm run test:unit`, `npm run test:integration`, `npm run test:concurrency`. Con el adaptador `fake`, reloj falso y `JOBS_ENABLED=false`.
4. Extremo a extremo: `npm run build` y `npm run test:e2e` (y `npm run test:a11y`). Playwright usa la base `turismo_e2e`: **propuesta** — su configuración fija explícitamente `DATABASE_URL` y `MIGRATION_DATABASE_URL` hacia `turismo_e2e`, `PORT=3100` y `APP_ORIGIN=http://localhost:3100`, y lee el resto de `.env.test`. Si el nombre de la base no termina en `_test`, `_e2e` o `_perf`, las utilidades de limpieza se niegan (T-OPS-04).

Reglas de aislamiento (idénticas a 08 §6.2): las pruebas se conectan con el rol `tc_app` y la limpieza con el migrador; la limpieza entre archivos solo corre sobre `_test`, `_e2e` o `_perf`; los archivos de integración y concurrencia corren en serie hasta decidir el paralelismo por esquema; las pruebas de concurrencia nunca comparten base con otras. La **CI** no usa `.env.test`: recibe las mismas variables por entorno del flujo, con secretos generados en cada ejecución y sin credenciales de PayPal.

### 2.4 Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El arranque se detiene nombrando una variable | La validación de entorno (02 §9) rechazó su valor (p. ej. un marcador sin reemplazar) | Corregir esa variable en `.env`. El mensaje no imprime el valor. |
| `npm.ps1 cannot be loaded… running scripts is disabled` (PowerShell) | Política de ejecución de scripts | Usar `npm.cmd` o, solo para el usuario actual, `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`. |
| `port is already allocated` (5432, 1025, 8025) | Otro PostgreSQL o servicio usa el puerto | Detener el otro servicio o cambiar el puerto publicado en `docker-compose.yml` **y** en las URL del entorno. |
| `db:test:prepare` se niega a continuar | `APP_ENV` es `production` o el nombre de base no termina en `_test`, `_e2e` o `_perf` | Revisar `.env.test`; no sortear la guarda. |
| `BUSY_TRY_AGAIN` esporádico en desarrollo | Bloqueo de fila por encima de `DB_LOCK_TIMEOUT_MS` | Es el comportamiento previsto (04); no subir el valor para ocultarlo. |

> **Regla de reinicio resuelta en §5.2 (2026-11-16).** `db:reset` admite exactamente `turismo_dev` y las bases `_test`, `_e2e` y `_perf`, solo en local y con `--confirm`; la limpieza de pruebas sigue limitada a `_test`, `_e2e` y `_perf`. `db:reset-demo` continúa como propuesta pendiente.

Servicios locales de `docker-compose.yml`:

| Servicio | Imagen | Puertos | Notas |
|---|---|---|---|
| `db` | `postgres:18` | 5432 | Volumen con nombre; `prisma/sql/00-roles.sql` crea los roles `tc_migrator` y `tc_app` y las bases `turismo_dev`, `turismo_test`, `turismo_e2e`, `turismo_perf`. |
| `mail` | `axllent/mailpit:v1.33` | 1025 (SMTP), 8025 (interfaz y API) | Bandeja de pruebas. |

## 3. Variables de entorno (decididas; borrador comentado de `.env.example` en §3.2 y §3.3)

Todas son de **servidor**. No hay variables `NEXT_PUBLIC_*`.

### 3.1 Tabla de variables

| Variable | Propósito | Ejemplo ficticio |
|---|---|---|
| `NODE_ENV` | Modo de Node y Next. | `development` |
| `APP_ENV` | `local`, `test` o `production`; gobierna reglas de seguridad. | `local` |
| `APP_ORIGIN` | Origen canónico: comprobación de `Origin`, enlaces de correo, URL de retorno. | `http://localhost:3000` |
| `HOST`, `PORT` | Dirección de escucha. | `0.0.0.0`, `3000` |
| `TRUST_PROXY_HOPS` | Saltos de proxy de confianza para obtener la IP. | `0` |
| `DATABASE_URL` | Conexión de la aplicación (rol `tc_app`). | `postgresql://tc_app:…@localhost:5432/turismo_dev` |
| `MIGRATION_DATABASE_URL` | Conexión para migraciones (rol `tc_migrator`). | `postgresql://tc_migrator:…@localhost:5432/turismo_dev` |
| `DB_POOL_MAX` | Tamaño de la agrupación de conexiones. | `10` |
| `DB_LOCK_TIMEOUT_MS` | Valor por defecto del `lock_timeout` de cada transacción (`SET LOCAL lock_timeout`); al agotarse, `BUSY_TRY_AGAIN`. Nueva: 04 §5 la define con defecto 5000; ver §3.4. | `5000` |
| `SESSION_TTL_HOURS` | Duración de la sesión. | `8` |
| `ARGON2_MEMORY_KIB`, `ARGON2_PASSES`, `ARGON2_PARALLELISM` | Coste del hash. | `19456`, `2`, `1` |
| `RATE_LIMIT_SECRET` | Clave HMAC de las claves de límite e IP. | 32 bytes en base64 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `MAIL_FROM` | Correo de pruebas. | `localhost`, `1025`, vacíos, `false`, `no-responder@demo.test` |
| `PAYMENT_PROVIDER` | `fake` o `paypal`. | `fake` |
| `PAYPAL_API_BASE` | Solo se admite el anfitrión de Sandbox. | `https://api-m.sandbox.paypal.com` |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` | Credenciales de Sandbox. | Valores de marcador |
| `PAYMENT_HTTP_TIMEOUT_MS` | Tiempo de espera hacia la pasarela. | `10000` |
| `FAKE_PAYMENT_WEBHOOK_SECRET` | Firma del webhook simulado. | Cadena aleatoria |
| `TICKET_KEYRING`, `TICKET_ACTIVE_KEY_ID` | Llavero de cifrado de QR. | `k1:<base64 de 32 bytes>`, `k1` |
| `CHECKIN_EARLY_MINUTES` | Antelación de apertura del ingreso. | `0` |
| `JOBS_ENABLED`, `JOB_EXPIRE_INTERVAL_S`, `JOB_RECONCILE_INTERVAL_S`, `WS_SESSION_SWEEP_S` | Trabajos periódicos. | `true`, `60`, `60`, `30` |
| `LOG_LEVEL` | Nivel de registro. | `info` |
| `SEED_DEMO_PASSWORD` | Contraseña de las cuentas sembradas. | Solo para local |

Constantes de dominio que **no** son variables de entorno (para evitar cambios accidentales): retención de 15 min, margen de captura de 30 s, 1–10 asistentes, límites de precio y capacidad.

### 3.2 Borrador comentado de `.env.example` (desarrollo)

**Borrador documental, no existe el archivo.** Todos los valores son **ficticios**; los marcadores `<generar…>` **no son válidos a propósito**: la validación de entorno (02 §9) debe detener el arranque, nombrando la variable, si se dejan sin reemplazar. `.env` no se versiona; `.env.example` sí.

```dotenv
# ======================================================================
# .env.example — DESARROLLO LOCAL (copiar a .env; nunca versionar .env)
# Todos los valores son ficticios. Solo servidor: sin NEXT_PUBLIC_*.
# Las PRUEBAS usan otro archivo (.env.test, ver .env.test.example).
# ======================================================================

# --- Aplicación -------------------------------------------------------
NODE_ENV=development
# local | test | production. Aquí SIEMPRE local.
APP_ENV=local
# Origen canónico: comprobación de Origin, enlaces de correo, retorno de pago.
APP_ORIGIN=http://localhost:3000
HOST=0.0.0.0
PORT=3000
# Saltos de proxy de confianza para obtener la IP (0 = ninguno, en local).
TRUST_PROXY_HOPS=0
LOG_LEVEL=info

# --- Base de datos (turismo_dev) --------------------------------------
# La aplicación usa el rol tc_app (sin DDL). Contraseñas ficticias: deben
# coincidir con las de docker-compose.yml / prisma/sql/00-roles.sql.
DATABASE_URL=postgresql://tc_app:tc_app_local_pw@localhost:5432/turismo_dev
# Solo migraciones y semilla (rol tc_migrator). En producción NO se define
# en el entorno de la aplicación (06 A-43); en local comparte archivo.
MIGRATION_DATABASE_URL=postgresql://tc_migrator:tc_migrator_local_pw@localhost:5432/turismo_dev
DB_POOL_MAX=10
# lock_timeout por defecto de cada transacción, en milisegundos (04: 5 s).
DB_LOCK_TIMEOUT_MS=5000

# --- Sesión y contraseñas --------------------------------------------
SESSION_TTL_HOURS=8
ARGON2_MEMORY_KIB=19456
ARGON2_PASSES=2
ARGON2_PARALLELISM=1
# Clave HMAC de las claves de límite e IP: 32 bytes en base64.
RATE_LIMIT_SECRET=<generar: 32 bytes en base64>

# --- Correo (Mailpit; interfaz en http://localhost:8025) ---------------
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
MAIL_FROM=no-responder@demo.test

# --- Pagos -----------------------------------------------------------
# fake (por defecto) | paypal. Con paypal solo se admite el anfitrión Sandbox.
PAYMENT_PROVIDER=fake
PAYMENT_HTTP_TIMEOUT_MS=10000
# Firma del webhook simulado: 32 bytes en base64.
FAKE_PAYMENT_WEBHOOK_SECRET=<generar: 32 bytes en base64>
# Solo para la verificación manual T-PAG-24 (Q-08). Déjelos así en el día a día.
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=<solo si PAYMENT_PROVIDER=paypal>
PAYPAL_CLIENT_SECRET=<solo si PAYMENT_PROVIDER=paypal>
PAYPAL_WEBHOOK_ID=<solo si PAYMENT_PROVIDER=paypal>

# --- Entradas con QR -------------------------------------------------
# Formato <id>:<clave de 32 bytes en base64>[,<id>:<clave>...]
TICKET_KEYRING=k1:<generar: 32 bytes en base64>
TICKET_ACTIVE_KEY_ID=k1
# Minutos de antelación con que se abre el ingreso (0 = a la hora de inicio).
CHECKIN_EARLY_MINUTES=0

# --- Trabajos periódicos ----------------------------------------------
JOBS_ENABLED=true
JOB_EXPIRE_INTERVAL_S=60
JOB_RECONCILE_INTERVAL_S=60
WS_SESSION_SWEEP_S=30

# --- Semilla (solo local) ---------------------------------------------
# Contraseña de las cuentas @demo.test sembradas. Elija una propia.
SEED_DEMO_PASSWORD=<elegir una contraseña de desarrollo>
```

### 3.3 Borrador de `.env.test.example` (pruebas; propuesto)

**Propuesta:** un segundo archivo de ejemplo separa del todo las pruebas del desarrollo. Lo leen las configuraciones de Vitest y de Playwright (la aplicación carga `.env` solo en desarrollo y Prisma lee `prisma.config.ts`, 02 §9); **nunca** se mezcla con `.env`. La CI no lo usa: define estas mismas variables en el flujo ([08 §6](08-pruebas-y-evidencias.md)).

```dotenv
# ======================================================================
# .env.test.example — PRUEBAS (copiar a .env.test; nunca versionar .env.test)
# Bases exclusivas de pruebas. Secretos DISTINTOS de los de .env.
# ======================================================================
NODE_ENV=test
# Las utilidades de limpieza exigen APP_ENV distinto de production y
# bases terminadas en _test, _e2e o _perf (09 §5, T-OPS-04).
APP_ENV=test
APP_ORIGIN=http://localhost:3000
HOST=127.0.0.1
PORT=3000
TRUST_PROXY_HOPS=0
LOG_LEVEL=warn

# --- Bases de pruebas (Vitest: turismo_test) ---------------------------
# Playwright sustituye estas dos URL por turismo_e2e y usa PORT=3100 y
# APP_ORIGIN=http://localhost:3100 en su configuración (propuesto).
DATABASE_URL=postgresql://tc_app:tc_app_local_pw@localhost:5432/turismo_test
MIGRATION_DATABASE_URL=postgresql://tc_migrator:tc_migrator_local_pw@localhost:5432/turismo_test
# Las pruebas de concurrencia necesitan más conexiones (02 §11).
DB_POOL_MAX=30
# Valor por defecto. Las pruebas de BUSY_TRY_AGAIN lo reducen POR LLAMADA
# (withTx opts.lockTimeoutMs, 04), no cambiando esta variable.
DB_LOCK_TIMEOUT_MS=5000

SESSION_TTL_HOURS=8
# Por fijar: si se reduce el coste de Argon2 para acelerar las pruebas
# (nunca por debajo del mínimo de 02 §9). Hasta entonces, igual que en dev.
ARGON2_MEMORY_KIB=19456
ARGON2_PASSES=2
ARGON2_PARALLELISM=1
RATE_LIMIT_SECRET=<generar: 32 bytes en base64, distinto del de .env>

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
MAIL_FROM=no-responder@demo.test

# Pruebas automáticas: SIEMPRE fake. No se definen credenciales de PayPal.
PAYMENT_PROVIDER=fake
PAYMENT_HTTP_TIMEOUT_MS=10000
FAKE_PAYMENT_WEBHOOK_SECRET=<generar: 32 bytes en base64, distinto del de .env>

# Llavero propio de pruebas (ENT-D2): no reutilizar el de desarrollo.
TICKET_KEYRING=k1:<generar: 32 bytes en base64>
TICKET_ACTIVE_KEY_ID=k1
CHECKIN_EARLY_MINUTES=0

# Sin trabajos periódicos: las pruebas los invocan a mano con reloj falso.
JOBS_ENABLED=false
JOB_EXPIRE_INTERVAL_S=60
JOB_RECONCILE_INTERVAL_S=60
WS_SESSION_SWEEP_S=30

SEED_DEMO_PASSWORD=<elegir una contraseña de pruebas>
```

### 3.4 Reglas de validación que acompañan a las variables

- **`DB_LOCK_TIMEOUT_MS`** (alineada con 04 §5, que la declara «nueva, defecto 5000», y con 02 §11, que fija `lock_timeout` de 5 s): entero positivo; defecto `5000`. El **rango admitido (100 a 30 000) es una propuesta** que debe fijarse en la validación de entorno. `withTx` toma este valor como predeterminado y acepta `opts.lockTimeoutMs`; las pruebas de `BUSY_TRY_AGAIN` (08 §2) usan la opción por llamada. **02 §9 todavía no la menciona:** hay que añadirla a su validación Zod y a la fila de 02 §11 (alineación pendiente; este documento no modifica 02).
- **Secretos** (`RATE_LIMIT_SECRET`, `FAKE_PAYMENT_WEBHOOK_SECRET`, clave de `TICKET_KEYRING`): base64 que decodifique a 32 bytes; un marcador `<…>` falla la validación (propuesta de comprobación, 02 §9 la cubre solo de forma general).
- **Reglas cruzadas de 02 §9** (sin cambios): `APP_ENV=production` exige `PAYMENT_PROVIDER=paypal`, `APP_ORIGIN` con `https://`, llavero presente y Argon2 no inferior al mínimo. En `local` y `test` el valor esperado es `fake`; el flujo de CI falla si encuentra `paypal` o credenciales (08 §6.3).
- **Separación:** `.env` (desarrollo) y `.env.test` no comparten secretos ni bases. `turismo_perf` (`perf:seed`, `perf:catalog`) usa las mismas variables con la URL cambiada a esa base; no tiene archivo propio todavía (por fijar al crear PE-01).
- **`db:reset-demo`** no figura en la lista de scripts de §4 ni en ningún archivo de entorno: es una **propuesta pendiente** de decisión (03 §9.4, D-67).

## 4. Scripts previstos (no existen todavía)

| Script | Hace |
|---|---|
| `dev` | `tsx server.ts` |
| `build` | `prisma generate`, `next build` y empaquetado del servidor |
| `start` | `node dist/server.mjs` |
| `lint`, `typecheck` | ESLint y `tsc --noEmit` |
| `test`, `test:unit`, `test:integration`, `test:concurrency`, `test:e2e`, `test:a11y` | Vitest y Playwright |
| `db:up`, `db:down` | Docker Compose |
| `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:seed`, `db:reset` | Prisma; `db:reset` solo en local y protegido (bases admitidas en §5.2) |
| `db:test:prepare` | Migra las bases de pruebas |
| `perf:seed`, `perf:catalog` | Medición de rendimiento |
| `tickets:rotate-key`, `tickets:reissue` | Mantenimiento del llavero |
| `data:purge` | Purga y minimización |

## 5. Bases, reinicios, copias y restauración

**Nada de esto se ha ejecutado.** Lo que ya estaba decidido se marca como tal; todo plazo, ubicación o reparto de responsabilidades que el equipo no haya fijado se marca **(propuesta)**. Los integrantes y sus roles siguen pendientes de Q-03.

### 5.1 Bases y protección (decidido)

- Bases distintas por uso: `turismo_dev`, `turismo_test` (Vitest), `turismo_e2e` (Playwright) y `turismo_perf` (rendimiento). Una base desplegada de demostración llevaría el sufijo `_demo` (03 §9.4, propuesta).
- El rol de la aplicación (`tc_app`) no puede ejecutar DDL; las migraciones, la semilla, las copias y la anonimización usan `tc_migrator`, cuya URL **no** va en el entorno de la aplicación en producción (06 A-43).
- Una base **restaurada** para T-OPS-05 se llama `turismo_restore` y **ninguna utilidad de reinicio la admite** (§5.2): solo se elimina a mano al terminar (§5.4).

### 5.2 Qué bases admite cada utilidad de reinicio

Esta tabla **aclara** la regla anterior, que se leía como «toda utilidad que reinicie exige `_test`, `_e2e` o `_perf`» y rechazaba `db:reset` sobre `turismo_dev`, que 03 §9.4 define como reinicio local. Pasa a ser **una regla por utilidad** (confirmación del equipo pendiente; no cambia lo decidido para las de prueba):

| Utilidad | Qué hace | Admite | Rechaza (sale con código ≠ 0 sin enviar sentencias) |
|---|---|---|---|
| Limpieza de pruebas (T-OPS-04) | `TRUNCATE … RESTART IDENTITY CASCADE` de las tablas de negocio entre archivos de prueba | Nombre terminado en `_test`, `_e2e` o `_perf` | Todo lo demás, incluida `turismo_dev` |
| **`npm run db:reset`** | Recrea **esa base**: la elimina, la vuelve a crear y le aplica migraciones y semilla base. Conserva el volumen, los roles y las demás bases | **Exactamente `turismo_dev`**, o nombre terminado en `_test`, `_e2e` o `_perf` | `turismo_demo`, `turismo_restore`, `turismo`, `turismo_prod` y cualquier otro nombre; `APP_ENV=production`; un anfitrión que no sea `localhost`, `127.0.0.1` o `::1` en **cualquiera** de las dos URL; falta de `--confirm=<nombre de la base>` |
| `db:reset-demo` | Refresca la base de demostración sin recrearla | **Propuesta pendiente** (03 §9.4, D-67): admitiría `_dev` y `_demo` y un despliegue con `APP_ENV=production`. **No está aprobada ni disponible**; hasta decidirlo, la demostración local se refresca con `db:reset` y la desplegada no se reinicia con utilidad | — |

Las mayúsculas, los parámetros de la URL y el cambio de variable a mitad de camino se tratan como en T-OPS-04 (el nombre se lee de la conexión real, no de un texto). **Mecanismo de recreación por verificar en P0:** si `tc_migrator` puede ejecutar `DROP DATABASE`/`CREATE DATABASE` (hoy no consta que tenga `CREATEDB`) o si se usa `prisma migrate reset`; hasta entonces solo se fija el efecto, no el procedimiento.

### 5.3 Reiniciar una base frente a borrar volúmenes

| | `npm run db:reset` | `docker compose down -v` |
|---|---|---|
| Alcance | **Una** base | **Todo el volumen** de PostgreSQL: todas las bases, los roles y sus privilegios |
| Protecciones | Lista de bases, anfitrión local, `APP_ENV`, `--confirm` | **Ninguna**: no es un script del proyecto y Docker no pregunta |
| Conserva | Roles, otras bases y el volumen | Nada de lo que hubiera en PostgreSQL |
| Después hay que… | Nada más: la utilidad deja la base migrada y sembrada | Repetir 2.2 (pasos 5 y 6) y `npm run db:test:prepare`; `prisma/sql/00-roles.sql` solo se ejecuta cuando el volumen **nace vacío**, por eso un cambio en ese archivo exige este camino |
| Cuándo | Rehacer una base tras una migración fallida o refrescar datos de demostración | Roles rotos, cambio en `00-roles.sql` o volumen dañado |
| Contra `turismo_restore`, `_demo` o una base desplegada | **No admitido** | Solo afecta al volumen **local**, pero destruiría también `turismo_restore` si existe (las copias `.dump` están en `backups/`, fuera del volumen) |

`npm run db:down` (parar los servicios) **conserva** el volumen y no es ninguno de los dos casos.

### 5.4 Copias de seguridad con `pg_dump`

**Qué se copia y qué no.** Solo la base que contenga datos que merezca la pena conservar: la de demostración desplegada (`turismo_demo` o la que el alojamiento defina; Q-04) y, para practicar T-OPS-05, `turismo_dev`. Las de pruebas, E2E y rendimiento **no se copian**: se reconstruyen con migraciones y semilla. El plan gratuito evaluado no ofrece copias y su PostgreSQL caduca a los 30 días (§6.3), así que la copia manual es la única.

**Una copia es un dato sensible** (06 AC-6): contiene `User.passwordHash`, correos, fechas de nacimiento no vencidas, texto de chat y las copias cifradas de las entradas, aunque en el MVP los datos sean ficticios (S-14). Se trata como si fuera real.

**Formato y opciones.** Formato personalizado (`--format=custom`), comprimido, **con** propietarios y privilegios (necesarios para comprobar los permisos al restaurar). `pg_dump` **no** incluye los roles ni sus contraseñas: se recrean desde `prisma/sql/00-roles.sql`. No se usa `pg_dumpall`.

Se ejecuta con `tc_migrator` (el único rol que lee todo), desde la sesión de la persona operadora y **sin** poner la contraseña en la línea de comandos (`PGPASSWORD` en la sesión o archivo de contraseñas). El cliente debe ser de la misma versión mayor que el servidor (18). **Nunca se redirige la salida con `>`**: en PowerShell 5.1 corrompe el binario; se usa `--file`.

Local (la base está en el contenedor `db`; comandos iguales en las dos consolas salvo el directorio y la marca de tiempo):

```
docker compose exec -T -e PGPASSWORD db pg_dump -U tc_migrator -d turismo_dev --format=custom --compress=6 --file=/tmp/turismo_dev_<UTC>.dump
docker compose cp db:/tmp/turismo_dev_<UTC>.dump ./backups/turismo_dev_<UTC>.dump
docker compose exec -T db rm /tmp/turismo_dev_<UTC>.dump
```

Base desplegada (conexión externa con TLS; cliente `pg_dump` 18 instalado):

```
pg_dump --format=custom --compress=6 --file=backups/turismo_demo_<UTC>.dump "<URL de conexión externa con tc_migrator>"
```

| Paso | PowerShell | Bash |
|---|---|---|
| Crear la carpeta | `New-Item -ItemType Directory -Force backups` | `mkdir -p backups` |
| Marca `<UTC>` | `(Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')` | `date -u +%Y%m%dT%H%M%SZ` |
| Suma de comprobación | `Get-FileHash -Algorithm SHA256 backups\<archivo>` | `sha256sum backups/<archivo>` |
| Comprobar que se lee | `pg_restore --list backups\<archivo>` | `pg_restore --list backups/<archivo>` |

**Archivos que acompañan a cada copia** (`<archivo>.sha256` y `<archivo>.manifest.txt`): marca UTC, *commit* de la aplicación, última migración de `_prisma_migrations`, versión de `pg_dump`, y el **número de filas por tabla** (para compararlo al restaurar). El manifiesto **no** contiene datos personales.

**Dónde se guarda (propuesta).** Carpeta `backups/` **fuera de Git** (`.gitignore` con `backups/` y `*.dump`) en un disco cifrado de la persona operadora, más **una segunda copia** en un almacenamiento del equipo con acceso restringido y cifrado en reposo (la herramienta la elige el equipo). Nunca en el repositorio, en los artefactos de CI, en el chat ni por correo.

**Quién accede (propuesta).** Solo las **dos** personas responsables de operación (reparto pendiente de Q-03): las mismas que pueden usar `MIGRATION_DATABASE_URL`. Las demás no tienen acceso, ni a la copia ni a la credencial.

**Cuándo se genera (propuesta).** Antes de cada migración en el despliegue (RB-08), antes de la demostración y **antes de la entrega**; con el plan gratuito, al menos una vez por semana.

**Cuánto se conserva (propuesta; no hay plazo decidido).**

| Copia | Conservación propuesta | Razón |
|---|---|---|
| Rutinarias (semanales y previas a migraciones) | **30 días** y luego se eliminan | Alinea la rotación con el plazo interno de 30 días de las solicitudes de borrado (06 §4.4): lo anonimizado desaparece de las copias en ese margen. Es un objetivo del equipo, no un plazo legal verificado |
| Previa a la entrega | Hasta cerrar la evaluación y luego se elimina | Permite restaurar la demostración mientras se evalúa |
| Copia usada en T-OPS-05 y su base `turismo_restore` | Se elimina al registrar la evidencia (§5.5) | Es la única copia que se restaura fuera del flujo normal |

Eliminar es borrar **todas** las ubicaciones (la local, la segunda y su suma). En medios cifrados, destruir la clave equivale a borrar; en otros no se garantiza borrado seguro. 06 §4.7 sigue reconociendo que las copias conservan los datos hasta rotar: **este plazo es el límite de esa exposición** y se decide con el equipo.

### 5.5 Restaurar en una base aislada (T-OPS-05, manual)

**Objetivo.** Demostrar que una copia restaura una base utilizable y que **lo anonimizado después de la copia no reaparece**. **El acceso a la base restaurada permanece cerrado hasta el último paso.** El mismo orden se aplica a una restauración real (RB-11); solo cambia que al final se abre el servicio.

**Aislamiento.** Servicio local (§2.1) con PostgreSQL ligado solo a `localhost`; base nueva `turismo_restore`; la aplicación se arranca con un archivo de entorno aparte (por fijar, p. ej. `.env.restore`) con `HOST=127.0.0.1`, `PAYMENT_PROVIDER=fake`, SMTP hacia Mailpit y `JOBS_ENABLED=false` hasta el paso 7. La base restaurada contiene correos reales o ficticios: **no puede enviarse correo ni llamar a PayPal** desde ella.

1. **Verificar la copia:** comparar la suma SHA-256 con la guardada y ejecutar `pg_restore --list`. Si falla, se detiene.
2. **Tener los roles:** `tc_migrator` y `tc_app` deben existir con los mismos nombres (los crea `00-roles.sql` al nacer el volumen). Sus contraseñas no viajan en la copia.
3. **Crear la base vacía:** `docker compose exec -T db createdb -U <rol administrador de docker-compose.yml> --owner=tc_migrator turismo_restore`.
4. **Restaurar:** copiar el archivo al contenedor (`docker compose cp`) y ejecutar `pg_restore --dbname=turismo_restore -U tc_migrator --exit-on-error --single-transaction <archivo>`; con un error, no queda nada a medias.
5. **Comprobar lo estructural** (sin la aplicación): filas por tabla frente al manifiesto; última migración igual a la del manifiesto; `T-DB-01a` (restricciones, disparadores y funciones presentes); privilegios de `tc_app` conservados (sin DDL; en `AuditEvent` solo lectura e inserción, T-SEG-07); las comprobaciones de **PC-PAG-1 y PC-ENT-4** que pide 08 T-OPS-05. Si algo no coincide, se detiene.
6. **Invalidar sesiones y tokens tras restaurar** (**propuesta**; no está decidido en otro documento): `DELETE` de **todas** las filas de `Session` y `PasswordResetToken` con `tc_migrator`. Evita dos riesgos: (a) una sesión **revocada después de la copia** (cierre de sesión, restablecimiento de contraseña o anonimización) vuelve a figurar con `revokedAt` nulo y vigente; (b) un token de recuperación (30 minutos y un solo uso, RS-04) **consumido después de la copia** reaparece como no usado y, si la restauración es inmediata, aún vigente. No se marcan como revocadas: `SessionRevokeReason` solo admite `LOGOUT` y `PASSWORD_RESET` (03), ninguno describe este caso. Consecuencia: todas las personas deben iniciar sesión de nuevo y los enlaces de recuperación enviados antes quedan inservibles. **Sin este paso el acceso no se abre.**
7. **Reaplicar las solicitudes de borrado procesadas después de la copia**, con `tc_migrator` y **con la aplicación aún cerrada**:
   1. **Obtener la lista de cuentas** anonimizadas con posterioridad a la marca UTC de la copia. **La auditoría restaurada no sirve:** solo llega hasta la fecha de la copia (06 §4.7), así que no contiene esas filas. Fuentes, por orden: (a) los `account.anonymize` de la **base original**, si sigue accesible (`resourceId` de los eventos con fecha posterior a la copia); (b) el **registro de solicitudes** del equipo (06 §4.4, paso 1). **Propuesta de contenido del registro:** UUID de la cuenta, fecha UTC de verificación, fecha UTC de ejecución, resultado (ejecutada o diferida) y persona que la ejecutó; sin correo ni nombre. Se guarda **fuera de la base y fuera de las copias** (otra ubicación, mismo acceso restringido de §5.4), para que no se pierda con ellas. **Margen:** se incluyen también las ejecutadas en las 24 h anteriores a la marca de la copia (la utilidad es idempotente: repetir es inocuo). Si ninguna fuente existe, el acceso **sigue cerrado** (regla de cierre, abajo).
   2. **Ejecutar la utilidad de anonimización** de 06 §4.5 por cada UUID. Es idempotente: las cuentas ya anonimizadas no cambian.
   3. Si la utilidad **difiere** (por reservas `HELD`, `REVIEW_REQUIRED` o pagos no terminales que sí existían en la fecha de la copia y ya no en el original), el acceso **sigue cerrado** y se eleva al equipo: hace falta un modo de restauración que no aplique el diferimiento, porque la solicitud ya cumplió las condiciones en su día. **Por decidir.**
   4. **Auditoría:** si la restauración vuelve a escribir `account.anonymize`, 06 §4.6 solo prevé `origin = SELF`; añadir `RESTORE` o no escribirlo **está por decidir**.
   5. **Dependencia:** la utilidad y la guardia de `Attendee` que exige 06 §4.5 (03) **no existen**; hasta entonces este paso no es ejecutable y se registra como pendiente.
8. **Habilitar trabajos sin abrir el acceso:** arrancar la aplicación con `JOBS_ENABLED=true`, solo en `127.0.0.1`; si se adoptó `P3-04`, el trabajo J4 anula de nuevo `birthDate` de las actividades terminadas hace más de 30 días (las restauradas lo recuperaron). Esperar su primera ejecución (T-OPS-06).
9. **Comprobar con la aplicación:** `/api/salud` responde 200; una cuenta sembrada inicia sesión; **descargar una entrada existente** (comprueba que el llavero `TICKET_KEYRING` descifra la copia; sin la clave de la copia el QR no puede mostrarse, RB-10); y, para cada cuenta de la lista del paso 7: correo `anon-<id>@anon.invalid`, ningún `Session`, nombres de asistentes `Asistente anonimizado`, texto de chat `[mensaje eliminado]`, `birthDate` nulo en actividades vencidas, e iniciar sesión con el correo original **falla**. Mailpit no recibió correos y no hubo llamadas a PayPal.
10. **Cobros posteriores a la copia** (comprobación incorporada el 2026-11-16). La base restaurada **no conoce** lo ocurrido después de la copia; un cobro en PayPal puede no tener reserva local. **Nunca se inventa una reserva ni se emite una entrada a partir de una coincidencia dudosa.**
    1. **Identificar con evidencia de PayPal** (el panel de actividad de Sandbox o una exportación; no la base): toda captura con fecha posterior a la marca UTC de la copia (con 24 h de margen, inocuo). Por cada una anotar: id de captura, id de orden, `custom_id` (= id de reserva, 05 §6), `invoice_id` (= id de pago), importe, moneda, estado y hora UTC. La evidencia (capturas de pantalla o exportación) se **conserva** fuera del repositorio, con el acceso restringido de §5.4: contiene datos de la persona pagadora.
    2. **Clasificar cada cobro:**

       | Caso | Condición | Qué se hace |
       |---|---|---|
       | A. Ya aplicado | La captura consta en el `Payment` restaurado | Nada |
       | B. Vinculable | Existe en la copia una `Reservation` con ese `custom_id` **y** un `Payment` con ese `invoice_id`, y coinciden el id de orden, el importe y la moneda | Se aplican las **reglas de conciliación vigentes** (04 TX-09 y TX-11: `getOrder` y `settlePayment`): se confirma si hay cupo y se cumplen retención y ventana, o la reserva queda en `REVIEW_REQUIRED` (captura tardía, RB-09). No se salta ninguna regla ni se edita a mano |
       | C. No vinculable o dudoso | Falta la reserva o el pago, algún identificador no coincide, o solo hay coincidencia por importe, fecha, pagador o correo | **Conservar la evidencia y escalar** (RB-09, escalado; la decisión es del equipo). No se crea reserva, no se emiten entradas, no se infiere |
    3. **Sin acceso a la evidencia de PayPal** no se puede afirmar que no hubo cobros: no se abre.
    4. **Pendiente de diseño:** cómo se dispara la comprobación de un caso B cuyo pago restaurado está `ORDER_CREATED` **sin intento abierto**. J2 solo recoge pagos con `nextCheckAt` no nulo (TX-11.1) y «Consultar pasarela» exige `REVIEW_REQUIRED`; hoy solo lo recogería la **reentrega** del webhook, que es finita (25 intentos en 3 días, TX-10) y de la que no se depende. Hasta diseñar una utilidad (por ejemplo, que reclame `nextCheckAt` de esos pagos), un caso B sin reentrega **se trata como C**.
    5. **En T-OPS-05** (con `fake`, sin PayPal real) la «evidencia» se simula con las capturas de la base original posteriores a la copia, y se comprueba que un caso B se concilia con las reglas vigentes y que un caso C **no crea** reserva, pago ni entrada. La comprobación con evidencia real de Sandbox depende de Q-08 y queda pendiente.
11. **Habilitar el acceso:** solo si 1 a 10 pasaron. En T-OPS-05 no se abre: se registra el resultado y se elimina la base con `dropdb -U <rol administrador> turismo_restore`, junto con el archivo copiado dentro del contenedor, según §5.4. En una restauración real se apunta el servicio a la base y se abre el tráfico (RB-11).

**Regla de cierre.** El acceso (HTTP, WebSocket, cualquier ruta pública y el cambio del servicio real hacia la base restaurada) **permanece cerrado**, y T-OPS-05 o RB-11 se declara **no superada**, si: (a) no se obtiene la lista del paso 7.1 (falta el registro y la base original no es accesible); (b) la utilidad de anonimización no existe o falla en alguna cuenta; (c) la utilidad difiere y no hay modo de restauración decidido; (d) falla cualquier comprobación de los pasos 5 a 9; (e) no se pudieron identificar los cobros posteriores a la copia con evidencia de PayPal, o alguno no está clasificado (paso 10). Un cobro de caso C **no bloquea por sí solo** si queda con su evidencia conservada y escalado, pero abrir con casos pendientes es decisión del equipo. Nunca se abre «con avisos». Las operaciones posteriores a la copia (reservas, pagos, mensajes) **no están en ella**: ver el paso 10 y RB-11 en §8.

**Evidencia de T-OPS-05** (pendiente; EV-04/EV-05 de 08 §5): fecha, nombre y suma de la copia (nunca su contenido), versiones de `pg_dump` y `pg_restore`, resultado de cada comprobación de los pasos 5, 9 y 10, qué fuente se usó en el 7.1 y la clasificación A, B o C de cada cobro posterior (sin datos de la persona pagadora). Se guarda en `docs/evidencias/` y **no se afirma hecha hasta existir**.

### 5.6 Pendientes de §5

- **Decisión del equipo:** reparto de las dos personas operadoras (Q-03); ubicación y cifrado de la segunda copia; plazos de §5.4; si se acepta la regla por utilidad de §5.2.
- **Por verificar al implementar:** `DROP`/`CREATE DATABASE` por `tc_migrator` o `prisma migrate reset` (§5.2); que `pg_restore --single-transaction` admita las funciones, disparadores y `CHECK` de 03 §8 en PostgreSQL 18; que `00-roles.sql` produzca los mismos privilegios que 03 §8.5; que `createdb` esté disponible con el rol administrador del contenedor; formato exacto del manifiesto.
- **Alineaciones:** 08 (T-OPS-04 y T-OPS-05) y 06 §4.7 alineados con este apartado el 2026-11-16. 10 y 11 deben nombrar la utilidad de anonimización y la de copia cuando se numeren.
- `data:purge` (§4) **no se trata aquí**: su alcance y sus guardas siguen por definir.

## 6. Despliegue

### 6.1 Requisitos del alojamiento (definitivos)

Proceso Node persistente · WebSocket (WSS) sobre el mismo puerto que HTTP · HTTPS gestionado · variables de entorno secretas · PostgreSQL 15 o superior · URL pública estable para el webhook de PayPal en el puerto 443 · señal `SIGTERM` con margen de cierre.

No sirven: plataformas sin servidor o que no admitan un servidor propio ni WebSocket.

### 6.2 Propuesta (D-59; pendiente de Q-04)

Servicio web administrado (se evaluó Render) + PostgreSQL 18 administrado.

| Aspecto | Dato verificado el 2026-11-12 |
|---|---|
| WebSocket | Admitido en servicios web; usar `wss`; sin duración máxima. |
| TLS | Termina en el balanceador, que reenvía por HTTP; HTTP se redirige a HTTPS. |
| Puerto | Escuchar en `0.0.0.0` y en `PORT` (10000 por defecto). |
| Salud | Ruta HTTP con límite de 5 s; 60 s de fallos consecutivos reinician la instancia. |
| Despliegue | Sin corte; `SIGTERM` y 30 s de margen (ampliable). |
| Orden previa al despliegue | Solo en planes de pago: en el gratuito las migraciones se ejecutan en la orden de arranque. |
| PostgreSQL | Versiones 13 a 18; conexión interna preferente; TLS obligatorio en la externa. |

Órdenes previstas: construcción `npm ci && npm run build`; arranque `npm run db:migrate:deploy && npm run start`; salud `/api/salud`.

### 6.3 Limitaciones del plan gratuito evaluado

| Limitación | Efecto | Tratamiento |
|---|---|---|
| Suspensión tras 15 min sin tráfico; arranque de cerca de un minuto. | Primera petición lenta; trabajos detenidos mientras duerme. | Despertar el servicio antes de la demostración. Los invariantes no dependen de los trabajos. Los reintentos del webhook lo despiertan. |
| Sin tráfico saliente por los puertos 25, 465 y 587. | El SMTP habitual no funciona. | Buzón de pruebas en otro puerto (por ejemplo 2525) — **por verificar**. |
| PostgreSQL gratuito de 1 GB que caduca a los 30 días, sin copias. | Pérdida de datos. | Crear la base cerca de la entrega o usar un plan de pago; la semilla reconstruye la demostración. |
| Reinicios en cualquier momento; sistema de archivos efímero. | Corte breve. | No se guarda nada en disco; los clientes reconectan. |
| Sin orden previa al despliegue. | — | Migrar en el arranque. |

### 6.4 Alternativa: servidor virtual propio (opción pendiente de Q-04)

**Estado:** descripción **de diseño**; **no se eligió proveedor** y no se verificaron límites, precios ni puertos de ninguno. Es una alternativa a §6.2, no una recomendación; la decisión depende de Q-04 (alojamiento y presupuesto). Más control, más operación a cargo del equipo.

**Topología prevista** (un servidor virtual Linux con Docker y Compose):

| Pieza | Descripción |
|---|---|
| Proxy inverso | Único servicio que publica puertos (80 para el desafío del certificado y la redirección; 443). Obtiene y renueva el certificado solo (la herramienta se elige al implementar). Reenvía HTTP **y la actualización a WebSocket** al servicio `app`, conserva `Host` y `Origin` y fija `X-Forwarded-For`; la aplicación se configura con `TRUST_PROXY_HOPS=1` (06 §3.2). |
| `app` | Imagen construida desde el repositorio (`npm ci && npm run build`), escucha en `0.0.0.0:PORT` **solo en la red interna** de Compose. Mismo puerto para HTTP y WebSocket (T-OPS-01). |
| `db` | `postgres:18` con volumen con nombre; **sin puerto publicado**. Los roles y bases salen de `prisma/sql/00-roles.sql`, solo con una base de datos de despliegue (sin las de pruebas). |
| Cortafuegos | Abiertos 80 y 443; administración por SSH restringida a las direcciones del equipo. PostgreSQL y la interfaz de Mailpit nunca expuestos. |

**HTTPS y WSS.** `APP_ORIGIN=https://<dominio>` (hace falta un **dominio** propio; coste y titularidad, pendientes de Q-04) y `APP_ENV=production`, que exige `PAYMENT_PROVIDER=paypal` (02 §9). El navegador usa `wss` por el mismo origen. Se comprueban HSTS, cookie `__Host-` con `Secure` y WSS (T-SEG-02, T-SEG-12b, T-OPS-01). La URL del webhook de PayPal debe ser pública, estable y estar en el puerto 443 (§6.1); su recepción con firma válida se comprueba en T-PAG-24 (manual, Q-08).

**Secretos.** En un archivo de entorno del servidor, **fuera del repositorio** y legible solo por el usuario de despliegue (permisos 600), o en el mecanismo de secretos de Docker; nunca dentro de la imagen. `MIGRATION_DATABASE_URL` **no** va en el entorno del contenedor `app` (06 A-43): las migraciones (`npm run db:migrate:deploy`) se lanzan como una orden aparte con esa credencial. Esto difiere de §6.2, donde el arranque del servicio administrado migra y exige la variable en su entorno (riesgo residual aceptado en A-43).

**Reinicios.** `restart: unless-stopped` en `app` y `db`; Docker habilitado al arrancar el sistema; comprobación de salud sobre `/api/salud` (200 o 503, 05 §4); `stop_grace_period` igual o superior al plazo de cierre ordenado ante `SIGTERM`, **por fijar** (08 §3.7.3). Al arrancar la aplicación ejecuta J1, J2 y J4 una vez (02 §11.3) y no hay estado que restaurar. El despliegue **no es sin corte**: se reconstruye la imagen, se genera una copia (§5.4), se migra y se reinicia `app` (RB-08); un corte breve y el cierre de los sockets del chat son esperables (RB-06).

**Copias.** La copia con `pg_dump` de §5.4 corre **en el servidor**, programada (temporizador del sistema, por elegir), con `tc_migrator` mediante `docker compose exec`, y se guarda **fuera del servidor** (perder el disco del servidor no puede perder también las copias). Retención, ubicación y acceso siguen las **propuestas** de §5.4. Una instantánea del disco que ofrezca un proveedor **no sustituye** a `pg_dump` mientras no se verifique que es consistente y restaurable. La restauración sigue §5.5 y RB-11.

**Operación a cargo del equipo:** sincronía de reloj del sistema (el reloj del servidor decide plazos de reserva, D-10), actualizaciones del sistema y de Docker, espacio en disco, rotación de registros de contenedor para que no llenen el disco, renovación del certificado y revisión del cortafuegos.

**Riesgos y verificaciones pendientes (no comprobados):** que el proveedor permita tráfico saliente SMTP o un puerto alternativo (§6.3, RB-02); que el límite de memoria del servidor soporte el coste de Argon2 y la agrupación de conexiones (06 A-01, `DB_POOL_MAX`); que el proxy elegido propague correctamente WebSocket y `Origin`; tiempo de renovación del certificado; coste total. **Nada de esto se ha ejecutado.**

| Aspecto | Servicio administrado (§6.2) | Servidor virtual (§6.4) |
|---|---|---|
| HTTPS y WSS | Los gestiona la plataforma | Proxy y certificado a cargo del equipo |
| Base de datos | Administrada (copias según plan; el gratuito no las ofrece) | Contenedor propio; copias a cargo del equipo (§5.4) |
| Despliegue | Sin corte (verificado el 2026-11-12) | Con corte breve |
| Migraciones y A-43 | Se migra en el arranque en el plan gratuito | Orden aparte con credencial separada |
| Operación | Mínima | Sistema, Docker, certificado, disco y reloj |
| Decisión | Pendiente de Q-04 | Pendiente de Q-04 |

## 7. Registros y diagnóstico

### 7.1 Registros (decidido)

[02 §10.3](02-arquitectura-y-decisiones.md): JSON por línea, id de petición, redacción de datos sensibles, ruta sin cadena de consulta. Toda respuesta de error trae su `requestId` (02 §10.1): es la clave para buscar en los registros.

### 7.2 Diagnóstico por síntoma

Siempre se empieza por `GET /api/salud` (200, o 503 si falla `SELECT 1` en 2 s o el proceso se cierra). La columna de la derecha remite a la ficha de §8.

| Síntoma | Primera comprobación | Ficha |
|---|---|---|
| Todo falla o `/api/salud` devuelve 503 | ¿Está en marcha el servicio de base? ¿acaba de reiniciarse el proceso? | RB-01, RB-06 |
| `BUSY_TRY_AGAIN` (503) con `/api/salud` en 200 | Son **bloqueos**, no caída: reintentar y mirar si persiste | RB-01 (diagnóstico) |
| Primera petición muy lenta; chat desconectado tras un rato | ¿Estuvo el servicio dormido (plan gratuito)? | RB-12 |
| La construcción o el arranque fallan; una variable «inválida» | Mensaje del arranque (nombra la variable, no su valor) | RB-08 |
| El servicio se reinicia solo o tras un despliegue no sube | Registro del reinicio y de la orden de arranque | RB-06, RB-08 |
| El correo de recuperación no llega | Registros de envío; `SMTP_*`; Mailpit en local | RB-02 |
| `GATEWAY_UNAVAILABLE` al pagar | ¿Falla solo nuestra red o las credenciales de Sandbox? | RB-03 |
| El webhook responde 4xx o 5xx, o hay muchos eventos repetidos | Código de respuesta y `PaymentEvent` (los duplicados son normales) | RB-05 |
| Cargo en PayPal sin entradas; reserva `REVIEW_REQUIRED` | Lista de revisión de pagos y «Consultar pasarela» | RB-09 |
| Reservas `HELD` vencidas que siguen visibles | `JOBS_ENABLED`; fila `job.run` reciente | RB-04 |
| `RATE_LIMITED` al iniciar sesión | Esperar el vencimiento del bloqueo (15 min propuestos) o restablecer la contraseña | RB-07 |
| Hay que cortar las sesiones de otra persona | Sin acción ni procedimiento aprobado | RB-07 — **pendiente de diseño** (§7.3) |
| La descarga de una entrada falla al descifrar | ¿El `tokenKeyId` de la fila está en el llavero? | RB-10 |
| Una entrada es rechazada en el ingreso (`TICKET_ALREADY_USED`, `OUTSIDE_CHECKIN_WINDOW`, `WRONG_ACTIVITY`) | Es una regla de negocio, no un incidente: revisar actividad y ventana (02 §10.2, D-79) | Ninguna |
| El chat no entrega mensajes | ¿Sigue vigente la sesión? ¿`Origin`? ¿hubo reinicio? | Ninguna propia; 05 §5, RB-06, RB-12 |
| Base perdida, corrupta o caducada | Última copia válida y su marca UTC | RB-11 |
| Tras restaurar, un cobro en PayPal sin reserva | Evidencia de PayPal y clasificación A, B o C | RB-11 (§5.5, paso 10), RB-09 |

### 7.3 Tres puntos que antes estaban abiertos

| Tema | Lo que está definido | Lo que sigue pendiente |
|---|---|---|
| **Cuentas** | El bloqueo por intentos fallidos **vence solo** (propuesta de 06 §3.2: 15 min; `LoginThrottle` se purga a las 24 h). Vías definidas: esperar, restablecer la contraseña (enlace de 30 min y un solo uso, revoca **todas** las sesiones de la cuenta, RS-04) y cerrar sesión. Ficha: RB-07 | **Pendiente de diseño:** intervenir sobre las sesiones de otra persona sin su participación (credencial expuesta, error de rol). No consta acción en 05 §3 y no se autoriza ningún borrado manual. Se registra en el cuaderno y se escala |
| **Reembolsos manuales** | Un reembolso se hace **fuera del sistema** (en PayPal); el escalado es el de RB-09 y la decisión es del equipo (01 §3.2: reembolsos fuera del MVP) | **Pendiente de diseño:** un estado que marque «resuelto fuera del sistema». **No confundir:** un caso **cerrado dentro de la aplicación** es el que `settlePayment` liquidó (reserva `CONFIRMED` con entradas) o liberó por evidencia de rechazo (TX-09, TX-11), y sale de la lista; uno **reembolsado a mano** sigue en `REVIEW_REQUIRED` y visible hasta que se diseñe ese estado. Anotar en el cuaderno la reserva y la captura |
| **Restauración** | Antes de reabrir se identifican los cobros posteriores a la copia **con evidencia de PayPal** y se clasifican: ya aplicado, vinculable (se concilia con las reglas vigentes) o no vinculable (se conserva la evidencia y se escala; nunca se crea una reserva ni se emite un QR por una coincidencia dudosa). Procedimiento: §5.5, paso 10, y T-OPS-05 | **Pendiente de diseño:** cómo disparar la comprobación de un pago restaurado `ORDER_CREATED` sin intento abierto (hoy solo la reentrega del webhook); mientras tanto se trata como caso no vinculable |

## 8. *Runbooks*

Doce fichas para operar la demostración. **Ninguna se ha ejecutado**: los comandos y utilidades son los previstos (§4 y §5) y varias dependen de código que aún no existe. Lo que el equipo no ha decidido se marca **(propuesta)**.

**Reglas comunes a todas las fichas**

- **Fuente de verdad:** los registros JSON por línea con `requestId` (02 §10.3; en local `docker compose logs`, en el despliegue el panel de registros del alojamiento, Q-04), la tabla `AuditEvent` (06) y `GET /api/salud` (200, o 503 si falla `SELECT 1` en 2 s o el proceso se está cerrando; 05 §4). Los registros ya van redactados; no se pegan secretos, tokens ni correos en el cuaderno de incidentes.
- **Qué no se hace nunca a mano:** `UPDATE` o `DELETE` sobre `Reservation`, `Payment`, `PaymentEvent`, `Ticket` ni `AuditEvent` (los disparadores de 03 lo impiden y las reglas de 04 dependen de ello); capturar un pago fuera de la aplicación; generar un token de recuperación; reiniciar una base de datos con datos que importan (`db:reset` y `docker compose down -v` son solo para local, §5.3).
- **Quién actúa:** la persona operadora (hasta **dos** designadas, Q-03 pendiente) con acceso a registros y a `MIGRATION_DATABASE_URL`, y el rol `ADMIN` de la aplicación para la revisión de pagos. **Escalar** significa avisar al equipo completo; no hay personal de guardia.
- **Cuaderno de incidentes (propuesta):** una línea por incidente con hora UTC, ficha usada, qué se hizo y resultado, guardada fuera de la base. Sirve también como registro de decisiones tomadas bajo presión.
- **Plazo de escalado (propuesta):** si una ficha no devuelve el servicio a la normalidad en **15 minutos**, se escala.

### Índice

| ID | Situación |
|---|---|
| RB-01 | Base de datos no disponible |
| RB-02 | Fallo de SMTP |
| RB-03 | PayPal temporalmente caído |
| RB-04 | Reservas vencidas que no se limpian |
| RB-05 | Webhooks repetidos o que fallan |
| RB-06 | Reinicio durante una operación |
| RB-07 | Cuenta bloqueada o revocación de sesiones |
| RB-08 | Despliegue o migración fallidos |
| RB-09 | Dinero capturado sin entradas (caso en revisión) |
| RB-10 | Pérdida o rotación de la clave de QR |
| RB-11 | Restauración de una copia de seguridad |
| RB-12 | Servicio suspendido por inactividad antes de una demostración |

### RB-01 — Base de datos no disponible

- **Señal:** `GET /api/salud` devuelve 503 en menos de 2 s; los registros muestran errores de conexión; las acciones devuelven `INTERNAL_ERROR` o `BUSY_TRY_AGAIN` (este último indica **bloqueos**, no caída). En el alojamiento evaluado, 60 s de fallos de salud reinician la instancia (§6.2).
- **Diagnóstico:** ¿el servicio de base está en marcha (`docker compose ps`; panel del alojamiento)? ¿cambió o caducó la credencial de `DATABASE_URL`? ¿se agotó el *pool* (`DB_POOL_MAX`)? ¿**caducó la base gratuita** (30 días, sin copias, §6.3)?
- **Acción:** devolver el servicio de base (en local, `npm run db:up`). No reiniciar la aplicación en bucle: al volver la base responde sola (T-OPS-02b). Si la base desapareció o caducó, crear otra y seguir RB-11 con la última copia (§5.4).
- **Recuperación:** `/api/salud` 200 **sin reiniciar**; iniciar sesión con una cuenta de prueba; abrir el catálogo; en `/panel/admin/revision-pagos` no hay casos nuevos inesperados (la caída pudo cortar capturas; J2 los recoge, TX-11).
- **Escalar:** la base no vuelve en 15 min (propuesta); pérdida de datos o base caducada; capturas de pago durante la caída → RB-09 cuando vuelva.

### RB-02 — Fallo de SMTP

- **Señal:** el correo de recuperación no llega; registros con envío fallido (el envío ocurre **después** de confirmar el token y la persona recibe la misma respuesta, 02 §11); en local, Mailpit (`http://localhost:8025`) vacío.
- **Diagnóstico:** valores de `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`; en el alojamiento gratuito evaluado **no hay salida por los puertos 25, 465 y 587** (§6.3; alternativa por el puerto 2525, **por verificar**); ¿Mailpit está arriba?
- **Acción:** corregir host y puerto. La persona puede **pedir otro enlace**; no se genera ni se lee ningún token a mano (solo se guarda su hash). Para una demostración sin correo, usar las cuentas sembradas (03 §9.3).
- **Recuperación:** pedir la recuperación de una cuenta de prueba; el mensaje llega al buzón; el enlace funciona **una vez** y dentro de 30 minutos (RS-04).
- **Escalar:** sin buzón utilizable en el despliegue → decisión de alojamiento o buzón (Q-04); sospecha de que un enlace salió a un destinatario equivocado.

### RB-03 — PayPal temporalmente caído

- **Señal:** `GATEWAY_UNAVAILABLE` (503, reintentable) al iniciar o capturar un pago; pagos con `lastErrorCode = GATEWAY_UNAVAILABLE`; el webhook responde **503** cuando no puede verificar la firma (TX-10.2).
- **Diagnóstico:** ¿falla solo nuestra conexión (`PAYMENT_HTTP_TIMEOUT_MS`, salida de red) o también las credenciales de Sandbox (`PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`, Q-08)? ¿`PAYPAL_API_BASE` es el anfitrión de Sandbox?
- **Acción:** **no** reintentar capturas ni tocar estados. La conciliación (J2) consulta sola durante ≈ 76 h (TX-11.2) y el comprador puede reiniciar el pago. No se cambia a `PAYMENT_PROVIDER=fake` en un entorno con `APP_ENV=production`: la validación lo impide (02 §9).
- **Recuperación:** un pago de prueba llega a la aprobación y se captura; los pagos `ORDER_CREATED` avanzan; no aparecen casos nuevos «conciliación agotada».
- **Escalar:** credenciales rechazadas (rotarlas, Q-08); caída cercana a las 76 h o casos agotados → RB-09.

### RB-04 — Reservas vencidas que no se limpian

- **Señal:** reservas `HELD` con `expiresAt` pasado que siguen sin pasar a `EXPIRED`; no hay `job.run` reciente. **No es un fallo de inventario:** la disponibilidad filtra por `expiresAt > ahora` (02 §11.2) y el cupo ya está libre.
- **Diagnóstico:** `JOBS_ENABLED` en `false` por error (valor de pruebas); servicio suspendido (RB-12); excepción de J1 en los registros; bloqueos (`BUSY_TRY_AGAIN`).
- **Acción:** poner `JOBS_ENABLED=true` y reiniciar: al arrancar corren J1 y J2 una vez, y J4 si se adoptó `P3-04` (02 §11.3). No cambiar estados a mano.
- **Recuperación:** las reservas vencidas pasan a `EXPIRED` y queda una fila `job.run` con su recuento; el comprometido de cada oferta es menor o igual que su capacidad.
- **Escalar:** persiste con los trabajos activos y el mismo error → defecto de TX-06; se registra y se corrige en un paquete.

### RB-05 — Webhooks repetidos o que fallan

Sigue TX-10 y TX-11. El webhook **acelera**; la fuente de verdad es `getOrder` y la conciliación.

- **Señal:** respuestas 400, 413, 503 o 500 en `/api/pagos/paypal/webhook`; auditorías `DENIED` por firma inválida; muchos `PaymentEvent` con `DUPLICATE_EVENT` o `NO_CHANGE`; pagos con captura iniciada que no avanzan.
- **Diagnóstico por respuesta (TX-10.2):** **200 repetidos o duplicados** → normal, la entrega es *al menos una vez* y el orden no está garantizado; **400 firma inválida** → ¿`PAYPAL_WEBHOOK_ID` corresponde al Sandbox? ¿algún intermediario altera el cuerpo (debe llegar intacto)?; **400/413** cabeceras ausentes o cuerpo > 256 KB; **503** el verificador no estaba disponible (ver RB-03; no es «firma inválida»); **200 sin evento registrado** → evento contradictorio: se adelantó `nextCheckAt` y J2 lo resolverá; **500** defecto (`TC_…`) con su `requestId`.
- **Acción:** duplicados y contradictorios no requieren acción. Corregir `PAYPAL_WEBHOOK_ID` si procede. **No** insertar `PaymentEvent` a mano. Los casos que J2 no pueda cerrar acaban en la lista del administrador (RB-09).
- **Recuperación:** un evento de prueba se responde 200 y deja **una** fila `PaymentEvent` por `id` de evento; los pagos con captura iniciada avanzan o llegan a `CAPTURED`. El simulador de PayPal **no** admite la verificación por *postback* (TX-10.1): la verificación real es T-PAG-24, manual y pendiente (Q-08).
- **Escalar:** 500 por defecto; firmas inválidas sostenidas desde un origen (**A-25: umbral sin decidir**, no hay límite por origen todavía); pagos próximos a agotar el calendario.

### RB-06 — Reinicio durante una operación

- **Señal:** despliegue, caída del proceso o reinicio del alojamiento; peticiones cortadas; el chat se desconecta.
- **Diagnóstico:** causa (despliegue, memoria, comprobación de salud, suspensión). Una transacción interrumpida **se revierte entera** (04). `SIGTERM` pone `/api/salud` en 503 y cierra de forma ordenada (02 §11); el plazo de gracia exacto sigue por fijar (08 §3.7.3; 30 s ampliables en el alojamiento evaluado).
- **Acción:** ninguna manual. Al arrancar valida el entorno, comprueba la base, ejecuta J1 y J2 una vez (J4 si se adoptó `P3-04`) y acepta tráfico (02 §11.3). No hay estado en memoria que restaurar.
- **Recuperación:** `/api/salud` 200; J2 retoma los pagos con captura iniciada (`nextCheckAt` y `checkAttempts` están en la base, T-PAG-20c); el chat reconecta y pide lo posterior a su último id sin pérdida ni duplicado (T-CHAT-08).
- **Escalar:** reinicios en bucle (→ RB-08 si siguieron a un despliegue); pagos `ORDER_CREATED` con intento abierto que no avanzan tras 15 min (→ RB-09).

### RB-07 — Cuenta bloqueada o revocación de sesiones

- **Señal:** una persona recibe `RATE_LIMITED` al iniciar sesión (propuesta de 06 §3.2: 5 fallos en 15 min por cuenta, 20 por IP, bloqueo de 15 min); o hay que cortar el acceso de una cuenta (credencial expuesta, error de rol).
- **Diagnóstico:** el bloqueo **expira solo** a los 15 min y `LoginThrottle` se purga a las 24 h (06 §4.1); sus claves son HMAC y no revelan la cuenta. Una sesión solo se revoca hoy por cerrar sesión o por restablecer la contraseña (03: `LOGOUT`, `PASSWORD_RESET`). **No consta en 05 §3 una acción de administración para desbloquear cuentas o revocar sesiones ajenas** (por confirmar).
- **Acción:** **esperar el vencimiento del bloqueo** (15 min según lo propuesto) o usar las vías ya definidas: restablecer la contraseña con el enlace de 30 minutos y un solo uso (RS-04; **revoca todas las sesiones** de la cuenta y cierra sus sockets, TX-13 y TX-14; necesita el correo funcionando, RB-02) y cerrar sesión (`LOGOUT`). No se vacía `LoginThrottle` salvo en pruebas. **Cortar las sesiones de otra persona sin su participación es un caso pendiente de diseño**: no existe acción de administración ni procedimiento aprobado (§7.3), y esta ficha **no** autoriza borrar filas de `Session` a mano; se escala.
- **Recuperación:** la persona inicia sesión tras el plazo o tras restablecer la contraseña; sus sesiones anteriores ya no dan acceso (401 y socket cerrado); el cuaderno anota la cuenta y el motivo.
- **Escalar:** necesidad de cortar sesiones ajenas (pendiente de diseño); sospecha de acceso indebido a una cuenta con rol `GAD`, `OPERATOR` o `ADMIN`; ataque distribuido (el límite por IP se elude, 06 A-01).

### RB-08 — Despliegue o migración fallidos

- **Señal:** la construcción falla; el arranque se detiene en `db:migrate:deploy` o en la validación de entorno (nombra la variable, sin su valor); `/api/salud` no responde tras el despliegue.
- **Diagnóstico:** registro de la orden de construcción o de arranque; variable inválida; migración aplicada **a medias** (Prisma la deja registrada como fallida en `_prisma_migrations`; ver §8.14).
- **Acción:** **antes de migrar en el despliegue se genera una copia** (§5.4, propuesta). Las migraciones solo van hacia adelante y una aplicada no se edita (03 §9.1): un error se corrige con **otra migración** o, si dejó datos a medias, restaurando la copia previa (RB-11). Revertir el código a la versión anterior **solo** si es compatible con el esquema ya migrado; si no, no se hace.
- **Recuperación:** `/api/salud` 200; sin migraciones pendientes ni deriva (T-DB-01i); recorrido breve: iniciar sesión, abrir el catálogo, reservar con el adaptador del entorno.
- **Escalar:** migración parcial sobre datos de demostración; esquema distinto del esperado sin causa clara.

### RB-09 — Dinero capturado sin entradas (caso en revisión)

Sigue TX-09, TX-10 y TX-11. **Resolver el cargo ocurre fuera del sistema** (los reembolsos están fuera del MVP, 01 §3.2).

- **Señal:** reserva `REVIEW_REQUIRED` en `/panel/admin/revision-pagos` (sección A: `NO_CAPACITY`, `UNCERTAIN_RESULT` o **conciliación agotada** con `lastErrorCode = RECONCILE_EXHAUSTED`); o una persona compradora informa un cargo sin entradas; o aviso `REFUND_AFTER_CONFIRMATION` (sección B, solo lectura).
- **Diagnóstico:** el `ADMIN` (no ve nombres ni fechas de nacimiento, 01 §8.5) abre el caso y pulsa **«Consultar pasarela»**: es una consulta idempotente, nunca una captura. Si muestra captura, se liquida; si muestra rechazo, se libera; si no muestra nada, **sigue en revisión** (un caso agotado **no** afirma que no hubo cargo, TX-11.2).
- **Acción:** no modificar la base ni capturar de nuevo. Con captura confirmada y **sin cupo** (captura tardía), la reserva no se confirma ni emite entradas: se reembolsa desde el panel de PayPal Sandbox y se informa a la persona compradora. Anotar en el cuaderno.
- **Recuperación:** la reserva sale de la lista al liquidarse o liberarse; **ninguna** entrada duplicada (`Ticket` único por asistente); el comprometido de la oferta sigue ≤ capacidad. **Pendiente de diseño (§7.3):** no existe un estado «resuelto fuera del sistema»; un caso reembolsado a mano en PayPal **no equivale** a uno cerrado dentro de la aplicación y sigue listado en `REVIEW_REQUIRED`.
- **Escalar:** siempre al equipo (afecta a dinero); la consulta falla repetidamente (RB-03); PayPal muestra la captura y la liquidación no la aplica (defecto).

### RB-10 — Pérdida o rotación de la clave de QR

- **Señal:** la descarga de una entrada falla al descifrar; el arranque se detiene por llavero ausente (producción exige `TICKET_KEYRING`, 02 §9); se sospecha la fuga de la clave.
- **Diagnóstico:** cada `Ticket` guarda `tokenHash` y `tokenCiphertext` con su `tokenKeyId` (03); se cifra con la clave activa y se descifra con la que indica la fila (05). Con `tc_migrator`: ¿qué `tokenKeyId` usan las entradas `VALID` y están todos en el llavero?
- **Acción (propuesta; la semántica exacta de los scripts se fija en P4-02):** **rotación planificada** — añadir `k2:<clave>` al llavero, cambiar `TICKET_ACTIVE_KEY_ID` y ejecutar `tickets:rotate-key` (recifra las `VALID` con `k2`, mismo QR); conservar `k1` hasta que ninguna fila la use. **Pérdida de una clave sin copia** o **fuga** — `tickets:reissue` emite un QR **nuevo** y deja inservible el anterior (el disparador de `Ticket` permite cambiar estos campos solo mientras la entrada es `VALID`, nunca una `USED`); hay que avisar a quien ya tenía el QR.
- **Recuperación:** descargar una entrada `VALID` por cada identificador de clave en uso; que el ingreso (`lookupTicketAction`) la reconozca; una entrada `USED` no cambia.
- **Escalar:** pérdida sin copia de la clave y sin posibilidad de reemisión; sospecha de fuga (invalidar y reemitir).

### RB-11 — Restauración de una copia de seguridad

El procedimiento completo y la **regla de cierre** están en §5.5; esta ficha solo añade el contexto del incidente.

- **Señal:** base perdida, corrupta o caducada (§6.3); migración fallida con datos dañados (RB-08); orden de restaurar tras un incidente.
- **Diagnóstico:** elegir la **última copia válida** (suma y manifiesto, §5.4) y anotar su marca UTC; localizar las fuentes de la lista de borrados posteriores (§5.5, paso 7.1: base original o registro de solicitudes); comprobar que se dispone de `TICKET_KEYRING` de esa época (RB-10).
- **Acción:** seguir §5.5 con el servicio **detenido o sin ruta pública**: verificar, restaurar en base nueva, comprobar, **invalidar sesiones y tokens** (propuesta), reaplicar los borrados posteriores a la copia, activar trabajos sin abrir y comprobar con la aplicación. **El acceso permanece cerrado** si falta el registro, falla la reaplicación o falla cualquier comprobación.
- **Recuperación:** pasos 5, 9 y 10 de §5.5 superados y paso 11 ejecutado (se apunta el servicio a la base restaurada). **Lo posterior a la copia se perdió:** reservas, pagos y mensajes. Los cobros posteriores se identifican con **evidencia de PayPal** y se clasifican A, B o C (§5.5, paso 10): no hay herramienta automática, la API de búsqueda por `invoice_id` sigue sin verificar (04 §5.2) y los webhooks reentregados de órdenes desconocidas se ignoran (`IGNORED_UNKNOWN_ORDER`). Un cobro vinculable se concilia con las reglas vigentes; uno que no se pueda vincular con certeza **conserva su evidencia y se escala** como RB-09, sin crear reserva ni emitir entradas.
- **Escalar:** siempre al equipo. Si falta la lista de borrados o la reaplicación falla, la decisión de abrir es del equipo, nunca de una sola persona.

### RB-12 — Servicio suspendido por inactividad antes de una demostración

- **Señal:** la primera petición tarda cerca de un minuto; los sockets del chat se caen; los trabajos estuvieron detenidos mientras dormía (§6.3).
- **Diagnóstico:** `GET /api/salud` hasta 200; confirmar que la base gratuita **no caducó** (30 días).
- **Acción:** **despertar el servicio con antelación** (propuesta: 15 minutos antes) repitiendo `GET /api/salud`. Al arrancar corren J1 y J2, y J4 si se adoptó `P3-04` (02 §11.3): las retenciones vencidas se liberan y los pagos pendientes se concilian. Tener a mano el plan de contingencia de 12 §7.
- **Recuperación:** iniciar sesión con la cuenta de demostración, ver ofertas, conectar el chat por WSS y comprobar que no hay casos nuevos en revisión de pagos.
- **Escalar:** no responde en 3 minutos (propuesta) → RB-08 o RB-01; si la demostración corre riesgo, pasar a la contingencia de 12.

### 8.13 Propuestas de este apartado y de §5 que el equipo aún no ha decidido

Ninguna está aprobada: **invalidar sesiones y tokens de recuperación tras restaurar** (§5.5, paso 6); **retención** de las copias (30 días, §5.4) y su **ubicación y acceso** (dos copias, dos personas, cifrado en reposo); **modo de restauración** que no aplique el diferimiento de la anonimización cuando la solicitud ya cumplió las condiciones en su día (§5.5, 7.3); el valor **`RESTORE`** en `origin` de `account.anonymize` frente a no volver a escribir el evento (06 §4.6; §5.5, 7.4); el contenido del **registro de solicitudes** de borrado y su margen de 24 h; el **cuaderno de incidentes**; los plazos de escalado (15 min y 3 min); el reparto de personas operadoras (Q-03); y el contenido de `tickets:rotate-key` y `tickets:reissue` (RB-10). `db:reset-demo` sigue como propuesta pendiente (03 §9.4). **Pendientes de diseño** (no son propuestas cerradas; §7.3): intervención sobre las sesiones de otra persona; estado «resuelto fuera del sistema» para reembolsos hechos a mano; y cómo disparar la comprobación de un pago restaurado `ORDER_CREATED` sin intento abierto (§5.5, paso 10.4). **Opción de alojamiento sin elegir:** servidor virtual propio (§6.4), pendiente de Q-04.

### 8.14 Verificaciones pendientes de PostgreSQL y Prisma (separadas de las decisiones)

Son comprobaciones **técnicas** que se hacen al implementar; ninguna se ha ejecutado.

| Sistema | Qué comprobar | Dónde se usa |
|---|---|---|
| PostgreSQL 18 | Que `pg_restore --single-transaction --exit-on-error` restaure sin error las funciones, los disparadores, los disparadores de restricción diferibles y los `CHECK` de 03 §8, y que éstos no se disparen al cargar los datos | §5.5 paso 4; RB-11 |
| PostgreSQL 18 | Que `00-roles.sql` cree roles y privilegios iguales a 03 §8.5, y que una copia con propietarios y privilegios restaure sobre esos roles | §5.5 pasos 2 y 5 |
| PostgreSQL 18 | `createdb` y `dropdb` con el rol administrador del contenedor; si `tc_migrator` tiene `CREATEDB` o puede ejecutar `DROP`/`CREATE DATABASE` | §5.2 (`db:reset`), §5.5 |
| PostgreSQL | Compatibilidad del cliente `pg_dump` 18 con el servidor administrado y su conexión externa con TLS | §5.4 |
| PostgreSQL | Que `DELETE` de todas las `Session` y `PasswordResetToken` no choque con restricciones ni con disparadores | §5.5 paso 6 |
| Prisma 7 | Si `prisma migrate reset` sirve para recrear una base sin privilegios de creación, y qué pasa con la base sombra | §5.2 |
| Prisma 7 | Sintaxis y comportamiento de `migrate status` y de `migrate resolve` para una migración fallida | RB-08 |
| Prisma 7 | Que `_prisma_migrations` restaurada con `pg_restore` deje `migrate status` sin cambios y sin deriva, con la URL de migración apuntando a `turismo_restore` (Prisma no carga `.env`, 02 §9) | §5.5 paso 5 |
| Prisma 7 | Sintaxis de `prisma migrate diff` (ya listada en 03 §10.2) | RB-08 |

Las verificaciones de PayPal (calendario de conciliación, retención de la clave de idempotencia, búsqueda por `invoice_id`) siguen en 04 §5.2 y no se repiten aquí.

## 9. Escalado futuro

Decidido en [02 §13](02-arquitectura-y-decisiones.md).
