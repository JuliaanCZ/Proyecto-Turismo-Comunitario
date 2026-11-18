# Historias de usuario del MVP del primer bimestre

Historias de B0.7, con el estado final registrado en B3.2. Las quince historias son obligatorias. La prioridad ordena la implementación y el tiempo de demostración según el peso de la rúbrica.

El estado sale del código de `main` en `a887e67` y de la ejecución real de `npm test` del 17-11-2026 (202 pruebas, 202 pasan; [salida literal](evidencias/B3.2/npm-test.txt)). Todas las pruebas automatizadas citadas existen y pasan. TM-DEP-02 es una verificación manual del despliegue. La matriz completa está en [pruebas.md](pruebas.md).

Referencias: [Plan del MVP, §1, §2.3 y §5.1](../../mvp-primer-bimestre/PLAN-MVP.md) y [casos de uso del plan general, §4](../planificacion/01-alcance-y-trazabilidad.md).

| Historia | Prioridad y motivo | Bloque | Pruebas | Estado |
|---|---|---|---|---|
| HU-01 Registro | Media · Registro y recuperación, R4 (2,0 puntos) | B1.1 | TM-CTA-01 a TM-CTA-05 | Implementada |
| HU-02 Ingreso | Media · Sesión y seguridad, R5 (2,0 puntos) | B1.2 | TM-CTA-06, TM-CTA-07, TM-CTA-11, TM-CTA-12 | Implementada |
| HU-03 Recuperar clave | Media · Registro y recuperación, R4 (2,0 puntos) | B1.3, B2.1 | TM-CTA-13 a TM-CTA-19, TM-INT-02 | Implementada. También probada a mano con dos navegadores ([B2.1](evidencias/B2.1/LEEME.md)) |
| HU-04 Salir | Media · Sesión y seguridad, R5 (2,0 puntos) | B1.2, B1.6, B2.1 | TM-CTA-09, TM-WS-05, TM-INT-01 | Implementada. También probada a mano con dos navegadores ([B2.1](evidencias/B2.1/LEEME.md)) |
| HU-05 Panel principal | Alta · Pantalla principal del CRUD, R6 (3,0 puntos) | B0.1, B1.9, B2.2 | TM-BASE-01, TM-NAV-01 a TM-NAV-06 | Implementada |
| HU-06 Crear oferta | Alta · Alta del CRUD, R6 (3,0 puntos) | B1.4, B1.5 | TM-OFE-01, TM-OFE-02, TM-OFE-08a, TM-OFE-09, TM-OFE-10 | Implementada |
| HU-07 Listar con filtro por provincia y paginación | Alta · Listado del CRUD, R6 (3,0 puntos) | B1.4, B1.5 | TM-OFE-03, TM-OFE-04, TM-OFE-08, TM-OFE-14, TM-OFE-17 | Implementada |
| HU-08 Ver detalle por ID | Alta · Consulta del CRUD, R6 (3,0 puntos) | B1.4, B1.5 | TM-OFE-09, TM-OFE-11 a TM-OFE-13, TM-OFE-17 | Implementada |
| HU-09 Editar | Alta · Edición del CRUD, R6 (3,0 puntos) | B1.4, B1.5 | TM-OFE-05, TM-OFE-08a, TM-OFE-09, TM-OFE-10, TM-OFE-12, TM-OFE-16 | Implementada |
| HU-10 Eliminar con confirmación | Alta · Baja del CRUD, R6 (3,0 puntos) | B1.4, B1.5 | TM-OFE-06, TM-OFE-08a, TM-OFE-09, TM-OFE-12, TM-OFE-15 | Implementada |
| HU-11 Enviar y recibir mensajes | Alta · Mensajería del chat, R7 (2,5 puntos) | B1.7 | TM-CHAT-01 a TM-CHAT-03, TM-CHAT-07, TM-CHAT-09 | Implementada |
| HU-12 Ver historial | Alta · Persistencia y recuperación del chat, R7 (2,5 puntos) | B1.7 | TM-CHAT-04 a TM-CHAT-06, TM-CHAT-08 | Implementada |
| HU-13 Ver usuarios conectados | Alta · Presencia del chat, R7 (2,5 puntos) | B1.8 | TM-CHAT-10 a TM-CHAT-14 | Implementada |
| HU-14 Aviso de nuevo mensaje en el panel | Alta · Aviso adicional del chat, R7 (2,5 puntos) | B1.10, B2.2 | TM-NOT-01 a TM-NOT-05 | Implementada |
| HU-15 Conexión WebSocket autenticada | Alta · Acceso al chat, R7 (2,5 puntos) | B1.6, B1.11, B2.1 | TM-WS-01 a TM-WS-07, TM-DEP-02, TM-INT-03 a TM-INT-05 | Implementada. WSS y respuesta 101 verificados solo en local con Caddy ([despliegue](despliegue.md)). El despliegue público y la captura de DevTools con sesión están pendientes (PM-03) |

## Criterios de aceptación

### HU-01 Registro

Como visitante, quiero crear una cuenta para gestionar mis ofertas y participar en el chat.

- En `/registro`, un nombre, correo, contraseña y confirmación válidos crean una cuenta. SQLite conserva un hash Argon2id con sal. Dos cuentas con la misma contraseña tienen hashes distintos.
- El formulario señala los campos inválidos. Una petición directa con datos inválidos devuelve 422 sin crear cuenta. Un correo duplicado, aunque cambie su capitalización, devuelve 409 `EMAIL_TAKEN`.

### HU-02 Ingreso

Como visitante con cuenta, quiero iniciar sesión para acceder a mi panel.

- En `/ingreso`, las credenciales válidas crean una sesión nueva y dan acceso a `/panel`. La cookie `tc_session` (o `__Host-tc_session` con HTTPS) lleva `HttpOnly` y `SameSite=Lax`. SQLite conserva únicamente el hash del token.
- Una contraseña incorrecta y un correo desconocido producen el mismo mensaje y estado. Un destino externo en `next` se ignora y el ingreso exitoso lleva a `/panel`.

### HU-03 Recuperar clave

Como visitante con cuenta, quiero pedir un enlace de recuperación para volver a ingresar cuando olvide mi clave.

- `/recuperar` responde igual para un correo registrado y uno desconocido. En la demo, `/dev/bandeja` permite obtener el enlace solo con la bandeja habilitada y la clave correcta. Deshabilitada responde 404 y sin clave responde 401.
- `/restablecer?token=` acepta solo el token vigente más reciente, una vez y durante 30 minutos. Al cambiar la clave, se revocan todas las sesiones previas del usuario y se cierran sus sockets.

### HU-04 Salir

Como usuario registrado, quiero cerrar sesión para impedir que se siga usando mi acceso en ese navegador.

- `POST /salir` con origen y CSRF válidos revoca la sesión actual. La cookie anterior pierde acceso a `/panel`, `/panel/chat` y al historial. Repetir la salida deja el mismo resultado.
- El evento interno `session-revoked` identifica la sesión cerrada. Sus sockets reciben `session:expired` con motivo `revoked` y se desconectan. Las demás sesiones siguen activas.

### HU-05 Panel principal

Como usuario registrado, quiero entrar al panel y encontrar la navegación principal para administrar mis ofertas y abrir el chat.

- La portada pública `/` ofrece los enlaces Ofertas, Ingresar y Crear cuenta. `/salud` devuelve 200 y `{"status":"ok"}` para comprobar que la aplicación está disponible.
- `/panel` redirige a `/ingreso` cuando falta sesión. Con sesión muestra Inicio, Mis ofertas, Chat y Salir, así como el total real de ofertas propias. Las pantallas privadas mantienen el menú y una ruta inexistente muestra un 404 con enlace de regreso.

### HU-06 Crear oferta

Como usuario registrado, quiero crear una oferta turística para preparar una experiencia que pueda publicar.

- Desde `GET /panel/ofertas/nueva` se envía el formulario a `POST /panel/ofertas`. Se guardan como borrador el título, la descripción, la provincia, la ubicación, la fecha y hora de inicio futura y el cupo referencial. El borrador aparece en Mis ofertas.
- Los campos inválidos muestran mensajes junto a cada campo. El servidor devuelve 422, conserva los valores del formulario y no crea una oferta si los datos son inválidos.

### HU-07 Listar con filtro por provincia y paginación

Como usuario registrado, quiero filtrar y paginar mis ofertas para encontrarlas por provincia. Como visitante, quiero recorrer el catálogo para descubrir experiencias disponibles.

- `/panel/ofertas?provincia=&pagina=` muestra solo ofertas propias que coinciden con la provincia seleccionada, en orden estable por fecha e ID y con hasta diez por página. Con 25 coincidencias se muestran 10, 10 y 5 sin repetir ni omitir filas. Los enlaces conservan el filtro y la consulta filtrada usa `idx_offers_owner_province_starts`.
- `GET /ofertas?pagina=` muestra hasta diez ofertas publicadas, futuras y con foto por página, ordenadas por fecha de inicio e ID. Cada oferta enlaza a su detalle público.

### HU-08 Ver detalle por ID

Como usuario registrado, quiero abrir el detalle de una oferta propia para revisar sus datos. Como visitante, quiero ver el detalle publicado y consultar su disponibilidad con la PYME.

- `/panel/ofertas/:id` muestra los datos de la oferta propia y `GET /panel/ofertas/:id/foto` permite previsualizar su foto. Un ID ajeno o inexistente responde 404.
- `GET /ofertas/:id` muestra el detalle y carga la imagen desde `GET /ofertas/:id/foto`. Ambos recursos responden 404 si la oferta es borrador, está vencida o carece de foto.
- «Consultar reserva por WhatsApp» abre `https://wa.me/<número>?text=<mensaje-codificado>` con el número comercial configurado y un mensaje codificado con el nombre y la fecha local de la oferta. El visitante decide si lo envía. Sin número válido se muestra «Contacto por WhatsApp no disponible».

### HU-09 Editar

Como usuario registrado, quiero editar mi oferta, gestionar su foto y cambiar su publicación para mantener actualizado el catálogo.

- `/panel/ofertas/:id/editar` permite cambiar los datos de una oferta propia. Los valores válidos se reflejan en el detalle y los inválidos reciben 422 sin guardar. Una oferta ajena o inexistente responde 404.
- `POST /panel/ofertas/:id/foto` acepta una imagen JPEG, PNG o WebP de hasta 2 MiB y texto alternativo, previa comprobación de sesión, propietario, origen y cabecera `x-csrf-token`. Una foto válida reemplaza la anterior. Si el archivo es inválido o excede los límites, la foto anterior se conserva.
- Publicar desde la edición requiere una foto válida y una fecha de inicio futura. Si se omite `isPublished`, se conserva el estado. Despublicar o llegar a la fecha de inicio oculta la oferta y su foto del catálogo.

### HU-10 Eliminar con confirmación

Como usuario registrado, quiero confirmar antes de eliminar una oferta propia para evitar bajas accidentales.

- `GET /panel/ofertas/:id/eliminar` muestra la confirmación sin borrar. Cancelar o enviar `POST /panel/ofertas/:id/eliminar` sin confirmar conserva la oferta.
- Al confirmar, se elimina la oferta propia y su foto. Una nueva consulta del detalle devuelve 404. Intentar borrar una oferta ajena devuelve 404 y conserva sus datos.

### HU-11 Enviar y recibir mensajes

Como usuario registrado, quiero enviar y recibir mensajes en la sala general para conversar en tiempo real.

- En `/panel/chat`, `chat:join` confirma la entrada en `chat:general` con `lastMessageId` y `presence`. `chat:leave` abandona la sala y detiene la recepción de sus mensajes.
- `chat:send` recibe `clientMessageId` como UUID y `text` de 1 a 500 puntos de código tras recortar espacios. Un envío válido se guarda antes de que `chat:message` llegue a la sala sin recargar y se muestra como texto plano.
- Una carga inválida recibe `VALIDATION_ERROR` sin persistencia ni emisión. Reintentar con el mismo `clientMessageId` conserva una sola fila y una sola emisión.

### HU-12 Ver historial

Como usuario registrado, quiero recuperar mensajes anteriores para retomar la conversación después de recargar o reconectar.

- `GET /api/chat/mensajes?before=&after=&limit=` devuelve mensajes en orden ascendente y exige sesión. Sin sesión responde 401 JSON `UNAUTHENTICATED`.
- Con 75 mensajes, las páginas de 30, 30 y 15 se recorren con `before` sin omisiones ni duplicados. Tras reconectar, `after` recupera los mensajes que faltan una sola vez. El historial sobrevive al reinicio con el mismo archivo SQLite.

### HU-13 Ver usuarios conectados

Como usuario registrado, quiero ver quién está conectado a la sala general para saber con quién puedo conversar.

- `presence:update` actualiza los nombres y el total de usuarios en `/panel/chat` sin recargar. La lista cuenta una vez a cada usuario unido a `chat:general` y solo incluye ID y nombre visible por usuario.
- Con dos pestañas del mismo usuario en la sala, cerrar una mantiene su presencia. Al salir la última o revocarse su sesión, deja de aparecer si no conserva otra conexión en la sala.

### HU-14 Aviso de nuevo mensaje en el panel

Como usuario registrado, quiero ver un aviso en el panel cuando llega un mensaje nuevo para decidir si abro el chat.

- En `/panel`, el socket de otro usuario fuera de `chat:general` recibe `notification:new-message` después de que se guarde un mensaje nuevo. En `#chat-badge` aparece «1 mensaje nuevo» sin recargar, con el contador en `sessionStorage` bajo `chatNuevos`.
- El aviso lleva `messageId`, `authorDisplayName` y `createdAt`. No se emite al autor, a sockets unidos a la sala ni al rechazar o repetir un envío.

### HU-15 Conexión WebSocket autenticada

Como usuario registrado, quiero que el chat y los avisos usen mi sesión para conservar el acceso mientras esté vigente.

- El cliente conecta por WebSocket a `/socket.io/` en el mismo servidor HTTP. Con cookie vigente y `Origin` exacto entra en `user:<id>` y `session:<id>`. El despliegue usa WSS y permite verificar el protocolo y la respuesta 101.
- Una cookie ausente, revocada o vencida causa `connect_error` con `UNAUTHENTICATED`. Un origen ausente o ajeno causa `ORIGIN_MISMATCH` con cookie válida.
- Al vencer una sesión activa, el socket recibe `session:expired` con motivo `expired` y se desconecta. Si la sesión ya está revocada en SQLite al recibir `chat:send`, el servidor rechaza el envío con `UNAUTHENTICATED` y cierra el socket sin guardar el mensaje.

## Alcance aplazado

El primer bimestre incluye catálogo, foto, publicación por el propietario y consulta por WhatsApp (HU-07 a HU-09). El cupo es referencial. La conversación y la confirmación se gestionan con la PYME fuera de la aplicación.

| Función aplazada | Motivo |
|---|---|
| Registro interno de reservas, reservas grupales y retenciones de cupo | El MVP deriva la consulta a WhatsApp. |
| Pagos, pasarela y conciliación | El equipo acordó una entrega sin cobro. |
| Entradas QR y control de ingreso | Dependen de una reserva interna y su confirmación. |
| Revisión, aprobación y versiones de ofertas | El propietario edita y publica directamente al cumplir las condiciones del MVP. |
| Roles de GAD, operador y administración | El MVP usa un único tipo de cuenta y autorización por propiedad. |

## TM-DOC-02 · Lista de comprobación del revisor

- [ ] Están HU-01 a HU-15, cada una con actor, objetivo, beneficio, criterios observables, prioridad justificada, bloque y pruebas previstas.
- [ ] Cada pantalla y ruta del plan §2.3 aparece en los criterios. Contrastar la portada y el estado en HU-05, cuentas en HU-01 a HU-04, ofertas y catálogo en HU-06 a HU-10, chat e historial en HU-11 a HU-13 y el handshake en HU-15.
- [ ] Los eventos de §5.1 están cubiertos: `chat:join`, `chat:leave`, `chat:send` y `chat:message` en HU-11, `presence:update` en HU-13, `notification:new-message` en HU-14 y `connect_error`, `session-revoked` y `session:expired` en HU-04 y HU-15.
- [ ] El catálogo, la foto y WhatsApp figuran en el primer bimestre. Cada función aplazada tiene un motivo y la columna Estado está disponible para B3.2.
