# Plan de implementación por fases — MVP de turismo comunitario

## 1. Objetivo y alcance del primer avance

Construir un **monolito web desplegable** para una PYME ecuatoriana ficticia que coordina experiencias de turismo comunitario. El flujo principal de la demostración será:

**El GAD crea una oferta → el operador aprueba sus condiciones → un turista reserva para un grupo → completa un pago de prueba → recibe un QR por asistente → el operador registra cada ingreso por separado.**

La **oferta turística** será la entidad principal del CRUD académico. La guía también exige registro, inicio y cierre de sesión, recuperación de contraseña, pantalla principal protegida, chat WebSocket con historial y presencia, una notificación adicional en tiempo real, esquema de base de datos, pruebas y una medición de rendimiento. El proyecto conserva esos requisitos dentro del mismo despliegue.

**Alcance acordado:** una fecha por oferta, reservas de 1 a 10 asistentes, tarifa general en USD, pago con PayPal Sandbox, entradas nominales y validación en línea. La acreditación documental, los descuentos, las sustituciones de asistentes, la cancelación posterior al pago, los reembolsos y la validación sin conexión quedan para un avance posterior. Una reserva impaga se libera al vencer su retención. Se usan cuentas y asistentes ficticios.

Fuentes del alcance. :codex-file-citation{path="C:/Users/Mateo/Downloads/Guía del Proyecto AppWebAv_2504f98cdeaee09e2463c51aecfa1fa2 copy.docx" purpose="source"} :codex-file-citation{path="C:/Users/Mateo/Downloads/Propuesta refinada.md" purpose="source"}

## 2. Arquitectura y contratos compartidos

**Stack acordado:** TypeScript, Next.js App Router, servidor HTTP propio de Node.js, PostgreSQL, Prisma y Socket.IO. NestJS queda para la evolución posterior. Un solo proceso Node sirve HTML renderizado en el servidor, acciones de formulario, rutas HTTP y WebSocket. El despliegue usa una instancia Node persistente detrás de HTTPS con soporte WSS. El servidor propio es el punto de entrada en desarrollo y producción. [Servidor propio de Next.js](https://nextjs.org/docs/app/guides/custom-server) · [Socket.IO con Next.js](https://socket.io/how-to/use-with-nextjs)

Organizar el código por módulos de **cuentas, ofertas, reservas, pagos, entradas, chat y auditoría**. Las páginas y los adaptadores HTTP o WebSocket llaman a servicios de aplicación. Los servicios comprueban permisos y reglas de negocio y controlan las transacciones de Prisma. Usar Server Actions para formularios y Route Handlers para el webhook, el historial incremental del chat y la descarga de entradas.

| Datos | Entidades e invariantes |
|---|---|
| Cuentas | `User`, `RoleAssignment`, `Gad`, `Attraction`, `Session`, `PasswordResetToken` y `LoginThrottle`. Registro público con rol `TOURIST`. Los roles `GAD`, `OPERATOR` y `ADMIN` y sus vínculos se provisionan con un seed de demostración. |
| Ofertas | `Offer` identifica GAD, atracción, estado comercial y versión pública. `OfferVersion` contiene título, descripción, provincia, ubicación, inicio y fin, precio, capacidad, edad mínima opcional, servicios y condiciones. Guardar autor, revisor, estado y fecha de decisión. Una sola versión de trabajo y numeración única por oferta. |
| Reservas | `Reservation` vincula comprador, oferta y versión contratada. Guarda vencimiento, estado, cantidad, precio unitario y total. `Attendee` guarda nombre y fecha de nacimiento solo cuando la oferta exige edad mínima. Una clave única por comprador y solicitud evita duplicar reservas por reintentos. |
| Pagos | `Payment` identifica la reserva, importe esperado, moneda, orden externa, captura y estado. Una fila por reserva, orden y captura externas únicas. `PaymentEvent` registra el ID único del webhook procesado. |
| Entradas | `Ticket` pertenece a un asistente y se emite una sola vez. Guarda hash único del token QR, copia cifrada para volver a descargarlo y fecha y operador de ingreso cuando se utiliza. |
| Chat y auditoría | `ChatMessage` guarda autor, texto, fecha e ID de envío único por autor. `AuditEvent` registra actor, recurso, acción, resultado y fecha. Los registros excluyen contraseñas, tokens, QR y datos de pago sensibles. |

Usar centavos enteros para los importes y UTC para almacenar instantes. Mostrar fechas y evaluar la edad en la fecha local de la actividad en `America/Guayaquil`. Todas las mutaciones web validan sesión, origen, datos y permisos en el servidor. El webhook usa verificación de firma. Las pantallas privadas y las descargas usan `Cache-Control: no-store` donde corresponda.

## 3. Fases de implementación

### Fase 0 — Base ejecutable

- Inicializar el proyecto, el servidor propio y la conexión con Prisma. Proveer PostgreSQL local, migraciones, `.env.example`, archivo de dependencias bloqueadas y scripts de instalación, compilación, arranque, seed y pruebas. Probar Socket.IO sobre el mismo servidor HTTP.
- Cargar dos GAD, dos atracciones, cuentas para los cuatro roles y ofertas ficticias. Mantener una base separada para pruebas. Preparar Git desde la primera fase para que cada integrante deje sus propios commits.

**Cierre:** un clon limpio levanta la aplicación, ejecuta las migraciones y prueba HTTP y WebSocket con el mismo punto de entrada.

### Fase 1 — Cuentas, sesión y panel

- Implementar `/registro`, `/ingreso`, `/recuperar`, `/restablecer` y `/panel`. El panel protegido enlaza al catálogo, a las funciones del rol y al chat a medida que estén disponibles. Incluye cierre de sesión.
- Normalizar correos, garantizar unicidad y usar Argon2id con sal. Guardar el hash del token aleatorio de sesión en la base. Cookie `HttpOnly`, `SameSite=Lax` y `Secure` en despliegue, con expiración de ocho horas. Aplicar límites temporales por cuenta y origen al ingreso y a la recuperación.
- Usar una bandeja SMTP de pruebas. El enlace de recuperación dura 30 minutos. Consumir el token y revocar las sesiones anteriores en la misma transacción que cambia la contraseña. Responder igual para correos existentes e inexistentes.

**Cierre:** un usuario puede registrarse, ingresar, recuperar su clave y salir. Una sesión revocada pierde acceso y dos consumos simultáneos del mismo token producen un solo cambio de contraseña.

### Fase 2 — CRUD de ofertas, revisión y catálogo

- Implementar `/panel/ofertas` con alta, listado, detalle, edición y eliminación con confirmación. Paginar de 10 en 10, ordenar por fecha e ID y filtrar por provincia indexada. Añadir `/ofertas` y `/ofertas/[id]` para el catálogo público.
- El GAD trabaja solo con ofertas de su institución. La versión pasa de `DRAFT` a `IN_REVIEW`. El operador de la atracción puede aprobar o devolver con motivo a `CHANGES_REQUESTED`. El autor nunca puede aprobar esa misma versión. Al aprobar, marcar `APPROVED` y cambiar el puntero público en la misma transacción. Usar escrituras condicionales para rechazar ediciones o decisiones concurrentes sobre una versión que ya cambió.
- Las versiones aprobadas son inmutables. Una edición abre otra versión y conserva la publicación anterior hasta que se apruebe. El GAD puede eliminar un borrador inédito o archivar una oferta publicada, conservando su historial. El operador puede suspender ventas de su atracción y el administrador puede archivar por moderación con motivo. Suspender o archivar bloquea nuevas retenciones y conserva el acceso a las entradas emitidas.
- Validar campos requeridos, longitudes, provincia, fechas, precio decimal, capacidad entera y edad mínima en cliente y servidor. Mostrar errores por campo. Registrar cambios de estado y decisiones de revisión.

**Cierre:** el GAD completa el CRUD y el operador asignado publica una versión aprobada. El catálogo muestra condiciones aprobadas y las consultas directas de recursos ajenos se rechazan.

### Fase 3 — Reserva grupal y control de cupos

- Desde el detalle público, el turista autenticado abre el formulario de reserva. Aceptar de 1 a 10 asistentes nominales. Validar edad en la fecha de la actividad si hay restricción y registrar la aceptación de las condiciones contratadas. El cliente envía asistentes, versión vista y clave de solicitud. El servidor verifica que la versión siga publicada, calcula el total y devuelve conflicto si cambió, para que el comprador revise las nuevas condiciones.
- Crear una retención de **15 minutos**. En una transacción, bloquear la fila de la oferta, comprobar que sigue abierta y futura, y calcular disponibilidad descontando asistentes confirmados y retenciones vigentes. Crear la reserva `HELD` y sus asistentes juntos. Una clave repetida con el mismo contenido devuelve la reserva existente. Una clave repetida con datos distintos devuelve conflicto.
- Usar el mismo bloqueo de oferta para reservar, confirmar y aprobar cambios que afecten al inventario. Desde la primera reserva, mantener fija la fecha y la atracción de esa oferta. Una nueva fecha se publica como otra oferta. Rechazar una reducción de capacidad por debajo de lo ya confirmado y retenido.
- Implementar `/panel/reservas` y `/panel/reservas/[id]` para el comprador. Una retención vencida deja de ocupar cupos por su fecha de expiración aunque el proceso de limpieza se retrase. Mostrar el estado y la hora de vencimiento. El GAD consulta únicamente datos agregados de sus ofertas.

**Cierre:** dos compras concurrentes por el último cupo no producen sobreventa. Vencer una retención libera sus cupos y cambiar el precio publicado no cambia el total de una reserva existente.

### Fase 4 — Pago de prueba y conciliación

- Definir un adaptador de pagos con `createOrder`, `captureOrder` y `getOrder`. Implementar **PayPal Sandbox Orders v2** y un adaptador determinista exclusivo de pruebas automatizadas. Configurar credenciales Sandbox mediante variables de entorno. Crear la orden desde el servidor con el total persistido, moneda USD y referencia a la reserva. Usar claves de idempotencia estables por operación y guardar el ID de la orden antes de enviar al comprador a aprobarla.
- La pantalla de retorno muestra el estado local. La captura se solicita desde el servidor para una reserva propia y con retención vigente. El webhook en `/api/pagos/paypal/webhook` verifica la firma y consulta la orden vinculada. La captura y el webhook llaman a la misma función de confirmación. Solo una captura `COMPLETED`, con orden, referencia, importe y moneda coincidentes, permite confirmar.
- Confirmar en una transacción bajo el bloqueo de la oferta. Si la retención sigue vigente, convertirla en confirmación. Si la captura se verifica después del vencimiento, recalcular disponibilidad y confirmar únicamente si la oferta sigue abierta, la actividad es futura y hay espacio para todo el grupo. Si falta capacidad, hay un importe discordante o el resultado es incierto, marcar `REVIEW_REQUIRED`, guardar el motivo y mantener las entradas sin emitir. Una reserva en revisión solo conserva su retención hasta el vencimiento original.
- Dar al administrador una vista de casos en revisión con la acción **Consultar pasarela**, que ejecuta las mismas comprobaciones. Ante fallo temporal del proveedor, permitir reintento sin duplicar efectos. Registrar un webhook como procesado en la misma transacción que aplica su resultado. Una notificación tardía nunca degrada una reserva confirmada ni vuelve a emitir entradas.

**Cierre:** completar un pago en Sandbox. Verificar con el adaptador de pruebas el retorno sin captura, una notificación repetida, un importe distinto, un resultado incierto y una captura tardía con y sin cupos. [PayPal Orders v2](https://developer.paypal.com/docs/api/orders/v2/) · [Verificación de webhooks de PayPal](https://developer.paypal.com/api/rest/webhooks/)

### Fase 5 — Entradas y validación de ingreso

- Implementar la emisión en la **misma transacción de confirmación de la fase 4**. Crear una entrada por asistente mediante restricción única. El QR contiene un token aleatorio opaco de 32 bytes. Guardar su hash para buscarlo y una copia cifrada autenticada para regenerar la descarga. El comprador puede abrir o descargar cada QR desde su reserva confirmada.
- En `/panel/ingresos`, el operador selecciona una actividad asignada y escanea el QR con la cámara o pega su código. Una primera acción consulta la entrada y muestra el nombre y estado. Una segunda registra el ingreso tras la comprobación presencial. Validar rol, atracción, actividad seleccionada, ventana entre inicio y fin y reserva confirmada. Si se rechaza el acceso presencial, conservar la entrada sin consumir.
- Consumir con una actualización condicional de una sola fila, comprobando que sigue vigente y sin uso. Guardar hora y operador junto al cambio y registrar el resultado en auditoría. Evitar que el token llegue a la URL o a los logs.

**Cierre:** una compra de cinco personas emite cinco QR distintos. Dos dispositivos que intentan consumir el mismo QR solo consiguen un ingreso y los otros cuatro siguen disponibles.

### Fase 6 — Chat y notificación académica

- Implementar `/panel/chat`, sala `general`, historial paginado y presencia de usuarios únicos. Usar la cookie de sesión en el handshake de Socket.IO, verificar origen y cerrar las conexiones al expirar o revocarse la sesión.
- Aceptar `chat:send` con `{ clientMessageId, text }`. Validar texto plano de 1 a 500 caracteres y limitar frecuencia. Persistir antes de emitir `chat:message`. Deduplicar reintentos por autor e ID de envío. Emitir `presence:update` al conectar o desconectar y `notification:new-message` para el aviso en el panel. Al reconectar, pedir el historial faltante por cursor.
- Mantener el contenido inicial renderizado por Next.js y usar el cliente Socket.IO para las actualizaciones sin recarga.

**Cierre:** dos usuarios intercambian mensajes, ven presencia y reciben el aviso adicional. El historial sobrevive al reinicio. Un visitante sin sesión no conecta al WebSocket.

## 4. Verificación, entrega y traspaso a la IA implementadora

**Pruebas.** Usar Vitest con PostgreSQL de pruebas y Playwright para los recorridos de navegador. Ejecutar las pruebas en cada fase y cubrir estos casos antes de liberar:

| Área | Pruebas de aceptación |
|---|---|
| Cuentas | Registro inválido, roles protegidos, límites de ingreso, recuperación vencida o reutilizada y cierre de sesión. |
| Ofertas | CRUD, filtro, paginación, acceso ajeno, autoaprobación, edición posterior a aprobación y conservación de condiciones contratadas. |
| Reservas | Doble envío, precio manipulado, edad en la fecha de actividad, vencimiento y competencia por el último cupo. |
| Pagos y entradas | Pago aprobado verificable, retorno del navegador sin captura, webhook inválido o duplicado, pago tardío, cinco entradas por cinco asistentes, QR ajeno y doble escaneo concurrente. |
| Chat | Handshake anónimo rechazado, envío inválido, historial, presencia, aviso adicional, reconexión y sesión revocada. |

**Entrega académica.** Medir el catálogo filtrado con el build de producción y datos ficticios. Registrar mediana, percentil 95, volumen y comando de reproducción. Entregar diagramas del monolito y del modelo relacional, matriz de requisitos con pruebas, README con pasos de ejecución y declaración de IA, repositorio público con commits de todo el equipo y etiqueta `v1.0-b1`. La matriz de seguridad debe relacionar los controles implementados con los objetivos Common Criteria de la propuesta y marcar los pendientes, sin declarar certificación. Preparar 15 minutos de presentación y 5 de preguntas con todos los integrantes, y subir el enlace o ZIP y la presentación según la guía.

**Instrucción para la IA implementadora.** Inspecciona el repositorio y ejecuta las fases en orden. Cada fase termina con código ejecutable, migraciones cuando correspondan, pruebas que demuestren el criterio de cierre y comandos de reproducción en el README. Usa el adaptador de prueba hasta disponer de credenciales Sandbox y registra la prueba real de Sandbox como pendiente hasta ejecutarla. El equipo revisa y comprende el código generado, asigna responsables y fechas, publica el repositorio y realiza la entrega. La demo final debe recorrer la compra grupal y el ingreso por QR, además de mostrar recuperación de clave, CRUD, chat y evidencias de seguridad.
