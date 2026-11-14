# 08 — Pruebas y evidencias

> **ESTADO: PARCIAL — punto de avance guardado el 2026-11-12.**
> Contiene la estrategia, la técnica de concurrencia y el **catálogo completo de identificadores de prueba** ya decididos (los citan los documentos 01 y 10). Faltan, por prueba, la preparación, los pasos, las aserciones y la evidencia (⏳), así como el plan de CI detallado.
> **Siguiente paso exacto:** §3 — ampliar cada fila del catálogo con preparación, pasos y aserciones, empezando por `T-CTA-01`.
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
| Token de recuperación (T-CTA-13) | `PasswordResetToken` | Un cambio de contraseña; el otro `TOKEN_INVALID`. |
| Decisiones de revisión (T-OFE-10) | `Offer` | Una decisión aplicada; la otra `INVALID_STATE`. |
| Dos ediciones o dos envíos con el mismo `rev` (T-OFE-04c, 05d) | **Fila `OfferVersion`** (`barrera.version`): ambas llegan al `UPDATE` condicionado | Una sube `rev`; la otra `STALE_VERSION` o `INVALID_STATE`. |
| Edición o envío frente a archivo, eliminación o descarte (T-OFE-16b, 16b′, 05e, 05f, 14c) | `Offer` exclusivo o **compartido** (`barrera.offerCompartida`: `FOR KEY SHARE`) | La que llega después ve el estado confirmado por la otra: `OFFER_ARCHIVED` o `NOT_FOUND`; nunca una escritura sobre una oferta ya archivada o una versión ya borrada. |
| Aprobación frente a archivo, eliminación, descarte o reserva (T-OFE-16c, 16d, 14d, 14e, T-RES-17, 18) | `Offer` exclusivo | Aserciones válidas **en ambos órdenes**: sin estado mixto; comprometido ≤ capacidad pública; ninguna reserva posterior a la suspensión o el archivo. |
| Fecha fija frente a una reserva insertada durante la espera (T-OFE-22c) | `Offer` exclusivo con una reserva insertada por `ctrl` en su transacción | La aprobación ve la reserva y devuelve `SCHEDULE_LOCKED`. |
| Reserva frente a reducción de capacidad (T-RES-17) | `Offer` | Nunca comprometido > capacidad pública. |

El vencimiento se prueba con reloj falso, nunca esperando 15 minutos. Los casos de **hora tras la espera** (D-69) avanzan el reloj falso **mientras las llamadas esperan el bloqueo** y comprueban que decidieron con la hora posterior a la espera. La **recuperación de unicidad** se provoca con una fila de control insertada y **sin confirmar** por la conexión de control: el servicio se bloquea en el índice único y, al confirmar la de control, recibe `23505`. Los subcasos de TX-05 y TX-09 (letras `a`, `b`, `c` de los identificadores de abajo) están especificados con preparación, pasos y aserciones en [04 §3](04-reglas-transacciones-y-concurrencia.md).

---

## 3. Catálogo de pruebas (identificadores definitivos; ⏳ preparación, pasos, aserciones y evidencia)

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
| T-CTA-16 | El panel redirige sin sesión; `next` solo admite rutas internas. | E | RF-05 |
| T-CTA-17 | Límite de solicitudes de recuperación. | I | RS-03 |
| T-CTA-18 | Registro → ingreso → panel → salida; recuperación completa leyendo el correo en Mailpit. | E | RF-01 a 05, RO-08 |
| T-CTA-19 | Un turista no accede a pantallas ni acciones de otros roles. | I, E | RF-05, RS-07 |
| T-CTA-20 | La semilla crea cuentas de los cuatro roles con sus alcances. | I | RF-06 |

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

### 3.5 Entradas — `T-ENT`

| ID | Qué demuestra | Nivel | Requisitos |
|---|---|---|---|
| T-ENT-01 | Cinco asistentes producen cinco tokens distintos; hash único; el cifrado se descifra y depende del id de la entrada. | U, I | RF-30, RS-15 |
| T-ENT-02 | La emisión es idempotente. | I | RS-14 |
| T-ENT-03 | Solo el comprador con reserva confirmada obtiene el QR; un tercero recibe 404; respuesta `no-store`. | I, E | RF-31, RS-07 |
| T-ENT-04 | El token no aparece en URL ni en registros. | I, E | RS-16 |
| T-ENT-05 | Consultar no consume. | I | RA-05 |
| T-ENT-06 | Registrar el ingreso consume una vez. | I | RS-17 |
| T-ENT-07 | Dos registros simultáneos: un ingreso; las otras cuatro entradas siguen válidas. | C | RS-17 |
| T-ENT-08 | Un operador de otra atracción no puede consultar ni consumir. | I | RF-33, RS-07 |
| T-ENT-09 | Actividad seleccionada distinta: `WRONG_ACTIVITY`. | I | RF-33 |
| T-ENT-10 | Fuera de la ventana: `OUTSIDE_CHECKIN_WINDOW`. | I | RF-33 |
| T-ENT-11 | Código desconocido o mal formado: respuesta genérica; límite de consultas. | I | RS-30 |
| T-ENT-12 | Rotación de clave: lo cifrado con la anterior se lee y se recifra. | I | RS-15 |
| T-ENT-13 | Cancelar tras consultar deja la entrada sin consumir. | E | RA-05 |
| T-ENT-14 | Ingreso completo pegando el código, solo con teclado. La cámara se comprueba manualmente. | E, M | RF-32, RA-04 |
| T-ENT-15 | `USED` es terminal (disparador). | I | INV-06 |

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

**Decidido:** una fase solo avanza si las pruebas de sus paquetes pasan y el criterio de cierre del plan se demuestra con una prueba identificada. CI con GitHub Actions (S-10): instalar con `npm ci`, generar cliente, migrar la base de pruebas, analizar, comprobar tipos, Vitest, compilar, Playwright con el adaptador `fake`, publicar informes.

⏳ Falta: flujo de CI detallado, aislamiento y limpieza de datos, evidencias por materia.

## 7. Rendimiento del catálogo filtrado (método decidido; sin resultados)

| Parámetro | Valor propuesto |
|---|---|
| Qué se mide | `GET /ofertas?provincia=<código>` (HTML de la primera página) y, aparte, la consulta SQL con `EXPLAIN ANALYZE`. |
| Entorno | *Build* de producción en local, base `turismo_perf` dedicada. Se anotan equipo, sistema, versiones y fecha. |
| Volumen | 20 000 ofertas publicadas repartidas entre las 24 provincias. |
| Índice | `OfferVersion(province, startsAt)`; se compara con y sin él. |
| Calentamiento | 50 peticiones descartadas. |
| Muestra | 1000 peticiones con concurrencia 10. |
| Métricas | Mediana, percentil 95, mínimo, máximo, errores. |
| Herramienta | Script propio `scripts/perf-catalog.ts` (D-61). |
| Comando previsto | `npm run perf:seed` y `npm run perf:catalog`. |
| Criterio **propuesto** | p95 ≤ 300 ms en la página y consulta ≤ 20 ms con el índice. Son objetivos por validar, no resultados. |

⏳ Falta: formato del informe y análisis de la paginación profunda.
