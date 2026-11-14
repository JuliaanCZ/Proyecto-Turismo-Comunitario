# 09 — Entorno, despliegue y operación

> **ESTADO: PARCIAL — punto de avance guardado el 2026-11-12.**
> Contiene las variables de entorno, los scripts previstos, los servicios locales, la propuesta de alojamiento con sus límites verificados y la lista de *runbooks* **ya decididos**. Faltan los pasos detallados por sistema operativo, el `.env.example` comentado, copias de seguridad y el contenido de cada *runbook* (⏳).
> **Siguiente paso exacto:** §2 — preparación paso a paso en Windows/PowerShell y Linux/Bash.
> **Nada de esto existe ni se ha ejecutado:** scripts, archivos y comandos son los previstos.

---

## 1. Requisitos del equipo (decidido)

Node.js 24 LTS (≥ 24.12), npm 11, Git, Docker Desktop (o Docker Engine + Compose). Versiones exactas en [02 §5](02-arquitectura-y-decisiones.md).

## 2. Preparación reproducible

⏳ Por desarrollar con comandos para PowerShell y Bash. Secuencia decidida:

1. Clonar e instalar con `npm ci`.
2. Copiar `.env.example` a `.env` y generar secretos.
3. `npm run db:up` (PostgreSQL 18 y Mailpit con Docker Compose).
4. `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`.
5. `npm run dev` y abrir `http://localhost:3000`; correo en `http://localhost:8025`.

Servicios locales de `docker-compose.yml`:

| Servicio | Imagen | Puertos | Notas |
|---|---|---|---|
| `db` | `postgres:18` | 5432 | Volumen con nombre; `prisma/sql/00-roles.sql` crea los roles `tc_migrator` y `tc_app` y las bases `turismo_dev`, `turismo_test`, `turismo_e2e`, `turismo_perf`. |
| `mail` | `axllent/mailpit:v1.33` | 1025 (SMTP), 8025 (interfaz y API) | Bandeja de pruebas. |

## 3. Variables de entorno (decididas; ⏳ `.env.example` comentado)

Todas son de **servidor**. No hay variables `NEXT_PUBLIC_*`.

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

## 4. Scripts previstos (no existen todavía)

| Script | Hace |
|---|---|
| `dev` | `tsx server.ts` |
| `build` | `prisma generate`, `next build` y empaquetado del servidor |
| `start` | `node dist/server.mjs` |
| `lint`, `typecheck` | ESLint y `tsc --noEmit` |
| `test`, `test:unit`, `test:integration`, `test:concurrency`, `test:e2e`, `test:a11y` | Vitest y Playwright |
| `db:up`, `db:down` | Docker Compose |
| `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:seed`, `db:reset` | Prisma; `db:reset` solo en local y protegido |
| `db:test:prepare` | Migra las bases de pruebas |
| `perf:seed`, `perf:catalog` | Medición de rendimiento |
| `tickets:rotate-key`, `tickets:reissue` | Mantenimiento del llavero |
| `data:purge` | Purga y minimización |

## 5. Separación de bases y protección (decidido; ⏳ copias y restauración)

- Bases distintas por uso: desarrollo, pruebas de Vitest, pruebas de Playwright y rendimiento.
- Las utilidades que truncan o reinician exigen `APP_ENV` distinto de `production` **y** un nombre de base terminado en `_test`, `_e2e` o `_perf`. `db:reset` exige además que el anfitrión sea local.
- El rol de la aplicación no puede ejecutar DDL.

⏳ Falta: copias con `pg_dump`, comprobación de restauración (T-OPS-05) y política de retención.

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

### 6.4 Alternativa

Servidor virtual con Docker Compose (aplicación + PostgreSQL) y un proxy inverso con HTTPS automático. Más control, más operación. ⏳ Por detallar.

## 7. Registros y diagnóstico

Decidido en [02 §10.3](02-arquitectura-y-decisiones.md): JSON por línea, id de petición, redacción de datos sensibles, ruta sin cadena de consulta. ⏳ Falta: guía de diagnóstico por síntoma.

## 8. *Runbooks* (lista decidida; ⏳ contenido)

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

## 9. Escalado futuro

Decidido en [02 §13](02-arquitectura-y-decisiones.md).
