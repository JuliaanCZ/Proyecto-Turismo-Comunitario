# 06 — Seguridad y privacidad

> **ESTADO: PARCIAL — punto de avance guardado el 2026-11-14.**
> Contiene los controles decididos con sus parámetros (§3), el **modelo de amenazas (§1)**, la **matriz de 48 amenazas `A-nn` (§2)** y la **anonimización y las solicitudes de borrado (§4)**, redactados el 2026-11-14. Falta §5 (matriz Common Criteria) (⛔).
> **Siguiente paso exacto:** ninguno de redacción en este documento; §5 espera a Q-02. **A-25 sigue pendiente de decisión** (el umbral del límite de frecuencia del webhook no está fijado, §3.2). A-43 está alineada con los privilegios de `tc_migrator` de 03 §8.5.
> **Bloqueo parcial:** la matriz Common Criteria (§5) depende de Q-02; los objetivos de la propuesta no están disponibles.

---

## 1. Modelo de amenazas

Alcance: el monolito de un proceso (D-01) con PostgreSQL, SMTP de pruebas y PayPal Sandbox (02 §1). Este apartado es **análisis de diseño**: no se ha ejecutado ninguna prueba ni revisión externa; lo que sigue son controles decididos o propuestos y la evidencia que se prevé reunir. No se afirma certificación ni equivalencia con un estándar (§5).

### 1.1 Activos

| ID | Activo | Dónde vive | Por qué importa |
|---|---|---|---|
| AS-1 | Credenciales y sesiones (hash Argon2id, `Session.tokenHash`, token de recuperación, cookie) | `User`, `Session`, `PasswordResetToken`; cookie del navegador | Tomar una cuenta da acceso a todo lo que esa persona puede hacer. |
| AS-2 | Asignaciones de rol y pertenencias (`RoleAssignment`: GAD, atracción) | Base | Fijan el alcance entre organizaciones; no hay «rol activo» (D-20). |
| AS-3 | Inventario (capacidad, retenciones, confirmadas) | `OfferVersion`, `Reservation` | Una sobreventa o un acaparamiento causa daño real y es visible. |
| AS-4 | Dinero y su coordinación con PayPal (`Payment`, `PaymentEvent`, `captureAttemptKey`) | Base y PayPal | Dinero capturado sin entradas no tiene reembolso en el MVP (D-44). |
| AS-5 | Entradas: token QR (32 bytes), `tokenHash`, copia cifrada y llavero | `Ticket`, `TICKET_KEYRING` | El token es el derecho de acceso: quien lo posee ingresa. |
| AS-6 | Datos de asistentes (nombre; fecha de nacimiento solo con edad mínima) y correo | `Attendee`, `User` | Datos personales de terceros; minimización (RS-25, D-62). |
| AS-7 | Mensajes de chat | `ChatMessage` | Contenido de usuarios; vector de XSS y de abuso. |
| AS-8 | Auditoría y registros | `AuditEvent`, registros del proceso | Evidencia; no debe contener secretos ni datos nominales (RS-20). |
| AS-9 | Secretos de despliegue (credenciales de PayPal, `RATE_LIMIT_SECRET`, llavero, contraseña de base) | Variables de entorno | Su fuga rompe varios controles a la vez. |

### 1.2 Actores y adversarios

| ID | Actor | Capacidad supuesta |
|---|---|---|
| AC-1 | Visitante anónimo | Envía cualquier petición HTTP o WebSocket; puede automatizar. |
| AC-2 | Turista malicioso | Cuenta válida; manipula cuerpos, repite solicitudes, accede a identificadores ajenos, usa varias pestañas. |
| AC-3 | Persona del GAD u operador curioso o deshonesto | Cuenta con alcance en **una** organización o atracción; intenta salir de ella, o decidir lo propio (varias asignaciones). |
| AC-4 | Administrador | Confiable pero acotado: no ve nombres ni fechas de nacimiento (01 §8.5); sus acciones se auditan. |
| AC-5 | Tercero que falsifica o repite webhooks | Conoce la URL pública; no tiene la firma de PayPal. |
| AC-6 | Quien obtiene una copia de la base, de los registros o de una copia de respaldo | Lectura, no escritura. |
| AC-7 | Quien controla la red o un navegador ajeno (robo de cookie, página enlazada) | Intenta secuestro de sesión o CSRF. |
| AC-8 | PayPal degradado o no disponible | No es adversario: responde tarde, duplica o se contradice; el diseño debe ser seguro igualmente. |

**Fuera del alcance:** un atacante con control del proceso o del alojamiento, un administrador de la plataforma, denegación de servicio distribuida, y el compromiso del navegador de la persona usuaria más allá del robo de cookie. El rol migrador de base (puede alterar la auditoría y desactivar disparadores, 00 §1.1) se acepta como riesgo residual (A-43).

### 1.3 Límites de confianza

| ID | Límite | Qué cruza | Regla |
|---|---|---|---|
| LC-1 | Navegador → aplicación (HTTP, Server Actions, Route Handlers) | Todo dato, cookie, `Origin` y cabecera | **Todo es hostil.** Se valida con Zod, se comprueba `Origin` exacto y se resuelve el principal desde la cookie (D-17, D-06). El cliente nunca aporta precio, total, rol ni estado. |
| LC-2 | Navegador → aplicación (WebSocket) | *Handshake*, eventos | `Origin` y cookie en el *handshake*, sesión revalidada en cada evento (D-51, D-55). |
| LC-3 | Aplicación → PostgreSQL | SQL con el rol `tc_app` | Privilegio mínimo; sin DDL ni `UPDATE`/`DELETE` sobre `AuditEvent` (D-57, D-68). La base refuerza invariantes aunque falle el código (D-58). |
| LC-4 | Aplicación → PayPal | OAuth, Orders v2, verificación de firma | Salida autenticada; **la respuesta no decide por sí sola**: se contrasta el estado de la captura (04 TX-09). |
| LC-5 | PayPal → aplicación (webhook) | Cuerpo y cabeceras sin cookie | Autenticado solo por firma y contrastado con `getOrder`; el webhook acelera y nunca es fuente de verdad (D-43, D-75). |
| LC-6 | Aplicación → SMTP | Correos de recuperación y aviso | Enlaces construidos con `APP_ORIGIN`, nunca con `Host` (D-19). El correo puede leerse fuera de nuestro control: el token es de un solo uso y vence en 30 min. |
| LC-7 | Dentro del proceso: Next.js ↔ servidor propio ↔ trabajos | Puente `globalThis` (D-05) | Mismo proceso y misma confianza; lo que **no** se comparte es la autorización: cada servicio autoriza con datos leídos de la base. |
| LC-8 | Entre organizaciones (GAD, atracción) | Recursos de otra pertenencia | Alcance evaluado sobre la fila leída bajo el bloqueo; recurso ajeno ⇒ 404 (D-14, OFF.1). |

**Datos en memoria que no cuentan como control de seguridad entre instancias:** límites del chat y del lector, presencia (02 §2). Con una sola instancia funcionan; con varias no (02 §13).

## 2. Catálogo de amenazas y matriz de controles

Catálogo `A-nn` de amenazas (redactado el 2026-11-14). Los controles se citan por su decisión (D-nn), su requisito (RS-nn) o su flujo de 04; **no se crea un catálogo `C-nn` aparte** para no duplicar identificadores. Las pruebas son las de [08](08-pruebas-y-evidencias.md); ninguna se ha ejecutado todavía.

**Lectura de las columnas.**
- **Estado del control:** **D** = decidido en el diseño (con su decisión); **P** = propuesto: parámetro o mecanismo aún sujeto a confirmación del equipo o a verificación.
- **Evidencia prevista:** la prueba de 08 que la produciría. «**Falta**» indica evidencia que no existe aún o que ninguna prueba cubre; «**Pendiente**» indica una verificación externa bloqueada.
- **Riesgo residual:** lo que el control **no** elimina. B = bajo, M = medio, A = alto (juicio de diseño, no medición).

### 2.1 Cuentas y sesiones

| ID | Escenario | Control (estado) | Dónde se aplica | Prueba / evidencia prevista | Residual |
|---|---|---|---|---|---|
| A-01 | Fuerza bruta de contraseñas contra una cuenta o desde una IP (AC-1). | Bloqueo temporal por cuenta (5/15 min) y por IP (20/15 min); `LoginThrottle` con HMAC; Argon2id (D-18, D-16). **P**: umbrales de 06 §3.2. | `accounts/application` (ingreso); TX-14 | T-CTA-05 a 07, T-SEG-13. **Falta:** medir el costo de Argon2 en el alojamiento real. | M: un atacante distribuido por muchas IP elude el límite por IP. |
| A-02 | Bloquear a otra persona abusando del límite (R-16). | Bloqueo breve y límite por IP separado (D-18). **P** | Ingreso | T-CTA-06. | B: puede molestar; no concede acceso. |
| A-03 | Enumerar correos existentes. | Ingreso y recuperación con mensaje y tiempo uniformes; verificación Argon2 ficticia (D-23). El registro **sí** revela el correo (aceptado). | Ingreso, recuperación, registro | T-CTA-05, 10, T-SEG-13. | M: el registro permite enumerar; sin verificación de correo (fuera del alcance). |
| A-04 | Secuestro o robo de la cookie de sesión (AC-7). | Cookie `HttpOnly`, `SameSite=Lax`, `__Host-` y `Secure` en despliegue; solo el hash en base; 8 h absolutas (D-15). | Cookie; `accounts` | T-CTA-04, 09, 15, T-SEG-12. | M: sin tiempo de inactividad (H-21); un robo vale hasta 8 h o hasta que se revoque. |
| A-05 | Fijación de sesión. | Token nuevo en cada ingreso; se ignora la cookie presentada (D-15, TX-14). | Ingreso | T-CTA-15. | B |
| A-06 | Sesión que sobrevive al cambio de contraseña o a la salida, también en el WebSocket. | Revocación de todas las sesiones al restablecer; cierre de sockets por tres vías (D-55, TX-13, TX-14). | `accounts`, `realtime` | T-CTA-08, 14, T-CHAT-11, 12. | B: ventana de segundos si el puente falla; la revalidación por evento la cierra. |
| A-07 | Token de recuperación robado, reutilizado o filtrado (R-17). | 256 bits, hash en base, un solo uso, 30 min, uno activo; `Referrer-Policy: no-referrer`; consumo por `UPDATE` condicional (D-19, TX-13). | `/restablecer`, TX-13 | T-CTA-10 a 14, T-SEG-02 (cabecera). | M: el correo puede ser leído por un tercero; el token vale 30 min. |
| A-08 | Enlace de recuperación con un `Host` falsificado. | El enlace se construye con `APP_ORIGIN`. **D** | `accounts` (correo) | T-CTA-18 (lectura en Mailpit). **Falta:** una prueba específica con cabecera `Host` manipulada. | B |
| A-09 | CSRF contra una mutación o un WebSocket (AC-7). | `Origin` exacto obligatorio, solo `POST`, `SameSite=Lax`; *handshake* con `Origin` (D-17, D-51). | Envoltorio de acciones; Route Handlers; Socket.IO | T-SEG-01, T-CHAT-02. | B |
| A-10 | Redirección abierta con `next`. | Solo la ruta interna permitida para la sesión: regla canónica `safeNext` en [05 §2](05-contratos-http-websocket-y-pagos.md); si se descarta, se vuelve a `/panel`. **D** | Ingreso | T-CTA-16, T-SEG-10. | B |

### 2.2 Permisos entre organizaciones

| ID | Escenario | Control (estado) | Dónde se aplica | Prueba / evidencia prevista | Residual |
|---|---|---|---|---|---|
| A-11 | Una persona del GAD o un operador accede a ofertas o atracciones de **otra** organización (AC-3). | Autorización en cada servicio con alcance leído bajo el bloqueo; 404 indistinguible (OFF.1, D-14, D-21). | Servicios de `offers`, `reservations`, `tickets` | T-OFE-03, 07, 23, T-SEG-04 (matriz completa). **Falta:** que la matriz automatizada de T-SEG-04 exista y cubra las 23 acciones de 05 §3. | B: un error de código en un servicio nuevo; la matriz lo detecta. |
| A-12 | Autoaprobar la propia versión con una cuenta de varios roles (AC-3). | Regla de identidad `userId ≠ authorId` en el servicio y `CHECK` (D-22). | `offers` (TX-03) | T-OFE-08 (08a a 08d), T-OFE-19. | B |
| A-13 | Un miembro del GAD que no es el autor edita o envía la versión. | Identidad del autor en edición y envío (OFF.1). | TX-01, TX-02 | T-OFE-19. | B |
| A-14 | Un operador consulta o consume entradas de otra atracción. | Alcance por atracción; `TICKET_NOT_FOUND` idéntico para «no existe» y «otra atracción». | TX-12 | T-ENT-08, 09. | B |
| A-15 | Modificar la atracción de una oferta ya publicada para saltar el alcance. | Atracción inmutable tras publicar (servicio y disparador). | TX-01, `tg_offer_guard` | T-OFE-23. | B |
| A-16 | El administrador ve datos de asistentes. | Respuesta de «Consultar pasarela» sin nombres ni fechas de nacimiento (01 §8.5, TX-11). | `payments` (resumen para el administrador) | T-PAG-19 (19e, permisos). **Falta:** una aserción explícita de que el resumen no contiene datos nominales. | B |

### 2.3 Cupos e inventario

| ID | Escenario | Control (estado) | Dónde se aplica | Prueba / evidencia prevista | Residual |
|---|---|---|---|---|---|
| A-17 | Comprar el último cupo dos veces (sobreventa, AC-2). | Cupos calculados bajo `FOR UPDATE` de `Offer` en `READ COMMITTED` (D-32, RS-10). | TX-05, TX-09 | T-RES-09, 17, T-PAG-14 (con barreras de bloqueo). | B |
| A-18 | Acaparar inventario sin pagar. | Retención de 15 min; una vigente por comprador y oferta y tres en total; bloqueo asesor por comprador (D-35, D-66). | TX-05 | T-RES-15, 10, 16. | M: un atacante con varias cuentas retiene cupos 15 min cada vez (no hay verificación de identidad). |
| A-19 | Manipular el precio, el total o la cantidad. | Total calculado en servidor; todo campo extra se descarta (RS-11). | `createReservationAction` | T-RES-03, 12. | B |
| A-20 | Repetir una reserva (doble clic, respuesta perdida) o reutilizar una clave con otro contenido. | Idempotencia `(buyerId, requestKey)` + `requestHash` (D-34, D-70). | TX-05 | T-RES-07, 08. | B |
| A-21 | Reducir la capacidad o cambiar la fecha bajo reservas existentes. | Reglas autoritativas de TX-03: `CAPACITY_BELOW_COMMITTED`, `SCHEDULE_LOCKED`. | TX-03 | T-OFE-21, 22. | B |

### 2.4 Pagos y webhooks

| ID | Escenario | Control (estado) | Dónde se aplica | Prueba / evidencia prevista | Residual |
|---|---|---|---|---|---|
| A-22 | Confirmar sin pagar abriendo la URL de retorno o manipulando sus parámetros (AC-2). | El retorno no captura ni modifica; la confirmación exige captura `COMPLETED` coincidente (D-43, RS-13). | Página de retorno; TX-08, TX-09 | T-PAG-04, 05. | B |
| A-23 | Webhook falsificado (AC-5). | Firma verificada por *postback*; el efecto sale de `getOrder`, nunca del cuerpo (D-43). | `POST /api/pagos/paypal/webhook`; TX-10 | T-PAG-08 (solo con el HMAC del adaptador `fake`). **Pendiente:** verificación de un webhook real por *postback* (T-PAG-24, Q-08). | M mientras no se pruebe con PayPal real. |
| A-24 | Webhook repetido, fuera de orden o contradictorio. | `PaymentEvent` único por id; contradictorios no se registran y adelantan el calendario; sin degradar una reserva confirmada (D-75). | TX-10, TX-09 | T-PAG-07, 16, 17, 22, 26. | B |
| A-25 | Inundar el webhook con firmas inválidas o cuerpos grandes (AC-5). | Cuerpo máximo de 256 KB y 400 sin efectos (TX-10.1). **P**: límite de frecuencia por origen para firmas inválidas (alineación pendiente con 04 TX-10.1). **PENDIENTE DE DECISIÓN: el umbral (peticiones, ventana, respuesta y dónde se cuenta) no está fijado ni en 04 ni aquí; no se inventa un valor.** | Webhook | T-PAG-08 (400/413). **Falta:** decidir el umbral y definir su prueba. | M: sin límite, cada petición cuesta una llamada de verificación a PayPal. |
| A-26 | Doble cargo o intento de captura duplicado (dos pestañas, reintento). | Reclamo atómico con arrendamiento de 60 s; clave de captura persistida y reutilizada (`captureAttemptKey`); el estado de la orden de PayPal es la barrera final (D-71, D-72, D-74). | TX-08 | T-PAG-06, 23. **Pendiente:** retención real de la clave de idempotencia (04 §5.2, T-PAG-24). | M: la protección última contra el doble cargo es de PayPal y no está verificada. |
| A-27 | Dinero capturado y reserva no confirmable (sin cupo, importe distinto, resultado desconocido). | `REVIEW_REQUIRED` con motivo; conciliación de 13 comprobaciones en ≈ 76 h; escalamiento al administrador (D-41, D-44, D-76). **P**: calendario. | TX-09, TX-11 | T-PAG-09 a 14, 19, 20. | A: sin reembolsos en el MVP, el caso se resuelve fuera del sistema (RB-09). |
| A-28 | Pago de una reserva ajena o con retención vencida. | `NOT_FOUND` para ajena; margen de 30 s (D-65). | TX-07, TX-08 | T-PAG-18. | B |
| A-29 | Cargar la pasarela simulada en producción. | `fake` prohibido con `APP_ENV=production`; aviso permanente (D-45). | Arranque; `/pasarela-simulada` | T-SEG-08. | B |

### 2.5 Entradas QR

| ID | Escenario | Control (estado) | Dónde se aplica | Prueba / evidencia prevista | Residual |
|---|---|---|---|---|---|
| A-30 | Adivinar tokens con el lector (AC-3). | 256 bits de entropía; 30 consultas por minuto por operador; respuesta genérica (D-46, RS-30). **P**: umbral. | TX-12 | T-ENT-11. | B |
| A-31 | Reutilizar o copiar un QR (dos dispositivos, captura de pantalla). | Consumo único atómico (`UPDATE` condicional); entradas nominales (D-47). | TX-12 | T-ENT-06, 07, 15. | M: una copia fotografiada de un QR **no usado** sirve a quien llegue primero; no hay verificación de identidad en la puerta. |
| A-32 | Ver el QR o el código de otra reserva. | Solo el comprador con reserva `CONFIRMED`; 404 a terceros; `no-store`; `nosniff` (D-50). | `GET /api/entradas/[ticketId]/qr`; `revealTicketCodeAction` | T-ENT-03, T-SEG-03. | B |
| A-33 | El token aparece en URL, registros o auditoría. | El token solo viaja en el cuerpo; nunca se registra (RS-16, RS-20). | Acciones de ingreso; registros | T-ENT-04, T-SEG-05 (valores centinela). | B |
| A-34 | Fuga de la base: obtener tokens de entradas (AC-6). | Solo `tokenHash` para buscar y copia AES-256-GCM con el id como dato asociado; llavero fuera de la base (D-46). | `tickets/infra` | T-ENT-01, 12. **Falta:** prueba de que un volcado de la base no contiene tokens en claro. | M: quien tenga base **y** llavero descifra; el hash por sí solo no revela el token. |
| A-35 | Pérdida de la clave de cifrado. | Copia de la clave fuera del servidor; reemisión (RB-10); lo ya descargado sigue validándose (R-06). | `scripts/reissue-tickets.ts` | T-ENT-12 (rotación). **Falta:** prueba de la reemisión. | B |

### 2.6 Chat

| ID | Escenario | Control (estado) | Dónde se aplica | Prueba / evidencia prevista | Residual |
|---|---|---|---|---|---|
| A-36 | Visitante o sitio externo se conecta al chat (AC-1, AC-7). | *Handshake* con cookie válida y `Origin` exacto (D-51). | Socket.IO | T-CHAT-01, 02, 16. | B |
| A-37 | Sesión revocada o vencida mantiene el socket. | Tres vías de cierre y revalidación por evento (D-55). | TX-14 | T-CHAT-11, 12. | B |
| A-38 | HTML o script en un mensaje (XSS). | Texto plano; React escapa; sin `dangerouslySetInnerHTML`; CSP con *nonce* (RS-27). | `chat`; interfaz | T-CHAT-14, T-SEG-02. | B |
| A-39 | Inundar el chat o reenviar mensajes. | Límite de 5 por 10 s por usuario (memoria); deduplicación por `(authorId, clientMessageId)`; 16 KB por mensaje (RS-19). **P**: límite en memoria. | TX-15 | T-CHAT-04 a 06. | M: el límite se pierde al reiniciar y no escala a varias instancias (02 §13); no hay moderación. |
| A-40 | Leer el historial sin sesión o tras salir. | Sesión en `GET /api/chat/mensajes`; `no-store`. | Route Handler | T-CHAT-16, T-SEG-03. | B |

### 2.7 Datos sensibles, registros y plataforma

| ID | Escenario | Control (estado) | Dónde se aplica | Prueba / evidencia prevista | Residual |
|---|---|---|---|---|---|
| A-41 | Fecha de nacimiento guardada sin necesidad o visible para quien no debe. | Solo se guarda si la versión exige edad; acceso mínimo (01 §9.3); anulación 30 días después de la actividad (D-36, D-62). **P**: la anulación. | `reservations`; tarea de purga | T-RES-06, 14. **Falta:** prueba de la anulación a los 30 días y de las copias de respaldo (06 §4). | M: las copias de respaldo conservan el dato hasta rotar. |
| A-42 | Contraseñas, tokens o datos de pago en registros o auditoría (AC-6). | Auditoría y registros sin secretos ni datos nominales (RS-20). | `audit`; registro | T-SEG-05, 11. | B |
| A-43 | Modificar o borrar auditoría desde la aplicación (AC-6) o con el rol migrador. | `tc_app` solo tiene `SELECT` e `INSERT` sobre `AuditEvent` (03 §8.5; D-57, D-56): sin `UPDATE`, `DELETE`, `TRUNCATE` ni DDL. **Los disparadores no protegen esa tabla** (la protección es de privilegios, 03 §8.1). **P:** `MIGRATION_DATABASE_URL` no se define en el entorno de la aplicación en ejecución (la aplicación arranca con `tc_app`, 03 §10). | Privilegios de base; despliegue | T-SEG-07 y T-DB-01h (solo prueban a `tc_app`: `42501`). **Falta:** nada puede probar que el migrador *no* pueda; la ausencia de ese secreto en el entorno de la aplicación se comprueba por revisión de configuración. | **M, aceptado:** `tc_migrator` es propietario y puede `UPDATE`/`DELETE`/`TRUNCATE` la auditoría, ejecutar `ALTER TABLE … DISABLE TRIGGER` y cambiar `GRANT`. Se usa en `migrate deploy`, en la semilla, en la limpieza de bases `_test`/`_e2e`/`_perf` y, según §4.5, en el procedimiento de anonimización. El diseño **no incluye detección** de alteraciones (sin encadenamiento de hashes ni copia externa de la auditoría). |
| A-44 | Inyección SQL. | Prisma parametriza; SQL manual con plantillas etiquetadas (06 §3.4). | Todos los módulos | T-SEG-06. | B |
| A-45 | Fuga de secretos al cliente o configuración peligrosa en producción. | Secretos solo en servidor, `server-only`, entorno validado al arrancar (RS-23). | Arranque; empaquetado | T-SEG-08. **Falta:** búsqueda de secretos en el paquete cliente. | B |
| A-46 | Dependencia vulnerable (cadena de suministro). | Versiones exactas, `npm ci`, `npm audit` en CI y antes de entregar (RS-28). | CI | T-SEG-09 (manual). **Falta:** el resultado de la auditoría. | M: dependencias de versiones mayores recientes (R-10). |
| A-47 | Contraseña de demostración conocida en un despliegue público. | Contraseña de `SEED_DEMO_PASSWORD`; el valor local no debe usarse en público. **P** | Semilla; despliegue | T-CTA-20. **Falta:** comprobación en el despliegue. | M |
| A-48 | Restricciones SQL manuales eliminadas por una migración (R-12). | Prueba que comprueba su existencia. | Base | T-DB-01. | B |

### 2.8 Evidencia que falta (resumen)

- **Bloqueada por Q-08:** verificación real en PayPal Sandbox, `postback` de un webhook real y conducta de las claves de idempotencia (T-PAG-24; A-23, A-26).
- **Sin prueba aún definida en 08:** límite de frecuencia del webhook (A-25), anulación de `birthDate` (A-41), volcado de la base sin tokens en claro (A-34), reemisión de entradas (A-35), `Host` manipulado en el correo (A-08), ausencia de datos nominales en el resumen del administrador (A-16), secretos en el paquete cliente (A-45).
- **Manual o externa:** `npm audit` (T-SEG-09), contraseña de demostración en el despliegue (A-47), tamaño y coste real de Argon2 en el alojamiento (A-01).
- **Todo lo anterior es evidencia prevista:** ninguna prueba de 08 se ha ejecutado, y el SQL y el código no existen aún.
- **Mapeo a Common Criteria: pendiente de Q-02.** Esta matriz es el inventario de controles que se mapeará (§5); no se declara equivalencia ni certificación.

## 3. Controles decididos por área

### 3.1 Autenticación y sesiones (D-15, D-16)

| Elemento | Decisión |
|---|---|
| Hash de contraseñas | Argon2id, 19 456 KiB, 2 pasadas, 1 hilo (mínimo de OWASP). Parámetros en variables de entorno con mínimos obligatorios en producción. Rehash al ingresar si los parámetros guardados son inferiores. |
| Política de contraseña | 10 a 128 caracteres, sin reglas de composición, distinta del correo, lista corta de contraseñas comunes prohibidas. Se permite pegar. |
| Token de sesión | 32 bytes aleatorios; la cookie lleva el token; la base guarda SHA-256. |
| Cookie | `__Host-tc_session` en despliegue (`Secure`, `Path=/`, sin `Domain`); `tc_session` en local. `HttpOnly`, `SameSite=Lax`, caducidad = `expiresAt`. |
| Fijación de sesión | No hay sesión anónima; cada ingreso emite un token nuevo e ignora la cookie presentada. |
| Expiración | 8 h absolutas. Sin renovación deslizante. Sin tiempo de inactividad (**riesgo residual**, H-21). |
| Revocación | `revokedAt` al salir y al restablecer la contraseña (todas las sesiones del usuario). Efecto inmediato en HTTP; WebSocket según TX-14. |
| Recuperación | Token de 32 bytes, hash en base, un solo uso, 30 min, uno activo por usuario; no inicia sesión automáticamente; correo de aviso tras el cambio; `Referrer-Policy: no-referrer`; la página no consume el token con `GET`. El enlace se construye con `APP_ORIGIN`, nunca con la cabecera `Host`. |

### 3.2 Límites y enumeración (D-18, D-23)

| Ámbito | Umbral propuesto | Respuesta |
|---|---|---|
| Ingreso por cuenta | 5 fallos en 15 min → bloqueo 15 min | `RATE_LIMITED` con el mismo texto exista o no la cuenta. |
| Ingreso por IP | 20 fallos en 15 min → bloqueo 15 min | `RATE_LIMITED`. |
| Recuperación por cuenta | 3 solicitudes por hora | Respuesta normal; no se envía más correo. |
| Recuperación por IP | 10 solicitudes por hora | `RATE_LIMITED`. |
| Registro por IP | 10 por hora | `RATE_LIMITED`. |
| Chat | 5 mensajes cada 10 s por usuario (memoria) | Confirmación con `RATE_LIMITED`. |
| Lector de entradas | 30 consultas por minuto por operador (memoria) | `RATE_LIMITED` + auditoría. |

- **Webhook de PayPal con firma inválida (A-25): umbral pendiente de decisión.** Hoy solo rigen el tope de 256 KB y la respuesta 400 sin efectos (04 TX-10.1). No se añade fila a esta tabla hasta que el equipo fije el umbral.
- Almacenamiento: tabla `LoginThrottle`, clave = HMAC-SHA-256 del correo normalizado o de la IP con `RATE_LIMIT_SECRET` (no se guarda el dato en claro).
- IP detrás de proxy: `TRUST_PROXY_HOPS` indica cuántos saltos de `X-Forwarded-For` son de confianza; con 0 se usa la dirección del socket. El servidor propio la calcula y la pasa en una cabecera interna que sobrescribe cualquier valor entrante.
- Enumeración: ingreso con mensaje único y verificación Argon2 ficticia cuando el correo no existe; recuperación con respuesta y tiempo uniformes; el **registro sí revela** si el correo existe (riesgo residual aceptado).

### 3.3 Autorización, origen y CSRF (D-06, D-14, D-17)

- Autorización en cada servicio: `autorizar(principal, acción, recurso)` con datos leídos de la base. Matriz en [01 §8](01-alcance-y-trazabilidad.md).
- **Server Actions:** Next.js solo admite `POST` y compara `Origin` con `Host`, pero **deja pasar peticiones sin `Origin`**. Por eso el envoltorio propio exige `Origin` presente e igual a `APP_ORIGIN`.
- **Route Handlers con `POST`:** misma comprobación, salvo el webhook (sin cookies; firma).
- **Socket.IO:** `Origin` y cookie comprobados en el *handshake*; `SameSite` no protege por sí solo las conexiones WebSocket.
- `SameSite=Lax` es una capa adicional, no la única: la vuelta desde PayPal es una navegación `GET` de nivel superior y por eso la cookie llega.
- Sin token CSRF sincronizado: no hay mutaciones por `GET`, todas exigen `Origin` exacto.

### 3.4 Inyección, XSS y contenido

- SQL: Prisma parametriza; el SQL manual usa plantillas etiquetadas (`$queryRaw` con parámetros), nunca concatenación.
- XSS: React escapa por defecto; prohibido `dangerouslySetInnerHTML`; chat y campos de oferta son texto plano mostrado con `white-space: pre-wrap`.
- Redirección abierta: `next` se valida solo con la regla canónica `safeNext` de [05 §2](05-contratos-http-websocket-y-pagos.md) (ruta interna permitida para la sesión; si se descarta, se vuelve a `/panel`, sin error ni auditoría). Esta sección no repite la regla.

### 3.5 Cabeceras y CSP (compatibles con la integración real)

| Cabecera | Valor previsto |
|---|---|
| `Content-Security-Policy` | Generada en `proxy.ts` con *nonce* por petición: `default-src 'self'`; `script-src 'self' 'nonce-…' 'strict-dynamic'` (más `'unsafe-eval'` solo en desarrollo); `style-src 'self' 'nonce-…'`; `img-src 'self' blob: data:`; `connect-src 'self'` más `wss://<host>`; `font-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self' https://www.sandbox.paypal.com`; `frame-ancestors 'none'`; `upgrade-insecure-requests` en despliegue. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` solo en despliegue. |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin`; `no-referrer` en `/restablecer`. |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=(), payment=()` |
| `Cache-Control` | `no-store` en `/panel/**`, QR e historial. |

Notas: no se cargan scripts de terceros (PayPal por redirección). `form-action` incluye el dominio de Sandbox porque algunos navegadores aplican la directiva a la redirección posterior al envío de un formulario; se comprueba con una prueba extremo a extremo. Evitar atributos `style` en línea (bloqueados por la CSP). El lector de QR usa `BarcodeDetector` o `jsqr`, sin WebAssembly ni *workers*.

### 3.6 Secretos, transporte, base y dependencias

- Secretos solo en variables de entorno del servidor; ninguna variable `NEXT_PUBLIC_*`; `server-only` en los módulos que los usan; nunca en el repositorio.
- HTTPS y WSS en el despliegue; TLS termina en el proxy del alojamiento; conexión a la base con TLS.
- Dos roles de base (D-57, privilegios por tabla en [03 §8.5](03-datos-estados-e-invariantes.md)): `tc_migrator` (propietario: DDL, semilla, `TRUNCATE` en bases de prueba; **riesgo residual A-43**) y `tc_app` (DML mínimo; sin `UPDATE`/`DELETE`/`TRUNCATE` sobre `AuditEvent`, sin `DELETE` sobre `Reservation`, `Attendee`, `Payment`, `Ticket`).
- Dependencias: versiones exactas para Prisma; `npm ci`; `npm audit` en CI y antes de entregar.
- Cuentas de demostración: la contraseña sale de `SEED_DEMO_PASSWORD`; en un despliegue público no debe usarse el valor documentado para local.

## 4. Privacidad, anonimización y solicitudes de borrado

Alcance: **diseño propuesto**, redactado el 2026-11-14 a partir de las reglas de conservación de 03 §3.6 y §8.5 y de D-36, D-56, D-57 y D-62. Nada de lo que sigue se ha ejecutado ni probado. **No se verificaron obligaciones legales** (S-14: el MVP usa datos ficticios); este apartado no afirma cumplimiento de ninguna norma de protección de datos. Las solicitudes de borrado y la anonimización de nombres están **fuera del MVP** (03 §3.6): aquí se fija el tratamiento que se aplicaría, sin pantallas ni acciones de servidor nuevas.

### 4.1 Conservación automática (ya decidida)

Las ejecuta el trabajo J4 con el rol `tc_app` (03 §3.6, §8.5). No dependen de ninguna solicitud.

| Dato | Qué ocurre | Cuándo | Cómo | Rastro en la auditoría |
|---|---|---|---|---|
| `Session` | Se borra la fila | Revocada o vencida hace > 7 días | `DELETE` (J4) | `job.run` con `count`, solo si afectó filas. |
| `PasswordResetToken` | Se borra la fila | Usado o vencido hace > 24 h | `DELETE` (J4) | Ídem. |
| `LoginThrottle` | Se borra la fila | Sin actividad > 24 h | `DELETE` (J4) | Ídem. |
| `Attendee.birthDate` | Se anula (`NULL`) | 30 días después de `endsAt` de la actividad (D-62) | `UPDATE` permitido por `tg_attendee_guard` (J4) | `job.run` con `count`; ninguna fila nombra a la persona. |
| Nombre de asistente, `Reservation`, `Payment`, `PaymentEvent`, `Ticket`, `ChatMessage` | Se conservan | — | Sin `DELETE` para `tc_app` | — |
| `AuditEvent` | Se conserva sin límite de tiempo | — | Solo `INSERT`; sin purga prevista en el MVP | — |

### 4.2 Principios

1. **Anonimizar, no borrar, lo que es historial de negocio.** Las claves foráneas son `Restrict` y no hay `DELETE` sobre reservas, pagos ni entradas (03 §3.6): borrar una cuenta con historial rompería INV-02, INV-18 y la trazabilidad del dinero. Se sustituye el dato personal por un valor fijo y la fila queda.
2. **La auditoría no se reescribe nunca.** Ya es seudónima por diseño: `actorUserId` es un UUID sin clave foránea, `ipHash` es un HMAC truncado, y `metadata` solo admite la lista cerrada de 03 §3.4.2, sin correos ni nombres (RS-20). Al anonimizar la cuenta, esos UUID dejan de poder asociarse a una persona con los datos de la base. No hay nada que corregir en `AuditEvent`, y por eso la anonimización es compatible con una tabla de solo inserción.
3. **La anonimización se audita a sí misma**, en la misma transacción que el cambio (D-56), sin guardar el dato eliminado.
4. **Un solo procedimiento, atómico y repetible** (idempotente): ejecutarlo dos veces deja el mismo estado.

### 4.3 Qué se elimina, qué se anonimiza y qué se conserva

| Dato | Tratamiento | Valor resultante o razón |
|---|---|---|
| `User.email` | **Anonimiza** | `anon-<userId>@anon.invalid` (cumple `ck_user_email`; el dominio `.invalid` está reservado y no puede recibir correo). El registro debe **rechazar** ese dominio. Libera el correo original: puede registrarse una cuenta nueva. |
| `User.displayName` | **Anonimiza** | `Usuario anonimizado` (cumple 2–80). |
| `User.passwordHash` | **Sustituye** | Hash Argon2id de 32 bytes aleatorios que se descartan (cumple `ck_user_passwordhash`): nadie puede iniciar sesión, y sin correo real tampoco hay recuperación. |
| `Session` del usuario | **Elimina** de inmediato | `DELETE`, sin esperar los 7 días de 4.1. Los sockets abiertos se cierran por la revalidación por evento (D-55): el procedimiento corre fuera del proceso y no usa el puente de `globalThis`. |
| `PasswordResetToken` del usuario | **Elimina** | `DELETE`. |
| `LoginThrottle` | Sin acción | Es un HMAC sin identificar al usuario y se purga a las 24 h. |
| `RoleAssignment` | Se conserva | Fila inerte sin cuenta utilizable; no hay `DELETE` para `tc_app`. |
| `Attendee.fullName` de las reservas de la persona compradora | **Anonimiza** | `Asistente anonimizado` (cumple 2–120). Por reserva completa, nunca por asistente suelto (INV-02: sin sustitución; `position` y el recuento exacto se conservan). |
| `Attendee.birthDate` | **Anula** | `NULL`, sin esperar los 30 días. |
| `ChatMessage.text` del usuario | **Anonimiza** | `[mensaje eliminado]` (cumple `ck_chat_text`). La fila, el `id` y `clientMessageId` se conservan: el cursor del chat (H-31) y la deduplicación siguen válidos. Lo que otros clientes ya recibieron no puede retirarse. |
| `Reservation`, `Payment`, `PaymentEvent`, `Ticket` | **Se conservan** | Historial contractual y del dinero (03 §3.6). Tras anonimizar, `buyerId` apunta a una cuenta sin datos personales; `PaymentEvent` guarda solo un digest, no el cuerpo; `Ticket` guarda hash y copia cifrada, no datos personales. |
| `Offer`, `OfferVersion` (autoría y revisión del personal del GAD) | **Se conservan** | La autoría es un identificador; el nombre mostrado pasa a `Usuario anonimizado`. |
| `AuditEvent` | **No se toca** | Ver 4.2 (2). Quedan el UUID, el `ipHash` y las claves permitidas de `metadata`. |
| Datos en PayPal | **Fuera de nuestro control** | El dato de pagador vive en PayPal; esta aplicación no lo guarda ni puede borrarlo. |

### 4.4 Solicitudes de borrado: tratamiento

**Quién puede pedirla.** Solo la persona titular de la cuenta (que cubre las reservas de las que es compradora y sus asistentes). Una persona asistente sin cuenta no es identificable en la base (el administrador no ve nombres, 01 §8.5): su petición se dirige a la persona compradora.

**Qué no se hace por esta vía.** No se anonimiza a una persona con rol `GAD`, `OPERATOR` o `ADMIN` si es la última con ese rol en su alcance (dejaría ofertas, atracciones o la administración sin responsable). Se resuelve antes con el equipo.

**Pasos.**
1. **Recepción** fuera de la aplicación (no existe pantalla ni tabla de solicitudes en el MVP; el registro de solicitudes lo lleva el equipo fuera de la base y sin copiar datos personales más allá de lo imprescindible).
2. **Verificación de identidad:** enlace de un solo uso enviado al correo de la cuenta (mismo patrón que la recuperación, D-19). Sin esa confirmación no se ejecuta nada: protege contra una solicitud falsa que borraría la cuenta de otra persona (S-06: el correo no se verifica al registrarse, así que esta es la única garantía disponible).
3. **Comprobación de condiciones**, bajo bloqueo (4.5). Se **difiere** si el usuario tiene (a) reservas `HELD` o `REVIEW_REQUIRED`, (b) un `Payment` no terminal, o (c) una reserva `CONFIRMED` cuya actividad no ha terminado (`endsAt` futuro: la entrada sigue vigente y el contrato en curso). Se informa a la persona del motivo; se reintenta cuando desaparezca o ella lo pida de nuevo.
4. **Ejecución** del procedimiento de 4.5.
5. **Respuesta** a la persona indicando qué se anonimizó y qué se conserva y por qué (4.3), incluidas las copias de respaldo (4.7).

**Plazo.** Objetivo interno **propuesto: 30 días** desde la verificación del paso 2. No es un plazo legal verificado.

### 4.5 Procedimiento de anonimización

Lo ejecuta una persona del equipo con **`tc_migrator`**, en una sola transacción y mediante una utilidad del repositorio (por numerar en 10/09). **Por qué el migrador y no `tc_app`:** `tg_attendee_guard` solo deja pasar la anulación de `birthDate`, y `ChatMessage` no concede `UPDATE` a la aplicación. Se descartó una función `SECURITY DEFINER` invocable desde la aplicación porque ampliaría lo que `tc_app` puede hacer sobre datos protegidos. **Consecuencia:** el procedimiento usa el rol de A-43 en producción, con esas credenciales fuera del entorno de la aplicación (A-43, control P).

Orden dentro de la transacción (consistente con el orden de bloqueos de 04 §2; **no verificado**):
1. Bloqueo asesor `hold-buyer:<userId>` (el mismo de TX-05, D-66): serializa con una reserva nueva en curso del comprador.
2. `SELECT … FOR UPDATE` de sus reservas, ordenadas por `id`; no se bloquea `Offer`.
3. Comprobar las condiciones de diferimiento de 4.4 (3). Si alguna se cumple: revertir sin cambios y responder «diferida».
4. `DELETE` de `Session` y `PasswordResetToken` del usuario.
5. `UPDATE` de `User` (email, nombre, hash), de `Attendee` de esas reservas (nombre y fecha) y de `ChatMessage` del usuario, con los valores de 4.3.
6. `INSERT` en `AuditEvent` (4.6).

**Cambio en 03 que esto exige (pendiente):** `tg_attendee_guard` debe admitir el cambio de `fullName` **únicamente** al valor `Asistente anonimizado` y **solo si `current_user = 'tc_migrator'`**. `tc_app` sigue sin poder hacerlo. Hasta que 03 se actualice, este procedimiento no es ejecutable.

### 4.6 Auditoría de la anonimización

| Elemento | Valor propuesto |
|---|---|
| `action` | `account.anonymize` (nueva; **no está en el catálogo de 03 §3.4.2**). |
| `actorType` | Sistema; `actorUserId` nulo. |
| `resourceType` / `resourceId` | `User` / UUID de la cuenta (ya presente en filas anteriores: el rastro histórico sigue siendo coherente). |
| `result` / `reasonCode` | `SUCCESS`; o `CONFLICT` con `REQUEST_DEFERRED` si se difiere (escritura aparte, tras revertir, 03 §3.4.1). |
| `metadata` | Solo recuentos: `attendees`, `messages`, `sessionsDeleted`, y `origin` (`SELF`). **Sin correo, nombre ni texto anterior.** Claves nuevas: se añaden a la lista cerrada de 03. |
| Dónde se escribe | En la misma transacción que los cambios (D-56): si se revierte, la fila también. |

Esa fila es además el **registro de qué cuentas deben seguir anonimizadas** al restaurar una copia (4.7).

### 4.7 Copias de respaldo

- La anonimización **no alcanza** las copias existentes: conservan los datos hasta que rotan. Documentado como limitación (también A-41). **El plazo de retención de las copias es una propuesta de 09 §5.4 (30 días), sin decidir por el equipo.**
- Tras restaurar una copia, el acceso permanece **cerrado** hasta **reaplicar** el procedimiento de 4.5 a las cuentas anonimizadas después de la fecha de la copia (orden y comprobaciones en 09 §5.5). **La auditoría restaurada solo llega hasta la fecha de la copia:** no contiene esos `account.anonymize` y **no puede ser la fuente de la lista** (corrige el texto anterior, que la citaba). La lista sale de (a) los `account.anonymize` de la base original, si sigue accesible, y (b) el **registro de solicitudes** del equipo (4.4, paso 1), que debe guardar el UUID de la cuenta y la fecha UTC de ejecución, fuera de la base y de las copias y con acceso restringido (campos propuestos en 09 §5.5, 7.1). **Si no hay ninguna fuente, o la utilidad falla o difiere en alguna cuenta, el acceso sigue cerrado.** La anulación de `birthDate` la repone J4 por sí sola.
- **Propuestas sin decidir (09 §5.5 y §8.13):** invalidar todas las sesiones y los tokens de recuperación tras restaurar (una sesión revocada o un token consumido después de la copia reaparecerían vigentes); un modo de restauración que no aplique el diferimiento de 4.4 cuando la solicitud ya cumplió las condiciones en su día; y el valor `RESTORE` en `origin` de 4.6 frente a no reescribir el evento.

### 4.8 Pendientes y alineaciones

- **03:** guardia de `Attendee` (4.5), acción `account.anonymize` y sus claves de `metadata` (4.6), y regla de registro que rechaza el dominio `anon.invalid`.
- **08:** ninguna prueba cubre este procedimiento (tampoco A-41). Pedir pruebas: valores resultantes, idempotencia, diferimiento y que `tc_app` siga sin poder anonimizar nombres.
- **09:** hecho el 2026-11-16 como RB-11 y §5.4 a §5.5 (rotación propuesta de 30 días, sin decidir); queda que `MIGRATION_DATABASE_URL` no esté en el entorno de la aplicación.
- **Decisión del equipo:** el plazo de 30 días y que la anonimización de cuenta sustituya al borrado físico; si Q-01 trae requisitos distintos, se revisa.
- Acceso mínimo: ver [01 §9.3](01-alcance-y-trazabilidad.md).

## 5. Common Criteria

**Pendiente (Q-02).** No se dispone de los objetivos de seguridad de la propuesta. Se preparará una matriz con la columna «objetivo de la propuesta» sin rellenar y, como ayuda **orientativa y no equivalente**, la clase funcional candidata de Common Criteria Parte 2 (auditoría, identificación y autenticación, protección de datos de usuario, soporte criptográfico, gestión de seguridad, acceso). **No se declara certificación ni equivalencia con OWASP.**

⏳ Falta: toda la matriz.
