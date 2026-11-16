# 05 — Contratos HTTP, WebSocket y pagos

> **ESTADO: COMPLETO — 2026-11-13.**
> Contiene el inventario de rutas, los esquemas de las Server Actions (§3), los *handlers* (§4), Socket.IO (§5), el contrato del adaptador de pagos y los ejemplos de petición y respuesta (§6.6). Los cuerpos de PayPal de §6.6 son **ilustrativos**: las verificaciones de Sandbox siguen **pendientes** (04 §5.2, T-PAG-24, Q-08).
> Formato de errores y códigos: [02 §10](02-arquitectura-y-decisiones.md). Flujos: [04](04-reglas-transacciones-y-concurrencia.md).

---

## 1. Convenciones (definitivas)

- Rutas visibles y parámetros de página en español; claves JSON, eventos y campos en inglés.
- Toda mutación es `POST` (Server Action o Route Handler) y comprueba `Origin` exacto contra `APP_ORIGIN`; `Origin` ausente se rechaza (`ORIGIN_MISMATCH`). Excepción: el webhook, que se autentica por firma y no usa cookies.
- Ningún `GET` modifica estado.
- `/panel/**`, el QR y el historial del chat responden con `Cache-Control: no-store`.
- Las Server Actions devuelven `ActionResult<T>`; los Route Handlers, JSON con el estado HTTP del código.
- Recurso fuera de alcance ⇒ 404.

---

## 2. Inventario de páginas

| Ruta | Acceso | Contenido | Paquete |
|---|---|---|---|
| `/` | Público | Portada: próximas ofertas y accesos a catálogo, ingreso, registro y panel. | P2-05 |
| `/ofertas` | Público | Catálogo; `?provincia=<código>&pagina=<n>`; 10 por página. | P2-05 |
| `/ofertas/[offerId]` | Público | Detalle de la versión pública (`OPEN` o `SUSPENDED`); 404 en otro caso. | P2-05 |
| `/ofertas/[offerId]/reservar` | `TOURIST` | Formulario de reserva grupal. Sin sesión redirige a `/ingreso?next=…`. | P3-02 |
| `/registro`, `/ingreso`, `/recuperar`, `/restablecer?token=…` | Público | Formularios de cuenta. | P1-02, P1-03, P1-05 |
| `/panel` | Autenticado | Inicio con accesos según asignaciones. | P1-02 |
| `/panel/ofertas`, `/panel/ofertas/nueva`, `/panel/ofertas/[offerId]`, `/panel/ofertas/[offerId]/editar` | `GAD` | CRUD, versiones, agregados. | P2-02, P3-03 |
| `/panel/revisiones`, `/panel/revisiones/[versionId]` | `OPERATOR` | Versiones en revisión de sus atracciones; aprobar o devolver. | P2-03 |
| `/panel/actividades` | `OPERATOR` | Ofertas de sus atracciones; suspender o reanudar; conteos. | P2-04, P3-03 |
| `/panel/reservas`, `/panel/reservas/[reservationId]` | `TOURIST` | Reservas propias, estado, vencimiento, pago y entradas. | P3-02, P5-01 |
| `/panel/reservas/[reservationId]/pago/retorno`, `…/pago/cancelado` | `TOURIST` | Vuelta desde la pasarela: muestra el estado local. | P4-04 |
| `/panel/ingresos`, `/panel/ingresos/[offerId]` | `OPERATOR` | Selección de actividad; consultar entrada y registrar ingreso. **D-79:** la lista incluye las ofertas `OPEN` de sus atracciones y también las `SUSPENDED` o `ARCHIVED` que **tengan entradas emitidas** (al menos una `Ticket`); una oferta sin entradas emitidas no aparece. `/panel/ingresos/[offerId]` responde 404 si la oferta no es de una atracción del operador. Se conservan las demás condiciones de ingreso: rol, atracción gestionada, ventana horaria, reserva `CONFIRMED` y entrada `VALID`. | P5-02, P5-03 |
| `/panel/chat` | Autenticado | Sala `general`. | P6-02 |
| `/panel/admin/ofertas` | `ADMIN` | Moderación: archivar con motivo. | P2-04 |
| `/panel/admin/revision-pagos`, `…/[reservationId]` | `ADMIN` | **A.** Casos `REVIEW_REQUIRED`, con los de conciliación **agotada** marcados (`lastErrorCode = RECONCILE_EXHAUSTED`, 04 TX-11.2); «Consultar pasarela». **B.** Resumen de avisos de reembolso posterior a la confirmación, **solo lectura** (nota tras la tabla). | P4-07 |
| `/panel/admin/auditoria` | `ADMIN` | Lectura de auditoría (opcional). | PE-05 |
| `/pasarela-simulada/[orderId]` | Solo con `PAYMENT_PROVIDER=fake` | Aprobación o cancelación simulada. | P4-04 |

**Resumen de avisos de reembolso (sección B de `/panel/admin/revision-pagos`; alineado el 2026-11-14 con 04 TX-09 L-17, TX-10 y TX-11).** Es la lectura de los eventos de auditoría que el sistema ya escribe, sin estado nuevo.
- **Acceso:** solo `ADMIN`; cualquier otro rol recibe 404. Se obtiene en el componente de servidor de la página: **no hay Server Action ni Route Handler nuevo** y ningún `GET` modifica estado.
- **Consulta fija:** `AuditEvent` con `action = 'payment.reconcile'`, `result = 'CONFLICT'` y `reasonCode = 'REFUND_AFTER_CONFIRMATION'`, orden `occurredAt` descendente, paginada (tamaño por fijar en P4-07). El cliente **no** aporta filtros. Usa el índice `(action, occurredAt)` de 03.
- **Campos mostrados:** fecha, origen (`metadata.origin`: webhook o consulta del administrador), `metadata.paymentId` y la reserva asociada (resuelta en el servidor). **No** se muestran `actorUserId`, `ipHash`, nombres ni fechas de nacimiento (01 §8.5).
- **Solo lectura:** el aviso no tiene estado «atendido» y persiste en la lista; el detalle de esa reserva (`CONFIRMED`) no ofrece «Consultar pasarela», que exige `REVIEW_REQUIRED` (04 TX-11.1).
- **Auditoría de la lectura:** no se audita (**propuesto**, para no generar ruido).
- **Relación con PE-05:** este resumen **no** depende de `/panel/admin/auditoria` ni la sustituye; esa página sigue siendo la **única consulta general** de auditoría y sigue siendo opcional.

**Regla del parámetro `next`** (corregida el 2026-11-14; sustituye a «empieza por `/` y no por `//`», que dejaba pasar `/\evil.test`, que los navegadores interpretan como `//evil.test`). `next` solo se acepta si es una **ruta interna permitida para la sesión actual**. Una única función `safeNext(raw, principal)` la aplica **al ingresar** (con el principal ya autenticado) y al construir `/ingreso?next=…` (con la ruta que pidió el visitante). Se acepta únicamente si cumple **todo** lo siguiente:
1. Es una cadena no vacía de hasta 2048 caracteres (límite **propuesto**).
2. No contiene caracteres de control (U+0000–U+001F, U+007F) ni `\`, ni en el valor recibido ni tras decodificarlo una vez.
3. Empieza por `/` y su segundo carácter no es `/` ni `\`.
4. **Comprobación definitiva e independiente de 1 a 3:** al resolverla con `new URL(raw, APP_ORIGIN)`, el `origin` resultante es exactamente `APP_ORIGIN`. Si el analizador de URL la lleva a otro origen se descarta aunque parezca interna. El destino que se usa es el `pathname` y el `search` **resultantes**, no el texto original; el fragmento se descarta.
5. Su `pathname` coincide con una página de la tabla anterior **a la que el principal actual puede acceder por rol** (columna «Acceso», con la unión de sus asignaciones, D-20). Solo se evalúa el rol, no la existencia del recurso. No son destinos válidos `/ingreso`, `/registro`, `/recuperar`, `/restablecer`, `/pasarela-simulada/*` ni `/api/*` (evitan bucles y efectos), aunque sean internas.

Si no se cumple cualquiera, o si falta, el destino es la **ruta por defecto ya definida: `/panel`**, sin mensaje de error ni indicar el motivo, y sin auditoría. Pruebas: T-CTA-16 (casos 16a a 16d) y T-SEG-10. *Alineación pendiente:* 06 §3.4 y A-10 dicen «solo rutas internas» y deben recoger «permitidas para la sesión»; 07 §4.1 (`/ingreso`) igual.

---

## 3. Server Actions (nombres, propósito, esquemas y errores definidos)

| Módulo | Acción | Quién | Servicio y flujo |
|---|---|---|---|
| accounts | `registerAction` | Visitante | Alta `TOURIST`. |
| accounts | `loginAction` | Visitante | TX-14. |
| accounts | `logoutAction` | Autenticado | TX-14. |
| accounts | `requestPasswordResetAction` | Visitante | Crea token y envía correo; respuesta uniforme. |
| accounts | `resetPasswordAction` | Visitante con token | TX-13. |
| offers | `createOfferAction` | GAD | TX-01. |
| offers | `updateWorkingVersionAction` | GAD (autor) | TX-01, con `rev`. |
| offers | `startNewVersionAction` | GAD | TX-01. |
| offers | `submitVersionAction` | GAD (autor) | TX-02. |
| offers | `discardWorkingVersionAction` | GAD | TX-16. |
| offers | `deleteOfferAction` | GAD | TX-16; confirmación previa. |
| offers | `approveVersionAction`, `requestChangesAction` | Operador | TX-03, con `rev`. |
| offers | `suspendOfferAction`, `resumeOfferAction` | Operador | TX-04. |
| offers | `archiveOfferAction` | GAD o administrador (motivo) | TX-04. |
| reservations | `createReservationAction` | Turista | TX-05. |
| payments | `startPaymentAction` | Turista | TX-07; redirige a la pasarela. |
| payments | `capturePaymentAction` | Turista | TX-08; idempotente. Devuelve `CONFIRMED` o `IN_PROGRESS` (no es un error: otra captura propia está en curso) o un error de 04 TX-08.6. |
| payments | `checkGatewayAction` | Administrador | TX-11. |
| tickets | `revealTicketCodeAction` | Turista | Devuelve el código de texto de una entrada propia; auditado. |
| tickets | `lookupTicketAction` | Operador | TX-12, sin consumir. |
| tickets | `checkInTicketAction` | Operador | TX-12, consume. |

Envoltorio común `action(schema, opciones, handler)`: comprueba `Origin` → resuelve el principal → valida con Zod (errores por campo) → llama al servicio → traduce `AppError`. `redirect()` se invoca fuera de `try/catch`.

**Retorno desde la pasarela.** PayPal vuelve con un `GET`. La página de retorno **no captura**: muestra «Confirmando tu pago…» y un componente de cliente envía `capturePaymentAction` por `POST` al montarse, con un botón visible «Confirmar pago» como alternativa sin JavaScript. Los parámetros que añade PayPal a la URL no se usan como prueba de nada.

### 3.1 Convenciones de los esquemas (guardado el 2026-11-13)

- **Entrada.** Zod con `strip`: todo campo no listado se descarta y no se lee. Cadenas: NFC y recorte antes de medir (longitudes en puntos de código, 03 §3.0). UUID: formato canónico de 36 caracteres. Fechas locales: `YYYY-MM-DDTHH:mm` en `America/Guayaquil`, convertidas a UTC por el servicio (OFF.3). El **principal** nunca viaja en el cuerpo: se resuelve de la cookie.
- **Errores comunes a toda acción** (no se repiten en cada ficha): `ORIGIN_MISMATCH` (403), `UNAUTHENTICATED` (401, salvo las públicas), `VALIDATION_ERROR` (422, con `fieldErrors` por nombre de campo; los elementos de arreglo usan `attendees.2.birthDate`), `BUSY_TRY_AGAIN` (503, nada se aplicó) e `INTERNAL_ERROR` (500). Las fichas listan solo los **adicionales**.
- **Salida.** `ActionResult<T>` (02 §10.1). Las acciones que terminan en redirección (`loginAction`, `startPaymentAction`) no devuelven datos en el caso de éxito: invocan `redirect()` fuera de `try/catch`; el cliente solo ve `ActionResult` si falla.
- **Auditoría y trazas.** La auditoría de éxito y de rechazo la escribe el servicio (catálogo de 03 §3.4); la acción no escribe nada. Ningún secreto (contraseña, token de restablecimiento, código de entrada) se devuelve en un error ni se registra.
- **`rev`.** Entero que el cliente lee junto con la versión y reenvía como `expectedRev`; una discrepancia da `STALE_VERSION` con `details.currentRev`.

Tipos reutilizados:

```ts
type Uuid = string;                                   // 36 caracteres
type OfferContentInput = {                            // OFF.3; todos los campos de texto son string, aun los numéricos
  title: string; description: string; locationText: string; province: Province;
  startsAt: string; endsAt: string;                   // locales, 'YYYY-MM-DDTHH:mm'
  priceCents: string;                                 // texto '^\d{1,5}([.,]\d{1,2})?$' → centavos en el servicio
  capacity: number; minAge?: number | null;
  servicesText?: string; conditionsText: string;
};
type VersionRef = { versionId: Uuid; status: VersionStatus; rev: number; versionNumber: number };
type OfferRef   = { offerId: Uuid; status: OfferStatus; publicVersionId: Uuid | null; workingVersionId: Uuid | null };
```

### 3.2 Cuentas (`modules/accounts`)

| Acción | Entrada | Salida (`data`) | Errores adicionales |
|---|---|---|---|
| `registerAction` | `{ displayName: 2–80, email: formato válido, minúsculas, ≤ 254, password: 10–128 (06 §3.1), passwordConfirm: igual a password }`. | `{ userId }` y redirección a `/ingreso` (no inicia sesión). | `EMAIL_TAKEN` (409; el registro **sí** revela el correo existente, riesgo aceptado, 06 §3.2), `RATE_LIMITED` (10 por hora y por IP; `details.retryAfterSeconds`). `fieldErrors.password` por política (corta, igual al correo, común). |
| `loginAction` | `{ email, password, next?: string }`; `next` se valida con la regla de §2 (ruta interna permitida para el principal); si no la cumple, se ignora y se usa `/panel`. | Redirección a `next` o `/panel`; cookie nueva (TX-14). | `INVALID_CREDENTIALS` (401, mensaje único exista o no la cuenta), `RATE_LIMITED` (cuenta o IP). |
| `logoutAction` | `{}` | `{}` y redirección a `/`; cookie borrada. Idempotente: una segunda salida da el mismo resultado. | — |
| `requestPasswordResetAction` | `{ email }` | **Siempre** `{ accepted: true }` y el mismo texto, exista o no la cuenta o esté limitada; tiempo uniforme (06 §3.2). | Solo `RATE_LIMITED` por IP (10 por hora). El límite por cuenta no se ve desde fuera. |
| `resetPasswordAction` | `{ token: string, newPassword: 10–128, newPasswordConfirm }`; el token viene de un campo oculto del formulario, **nunca** se lee de la URL en el servidor. | `{}` y redirección a `/ingreso` (no inicia sesión; TX-13). | `TOKEN_INVALID` (400, mensaje único: inexistente, usado o vencido), `RATE_LIMITED`. |

### 3.3 Ofertas (`modules/offers`)

Autorización y orden de comprobaciones: OFF.1. Códigos y `details`: OFF.5. Las transiciones no llevan clave de solicitud (idempotentes por estado).

| Acción | Entrada | Salida (`data`) | Errores adicionales (con `details`) |
|---|---|---|---|
| `createOfferAction` | `OfferContentInput & { attractionId: Uuid }` | `{ offer: OfferRef, version: VersionRef }`; redirección posible a `/panel/ofertas/[offerId]/editar`. | `FORBIDDEN`, `NOT_FOUND` (atracción inexistente o de otro GAD). |
| `updateWorkingVersionAction` | `{ versionId, expectedRev: int ≥ 1 } & OfferContentInput & { attractionId?: Uuid }`; `attractionId` solo si la oferta es inédita. | `{ version: VersionRef }` (`rev` nuevo). | `FORBIDDEN` (miembro del GAD que no es el autor), `NOT_FOUND`, `OFFER_ARCHIVED`, `INVALID_STATE` (`currentStatus`), `STALE_VERSION` (`currentRev`), `VALIDATION_ERROR` en `attractionId` si cambia en una oferta publicada. |
| `startNewVersionAction` | `{ offerId }` | `{ version: VersionRef }` (copia de la pública). | `FORBIDDEN`, `NOT_FOUND`, `OFFER_ARCHIVED`, `INVALID_STATE` (oferta inédita), `WORKING_VERSION_EXISTS` (`details.workingVersionId`). |
| `submitVersionAction` | `{ versionId, expectedRev }` | `{ version: VersionRef }` (estado `IN_REVIEW`). | `FORBIDDEN`, `NOT_FOUND`, `OFFER_ARCHIVED`, `INVALID_STATE`, `STALE_VERSION`, `ACTIVITY_NOT_FUTURE`, `SCHEDULE_LOCKED`, `VALIDATION_ERROR` (contenido incompleto, con `fieldErrors`). |
| `approveVersionAction` | `{ versionId, expectedRev }` | `{ offer: OfferRef, version: VersionRef }` (oferta `OPEN`; puntero público actualizado). | `FORBIDDEN`, `NOT_FOUND`, `SELF_REVIEW_FORBIDDEN`, `INVALID_STATE` (`currentStatus`), `STALE_VERSION`, `OFFER_ARCHIVED`, `ACTIVITY_NOT_FUTURE`, `SCHEDULE_LOCKED`, `CAPACITY_BELOW_COMMITTED` (`details.committed`). |
| `requestChangesAction` | `{ versionId, expectedRev, reason: 1–1000 }` | `{ version: VersionRef }` (`CHANGES_REQUESTED`). | Los de `approveVersionAction` salvo las reglas propias de aprobar; `VALIDATION_ERROR` en `reason`. |
| `suspendOfferAction` | `{ offerId, reason?: 1–500 }` | `{ offer: OfferRef }` (`SUSPENDED`). | `FORBIDDEN`, `NOT_FOUND`, `OFFER_ARCHIVED`, `INVALID_STATE` (`currentStatus`). |
| `resumeOfferAction` | `{ offerId }` | `{ offer: OfferRef }` (`OPEN`). | Igual que `suspendOfferAction`. |
| `archiveOfferAction` | `{ offerId, reason?: 1–500 }`; **obligatorio** si lo hace `ADMIN` sin ser miembro del GAD de la oferta. | `{ offer: OfferRef }` (`ARCHIVED`, terminal). | `FORBIDDEN`, `NOT_FOUND`, `OFFER_ARCHIVED`, `INVALID_STATE` (inédita), `VALIDATION_ERROR` en `reason`. |
| `discardWorkingVersionAction` | `{ versionId }` | `{ offer: OfferRef }`. | `FORBIDDEN`, `NOT_FOUND`, `OFFER_ARCHIVED`, `INVALID_STATE` (la versión no es la de trabajo, o la oferta es inédita: se usa `deleteOfferAction`). |
| `deleteOfferAction` | `{ offerId, confirm: true }`; `confirm` debe ser exactamente `true` (confirmación previa). | `{}` y redirección a `/panel/ofertas`. | `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE` (`currentStatus`: solo se elimina `UNPUBLISHED`). |

### 3.4 Reservas y pagos (`modules/reservations`, `modules/payments`)

| Acción | Entrada | Salida (`data`) | Errores adicionales |
|---|---|---|---|
| `createReservationAction` | `{ offerId, offerVersionId, requestKey: Uuid, attendees: [{ fullName: 2–120, birthDate?: 'YYYY-MM-DD' }] (1–10), termsAccepted: true }`; `quantity = attendees.length`; precio, total y estado se descartan. | `{ reservationId, status: 'HELD', expiresAt, totalCents, quantity, replayed: boolean }`; `replayed` es `true` cuando la clave ya estaba procesada (TX-05 A0). | `FORBIDDEN`, `NOT_FOUND`, `OFFER_NOT_OPEN`, `VERSION_CHANGED` (`details.currentVersionId`; el cliente genera una `requestKey` nueva), `ACTIVITY_NOT_FUTURE`, `HOLD_LIMIT_REACHED` (`details.scope`: `OFFER` o `BUYER`), `INSUFFICIENT_CAPACITY` (`details.available`), `IDEMPOTENCY_KEY_REUSED`, `VALIDATION_ERROR` (`attendees.N.birthDate`, `termsAccepted`). |
| `startPaymentAction` | `{ reservationId }` | Redirección a `approvalUrl`; si falla, solo `ActionResult` de error. El servicio devuelve `{ paymentId, approvalUrl }`. | `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE` (`details.reservationStatus`: ya `CONFIRMED`), `PAYMENT_UNDER_REVIEW`, `HOLD_EXPIRED`, `GATEWAY_UNAVAILABLE` (503): `details.retryable: true` para `GatewayError` `UNAVAILABLE` o `REJECTED` (TX-07 E2) y `false` para `DUPLICATE_INVOICE` (E3). |
| `capturePaymentAction` | `{ reservationId }` | `CaptureResult`: `{ status: 'CONFIRMED' }` o `{ status: 'IN_PROGRESS' }`. `IN_PROGRESS` no es un error: la pantalla sigue en «Confirmando tu pago…» y consulta el estado local. | `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE` (`details.paymentStatus`), `HOLD_EXPIRED`, `PAYMENT_NOT_APPROVED` (volver a `approvalUrl`), `PAYMENT_DECLINED`, `PAYMENT_UNDER_REVIEW` (`details.reviewReason` cuando la captura no coincide con lo esperado). |
| `checkGatewayAction` | `{ reservationId }` | `AdminPaymentSummary`: `{ reservationStatus, reason, gatewayOrderStatus, gatewayCaptureStatus, expectedCents, capturedCents \| null, orderId, captureId \| null, availability }` **sin nombres ni fechas de nacimiento** (01 §8.5). | `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE` (`details.reservationStatus`; también si el pago no tiene orden), `GATEWAY_UNAVAILABLE` (503). Nunca captura ni reprograma el calendario (TX-11). |

`retorno` y `cancelado` no son acciones: la página de retorno envía `capturePaymentAction` al montarse; la de cancelación no escribe nada y enlaza a `/panel/reservas/[id]`.

### 3.5 Entradas (`modules/tickets`)

| Acción | Entrada | Salida (`data`) | Errores adicionales |
|---|---|---|---|
| `revealTicketCodeAction` | `{ ticketId }` | `{ code: 'TC1.…' }`; respuesta con `no-store`. El código no se registra. Audita `ticket.reveal_code` (`reservationId`). | `FORBIDDEN`, `NOT_FOUND` (entrada ajena, inexistente o reserva no `CONFIRMED`; indistinguibles). |
| `lookupTicketAction` | `{ offerId, token }`; `token` con formato `TC1.` + 43 base64url, en el **cuerpo**, nunca en la URL. | `{ attendeeName, status: 'VALID' \| 'USED', usedAt \| null, offerTitle, startsAt, endsAt }`; sin fecha de nacimiento (01 §9.3). No consume. | `FORBIDDEN`, `TICKET_NOT_FOUND` (formato inválido, inexistente, de otra atracción o reserva no `CONFIRMED`: mensaje único), `WRONG_ACTIVITY`, `OUTSIDE_CHECKIN_WINDOW`, `RATE_LIMITED` (30 por minuto y operador). |
| `checkInTicketAction` | `{ offerId, token }` | `{ attendeeName, usedAt }`. Consume (`VALID → USED`). | Los de `lookupTicketAction` y `TICKET_ALREADY_USED` (`details.usedAt`). Repetir tras un éxito devuelve `TICKET_ALREADY_USED` con el mismo `usedAt`. |

**Estado de la oferta (D-79).** Ni `lookupTicketAction` ni `checkInTicketAction` miran `Offer.status`: una oferta `SUSPENDED` o `ARCHIVED` con entradas emitidas **sigue admitiendo** consulta e ingreso. Las condiciones son solo: rol `OPERATOR`, atracción gestionada, actividad seleccionada, ventana horaria, reserva `CONFIRMED` y entrada `VALID` (TX-12).

---

## 4. Route Handlers (decididos)

| Método y ruta | Autenticación | Función | Respuesta |
|---|---|---|---|
| `GET /api/salud` | Ninguna | `SELECT 1` con límite de 2 s. | 200 `{ "status": "ok" }` o 503. Sin datos internos. |
| `GET /api/chat/mensajes?before=<id>&limit=30` · `?after=<id>&limit=100` | Cookie | Historial por cursor. | 200 `{ messages: […ascendente], hasMore }`, `no-store`. Sin sesión válida: 401 (ver nota). |
| `GET /api/entradas/[ticketId]/qr` | Cookie; comprador dueño y reserva `CONFIRMED`. **El estado de la oferta no interviene** (`SUSPENDED` o `ARCHIVED` conservan el acceso, PLAN F2 y D-79) | PNG del QR. | `image/png`, `no-store`, `nosniff`; `?descarga=1` añade `Content-Disposition: attachment`. Entrada ajena, inexistente o malformada: 404 idéntico (D-14). Sin sesión válida: 401 (ver nota). |

**Sin sesión válida (decidido en la revisión cruzada del 2026-11-16; cierra D5-4 y D6-11 de 10).** Los *handlers* con cookie (historial y QR) responden **401** con el cuerpo JSON `{ error: { code: 'UNAUTHENTICATED', message, requestId } }` y `Cache-Control: no-store`, sin redirigir: es la regla general de 02 §8 («devolver `UNAUTHENTICATED`») y del catálogo de 02 §10.2 aplicada a Route Handlers (02 §10.1). Sesión ausente, con formato inválido, revocada o vencida reciben la misma respuesta. Lo comprueban T-ENT-03b, T-CHAT-16a y T-SEG-04c.
| `POST /api/pagos/paypal/webhook` | Firma de la pasarela; sin cookie ni `Origin` | TX-10. | **2xx solo si el evento quedó registrado o el trabajo pendiente quedó escrito** (`{ status: processed \| ignored \| duplicate \| pending }`); 400 firma inválida o cabeceras ausentes; 413 cuerpo > 256 KB; **503** verificación o pasarela no disponible sin trabajo escrito; 500 defecto. |

---

## 5. Socket.IO (cargas, confirmaciones y errores definidos el 2026-11-13; verificado contra 04 TX-14 y TX-15)

**Conexión.** Mismo origen, ruta `/socket.io/`. El *handshake* exige `Origin = APP_ORIGIN` y cookie de sesión válida; si no, `connect_error` con `UNAUTHENTICATED` u `ORIGIN_MISMATCH`. Cada socket entra en `user:<userId>` y `session:<sessionId>`. Tamaño máximo de mensaje reducido (16 KB).

Errores en las confirmaciones: `{ ok: false, error: { code, message, requestId, details? } }` (misma forma que 02 §10.1, sin `fieldErrors` salvo `VALIDATION_ERROR`). Los eventos del servidor no llevan confirmación.

| Evento | Dirección | Carga | Confirmación | Errores |
|---|---|---|---|---|
| *handshake* | Cliente → servidor | Cookie de sesión + `Origin` | Conexión o `connect_error` | `UNAUTHENTICATED`, `ORIGIN_MISMATCH` |
| `chat:join` | Cliente → servidor | — | `{ ok: true, presence, lastMessageId }` | `UNAUTHENTICATED` |
| `chat:leave` | Cliente → servidor | — | — | — |
| `chat:send` | Cliente → servidor | `{ clientMessageId: uuid, text: string }` | `{ ok: true, message }` (mensaje guardado, también en un reenvío) o `{ ok: false, error }` | `VALIDATION_ERROR` (texto vacío o solo espacios, > 500 puntos de código, UUID inválido), `RATE_LIMITED` (`details.retryAfterSeconds`), `UNAUTHENTICATED`, `INTERNAL_ERROR` |
| `chat:message` | Servidor → `chat:general` | `{ id, author: { id, displayName }, text, createdAt, clientMessageId }` | — | — |
| `presence:update` | Servidor → `chat:general` | `{ users: [{ id, displayName }], count }` | — | — |
| `notification:new-message` | Servidor → sockets fuera de `chat:general` y que no son del autor | `{ messageId, authorDisplayName, createdAt }` | — | — |
| `session:expired` | Servidor → socket | `{ reason: 'expired' \| 'revoked' }` | — | — |

**Mensaje, presencia y notificación (no se confunden).** `chat:message` lleva el **contenido** y solo llega a quien está en la sala; `presence:update` lleva **quién está** en la sala (0→1 o 1→0 sockets por usuario); `notification:new-message` es un **aviso sin texto** para quien está en otra pantalla del panel.

**Validación de la sesión (TX-14, INV-14).** (1) *Handshake*: `Origin = APP_ORIGIN` y cookie con sesión vigente (`revokedAt IS NULL AND expiresAt > now`); si no, `connect_error` con `ORIGIN_MISMATCH` o `UNAUTHENTICATED`. (2) **Cada evento entrante** revalida la sesión antes de procesarse; si ya no es válida: se emite `session:expired` (`expired` o `revoked`), se responde `UNAUTHENTICATED` si hay confirmación pendiente y se desconecta. (3) Cierre sin esperar al cliente por tres vías: inmediato tras el `COMMIT` de salida o de restablecimiento de contraseña (`disconnectSession(sessionId, 'logout')` / `disconnectUser(userId, 'password-reset')`, contrato del puente de 02 §7.2; nombre unificado el 2026-11-16, cierra D6-9), temporizador por socket hasta `expiresAt` y barrido J3 cada 30 s. Si el puente falla, (2) y las otras vías garantizan el cierre.

**Deduplicación (TX-15).** Clave `(authorId, clientMessageId)`, única en la base. Dentro de la cola de la sala: si ya existe, se devuelve el mensaje guardado en la confirmación y **no se emite de nuevo**; si dos envíos simultáneos chocan en el `INSERT`, el perdedor revierte, relee y devuelve el existente sin emitir (una fila, un `chat:message`). El orden es «insertar → confirmar → emitir»; la auditoría no registra mensajes.

**Recuperación del historial al reconectar.** El cursor es el `id` entero. Al conectar o reconectar el cliente llama a `GET /api/chat/mensajes?after=<último id>&limit=100` (§4) y, tras `chat:join`, compara con `lastMessageId`; si recibe un `chat:message` con `id > último + 1` pide el hueco con `after`. Descarta por `id` lo ya mostrado. El historial antiguo se pide con `before=<id>&limit=30`. Un mensaje propio pendiente se empareja por `clientMessageId`; si la emisión falló tras persistir, el mensaje se recupera por este mismo historial.

- **Orden:** una cola en proceso por sala serializa «insertar → confirmar → emitir»; orden total por `id`.
- **Texto del mensaje:** plano 1–500 puntos de código tras normalizar (NFC, recorte), no solo espacios; límite de 5 mensajes cada 10 s por usuario (memoria).
- **Presencia:** mapa en memoria `userId → conjunto de sockets en la sala`. Desconexión abrupta detectada por latido (25 s + 20 s). Tras un reinicio se reconstruye al reconectar.
- **Diferencias:** `chat:message` es contenido para quien tiene el chat abierto; `presence:update` es el estado de quién está en la sala; `notification:new-message` es el aviso para quien está en otra pantalla del panel. Criterio de demostración: dos navegadores, uno en `/panel/chat` y otro en `/panel`; al enviar, el segundo muestra la insignia sin recargar.

---

## 6. Pagos (decidido; ejemplos en §6.6)

### 6.1 Puerto

```ts
interface PaymentGateway {
  createOrder(i: { idempotencyKey: string; paymentId: string; reservationId: string;
                   amountCents: number; currency: 'USD'; description: string;
                   returnUrl: string; cancelUrl: string }):
    Promise<{ orderId: string; approvalUrl: string }>;
  captureOrder(i: { orderId: string; idempotencyKey: string }): Promise<CaptureOutcome>;
  getOrder(orderId: string, o?: { timeoutMs?: number }): Promise<OrderSnapshot>;      // timeoutMs reducido en la ruta del webhook (04 TX-10)
  verifyWebhook(i: { headers: Record<string, string>; rawBody: string; timeoutMs?: number }):
    Promise<{ valid: false } | { valid: true; event: GatewayEvent }>;                 // lanza GatewayError UNAVAILABLE si el verificador no responde: NO es «firma inválida»
}

type OrderSnapshot = {
  orderId: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  customId?: string; invoiceId?: string;
  capture?: { id: string;
              status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED' | 'FAILED';
              amountCents: number | null; currency: string };
};
type CaptureOutcome =
  | { kind: 'SNAPSHOT'; snapshot: OrderSnapshot }
  | { kind: 'NOT_APPROVED' } | { kind: 'DECLINED' } | { kind: 'ALREADY_CAPTURED' }
  | { kind: 'UNCERTAIN'; cause: 'TIMEOUT' | 'SERVER_ERROR' | 'NETWORK' | 'UNRECOGNIZED' };
// 'UNRECOGNIZED' = un 4xx cuyo issue no es uno de los tres rechazos definitivos de abajo: se trata como INCIERTO, nunca como rechazo
// (04 TX-08.0). Solo ORDER_NOT_APPROVED/PAYER_ACTION_REQUIRED (NOT_APPROVED) e INSTRUMENT_DECLINED (DECLINED) son rechazos definitivos.
type GatewayEvent = { id: string; type: string; orderId?: string; captureId?: string };

// createOrder lanza GatewayError (añadido el 2026-11-13, 04 TX-07):
//   UNAVAILABLE       = tiempo agotado, red o 5xx; se puede reintentar con la misma clave
//   DUPLICATE_INVOICE = issue DUPLICATE_INVOICE_ID de PayPal
//   REJECTED          = cualquier otro 4xx (incluye un posible rechazo por clave duplicada simultánea)
class GatewayError extends Error { kind: 'UNAVAILABLE' | 'DUPLICATE_INVOICE' | 'REJECTED'; code?: string }
// idempotencyKey: UUID de 36 caracteres (04 §1, principio 10).
```

Responsabilidades: el adaptador traduce protocolo y estados; **no** decide nada de negocio. La decisión vive en `settlePayment`.

### 6.2 Adaptador PayPal Sandbox (datos verificados el 2026-11-12)

| Elemento | Valor |
|---|---|
| Base | `https://api-m.sandbox.paypal.com` (el entorno rechaza cualquier otra en el MVP). |
| Autenticación | OAuth 2 de credenciales de cliente en `/v1/oauth2/token`; token en memoria hasta poco antes de caducar. |
| Crear | `POST /v2/checkout/orders`, `intent: "CAPTURE"`, una unidad de compra con `reference_id`, `custom_id` = id de reserva, `invoice_id` = id de pago, `amount { currency_code: "USD", value }`; `payment_source.paypal.experience_context` con `return_url`, `cancel_url`, `user_action: "PAY_NOW"`, `shipping_preference: "NO_SHIPPING"`. Cabecera `PayPal-Request-Id` siempre, con un UUID de 36 caracteres (la referencia de PayPal recomienda UUID por su límite de 38; consultado el 2026-11-13, [04 §5.1](04-reglas-transacciones-y-concurrencia.md)). |
| Enlace de aprobación | `rel` `payer-action` (con `payment_source`) o `approve`; el adaptador acepta ambos. |
| Capturar | `POST /v2/checkout/orders/{id}/capture` con `PayPal-Request-Id` (opcional en la referencia; la clave del **intento** persistida en `Payment.captureAttemptKey`: la misma al reanudar un intento de resultado desconocido y **nueva solo tras un rechazo definitivo**, 04 principio 10 y TX-08.0) y `Prefer: return=representation`. El adaptador acepta 200 y 201 (un reintento duplicado devuelve 200) y traduce los errores 422 **por `issue`**: `ORDER_NOT_APPROVED` y `PAYER_ACTION_REQUIRED` → `NOT_APPROVED`; `INSTRUMENT_DECLINED` → `DECLINED`; `ORDER_ALREADY_CAPTURED` → `ALREADY_CAPTURED` (consultado el 2026-11-13; códigos HTTP exactos por confirmar en P4-06). |
| Consultar | `GET /v2/checkout/orders/{id}`. |
| Dónde está la captura | `purchase_units[0].payments.captures[0]` (`id`, `status`, `amount`, `custom_id`, `invoice_id`). |
| Regla crítica | Orden `COMPLETED` **no basta**: debe comprobarse el estado de la captura. |
| Ventana | Se anotó el 2026-11-12 «6 h para redirigir y 6 h para aprobar y capturar» (esquema OpenAPI v2.36). **No se reconfirmó el 2026-11-13**: la cifra de 6 h que consta hoy en la documentación es la de la **clave de idempotencia** y no se halló una fuente sobre la vida de una orden. El diseño no depende de ella: la retención propia es de 15 min (04 §5.2). |
| Tiempo de espera | 10 s por llamada (`AbortSignal.timeout`). |
| Webhook | Cabeceras `paypal-transmission-id`, `-time`, `-sig`, `paypal-cert-url`, `paypal-auth-algo`. Verificación por `POST /v1/notifications/verify-webhook-signature` insertando el cuerpo recibido **sin volver a serializar**. Hasta 25 reintentos en 3 días (**el diseño no depende de ellos**, 04 TX-10.3). Requiere HTTPS en el puerto 443. Los eventos del simulador no se pueden verificar por este medio: **no sustituyen** la prueba con eventos reales de una aplicación Sandbox (T-PAG-24). Existe también la verificación criptográfica local (requiere el cuerpo original para el CRC32); el MVP usa el *postback* (D-43). |
| Eventos suscritos | `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`. La orden relacionada está en `resource.supplementary_data.related_ids.order_id`. |

Por confirmar en P4-06: códigos y estados HTTP exactos de los errores de captura (`ORDER_NOT_APPROVED`, `ORDER_ALREADY_CAPTURED`, `INSTRUMENT_DECLINED`, `PAYER_ACTION_REQUIRED`), la **retención real** de la clave de idempotencia para estos endpoints y su conducta ante una repetición simultánea o con otro cuerpo. **Qué se sabe y con qué grado** (el 2026-11-13): leído en las páginas por el navegador de investigación ([FUENTES-PAYPAL-REVISION.md](../../FUENTES-PAYPAL-REVISION.md)): la retención depende de la API y se consulta en la referencia del endpoint; una repetición con la misma clave devuelve el estado más reciente de la petición anterior; dos solicitudes simultáneas con la misma clave pueden hacer fallar a la segunda (sin código único documentado); la clave debe distinguir el tipo de operación; se recomienda UUID y se menciona un límite de 38 caracteres, mientras que la referencia de creación muestra 1–10 000. **Solo resúmenes de búsqueda (no confirmados en página completa):** que para Orders el servidor guarde la clave 6 h (72 h ampliable) o 45 días en otras API, y que una orden se capture una sola vez (`ORDER_ALREADY_CAPTURED`). La retención de seis horas y la vida de una orden **no están confirmadas**. Detalle en [04 §5](04-reglas-transacciones-y-concurrencia.md).
### 6.3 Adaptador `fake`

Determinista y programable desde las pruebas (resultado de la siguiente creación, captura o consulta; latencia; fallos; y, para las pruebas concurrentes de 04 TX-07/TX-08, una **compuerta** que retiene cada llamada hasta que la prueba la libera, modos de clave repetida y la regla «una orden se captura una sola vez»). Almacén de órdenes en el registro global del proceso. Firma de webhook simulada con HMAC y `FAKE_PAYMENT_WEBHOOK_SECRET`. Pantalla `/pasarela-simulada/[orderId]` con «Aprobar» y «Cancelar». Prohibido con `APP_ENV=production`. La interfaz muestra un aviso permanente «Pasarela simulada».

### 6.4 Correspondencia con el modelo local

| Pasarela | Local |
|---|---|
| Orden creada | `Payment.ORDER_CREATED` |
| Captura `COMPLETED` coincidente | `Payment.CAPTURED` → reserva `CONFIRMED` o `REVIEW_REQUIRED` según TX-09 |
| Captura `COMPLETED` no coincidente | `Payment.DISCREPANT` + `REVIEW_REQUIRED` |
| Captura `PENDING` o resultado desconocido | `REVIEW_REQUIRED` (`UNCERTAIN_RESULT`) |
| Sin captura | Sin cambio |
| Evento de webhook | `PaymentEvent` (único por id de evento) |

### 6.5 `REVIEW_REQUIRED` y dinero sin entradas

El administrador ve motivo, importes esperado y capturado, identificadores de orden y captura, y la disponibilidad actual. «Consultar pasarela» ejecuta TX-11. Si el dinero está capturado y no puede emitirse, el caso permanece abierto y se resuelve fuera del sistema (RB-09): **no existen reembolsos en el MVP**. Una redirección del navegador nunca es prueba de pago.

### 6.6 Ejemplos (datos ficticios; 2026-11-13)

Se distinguen dos orígenes: **[APP]** es lo que nuestra aplicación recibe o devuelve (contratos de §3, §4 y 04); **[PAYPAL]** es lo que cruza con PayPal, **ilustrativo y recortado**: la forma exacta de los cuerpos y los códigos HTTP de los errores no están verificados contra Sandbox (ver «Pendientes de Sandbox» al final). Identificadores inventados: reserva `7c1e…0a01`, pago `b2f4…0b02`, orden `5O190127TN364715T`, captura `3C679366HH908993F`.

**Ningún ejemplo trata el retorno del navegador como confirmación.** Volver de PayPal solo carga la página de retorno; la reserva está `CONFIRMED` únicamente si `capturePaymentAction` devolvió `CONFIRMED` tras una captura `COMPLETED` coincidente, o si lo concilió el webhook o TX-11.

**1. Crear la orden (TX-07).**

```jsonc
// [APP] startPaymentAction({ reservationId: "7c1e…0a01" })  — éxito: redirect() a approvalUrl (no devuelve ActionResult)
// [PAYPAL] POST /v2/checkout/orders   (PayPal-Request-Id = createKey(paymentId), UUID de 36 caracteres)
{ "intent": "CAPTURE",
  "purchase_units": [{ "reference_id": "default", "custom_id": "7c1e…0a01", "invoice_id": "b2f4…0b02",
                       "description": "Reserva de turismo comunitario",
                       "amount": { "currency_code": "USD", "value": "45.00" } }],
  "payment_source": { "paypal": { "experience_context": { "return_url": "https://app.ejemplo.test/panel/reservas/7c1e…0a01/pago/retorno",
                                  "cancel_url": "https://app.ejemplo.test/panel/reservas/7c1e…0a01/pago/cancelado",
                                  "user_action": "PAY_NOW", "shipping_preference": "NO_SHIPPING" } } } }
// [PAYPAL] respuesta recortada → el adaptador la reduce a { orderId, approvalUrl }
{ "id": "5O190127TN364715T", "status": "PAYER_ACTION_REQUIRED",
  "links": [{ "rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T" }] }
// [APP] fallo: ActionResult
{ "ok": false, "error": { "code": "GATEWAY_UNAVAILABLE", "message": "La pasarela no respondió. Inténtalo de nuevo.",
                          "details": { "retryable": true }, "requestId": "req_0001" } }
```

Repetir la acción con la orden ya guardada devuelve la misma URL sin llamar a PayPal (A5).

**2. Captura confirmada (TX-08, TX-09).**

```jsonc
// [APP] capturePaymentAction({ reservationId }) lo envía la página de retorno al montarse
// [PAYPAL] POST /v2/checkout/orders/5O190127TN364715T/capture   (PayPal-Request-Id = captureAttemptKey; Prefer: return=representation)
{ "id": "5O190127TN364715T", "status": "COMPLETED",
  "purchase_units": [{ "payments": { "captures": [{ "id": "3C679366HH908993F", "status": "COMPLETED",
      "custom_id": "7c1e…0a01", "invoice_id": "b2f4…0b02", "amount": { "currency_code": "USD", "value": "45.00" } }] } }] }
// El adaptador la traduce a CaptureOutcome { kind: 'SNAPSHOT', snapshot: { …, capture: { status: 'COMPLETED', amountCents: 4500, currency: 'USD' } } }
// [APP] respuesta: captura COMPLETED y coincidente → settlePayment → reserva CONFIRMED + entradas
{ "ok": true, "data": { "status": "CONFIRMED" } }
// [APP] otra captura propia en curso, o intento desconocido en conciliación (no es un error)
{ "ok": true, "data": { "status": "IN_PROGRESS" } }
```

**3. Captura que queda en revisión (TX-08.5).**

```jsonc
// [PAYPAL] captura con status "PENDING" (o importe distinto, o tiempo agotado sin conclusión tras getOrder ×2)
// [APP] la reserva pasa a REVIEW_REQUIRED; el comprador ve «en verificación», sin entradas
{ "ok": false, "error": { "code": "PAYMENT_UNDER_REVIEW", "message": "Tu pago está en verificación.",
                          "details": { "reviewReason": "UNCERTAIN_RESULT" }, "requestId": "req_0002" } }
// Rechazo definitivo (INSTRUMENT_DECLINED): PAYMENT_DECLINED; el siguiente intento usa clave nueva
```

**4. Webhook (TX-10).** Entrada **[PAYPAL → APP]** a `POST /api/pagos/paypal/webhook` (sin cookie ni `Origin`); cabeceras `paypal-transmission-id`, `-time`, `-sig`, `paypal-cert-url`, `paypal-auth-algo`; el cuerpo se verifica **sin volver a serializar**:

```jsonc
{ "id": "WH-1AB23456CD789012E-3FG45678HJ901234K", "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": { "id": "3C679366HH908993F", "status": "COMPLETED", "custom_id": "7c1e…0a01",
                "supplementary_data": { "related_ids": { "order_id": "5O190127TN364715T" } } } }
```

| Caso | Respuesta **[APP]** | Efecto local |
|---|---|---|
| Aplicado (la instantánea de `getOrder` confirma la captura) | `200 { "status": "processed" }` | `PaymentEvent` `APPLIED`; reserva `CONFIRMED` si aún no lo estaba |
| Duplicado (mismo `id` de evento) | `200 { "status": "duplicate" }` | Nada nuevo |
| Tipo no suscrito, orden desconocida o `REFUNDED`/`REVERSED` | `200 { "status": "ignored" }` | `PaymentEvent` ignorado o `NO_CHANGE`; en un reembolso sobre reserva confirmada, `AuditEvent` `REFUND_AFTER_CONFIRMATION` |
| Contradictorio o pasarela no disponible con el pago `ORDER_CREATED`: trabajo escrito (`nextCheckAt` adelantado) | `200 { "status": "pending" }` | Sin `PaymentEvent`; TX-11 lo recoge. **No es un fallo**: el trabajo quedó escrito |
| Verificación o pasarela no disponible y **sin** trabajo escrito | `503` | Nada; PayPal puede reintentar, pero el diseño no depende de ello |
| Firma inválida o cabeceras ausentes / cuerpo > 256 KB / defecto | `400` / `413` / `500` | Sin `PaymentEvent`; la firma inválida deja auditoría `DENIED` |

**5. «Consultar pasarela» (TX-11).**

```jsonc
// [APP] checkGatewayAction({ reservationId }) — solo ADMIN; la reserva debe estar REVIEW_REQUIRED
// [PAYPAL] GET /v2/checkout/orders/5O190127TN364715T  (solo lectura; nunca captura)
// [APP] respuesta resumida, sin nombres ni fechas de nacimiento (valores ilustrativos)
{ "ok": true, "data": { "reservationStatus": "CONFIRMED", "reason": "RECONCILED_BY_ADMIN",
    "gatewayOrderStatus": "COMPLETED", "gatewayCaptureStatus": "COMPLETED",
    "expectedCents": 4500, "capturedCents": 4500, "orderId": "5O190127TN364715T",
    "captureId": "3C679366HH908993F", "availability": { "capacity": 20, "committed": 12 } } }
// [APP] errores: INVALID_STATE (details.reservationStatus), NOT_FOUND, GATEWAY_UNAVAILABLE (503), FORBIDDEN
```

Los nombres de los campos de `data` y de `reason` y `availability` son los de §3.4 y 6.5; los **valores** son ilustrativos (la lista definitiva de motivos está en 04 TX-09).

**Pendientes de Sandbox (no verificados; ver 04 §5.2 y T-PAG-24, Q-08).** Forma y códigos HTTP exactos de los errores de captura (`ORDER_NOT_APPROVED`, `ORDER_ALREADY_CAPTURED`, `INSTRUMENT_DECLINED`, `PAYER_ACTION_REQUIRED`); retención real de la clave de idempotencia y su conducta ante repetición simultánea o con otro cuerpo; si Orders v2 devuelve la misma orden al reintentar la creación; consistencia de `getOrder` tras capturar; vida útil de una orden; plazo de respuesta del webhook; verificación de un webhook **real** por *postback*. Los cuerpos de PayPal de arriba son ilustrativos hasta esa prueba.

---

## 7. Entradas y QR (decidido)

| Aspecto | Decisión |
|---|---|
| Token | 32 bytes de `crypto.randomBytes`; texto `TC1.` + base64url (47 caracteres). El QR contiene solo ese texto. |
| Búsqueda | `tokenHash` = SHA-256 de los 32 bytes, en hexadecimal, único. |
| Copia cifrada | AES-256-GCM, *nonce* aleatorio de 12 bytes, datos asociados = id de la entrada, clave elegida por `tokenKeyId`. |
| Llavero | `TICKET_KEYRING="k1:<base64 de 32 bytes>[,k2:…]"`, `TICKET_ACTIVE_KEY_ID`. Se cifra con la activa y se descifra con la indicada en la fila. |
| Rotación | Añadir clave nueva → activarla → `scripts/rotate-ticket-key.ts` recifra → retirar la antigua. |
| Pérdida de clave | Lo ya descargado sigue validándose (solo se necesita el hash). Para volver a descargar: `scripts/reissue-tickets.ts` genera tokens nuevos para entradas sin usar (RB-10). |
| Entrega | Imagen PNG por `GET /api/entradas/[ticketId]/qr`; código de texto bajo demanda con `revealTicketCodeAction`. El token nunca va en una URL ni en registros. |
| Ingreso | Dos acciones separadas (`lookupTicketAction`, `checkInTicketAction`), ambas con el token en el cuerpo. Límite: 30 consultas por minuto por operador. |
