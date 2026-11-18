# 08 — Pruebas y evidencias

> **ESTADO: COMPLETO COMO PLANIFICACIÓN — §6 (CI) redactado el 2026-11-16; sin pruebas ejecutadas.** (Texto de abajo: historial del avance.)
> Contiene la estrategia, la técnica de concurrencia y el **catálogo completo de identificadores de prueba** (los citan los documentos 01 y 10). **§3.1 Cuentas (`T-CTA-01` a `T-CTA-20`), §3.2 Ofertas (`T-OFE-01` a `T-OFE-24`), §3.3 Reservas (`T-RES-01` a `T-RES-19`), §3.4 Pagos (`T-PAG-01` a `T-PAG-26`), §3.5 Entradas (`T-ENT-01` a `T-ENT-15`, más los subcasos 06a a 06e) §3.6 Chat (`T-CHAT-01` a `T-CHAT-16`) y §3.7 Transversales (`T-SEG`, `T-DB`, `T-OPS`, `T-A11Y`, `T-PERF`, `T-E2E`) ya tienen preparación, acción y resultado esperado** (§3.1.1–§3.1.2, §3.2.1–§3.2.2, §3.3.1–§3.3.2 y §3.4.1–§3.4.3, §3.5.1–§3.5.3, §3.6.1–§3.6.3 y §3.7.1–§3.7.5). **§6 Avance de fase y CI** (§6.1 grupos y condiciones de fusión, §6.2 base exclusiva de pruebas, §6.3 pasarela `fake` y T-PAG-24 manual pendiente, §6.4 evidencias por materia) está redactado.
> **Siguiente paso exacto:** pasar a 09 (§2 preparación por sistema operativo y `.env.example`, §5 copias, §8 *runbooks*). Pendiente en 08: §7, formato del informe de rendimiento.
> **Ninguna prueba ha sido escrita ni ejecutada. No existen resultados.**

---

## 1. Estrategia (definitiva)

| Nivel | Sigla | Herramienta | Qué cubre | Por qué |
|---|---|---|---|---|
| Unidad | U | Vitest | Funciones puras: dinero, fechas y edad, normalización, hash canónico, máquinas de estado, clasificación de instantáneas de pago, esquemas Zod. | Rápidas; fijan reglas con muchos casos límite. |
| Integración | I | Vitest + PostgreSQL real (`turismo_test`) | Servicios de aplicación completos: autorización, transacciones, restricciones, auditoría. | Las garantías viven en la base; un sustituto no las demuestra. |
| Concurrencia | C | Vitest + varias conexiones | Último cupo, doble envío, doble QR, doble consumo de token, confirmación duplicada. | Demostrar los invariantes críticos. |
| Contrato | K | Vitest con respuestas grabadas | Adaptador PayPal: traducción de respuestas y errores. | Verificar el adaptador sin red. |
| Extremo a extremo | E | Playwright sobre el *build* de producción (`turismo_e2e`, adaptador `fake`) | Recorridos de navegador, cabeceras, cookies, WebSocket real. | Lo que solo se ve con navegador y servidor reales. |
| Manual | M | Lista de comprobación | PayPal Sandbox real, cámara, lector de pantalla, despliegue. | No automatizable de forma fiable. |

Reglas: los servicios reciben el principal y el reloj como argumentos, por lo que se prueban sin HTTP. No se prueban detalles de implementación ni se repite el código en la prueba: cada prueba afirma una regla observable. Los adaptadores HTTP son delgados y se cubren en E.

## 2. Simultaneidad reproducible sin esperas arbitrarias (definitivo)

**Barrera por bloqueo de fila.** La prueba abre una conexión de control y toma el mismo bloqueo que el flujo necesita (`SELECT … FOR UPDATE` de la fila `Offer`, `Ticket` o `PasswordResetToken`) dentro de una transacción abierta. Lanza N llamadas al servicio: todas quedan esperando. La prueba **espera a la condición** «N sesiones bloqueadas» consultando `pg_stat_activity`/`pg_locks` (condición observable, no un tiempo fijo). Después confirma la transacción de control y las N compiten de verdad. Se comprueban el número de éxitos, los códigos de error de las demás y el estado final de la base.

| Caso | Fila usada como barrera | Aserción final |
|---|---|---|
| Último cupo (T-RES-09) | `Offer` | Éxitos = cupos disponibles; resto `INSUFFICIENT_CAPACITY`; comprometido ≤ capacidad. |
| Doble envío (T-RES-08a, 08b) | `Offer` (la llamada que llega primero espera aquí; la otra, en el bloqueo asesor del comprador) | Una sola fila `Reservation`; ambas devuelven la misma reserva (08a) o una recibe `IDEMPOTENCY_KEY_REUSED` (08b). |
| Límite entre ofertas (T-RES-15a, 15b, 15c) | Bloqueo asesor del comprador (`pg_advisory_lock` de sesión) | 3 vigentes como máximo; el bloqueo no afecta a otros compradores. |
| Hora tras la espera (T-RES-10a, 10b, T-PAG-13a, 15a, 15b) | `Offer`; el reloj falso avanza mientras esperan | La decisión usa la hora posterior a la espera. |
| Webhook repetido y evento con reserva confirmada (T-PAG-07a, 07d) | `Offer` | Una `CONFIRMED` y una `DUPLICATE_EVENT`; un solo `PaymentEvent`; ambas entregas responden 200. |
| Recuperación de unicidad (T-RES-08c, T-PAG-07c) | Fila de control sin confirmar en el índice único | Resultado de dominio, no `INTERNAL_ERROR`; sin conexión abortada en el *pool*. |
| Orden de llamadas a la pasarela (T-PAG-01b, 02b, 03a–c, 06c2, 06d, 06d′, 06e, 12g, 18d, 18g, 20e, 20g, 20j, 23c) | **Compuerta del adaptador `fake`** (retiene cada llamada hasta que la prueba la libera; condición observable `fake.waitInFlight(n)`), combinada con un bloqueo de fila de `ctrl` y `lockTimeoutMs` reducido cuando se prueba `BUSY_TRY_AGAIN` | Una sola orden o captura efectiva; un cierre de un intento antiguo no pisa al nuevo (por clave); nunca un bloqueo indefinido; una respuesta antigua no revierte un estado nuevo. |
| Captura y webhook (T-PAG-06) | `Offer` | Una confirmación; N entradas, no 2N. |
| Doble QR (T-ENT-07) | `Ticket` | Un ingreso; el otro `TICKET_ALREADY_USED`; las demás entradas siguen `VALID`. |
| Token de recuperación (T-CTA-13) | **`User`** (`FOR UPDATE`; corregido el 2026-11-14 para seguir 04 TX-13, que serializa por `User` antes de `PasswordResetToken`) | Un cambio de contraseña; el otro `TOKEN_INVALID`. |
| Decisiones de revisión (T-OFE-10) | `Offer` | Una decisión aplicada; la otra `INVALID_STATE`. |
| Dos ediciones o dos envíos con el mismo `rev` (T-OFE-04c, 05d) | **Fila `OfferVersion`** (`barrera.version`): ambas llegan al `UPDATE` condicionado | Una sube `rev`; la otra `STALE_VERSION` o `INVALID_STATE`. |
| Edición o envío frente a archivo, eliminación o descarte (T-OFE-16b, 16b′, 05e, 05f, 14c) | `Offer` exclusivo o **compartido** (`barrera.offerCompartida`: `FOR KEY SHARE`) | La que llega después ve el estado confirmado por la otra: `OFFER_ARCHIVED` o `NOT_FOUND`; nunca una escritura sobre una oferta ya archivada o una versión ya borrada. |
| Aprobación frente a archivo, eliminación, descarte o reserva (T-OFE-16c, 16d, 14d, 14e, T-RES-17, 18) | `Offer` exclusivo | Aserciones válidas **en ambos órdenes**: sin estado mixto; comprometido ≤ capacidad pública; ninguna reserva posterior a la suspensión o el archivo. |
| Fecha fija frente a una reserva insertada durante la espera (T-OFE-22c) | `Offer` exclusivo con una reserva insertada por `ctrl` en su transacción | La aprobación ve la reserva y devuelve `SCHEDULE_LOCKED`. |
| Reserva frente a reducción de capacidad (T-RES-17) | `Offer` | Nunca comprometido > capacidad pública. |

El vencimiento se prueba con reloj falso, nunca esperando 15 minutos. Los casos de **hora tras la espera** (D-69) avanzan el reloj falso **mientras las llamadas esperan el bloqueo** y comprueban que decidieron con la hora posterior a la espera. La **recuperación de unicidad** se provoca con una fila de control insertada y **sin confirmar** por la conexión de control: el servicio se bloquea en el índice único y, al confirmar la de control, recibe `23505`. Los subcasos de TX-05 y TX-09 (letras `a`, `b`, `c` de los identificadores de abajo) están especificados con preparación, pasos y aserciones en [04 §3](04-reglas-transacciones-y-concurrencia.md).

---

## 3. Catálogo de pruebas (identificadores definitivos; §3.1 a §3.7 desarrollados con preparación, acción y resultado esperado; ninguna ejecutada)

### 3.1 Cuentas — `T-CTA`

| ID | Qué demuestra | Nivel | Requisitos |
|---|---|---|---|
| T-CTA-01 | Registro válido crea usuario con `TOURIST` y hash Argon2id. | I | RF-01, RS-01 |
| T-CTA-02 | Registro inválido da errores por campo; correo duplicado con otra capitalización o espacios se rechaza. | I | RF-01, RS-05 |
| T-CTA-03 | El registro ignora o rechaza campos de rol o pertenencia. | I | RF-01 |
| T-CTA-04 | Ingreso correcto: cookie con atributos correctos y solo el hash en base. | I, E | RF-02, RS-02 |
| T-CTA-05 | Ingreso fallido: mismo mensaje para contraseña incorrecta y correo inexistente; se ejecuta la verificación ficticia. | I | RF-02 |
| T-CTA-06 | Límite por cuenta: bloqueo tras el umbral y liberación al avanzar el reloj. | I | RS-03 |
| T-CTA-07 | Límite por IP. | I | RS-03 |
| T-CTA-08 | Cerrar sesión revoca: la cookie anterior deja de servir. | I, E | RF-03 |
| T-CTA-09 | La sesión expira a las 8 horas. | I | RS-02 |
| T-CTA-10 | Recuperación: respuesta idéntica exista o no el correo; solo se envía al existente. | I | RF-04, RS-04 |
| T-CTA-11 | Token vencido (más de 30 minutos) rechazado. | I | RS-04 |
| T-CTA-12 | Token ya usado rechazado. | I | RS-04 |
| T-CTA-13 | Dos consumos simultáneos del token producen un solo cambio. | C | RS-04 |
| T-CTA-14 | Restablecer revoca todas las sesiones anteriores. | I | RS-04 |
| T-CTA-15 | Cada ingreso emite un token nuevo; una cookie previa no se reutiliza. | I | RS-02 |
| T-CTA-16 | El panel redirige sin sesión; `next` solo admite rutas internas permitidas para la sesión y un destino externo se descarta aunque parezca interno (subcasos 16a a 16d). | E | RF-05 |
| T-CTA-17 | Límite de solicitudes de recuperación. | I | RS-03 |
| T-CTA-18 | Registro → ingreso → panel → salida; recuperación completa leyendo el correo en Mailpit. | E | RF-01 a 05, RO-08 |
| T-CTA-19 | Un turista no accede a pantallas ni acciones de otros roles. | I, E | RF-05, RS-07 |
| T-CTA-20 | La semilla crea cuentas de los cuatro roles con sus alcances. | I | RF-06 |

#### 3.1.1 Datos y pasos comunes de `T-CTA` (redactado el 2026-11-14)

**Estado: ninguna de estas pruebas está escrita ni ejecutada.** Los umbrales son los **propuestos** de [06 §3.2](06-seguridad-y-privacidad.md) (ingreso: 5 fallos por cuenta y 20 por IP en 15 min, con bloqueo de 15 min; recuperación: 3 por cuenta y 10 por IP por hora; registro: 10 por IP por hora). Si el equipo los cambia, cambian las constantes del dominio y las cifras de abajo. Contratos usados: 05 §3.2, 04 TX-13 y TX-14, 03 (`User`, `Session`, `PasswordResetToken`, `LoginThrottle`, §3.4.2 auditoría, §9.3 semilla), 06 §3.1–§3.2.

| Dato o paso | Contenido |
|---|---|
| **CTA-D1 Entorno** | Base `turismo_test` con migraciones desde cero y rol `tc_app`. Los servicios reciben principal, reloj falso (instante fijo `T0`) y contexto de petición (IP) como argumentos (§1). `APP_ORIGIN` y `RATE_LIMIT_SECRET` de prueba. Buzón de correo **en memoria** (adaptador SMTP de prueba); solo `T-CTA-18` usa Mailpit. |
| **CTA-D2 Cuentas** | Semilla base de 03 §9.3 con un `SEED_DEMO_PASSWORD` de prueba: se usan `turista.ana`, `turista.luis`, `operador.laguna`, `admin` y `dual`. Las pruebas que registran crean correos propios con sufijo único. |
| **CTA-D3 Constantes** | `PW_OK`, `PW_NEW`, `PW_A`, `PW_B`, `PW_BAD`: de 10 o más caracteres y fuera de la lista de comunes. IP de documentación `203.0.113.n`. Correo inexistente `nadie@demo.test`. |
| **CTA-D4 Limpieza** | Entre pruebas se vacían `Session`, `PasswordResetToken`, `LoginThrottle` y `AuditEvent` con la utilidad de limpieza de T-OPS-04 (solo en bases de pruebas), para que ningún contador se arrastre. |
| **PC-1 Ingresar** | Llamar al servicio de `loginAction` con `turista.ana` y `PW_OK`; guardar la cookie y su hash SHA-256. |
| **PC-2 Recuperar** | Llamar a `requestPasswordResetAction`; leer el enlace del buzón y extraer el token del enlace. |
| **PC-3 Lecturas** | Consulta directa (SELECT) de `User`, `Session`, `PasswordResetToken`, `LoginThrottle` y `AuditEvent`. |
| **PC-4 Sin secretos** | Buscar los centinelas (contraseñas, token de sesión, token de recuperación, correo) en todas las columnas de texto de `AuditEvent` y en el registro de la aplicación; esperado: **cero coincidencias** (método de T-SEG-05). |
| **PC-5 Auditoría** | Cada prueba lista las filas `AuditEvent` esperadas (acción, `result`, `reasonCode`, de 03 §3.4.2). Salvo que se diga otra cosa, `metadata` no contiene correo, contraseña ni token. |

#### 3.1.2 Desarrollo por prueba

**T-CTA-01 — Registro válido.**
- *Preparación:* CTA-D1; Argon2 con los **parámetros reales** (19 456 KiB, 2 pasadas, 1 hilo).
- *Acción:* `registerAction` con `displayName` 2–80, correo válido en minúsculas, `PW_OK` y `passwordConfirm` igual; después, una segunda cuenta con la **misma** contraseña.
- *Esperado:* éxito con `{ userId }` y **sin sesión ni cookie** (no inicia sesión). Fila `User` con el correo normalizado y `passwordHash` que empieza por `$argon2id$` con parámetros ≥ los mínimos, distinto de `PW_OK` y sin contenerla; **los dos hashes difieren** (sal distinta). Exactamente una `RoleAssignment` `TOURIST` con `gadId` y `attractionId` nulos. `AuditEvent` `account.register` `SUCCESS` con el usuario nuevo como actor. PC-4.

**T-CTA-02 — Registro inválido y correo duplicado.**
- *Preparación:* CTA-D1 y CTA-D2 (`turista.ana@demo.test` ya existe).
- *Acción:* **02a** campos inválidos, uno por llamada: nombre de 1 y de 81 caracteres; correo sin `@`, de más de 254 caracteres; contraseña de 9 y de 129 caracteres, igual al correo y de la lista de comunes; `passwordConfirm` distinto. **02b** registrar `TURISTA.ANA@DEMO.TEST`, ` turista.ana@demo.test ` (espacios) y la variante de ancho completo que NFKC normaliza al mismo correo. **02c** (cubre la fila de registro de 06 §3.2, que no tiene ID propio) 11 registros válidos desde la misma IP en una hora.
- *Esperado:* 02a `VALIDATION_ERROR` (422) con `fieldErrors` en el campo que corresponde y **ningún** `User` nuevo. 02b `EMAIL_TAKEN` (409) en las tres; el número de `User` no cambia; `account.register` `CONFLICT`/`EMAIL_TAKEN`. 02c: los 10 primeros pasan y el 11.º da `RATE_LIMITED` con `details.retryAfterSeconds`; con el reloj +1 h vuelve a pasar.

**T-CTA-03 — Campos de rol o pertenencia ignorados.**
- *Preparación:* CTA-D1.
- *Acción:* `registerAction` válida con campos añadidos: `role: 'ADMIN'`, `roles: ['GAD']`, `gadId`, `attractionId`, `userId`, `id`, `passwordHash`, `emailVerified: true`.
- *Esperado:* el esquema los **descarta** (`strip`, 05 §3.1): éxito; el `User.id` generado no es el enviado; `passwordHash` corresponde a la contraseña, no al campo; **una sola** `RoleAssignment` (`TOURIST`, alcance nulo). Si el equipo cambia a «rechazar», el esperado pasa a `VALIDATION_ERROR` sin usuario creado.

**T-CTA-04 — Ingreso correcto.** Nivel I y E.
- *Preparación:* CTA-D1/D2. Para E, build de producción local con `fake` (cookie `tc_session`, sin `Secure`).
- *Acción:* I: PC-1, y leer `Session`. E: ingresar desde `/ingreso` y leer `Set-Cookie` y `document.cookie`.
- *Esperado:* I: una fila `Session` con `tokenHash` = SHA-256 hexadecimal del token (cumple `^[0-9a-f]{64}$`); **el token en claro no aparece en ninguna columna de la base** (PC-4 sobre `Session`); `expiresAt = createdAt + 8 h`; `revokedAt` nulo; `session.login` `SUCCESS`. E: la cookie es `HttpOnly`, `SameSite=Lax`, `Path=/`, `Expires` = `expiresAt`, sin `Domain`; `document.cookie` **no** la expone; la respuesta no contiene el token. Los atributos de despliegue (`__Host-`, `Secure`) los prueba **T-SEG-12**.

**T-CTA-05 — Ingreso fallido uniforme.**
- *Preparación:* CTA-D1/D2; espía sobre la verificación Argon2.
- *Acción:* ingresar con `turista.ana` y `PW_BAD`, y con `nadie@demo.test` y `PW_OK`.
- *Esperado:* ambas devuelven `INVALID_CREDENTIALS` (401) con **el mismo** `ActionResult` (código, mensaje y forma); la verificación Argon2 se invoca **una vez en cada caso** (contra un hash ficticio de mismos parámetros cuando el correo no existe); ninguna `Session` nueva; dos `session.login` `DENIED`/`INVALID_CREDENTIALS` sin el correo en ninguna columna (PC-4); ambos intentos cuentan en `LoginThrottle`. No se mide tiempo absoluto (frágil); la indistinguibilidad general es **T-SEG-13**.

**T-CTA-06 — Límite por cuenta.**
- *Preparación:* CTA-D1/D2, reloj en `T0`.
- *Acción:* 5 ingresos fallidos a `turista.ana`, cada uno desde una IP distinta (para no activar el límite por IP); un 6.º con **`PW_OK`**. Repetir con `nadie@demo.test`. Avanzar el reloj a `blockedUntil − 1 s` y a `blockedUntil`. Aparte: 4 fallos, reloj +16 min, 1 fallo.
- *Esperado:* el 6.º da `RATE_LIMITED` **aunque la contraseña sea correcta**, con `retryAfterSeconds` entre 1 y 900 y el **mismo texto** para la cuenta inexistente. La fila `LoginThrottle` tiene `keyHash` de 64 hexadecimales (no el correo) y `blockedUntil = T0 + 15 min`. En `blockedUntil − 1 s` sigue bloqueado; en `blockedUntil` el ingreso correcto funciona y el contador se reinicia. Con la ventana vencida el contador queda en 1. *Qué responde exactamente el 5.º fallo se fija en P1-04; la prueba solo exige que el 6.º esté bloqueado.*

**T-CTA-07 — Límite por IP.**
- *Preparación:* CTA-D1/D2, IP `203.0.113.7`.
- *Acción:* 20 ingresos fallidos desde esa IP con **correos distintos** (para no activar el límite por cuenta); un 21.º con credenciales correctas de otra cuenta; el mismo ingreso correcto desde `203.0.113.8`; reloj +15 min.
- *Esperado:* el 21.º da `RATE_LIMITED`; desde `203.0.113.8` el ingreso funciona; tras 15 min se libera. En `LoginThrottle` y `AuditEvent.ipHash` aparece solo el HMAC (la IP en claro no figura). Un bloqueo por cuenta no bloquea a la IP y viceversa (A-02).

**T-CTA-08 — Salir revoca.** Nivel I y E. Contrato: 04 TX-14 (Salida).
- *Preparación:* CTA-D1/D2; PC-1 (cookie `C`).
- *Acción:* I: `logoutAction` con `C`; resolver el principal con `C`; segunda salida con `C`. E: ingresar, copiar la cookie, salir con «Salir» (`POST`), reponer la cookie en otro contexto y abrir `/panel`.
- *Esperado:* `Session.revokedAt` fijado y `revokeReason = 'LOGOUT'`; resolver con `C` da no autenticado; la segunda salida devuelve el mismo resultado `{}` sin cambiar la fila; la cookie se borra en la respuesta; `session.logout` `SUCCESS`. E: `/panel` redirige a `/ingreso`. El cierre del WebSocket se prueba en **T-CHAT-11**.

**T-CTA-09 — Expiración a las 8 horas.**
- *Preparación:* CTA-D1/D2; ingreso en `T0`.
- *Acción:* resolver el principal en `T0 + 7 h` (usándola) y luego en `T0 + 8 h − 1 s`, `T0 + 8 h` y `T0 + 8 h + 1 s`.
- *Esperado:* válida hasta `T0 + 8 h − 1 s`; **no válida** desde `T0 + 8 h` (`expiresAt > now`); usarla a las 7 h **no** extiende `expiresAt` (sin renovación deslizante, D-15). El cierre del socket por expiración es **T-CHAT-12**.

**T-CTA-10 — Recuperación uniforme.**
- *Preparación:* CTA-D1/D2; buzón vacío.
- *Acción:* **10a** `requestPasswordResetAction` con `turista.ana@demo.test` y con `nadie@demo.test`. **10b** (cierra A-08; única excepción de nivel, E) la misma solicitud por HTTP con cabecera `Host: evil.test`. **10c** dos solicitudes seguidas para la misma cuenta.
- *Esperado:* 10a ambas devuelven `{ accepted: true }` y el mismo texto; **un solo** correo, dirigido a `turista.ana`; el enlace empieza por `APP_ORIGIN` + `/restablecer?token=`; `PasswordResetToken`: una fila con `tokenHash` = SHA-256 del token del correo y `expiresAt = T0 + 30 min`; el token en claro no está en la base (PC-4); `password.reset_request` `SUCCESS` en ambas (con `reasonCode` interno `NO_ACCOUNT` para la inexistente). 10b el enlace **sigue** usando `APP_ORIGIN`. 10c queda **una** fila (`userId` único, H-28) con `tokenHash` nuevo; el primer enlace da `TOKEN_INVALID`.

**T-CTA-11 — Token vencido.** Contrato: 04 TX-13 (paso 2).
- *Preparación:* CTA-D1/D2; PC-2 en `T0`.
- *Acción:* `resetPasswordAction` con `PW_NEW` en `T0 + 30 min + 1 s`; aparte, con un token nuevo, en `T0 + 30 min` exactos y en `T0 + 30 min − 1 s`.
- *Esperado:* las dos primeras dan `TOKEN_INVALID` (400, mensaje único) y no cambian nada: la contraseña antigua sigue sirviendo, `usedAt` sigue nulo, las sesiones no se revocan, `password.reset` `DENIED`/`TOKEN_INVALID`. En `T0 + 30 min − 1 s` funciona.

**T-CTA-12 — Token usado o desconocido.**
- *Preparación:* CTA-D1/D2; PC-2.
- *Acción:* `resetPasswordAction` con `PW_A` (éxito); de nuevo con el mismo token y `PW_B`; con un token aleatorio de formato válido; con el token vencido de T-CTA-11.
- *Esperado:* el segundo intento da `TOKEN_INVALID` y la contraseña sigue siendo `PW_A`; `usedAt` no cambia; las tres respuestas de rechazo son **idénticas** (inexistente, usado y vencido no se distinguen). Auditoría: un `SUCCESS` y los `DENIED`.

**T-CTA-13 — Dos consumos simultáneos.** Nivel C. Contrato: 04 TX-13 y §2 de este documento.
- *Preparación:* CTA-D1/D2; PC-2; conexión de control `ctrl` con **`SELECT … FOR UPDATE` de la fila `User`** (04 TX-13 serializa por `User`); dos llamadas con `PW_A` y `PW_B` y el mismo token.
- *Acción:* lanzar ambas; esperar a la condición «2 sesiones bloqueadas» en `pg_locks`; confirmar `ctrl`.
- *Esperado:* exactamente **un** éxito y un `TOKEN_INVALID`; la contraseña verificada es la de la llamada ganadora y no la otra; `usedAt` fijado una vez; `password.reset` con un `SUCCESS` y un `DENIED`; **un** correo de aviso.
- **13b** (subcaso de 04 TX-13, *carrera con un ingreso*): con la misma barrera, lanzar un ingreso con la clave antigua y `resetPasswordAction`; confirmar `ctrl`. Esperado, **en ambos órdenes**: al terminar no existe ninguna `Session` de la cuenta con `revokedAt` nulo creada con la clave antigua.

**T-CTA-14 — Restablecer revoca todas las sesiones.**
- *Preparación:* CTA-D1/D2; tres ingresos de `turista.ana` (tres cookies) y uno de `turista.luis`.
- *Acción:* PC-2 y `resetPasswordAction` con `PW_NEW`.
- *Esperado:* las tres sesiones de `turista.ana` quedan con `revokedAt` y `revokeReason = 'PASSWORD_RESET'`; **la de `turista.luis` no cambia**; las cookies antiguas no autentican; la contraseña antigua da `INVALID_CREDENTIALS` y `PW_NEW` ingresa; el restablecimiento **no** crea sesión ni cookie; `metadata.sessionsRevoked = 3`; se captura el correo de aviso (06 §3.1). El cierre de sockets es **T-CHAT-11**.

**T-CTA-15 — Cada ingreso emite un token nuevo (sin fijación).**
- *Preparación:* CTA-D1/D2; cookie previa `C0` válida de `turista.luis`.
- *Acción:* dos ingresos de `turista.ana`; un ingreso de `turista.ana` presentando `C0`.
- *Esperado:* los tokens y las filas `Session` son distintos; la cookie emitida al presentar `C0` es **distinta de `C0`**; la nueva sesión pertenece a `turista.ana` y la de `turista.luis` no se modifica.

**T-CTA-16 — Panel sin sesión y `next` interno y permitido.** Nivel E (la regla de 05 §2 también se puede afirmar en I sobre `safeNext`, con la misma tabla de casos). Complemento: T-SEG-10.
- *Preparación:* build de producción local con `fake`; sin cookie; `turista.ana` y `operador.laguna`.
- **16a — Sin sesión.** *Acción:* abrir `/panel`, `/panel/reservas` y `/panel/chat`. *Esperado:* cada una redirige a `/ingreso?next=<ruta codificada>`.
- **16b — `next` interno permitido y destinos externos evidentes.** *Acción:* ingresar con `next=/panel/reservas` y, en otros ingresos, con `next` = `//evil.test`, `https://evil.test/`, `javascript:alert(1)` y vacío. *Esperado:* con `/panel/reservas` vuelve a esa ruta; con cualquiera de los demás, el destino final es **`/panel`** y nunca otro origen (se comprueba `Location` y la URL final del navegador).
- **16c — Destino externo que parece interno** (caso añadido el 2026-11-14). *Acción:* ingresar, en ingresos separados, con `next` = `/\evil.test`, `/\\evil.test`, `/<TAB>/evil.test`, `/<LF>/evil.test`, `/<CR>/evil.test` (el analizador de URL elimina tabulaciones y saltos de línea y lo convierte en `//evil.test`) y `///evil.test`. *Esperado:* **todos** se descartan y el destino final es `/panel` en el mismo origen; la página final no es de `evil.test` aunque el navegador la resuelva. Se afirma además, sobre `safeNext`, que **ninguno** de estos valores produce un `origin` distinto de `APP_ORIGIN` (comprobación 4 de 05 §2, independiente de las anteriores), de modo que la prueba sigue siendo válida si alguna de las otras reglas se debilita.
- **16d — Ruta interna no permitida para la sesión.** *Acción:* con `turista.ana`, `next=/panel/admin/revision-pagos` y `next=/panel/ingresos`; con `operador.laguna`, `next=/panel/ingresos`; con cualquiera, `next=/restablecer`, `next=/pasarela-simulada/x` y `next=/api/salud`. *Esperado:* `turista.ana` termina en `/panel` en los dos primeros; `operador.laguna` llega a `/panel/ingresos`; los otros tres van a `/panel`. Sin mensaje de error y sin fila de auditoría por el descarte.

**T-CTA-17 — Límite de solicitudes de recuperación.**
- *Preparación:* CTA-D1/D2; buzón vacío; reloj en `T0`.
- *Acción:* **17a** 5 solicitudes para `turista.ana` en una hora (IP distintas), y 5 para `nadie@demo.test`. **17b** 11 solicitudes desde `203.0.113.7` con correos distintos; el reloj +1 h.
- *Esperado:* 17a todas las respuestas son `{ accepted: true }` e idénticas (el límite por cuenta **no se ve desde fuera**, 05 §3.2); se envían **3** correos a `turista.ana` y ninguno más; solo el enlace del tercero sirve (H-28). 17b la 11.ª da `RATE_LIMITED` visible con `retryAfterSeconds`; otra IP no se ve afectada; con el reloj +1 h vuelve a aceptar.

**T-CTA-18 — Recorrido completo.** Nivel E.
- *Preparación:* Playwright sobre el build de producción (`turismo_e2e`, `fake`); Mailpit local; correo único.
- *Acción:* `/registro` → `/ingreso` → `/panel` → «Salir»; luego `/recuperar` → leer el correo por la API HTTP de Mailpit → abrir el enlace → `/restablecer` → ingresar con la contraseña nueva; reabrir el enlace.
- *Esperado:* tras registrar hay aviso y el `/panel` solo muestra las secciones del turista; tras salir `/panel` redirige a `/ingreso`; el mensaje de `/recuperar` es el uniforme; Mailpit recibe **dos** correos (restablecimiento y aviso); el enlace empieza por `APP_ORIGIN`; el ingreso con la contraseña nueva funciona y el enlace reutilizado da `TOKEN_INVALID`; sin errores de CSP en consola (T-SEG-02). Las trazas de Playwright se generan solo al fallar y contienen únicamente datos ficticios.

**T-CTA-19 — Turista sin acceso a otros roles.** Nivel I y E. La matriz completa de las 23 acciones es **T-SEG-04**; aquí solo el contraste del turista.
- *Preparación:* CTA-D1/D2; ejemplos válidos de entrada para cada acción de otro rol; recuentos de tablas de negocio.
- *Acción:* I: con `turista.ana`, invocar `createOfferAction`, `updateWorkingVersionAction`, `startNewVersionAction`, `submitVersionAction`, `discardWorkingVersionAction`, `deleteOfferAction`, `approveVersionAction`, `requestChangesAction`, `suspendOfferAction`, `resumeOfferAction`, `archiveOfferAction`, `checkGatewayAction`, `lookupTicketAction` y `checkInTicketAction`. E: abrir `/panel/ofertas`, `/panel/revisiones`, `/panel/actividades`, `/panel/ingresos`, `/panel/admin/ofertas`, `/panel/admin/revision-pagos` y `/panel/admin/auditoria`. Control positivo: `operador.laguna` abre `/panel/ingresos`.
- *Esperado:* I: `FORBIDDEN` en todas (el rol se comprueba antes que el alcance, OFF.1) y **ningún cambio** en los recuentos. E: cada ruta responde 404 o 403 con enlace al panel (07 §6.1; la elección única por ruta se fija en P1-02) **sin datos de la pantalla**; la navegación del `/panel` no muestra esas secciones. El control positivo accede, para evitar un verde falso.

**T-CTA-20 — Semilla de cuentas.**
- *Preparación:* base vacía con migraciones; semilla con `tc_migrator` y `SEED_DEMO_PASSWORD` de prueba; instante base fijo.
- *Acción:* ejecutar la semilla dos veces; ingresar con cada cuenta.
- *Esperado:* 8 cuentas `@demo.test` y 9 `RoleAssignment`: `admin` `ADMIN`; `gad.sanisidro` y `gad.colibries` `GAD` de su GAD; `operador.laguna` y `operador.cascada` `OPERATOR` de su atracción; `dual` `GAD` del GAD 1 **y** `OPERATOR` de la atracción 1; `turista.ana` y `turista.luis` `TOURIST`; 2 GAD y 2 atracciones con las relaciones de 03 §9.3. Los ocho ingresan con `SEED_DEMO_PASSWORD` y sus hashes son Argon2id. La segunda ejecución no cambia recuentos, ids ni `updatedAt`; **no se escribe `AuditEvent`**.

**Pendiente de esta área:** ninguna prueba de `T-CTA` está ejecutada. Queda por decidir en otro documento la respuesta exacta del 5.º fallo (P1-04). La regla de `next` se corrigió en 05 §2 el 2026-11-14 y T-CTA-16 la comprueba (16a a 16d).

### 3.2 Ofertas — `T-OFE`

| ID | Qué demuestra | Nivel | Requisitos |
|---|---|---|---|
| T-OFE-01 | Alta válida crea oferta `UNPUBLISHED` y versión 1 `DRAFT` en una transacción, con su auditoría; inválida da errores por campo (también la longitud en puntos de código); el doble envío crea dos borradores (subcasos 01a, 01b, 01c). | I | RF-07, RF-14 |
| T-OFE-02 | Listado del GAD: 10 por página, orden estable y filtro por provincia. | I | RF-08 |
| T-OFE-03 | Un GAD no ve ni modifica ofertas de otro (404). | I, E | RS-07 |
| T-OFE-04 | Editar con `rev` obsoleto da `STALE_VERSION`; dos ediciones simultáneas con el mismo `rev`: una gana, la otra `STALE_VERSION` (subcasos 04a, 04b, 04c). | I, C | RS-09 |
| T-OFE-05 | Enviar a revisión; una versión `IN_REVIEW` no se edita; envío doble, frente a archivo o descarte, y con el inicio vencido durante la espera del bloqueo (subcasos 05a, 05c a 05g). | I, C | RF-09 |
| T-OFE-06 | Aprobar: `APPROVED`, puntero público y `OPEN` en una sola transacción; una versión nueva no cambia el estado `SUSPENDED` (subcasos 06a, 06b). | I | RF-09 |
| T-OFE-07 | Un operador de otra atracción no puede decidir. | I | RS-07 |
| T-OFE-08 | Autoaprobación prohibida por **identidad** con cuentas de varios roles (la persona con `GAD` y `OPERATOR` no decide su versión pero sí la de otro), servicio y `CHECK` (subcasos 08a a 08d). | I | RS-08 |
| T-OFE-09 | Devolver exige motivo; el autor corrige y reenvía; la decisión previa se conserva hasta la nueva (subcaso 09a); `rev` obsoleto tras reenviar (10c). | I | RF-09 |
| T-OFE-10 | Decisiones simultáneas: una gana; aprobar frente a devolver, en ambos órdenes (subcasos 10a, 10b). | C | RS-09 |
| T-OFE-11 | Una versión aprobada no se puede modificar (servicio y disparador); editar una `IN_REVIEW` o `APPROVED` da `INVALID_STATE` (subcasos 11a, 11b). | I | RF-10 |
| T-OFE-12 | Editar una oferta publicada crea otra versión (copia de la pública); el catálogo conserva la anterior hasta aprobar (subcaso 12a). | I | RF-10 |
| T-OFE-13 | Solo una versión de trabajo por oferta, también con dos aperturas simultáneas (subcaso 13a). | I, C | RF-10 |
| T-OFE-14 | Eliminar oferta inédita es físico (orden de borrado compatible con claves foráneas y disparadores); descartar la versión de trabajo; frente a edición, envío y aprobación simultáneos, en ambos órdenes (subcasos 14a a 14g). | I, C | RF-11 |
| T-OFE-15 | Suspender impide reservas nuevas y conserva retenciones y entradas; reanudar las permite; solo el operador asignado; aprobar sobre `SUSPENDED` no la reanuda (subcasos 15a, 15b, 15c). | I | RF-12 |
| T-OFE-16 | Archivar (GAD o administrador con motivo) bloquea cambios, deja inerte la versión de trabajo, conserva reservas, pagos y entradas y saca la oferta del catálogo; archivo frente a edición, envío, aprobación y reserva simultáneos, en ambos órdenes (subcasos 16a, 16b, 16b′, 16c, 16d). | I, C | RF-12 |
| T-OFE-17 | Catálogo: solo `OPEN` futuras con su versión pública; filtro y paginación. | I, E | RF-13, RF-08 |
| T-OFE-18 | Numeración de versiones única y creciente; descartar no reutiliza número (subcaso 18a). | I | RF-10 |
| T-OFE-19 | Solo el autor edita y envía (otro miembro: `FORBIDDEN`; otro GAD: `NOT_FOUND`); cualquier miembro puede descartar y eliminar (subcasos 19a, 14a, 14b). | I | RS-08 |
| T-OFE-20 | GAD crea → operador aprueba → aparece en la portada y el catálogo. | E | RF-07, RF-13, RF-39 |
| T-OFE-21 | Aprobar rechaza capacidad menor que lo comprometido (confirmadas + retenciones vigentes; las vencidas no cuentan), decidiendo con la hora posterior a la espera del bloqueo (subcasos 21a, 21b). | I, C | RF-23 |
| T-OFE-22 | Aprobar rechaza cambio de fecha si hay reservas **en cualquier estado**, de forma autoritativa bajo el bloqueo; la edición y el envío lo anticipan como cortesía (subcasos 22a, 22b, 22c, 22d). | I, C | RF-23 |
| T-OFE-23 | Atracción inmutable tras publicar (servicio y disparador); editable en una oferta inédita solo dentro del mismo GAD; no se admite atracción de otro GAD (subcasos 23a, 23b). | I | RF-23, RS-07 |
| T-OFE-24 | Fechas: fin posterior a inicio, inicio futuro, duración máxima, conversión desde `America/Guayaquil`. | U, I | RF-14, RA-01 |

#### 3.2.1 Preparación y comprobaciones comunes de `T-OFE` (redactado el 2026-11-14)

**Estado: ninguna de estas pruebas está escrita ni ejecutada.** En 04 ya están especificadas, con preparación, acciones y aserciones, **la mayoría de los subcasos**: TX-01.7 (alta, edición, apertura; 01, 04, 11a, 12a, 13a, 16b, 16b′, 18a, 19a, 22a, 23a, 23b, 14c), TX-02.7 (envío; 05a a 05g, 22b), TX-03.7 (decisión; 03b, 03c, 06, 08, 09a, 10, 11b, 21, 22c, 22d, T-RES-17), TX-04.6 (estados; 15, 16a, 16c, 16d, T-RES-18) y TX-16.7 (eliminar y descartar; 14a, 14b, 14d a 14g). Para esos subcasos la tabla de §3.2.2 **no los repite**: da acción y resultado en una línea y remite a 04. Lo que 08 añade son los casos que 04 no cubre: **02, 03a, 03d, 07, 13b, 17, 20 y 24**, más bordes de 01 y 18.

| Dato o paso | Contenido |
|---|---|
| **OFE-D1 Entorno** | Igual que CTA-D1 (base `turismo_test`, servicios con principal y reloj falso `T0`), con la semilla base de 03 §9.3. Limpieza entre pruebas como CTA-D4 (también `Offer`, `OfferVersion`, `Reservation` y sus dependientes). |
| **OFE-D2 Cuentas** | `gad.sanisidro` (`GAD` del GAD 1), `dual` (`GAD` del GAD 1 y `OPERATOR` de la atracción 1), `gad.colibries` (`GAD` del GAD 2), `operador.laguna` (atracción 1), `operador.cascada` (atracción 2), `admin`, `turista.ana`. Atracción 1 pertenece al GAD 1; atracción 2, al GAD 2. |
| **OFE-D3 Contenido** | `CONTENIDO_OK`: título, descripción y lugar dentro de los rangos de 04 OFF.3, `province` válida, `startsAt = T0 + 7 días` a las 10:00 de Ecuador, `endsAt = startsAt + 4 h`, `priceCents = '25,50'`, `capacity = 10`, sin `minAge`, `conditionsText` no vacío. Las variantes cambian **un** campo. |
| **OFE-D4 Fábrica de estados** | Ayudantes que llevan una oferta a un estado **usando los servicios** (no SQL), salvo donde se diga: inédita con v1 `DRAFT`, `IN_REVIEW` o `CHANGES_REQUESTED`; `OPEN` con público v1; `OPEN` con v2 `DRAFT`, `IN_REVIEW` o `CHANGES_REQUESTED`; `SUSPENDED`; `ARCHIVED`. |
| **OFE-D5 Fábrica de reservas** | `sembrarReserva({ estado, cantidad, expiresAt })` inserta reserva, asistentes y, si es `CONFIRMED`, su pago y sus entradas, **con el rol migrador y en una transacción** (la comprobación diferida de 03 §8.4 exige el conjunto completo). Es un dato de partida de T-OFE: la lógica de reservar se prueba en `T-RES`. |
| **OFE-D6 Barreras** | `ctrl`, `barrera.offer`, `barrera.version`, `barrera.offerCompartida`, `lanzar(...)`, `esperarBloqueadas(n)`, `liberar()` y `reloj.advance(...)`, como en §2 y en 04 §1–§2. |
| **PC-OFE-1 Sin cambios** | Antes y después de un rechazo, las filas `Offer`, `OfferVersion` y `Reservation` afectadas son idénticas, incluidos `rev`, `updatedAt` y `lastVersionNumber`. |
| **PC-OFE-2 Auditoría** | Se cuentan las filas `AuditEvent` por `action` y `result` (03 §3.4.2). El título, la descripción y el motivo **no** aparecen en `AuditEvent` (solo nombres de campo y longitudes; PC-4). |
| **PC-OFE-3 Ambos órdenes** | En las pruebas de concurrencia el orden en que PostgreSQL concede el bloqueo tras `liberar()` **no está prometido** (H-35). Las aserciones valen para **ambos órdenes** y la prueba no depende de cuál ocurra; no se espera a «ver los dos órdenes». |

#### 3.2.2 Acción y resultado por prueba

*Las filas con «→ 04» no se repiten aquí: se ejecutan tal como están en 04 y el resultado es el que 04 fija.*

| ID | Acción | Resultado esperado | Detalle |
|---|---|---|---|
| T-OFE-01 | 01a alta válida; 01b alta inválida; 01c dos altas idénticas. **Añade 08:** bordes y campos extra: título de 5 y de 120 caracteres válidos y de 121 inválido; descripción de 19 inválida y de 20 válida; `conditionsText` vacío; `servicesText` de 2001; `province` fuera de los 24; precios `1,00` y `10000.00` válidos; cuerpo con `status`, `gadId`, `authorId` y `rev`. | Los bordes válidos se aceptan y los inválidos fallan **en su campo**; los campos extra se descartan: la oferta nace `UNPUBLISHED`, `gadId` se deduce de la atracción, `authorId` = el principal y `rev = 1`. | → 04 TX-01.7 (01a a 01c) |
| T-OFE-02 | Preparación: GAD 1 con 25 ofertas de provincias mezcladas, varias con el mismo `createdAt`, y 3 del GAD 2. Listar las páginas 1 a 3 como `gad.sanisidro`, con y sin filtro de provincia; listar como `dual`; `pagina` = 0, −1 y `abc`. | Páginas de 10, 10 y 5 **sin repetir ni omitir** ninguna entre páginas; el mismo orden en dos llamadas seguidas (orden total con desempate por `id`); solo ofertas del GAD 1 (también para `dual`); el filtro devuelve exactamente las de esa provincia, de 10 en 10; `pagina` inválida no da 500. **Por fijar en P2-02:** el criterio de orden, de qué versión sale la provincia (propuesta: la de trabajo si existe, si no la pública) y qué hace una `pagina` inválida o fuera de rango (propuesta: tratar como 1 o devolver vacío). | 08 (sin 04) |
| T-OFE-03 | **03a (I):** con `gad.colibries`, sobre ofertas del GAD 1 inédita `DRAFT`, `IN_REVIEW`, `OPEN` con v2 `DRAFT` y `ARCHIVED`: editar, enviar, abrir versión nueva, descartar, eliminar, archivar y consultar el detalle. **03d (E):** con la sesión de `gad.colibries`, abrir `/panel/ofertas/[id]` y `/editar` de una oferta del GAD 1. | `NOT_FOUND` en todas las acciones, con el **mismo** cuerpo que un `offerId` aleatorio (no se revela la existencia); `PC-OFE-1`; `/panel/ofertas` del GAD 2 no lista las del GAD 1; en E, página 404 con enlace al panel (07 §6.1). *(04 usa `03b` y `03c` en TX-03.7 para archivo y fecha pasada al decidir; aquí se conservan allí y no son de aislamiento.)* | 08; 04 TX-03.7 (03b, 03c) |
| T-OFE-04 | 04a edición válida; 04b `STALE_VERSION`; 04c dos ediciones con el mismo `rev` (barrera `OfferVersion`). | `rev 2` y auditoría con `changedFields`; `STALE_VERSION` con `details.currentRev`; una gana y la otra `STALE_VERSION`. | → 04 TX-01.7 |
| T-OFE-05 | 05a envío válido (y tras devolución); 05c rechazos (fecha pasada, `rev`, incompleta, no autor, archivada, segundo envío); 05d dos envíos (barrera `OfferVersion`); 05e frente a archivo; 05f frente a descarte; 05g inicio vencido durante la espera. | `IN_REVIEW` y no editable; códigos por caso sin cambio de estado; una sola `IN_REVIEW`; `OFFER_ARCHIVED`; sin puntero colgante; `ACTIVITY_NOT_FUTURE` con la hora posterior a la espera. | → 04 TX-02.7 |
| T-OFE-06 | 06a aprobar una inédita; 06b aprobar una versión nueva sobre `OPEN` y sobre `SUSPENDED`. | `APPROVED`, puntero público y `OPEN` en una transacción; la versión anterior queda histórica; `SUSPENDED` no cambia. | → 04 TX-03.7 |
| T-OFE-07 | Preparación: v1 de la atracción 1 `IN_REVIEW` y la oferta `OPEN`. Con `operador.cascada` (atracción 2): aprobar, devolver con motivo, suspender, reanudar, abrir `/panel/revisiones/[versionId]` y listar `/panel/revisiones` y `/panel/actividades`. | `NOT_FOUND` en cada acción, idéntico al de un id inexistente; las listas no incluyen nada de la atracción 1; `PC-OFE-1`. | 08; complementa 04 TX-03.7 (08c) y TX-04.6 (15b) |
| T-OFE-08 | 08a `dual` no decide su versión; 08b sí decide la de otro; 08c GAD sin rol de operador y operador de otra atracción; 08d `UPDATE` directo `reviewerId = authorId`. | `SELF_REVIEW_FORBIDDEN` con `DENIED`; éxito por identidad; `FORBIDDEN` y `NOT_FOUND`; la base rechaza con `ck_ov_review` (`23514`). | → 04 TX-03.7 (y T-DB-01c) |
| T-OFE-09 | 09a devolver sin motivo, con 1001 caracteres y válido; editar y reenviar; aprobar. 10c aprobar con `rev` obsoleto tras reenviar. | `VALIDATION_ERROR` ×2; `CHANGES_REQUESTED` con motivo; el motivo previo se conserva al reenviar y pasa a nulo al aprobar; `STALE_VERSION` con `currentRev`. | → 04 TX-03.7 |
| T-OFE-10 | 10a dos aprobaciones (`barrera.offer`); 10b aprobar frente a devolver. | Una gana y la otra `INVALID_STATE`; un solo movimiento de puntero; sin estado mixto (PC-OFE-3). | → 04 TX-03.7 |
| T-OFE-11 | 11a editar `IN_REVIEW` y `APPROVED`; 11b cualquier operación sobre una `APPROVED` y `UPDATE`/`DELETE` directos. | `INVALID_STATE` con `currentStatus`; en la base `TC_APPROVED_IMMUTABLE`. | → 04 TX-01.7 (11a), TX-03.7 (11b); T-DB-01d |
| T-OFE-12 | 12a `startNewVersion` en `OPEN`, `SUSPENDED`, `ARCHIVED` e inédita. | v2 `DRAFT` con el contenido de v1 y el público sin cambio; `OFFER_ARCHIVED`; `INVALID_STATE`. | → 04 TX-01.7 |
| T-OFE-13 | 13a dos aperturas simultáneas (`barrera.offer`). **13b (I, añade 08):** abrir una versión nueva cuando ya existe una de trabajo, en secuencia. | 13a: una tiene éxito (n.º 2) y la otra `WORKING_VERSION_EXISTS`. 13b: `WORKING_VERSION_EXISTS` con `details.workingVersionId` = la existente; ninguna fila nueva; `lastVersionNumber` sin cambio. | → 04 TX-01.7 (13a); 13b en 08 |
| T-OFE-14 | 14a eliminar (inédita, `OPEN`, `ARCHIVED`, ajena, y por otro miembro); 14b descartar; 14c edición frente a eliminación; 14d eliminar frente a aprobar; 14e descartar frente a aprobar; 14f repetir; 14g oferta sembrada por el migrador. | Borrado físico completo con una auditoría que sobrevive; `INVALID_STATE`, `NOT_FOUND`, `OFFER_ARCHIVED` según el caso; en ambos órdenes nunca una oferta `OPEN` sin versión pública ni una versión sin oferta; el orden explícito de D-78 no viola claves ni disparadores. | → 04 TX-16.7 y TX-01.7 (14c) |
| T-OFE-15 | 15a suspender y reanudar con retención y reserva confirmada; 15b rechazos (doble, estado, rol, atracción); 15c aprobar sobre `SUSPENDED`. | `SUSPENDED` conserva retenciones y entradas, y `OFFER_NOT_OPEN` para reservas nuevas; `INVALID_STATE`, `NOT_FOUND`, `FORBIDDEN` (el administrador no suspende); la oferta sigue `SUSPENDED` tras aprobar. | → 04 TX-04.6 |
| T-OFE-16 | 16a archivar (GAD, administrador sin y con motivo, otro GAD); 16b y 16b′ edición y archivo con bloqueo compartido; 16c aprobar frente a archivar; 16d archivar frente a reservar. | `ARCHIVED` terminal, historial intacto, versión de trabajo inerte, fuera del catálogo; `OFFER_ARCHIVED`; nunca una reserva posterior al archivo; en ambos órdenes. | → 04 TX-04.6 y TX-01.7 (16b, 16b′) |
| T-OFE-17 | Preparación: ofertas `OPEN` futuras de varias provincias (25), una `OPEN` con v2 `DRAFT` de otro precio, una `SUSPENDED`, una `ARCHIVED`, una inédita y una `OPEN` cuyo inicio ya pasó. **17a (I):** listar el catálogo sin filtro, con filtro y por páginas; abrir el detalle de cada una. **17b (E):** recorrer filtro y paginación en el navegador. | El catálogo contiene **solo** las `OPEN` futuras, con los datos de su **versión pública** (la v2 `DRAFT` no se ve); ordenadas por `startsAt` ascendente con desempate; de 10 en 10; el filtro usa la provincia de la versión pública (H-20). Detalle: 404 para la inédita y la `ARCHIVED`; la `SUSPENDED` se muestra con «Ventas suspendidas temporalmente» y sin «Reservar». Filtro sin resultados: estado vacío con «Quitar filtro» (07 §4.2). `pagina` inválida: sin 500 (comportamiento por fijar en P2-05). | 08 (sin 04); índice `(province, startsAt)` verificado por T-DB-01 y medido en T-PERF-01 |
| T-OFE-18 | 18a abrir v2, descartarla y abrir otra. **Añade 08:** dos ofertas distintas numeran de forma independiente; aprobar no cambia números. | La nueva es la n.º 3 (no se reutiliza el 2) y `lastVersionNumber = 3`; ambas ofertas empiezan en 1; el número de una versión no cambia al aprobarla. La unicidad `(offerId, number)` en la base la prueba T-DB-01. | → 04 TX-01.7 (18a) |
| T-OFE-19 | 19a editar y enviar como otro miembro, otro GAD y operador; eliminar y descartar por otro miembro (14a, 14b). | `FORBIDDEN`, `NOT_FOUND`, `FORBIDDEN`; el descarte y la eliminación por otro miembro son válidos. | → 04 TX-01.7 (19a), TX-16.7 (14a, 14b) |
| T-OFE-20 | Playwright sobre el build de producción (`turismo_e2e`, `fake`), tres contextos. 1) `gad.sanisidro` completa el formulario de `/panel/ofertas/nueva` (inicio a 7 días) y la envía. 2) `operador.laguna` abre `/panel/revisiones`, revisa la versión y aprueba. 3) Un visitante abre `/` y `/ofertas`. | La versión aparece en `/panel/revisiones` solo tras el envío; tras aprobar, la oferta figura en «próximas ofertas» de `/` y en el catálogo con sus datos y la etiqueta «hora de Ecuador continental»; el detalle muestra las condiciones; el visitante no ve «Reservar» sin sesión (ve «Ingresar para reservar»). El autor no puede aprobar su propia versión en la misma interfaz (T-OFE-08). Las trazas contienen solo datos ficticios. | 08 (sin 04) |
| T-OFE-21 | 21a aprobar con capacidad 6, 7 y con retención vencida; 21b hora posterior a la espera (`barrera.offer`). | `CAPACITY_BELOW_COMMITTED` con `details.committed = 7`; éxito si lo vencido no cuenta; con `advance(61 s)` éxito y con `advance(30 s)` rechazo. | → 04 TX-03.7 |
| T-OFE-22 | 22a editar fechas con reservas `HELD`, `CONFIRMED` y `EXPIRED`; 22b enviar; 22c aprobar con una reserva insertada durante la espera; 22d aprobar sin reservas. | `SCHEDULE_LOCKED` en los tres estados; la aprobación lo ve y lo rechaza (la regla autoritativa); fechas iguales o sin reservas: éxito. | → 04 TX-01.7 (22a), TX-02.7 (22b), TX-03.7 (22c, 22d) |
| T-OFE-23 | 23a alta con una atracción de otro GAD y como turista; 23b cambio de atracción en inédita y publicada. | `NOT_FOUND` y `FORBIDDEN`; permitido solo en una inédita del mismo GAD; `VALIDATION_ERROR` en `attractionId` si la oferta ya fue publicada. El rechazo en la base lo prueba T-DB-01. | → 04 TX-01.7 |
| T-OFE-24 | **24a (U)** función de fechas de `offers/domain`, con tabla de casos. **24b (I)** los mismos límites por `createOffer`, `updateWorkingVersion` y `submitVersion`. Casos: `endsAt` igual y anterior a `startsAt`; duración de 72 h y de 72 h 1 min; `2026-12-01T10:00` local; `2026-12-31T23:30` local; formatos `2026-12-01 10:00`, `2026-13-45T10:00` y `2026-02-30T10:00`; inicio en el pasado al crear y al editar; inicio pasado al enviar y al aprobar; inicio igual a `now`. | `endsAt ≤ startsAt` y duración > 72 h: `VALIDATION_ERROR` en el campo; 72 h exactas válidas. Conversión con UTC−5 sin horario de verano: `2026-12-01T10:00` → `2026-12-01T15:00Z` y `2026-12-31T23:30` → `2027-01-01T04:30Z`, y al mostrarse vuelven a la fecha y hora locales con «hora de Ecuador continental». Formatos inválidos: `VALIDATION_ERROR` en su campo. **Un inicio pasado se acepta al crear y al editar** (OFF.3: un borrador puede estar a medias) y se rechaza con `ACTIVITY_NOT_FUTURE` al enviar (05c) y al aprobar (03c, 05g). **Frontera (fijada en 03 §7 y en 04 TX-02, TX-03 y TX-05):** «futuro» es `startsAt > now` estricto; con `startsAt = now` se espera `ACTIVITY_NOT_FUTURE`. | 08; reglas en 04 OFF.3 y 03 §7 |

**Pendiente de esta área:** ninguna prueba de `T-OFE` está ejecutada. Por fijar en otros documentos y reflejado arriba: criterio de orden, versión que da la provincia en el listado del GAD y comportamiento de `pagina` inválida (P2-02, P2-05), La frontera `startsAt = now` quedó fijada en 03 §7 (`startsAt > now`) y ya no está pendiente. Las pruebas de reservas (`T-RES`) que comparten fila con estas (T-RES-17, T-RES-18) siguen en §3.3.

### 3.3 Reservas — `T-RES`

| ID | Qué demuestra | Nivel | Requisitos |
|---|---|---|---|
| T-RES-01 | Reserva válida: `HELD`, asistentes, total y vencimiento correctos. | I | RF-15, RF-17 |
| T-RES-02 | Rechazo de cantidad 0 u 11, nombres inválidos y condiciones sin aceptar. | I | RF-15 |
| T-RES-03 | Precio o total enviados por el cliente se ignoran. | I | RS-11 |
| T-RES-04 | Versión vista distinta de la pública da `VERSION_CHANGED` con la vigente. | I | RF-19 |
| T-RES-05 | Edad en la fecha local de la actividad: límite exacto, cambio de día por zona horaria, 29 de febrero. | U, I | RF-16 |
| T-RES-06 | `birthDate` solo se guarda si hay edad mínima. | I | RS-25 |
| T-RES-07 | Idempotencia: repetición idéntica devuelve la misma reserva; contenido distinto da conflicto. | I | RF-20 |
| T-RES-08 | Doble envío simultáneo con la misma clave crea una reserva. | C | RF-20 |
| T-RES-09 | Competencia por el último cupo sin sobreventa. | C | RS-10 |
| T-RES-10 | Una retención vencida libera cupos sin que corra la limpieza; la hora se toma tras esperar el bloqueo (subcasos 10a, 10a′, 10b). | I, C | RF-18, RO-07 |
| T-RES-11 | El trabajo de vencimiento marca `EXPIRED` y es idempotente. | I | RO-07 |
| T-RES-12 | Cambiar el precio publicado no altera una reserva existente (servicio y disparador). | I | RF-17 |
| T-RES-13 | Oferta suspendida, archivada o ya iniciada rechaza retenciones nuevas. | I | RF-12 |
| T-RES-14 | El comprador ve solo sus reservas; el GAD solo agregados sin nombres. | I, E | RF-21, RF-22, RS-07 |
| T-RES-15 | Límites de retenciones vigentes por comprador, también con solicitudes simultáneas a ofertas distintas (barrera: bloqueo asesor del comprador, D-66). | I, C | RS-29 |
| T-RES-16 | La retención no supera el inicio de la actividad. | I | RF-18 |
| T-RES-17 | Reserva frente a aprobación que reduce la capacidad (especificada en [04 TX-03.7](04-reglas-transacciones-y-concurrencia.md)). | C | RF-23, RS-10 |
| T-RES-18 | Reserva frente a suspensión (especificada en [04 TX-04.6](04-reglas-transacciones-y-concurrencia.md)): nunca una reserva creada después de la suspensión. | C | RF-12 |
| T-RES-19 | Reserva grupal en navegador, con conflicto de versión y vencimiento visible. | E | RF-15, RF-19, RF-21 |

#### 3.3.1 Preparación y comprobaciones comunes de `T-RES` (redactado el 2026-11-16)

**Estado: ninguna de estas pruebas está escrita ni ejecutada.** 04 ya especifica, con preparación, acciones y aserciones, los subcasos de **[TX-05.7](04-reglas-transacciones-y-concurrencia.md)** (07a a 07e, 08a1, 08a2, 08b, 08c, 09a, 09b, 10a, 10a′, 10b, 15a a 15c), de **TX-03.7** (T-RES-17) y de **TX-04.6** (T-RES-18), y da en **TX-06** las pruebas clave de 11. La tabla de §3.3.2 **no repite** esos subcasos: remite a 04. Lo que 08 añade: **01 a 06, 07f, 08d, 11a a 11g, 12 a 14, 16, 19** y los bordes de 09, 10 y 13. Las precondiciones de TX-05.1 se leen en este orden de error (1 reconsulta, 2 `NOT_FOUND`, 3 `OFFER_NOT_OPEN`, 4 `VERSION_CHANGED`, 5 `ACTIVITY_NOT_FUTURE`, 6 edad, 7 límites, 8 cupo); T-RES-02 y T-RES-13 incluyen casos de **varios fallos a la vez** que comprueban ese orden.

| Dato o paso | Contenido |
|---|---|
| **RES-D1 Entorno** | Como OFE-D1 (`turismo_test`, servicios con principal y reloj falso `T0`, `JOBS_ENABLED=false`). Limpieza entre pruebas como CTA-D4, incluidas `Reservation`, `Attendee`, `Payment`, `Ticket` y `PaymentEvent`. |
| **RES-D2 Cuentas** | `turista.ana` (comprador B), `turista.beto` (B2), `turista.carla`…`turista.hugo` (hasta 8 compradores para 09b), `gad.sanisidro`, `operador.laguna`, `admin`. |
| **RES-D3 Oferta base** | `crearOfertaAbierta({ capacidad: 10, inicio: T0 + 7 días 10:00 Ecuador, precio: '25,50', minAge: ninguna })`: versión pública `APPROVED` `V1`, oferta `OPEN`. Variantes cambian **un** parámetro (capacidad, `inicio`, `minAge`). |
| **RES-D4 Entrada base** | `ENTRADA_OK`: `offerId`, `offerVersionId = V1`, `requestKey` UUID nueva, 2 asistentes (`Ana Pérez`, `Luis Pérez`), `termsAccepted = true`. Cada caso cambia un campo. |
| **RES-D5 Reservas de partida** | `crearReservaRetenida` y `sembrarReserva` (OFE-D5) para estados previos. La lógica de reservar solo se prueba aquí; el resto de áreas siembra. |
| **RES-D6 Barreras** | `ctrl`, `barrera.offer`, `barrera.comprador`, `lanzar`, `esperarBloqueadas(n)`, `liberar()`, `reloj.advance`, como en §2 y TX-05.7. |
| **PC-RES-1 Sin cambios** | Tras un rechazo, `Reservation` y `Attendee` del comprador y la oferta son idénticas a antes (conteos y contenido); no se escribe nada salvo la auditoría aparte (TX-05.4). |
| **PC-RES-2 Auditoría** | `reservation.create` `SUCCESS` en la misma transacción que la reserva; los rechazos de dominio con `CONFLICT` en escritura aparte, **excepto** `VALIDATION_ERROR` (A6), que no se audita; `AuditEvent.metadata` contiene solo la lista cerrada (`offerId`, `versionId`, `quantity`, `totalCents`, `expiresAt`), **nunca nombres ni fechas de nacimiento** (PC-4). |
| **PC-RES-3 Inventario** | Tras cada prueba: `comprometido ≤ capacidad pública` (03 §8.6, consulta 2), calculado por la prueba con SQL propio y no con el servicio. |
| **PC-RES-4 Ambos órdenes** | Como PC-OFE-3: las aserciones de concurrencia valen para todos los órdenes posibles (H-35). |

#### 3.3.2 Acción y resultado por prueba

*«→ 04» = se ejecuta tal como está en 04 y el resultado es el que 04 fija.*

| ID | Acción | Resultado esperado | Detalle |
|---|---|---|---|
| T-RES-01 | `ENTRADA_OK` con `turista.ana` en `T0`. Variantes: 1 y 10 asistentes; `birthDate` ausente. | `HELD`; `quantity` = asistentes; `unitPriceCents = 2550` (de `V1`); `totalCents = 2550 × quantity` (5100 con 2); `currency = USD`; `offerVersionId = V1`; `createdAt = termsAcceptedAt = T0`; `expiresAt = T0 + 15 min` exacto (la actividad es lejana); `Attendee` con `position` 1..n en el orden enviado; el comprador es el principal; `replayed = false`; un `AuditEvent reservation.create` `SUCCESS` (PC-RES-2); PC-RES-3. | 08; A9 de 04 TX-05.4 |
| T-RES-02 | Rechazos de formulario, cada uno aislado: 0 asistentes; 11 asistentes; `fullName` de 1 y de 121 puntos de código, vacío y solo espacios; `fullName` con espacios dobles y NFD (se normaliza y se acepta); `termsAccepted` ausente, `false`, `"true"` y `1`; `offerId`, `offerVersionId` y `requestKey` no UUID. **Varios a la vez:** 11 asistentes más `termsAccepted = false`; una oferta `SUSPENDED` con 0 asistentes. | `VALIDATION_ERROR` con `fieldErrors` **por campo** (`attendees`, `attendees.N.fullName`, `termsAccepted`, ids); ninguna fila nueva; **sin auditoría** (error de formulario); el borde válido (1 y 10 asistentes, 2 y 120 caracteres) pasa. Con varios fallos de formato, todos los campos aparecen en `fieldErrors`; la validación de formato va **antes** de la transacción, así que la oferta `SUSPENDED` con 0 asistentes da `VALIDATION_ERROR` y no `OFFER_NOT_OPEN`. Rol distinto de `TOURIST` (`gad.sanisidro`, `admin`): `FORBIDDEN`. | 08; entradas de 04 TX-05.1 |
| T-RES-03 | `ENTRADA_OK` más `unitPriceCents = 1`, `totalCents = 1`, `quantity = 9`, `status = 'CONFIRMED'`, `buyerId` = otro usuario, `expiresAt` lejano y `currency = 'EUR'`. | Los campos extra se descartan sin error: `unitPriceCents = 2550`, `totalCents = 5100`, `quantity = 2`, `HELD`, `buyerId` = principal, `expiresAt = T0 + 15 min`, `USD`. El `requestHash` es el mismo que sin los extras (se comprueba repitiendo la solicitud con la misma clave: `replayed = true`, no conflicto). | 08; TX-05.1 («se descarta»), RS-11 |
| T-RES-04 | 04a: oferta con `V1` pública; se publica `V2` (otro precio y condiciones) y `B` envía con `offerVersionId = V1`. 04b: con `V2` ya pública, envío con `V2`. 04c: `offerVersionId` de **otra oferta** y de una versión inexistente. | 04a: `VERSION_CHANGED` con `details.currentVersionId = V2`; sin reserva; auditoría `CONFLICT` aparte. 04b: éxito con `unitPriceCents` de `V2`. 04c: `VERSION_CHANGED` (no es la pública de esa oferta) sin revelar nada de la otra oferta. Reintento tras 04a con `requestKey` **nueva** y la versión vigente: éxito (TX-05.6 exige clave nueva; el rechazo no escribió fila, así que no hay conflicto con la anterior). | 08; A4 de TX-05.4; TX-05.6 (versión cambiada) |
| T-RES-05 | **05a (U)** función de edad con tabla: edad mínima 12, actividad `startsAt = 2026-12-10T10:00-05:00` (`2026-12-10T15:00Z`): nacida el `2014-12-10` (cumple ese día) y el `2014-12-11` (un día menos). **05b (I)**: actividad a las `2026-12-10T22:00-05:00` (= `2026-12-11T03:00Z`): nacida el `2014-12-10` cumple por la fecha **local** aunque en UTC ya sea el 11. Actividad a las `00:30` local del 10 (= `05:30Z`). **05c**: 29 de febrero: nacida `2012-02-29` con actividad el `2026-02-28` (no cumple 14), el `2026-03-01` (cumple 14); `2025-02-29` inválida. **05d**: `birthDate` en el futuro y anterior a `1900-01-01`. | La edad se calcula en la **fecha local de `startsAt`** (03 §7), no en UTC ni con la fecha de reserva; cumplir años el mismo día de la actividad cuenta como cumplida; el 29 de febrero cumple el 1 de marzo en años no bisiestos (convención fijada en 03 §7 y en la decisión D-36 de 00 §8; ya no está pendiente). No cumplir: `VALIDATION_ERROR` en `attendees.N.birthDate`, sin reserva, sin auditoría. Fecha inexistente o futura: mismo error. | 08; A6 de TX-05.4 |
| T-RES-06 | Oferta **sin** `minAge`: asistentes con y sin `birthDate`. Oferta **con** `minAge`: asistente sin `birthDate`; con una válida; mezcla de uno con y otro sin. | Sin `minAge`: un `birthDate` enviado da `VALIDATION_ERROR` en ese campo (regla 6 de TX-05.1: nunca se guarda); sin él, éxito. Con `minAge`: sin `birthDate`, `VALIDATION_ERROR`; con fecha válida que cumple, éxito y `Attendee.birthDate` guardada; **la mezcla falla entera** (nada se crea). En ningún caso `AuditEvent.metadata` contiene la fecha (PC-RES-2). | 08; RS-25, 03 §7 |
| T-RES-07 | 07a a 07e. **07f (añade 08):** repetir la misma clave **después** de que la retención venza (reloj +16 min, J1 desactivado), tras `EXPIRED` por J1, y tras la confirmación de pago. | → 04 TX-05.7 (07a a 07e). **07f:** devuelve la reserva tal como está (`HELD` vencida, `EXPIRED`, `CONFIRMED`) con `replayed = true`, **sin crear otra** y sin reevaluar nada (TX-05.6); una clave nueva sí crea una (si hay cupo). | → 04; 07f en 08 |
| T-RES-08 | 08a1, 08a2, 08b y 08c. **08d (añade 08):** doble envío con la misma `(B, K)` **sin** barrera de `Offer`, 20 repeticiones de la prueba. | → 04 TX-05.7. **08d:** en las 20 repeticiones, una sola fila `(B, K)`, ambas llamadas con el mismo `reservationId` y ninguna `INTERNAL_ERROR`; sin sesiones `idle in transaction`. Es una prueba de humo del camino sin barrera; **no** sustituye a las deterministas. | → 04 |
| T-RES-09 | 09a (capacidad 5, 6 compradores de 2) y 09b (capacidad 1, 8 de 1). **Añade 08:** **09c** capacidad 10 con 3 compradores de 4, 3 y 3 más 1 de 1 (suma justa y sobrante); **09d** igual que 09a pero con `ctrl` liberando por `ROLLBACK`. | → 04. **09c:** el resultado depende del orden, así que la aserción es independiente de él: comprometido ≤ 10; `Σ quantity` de las `HELD` = comprometido; cada rechazo es `INSUFFICIENT_CAPACITY` con `available` ≥ 0 y menor que su `quantity`; si las tres de 4, 3 y 3 entran, la de 1 es rechazada con `available = 0`. **09d:** el `ROLLBACK` de `ctrl` no cambia nada: el resultado es el de 09a. | → 04; 09c, 09d en 08 |
| T-RES-10 | 10a, 10a′ y 10b. **Borde (añade 08):** **10c** retención de A con `expiresAt = T0 + 60 s` y reloj exactamente en `T0 + 60 s`; **10d** en `T0 + 60 s − 1 ms`. | → 04 TX-05.7. **10c:** la retención ya no cuenta (`expiresAt > now` falso: vigente solo si `expiresAt > now`, D-31): B tiene éxito. **10d:** sigue contando: `INSUFFICIENT_CAPACITY`. *(03 §7 y §8.6 fijan que una retención es vigente solo si `expiresAt > now`: la igualdad no cuenta.)* | → 04; 10c, 10d en 08 |
| T-RES-11 | **11a:** 3 `HELD` vencidas y 1 vigente: ejecutar `expire-holds`. **11b:** repetir. **11c:** 501 vencidas. **11d:** sin vencidas. **11e:** una vencida bloqueada por `ctrl` (`FOR UPDATE`); después `liberar()` y otra pasada. **11f:** `HELD` vencida con `Payment` `ORDER_CREATED`. **11g:** `CONFIRMED` con `expiresAt` pasado. | **11a:** las 3 a `EXPIRED` con `updatedAt = now`; la vigente intacta; un `AuditEvent reservation.expire_batch` con `count = 3`. **11b:** 0 filas, sin auditoría. **11c:** dos lotes (500 y 1), un `AuditEvent` por lote, ninguna queda `HELD` vencida. **11d:** sin cambios ni auditoría. **11e:** la bloqueada se salta y no hay espera ni error; tras `liberar()` y otra pasada queda `EXPIRED`. **11f:** pasa a `EXPIRED` **sin tocar el pago** (`ORDER_CREATED`). **11g:** no se toca (no es `HELD`). La comprobación diferida de 03 no falla. Con J1 detenido, los cupos ya se liberan (T-RES-10a). | 08; pruebas clave de 04 TX-06 |
| T-RES-12 | **12a:** reserva `R` sobre `V1` (2550); publicar `V2` con `priceCents = 3000` y aprobarla. **12b:** `UPDATE` directo de `Reservation.unitPriceCents`, `totalCents`, `quantity`, `offerVersionId`, `buyerId` con `tc_app`. **12c:** `UPDATE` directo en `Attendee.fullName`. **12d:** `UPDATE` de una `CONFIRMED`. | **12a:** `R` conserva `unitPriceCents = 2550`, `totalCents`, `offerVersionId = V1`; una reserva nueva usa 3000; el pago de `R` usa el total de `R`. **12b a 12d:** rechazados por `tg_reservation_guard` / `tg_attendee_guard` (código `TC_…` por fijar con 03 §8.4); `UPDATE` de `status` `HELD → EXPIRED` sigue permitido. Prueba T-DB-01 los disparadores; aquí se comprueba por el servicio. | 08; INV-02 y INV-04 (03) |
| T-RES-13 | **13a:** oferta `SUSPENDED`. **13b:** `ARCHIVED`. **13c (frontera, TX-05 precondición 5):** `startsAt = T0` y reloj en `T0` exacto. **13d:** `startsAt = T0 + 1 ms`. **13e:** `startsAt` ya pasó (`T0 − 1 h`). **13f:** `UNPUBLISHED` e id inexistente. **13g (varios a la vez):** oferta `SUSPENDED` con versión vista distinta de la pública y `startsAt` pasado. | **13a, 13b:** `OFFER_NOT_OPEN`, auditoría `CONFLICT` aparte, PC-RES-1. **13c:** **`ACTIVITY_NOT_FUTURE`** (la precondición exige `startsAt > now` estricto; la igualdad **rechaza**); sin reserva; auditoría `CONFLICT`. **13d:** éxito con `expiresAt = startsAt = T0 + 1 ms` y `expiresAt > createdAt` (`ck_res_ranges`). **13e:** `ACTIVITY_NOT_FUTURE`. **13f:** `NOT_FOUND` idéntico para ambas (no se revela la oferta inédita). **13g:** `OFFER_NOT_OPEN` (el orden 3 → 4 → 5 de TX-05.1 decide cuál ve el usuario). La frontera `startsAt = now` está fijada en 03 §7 y en 04 TX-05.1 (5): 13c comprueba una regla **definida** (la prueba aún no está ejecutada). | 08; A2, A3, A5 de TX-05.4 |
| T-RES-14 | **14a (I):** `turista.ana` lista y abre sus reservas; intenta abrir la de `turista.beto` por id. **14b (I):** `gad.sanisidro` consulta los agregados de una oferta de su GAD con reservas de varios compradores; `gad.colibries` hace lo mismo sobre la oferta del GAD 1; `operador.laguna` consulta la lista de asistentes de su atracción. **14c (E):** como `turista.ana`, abrir la URL de la reserva de `turista.beto`; como `gad.sanisidro`, ver la pantalla de agregados. | **14a:** solo las suyas; la ajena da `NOT_FOUND` idéntico a un id inexistente. **14b:** el GAD ve **solo agregados** (cantidades, estados, ocupación), **sin** nombres, fechas de nacimiento ni correos; el otro GAD recibe `NOT_FOUND`; el operador ve los asistentes **solo** de su atracción (RS-07; qué campos puede ver depende de 01 §8.4). **14c:** 404 en la ajena; la pantalla del GAD no contiene ningún nombre de asistente en el HTML ni en la carga de datos. | 08; RF-21, RF-22, RS-07; contratos de 05 §2–§3 |
| T-RES-15 | 15a, 15b y 15c. **Añade 08:** **15d** B con 3 retenciones, una **vence** (reloj) y reserva en otra oferta; **15e** una de las 3 pasa a `EXPIRED` por J1; **15f** una de las 3 se confirma (`CONFIRMED`) y reserva una cuarta; **15g** una de las 3 es una `REVIEW_REQUIRED` **vigente** (sembrada con el migrador) y reserva una cuarta, y después con esa `REVIEW_REQUIRED` ya vencida. | → 04 TX-05.7. **15d y 15e:** la vencida deja de contar y la nueva tiene éxito (3 vigentes). **15f:** una `CONFIRMED` **no** cuenta para el límite de 3 (03 §8.6, consulta 3: cuenta `HELD` y `REVIEW_REQUIRED` vigentes): la cuarta reserva tiene éxito. **15g:** una `REVIEW_REQUIRED` con `expiresAt > now` **sí cuenta**: la cuarta recibe `HOLD_LIMIT_REACHED` con `details.scope = 'BUYER'` (`'OFFER'` si es la misma oferta que ya tiene una retención); con esa `REVIEW_REQUIRED` vencida, la cuarta tiene éxito. | → 04; 15d a 15g en 08 |
| T-RES-16 | **16a:** `startsAt = T0 + 10 min`. **16b:** `startsAt = T0 + 15 min` exacto. **16c:** `startsAt = T0 + 15 min + 1 ms`. **16d:** `startsAt = T0 + 2 h`. | **16a:** `expiresAt = startsAt` (no `T0 + 15 min`). **16b:** `expiresAt = T0 + 15 min = startsAt`. **16c:** `expiresAt = T0 + 15 min`. **16d:** `T0 + 15 min`. En todos `expiresAt > createdAt` y `expiresAt ≤ startsAt` (D-33). Mismas fechas con la hora posterior a la espera: T-RES-10b. | 08; D-33; A9/A5 de TX-05.4 |
| T-RES-17 | Reserva frente a aprobación que reduce la capacidad, en ambos órdenes. | → 04 TX-03.7 | → 04 |
| T-RES-18 | Reserva frente a suspensión; ampliada con archivar (T-OFE-16d). | → 04 TX-04.6 y TX-03.7 | → 04 |
| T-RES-19 | Playwright sobre el build de producción (`turismo_e2e`, `fake`). 1) `turista.ana` abre una oferta con `V1`, rellena 3 asistentes y reserva: ve la reserva `HELD` con el total y el tiempo restante («Vence a las HH:MM, hora de Ecuador continental»). 2) Con la pantalla abierta, un segundo contexto (`gad.sanisidro`) publica `V2` (otro precio y condiciones); `ana` envía: aviso `VERSION_CHANGED` con las condiciones nuevas, el foco pasa al resumen del aviso y el formulario conserva los nombres; confirma con la versión nueva. 3) Doble clic en «Reservar»: una sola reserva. 4) Con el reloj acelerado (hook de prueba del `fake`, sin esperar 15 min), la retención vence: la pantalla muestra «Tu retención venció» y el botón de pago se deshabilita; «Reservar de nuevo» genera una clave nueva. | Un solo registro por doble clic; el conflicto de versión muestra el aviso y no pierde datos del formulario; el vencimiento es visible y anunciado (`role="status"`), con la hora en horario de Ecuador; al volver a reservar sin cupo, `INSUFFICIENT_CAPACITY` con las plazas libres; las trazas contienen solo datos ficticios. Comprobación manual asociada: MC-nn/MP-nn de 07 §7.1 (se asocian a `T-A11Y-nn` en §3.7). | 08; pantallas de 07 §4.3 |

**Pendiente de esta área:** ninguna prueba de `T-RES` está ejecutada. Las reglas que estaban por fijar quedaron definidas el 2026-11-16 y ya no son pendientes de esta área: `startsAt > now` y `expiresAt > now` (03 §7, §8.6; 13c y 10c), que una `CONFIRMED` no cuenta y una `REVIEW_REQUIRED` vigente sí para el límite de 3 (03 §8.6; 15f y 15g) y la convención del 29 de febrero (decisión D-36, 00 §8; 05c). Los pendientes del listado del GAD (orden, provincia, `pagina` inválida) **no** son de esta área: están en T-OFE-02 y se resuelven en su propio lote (00 §1.1).

### 3.4 Pagos — `T-PAG`

| ID | Qué demuestra | Nivel | Requisitos |
|---|---|---|---|
| T-PAG-01 | La orden usa el total persistido, USD y la referencia; la intención (`Payment` `CREATED`) se guarda antes de llamar a la pasarela y la URL no se entrega antes de guardar la orden (subcasos 01a, 01b, 01c). | I, C | RF-24 |
| T-PAG-02 | Fallo al crear la orden: el reintento no duplica; orden creada pero no guardada; `DUPLICATE_INVOICE` (subcasos 02a, 02b, 02c). | I, C | RF-24 |
| T-PAG-03 | Dos inicios de pago simultáneos dejan una sola orden asociada, con cualquier conducta de la pasarela ante la clave repetida (subcasos 03a, 03b, 03c). | C | RF-24 |
| T-PAG-04 | Volver del navegador sin captura no confirma. | I, E | RS-13 |
| T-PAG-05 | Captura `COMPLETED` coincidente: `CONFIRMED` y N entradas en la misma transacción. | I | RF-28, RF-30 |
| T-PAG-06 | Captura y webhook simultáneos: una confirmación y N entradas (06a, 06b); dos capturas del comprador a la vez: una sola llega a la pasarela y la otra recibe `IN_PROGRESS` (06c1, 06c2); arrendamiento vencido: el intento desconocido se **reanuda con la misma clave** y un cierre tardío no pisa a un intento más nuevo (06d, 06d′, 06e); cuatro actores a la vez (06g). | C | RF-28, RS-14 |
| T-PAG-07 | Webhook repetido no produce efectos adicionales; un evento nuevo con la reserva ya confirmada se registra sin efecto; entregas idénticas simultáneas (subcasos 07a, 07b, 07c, 07d). | I, C | RF-27, RS-14 |
| T-PAG-08 | Webhook con firma inválida, cabeceras ausentes o cuerpo excesivo: 400/413, sin cambios, auditado; solo con firma HMAC del `fake` (no prueba la verificación de PayPal; subcasos 08a, 08b). | I | RS-12 |
| T-PAG-09 | Importe distinto: `DISCREPANT` y `REVIEW_REQUIRED`, sin entradas. | I | RF-29 |
| T-PAG-10 | Moneda distinta. | I | RF-29 |
| T-PAG-11 | Referencia distinta. | I | RF-29 |
| T-PAG-12 | Tiempo agotado al capturar: `REVIEW_REQUIRED` (`UNCERTAIN_RESULT`) con `snapshot = null`; después la conciliación o la consulta confirma o libera **solo con evidencia concluyente** (el paso del tiempo no libera); el comprador reanuda con la misma clave o reintenta con clave nueva tras un rechazo definitivo (subcasos 12a a 12i). | I, C, U | RF-29 |
| T-PAG-13 | Captura tardía con cupo: `CONFIRMED` (subcaso 13a: la retención vence mientras la liquidación espera el bloqueo). | I, C | RF-29 |
| T-PAG-14 | Captura tardía sin cupo: `REVIEW_REQUIRED` (`NO_CAPACITY`) y sin ocupar cupo. | I | RF-29, RS-10 |
| T-PAG-15 | Captura tardía con oferta suspendida o archivada, o actividad iniciada; una retención aún vigente se confirma aunque la oferta esté suspendida (subcasos 15a, 15b). | I, C | RF-29 |
| T-PAG-16 | Un evento posterior no degrada una reserva confirmada. | I | RS-14 |
| T-PAG-17 | Eventos fuera de orden, duplicados, contradictorios con la instantánea (no se registran, `nextCheckAt` adelantado, 200) y reembolsos sobre una reserva confirmada (subcasos 17a, 17c, 17d, 17e). | I | RF-27 |
| T-PAG-18 | No se inicia el pago ni se captura una reserva ajena ni una con retención vencida o con menos de 30 s, también cuando el margen se agota mientras la llamada espera un bloqueo (no se llama a la pasarela; subcasos 18a a 18g). | I, C | RF-26, RS-07 |
| T-PAG-19 | «Consultar pasarela» resuelve un caso incierto; solo consulta (nunca captura) y no toca el calendario; ante fallo temporal se reintenta sin duplicar; permisos (subcasos 19a a 19e). | I | RF-29 |
| T-PAG-20 | Tras un reinicio, el conciliador aplica una captura cuyo resultado no llegó a guardarse; calendario de 13 comprobaciones y agotamiento que **escala sin cerrar**; concurrencia entre conciliador, administrador, captura y webhook; una respuesta antigua no sobrescribe un resultado nuevo (subcasos 20a a 20j). | I, C, U | RO-11 |
| T-PAG-21 | Contrato del adaptador PayPal con respuestas grabadas: estados, importes, enlaces y errores. | K | RF-24 |
| T-PAG-22 | Webhook de una orden desconocida, sin orden o de un tipo no suscrito: 200 e ignorado. | I | RF-27 |
| T-PAG-23 | Medio de pago rechazado u orden no aprobada: no confirma y permite reintentar de inmediato; si el cierre no se escribe, el intento sigue abierto y se **reanuda con la misma clave** tras el arrendamiento (nunca una clave nueva sobre un intento sin cerrar; subcasos 23a, 23b, 23c). | I, C | RF-26 |
| T-PAG-24 | **Verificación manual real en PayPal Sandbox**, incluida la verificación de un webhook real por *postback* (los eventos del **simulador** no la admiten y no sustituyen esta prueba) y la conducta de las claves de idempotencia (04 §5.2). Pendiente hasta disponer de credenciales (Q-08). | M | RF-24, RE-11 |
| T-PAG-25 | Compra completa en navegador con el adaptador `fake`. | E | RF-24 a 26 |
| T-PAG-26 | Webhook con la pasarela o el verificador caídos: **200 `pending`** con el trabajo escrito (`nextCheckAt`) si el pago está `ORDER_CREATED`; **503** si no hay trabajo que escribir; nunca 400 por «verificación no disponible»; el evento no se registra y la conciliación lo aplica sin reentrega (subcasos 26a a 26d). | I | RF-27 |

#### 3.4.1 Preparación, cobertura y alcance de `T-PAG` (redactado el 2026-11-16)

**Estado: ninguna de estas pruebas está escrita ni ejecutada.** 04 ya especifica con preparación, acciones y aserciones casi todos los subcasos: **TX-07.7** (01a a 01c, 02a a 02c, 03a a 03c, 18a a 18d), **TX-08.7** (06c1, 06c2, 06d, 06d′, 06e, 12a a 12i, 18e a 18g, 23a a 23c), **TX-09.8** (05, 06a, 06b, 07a a 07c, 09 a 17, 13a, 14c, 15a, 15b; unitarias `L-01` a `L-18`), **TX-10.9** (07d, 08a, 08b, 17a, 17c a 17e, 22, 26a a 26d) y **TX-11.9** (06g, 19a a 19e, 20a a 20j). §3.4.3 **no los repite**: remite a 04. Lo que 08 añade: **04, 14d, 14e, 20k, 21, 24, 25** y la matriz de cobertura de abajo.

| Dato o paso | Contenido |
|---|---|
| **PAG-D1 Entorno** | Como RES-D1, más `PAYMENT_PROVIDER=fake`, `FAKE_PAYMENT_WEBHOOK_SECRET` de prueba y `lockTimeoutMs` reducido (500 ms) solo donde 04 lo pide. |
| **PAG-D2 Fábricas** | `crearReservaConPago({ cantidad: 5, venceEn, estadoPago })` e `instantaneaCompleta(...)` (TX-09.8); `crearReservaRetenida` (RES-D5). Cuentas: `turista.ana` (comprador), `turista.beto` (ajeno), `admin`. |
| **PAG-D3 Adaptador `fake`** | `fake.gate`, `fake.waitInFlight(n)`, `fake.release(k)`, `fake.mode` (`RETURN_SAME`, `FAIL_SECOND`, `CREATE_TWO`, `DUPLICATE_INVOICE`), `fake.program(...)`, `fake.calls(op)` y `fake.program('verifyWebhook', …)` (TX-07.7, TX-08.7, TX-10.9). Sus reglas de clave repetida y de «una orden se captura una vez» **aproximan** a PayPal; no lo verifican. |
| **PAG-D4 Barreras y reloj** | `ctrl`, `barrera.offer`, `esperarBloqueadas(n)`, `lanzar`, `liberar()`, `reloj.advance` y `runReconcilePayments()` con `calendario(k)` (TX-11.9). `JOBS_ENABLED=false`: J1 y J2 se invocan a mano. |
| **PC-PAG-1 Inventario de dinero** | Al final de cada prueba: ninguna reserva `CONFIRMED` sin pago `CAPTURED` ni sin N entradas; ningún pago `CAPTURED` o `DISCREPANT` con reserva `HELD`; `Payment.amountCents` = `Reservation.totalCents` (03 §8.2); calculado con SQL de la prueba. |
| **PC-PAG-2 Sin datos personales** | `AuditEvent` y `PaymentEvent.metadata`/`reviewDetail` sin nombres, correos ni cuerpos completos del proveedor; el `description` de `createOrder` es constante (TX-07.1). |
| **PC-PAG-3 Pasarela no llamada** | Donde 04 dice «0 llamadas», se comprueba `fake.calls(op)` = 0; no basta que el resultado sea un error. |

**Qué demuestra cada nivel (distinción con T-PAG-24).** Toda prueba automatizada de esta área usa el adaptador `fake` o instantáneas escritas a mano: demuestra **nuestra** lógica (estados, bloqueos, idempotencia, clasificación, calendario), **no** la conducta de PayPal.

| Aspecto | Con `fake` (automatizado) | Solo con PayPal Sandbox real (T-PAG-24, manual, Q-08) |
|---|---|---|
| Reintento de creación con la misma clave (02, 03) | Nuestra rama de relectura y el uso de la **misma** clave, con los cuatro modos del `fake`. | Si Orders v2 devuelve la misma orden, retención real de la clave y qué pasa con otro cuerpo o con repetición simultánea; longitud máxima de `PayPal-Request-Id`. |
| Reintento y resultado incierto de captura (06, 12, 23) | Reanudar con la misma clave, nunca una nueva sobre un intento abierto; `UNCERTAIN` ⇒ revisión; liberar solo con evidencia. | Códigos HTTP y forma exactos de `ORDER_NOT_APPROVED`, `ORDER_ALREADY_CAPTURED`, `INSTRUMENT_DECLINED`, `PAYER_ACTION_REQUIRED`; consistencia de `getOrder` tras capturar. |
| Webhook (07, 08, 17, 22, 26) | Firma **HMAC local**, deduplicación, contradicciones con la instantánea, 200/400/503. | Verificación real por *postback* con un evento real; plazo de respuesta que PayPal exige. Los eventos del **simulador** no la admiten y **no cuentan**. |
| Conciliación y agotamiento (19, 20) | Calendario de 13 comprobaciones con reloj falso (propuesta propia, TX-11.2); escalado sin cerrar. | Vida útil real de una orden y localizar una orden por `invoice_id`. |
| Captura tardía con y sin cupo (13 a 15) | Reglas `L-09` a `L-12` y bloqueos. | Nada específico: es lógica local. |

**Matriz de cobertura pedida (qué ID cubre cada riesgo; «→» lo especifica 04; «08» lo añade este documento).**

| Riesgo | Cubierto por | Hueco hallado |
|---|---|---|
| Reintento de **creación** (misma clave, orden creada pero no guardada, duplicado simultáneo, `DUPLICATE_INVOICE`) | → 01c, 02a a 02c, 03a a 03c, 18d | Ninguno con `fake`; conducta real: T-PAG-24. |
| Reintento de **captura** (doble captura, reanudar tras arrendamiento, rechazo tardío, cierre no escrito) | → 06c1 a 06e, 23a a 23c, 12g a 12i, 20g | Ninguno con `fake`. |
| Resultado **incierto** | → 12a a 12f, 19a a 19e | Ninguno con `fake`. |
| Webhook **duplicado** | → 07a, 07b, 07c, 07d | Ninguno. |
| Webhook **contradictorio** o fuera de orden | → 17a, 17c, 17d, 17e, 06b, 20j | Un webhook que llega **después** de agotada la conciliación: **20k (08)**. |
| Conciliación **agotada** | → 20d, 20h, 19c | Aplicación posterior de una captura real tras el agotamiento: **20k (08)**. |
| Captura tardía **con cupo** | → 13, 13a, 15b, 20a | Ninguno. |
| Captura tardía **sin cupo** | → 14, 14c, 15, 15a | Solo cubierto por la liquidación directa: **14d y 14e (08)** añaden el camino del conciliador y del administrador, la reserva ya `EXPIRED` y la reevaluación al liberarse cupo (`L-12`). |
| Retorno del navegador sin captura | 08 (T-PAG-04) | Faltaba especificarlo: **04 (08)**. |
| Adaptador PayPal y flujo completo en navegador | 08 (T-PAG-21, 25) | **21 y 25 (08)**. |

#### 3.4.2 Qué queda sin decidir o sin poder verificar

- **Todo lo de PayPal Sandbox** (T-PAG-24, Q-08): ninguna fila de la tabla anterior con «Solo PayPal Sandbox real» puede darse por cubierta hasta tener credenciales. Las respuestas grabadas de T-PAG-21 **no existen**: mientras tanto el contrato se prueba solo con respuestas del `fake` (04 TX-10.9).
- `RECONCILE_DELAYS_MIN` y `MAX_CHECKS` (13 comprobaciones, 4 569 min) son **una propuesta** pendiente de confirmar con el equipo (TX-11.2, P4-05): 20d y 20k cambian si cambia.
- Pendientes de 04 §5.2 y P0-03/P4-04/P4-06 que condicionan estas pruebas: nombres de opciones de transacción de Prisma 7.10.1, nombres reales de los índices únicos, `updateMany` con `count` y `captureAttemptKey: null`, y que el `fake` implemente compuerta y modos tal como describe TX-07.7 (P4-01).

#### 3.4.3 Acción y resultado por prueba

*«→ 04» = se ejecuta como está en 04 y el resultado es el que 04 fija. Lo que añade 08 va en negrita.*

| ID | Acción | Resultado esperado | Detalle |
|---|---|---|---|
| T-PAG-01 | 01a a 01c. | Intención persistida antes de la llamada; la URL no se entrega antes de guardar la orden; pago ya `ORDER_CREATED` devuelve la misma URL sin llamar. | → 04 TX-07.7 |
| T-PAG-02 | 02a a 02c. | La misma clave en cada reintento; `BUSY_TRY_AGAIN` sin perder la orden creada; `DUPLICATE_INVOICE` no reintentable. | → 04 TX-07.7 |
| T-PAG-03 | 03a a 03c con los modos del `fake`. | Una sola orden guardada; segunda orden nunca entregada (`ORPHAN_ORDER`). | → 04 TX-07.7 |
| **T-PAG-04** | **04a (I):** cargar la página de retorno de una reserva `HELD` con parámetros añadidos (`?token=X&PayerID=Y`), **sin** ejecutar la acción de captura. **04b (I):** el retorno de una reserva ajena o con id inexistente. **04c (I):** cargar `…/pago/cancelado`. **04d (E):** en el `fake`, pulsar «Cancelar» y volver; y volver **sin** pulsar «Aprobar» ni «Cancelar». **04e (E):** con JavaScript desactivado, abrir la página de retorno y pulsar «Confirmar pago» (y pulsarlo dos veces). | **04a:** la reserva sigue `HELD` y el pago `ORDER_CREATED`; `fake.calls('captureOrder')` = 0 (los parámetros no son prueba de nada, 05 §2). **04b:** `NOT_FOUND`, sin revelar la ajena. **04c:** no escribe nada (sin `AuditEvent`) y enlaza a la reserva. **04d:** «Cancelar»: sin captura, reserva `HELD`, se puede reintentar; volver sin aprobar: la captura de la página devuelve `PAYMENT_NOT_APPROVED`, reserva `HELD`, mensaje claro. **04e:** el botón envía la captura por `POST` con el mismo resultado que con JavaScript; una sola captura efectiva. | 08; RS-13, 05 §2 |
| T-PAG-05 | Captura `COMPLETED` coincidente (`settlePayment`) y por `capturePayment`. | `CONFIRMED`, N entradas y auditoría en la misma transacción. | → 04 TX-09.8 (T-PAG-05), TX-08.7 (12a) |
| T-PAG-06 | 06a, 06b, 06c1, 06c2, 06d, 06d′, 06e, 06g. | Una confirmación, N entradas; una sola captura efectiva; reanuda con la misma clave; un cierre tardío no pisa al nuevo. | → 04 TX-09.8, TX-08.7, TX-11.9 |
| T-PAG-07 | 07a a 07d. | Una `CONFIRMED` y una duplicada; un `PaymentEvent`; recuperación de unicidad como resultado de dominio. | → 04 TX-09.8 y TX-10.9 |
| T-PAG-08 | 08a, 08b (firma HMAC del `fake`). | 400/413 sin cambios; auditado. | → 04 TX-10.9; **no prueba la verificación de PayPal** (T-PAG-24) |
| T-PAG-09 a 11 | Importe, moneda y referencia distintos. | `DISCREPANT` y `REVIEW_REQUIRED` con el motivo de mayor prioridad; sin entradas. | → 04 TX-09.8 |
| T-PAG-12 | 12a a 12i. | `UNCERTAIN_RESULT` con intento abierto; el tiempo no libera; reanudar con la misma clave. | → 04 TX-08.7 y TX-09.8 |
| T-PAG-13 | Captura tardía con cupo; 13a (hora tras la espera). | `CONFIRMED` con `late = true`. | → 04 TX-09.8 |
| T-PAG-14 | 14 y 14c. **14d (I):** reserva `REVIEW_REQUIRED` (`NO_CAPACITY`, pago `CAPTURED`) como en 14; otra retención ocupante vence y J1 la marca `EXPIRED`; el administrador usa `checkGatewayAction` con `getOrder` ⇒ `COMPLETED` y la **misma** captura (`L-12`). Variantes: sin cupo liberado; captura distinta (`L-13`). **14e (I):** retención vencida y marcada `EXPIRED` por J1 **antes** de la captura; `fake` ⇒ `COMPLETED`; con cupo, sin cupo y con oferta `SUSPENDED`; con el webhook, J2 y el administrador como origen. | 14, 14c: → 04 TX-09.8. **14d:** con cupo libre, `CONFIRMED` con `late = true` y 5 entradas, sin tocar el pago; sin cupo, `NO_CHANGE` con el mismo motivo; con captura distinta, `REVIEW_REQUIRED` por `UNSUPPORTED_GATEWAY_STATE`; lo comprometido nunca supera la capacidad. **14e:** reserva `EXPIRED` con pago `ORDER_CREATED` y captura coincidente (`L-10`/`L-11`): con las tres condiciones tardías, `CONFIRMED` (`late = true`); si falla alguna, `REVIEW_REQUIRED` con su motivo, el pago `CAPTURED` y 0 entradas; el resultado es el mismo con cualquier origen. | 14, 14c → 04; **14d y 14e en 08**; 04 TX-09 (L-10 a L-13) |
| T-PAG-15 | 15a, 15b. | Oferta no abierta o iniciada; una retención vigente se confirma aunque la oferta esté suspendida (D-42). | → 04 TX-09.8 |
| T-PAG-16 | Reserva `CONFIRMED` con instantáneas `K1`, `K0`, `K2`, `K4`. | Siempre `ALREADY_CONFIRMED`; nada cambia salvo el evento. | → 04 TX-09.8 |
| T-PAG-17 | 17a, 17c, 17d, 17e y los casos (a), (b) de TX-09.8. | Una contradicción con la instantánea no se registra (200 `pending`); una `CONFIRMED` no se degrada; aviso de reembolso en auditoría. | → 04 TX-10.9 y TX-09.8 |
| T-PAG-18 | 18a a 18g. | Margen de 30 s tomado tras el bloqueo; 0 llamadas a la pasarela en los rechazos. | → 04 TX-07.7 y TX-08.7 |
| T-PAG-19 | 19a a 19e. | Solo consulta (nunca captura); no libera con una instantánea `DECLINED`; permisos. | → 04 TX-11.9 |
| T-PAG-20 | 20a a 20j. **20k (I):** tras el agotamiento (como 20d: `REVIEW_REQUIRED`, `RECONCILE_EXHAUSTED`) llega un webhook válido `COMPLETED`; otra variante, el administrador consulta con `COMPLETED`; otra, con una captura `DECLINED`. | → 04 TX-11.9. **20k:** el caso escalado **se aplica**: `CONFIRMED` (`late = true` si la retención venció), 5 entradas, `lastErrorCode` nulo, `nextCheckAt = NULL`, intento cerrado, 1 `AuditEvent` de confirmación; con `DECLINED`, `NO_CHANGE` y el caso sigue escalado. Demuestra que escalar no equivale a cerrar. | → 04; 20k en 08 |
| **T-PAG-21** | **21a (K):** el adaptador PayPal contra respuestas **grabadas** (hoy solo existen las del `fake`; las de Sandbox, no): creación con enlace de aprobación; captura `COMPLETED`, `PENDING`, `DECLINED` y por instrumento rechazado; orden `APPROVED` sin captura; 4xx no reconocido; 5xx; tiempo agotado; `DUPLICATE_INVOICE_ID`; importe como texto decimal (`"12.34"`); orden o captura sin `custom_id`; verificación de firma válida, inválida y con el verificador caído. | Cada respuesta se traduce al tipo del puerto: **4xx no reconocido y tiempo agotado ⇒ `UNCERTAIN`, nunca rechazo**; 5xx ⇒ `UNAVAILABLE`; `DUPLICATE_INVOICE`; el importe pasa a centavos enteros exactos (sin coma flotante); firma inválida ⇒ `INVALID`, verificador caído ⇒ `UNAVAILABLE` (no 400, H-49); ningún dato personal en los argumentos. **Con respuestas reales de Sandbox se sustituyen** y se anota la fecha. | 08; RF-24; 05 §6.2 |
| T-PAG-22 | Webhook de orden desconocida, sin orden y de tipo no suscrito. | 200 e ignorado; auditoría solo del que viene sin orden. | → 04 TX-10.9 |
| T-PAG-23 | 23a a 23c. | Cierre del rechazo; reintento con clave nueva; si el cierre no se escribe, reanuda con la misma. | → 04 TX-08.7 |
| **T-PAG-24** | **Manual (M), solo en un despliegue alcanzable por PayPal y con credenciales de Sandbox (Q-08).** Preparación: aplicación REST de Sandbox, una cuenta *business* y una *personal*, un webhook suscrito a los tipos del MVP, `PAYMENT_PROVIDER=paypal`. Pasos: (1) compra completa con la cuenta personal; (2) repetir «Pagar» con la misma reserva; (3) cancelar en PayPal y volver; (4) recibir el webhook **real** de la captura; (5) reenviarlo desde el panel de PayPal; (6) enviar una firma alterada; (7) provocar un rechazo del medio de pago si Sandbox lo permite; (8) cortar la red tras capturar si es posible. Anotar solicitud, respuesta y cabeceras de cada paso **sin credenciales**. | (1) `CONFIRMED` y N entradas. (2) misma URL, sin segunda orden; se anota **si PayPal devuelve la misma orden**. (3) sin cambios y con reintento posible. (4) el webhook pasa la **verificación por *postback***: es la **única** prueba de esa ruta. (5) `DUPLICATE_EVENT`. (6) 400 y auditoría. (7) `PAYMENT_DECLINED` o `PAYMENT_NOT_APPROVED`, con la forma real del error registrada (cierra la duda de 05 §6.2). (8) la conciliación o «Consultar pasarela» lo resuelve. Se anotan además: retención real de la clave, vida útil de una orden, longitud de `PayPal-Request-Id` y plazo de respuesta del webhook. **Estado: pendiente de credenciales (Q-08, R-14).** Hasta ejecutarla, la verificación real y la columna derecha de §3.4.1 no están demostradas. | 08; 04 §5.2, TX-10.9; P4-06 |
| **T-PAG-25** | Playwright sobre el build de producción (`turismo_e2e`, `fake`). 1) `turista.ana` retiene una reserva y pulsa «Pagar»; el navegador va a `/pasarela-simulada/[orderId]` (aviso «Pasarela simulada» visible); «Aprobar»; vuelve a la página de retorno («Confirmando tu pago…»). 2) Ve la reserva confirmada y sus entradas. 3) Otra reserva: «Cancelar» en el `fake` y reintento. 4) Otra: acelerar el reloj hasta quedar menos de 30 s de retención y pulsar «Pagar». | 1 y 2: `CONFIRMED` y entradas visibles solo tras la captura; el resultado se anuncia en una región de estado. 3: reserva `HELD`, mensaje y «Reintentar pago». 4: `HOLD_EXPIRED` claro y sin salir a la pasarela. La interfaz no pide datos de tarjeta ni tiene importes editables; trazas con datos ficticios; la prueba **no** prueba PayPal (T-PAG-24). Comprobaciones manuales asociadas: MC/MP de pagos de 07 §7.1 (se asocian a `T-A11Y-nn` en §3.7). | 08; RF-24 a 26; 05 §2 |
| T-PAG-26 | 26a a 26d. | 200 `pending` con trabajo escrito, o 503; nunca 400 por verificación no disponible; la conciliación lo aplica sin reentrega. | → 04 TX-10.9 |

**Pendiente de esta área:** ninguna prueba de `T-PAG` está ejecutada; T-PAG-24 depende de Q-08 y T-PAG-21 de respuestas grabadas que no existen. Siguen por decidir el calendario de conciliación (TX-11.2) y los nombres reales de Prisma y de las restricciones (§3.4.2). Las pruebas de entradas (`T-ENT`) siguen en §3.5.

### 3.5 Entradas — `T-ENT`

| ID | Qué demuestra | Nivel | Requisitos |
|---|---|---|---|
| T-ENT-01 | Cinco asistentes producen cinco tokens distintos; hash único; el cifrado se descifra y depende del id de la entrada. | U, I | RF-30, RS-15 |
| T-ENT-02 | La emisión es idempotente. | I | RS-14 |
| T-ENT-03 | Solo el comprador con reserva confirmada obtiene el QR; un tercero recibe 404; respuesta `no-store`. | I, E | RF-31, RS-07 |
| T-ENT-04 | El token no aparece en URL ni en registros. | I, E | RS-16 |
| T-ENT-05 | Consultar no consume. | I | RA-05 |
| T-ENT-06 | Registrar el ingreso consume una vez; con la oferta suspendida o archivada el ingreso sigue permitido y se aplican las demás condiciones (subcasos 06a a 06e, D-79). | I, C, E | RS-17, RF-33 |
| T-ENT-07 | Dos registros simultáneos: un ingreso; las otras cuatro entradas siguen válidas (subcasos 07a a 07d). | C | RS-17 |
| T-ENT-08 | Un operador de otra atracción no puede consultar ni consumir. | I | RF-33, RS-07 |
| T-ENT-09 | Actividad seleccionada distinta: `WRONG_ACTIVITY`. | I | RF-33 |
| T-ENT-10 | Fuera de la ventana: `OUTSIDE_CHECKIN_WINDOW`. | I | RF-33 |
| T-ENT-11 | Código desconocido o mal formado: respuesta genérica; límite de consultas. | I | RS-30 |
| T-ENT-12 | Rotación de clave: lo cifrado con la anterior se lee y se recifra. | I | RS-15 |
| T-ENT-13 | Cancelar tras consultar deja la entrada sin consumir. | E | RA-05 |
| T-ENT-14 | Ingreso completo pegando el código, solo con teclado. La cámara se comprueba manualmente. | E, M | RF-32, RA-04 |
| T-ENT-15 | `USED` es terminal (disparador). | I | INV-06 |

#### 3.5.1 Preparación y comprobaciones comunes de `T-ENT` (redactado el 2026-11-16)

**Estado: ninguna de estas pruebas está escrita ni ejecutada.** Qué trae 04: **TX-09** especifica la emisión con tabla de pasos y aserciones (T-PAG-05, 06a, 06b, 07a, 07b; T-1 de 03 §4.5: una `Ticket` por `Attendee`, en la transacción de confirmación). **TX-12** fija las reglas, el orden de comprobación, la escritura atómica, la concurrencia y los subcasos nuevos **T-ENT-06a/06b**, pero **solo nombra** las pruebas clave: no trae tabla de preparación y aserciones. Por eso §3.5.3 **remite a TX-09 y TX-12 para las reglas y los códigos** y 08 **escribe** la preparación, las acciones y las aserciones de T-ENT. T-ENT-06a/06b **no estaban en el catálogo**: se añaden aquí (§3.5.3) con los demás subcasos.

| Dato o paso | Contenido |
|---|---|
| **ENT-D1 Entorno** | Como RES-D1 (`turismo_test`, servicios con principal y reloj falso `T0`, `JOBS_ENABLED=false`), con el llavero de pruebas de ENT-D2. Limpieza como CTA-D4, incluidas `Ticket`, `Payment` y `PaymentEvent`. |
| **ENT-D2 Llavero** | `TICKET_KEYRING="k1:<32 bytes fijos>,k2:<32 bytes fijos>"`, `TICKET_ACTIVE_KEY_ID=k1`; claves de **prueba**, nunca las reales. Ayudante de prueba `descifrarToken(ticketId)` (solo en `tests/`) que usa el llavero de pruebas. |
| **ENT-D3 Cuentas** | `turista.ana` (compradora), `turista.beto` (ajeno), `operador.laguna` (atracción 1), `operador.cascada` (atracción 2), `gad.sanisidro`, `admin`, `dual` (`GAD` y `OPERATOR` de la atracción 1). |
| **ENT-D4 Fábrica de entradas** | `sembrarEntradas({ cantidad: 5, oferta, estadoOferta })`: lleva la oferta de la atracción 1 a «en curso» (`startsAt = T0 − 1 h`, `endsAt = T0 + 3 h`; como PE-04 de 03 §9) y confirma una reserva de `cantidad` asistentes **usando `settlePayment`** (la emisión real de TX-09, no SQL). Devuelve `{ reservaId, ticketIds[], tokens[] }` con los tokens obtenidos con `descifrarToken`. `estadoOferta` aplica después `OPEN`, `SUSPENDED` o `ARCHIVED` con los servicios de T-OFE-15 y T-OFE-16. |
| **ENT-D5 Ventana** | Por defecto `CHECKIN_EARLY_MINUTES = 0`; variante con 30. La ventana es `[startsAt − early, endsAt]` con los **dos extremos incluidos** (03 §4.6, TX-12); si 03 fijara otra frontera, se ajustan 10b y 10c. |
| **ENT-D6 Token centinela** | Un `TC1.…` conocido y uno con formato inválido que se usan como valores buscables en registros, auditoría, URL y cabeceras (T-SEG-05 los reutiliza). |
| **ENT-D7 Barrera** | `barrera.ticket(ticketId)`: `ctrl` hace `BEGIN; SELECT … FROM "Ticket" WHERE id = $1 FOR UPDATE` (§2); más `lanzar`, `esperarBloqueadas(n)` y `liberar()`. |
| **PC-ENT-1 Sin cambios** | Antes y después de una consulta o un rechazo, todas las filas `Ticket` de la reserva son idénticas (`status`, `usedAt`, `usedById`, `tokenHash`, `tokenCiphertext`, `tokenNonce`, `tokenKeyId`). |
| **PC-ENT-2 Auditoría sin secretos** | `ticket.lookup`, `ticket.check_in` y `ticket.reveal_code` solo con su metadato cerrado (`offerId` o `reservationId`, 03 §3.4.2); **nunca** token, hash, nombre ni fecha de nacimiento. `resourceId` solo si la entrada existe y es de su ámbito. |
| **PC-ENT-3 Sin token en claro** | Tras cada prueba de esta área la búsqueda del token centinela en `AuditEvent`, `PaymentEvent`, filas `Ticket` (excepto la copia cifrada, que no lo contiene en claro), registros capturados, URL y cabeceras de las peticiones: **sin resultados**. |
| **PC-ENT-4 Una por asistente** | Para toda reserva `CONFIRMED`: `count(Ticket) = count(Attendee)` y un `Ticket` por `attendeeId`; para toda reserva no `CONFIRMED`: 0 entradas. Calculado con SQL de la prueba. |

#### 3.5.2 Qué queda sin decidir

- **Longitud de la copia cifrada:** 03 §3.3 fija `octet_length(tokenCiphertext) = 48` **si se cifran los 32 bytes brutos** y 63 si se cifra el texto `TC1.…`; 05 §7 no lo decide (P4-02). T-ENT-01b comprueba la longitud que decida P4-02 y la del `CHECK`: hasta entonces la cifra es **por confirmar**.
- Que el ingreso exija o no una consulta previa en el servidor: TX-12 no la exige (la separación es de la interfaz); 06e asume que `checkInTicketAction` puede llamarse sin `lookupTicketAction`. Si se decidiera exigirla, cambia 06 y 07.
- Frontera de la ventana (`startsAt − early` y `endsAt` incluidos): se asume inclusiva según 03 §4.6; por confirmar.
- Umbral del límite de 30 consultas por minuto (A-30): es **propuesta** (06 §3.2).
- `T-ENT-14` con cámara y la reemisión (`scripts/reissue-tickets.ts`, A-35) son pruebas manuales o de operación; la prueba de reemisión **no estaba** en el catálogo y se añade como 12b.

#### 3.5.3 Acción y resultado por prueba

*«→ 04» = reglas y códigos de ese apartado; las acciones y aserciones de esas filas las escribe 08 si 04 no las trae. Lo que añade 08 va en negrita.*

| ID | Acción | Resultado esperado | Detalle |
|---|---|---|---|
| T-ENT-01 | **01a (U):** generar 1000 tokens. **01b (U):** cifrar y descifrar: con su `ticketId`; con otro `ticketId` como dato asociado; con un byte del cifrado o de la etiqueta alterado; con `tokenKeyId` desconocido; con el *nonce* de otra fila. **01c (I):** `sembrarEntradas` con 1, 5 y 10 asistentes, y reservas `HELD`, `EXPIRED` y `REVIEW_REQUIRED`. **01d (I):** volcar `Ticket`, `AuditEvent` y `PaymentEvent` como texto y buscar los tokens. | **01a:** formato `TC1.` + 43 caracteres base64url (47); decodifican a 32 bytes; ninguno repetido; `tokenHash` = SHA-256 de los 32 bytes en hexadecimal (64 caracteres). **01b:** descifra solo con el mismo `ticketId` y la clave indicada; cualquier alteración o clave desconocida falla con error de autenticación, sin devolver bytes parciales; los *nonce* de 12 bytes son distintos. **01c:** exactamente una entrada por asistente (`attendeeId` distinto), todas `VALID`, con `tokenHash` y copia cifrada distintos y `tokenKeyId = k1`; la longitud de la copia cumple el `CHECK` (por confirmar, §3.5.2); las reservas no confirmadas: 0 entradas; PC-ENT-4. **01d:** ningún token en claro en la base (cierra la «Falta» de A-34). | 08; 04 TX-09.8 (T-PAG-05, 06a); 03 §3.3, 05 §7 |
| T-ENT-02 | **02a (I):** repetir `settlePayment` tras la confirmación (CAPTURE, WEBHOOK, RECONCILER y ADMIN). **02b (I):** forzar un segundo `issueTicketsInTx` para la misma reserva (defecto simulado). **02c (C):** 06a y 06b de TX-09. | **02a:** `ALREADY_CONFIRMED`; los ids, `tokenHash`, `tokenCiphertext` e `issuedAt` no cambian; 5 entradas, no 10; 1 auditoría `reservation.confirm`. **02b:** la inserción en lote **no ignora duplicados** (T-1 de 03 §4.5): falla por la unicidad de `attendeeId` y **revierte toda la transacción** (la reserva no queda `CONFIRMED`, 0 entradas nuevas). **02c:** → 04. | **02c** → 04 TX-09.8 (06a, 06b, 07a, 07b); 02a y 02b en 08 |
| T-ENT-03 | **03a (I):** `ana` pide `GET /api/entradas/[ticketId]/qr` de cada una de las 5 entradas, con y sin `?descarga=1`. **03b (I):** la misma petición como `beto`, `operador.laguna`, `gad.sanisidro`, `admin`, sin sesión, con un `ticketId` inexistente y con un valor que no es UUID. **03c (I):** `revealTicketCodeAction` como `ana`, `beto`, `operador.laguna`, `gad.sanisidro` y `admin`. **03d (E):** como `ana`, abrir la reserva, ver los QR y descargar uno; en otro contexto, `beto` abre la URL de esa imagen. **03e (I):** tras 03a, 03c y 03d, leer las entradas. **03f (I, D-79 del comprador; contrato desde el 2026-11-16):** con la reserva de `ana` confirmada, el operador suspende la oferta y se repiten 03a y 03c; después el GAD la archiva y se repiten otra vez. | **03a:** 200 `image/png`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`; sin `Content-Disposition` salvo con `descarga=1` (`attachment`); la imagen decodificada con un lector de QR de pruebas **es el token** de esa entrada (el que da `descifrarToken`); cinco imágenes distintas. **03b:** un 404 **idéntico en cuerpo y cabeceras** para las ajenas, la inexistente y la malformada, sin imagen ni dato alguno; sin sesión (sin cookie, o con sesión revocada o vencida), 401 `UNAUTHENTICATED` con `no-store` (05 §4). Rol `OPERATOR`, `GAD` o `ADMIN` **no** conceden acceso. **03c:** `ana` recibe `{ code: 'TC1.…' }` con `no-store`; `beto`, `NOT_FOUND`; los demás roles, `FORBIDDEN`; `ticket.reveal_code` auditado con solo `reservationId` y **sin** el código (PC-ENT-2). **03d:** `beto` recibe 404; cada QR muestra el nombre del asistente; el texto alternativo no contiene el token. **03e:** las cinco entradas siguen `VALID` y sin `usedAt`: **descargar o mostrar el QR no consume** (PC-ENT-1). **03f:** con la oferta `SUSPENDED` y con `ARCHIVED`, `ana` obtiene lo mismo que en 03a y 03c y `beto` recibe 404: el estado de la oferta no cambia el acceso (PLAN F2, 05 §4). | 08; RF-31, RS-07; 05 §3 y §4 |
| T-ENT-04 | **04a (I):** recorrer `lookup`, `checkIn`, QR y `reveal` con el token centinela, incluidos los errores (formato inválido, ajena, `WRONG_ACTIVITY`) y un defecto interno inyectado en `checkIn`. **04b (E):** el mismo recorrido en el navegador, registrando todas las peticiones, redirecciones, `Referer`, el historial y la consola. | **04a:** el centinela, válido o inválido, **no** aparece en registros (incluido el de error con `requestId`), `AuditEvent` ni mensajes de error. **04b:** el token solo viaja en el **cuerpo** de los `POST` y en la respuesta de `reveal`; ninguna URL, `Referer`, entrada del historial ni mensaje de consola lo contiene; el campo de pegado no usa `autocomplete` ni se guarda en `localStorage`. PC-ENT-3. | 08; RS-16, RS-20 |
| T-ENT-05 | **05a:** `operador.laguna` ejecuta `lookupTicketAction` sobre una entrada `VALID` de su actividad, tres veces seguidas; después `checkIn`. **05b:** consulta de una entrada ya `USED`. **05c (E):** pegar el código o leer el QR con la cámara simulada (vídeo de prueba) y no pulsar «Registrar ingreso». | **05a:** `{ attendeeName, status: 'VALID', usedAt: null, offerTitle, startsAt, endsAt }` con **exactamente** esas claves (ni fecha de nacimiento ni `tokenHash`); la entrada sigue `VALID` tras cada consulta (PC-ENT-1); una auditoría `ticket.lookup` por consulta; el `checkIn` posterior tiene éxito. **05b:** `status: 'USED'` con su `usedAt`, sin cambios. **05c:** la cámara se detiene tras leer, la interfaz no llama a `checkIn` y la entrada sigue `VALID`: **escanear o consultar nunca consume**. | → 04 TX-12 (T-ENT-05); acciones y aserciones en 08; 07 §4.6 |
| T-ENT-06 | **06 (I):** `checkInTicketAction` de una entrada `VALID` en curso, como `operador.laguna`; repetirlo. **06e (I, añade 08):** llamar a `checkIn` **sin** consulta previa. Los subcasos por estado de la oferta son T-ENT-06a a 06d (filas siguientes). | **06:** `{ attendeeName, usedAt = now }`; en la base `USED`, `usedAt = now`, `usedById` = el operador; las otras 4 siguen `VALID`; `AuditEvent ticket.check_in` `SUCCESS` con solo `offerId` (PC-ENT-2). La repetición: `TICKET_ALREADY_USED` con el **mismo** `usedAt`, sin cambios ni nuevo `SUCCESS`. **06e:** tiene éxito (el servicio no exige la consulta; la separación es de la interfaz, §3.5.2). | → 04 TX-12 (T-ENT-06); acciones y aserciones en 08 |
| **T-ENT-06a** | **Oferta `SUSPENDED` (D-79).** `sembrarEntradas` con `estadoOferta = SUSPENDED`; actividad en curso. Como `operador.laguna`: `lookup` y después `checkIn` de la entrada 1. Luego **las demás condiciones**, cada una aislada y repetida con `SUSPENDED`: (i) `offerId` de otra actividad; (ii) entrada de la atracción 2 (`operador.cascada` la consulta); (iii) `T0 + 3 h + 1 ms` y `T0 − 1 h − 1 ms` (fuera de la ventana); (iv) entrada ya `USED`; (v) usuario `ana`, `gad.sanisidro` y `admin`; (vi) formato inválido. Variante **06a2**: `lookup` y `checkIn` repetidos. | La consulta y el ingreso **tienen éxito** igual que con la oferta `OPEN` (`SUSPENDED` no es condición de ingreso: 05 §3 («Estado de la oferta (D-79)») y TX-12); la entrada pasa a `USED`; la reserva, el pago y las demás entradas no cambian; el estado de la oferta no cambia. Las condiciones restantes **se siguen aplicando**: (i) `WRONG_ACTIVITY`; (ii) `TICKET_NOT_FOUND` idéntico a «no existe»; (iii) `OUTSIDE_CHECKIN_WINDOW`; (iv) `TICKET_ALREADY_USED`; (v) `FORBIDDEN`; (vi) `TICKET_NOT_FOUND`. PC-ENT-1 en los rechazos. | 08; **nuevo en 04 TX-12**; D-79 |
| **T-ENT-06b** | **Oferta `ARCHIVED` (D-79).** Igual que 06a con `estadoOferta = ARCHIVED` (archivada por el GAD con la actividad en curso y entradas emitidas). Añade: **06b1** archivar una oferta cuya actividad **ya terminó** (`endsAt` pasado) y consultar; **06b2** reservas **no** confirmadas de la misma oferta (`EXPIRED`, `HELD` vencida) sin entradas. | Mismos resultados que 06a: consulta e ingreso con éxito dentro de la ventana y las demás condiciones aplicadas. **06b1:** `OUTSIDE_CHECKIN_WINDOW` (archivar no abre ni amplía la ventana). **06b2:** no hay entrada que consultar: el token de otra oferta da `TICKET_NOT_FOUND`; archivar no creó ni invalidó entradas (PC-ENT-4). La versión de trabajo inerte no influye. | 08; nuevo en 04 TX-12; T-OFE-16 |
| **T-ENT-06c** | **Cambio de estado entre consultar y registrar.** `lookup` con la oferta `OPEN`; **suspender** (T-OFE-15) y `checkIn`; repetir con **archivar**; y a la inversa (oferta `SUSPENDED`, consulta, reanudar, registro). **06c2 (C):** `lanzar(checkIn)` mientras otra transacción suspende o archiva, con `barrera.offer`. | El resultado de `checkIn` **no cambia** con el estado (éxito dentro de la ventana): no comparten bloqueo (TX-12); con `barrera.offer` tomada el `checkIn` **se completa sin esperar** (no toma el bloqueo de `Offer`; no aparece ninguna sesión bloqueada); en ambos órdenes la entrada queda `USED` una vez. | **Nuevo en 04 TX-12** (suspender entre consultar y registrar) |
| **T-ENT-06d** | **Selector de actividad (D-79).** Operador de la atracción 1 con ofertas: `OPEN` sin entradas; `OPEN` con entradas; `SUSPENDED` con entradas; `SUSPENDED` sin entradas; `ARCHIVED` con entradas (todas ya `USED`); `ARCHIVED` sin entradas; una `OPEN` de la atracción 2; y una oferta futura. **06d1 (I):** consultar la lista de `/panel/ingresos`. **06d2 (E):** recorrer `/panel/ingresos` y abrir `/panel/ingresos/[offerId]` de cada una, y de la atracción 2. | **06d1:** aparecen las `OPEN` de **sus** atracciones (con o sin entradas) y las `SUSPENDED`/`ARCHIVED` **con al menos una entrada emitida** (aunque estén todas usadas); no aparecen las `SUSPENDED`/`ARCHIVED` sin entradas ni las de la atracción 2; la lista **no** se filtra por ventana horaria (07 §4.6). Conteo «N usadas de M emitidas» correcto. **06d2:** las dos últimas filas muestran «Ventas cerradas; el ingreso sigue permitido para entradas ya emitidas» y el lector funciona con aviso, sin bloqueo; `/panel/ingresos/[offerId]` de la atracción 2 o de una oferta excluida de la lista por su atracción: 404. Consultar y registrar son dos botones distintos. | 08; 05 §2; 07 §4.6 |
| T-ENT-07 | **07a (C):** `sembrarEntradas` de 5; `barrera.ticket(t1)`; `lanzar` dos `checkIn` de `t1` por **operadores distintos** (`operador.laguna` y `dual`); `esperarBloqueadas(2)`; `liberar()`. **07b (C):** igual con el **mismo** operador (doble clic) y con tres llamadas. **07c (C):** cinco `checkIn` a la vez sobre cinco entradas distintas de la reserva. **07d (C):** `checkIn` simultáneo con una `lookup` de la misma entrada. | **07a:** exactamente **una** respuesta de éxito y las demás `TICKET_ALREADY_USED` con el **mismo `usedAt`**; una sola fila `USED` con ese `usedAt` y su `usedById`; **una** auditoría `ticket.check_in` `SUCCESS`; las otras cuatro entradas `VALID`; vale con cualquier ganador (PC-ENT-1 salvo la `USED`). **07b:** igual (una sola operación registra la entrada). **07c:** las cinco tienen éxito, una vez cada una; no hay interbloqueo ni `BUSY_TRY_AGAIN`. **07d:** la consulta no cambia el resultado: devuelve `VALID` o `USED` coherentes y nunca un estado mixto. | → 04 TX-12 (T-ENT-07, «doble escaneo»); preparación y aserciones en 08 |
| T-ENT-08 | **08a:** `operador.cascada` (atracción 2) consulta y registra una entrada de la atracción 1; y también una entrada inexistente. **08b:** `dual` en la atracción 1 con una entrada de la 1; **08c:** `gad.sanisidro` y `admin` sin rol de operador. **08d:** `operador.cascada` abre `/panel/ingresos/[offerId]` de una oferta de la atracción 1. | **08a:** `TICKET_NOT_FOUND` **idéntico** (mensaje, código y forma) al de la inexistente, sin nombre del asistente, y sin cambios (PC-ENT-1); la auditoría usa `resourceId` solo si la entrada es de su ámbito (03 §3.4.2). **08b:** éxito. **08c:** `FORBIDDEN`. **08d:** 404. | → 04 TX-12 (T-ENT-08); acciones en 08 |
| T-ENT-09 | Entrada de la oferta A consultada y registrada con `offerId` de la oferta B de la misma atracción, y con el de una oferta de otra atracción. | `WRONG_ACTIVITY` si la entrada es de su atracción (no se revela otra cosa); si la entrada no es de su atracción, `TICKET_NOT_FOUND` **antes** (la comprobación 1 va antes de la 2). La entrada sigue `VALID`; auditoría `CONFLICT`. | → 04 TX-12; acciones en 08 |
| T-ENT-10 | **10a:** reloj en `startsAt − 1 ms`, `startsAt − 30 min`, `startsAt`, `endsAt` y `endsAt + 1 ms` con `early = 0`. **10b:** con `early = 30`: `startsAt − 30 min − 1 ms`, `startsAt − 30 min`. **10c:** el reloj avanza entre consultar y registrar (consulta dentro de la ventana, registro con `endsAt + 1 ms`). **10d:** reserva en una oferta `SUSPENDED` y una `ARCHIVED` con las mismas horas (D-79: la ventana se sigue aplicando). | **10a:** `OUTSIDE_CHECKIN_WINDOW` en `startsAt − 1 ms` y `endsAt + 1 ms`; éxito en `startsAt` y `endsAt` (extremos incluidos, por confirmar §3.5.2). **10b:** fuera en `−30 min − 1 ms`, dentro en `−30 min`. **10c:** el registro decide con **su** hora: `OUTSIDE_CHECKIN_WINDOW`; la entrada sigue `VALID`. **10d:** mismos resultados que con `OPEN`. Con `OUTSIDE_CHECKIN_WINDOW` se audita `CONFLICT` y no cambia nada. | → 04 TX-12 (T-ENT-10); acciones en 08 |
| T-ENT-11 | **11a:** 30 consultas con tokens inexistentes en un minuto (reloj falso) y la 31.ª; después una válida. **11b:** formatos mal formados: vacío, `TC1.`, 42 y 44 caracteres, caracteres fuera de base64url, `tc1.` en minúsculas, espacios alrededor, 10 000 caracteres, otro prefijo. **11c:** otro operador con el mismo minuto. **11d:** avanzar 60 s. | **11a:** a la 31.ª, `RATE_LIMITED` con espera indicada y auditoría; la **válida** también se rechaza dentro del mismo minuto (el límite es por operador). **11b:** el **mismo** `TICKET_NOT_FOUND` genérico que para «no existe», **sin consultar la base** (ninguna lectura de `Ticket` observable con el registro de sentencias de la prueba); sin eco del valor recibido; el de 10 000 caracteres se rechaza sin procesar y sin registrarse completo. **11c:** no afectado. **11d:** vuelve a admitir. Umbral **propuesto** (06 §3.2, A-30). | → 04 TX-12 (T-ENT-11); acciones en 08 |
| T-ENT-12 | **12a (I):** emitir con `k1`; añadir `k2`, activarla; ejecutar `rotate-ticket-key`; leer con `k2`. Repetirlo con la rotación interrumpida a la mitad. **12b (I, añade 08):** ejecutar `reissue-tickets` sobre una reserva con entradas `VALID` y una `USED`. | **12a:** las filas `VALID` pasan a `tokenKeyId = k2` con otro `tokenCiphertext` y otro *nonce*; el **token descifrado y su `tokenHash` no cambian** (lo ya descargado sigue validándose); las `USED` no se tocan (`tg_ticket_guard`); tras interrumpir, hay filas con `k1` y con `k2` y **ambas** se leen; repetir la rotación termina sin error (idempotente). Con `k1` retirada del llavero antes de terminar: error claro, sin pérdida de datos. **12b:** se generan tokens **nuevos** solo para las `VALID` (el `tokenHash` cambia) y la entrada `USED` no cambia; el token antiguo de una reemitida deja de validarse (`TICKET_NOT_FOUND`) y el nuevo se valida; ninguna auditoría contiene tokens. Cierra la «Falta» de A-35. | 08; RS-15; 05 §7; 03 §3.3 (`tg_ticket_guard`) |
| T-ENT-13 | Playwright (`turismo_e2e`, `fake`). `operador.laguna` en `/panel/ingresos/[offerId]`: pega el código, pulsa «Consultar» (ve nombre y «Entrada válida»), pulsa «Cancelar»; repite y sale de la página sin registrar; repite y cierra la sesión. | «Cancelar» limpia el código y el resultado **sin llamar al servidor** (no hay petición `checkIn`); la entrada sigue `VALID` en la base, sin `usedAt`; el foco vuelve al campo de código. Lo mismo al salir o cerrar sesión. | → 04 TX-12 (T-ENT-13); 08 escribe el recorrido; 07 §4.6 |
| T-ENT-14 | **14a (E):** solo con teclado, sin ratón: iniciar sesión como operador, abrir el selector, entrar a una actividad, pegar el código, «Consultar», «Registrar ingreso». **14b (E):** el mismo recorrido **sin JavaScript** (formulario por `POST`). **14c (E):** cámara denegada o inexistente (permiso rechazado en el contexto). **14d (M):** con una cámara real. | **14a/14b:** se completa el ingreso sin ratón y sin cámara; el orden del foco es lógico; el resultado se anuncia en una región `polite` sin mover el foco; «Registrar ingreso» tiene `aria-disabled` con su razón en texto cuando no procede. **14c:** el campo manual sigue visible y usable y aparece el aviso de cámara. **14d: comprobación manual** (cámara y QR reales en el teléfono del equipo, luz variable): **pendiente de ejecución** (se asocia a T-A11Y-05 en §3.7; MC/MP de 07 §7.1). | 08; RF-32, RA-04; 07 §4.6 |
| T-ENT-15 | **15a (I, `tc_app`):** `UPDATE` de una `USED` (cualquier columna); `UPDATE` de `VALID → USED` cambiando además `attendeeId` o `tokenHash`; `DELETE`; `UPDATE` `USED → VALID`. **15b (I):** `UPDATE` con `status = USED` y `usedAt` o `usedById` nulos. **15c (I, `tc_migrator`):** los mismos con el rol propietario. | Rechazados por `tg_ticket_guard` o `ck_ticket_state` (códigos `TC_…` o `23514` por fijar con 03 §8.4); la fila no cambia. **15c:** los disparadores siguen rechazando (el propietario no los desactiva salvo deliberadamente, M de 06 A-43). `USED` es terminal: no hay anulación en el MVP. | 08; INV-06, 03 §4.5; T-DB-01 comprueba los disparadores, aquí por el servicio y por `UPDATE` directo |

**Pendiente de esta área:** ninguna prueba de `T-ENT` está ejecutada; `14d` es manual. Por fijar fuera de 08: longitud de la copia cifrada (P4-02), frontera de la ventana (03 §4.6), umbral de 30 consultas por minuto (A-30) y si el servicio exige consulta previa (§3.5.2). **Alineaciones para otros documentos:** 04 TX-12 nombra T-ENT-06a/06b; 08 añade además 06c a 06e (cambio de estado entre consultar y registrar, selector, ingreso sin consulta), que 04 debería citar. 01 (RF-33) y 10 (P5-02) deberían citar T-ENT-06a a 06d.

### 3.6 Chat — `T-CHAT`

| ID | Qué demuestra | Nivel | Requisitos |
|---|---|---|---|
| T-CHAT-01 | *Handshake* sin cookie rechazado. | I | RS-18 |
| T-CHAT-02 | *Handshake* con otro `Origin` rechazado. | I | RS-18 |
| T-CHAT-03 | Un envío válido se persiste antes de emitirse y lo recibe otro cliente. | I | RF-34 |
| T-CHAT-04 | Texto vacío, de más de 500 caracteres o de tipo incorrecto: error sin persistir. | I | RS-19 |
| T-CHAT-05 | Deduplicación por autor e id de envío. | I | RS-19 |
| T-CHAT-06 | Límite de frecuencia. | I | RS-19 |
| T-CHAT-07 | Historial por cursor estable, hacia atrás y hacia delante. | I | RF-34 |
| T-CHAT-08 | Tras reconectar se recuperan los mensajes perdidos, sin duplicados. | I | RF-37 |
| T-CHAT-09 | Presencia de usuarios únicos con dos pestañas. | I | RF-35 |
| T-CHAT-10 | El aviso llega a quien está fuera del chat y no al autor. | I, E | RF-36 |
| T-CHAT-11 | Salir o restablecer la contraseña cierra los sockets abiertos. | I | RS-18 |
| T-CHAT-12 | Una sesión vencida pierde el socket. | I | RS-18 |
| T-CHAT-13 | El historial sobrevive al reinicio del servidor. | I | RF-34 |
| T-CHAT-14 | Un mensaje con marcado se muestra como texto. | E | RS-27 |
| T-CHAT-15 | Dos navegadores conversan y ven presencia. | E | RF-34, RF-35 |
| T-CHAT-16 | El historial HTTP exige sesión. | E | RS-18 |

#### 3.6.1 Preparación y comprobaciones comunes de `T-CHAT` (redactado el 2026-11-16)

**Estado: ninguna de estas pruebas está escrita ni ejecutada.** Qué trae 04: **TX-14** fija la validación de sesión (cookie y `Origin` al conectar, revalidación por evento, cierre por tres vías: inmediato, temporizador y barrido J3) y nombra T-CHAT-01, 02, 11 y 12 «con el puente desactivado, por barrido y por evento»; **TX-15** fija la cola por sala, la deduplicación y la persistencia antes de emitir y nombra T-CHAT-03 a 08 y 10, más el subcaso de **dos envíos concurrentes con el mismo `clientMessageId`**. Ni uno ni otro traen tabla de preparación y aserciones: §3.6.3 **remite a TX-14, TX-15 y 05 §5 para las reglas y códigos** y 08 escribe la preparación, la acción y el resultado.

| Dato o paso | Contenido |
|---|---|
| **CHAT-D1 Entorno** | Vitest con **servidor Socket.IO real en el mismo proceso** sobre `turismo_test` (puerto efímero) y clientes `socket.io-client`; reloj falso inyectado en la aplicación (límite de frecuencia, vencimiento de sesión) y temporizadores falsos para latido y barrido; `JOBS_ENABLED=false` y J3 invocado a mano (`ejecutarBarridoSockets()`). Intervalos de latido reducibles por configuración de prueba (propuesta para P6-01; los de 05 §5 son 25 s + 20 s). Los ayudantes de esta tabla son propuestas, no código existente. |
| **CHAT-D2 Cuentas y sesiones** | `turista.ana`, `turista.beto`, `turista.carla`, `operador.laguna`, `gad.sanisidro`, `admin`; cada una inicia sesión con el servicio de ingreso y obtiene su cookie **real** (TX-14); una cuenta puede tener **varias sesiones** (dos inicios). Cualquier usuario autenticado puede chatear (CU-21). |
| **CHAT-D3 Cliente de prueba** | `conectar(usuario, { sesion?, origin?, cookie? })` devuelve un cliente que registra cada evento recibido con su orden de llegada; `cliente.unirse()` (`chat:join`), `cliente.salir()`, `cliente.enviar({ clientMessageId, text })` (devuelve la confirmación), `cliente.caerRed()` (corta el transporte sin `chat:leave`). |
| **CHAT-D4 Esperas sin tiempos fijos** | `esperarEvento(cliente, nombre, n)` espera la condición «llegaron `n`». Para afirmar que **no** llegó algo se usa un **testigo**: tras la acción, otro usuario envía un mensaje conocido y se espera **su** `chat:message` en ese cliente; si el testigo llegó y lo anterior no, no llegó. Nunca `sleep`. |
| **CHAT-D5 Fábricas** | `sembrarMensajes(n, { autores })`: inserta `n` mensajes **con el servicio de envío** (ids reales y orden de la cola) o, para volúmenes grandes, con el rol migrador. `sesionVencida(sesion)`, `revocar(sesion)` (con el servicio) y `revocarEnBase(sesion)` (con `ctrl`, **sin** puente). |
| **CHAT-D6 Interferencias** | `puente.desactivar()` hace que `disconnectSession(s)` no haga nada; `emision.fallar()` hace que la emisión tras el `COMMIT` lance un error; `ctrl` inserta una fila de `ChatMessage` **sin confirmar** (como T-RES-08c). |
| **PC-CHAT-1 Nada sin persistir** | Un envío rechazado (validación, límite, sesión) no deja fila en `ChatMessage` ni emite `chat:message` ni `notification:new-message` (contados con el testigo de CHAT-D4). |
| **PC-CHAT-2 Una fila, una emisión** | Para cada `(authorId, clientMessageId)`: a lo sumo **una** fila y **un** `chat:message` por cliente receptor, en cualquier reintento. |
| **PC-CHAT-3 Contenido fuera de los registros** | El texto de los mensajes no aparece en `AuditEvent` (el chat no se audita, TX-15) ni en los registros capturados (valor centinela); `notification:new-message` y `presence:update` no llevan texto ni correo (solo `id` y `displayName`). |
| **PC-CHAT-4 Orden e ids** | Los `chat:message` llegan a cada cliente en **orden ascendente de `id`** y los `id` confirmados no tienen huecos salvo los de inserciones revertidas por duplicado (03 §3.4, H-31). |

#### 3.6.2 Qué queda sin decidir

TX-14, TX-15 y 05 §5 no fijan lo siguiente; las pruebas lo señalan y **no lo asumen**:

- **Límite de frecuencia** (5 mensajes cada 10 s por usuario, en memoria): si es ventana **fija** o **deslizante**; si cuentan los envíos rechazados por validación, los reintentos deduplicados y los de dos pestañas del mismo usuario (se supone un contador por **usuario**, no por socket); y qué pasa tras un reinicio (la memoria se pierde: limitación conocida). 06 §3.2 lista la cifra; sigue **por confirmar** como propuesta.
- **Confirmación cuando la emisión falla tras persistir** (¿`ok: true` o `INTERNAL_ERROR`?): TX-15 solo dice que el mensaje ya existe y que los demás lo recuperan por historial. 03b exige únicamente que el reintento con el mismo `clientMessageId` devuelva el existente.
- **Mismo `clientMessageId` con otro texto:** el pseudocódigo de TX-15 devuelve el mensaje original sin comparar el texto. 05b lo comprueba tal como está escrito; si se quisiera un conflicto (como `IDEMPOTENCY_KEY_REUSED` en reservas), cambia 04 y 05.
- **Parámetros del historial** (`limit` máximo, `limit` o cursor inválidos, `before` y `after` juntos): 05 §4 solo da ejemplos (30 y 100). 07d fija lo que se afirma y lo demás queda por fijar.
- **Precedencia entre `ORIGIN_MISMATCH` y `UNAUTHENTICATED`** cuando ambos fallan; **si el cierre por el puente emite `session:expired`**; si la insignia de la cabecera **se limpia** al abrir `/panel/chat`; y si la notificación es por **socket** (como dice 05 §5) o agregada por usuario. 
- Intervalos de latido y barrido (25 s + 20 s; 30 s) son los de 05 §5 y 04 TX-14: **propuestos**.

#### 3.6.3 Acción y resultado por prueba

*«→ 04» = reglas y códigos de TX-14 o TX-15 y de 05 §5; las acciones y aserciones las escribe 08 salvo donde se indique lo contrario. Lo que añade 08 va en negrita.*

| ID | Acción | Resultado esperado | Detalle |
|---|---|---|---|
| T-CHAT-01 | **01a:** conectar sin cookie; con cookie de formato inválido; con la cookie de una sesión **revocada**, de una **vencida** y de una inexistente (cada una con el `Origin` correcto y con transporte *polling* y *websocket*). **01b:** conectar con cookie válida y enviar `chat:join`. **01c:** tras una conexión rechazada, intentar emitir `chat:send` en el mismo cliente. | **01a:** `connect_error` con `UNAUTHENTICATED`; sin socket abierto, sin entrar en `user:` ni `session:`, sin recibir eventos y sin fila. **01b:** conexión aceptada; `chat:join` responde `{ ok: true, presence, lastMessageId }`; el socket cierra al llamar a `disconnectSession` de **su** sesión (prueba que está en `session:<sessionId>`). **01c:** el evento no se procesa (PC-CHAT-1). | → 04 TX-14, 05 §5; **01b y 01c** en 08 |
| T-CHAT-02 | **02a:** conectar con cookie válida y `Origin` de otro sitio, con el mismo anfitrión y otro puerto, con otro esquema, `null`, y sin `Origin`. **02b:** `Origin` correcto. | **02a:** `connect_error` con `ORIGIN_MISMATCH`; ninguno de los efectos de 01a. **02b:** conecta. Con **ambos** defectos (sin cookie y `Origin` ajeno) basta con que se rechace y sin efectos: cuál de los dos códigos sale está **por fijar** (§3.6.2). | → 04 TX-14, 05 §5 |
| T-CHAT-03 | **03a:** `ana` y `beto` unidos; `ana` envía; en el manejador de `chat:message` de `beto` se lee la base con `ctrl`. **03b:** `emision.fallar()`; `ana` envía; después `beto` pide el historial con `after`. **03c:** cuatro usuarios envían 20 mensajes a la vez. | **03a:** cuando `beto` recibe el mensaje, **la fila ya está confirmada y visible desde otra conexión** (persiste antes de emitir); la confirmación de `ana` es `{ ok: true, message }` con el **mismo** `id`, `text` y `createdAt` que el evento; la carga del evento tiene exactamente `{ id, author: { id, displayName }, text, createdAt, clientMessageId }`, sin correo (PC-CHAT-3). **03b:** el mensaje **existe** en la base; `beto` lo obtiene por el historial; si la confirmación fue error, reintentar con el mismo `clientMessageId` devuelve el existente sin duplicar (la forma de la confirmación está por fijar). **03c:** PC-CHAT-4 en cada cliente. | → 04 TX-15 (T-CHAT-03); acciones y aserciones en 08 |
| T-CHAT-04 | **04a:** texto `''`, `'   '`, `'\n\t'`, 501 puntos de código, 500 (válido) y 500 emojis (500 puntos de código: válido, 501: inválido). **04b:** tipos incorrectos: `text` número, `null`, objeto, arreglo y ausente; `clientMessageId` ausente, no UUID y número; carga de más de 16 KB. **04c:** texto con espacios al inicio y final y con una letra con tilde en forma NFD. | **04a/04b:** `{ ok: false, error: { code: 'VALIDATION_ERROR', requestId, … } }` con el campo; sin fila ni emisión (PC-CHAT-1); los límites válidos se aceptan; la carga de más de 16 KB cierra o rechaza el mensaje sin procesarlo y sin guardar. **04c:** se guarda **recortado y en NFC**; el recorte y la normalización los hace el servidor, no el cliente. Si los envíos rechazados cuentan para el límite de 06, **por fijar** (§3.6.2). | → 04 TX-15; 08 detalla los casos; 05 §5 |
| T-CHAT-05 | **05a:** `ana` envía con `clientMessageId` `X` y repite el mismo envío. **05b:** repetir `X` con **otro texto**. **05c:** `beto` envía con el mismo `X`. **05d (C):** `ctrl` inserta una fila `(ana, X)` **sin confirmar**; `lanzar(ana.enviar(X))`; `esperarBloqueadas(1)`; `liberar()`. **05e:** `ana` envía y corta la red antes de recibir la confirmación; reconecta y repite con `X`. | **05a:** una fila; la segunda confirmación `{ ok: true, message }` es el **mismo** mensaje (mismo `id`) y **no** se emite otro `chat:message` (PC-CHAT-2). **05b:** devuelve el mensaje original con su texto original (según TX-15; por confirmar, §3.6.2). **05c:** claves **por autor**: dos filas, dos emisiones. **05d:** la transacción choca en el índice único, **revierte**, relee con una consulta nueva y devuelve el existente; **no** `INTERNAL_ERROR` ni `25P02`; no emite; el *pool* sigue sano y sin sesiones `idle in transaction`. **05e:** una sola fila y, si el primer envío ya se había emitido, no se repite. | → 04 TX-15 (T-CHAT-05 y subcaso concurrente); acciones y aserciones en 08 |
| T-CHAT-06 | **06a:** `ana` envía 5 mensajes en `T0`, el 6.º en `T0 + 1 s` y el 7.º en `T0 + 11 s`. **06b:** `beto` envía en `T0 + 1 s`. **06c:** `ana` con dos pestañas (dos sockets) envía 3 + 3. **06d:** `ana` repite un mensaje ya guardado (deduplicado) cuando ya llegó al límite. | **06a:** el 6.º recibe `{ ok: false, error: { code: 'RATE_LIMITED', details: { retryAfterSeconds } } }` con un entero entre 1 y 10; sin fila ni emisión (PC-CHAT-1); el 7.º, aceptado (el borde exacto de los 10 s depende de ventana fija o deslizante: **por fijar**). **06b:** no afectado (el límite es por usuario). **06c:** el contador es **del usuario**, no del socket: el 6.º falla. **06d:** si el reintento deduplicado cuenta o no para el límite está **por fijar**; la aserción solo exige que no cree fila ni emita. | → 04 TX-15 (T-CHAT-06); 06 §3.2; 05 §5; acciones y aserciones en 08 |
| T-CHAT-07 | **07a:** `sembrarMensajes(75)`. `GET /api/chat/mensajes?before=<id>&limit=30` partiendo del último y repetir hasta `hasMore = false`. **07b:** `?after=<id>&limit=100` desde el mensaje 10. **07c:** entre dos páginas de 07a se insertan 5 mensajes nuevos. **07d:** `limit` = 0, 101, −1, `abc`; `before` y `after` no numéricos o juntos; sala sin mensajes. **07e:** respuesta y cabeceras. | **07a:** páginas de 30, 30 y 15, cada una en **orden ascendente**, sin repetir ni omitir ninguno entre páginas; `hasMore` verdadero salvo en la última. **07b:** hasta 100 mensajes con `id > 10`, ascendentes. **07c:** el cursor es **estable**: las páginas ya pedidas y las siguientes no se desplazan por los mensajes nuevos (no hay desplazamiento como con `OFFSET`). **07d:** sin 500; qué devuelve cada caso **por fijar** (§3.6.2); la sala vacía devuelve `messages: []` y `hasMore: false`. **07e:** 200 con `Cache-Control: no-store` y solo los campos de `chat:message`. | → 04 TX-15 (T-CHAT-07); 05 §4; acciones y aserciones en 08 |
| T-CHAT-08 | **08a (I):** `beto` conectado y unido con último `id` conocido `n`; cae la red; `ana` envía 3 mensajes; `beto` reconecta, se une y consulta `after=n`. **08b (U):** función de combinación del cliente `mezclar(visibles, recibidos)`: duplicados (el mismo `id` por evento y por historial), desorden, huecos y mensajes propios pendientes. **08c (I):** más de 100 pendientes (250) y `limit = 100`. **08d (I):** hueco por inserción revertida (05d): `chat:message` con `id > último + 1` cuyo hueco no tiene mensajes. **08e (I):** `emision.fallar()` y después reconexión. **08f (E):** Playwright con dos contextos; uno pasa a `setOffline(true)`, el otro envía 3 mensajes; vuelve la red. | **08a:** recibe exactamente los 3, una sola vez, en orden. **08b:** la lista visible queda **ordenada, sin repeticiones por `id`** y sin perder ninguno; un propio pendiente se empareja por `clientMessageId` tanto si llega el eco antes como después de la confirmación (no se muestra dos veces). **08c:** el cliente repite `after` con el último `id` recibido hasta `hasMore = false`: 250 mensajes, una vez cada uno. **08d:** el cliente pide el hueco **una vez**, no recibe nada nuevo y **no entra en bucle**; sin duplicados (los huecos revertidos son inocuos, 03 H-31). **08e:** los mensajes aparecen por historial. **08f:** pasa por «Reconectando» y luego «Conectado» (en texto); la lista (`role="log"`) contiene los 3 mensajes **una vez**, sin recarga y sin mover el foco; el número de mensajes visibles coincide con el de filas. | → 04 TX-15 (T-CHAT-08); 05 §5 «Recuperación»; acciones y aserciones en 08 |
| T-CHAT-09 | **09a:** `ana` abre la pestaña 1 y se une; abre la 2 y se une; cierra la 1; cierra la 2 (con `beto` unido como observador). **09b:** pestaña con `chat:leave` mientras la otra sigue. **09c:** `caerRed()` sin `chat:leave`, avanzando el latido (25 s + 20 s). **09d:** un socket **conectado pero no unido** a la sala. **09e:** `ana` con **dos sesiones** y un socket cada una; se cierra una sesión (T-CHAT-11a). **09f:** reinicio del servidor y reconexión. | **09a:** `presence:update` con `users: [{ id, displayName }]` y `count` sin repetir a `ana`: al unirse la 1.ª pestaña (0→1 socket) `beto` recibe `ana` y `count = +1`; **la 2.ª pestaña no genera cambio** (1→2); cerrar la 1.ª tampoco (2→1); cerrar la 2.ª (1→0) la quita. **09b:** sigue presente. **09c:** la desconexión abrupta se detecta tras el latido y `ana` desaparece de la presencia. **09d:** no cuenta como presente. **09e:** al cerrar una sesión, `ana` sigue presente por la otra. **09f:** la presencia se reconstruye cuando los clientes reconectan y se unen (mapa en memoria). Todas: la carga solo lleva `id` y `displayName` (PC-CHAT-3) y el recuento es de **usuarios únicos**. | → 05 §5 (Presencia); acciones y aserciones en 08 |
| T-CHAT-10 | **Notificación adicional del panel, separada del contenido y de la presencia.** Preparación: `ana` unida a `chat:general` (pestaña de chat); `ana` con una **segunda pestaña** del panel sin unirse; `beto` conectado **sin unirse** (otra pantalla del panel); `carla` unida; `operador.laguna` con sesión **revocada** pero socket aún abierto. **10a (I):** `ana` envía un mensaje. **10b (I):** `ana` envía con un `clientMessageId` repetido, uno inválido y uno rechazado por límite. **10c (I):** dos sockets de `beto` fuera de la sala. **10d (I):** cargas capturadas en el cable. **10e (E):** Playwright, `beto` en `/panel` y `ana` en `/panel/chat`. | **10a:** `beto` recibe **`notification:new-message`** `{ messageId, authorDisplayName, createdAt }` y **no** `chat:message`; `carla` recibe `chat:message` y **no** la notificación; **`ana` (autor) no recibe notificación ni en su pestaña sin unir** («que no son del autor»); la notificación llega **después** del `COMMIT`. **10b:** el reenvío deduplicado, el inválido y el limitado **no notifican** (PC-CHAT-1/2). **10c:** una notificación **por socket**, como dice 05 §5 (si debe agregarse por usuario, **por fijar**). **10d:** la notificación **no contiene el texto** ni el correo; `chat:message` no contiene nada de la notificación. **10e:** la insignia de la cabecera de `beto` muestra el texto («1 mensaje nuevo», «3 mensajes nuevos») **sin recargar**, sin robar el foco, y `ana` no ve insignia por sus propios mensajes; `beto` ve la lista **solo** al abrir `/panel/chat`. Si la insignia se limpia al abrirlo está **por fijar**. La caída de la emisión (`emision.fallar()`) no deja notificaciones de un mensaje que otros solo recuperan por historial: la notificación se pierde y el historial lo cubre. | → 04 TX-15 (T-CHAT-10); 05 §5 («no se confunden»); acciones y aserciones en 08 |
| T-CHAT-11 | **11a (I):** `ana` con dos sockets en la sesión S1 y uno en la S2; salir de S1 (TX-14) dos veces. **11b (I):** restablecer la contraseña de `ana` (TX-13). **11c (I):** `puente.desactivar()`; salir de S1; enviar desde un socket de S1; después `ejecutarBarridoSockets()`. **11d (I):** `revocarEnBase(S1)` (sin puente ni salida) y envío inmediato. | **11a:** los dos sockets de S1 se cierran **sin esperar al cliente** tras el `COMMIT`; el de S2 sigue conectado; la segunda salida es idempotente (mismo resultado). **11b:** se cierran **todos** los sockets de `ana` (`disconnectSessions`), de todas las sesiones, y el correo no los afecta. **11c:** sin puente, el envío de S1 devuelve `UNAUTHENTICATED`, se emite `session:expired` con `reason: 'revoked'`, el socket se desconecta y **no se guarda ninguna fila**; los demás sockets de S1 caen en el siguiente barrido (≤ 30 s). **11d:** la sesión revocada pierde el socket por la revalidación del evento (INV-14). Ningún mensaje de un socket revocado llega a la base. | → 04 TX-14 (T-CHAT-11, «con el puente desactivado, por barrido y por evento») y TX-13; acciones y aserciones en 08 |
| T-CHAT-12 | **12a:** `sesionVencida(S)` avanzando el reloj hasta `expiresAt`. **12b:** el temporizador por socket desactivado: avanzar 31 s y `ejecutarBarridoSockets()`. **12c:** temporizador y barrido desactivados; enviar un mensaje. **12d:** reconectar con la cookie vencida. | **12a:** el socket se cierra en `expiresAt` con `session:expired` (`reason: 'expired'`). **12b:** lo cierra el barrido J3 en el plazo de 30 s. **12c:** `UNAUTHENTICATED`, `session:expired`, desconexión y 0 filas. **12d:** `connect_error` `UNAUTHENTICATED`. En ningún caso un socket vencido guarda un mensaje; que reciba contenido durante la ventana de hasta 30 s antes del cierre es una **limitación conocida**, no un defecto (la garantía es de cierre y de rechazo de envío). | → 04 TX-14 (T-CHAT-12); acciones y aserciones en 08 |
| T-CHAT-13 | **13a:** `sembrarMensajes(40)`; detener y arrancar el servidor (nueva instancia sobre la misma base); consultar el historial y enviar un mensaje nuevo. **13b:** inyectar la caída entre el `COMMIT` y la emisión (`emision.fallar()` y reinicio); los clientes reconectan. **13c:** tras el reinicio, enviar 6 mensajes seguidos con `ana`. | **13a:** los 40 mensajes, con sus `id` y orden, siguen; el nuevo recibe un `id` **mayor** que todos; la presencia empieza vacía y se reconstruye al unirse. **13b:** el mensaje persistido existe y los clientes lo reciben por `after` al reconectar, una vez. **13c:** el límite de frecuencia **se reinició** (memoria): limitación conocida; no es una garantía a probar de otro modo. | → 04 TX-15 (INV-15) y 02 §13; acciones y aserciones en 08 |
| T-CHAT-14 | Playwright. `ana` envía, uno por uno: `<script>window.__x=1</script>`, `<img src=x onerror="window.__x=2">`, `**negrita**`, `[enlace](javascript:alert(1))`, `&amp; <b>`, y una cadena de 500 caracteres sin espacios. Además, un usuario con `displayName` `<i>Ana</i>`. | En el DOM de `beto` cada texto aparece **literal** (`textContent` igual al enviado); no hay elementos `img`, `b`, `i`, `a` ni `script` dentro del mensaje; `window.__x` queda sin definir; sin infracciones de CSP; el valor guardado coincide con el enviado (tras recorte y NFC); el nombre `<i>Ana</i>` también se ve como texto en el mensaje, en la presencia y en la insignia; la cadena larga no desborda horizontalmente la lista (ajuste de línea). | 08; RS-27; 04 TX-15 («texto plano») |
| T-CHAT-15 | Playwright, dos contextos (`ana` y `beto`) en `/panel/chat` sobre el build de producción. 1) Ambos se ven en la lista de presentes. 2) `ana` envía; `beto` responde. 3) Con `beto` sin red: `beto` envía → «Reintentar»; vuelve la red y reintenta. 4) Se llega a 500 caracteres. 5) Cada uno cierra sesión en otra pestaña. | 1: presencia sin repeticiones. 2: ambos ven los mensajes en el mismo orden; el propio pasa de «pendiente» a «confirmado». 3: «fallido» con «Reintentar» (mismo `clientMessageId`): **un solo** mensaje al final. 4: contador de 500 y bloqueo en el borde. 5: aparece «Tu sesión terminó», se anuncia sin robar el foco y la presencia se actualiza. La lista tiene `role="log"` y `aria-live="polite"`; el foco **sigue en el campo** al llegar mensajes; el estado de conexión es texto. Trazas con datos ficticios. Comprobaciones manuales asociadas: MC/MP del chat en 07 §7.1 (se asocian a `T-A11Y-nn` en §3.7). | 08; RF-34, RF-35; 07 §4.7 |
| T-CHAT-16 | **16a (I):** `GET /api/chat/mensajes` sin cookie, con la cookie de una sesión revocada y de una vencida, y con una válida. **16b (E):** abrir `/panel/chat` sin sesión. | **16a:** sin sesión válida, `UNAUTHENTICATED` (401, JSON con `no-store`, 05 §4); nunca mensajes; con sesión válida, 200 con `no-store`. **16b:** redirige a `/ingreso?next=%2Fpanel%2Fchat` y, tras ingresar, vuelve a `/panel/chat` (ruta permitida para `TOURIST`, regla `safeNext` de 05 §2). | 08; RS-18; 05 §4 |

**Pendiente de esta área:** ninguna prueba de `T-CHAT` está ejecutada. Por fijar fuera de 08 (todo en §3.6.2): semántica del límite de frecuencia, forma de la confirmación si falla la emisión, `clientMessageId` repetido con otro texto, parámetros del historial, precedencia entre `ORIGIN_MISMATCH` y `UNAUTHENTICATED`, `session:expired` desde el puente, limpieza de la insignia y notificación por socket o por usuario. También **propuestas para P6-01**: intervalos de latido reducibles y los ayudantes de CHAT-D1/D6. **Alineaciones:** 04 TX-14/TX-15 y 05 §5 deberían precisar esos puntos y citar 08 §3.6.3.

### 3.7 Transversales

| ID | Qué demuestra | Nivel | Requisitos |
|---|---|---|---|
| T-SEG-01 | Una mutación con `Origin` ajeno o ausente se rechaza. | E | RS-06 |
| T-SEG-02 | Cabeceras de seguridad y CSP con *nonce* presentes; sin errores de CSP en los recorridos. | E | RS-22 |
| T-SEG-03 | `no-store` en páginas privadas, QR e historial. | E | RS-21 |
| T-SEG-04 | Matriz de permisos automatizada: cada acción con cada rol y alcance. | I | RS-06, RS-07 |
| T-SEG-05 | Valores centinela (contraseña, tokens, QR) no aparecen en los registros. | I | RS-20, RS-16 |
| T-SEG-06 | Entradas con comillas y metacaracteres no alteran consultas. | I | RS-27 |
| T-SEG-07 | El rol de base de la aplicación no puede ejecutar DDL ni modificar auditoría. | I | RS-24 |
| T-SEG-08 | Entorno inválido impide arrancar; `fake` en producción prohibido. | U | RS-23 |
| T-SEG-09 | Revisión de dependencias sin vulnerabilidades altas o críticas sin justificar. | M | RS-28 |
| T-SEG-10 | Sin redirección abierta en `next`. | E | RS-27 |
| T-SEG-11 | Los eventos clave quedan auditados sin datos sensibles. | I | RF-38, RS-20 |
| T-SEG-12 | Atributos de la cookie de sesión. | E | RS-02 |
| T-SEG-13 | Respuestas de ingreso y recuperación indistinguibles. | I | RS-03 |
| T-DB-01 | Existen las restricciones, índices y disparadores añadidos a mano. | I | INV-02, 04, 06, 07, 09 |
| T-DB-02 | Las migraciones se aplican desde cero y la semilla es repetible. | I | RO-01 |
| T-OPS-01 | Arranque desde un clon limpio: HTTP y WebSocket responden en el mismo puerto. | E | RO-01, RO-02 |
| T-OPS-02 | `/api/salud` responde y refleja la caída de la base. | I, E | RO-09 |
| T-OPS-03 | Apagado ordenado ante `SIGTERM`. | I | RO-09 |
| T-OPS-04 | Las utilidades de prueba se niegan a actuar sobre una base que no sea de pruebas. | U | RO-03 |
| T-OPS-05 | Restauración de una copia de seguridad. | M | RO-09 |
| T-OPS-06 | Los trabajos se ejecutan al arrancar. | I | RO-11 |
| T-A11Y-01 | Análisis automático sin infracciones graves o críticas en las pantallas clave. | E | RA-02 |
| T-A11Y-02 | Formularios operables solo con teclado. | E | RA-02 |
| T-A11Y-03 | Errores asociados a sus campos y anunciados; foco en el resumen. | E | RA-03 |
| T-A11Y-04 | Regiones en vivo en chat y avisos. | E, M | RA-07 |
| T-A11Y-05 | Ingreso completable sin cámara. | E | RA-04 |
| T-A11Y-06 | Contraste suficiente. | E, M | RA-02 |
| T-A11Y-07 | Foco visible y bien gestionado tras enviar. | E, M | RA-02 |
| T-PERF-01 | Medición del catálogo filtrado (§7). | M | RE-03 |
| T-E2E-01 | Recorrido principal: GAD crea → operador aprueba → turista reserva 5 → paga → 5 QR → operador registra uno a uno → un segundo intento se rechaza. | E | RE-12 |

#### 3.7.1 Preparación y comprobaciones comunes de las pruebas transversales (redactado el 2026-11-16)

**Estado: ninguna de estas pruebas está escrita ni ejecutada.** Lo ya detallado en 08 se **reutiliza y se enlaza**, no se repite: cuentas (§3.1.2: T-CTA-04 a 16 y 20), ofertas (§3.2.2), reservas (§3.3.2), pagos (§3.4.3), entradas (§3.5.3) y chat (§3.6.3). T-DB-01 ya tiene sus subcasos fijados en [03 §8.7](03-datos-estados-e-invariantes.md). Lo que §3.7 añade es lo que cruza áreas: la matriz de permisos, la búsqueda de datos sensibles, los privilegios de base, la configuración, la operación y la accesibilidad. Los apartados son: §3.7.1 preparación común, §3.7.2 cobertura de la matriz de 06 §2, §3.7.3 controles propuestos o pendientes y lo que falta definir, §3.7.4 acción y resultado por prueba y §3.7.5 correspondencia de las comprobaciones manuales de 07 con `T-A11Y`.

| Dato o paso | Contenido |
|---|---|
| **SEG-D1 Entorno** | Como RES-D1 (`turismo_test`, servicios con principal y reloj falso `T0`); para E, el *build* de producción sobre `turismo_e2e` con el adaptador `fake`. Los roles de base de §3.7.4 (`tc_app`, `tc_migrator`) existen **solo en bases de pruebas**. |
| **SEG-D2 Principales** | Visitante (sin sesión); `turista.ana` (propietaria) y `turista.beto` (ajeno); `gad.sanisidro` (GAD 1) y `gad.colibries` (GAD 2); `operador.laguna` (atracción 1) y `operador.cascada` (atracción 2); `dual` (`GAD` y `OPERATOR` de la atracción 1); `admin`. |
| **SEG-D3 Recursos de la matriz** | Para cada principal, un recurso **propio**, uno **ajeno de su mismo rol** y uno **inexistente** (UUID aleatorio): ofertas del GAD 1 y 2 (inédita, `OPEN`, `SUSPENDED`, `ARCHIVED`), versiones `IN_REVIEW`, reservas de `ana` (`HELD`, `CONFIRMED`) y de `beto`, entradas de ambas, mensajes de chat. Se crean con las fábricas de §3.2 a §3.5. |
| **SEG-D4 Centinelas** | Valores únicos y buscables: contraseña, token de sesión, token de recuperación, token QR `TC1.…`, correo, nombre y fecha de nacimiento de asistentes, texto de chat, cabecera de firma y cuerpo del webhook, y **cada secreto de entorno** (`PAYPAL_CLIENT_SECRET`, `RATE_LIMIT_SECRET`, llavero, contraseñas de las URL de base, `FAKE_PAYMENT_WEBHOOK_SECRET`). `buscarCentinelas(ámbito)` los busca en: todas las columnas de texto y `BYTEA` de todas las tablas, el registro capturado del proceso, el cuerpo y las cabeceras de las respuestas, y los resultados de Mailpit. |
| **SEG-D5 Lista de lugares permitidos** | Cada centinela **sí** puede estar en un solo lugar: el correo en `User.email` y en el correo enviado; el nombre y la fecha de nacimiento en `Attendee` y en la respuesta a su comprador (nombre también en la consulta del operador); el texto en `ChatMessage` y `chat:message`; el token QR solo en el cuerpo de las respuestas de `reveal` y del QR; la contraseña, el token de sesión y el de recuperación **en ninguna columna**. Cualquier otro hallazgo es un fallo. |
| **SEG-D6 Conexiones de base** | `conexion('tc_app')` y `conexion('tc_migrator')` directas, para T-SEG-07, T-DB-01 y T-OPS-04. Nunca contra una base que no sea de pruebas (T-OPS-04). |
| **PC-SEG-1 Denegar no cambia nada** | Tras una denegación (`FORBIDDEN`, `NOT_FOUND`, `UNAUTHENTICATED`, `ORIGIN_MISMATCH`) el estado de la base es idéntico, salvo la fila de auditoría de rechazo donde 03 §3.4.2 la prevé. |
| **PC-SEG-2 Indistinguible** | Para «ajeno» frente a «inexistente», el cuerpo (código, mensaje, forma y estado HTTP) es idéntico una vez retirado el `requestId`; no hay diferencia en cabeceras ni en el contenido de la página. |
| **PC-SEG-3 Estado del control** | Cada prueba indica si su control es **D** (decidido) o **P** (propuesto o pendiente, 06 §2). Una aserción sobre un control **P** es **provisional** y no se da por definitiva hasta resolver lo que §3.7.3 lista como «falta definir». |

#### 3.7.2 Cobertura de la matriz de controles de 06 §2

Estado: **E** = evidencia prevista y detallada en 08; **H** = hueco: no tiene prueba detallada o su aserción es provisional. «→» indica dónde se detalla.

| Área (06 §2) | Controles → pruebas | Huecos |
|---|---|---|
| 2.1 Cuentas y sesiones (A-01 a A-10) | A-01 a A-03 → T-CTA-05 a 07, 10, T-SEG-13; A-04, A-05 → T-CTA-04, 09, 15, T-SEG-12; A-06 → T-CTA-08, 14, T-CHAT-11, 12; A-07 → T-CTA-10 a 14, T-SEG-02; **A-08 → T-CTA-10b (ya cubierto en 08; 06 aún dice «Falta»)**; A-09 → T-SEG-01, T-CHAT-02; A-10 → T-CTA-16, T-SEG-10 | **H:** A-01 coste real de Argon2 en el alojamiento (manual, sin definir cómo se mide); umbrales de 06 §3.2 son **P** |
| 2.2 Permisos (A-11 a A-16) | A-11 a A-15 → T-OFE-03, 07, 08, 19, 23, T-ENT-08, 09 y la matriz **T-SEG-04a a 04h**; **A-16 → T-SEG-04f** | **Cerrado en 08:** la aserción explícita de A-16 (06 §2.8 la daba por faltante) |
| 2.3 Cupos (A-17 a A-21) | T-RES-03, 07 a 10, 12, 15 a 17, T-OFE-21, 22, T-PAG-14 | Ninguno en 08 |
| 2.4 Pagos (A-22 a A-29) | A-22 → T-PAG-04, 05; A-23 → T-PAG-08 (solo `fake`); A-24 → T-PAG-07, 16, 17, 22, 26; A-26 → T-PAG-06, 23; A-27 → T-PAG-09 a 14, 19, 20; A-28 → T-PAG-18; A-29 → T-SEG-08 | **H, A-25:** sigue **pendiente de decisión** (umbral no fijado); **sin prueba definida**, ver §3.7.3. **Pendiente externo:** A-23 y A-26 reales → T-PAG-24 (Q-08) |
| 2.5 Entradas (A-30 a A-35) | A-30 → T-ENT-11; A-31 → T-ENT-06, 07, 15; A-32 → T-ENT-03, T-SEG-03; A-33 → T-ENT-04, T-SEG-05; **A-34 → T-ENT-01d; A-35 → T-ENT-12b** (ambas cubiertas desde §3.5; 06 aún dice «Falta») | **H:** A-30, umbral **P** |
| 2.6 Chat (A-36 a A-40) | T-CHAT-01, 02, 04 a 06, 11, 12, 14, 16, T-SEG-02, 03 | **H:** A-39, límite **P** (semántica sin fijar, §3.6.2) |
| 2.7 Datos y plataforma (A-41 a A-48) | A-41 → T-RES-06, 14 y **T-OPS-06b (anulación, nueva)**; A-42 → T-SEG-05, 11; A-43 → T-SEG-07 (07a a 07e) y T-DB-01h; A-44 → T-SEG-06; **A-45 → T-SEG-08c (nueva)**; A-46 → T-SEG-09; A-47 → T-CTA-20 y comprobación del despliegue; A-48 → T-DB-01 | **H:** A-41 copias de respaldo (T-OPS-05 manual, rotación sin definir); A-43 el migrador **no se puede probar como impedido** (se documenta, 07b); A-47 sin prueba automática |
| 06 §4 Anonimización y borrado | **T-SEG-11d a 11i (nuevas, provisionales)** | **H:** dependen de actualizar 03 (guardia de `Attendee`, acción `account.anonymize`, rechazo de `anon.invalid`) |
| 06 §5 Common Criteria | **Ninguna.** | **Pendiente de Q-02:** no se define prueba ni mapeo; no se declara equivalencia |

#### 3.7.3 Controles propuestos o pendientes: qué falta definir antes de fijar la aserción

La aserción de la columna central es **provisional** (PC-SEG-3). El estado es el de 06 y **no se ha cambiado**.

| Control (06) | Estado | Aserción provisional (en qué prueba) | Qué falta definir antes de fijarla |
|---|---|---|---|
| **A-25** Límite de frecuencia de firmas de webhook inválidas | **PENDIENTE DE DECISIÓN** (umbral no fijado, ni en 04 TX-10.1 ni en 06) | **Ninguna.** Solo rigen 400 y 413 sin efectos (T-PAG-08). No se escribe prueba de umbral. | Cuántas peticiones, en qué ventana, qué respuesta (400, 429 u otra), **dónde se cuenta** (origen, IP, global) y si se persiste; después, la prueba. Alineación con 04 TX-10.1. |
| **A-01/A-02** Umbrales de ingreso (06 §3.2: 5 por cuenta, 20 por IP en 15 min) | **P** | T-CTA-06, 07 con esas cifras | Confirmar las cifras con el equipo; qué ocurre con la 5.ª respuesta (P1-04); cómo se cuenta detrás de proxy (`TRUST_PROXY_HOPS`). |
| **A-30** Lector (30 consultas por minuto) | **P** | T-ENT-11a | Cifra; si la ventana es fija o deslizante; si cuentan consultas con formato inválido. |
| **A-39** Chat (5 por 10 s) | **P** | T-CHAT-06 | Lo de §3.6.2: ventana, qué envíos cuentan, reinicio. |
| **A-41** Anulación de `birthDate` a los 30 días | **P** | T-OPS-06b | Si el borde es `≥` o `>` sobre `endsAt + 30 días`; y la rotación de copias (09 §5). |
| **A-43** `MIGRATION_DATABASE_URL` fuera del entorno de la aplicación | **P** (residual M aceptado) | T-SEG-07c (revisión de configuración) | Cómo se comprueba de forma automática: ¿la aplicación se niega a arrancar con ese secreto presente o solo lo advierte? Hoy solo hay revisión manual. |
| **A-47** Contraseña de demostración en un despliegue público | **P** | T-CTA-20 | Qué hace el arranque con el valor local documentado en `APP_ENV=production`: ¿rechaza, advierte o nada? |
| **A-27** Calendario de conciliación | **P** | T-PAG-20d | Confirmar `RECONCILE_DELAYS_MIN` y `MAX_CHECKS` (04 TX-11.2, P4-05). |
| **A-01** Coste real de Argon2 | Sin definir cómo se mide | — (manual) | Hardware de referencia y umbral de tiempo aceptable. |
| Respuesta a páginas de rol equivocado | 07 §6.1 (DEN) | T-SEG-04b | Si la página responde 403 o 404 para cada ruta de 05 §2 (05 §2 fija 404 para el resumen de reembolsos; el resto no está especificado por ruta). |
| ~~401 sin sesión del *handler* del QR y del historial~~ | **Fijado el 2026-11-16 en 05 §4:** 401 `{ error: { code: 'UNAUTHENTICATED', … } }` con `no-store` | T-SEG-04c, T-CHAT-16, T-ENT-03b | Nada. |
| Política de caché de las páginas **públicas** | 06 §3.5 solo fija `no-store` en `/panel/**`, QR e historial | T-SEG-03 | Si el catálogo y el detalle pueden cachearse y cómo. |
| Entorno de pruebas con HTTPS | No definido | T-SEG-12b | Cómo probar `__Host-`, `Secure` y HSTS sin el despliegue (certificado local en E, o prueba manual en el despliegue). |
| **06 §5 Common Criteria** | **Pendiente de Q-02** | **Ninguna.** | Objetivos de seguridad de la propuesta; hasta entonces no hay prueba ni mapeo. |

#### 3.7.4 Acción y resultado por prueba

*«→» = se ejecuta tal como está en la prueba o el apartado indicados; la fila solo añade lo que falta. Lo que añade 08 va en negrita.*

| ID | Acción | Resultado esperado | Detalle |
|---|---|---|---|
| T-SEG-01 | **01a (E):** para cada una de las 23 Server Actions de 05 §3 y para cada `POST` de *Route Handler* con cookie, enviar la petición con `Origin` ajeno, ausente, `null`, con otro puerto, con otro esquema y con un subdominio; y con el `Origin` exacto. **01b:** enviar el cuerpo de una acción por `GET`. **01c:** el webhook con y sin `Origin` (con firma válida del `fake`). | **01a:** con `Origin` incorrecto o ausente, `ORIGIN_MISMATCH` (403) **antes** de resolver el principal y de validar; el servicio **no se invoca** (espía) y PC-SEG-1; con el `Origin` exacto, la acción sigue su camino. **01b:** no hay mutación por `GET` (405 o equivalente; sin cambios). **01c:** el webhook **no** exige `Origin` ni cookie y se decide por la firma (05 §4). Cómo se envía una Server Action desde la prueba (cabecera de acción de Next.js, idempotencia del identificador) se confirma en P1-02. | 08; RS-06; 06 §3.3 (Next.js deja pasar la ausencia de `Origin`, el envoltorio no) |
| T-SEG-02 | **02a (E):** `HEAD`/`GET` de una página pública, una de `/panel`, `/restablecer`, el QR, el historial y `/api/salud`, en el *build* de producción. **02b:** dos peticiones seguidas a la misma página. **02c:** recorrer T-E2E-01 y los recorridos de §3.2 a §3.6 con un oyente de `securitypolicyviolation` y de errores de consola. | **02a:** `Content-Security-Policy` con las directivas de 06 §3.5 (`default-src 'self'`, `script-src` con *nonce* y `'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`), **sin** `'unsafe-eval'` ni `'unsafe-inline'` en producción; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin` y `no-referrer` en `/restablecer`; `Permissions-Policy` con `camera=(self)` y el resto vacío; sin HSTS en local (solo en despliegue, T-OPS-01). **02b:** el *nonce* es **distinto** en cada petición y coincide con el de los `<script>` de la página. **02c:** 0 infracciones y 0 errores de CSP en todos los recorridos; ningún atributo `style` en línea. **No se puede probar con `fake`:** que `form-action` incluya `https://www.sandbox.paypal.com` y que la redirección a PayPal funcione bajo la CSP (06 §3.5 la manda comprobar en E2E): solo en T-PAG-24. | 08; RS-22; 06 §3.5 |
| T-SEG-03 | **03a (E):** `Cache-Control` de `/panel/**`, del QR (`/api/entradas/[ticketId]/qr`) y del historial (`/api/chat/mensajes`). **03b (E):** iniciar sesión, abrir `/panel/reservas`, cerrar sesión y pulsar «Atrás». | **03a:** `no-store` en las tres. **03b:** el navegador **no muestra** el contenido privado desde caché (se vuelve a pedir y redirige a `/ingreso`). **Falta definir:** la política de caché de las páginas públicas (§3.7.3); la prueba no afirma nada sobre ellas. | 08; RS-21; QR → T-ENT-03a, historial → T-CHAT-07e |
| T-SEG-04 | **Matriz automatizada, generada desde una tabla única `matriz` (fuente: 01 §8 y 05 §3), no escrita a mano.** **04a (I):** las 23 acciones × principales de SEG-D2 × {recurso propio, ajeno del mismo rol, inexistente}. **04b (E):** cada ruta de 05 §2 × principal. **04c (I/E):** los *Route Handlers* (QR, historial, webhook, `/api/salud`) y `/pasarela-simulada/[orderId]`. **04d (I):** los eventos de WebSocket × principal. **04e (I):** las prohibiciones de 01 §8.5. **04f (I):** **ausencia de datos nominales para `ADMIN` (A-16).** **04g (I):** sustitución de identificadores. **04h (E):** cada ruta protegida sin sesión. | **04a:** esperado por celda: `UNAUTHENTICATED` (visitante, 401), `FORBIDDEN` (rol que **nunca** puede, 403), `NOT_FOUND` (fuera de alcance, indistinguible de inexistente, PC-SEG-2), o éxito; cada celda con PC-SEG-1. **Prueba de completitud:** si una acción de 05 §3 no tiene filas en `matriz`, la prueba **falla** (cubre las «23 acciones»). **04b:** la respuesta a un rol equivocado es la de 07 §6.1 (DEN); cuál (403 o 404) por ruta está **por fijar** (§3.7.3). **04c:** QR solo del dueño con reserva `CONFIRMED` (T-ENT-03b); historial solo con sesión (T-CHAT-16); webhook sin cookie, por firma; `/pasarela-simulada` solo con `fake`. **04d:** cualquier autenticado conecta y chatea (01 §8.4); visitante no (T-CHAT-01). **04e:** nadie edita una `APPROVED` ni una reserva creada (T-OFE-11, T-RES-12); nadie degrada una `CONFIRMED` ni una `USED` (T-PAG-16, T-ENT-15); `ADMIN` no aprueba, no registra ingresos (`FORBIDDEN`); `GAD` no lee reservas individuales ni `OPERATOR` listados de asistentes; **ningún esquema de acción acepta campos de rol, `gadId` ni `attractionId` salvo `createOfferAction` con `attractionId` validado por alcance** (introspección de los esquemas Zod; T-CTA-03). **04f:** con nombres y fechas de nacimiento centinela en las reservas, **todas** las respuestas, páginas y JSON de `ADMIN` (revisión de pagos, detalle, resumen de «Consultar pasarela», avisos de reembolso) no contienen ninguno (SEG-D4); ningún rol, incluido `ADMIN`, recibe contraseñas, `tokenHash`, tokens de sesión ni tokens QR. **04g:** cambiar cada identificador por el de otro GAD, otra atracción, otro comprador o un UUID aleatorio da la **misma** respuesta (PC-SEG-2), también para identificadores mal formados (`VALIDATION_ERROR` o `NOT_FOUND`, uno solo y siempre el mismo). **04h:** cada ruta protegida sin sesión redirige a `/ingreso?next=<ruta>` (regla `safeNext`, 05 §2). | 08; RS-06, RS-07; 01 §8; 05 §2 a §4; reutiliza T-OFE-03, 07, T-ENT-08, T-CHAT-16 |
| T-SEG-05 | **05a (I):** recorrer con los centinelas de SEG-D4: registro, ingreso, restablecimiento, reserva con nombres y fecha de nacimiento, pago con el `fake`, webhook (cuerpo y firma), consulta y registro de ingreso, chat. **05b (I):** repetir **forzando un error interno** en cada flujo. **05c (I):** arranque del proceso con todos los secretos de entorno centinela. | **05a/05b:** `buscarCentinelas` en `AuditEvent`, `PaymentEvent`, registro capturado, respuestas y cabeceras: **solo** los lugares de SEG-D5; la contraseña, los tokens de sesión y de recuperación, el token QR y las cabeceras `Cookie`/`Set-Cookie`/`Authorization` **no** salen en el registro; no se registran cuerpos de petición; las respuestas de error llevan `requestId` y no llevan la traza ni el SQL. **05c:** el registro de arranque y la validación del entorno no escriben valores de secretos (solo nombres). PC-4 de §3.1.1 es el caso de cuentas. | 08; RS-20, RS-16; reutiliza T-ENT-04a (QR), T-CTA PC-4 |
| T-SEG-06 | **06a (I):** en cada campo de texto y de identificador de cada acción, y en los parámetros `provincia` y `pagina`: `'`, `"`, `'; DROP TABLE "User"; --`, `' OR '1'='1`, `\`, `%` y `_`, un byte NUL, caracteres Unicode raros y 10 000 caracteres. **06b (U/estática):** buscar en el código `$queryRawUnsafe`, `$executeRawUnsafe` y plantillas con concatenación dentro de `$queryRaw`/`$executeRaw`. | **06a:** los valores se guardan o rechazan **literalmente** (`VALIDATION_ERROR` por campo; el NUL, un error de validación y **no** un 500); todas las tablas, restricciones y recuentos intactos; las consultas con `provincia` y `pagina` no cambian de forma. Los identificadores mal formados se rechazan **antes** de llegar a las sentencias manuales (bloqueos asesores, `FOR UPDATE`). **06b:** cero apariciones. | 08; RS-27; 06 §3.4 |
| T-SEG-07 | **Privilegios de base (A-43).** **07a (I):** conectar como `tc_app`: intentar `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `CREATE TRIGGER`, `ALTER TABLE … DISABLE TRIGGER`, `GRANT`; `UPDATE`, `DELETE` y `TRUNCATE` sobre `AuditEvent`; `UPDATE`/`DELETE` sobre `PaymentEvent` y `ChatMessage`; `DELETE` sobre `Reservation`, `Attendee`, `Payment` y `Ticket`; `SET ROLE tc_migrator`. Comprobar `INSERT` y `SELECT` sobre `AuditEvent`. **07b (I, caracterización):** conectar como `tc_migrator` en la base de pruebas y ejecutar `UPDATE` y `DELETE` sobre `AuditEvent`. **07c (revisión de configuración):** el entorno de ejecución de la aplicación (variables, *compose*, alojamiento) no contiene `MIGRATION_DATABASE_URL`. **07d (I):** la conexión del *pool* de la aplicación. **07e (estática):** buscar `auditEvent.update`, `auditEvent.delete` y `deleteMany`/`updateMany` sobre `AuditEvent` en el código. | **07a:** `42501` en todo lo prohibido; `INSERT` y `SELECT` de `AuditEvent` funcionan; `tc_app` no es superusuario, ni crea bases o roles, ni omite la seguridad por filas (`pg_roles`); la matriz de privilegios real (`has_table_privilege`) es **exactamente** la de 03 §8.5 (un permiso de más también falla). **07b:** **se documenta, no se afirma como impedido:** el migrador **puede** modificar la auditoría y desactivar disparadores (**riesgo residual M aceptado**, A-43); la prueba deja constancia y **no** es un control. Nada puede probar que el migrador no pueda. **07c:** revisión manual con acta; **falta definir** si habrá comprobación automática (§3.7.3). **07d:** `SELECT current_user` desde la aplicación devuelve `tc_app`. **07e:** cero apariciones. **No hay detección de alteraciones de la auditoría** (06 A-43): ninguna prueba la ofrece. | → 03 §8.7 (T-DB-01h, comparte caso); RS-24; 06 §2.7 (A-43) |
| T-SEG-08 | **08a (U):** validar el entorno con cada regla de 02 §9: variable obligatoria ausente; `APP_ENV=production` con `PAYMENT_PROVIDER=fake`; `APP_ORIGIN` sin `https://`; llavero ausente, mal formado o con clave que no mide 32 bytes; `TICKET_ACTIVE_KEY_ID` que no está en el llavero; parámetros de Argon2 por debajo del mínimo; `PAYPAL_API_BASE` que no es el anfitrión de Sandbox; cualquier variable `NEXT_PUBLIC_*`. **08b (I/E):** `/pasarela-simulada/x` con `PAYMENT_PROVIDER=paypal`; con producción el módulo `fake` no es alcanzable. **08c (E, añade 08):** (A-45) tras el *build*, buscar el valor de cada secreto de entorno centinela en `.next/static` y en todos los *chunks* de cliente; y un componente de cliente de prueba que importe un módulo `server-only`. | **08a:** el proceso **no arranca** (código de salida ≠ 0); el mensaje nombra la variable y **nunca su valor** (T-SEG-05c). **08b:** 404 con `paypal`; `fake` prohibido en producción (A-29). **08c:** ningún secreto aparece en el paquete de cliente; el componente de prueba **rompe el *build***. | 08; RS-23; 02 §9; 06 §3.6; **08c cierra la «Falta» de A-45** |
| T-SEG-09 | **Manual.** `npm ci`; `npm audit` (con y sin dependencias de desarrollo); revisar `package.json`: versiones exactas de Prisma y `package-lock.json`. Repetir antes de entregar. | Cero vulnerabilidades altas o críticas **sin justificar**; cada excepción anotada (paquete, versión, enunciado, por qué no aplica o fecha de corrección); fecha, versión de Node y de `npm` y salida guardadas como evidencia (EV-05). Requiere red. **Falta definir:** formato de la justificación y si cuentan las dependencias de desarrollo. | 08; RS-28; A-46 (resultado de la auditoría: aún **no existe**) |
| T-SEG-10 | **10a:** T-CTA-16 (16a a 16d y la tabla de `safeNext`). **10b (E, añade 08):** recorrer todos los redireccionamientos a `/ingreso?next=…` de §3.1 a §3.6 y completar el ingreso. **10c (estática):** buscar `redirect(` y `Location` con destino no literal. **10d (I):** `next` con `%0d%0a` y con 5000 caracteres. | **10a:** → T-CTA-16. **10b:** siempre se vuelve a la ruta pedida si es **permitida para la sesión** y a `/panel` en otro caso, sin error ni auditoría. **10c:** los únicos destinos no literales son `next` (por `safeNext`) y la URL de PayPal devuelta por el servicio; ningún otro parámetro de la URL redirige. **10d:** `safeNext` lo descarta (`/panel`); sin inyección de cabeceras. | → T-CTA-16 y `safeNext` (05 §2); 06 A-10 |
| T-SEG-11 | **Auditoría de eventos clave.** **11a (I+estática):** extraer del código todas las cadenas `action` auditadas y compararlas con el catálogo de 03 §3.4.2, y comprobar que **cada** acción del catálogo tiene una prueba que la produce. **11b (I):** por cada acción del catálogo, ejecutar su flujo y leer **una** fila con `action`, `result`, `actor`, `resourceType`, `resourceId` y `metadata` con claves **dentro** de la lista cerrada de esa acción. **11c (I):** simular un fallo del `INSERT` de auditoría, en un éxito y en un rechazo. **11d a 11i (provisionales, 06 §4, dependen de 03):** *11d* anonimizar con `tc_migrator`: valores de 06 §4.3. *11e* repetirlo. *11f* diferimiento. *11g* `tc_app` no puede anonimizar nombres. *11h* registro con `anon.invalid`. *11i* auditoría de `account.anonymize`. | **11a:** el conjunto de acciones del código **es** el del catálogo (ni sobra ni falta); cada una tiene prueba. **11b:** `ipHash` es un HMAC y no una IP; `metadata` sin correo, nombre, contraseña, token ni texto (PC-4); `resourceId` solo si el recurso existe y es del ámbito (03 §3.4.2). **11c:** en un **éxito**, si falla la auditoría **se revierte** la operación (la auditoría va en la misma transacción, D-56); en un **rechazo**, la respuesta no cambia (auditoría aparte, *best effort*, TX-05 principio 7). **11d:** `email = anon-<userId>@anon.invalid`, `displayName = Usuario anonimizado`, hash aleatorio descartado (no se puede iniciar sesión), `Session` y `PasswordResetToken` borrados, `Attendee.fullName = Asistente anonimizado` por reserva completa (INV-02, `position` intacto), `birthDate` nulo, `ChatMessage.text = [mensaje eliminado]` con `id` y `clientMessageId` conservados; `Reservation`, `Payment`, `Ticket` sin cambios; `AuditEvent` **no se toca**. **11e:** el estado es idéntico y no se duplica la auditoría de éxito. **11f:** con una reserva `HELD`/`REVIEW_REQUIRED`, un pago no terminal o una `CONFIRMED` con actividad no terminada: nada cambia y se audita `CONFLICT`/`REQUEST_DEFERRED` aparte. **11g:** `tc_app` recibe `42501` o el error de la guardia (`tg_attendee_guard`) al cambiar `fullName` o `ChatMessage.text`. **11h:** el registro **rechaza** el dominio `anon.invalid`. **11i:** `account.anonymize` con solo recuentos (`attendees`, `messages`, `sessionsDeleted`, `origin`), sin correo, nombre ni texto anterior, **en la misma transacción** (si se revierte, la fila también). **11d a 11i son provisionales:** ni la guardia de 03, ni la acción, ni el rechazo de dominio existen aún; el plazo de 30 días y que anonimizar sustituya a borrar siguen siendo **decisión del equipo**. | 08; RF-38, RS-20; 03 §3.4.2; 06 §4 |
| T-SEG-12 | **12a (E):** iniciar sesión en local y leer `Set-Cookie`. **12b (E o manual):** lo mismo con `APP_ORIGIN` en `https` (despliegue o certificado local). **12c (E):** cerrar sesión; iniciar sesión dos veces seguidas; `document.cookie` desde la página. | **12a:** `tc_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sin `Domain`, caducidad = `expiresAt` (8 h); sin otras cookies. **12b:** `__Host-tc_session` con `Secure`, `Path=/` y **sin** `Domain` (el prefijo `__Host-` lo exige); **cómo probarlo sin el despliegue está por definir** (§3.7.3). **12c:** al salir, la cookie se borra (caducidad pasada); cada ingreso entrega un valor **nuevo** (fijación, T-CTA-15); `document.cookie` no la contiene (`HttpOnly`). | → T-CTA-04, 09, 15; 06 §3.1 (RS-02) |
| T-SEG-13 | **13a:** ingreso con correo inexistente y con contraseña errónea. **13b:** recuperación con correo existente, inexistente y limitado por cuenta (la 4.ª solicitud). **13c:** registro con un correo ya usado. | **13a:** mismo código, mensaje, estado, forma y cabeceras (PC-SEG-2); la verificación Argon2 se invoca **una vez** en cada caso (espía); la comparación de tiempos es solo **indicativa** (muestra de 200, diferencia de medianas dentro de un margen que **falta definir**) y no es aserción de aprobado. **13b:** cuerpo `{ accepted: true }` y el mismo texto en los tres casos; solo el correo existente envía correo (Mailpit); el límite **por cuenta** no cambia la respuesta (el de **IP** sí da `RATE_LIMITED`, TX-13). **13c:** el registro **sí** revela que el correo existe (riesgo residual **aceptado**, A-03): la prueba lo **documenta**. | → T-CTA-05, 10 (T-CTA-05 comprueba la verificación ficticia); RS-03; A-03 |
| T-DB-01 | Subcasos **a a i** de 03 §8.7 sobre una base creada con `migrate deploy`, con el rol y los datos que 03 indica. **08 añade (01j):** la guardia de `Attendee` para la anonimización (provisional, 03 aún no la tiene). | → 03 §8.7. Orden: a, b e i (catálogo, con el propietario), después c a h con `tc_app`; **a se repite tras una segunda `migrate`** (anti-deriva). **01j:** `tc_app` no puede cambiar `fullName`; `tc_migrator` solo al valor `Asistente anonimizado`; la guardia no impide la anulación de `birthDate` de J4. **Provisional.** | → 03 §8.7; `T-DB-01h` comparte caso con T-SEG-07a |
| T-DB-02 | Crear la base desde cero: `migrate deploy`, comprobar el estado, ejecutar la semilla dos veces y una vez más con los datos de demostración. | `migrate status` limpio; tras la segunda semilla los recuentos y los ids deterministas (`seedUuid`) **no cambian** y no hay duplicados; la semilla corre con `tc_migrator` y `tc_app` no puede ejecutarla; las cuentas de demostración usan `SEED_DEMO_PASSWORD`; T-DB-01a pasa después. Si la semilla de demostración se niega en `APP_ENV=production` está **por definir** (06 A-47). | 08; RO-01; 03 §9 |
| T-OPS-01 | **Manual y E.** Clon limpio: `npm ci`, copiar `.env.example`, arrancar PostgreSQL y Mailpit, migrar, sembrar, *build* y arranque. Abrir `/` y conectar un cliente Socket.IO al **mismo** puerto. Repetir en el despliegue con HTTPS (cabeceras, cookie, HSTS). | HTTP y WebSocket responden en el mismo proceso y puerto; `/api/salud` 200; en el despliegue: HSTS, `__Host-`, `Secure` y WSS (T-SEG-02, 12b). Los comandos exactos los fija 09 (parcial): **por tomar de 09**. | 08; RO-01, RO-02 |
| T-OPS-02 | **02a (I):** `GET /api/salud`. **02b (E):** detener la base y repetir; volver a arrancarla. | **02a:** 200 `{ "status": "ok" }` sin sesión y sin datos internos. **02b:** 503 en menos de 2 s (límite de 05 §4), sin detalles; al volver la base, 200 sin reiniciar. | 08; RO-09; 05 §4 |
| T-OPS-03 | Con una conexión Socket.IO abierta y una petición en curso retenida por una compuerta, enviar `SIGTERM`. | Deja de aceptar conexiones; la petición en curso **termina** y su transacción no se corta a medias; los sockets se cierran; se cierra el *pool*; los trabajos se detienen; código de salida 0. **Falta definir** (09): el plazo de gracia. En **Windows** `SIGTERM` no se comporta como en Linux: se ejecuta en Linux o en CI; la prueba **no es válida** en el equipo de desarrollo actual. | 08; RO-09 |
| T-OPS-04 | Ejecutar cada utilidad con bases `turismo_dev`, `turismo`, `turismo_prod`, `turismo_test_prod`, `turismo_demo`, `turismo_restore`, con mayúsculas, con parámetros en la URL y con la variable cambiada a mitad de camino; y con `_test`, `_e2e`, `_perf`. **Regla por utilidad (09 §5.2):** *limpieza* y *semilla de pruebas* solo admiten `_test`, `_e2e` y `_perf`; **`db:reset`** admite exactamente `turismo_dev` **y** esas tres. Casos propios de `db:reset`: sin `--confirm=<nombre>`, con `--confirm` de otra base, con anfitrión no local en cualquiera de las dos URL y con `APP_ENV=production`. | La **limpieza** y la **semilla de pruebas** se niegan con cualquier otro nombre, incluida `turismo_dev`; **`db:reset`** actúa sobre `turismo_dev` y las tres de pruebas, con confirmación correcta, y se niega con el resto (código de salida ≠ 0). Siempre que se niega, **no envía ninguna sentencia** (comprobado en el controlador). `db:reset-demo` **no se prueba**: sigue siendo propuesta (03 §9.4). | 08; RO-03; 06 A-43 (limpieza); 09 §5.2 |
| T-OPS-05 | **Manual.** `pg_dump` de la base de demostración; restaurar en una base nueva; arrancar la aplicación; ejecutar T-DB-01a y las comprobaciones de PC-PAG-1 y PC-ENT-4; reaplicar las anonimizaciones posteriores a la copia (06 §4.7). **Procedimiento y orden: 09 §5.5, con el acceso cerrado hasta el último paso, y RB-11.** **La lista no sale de la auditoría restaurada** (solo llega hasta la fecha de la copia): sale de la base original o del registro de solicitudes del equipo (09 §5.5, 7.1). Se incluye la **invalidación de sesiones y tokens de recuperación** (propuesta, §5.5 paso 6) y la comprobación de descarga de una entrada (prueba el llavero). **Cobros posteriores a la copia (09 §5.5, paso 10):** con evidencia de PayPal (simulada con las capturas de la base original en `fake`), un cobro **vinculable** (`custom_id` = reserva y `invoice_id` = pago existentes, con orden, importe y moneda coincidentes) se concilia con las reglas vigentes (04 TX-09 y TX-11); uno **no vinculable o dudoso** conserva su evidencia y se escala. | La aplicación arranca y las invariantes se cumplen; lo anonimizado **no reaparece**; ninguna sesión ni token anterior a la restauración sirve. **Si falta la lista o falla la reaplicación, la prueba se declara no superada y el acceso permanece cerrado**; igual si no se identifican o clasifican los cobros posteriores; **ningún cobro no vinculable crea reserva, pago ni entrada, y ninguna coincidencia dudosa emite un QR** (regla de cierre de 09 §5.5). **Siguen sin decidir** (09 §8.13): retención y ubicación de copias, modo de restauración y `RESTORE` en `account.anonymize`; el procedimiento depende de 06 §4 y de la utilidad, aún inexistente. Verificaciones técnicas pendientes: 09 §8.14. | 08; RO-09; 06 §4.7; 09 §5.5 |
| T-OPS-06 | **06a (I):** con `JOBS_ENABLED=true` y datos vencidos, arrancar: J1 (retenciones), J2 (conciliación, T-PAG-20b), J3 (barrido de sockets) y, **solo si se adopta `P3-04`**, J4 (reparto por paquete, 10 §4: J1 en `P3-03`, J2 en `P4-05`, J3 en `P6-01`; 06a de J4 y 06b a 06d en `P3-04`). **06b (I, añade 08, A-41):** J4 con `endsAt + 30 días − 1 ms`, `+ 30 días` y `+ 30 días + 1 ms`. **06c:** J4 y retención: sesiones revocadas o vencidas hace más de 7 días; tokens de recuperación usados o vencidos hace más de 24 h; `LoginThrottle` inactivo más de 24 h. **06d:** repetir; `JOBS_ENABLED=false`; fallo inyectado. | **06a:** cada trabajo actúa al arrancar y una vez más no cambia nada. **06b:** `birthDate` pasa a nulo **solo** desde el borde de 30 días (el `≥` o `>` exacto está **por definir**, §3.7.3); el nombre, la reserva y las demás columnas **no cambian**; auditoría `job.run` con solo `count` y solo si hubo filas; J4 corre con `tc_app` (la guardia lo permite). **06c:** solo se borran esas filas; J4 no puede borrar reservas, pagos ni entradas. **06d:** idempotente; sin efectos con `JOBS_ENABLED=false`; un fallo no tumba el servidor y el siguiente ciclo continúa. | 08; RO-11; 06 §4.1 (A-41) |
| T-A11Y-01 | **E:** análisis automático (axe, versión por fijar) de las pantallas clave en su estado normal y en sus estados de error y vacío: `/`, `/ofertas`, detalle, `/registro`, `/ingreso`, `/recuperar`, `/restablecer`, reservar, `/panel`, reserva y retorno de pago, `/panel/ingresos`, `/panel/chat`, `/panel/admin/revision-pagos`. | 0 infracciones **graves o críticas**; las excepciones se anotan con su motivo. Cubre idioma `es-EC`, título propio, un `<h1>` y `alt` del QR (MC-14, MC-15, MP-09). El análisis automático **no sustituye** las comprobaciones manuales de 07 §7.1. | 08; RA-02 |
| T-A11Y-02 | **E:** con `keyboard` y **sin ratón**, completar registro, ingreso, recuperación, reserva, edición de oferta, ingreso por código pegado y envío de un mensaje; comprobar el enlace «Saltar al contenido». | Cada control es alcanzable y operable; el orden del foco es el visual; sin trampas de foco; el enlace de salto lleva a `<main>` (MC-01, MC-02). | 08; RA-02 |
| T-A11Y-03 | **E:** enviar cada formulario con datos inválidos; seguir cada enlace del resumen. | El foco pasa al **resumen de errores**; cada error enlaza a su campo; el campo tiene `aria-invalid` y `aria-describedby`; `autocomplete` correctos (MC-04, MC-05, MP-01). | 08; RA-03 |
| T-A11Y-04 | **E y M:** observar con un `MutationObserver` las regiones en vivo: lista de chat, insignia, resultado de ingreso, avisos de pago y cuenta atrás de la retención. **M:** repetir con un lector de pantalla. | Chat con `role="log"` y `aria-live="polite"`; los avisos se insertan **sin mover el foco** y se anuncian **una vez**; la cuenta atrás avisa a 5 y 1 minuto y no cada segundo (MC-07, MP-05, MP-07, MP-16, MP-17). La parte **M** queda pendiente de ejecución con el lector. | 08; RA-07 |
| T-A11Y-05 | El ingreso completo sin cámara: T-ENT-14a a 14c. | → T-ENT-14 (14d, con cámara real, es manual y está pendiente). | → §3.5.3; MP-11 |
| T-A11Y-06 | **E y M:** `color-contrast` de axe y cálculo de la razón de contraste de los *tokens* de color; vista en escala de grises. | Texto con razón ≥ 4,5:1 y elementos de interfaz y foco ≥ 3:1; cada estado se distingue por texto o icono y no solo por color (MC-08). Si hay tema oscuro, **falta definir** (07) si también se mide. | 08; RA-02 |
| T-A11Y-07 | **E y M:** tras enviar, tras abrir y cerrar un diálogo de confirmación y tras un cambio de ruta, leer `document.activeElement`. | El foco es **visible** (MC-03); un diálogo atrapa el foco y al cerrarse lo devuelve a quien lo abrió (MC-06); tras un envío con error, al resumen; tras un éxito, no se pierde el foco. Dónde queda el foco tras un cambio de ruta **no está especificado** en 07: **por definir**. | 08; RA-02 |
| T-PERF-01 | **Manual.** Seguir el método de §7: `npm run perf:seed` (**20 ofertas**, una en cada una de 20 provincias), 50 peticiones de calentamiento, 1000 con concurrencia 10, con y sin el índice `OfferVersion(province, startsAt)`, y `EXPLAIN ANALYZE`. | Se anotan equipo, sistema, versiones y fecha; mediana, p95, mínimo, máximo y errores; el plan **usa el índice**. Criterio **propuesto**: p95 ≤ 300 ms (página) y ≤ 20 ms (consulta con índice): son objetivos por validar, no resultados. El informe declara que el volumen acordado el 2026-11-17 demuestra el procedimiento, no escalabilidad. | 08 §7; RE-03 |
| T-E2E-01 | **E:** sobre el *build* de producción (`turismo_e2e`, `fake`), con cuatro contextos: 1) `gad.sanisidro` crea y envía una oferta (T-OFE-20); 2) `operador.laguna` la aprueba; 3) `turista.ana` reserva **5** asistentes (T-RES-19); 4) paga con el `fake` (T-PAG-25); 5) ve **5** QR (T-ENT-03d); 6) el operador, con la actividad en curso (reloj acelerado del `fake`), consulta y registra **uno a uno** las cinco; 7) repite el ingreso de la primera. | La oferta pasa por todos los estados sin atajos; la reserva queda `CONFIRMED` con 5 entradas, una por asistente; cada ingreso consume **una**; las demás siguen `VALID` hasta su turno; el séptimo paso da `TICKET_ALREADY_USED` con el mismo `usedAt`; al final «5 usadas de 5 emitidas», PC-PAG-1 y PC-ENT-4; 0 infracciones de CSP (T-SEG-02c); T-A11Y-01 sobre cada pantalla visitada; trazas con datos ficticios. Es la **demostración** del flujo principal (RE-12). | 08; RE-12; reutiliza T-OFE-20, T-RES-19, T-PAG-25, T-ENT-03d, 05, 06 |

#### 3.7.5 Correspondencia de las comprobaciones manuales de 07 §7.1 con `T-A11Y` (propuesta)

Cierra la alineación de 00: asociar `MC-nn` y `MP-nn` a sus pruebas. Es una **propuesta**: la mantiene 07 §7.1; las comprobaciones siguen **pendientes de ejecución**.

| Comprobación | Prueba automática o parcial | Comentario |
|---|---|---|
| MC-01, MC-02 | T-A11Y-02 | |
| MC-03, MC-06 | T-A11Y-07 | |
| MC-04, MC-05 | T-A11Y-03 | |
| MC-07 | T-A11Y-04 | Parte con lector de pantalla |
| MC-08 | T-A11Y-06 | |
| MC-09, MC-10 | **Ninguna automática** | Ampliar al 200 %, 320 px y medir objetivos táctiles: solo manual |
| MC-11 | T-ENT-14b y T-CTA (formularios por `POST`) | Sin JavaScript |
| MC-12 | T-SEG-10b | Sesión vencida y vuelta a la ruta |
| MC-13 | Ninguna automática | Red cortada en formularios; chat: T-CHAT-15 |
| MC-14, MC-15 | T-A11Y-01 | `lang`, título, `<h1>` |
| MP-01 | T-CTA-05, T-A11Y-03 | |
| MP-02 | T-CTA-12 | |
| MP-03, MP-04, MP-06 | T-RES-19 | |
| MP-05 | T-A11Y-04 | Cuenta atrás |
| MP-07, MP-08, MP-10 | T-PAG-04, T-PAG-25 | |
| MP-09 | T-ENT-03d, T-A11Y-01 | |
| MP-11 a MP-15 | T-ENT-14, 05, 06d | MP-14 con cámara: manual |
| MP-16, MP-17 | T-A11Y-04, T-CHAT-10e | |
| MP-18 | T-CHAT-15 | |
| MP-19 a MP-21 | T-PAG-19, 20 y 04 TX-11 | Revisión de pagos y avisos de reembolso |
| MP-22, MP-23 | T-OFE-08, T-OFE-04b | |

**Cuándo puede ejecutarse cada subcaso (alineado con 10 §4 el 2026-11-16).** `T-SEG-07` y `T-DB-02` necesitan tablas, privilegios por tabla y el arnés de P0-05, así que **empiezan en P0-06**, no en P0-03: 07a (DDL y privilegios) y 07d con las tablas de M1 en P0-06; 07a, 07b y 07e sobre `AuditEvent` en P1-01; 07a sobre `Reservation` y `Attendee` en P3-01, `Payment` y `PaymentEvent` en P4-01, `Ticket` en P4-02 y `ChatMessage` en P6-02; 07c (configuración sin `MIGRATION_DATABASE_URL`) en PE-02. `T-DB-02` se ejecuta con M1 y la semilla base en P0-06 y se repite con la semilla de ofertas (P2-01) y la de demostración (PE-04). Antes de P0-06 solo hay comprobaciones manuales de roles (10, P0-03).

**Pendiente de esta área:** ninguna prueba de §3.7 está ejecutada. T-SEG-09, T-OPS-05, T-PERF-01 y las partes con lector de pantalla y cámara son **manuales**; T-OPS-03 exige Linux o CI. **Siguen sin decidir** (§3.7.3): el umbral de A-25 (sin prueba), los de A-01, A-30 y A-39, el borde de la anulación de A-41, la comprobación automática de A-43, el comportamiento de los *handlers* sin sesión, 403 o 404 por ruta, la caché de páginas públicas, las pruebas con HTTPS y Common Criteria (Q-02). **Alineaciones para otros documentos:** 06 §2 debe marcar A-08, A-16, A-34, A-35 y A-45 como cubiertos por 08 (hoy dicen «Falta»); 03 debe añadir la guardia de `Attendee`, `account.anonymize` y el rechazo de `anon.invalid` para habilitar T-SEG-11d a 11i y T-DB-01j; 09 debe definir plazo de gracia, rotación de copias y los comandos de T-OPS-01; 07 §7.1 debe citar la tabla de §3.7.5. Siguiente apartado: **§6 Avance de fase y CI**.

---

## 4. Matriz de fallos del adaptador de pagos (correspondencia decidida)

| Fallo simulado | Pruebas |
|---|---|
| Retorno sin captura | T-PAG-04 |
| Firma inválida | T-PAG-08 |
| Evento repetido | T-PAG-07 |
| Importe, moneda o referencia incorrectos | T-PAG-09, 10, 11 |
| Tiempo agotado o error del servidor | T-PAG-02, 12, 26 |
| Captura tardía (con cupo, sin cupo, oferta cerrada, actividad iniciada) | T-PAG-13, 14, 15 |
| Eventos fuera de orden o posteriores a la confirmación | T-PAG-16, 17 |
| Medio rechazado u orden no aprobada | T-PAG-23, 04 |

**Automatizado frente a real.** Todo lo anterior se prueba con el adaptador `fake` y es determinista. La comprobación con PayPal Sandbox (T-PAG-24) es manual, requiere credenciales y **queda pendiente hasta ejecutarse**; no debe presentarse como hecha.

## 5. Evidencias previstas

| ID | Evidencia | Origen |
|---|---|---|
| EV-01 | Diagrama del monolito | 02 |
| EV-02 | Diagrama del modelo relacional | 03 |
| EV-03 | Matriz de requisitos con pruebas y resultado real | 01 + informes |
| EV-04 | Informes de Vitest y Playwright | Ejecución |
| EV-05 | Matriz de seguridad con evidencias | 06 |
| EV-06 | Informe de rendimiento | PE-01 |
| EV-07 | Evidencia de PayPal Sandbox real | T-PAG-24 |
| EV-08 | README con ejecución y declaración de uso de IA | PE-04 |
| EV-09 | Repositorio público y etiqueta `v1.0-b1` | PE-04 |
| EV-10 | Presentación | 12 |
| EV-11 | Entrega (enlace o ZIP) | 12 |

Las evidencias reales se guardarán en `docs/evidencias/`. Hoy no existe ninguna.

## 6. Avance de fase y CI

**Decidido (S-10):** una fase solo avanza si las pruebas de sus paquetes pasan y el criterio de cierre del plan se demuestra con una prueba identificada. La CI es GitHub Actions. **Nada de esto existe todavía** (no hay flujo, ni scripts, ni informes). Los nombres de scripts son los previstos en 09 §4; lo marcado «propuesto» se confirma al crear el flujo (P0).

### 6.1 Cuándo corre cada grupo y qué debe pasar antes de fusionar

Servicio de CI: contenedor `postgres:18` con las bases `turismo_test` y `turismo_e2e`, `PAYMENT_PROVIDER=fake`, `JOBS_ENABLED=false`, `APP_ENV=test`. **Sin credenciales de PayPal en CI.** **Remoto:** `origin` es `https://github.com/JuliaanCZ/Proyecto-Turismo-Comunitario.git` (configurado en el repositorio local; el equipo declara que existe). **Por verificar** (10, D0-11): visibilidad, colaboradores, autoría de los *commits*, si Actions está habilitado, protección de `main` y secretos o variables de CI; hasta entonces el flujo de este apartado es un diseño sin ejecutar.

| Grupo | Script | Cuándo corre | ¿Bloquea la fusión a `main`? | Informe guardado (artefacto de CI) |
|---|---|---|---|---|
| Análisis y tipos | `lint`, `typecheck` | Cada *push* y *pull request* | **Sí** | Salida de ESLint |
| Unidad (U) y contrato (K) | `test:unit` | Cada *push* y *pull request* | **Sí** | `vitest-unit` (JUnit XML; cobertura solo informativa) |
| Integración (I) | `test:integration` | Cada *pull request* y *push* a `main` | **Sí** | `vitest-integration` (JUnit XML) |
| Concurrencia (C), `T-SEG` y `T-DB` en base | `test:concurrency` | Cada *pull request* y *push* a `main` | **Sí**, sin reintento automático (propuesto: repetir 3 veces; un fallo cuenta) | `vitest-concurrency` (JUnit XML) |
| Compilación | `build` | Cada *pull request* | **Sí** | Ninguno |
| Extremo a extremo (E) y accesibilidad automática | `test:e2e`, `test:a11y` | Cada *pull request* a `main` y *push* a `main` | **Sí** | `playwright-report` (HTML); trazas y capturas solo de los fallos |
| Dependencias (propuesto) | `npm audit --omit=dev` | Semanal y en cambios de `package-lock.json` | **No** (avisa; un hallazgo alto o crítico se atiende antes de la entrega) | Salida del comando |
| Rendimiento (`T-PERF`) | `perf:seed`, `perf:catalog` | **Manual**, antes de la entrega (PE-01) | No | Informe de EV-06 |
| PayPal Sandbox (`T-PAG-24`), cámara, lector de pantalla (`MC`/`MP`, `T-SEG-09`, `T-OPS-05`) | Guion manual | **Manual**; `T-PAG-24` exige credenciales (Q-08) | No | EV-07 y listas ejecutadas |

**Antes de fusionar un *pull request*** deben cumplirse todas:

1. Verdes: análisis, tipos, unidad, integración, concurrencia, compilación y E2E.
2. Ninguna prueba omitida (`skip`, `todo`, `only`) en los grupos que bloquean; el flujo falla si las encuentra.
3. Las pruebas de los identificadores del paquete (10 §4) están entre las que pasaron, y el criterio de cierre de la fase lo demuestra una prueba concreta citada en el informe del paquete (11).
4. Una migración nueva se aplica sobre base vacía **y** sobre la anterior, y `T-DB-01` pasa.
5. Sin secretos ni centinelas en el paquete de cliente (`T-SEG-08c`) ni en los registros (`T-SEG-05`).
6. Revisión humana de al menos una persona (propuesto; lo decide el equipo).

**Orden del flujo:** `npm ci` → `prisma generate` → `db:test:prepare` → `lint` + `typecheck` → `test:unit` → `test:integration` → `test:concurrency` → `build` → `test:e2e` + `test:a11y` → publicar informes (también si algo falla, `if: always()`).

**Avance de fase.** Al cerrarla se ejecuta la suite completa sobre `main` y se anota en `ESTADO-IMPLEMENTACION.md` (11) el *commit*, la fecha, el número de pruebas verdes y las manuales pendientes. Si el criterio de cierre depende de una prueba manual pendiente, la fase se declara «cerrada con pendientes manuales» y se listan.

### 6.2 Base exclusiva de pruebas: preparar y limpiar

**Principio.** Ninguna prueba toca `turismo_dev` ni una base de producción. Cada grupo usa su base: `turismo_test` (Vitest), `turismo_e2e` (Playwright) y `turismo_perf` (rendimiento), creadas por `prisma/sql/00-roles.sql` (09 §2). En CI el servicio `postgres:18` nace vacío en cada ejecución: **la CI descarta el contenedor en lugar de limpiar entre ejecuciones**.

**Preparar** (`db:test:prepare`, en local y en CI):

1. Verificar la protección de 09 §5: `APP_ENV` distinto de `production` **y** nombre de base terminado en `_test`, `_e2e` o `_perf`; si no, salir con código ≠ 0 **sin enviar ninguna sentencia** (`T-OPS-04`).
2. Aplicar `prisma migrate deploy` con `MIGRATION_DATABASE_URL` (rol `tc_migrator`) a cada base de pruebas. Las pruebas se conectan con `DATABASE_URL` (rol `tc_app`), de modo que ejercen los privilegios reales.
3. Cargar la semilla base (03 §9.3: catálogos y cuentas por rol) con `SEED_DEMO_PASSWORD` y el llavero de pruebas de ENT-D2.
4. Comprobar que el esquema coincide con las migraciones (sin deriva) antes de ejecutar nada.

**Limpiar** (utilidad de `T-OPS-04`, con las mismas protecciones):

- **Entre archivos de prueba:** una transacción `TRUNCATE … RESTART IDENTITY CASCADE` de las tablas de datos (las de CTA-D4, OFE-D1, RES-D1 y ENT-D1) y recarga de la semilla base. Los catálogos no se vacían. Usa el rol migrador porque `tc_app` no puede vaciar `AuditEvent` (`T-SEG-07`).
- **Aislamiento:** los archivos de integración y de concurrencia corren en serie sobre `turismo_test` hasta decidir en P0-06 si cada trabajador recibe su propio esquema. Las pruebas de concurrencia (§2) nunca comparten base con otras en paralelo.
- **Reloj y trabajos:** reloj falso `T0` en cada prueba y `JOBS_ENABLED=false`, para que ningún trabajo periódico altere los datos.
- **E2E:** Playwright prepara `turismo_e2e` una vez; cada recorrido crea datos con prefijo único y la limpieza completa corre al terminar la suite.
- **Tras un fallo en local:** `db:test:prepare` es idempotente; para reiniciar del todo se recrea la base y se migra.

### 6.3 Pasarela de pagos en CI

En CI y en toda prueba automatizada se usa el adaptador `fake` (`PAYMENT_PROVIDER=fake`, `FAKE_PAYMENT_WEBHOOK_SECRET` aleatorio por ejecución). Con él se prueban de forma determinista las filas de §4. El flujo **falla** si `PAYMENT_PROVIDER=paypal` o si hay credenciales de PayPal en el entorno de CI.

**`T-PAG-24` queda pendiente como comprobación manual con PayPal Sandbox.** No corre en CI, no bloquea la fusión, depende de Q-08 y **no debe presentarse como hecha** hasta que exista EV-07 con fecha, versión y resultado. Las conductas reales de PayPal de 04 §5.2 tampoco se dan por confirmadas antes.

### 6.4 Evidencias por materia

Se guardan evidencias **de ejecución real**, nunca el catálogo como si fuera resultado, en `docs/evidencias/` (hoy vacío), con fecha y *commit*. Los artefactos de CI caducan (propuesto: 30 días), así que los de cierre de fase y de entrega se copian al repositorio.

| Materia | Qué debe poder demostrarse | Informes y evidencias guardados (ID de §5) | Pruebas de origen |
|---|---|---|---|
| **Aplicaciones Web Avanzadas** | Funcionalidad completa, cupo sin sobreventa, tiempo real, pagos con el adaptador, rendimiento y accesibilidad | EV-04 (`vitest-unit`, `vitest-integration`, `vitest-concurrency`, `playwright-report`), EV-03 (matriz de requisitos con resultado real), EV-06 (rendimiento, manual), EV-07 (PayPal Sandbox, manual), listas `MC`/`MP` ejecutadas, EV-01 y EV-02 | `T-CTA`, `T-OFE`, `T-RES`, `T-PAG`, `T-ENT`, `T-CHAT`, `T-E2E`, `T-A11Y`, `T-PERF` |
| **Desarrollo de Software Seguro** | Controles frente a las 48 amenazas de 06 §2, privilegios mínimos en la base, ausencia de secretos y de datos sensibles expuestos | EV-05 (matriz de seguridad con el resultado real de cada `T-SEG`), informes de integración y concurrencia filtrados por `T-SEG` y `T-DB`, salida de `npm audit`, resultado de `T-SEG-08c`, registros de `T-OPS-04` y `T-OPS-05` (manual) | `T-SEG`, `T-DB`, `T-OPS`, `T-CTA-13`, `T-CTA-16`, `T-ENT-04`, `T-CHAT-16` |

**Límites declarados:** la matriz Common Criteria (06 §5) sigue bloqueada por Q-02 y sin evidencia; A-25 sigue sin decidir y sin prueba; la conformidad con la guía académica depende de Q-01. Las pruebas manuales no ejecutadas se listan en la entrega como pendientes, no como superadas.

**Por fijar (no decidido):** caducidad de artefactos, ejecución en paralelo por esquema (P0-06), umbral de cobertura (hoy solo informativa), exigencia de revisión humana, si `npm audit` bloquea, y versión de la imagen de CI.

## 7. Rendimiento del catálogo filtrado (método decidido; formato del informe en §7.1; sin resultados)

| Parámetro | Valor propuesto |
|---|---|
| Qué se mide | `GET /ofertas?provincia=<código>` (HTML de la primera página) y, aparte, la consulta SQL con `EXPLAIN ANALYZE`. |
| Entorno | *Build* de producción en local, base `turismo_perf` dedicada. Se anotan equipo, sistema, versiones y fecha. |
| Volumen | **20 ofertas ficticias**, una en cada una de 20 provincias y cuatro sin filas (acuerdo del equipo del 2026-11-17). |
| Índice | `OfferVersion(province, startsAt)`; se compara con y sin él. |
| Calentamiento | 50 peticiones descartadas. |
| Muestra | 1000 peticiones con concurrencia 10. |
| Métricas | Mediana, percentil 95, mínimo, máximo, errores. |
| Herramienta | Script propio `scripts/perf-catalog.ts` (D-61). |
| Comando previsto | `npm run perf:seed` y `npm run perf:catalog`. |
| Criterio **propuesto** | p95 ≤ 300 ms en la página y consulta ≤ 20 ms con el índice. Son objetivos por validar, no resultados. |

Protocolo completo (datos, *build*, variantes y repeticiones): ficha `PE-01` de 10 §5, que manda si algo difiere. **Nada de este apartado se ha ejecutado**; las tablas de §7.1 son el formato que se rellenará con la salida real.

### 7.1 Formato del informe EV-06 (redactado el 2026-11-16 a partir de `PE-01`; resultados pendientes)

**Archivo:** `docs/evidencias/PE-01/informe-rendimiento.md`, acompañado de la salida literal de `perf:catalog` y de los planes de `EXPLAIN` en la misma carpeta. **Estado inicial obligatorio:** `PENDIENTE DE EJECUCIÓN`. Solo pasa a `EJECUTADO` cuando todas las celdas marcadas «—» tienen la cifra copiada de la salida real; ninguna se estima, redondea a mano ni se rellena con valores de ejemplo. Si una variante no se pudo ejecutar, su fila dice `NO EJECUTADA` y el motivo.

**Convenciones de cálculo (propuesta D7-2, se fijan al escribir el script):** tiempo por petición = desde el envío hasta recibir el cuerpo HTML completo, medido en el cliente con reloj monótono, en milisegundos con un decimal; **mediana y p95 por rango más cercano** sobre las 1000 muestras ordenadas (posiciones 500 y 950); las respuestas distintas de 200 cuentan como errores y **no** entran en los percentiles; una repetición con errores > 0 se informa tal cual y se repite (no se descarta en silencio). El resumen por variante es la **mediana de las tres repeticiones** de cada métrica.

**1. Identificación**

| Campo | Valor |
|---|---|
| Estado | `PENDIENTE DE EJECUCIÓN` |
| Fecha y hora UTC de la medición | — |
| *Commit* medido (hash completo) y rama | — |
| Persona que ejecuta / persona que repite (revisión humana de `PE-01`) | — / — |

**2. Entorno**

| Campo | Valor |
|---|---|
| Equipo: CPU (modelo y núcleos), memoria, almacenamiento | — |
| Sistema operativo y versión; ¿Docker Desktop? | — |
| Versiones reales: Node, npm, PostgreSQL (servidor), Next.js, Prisma | — |
| Variables: `NODE_ENV=production`, `APP_ENV` (propuesta `local`, D7-2), `PAYMENT_PROVIDER=fake`, `JOBS_ENABLED=false`, puerto (propuesta 3200) | — |
| Base y comprobación de la guarda `_perf` | `turismo_perf`; — |
| Otros procesos relevantes en marcha durante la medición | — |

**3. Datos sembrados (comprobados con SQL tras `perf:seed`, no supuestos)**

| Campo | Previsto | Real |
|---|---|---|
| Ofertas `OPEN` con versión pública `APPROVED` y `startsAt` futuro | 20 | — |
| Provincias con datos / ofertas por provincia (mínimo–máximo) | 20 / 1–1 | — / — |
| Ofertas de la provincia medida (propuesta `PICHINCHA`) y páginas resultantes | 1 / 1 | — / — |
| Rango de `startsAt` | futuro, repartido | — |
| Nombre real del índice `OfferVersion(province, startsAt)` (P2-01) | por confirmar | — |
| Duración de `perf:seed` | — | — |

**4. Parámetros de carga**

| Campo | Valor |
|---|---|
| URL medida | `GET /ofertas?provincia=<código>` (primera página) |
| Calentamiento descartado / muestra / concurrencia / repeticiones por variante | 50 / 1000 / 10 / 3 |
| Comando exacto ejecutado (copiado de la consola) | — |

**5. Resultados de la página (HTTP)**

| Variante | Rep. | Mediana (ms) | p95 (ms) | Mín. (ms) | Máx. (ms) | Errores | Duración total (s) | Peticiones/s |
|---|---|---|---|---|---|---|---|---|
| Con índice | 1 | — | — | — | — | — | — | — |
| Con índice | 2 | — | — | — | — | — | — | — |
| Con índice | 3 | — | — | — | — | — | — | — |
| **Con índice (resumen)** | — | — | — | — | — | — | — | — |
| Sin índice | 1 | — | — | — | — | — | — | — |
| Sin índice | 2 | — | — | — | — | — | — | — |
| Sin índice | 3 | — | — | — | — | — | — | — |
| **Sin índice (resumen)** | — | — | — | — | — | — | — | — |

**6. Consulta SQL del catálogo (`EXPLAIN (ANALYZE, BUFFERS)`)**

| Campo | Con índice | Sin índice |
|---|---|---|
| Texto de la consulta (copiado del código de `P2-05`, con parámetros) | — | — |
| Nodo de acceso a `OfferVersion` (se espera `Index Scan` o `Bitmap Index Scan` con índice) | — | — |
| Índice usado | — | (ninguno esperado) |
| *Planning Time* / *Execution Time* (ms) | — / — | — / — |
| *Buffers*: `shared hit` / `read` | — / — | — / — |
| Archivo con el plan completo | — | — |

**7. Paginación profunda (solo análisis; no se optimiza en `PE-01`)**

| Consulta | Página | `OFFSET` | *Execution Time* (ms) | Filas recorridas según el plan |
|---|---|---|---|---|
| Sin filtro | 1 | 0 | — | — |
| Sin filtro | 2 (última) | 10 | — | — |
| Con filtro (`PICHINCHA`) | 1 (única) | 0 | — | — |

Conclusión esperada en texto (sin cifras inventadas): si el coste crece con el `OFFSET` y desde qué página deja de ser aceptable; la paginación por cursor sigue siendo evolución posterior (02 §12).

**8. Comparación con el criterio propuesto (no es requisito; Q-09)**

| Criterio propuesto | Valor medido | ¿Cumple? |
|---|---|---|
| p95 de la página con índice ≤ 300 ms | — | — |
| *Execution Time* de la consulta con índice ≤ 20 ms | — | — |
| El plan con índice usa el índice (**criterio de cierre de `PE-01`**) | — | — |

Si un criterio propuesto no se cumple, se registra el hallazgo y decide el equipo; no impide cerrar `PE-01` (10 §5).

**9. Limitaciones que el informe debe declarar:** una sola máquina; cliente y servidor en el mismo equipo; caché caliente tras el calentamiento; solo 20 filas sintéticas, insuficientes para inferir escalabilidad o una ventaja estable del índice; `APP_ENV=local` con *build* de producción (no es el despliegue); método y umbrales propuestos mientras Q-09 siga abierta.

**10. Reproducción y revisión:** lista exacta de comandos ejecutados, en orden (los previstos son `npm run db:up`, `npm run perf:seed`, `npm run build`, `npm run start` y `npm run perf:catalog`, **no probados**); resultado de la repetición por otra persona (orden de magnitud coincidente o diferencia observada).

### 7.2 Análisis de la paginación profunda

Con el volumen reducido acordado se mide la consulta **sin filtro** en las páginas 1 y 2 (`OFFSET 0` y `10`) y **con filtro** en la única página de `PICHINCHA`. El desplazamiento es demasiado pequeño para caracterizar el crecimiento de `OFFSET`; esa limitación se documenta y no se presenta como prueba de escalabilidad. Es **análisis documentado, no optimización**: `PE-01` no cambia la paginación. Los parámetros `pagina` y `provincia` inválidos (D2-4) no se miden.
