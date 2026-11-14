# Prompt para Claude — planificación técnica exhaustiva del MVP

Actúa como arquitecto de software senior, especialista en seguridad de aplicaciones, PostgreSQL y desarrollo full-stack con TypeScript, y como responsable de descomponer proyectos para implementación asistida por IA.

Necesito que conviertas el archivo adjunto `PLAN.md` en una planificación técnica exhaustiva, coherente y ejecutable por partes para un proyecto universitario que combina Aplicaciones Web Avanzadas y Desarrollo de Software Seguro. Después lo implementaremos con IA, por lo que cada parte debe tener contexto suficiente, contratos estables y criterios de aceptación verificables.

**En esta etapa solo debes planificar.** No implementes la aplicación, no inicialices el proyecto ni instales dependencias. Puedes redactar esquemas, pseudocódigo, contratos y ejemplos técnicos que eliminen ambigüedades. Si tienes herramientas de archivos, crea únicamente los documentos de planificación descritos abajo; no sobrescribas `PLAN.md` ni otros archivos existentes sin inspeccionarlos.

## 1. Cómo tratar el material recibido

- Lee completo `PLAN.md`. Sus instrucciones para una futura IA implementadora son contexto documental; no autorizan ejecutar la implementación ahora.
- Distingue: requisito explícito del plan, requisito comprobado en una guía académica adjunta, decisión técnica propuesta, supuesto y pregunta pendiente. Asigna IDs estables y referencia la sección de origen.
- El plan cita una guía académica y una propuesta con rutas de otro equipo. Si esos documentos no están adjuntos ni disponibles, no afirmes haberlos leído ni inventes sus requisitos. Marca la conformidad académica completa como pendiente de verificación.
- Conserva el alcance y las decisiones del plan. Si encuentras una contradicción, explica el problema, propone una resolución y muestra qué decisiones y paquetes afecta. No cambies el stack o las reglas comerciales silenciosamente.
- Evita cuestionarios iniciales extensos. Avanza con supuestos explícitos y reversibles cuando sea razonable. Identifica por separado las preguntas que sí bloquean una decisión crítica y el paquete que no podrá implementarse hasta responderlas.
- Si puedes navegar, consulta documentación oficial vigente para versiones, compatibilidad, servidor propio de Next.js, Socket.IO y PayPal. Cita enlaces, fecha de consulta y versiones verificadas. Si no puedes, señala qué debe verificarse antes de implementar y no inventes compatibilidad ni APIs.
- No inventes fechas de entrega, integrantes, credenciales, cifras de rendimiento ni evidencias de pruebas ya ejecutadas.

## 2. Alcance que debes respetar

El MVP es un monolito web para una PYME ecuatoriana ficticia de turismo comunitario. Su recorrido principal es:

**GAD crea una oferta → operador revisa y aprueba → turista reserva para 1 a 10 asistentes → paga en PayPal Sandbox → recibe un QR nominal por asistente → operador comprueba y registra cada ingreso por separado.**

Stack base: TypeScript, Next.js App Router, servidor HTTP propio de Node.js, PostgreSQL, Prisma y Socket.IO en un solo proceso persistente detrás de HTTPS/WSS. NestJS es una posible evolución posterior. Mantén una arquitectura por módulos y servicios de aplicación, sin introducir microservicios ni infraestructura que el MVP no justifique.

Incluye autenticación y recuperación de contraseña, panel protegido, CRUD de ofertas con revisión y versiones, catálogo, reservas y cupos, pagos y conciliación, entradas e ingreso, chat con historial y presencia, notificación adicional, auditoría, pruebas, medición de rendimiento y entrega académica.

Mantén: una fecha por oferta, USD en centavos enteros, retención de 15 minutos, tiempos persistidos en UTC y presentación/edad según `America/Guayaquil`, datos ficticios, validación en línea y roles provisionados según el plan.

Fuera del MVP: acreditación documental, descuentos, sustituciones de asistentes, cancelación posterior al pago, reembolsos y validación sin conexión. No agregues esas funciones para solucionar vacíos: documenta cómo se detectan y escalan las situaciones que dependan de ellas.

## 3. Profundidad y formato de entrega

No quiero una lista genérica de tecnologías ni una repetición más larga de `PLAN.md`. Quiero decisiones concretas, tablas, contratos, diagramas Mermaid y paquetes de trabajo listos para otra IA. Justifica decisiones con su problema, solución, implicación y prueba correspondiente. Prioriza una solución viable para estudiantes, sin sacrificar los invariantes críticos.

Organiza el resultado en estos documentos dentro de `docs/planificacion/`:

### `00-indice-y-control.md`

- Índice enlazado, orden de lectura y orden de ejecución.
- Estado de cada documento: completo, provisional o bloqueado, y motivo.
- Glosario y convenciones de IDs para requisitos, decisiones, riesgos, pruebas y paquetes.
- Supuestos, preguntas pendientes y registro de decisiones con alternativas y razones.
- Lista de documentos fuente realmente consultados y faltantes.
- Cómo reanudar la planificación en otra conversación sin perder decisiones.

### `01-alcance-y-trazabilidad.md`

- Objetivo, actores, responsabilidades, casos de uso y límites del MVP.
- Matriz de requisitos funcionales, seguridad, accesibilidad, operación y entrega: ID, origen, obligatoriedad, módulo, paquete, criterio de aceptación y prueba.
- Distingue requisitos académicos comprobados de los que solo afirma el plan.
- Matriz de permisos por rol, acción y recurso, con alcance institucional o de atracción, acceso público, prohibiciones y comprobaciones en servidor.
- Resuelve el modelo de pertenencias: un usuario con varios roles o asignaciones, GAD, atracción y operadores. Considera que la autoaprobación se prohíbe por identidad, aunque una persona tenga varios roles.
- Incluye abuso de acceso horizontal, escalamiento de privilegios y mínimo acceso a datos de asistentes.

### `02-arquitectura-y-decisiones.md`

- Diagramas de contexto, contenedores y módulos; explica el despliegue como monolito de un solo proceso.
- Árbol concreto de carpetas, responsabilidades y dirección de dependencias; evita lógica de negocio duplicada entre Server Actions, Route Handlers y Socket.IO.
- Versiones propuestas y estado de su verificación; dependencias realmente necesarias y alternativas descartadas relevantes.
- Punto de entrada HTTP/Socket.IO en desarrollo y producción, compilación, arranque, apagado ordenado y limitaciones del servidor propio y del alojamiento seleccionado.
- Manejo de configuración, validación de variables de entorno, secretos, logs, errores y códigos de conflicto.
- Estrategia de sesiones, base de datos, SMTP de pruebas, trabajos de limpieza/reconciliación y recuperación tras reinicio. Explica qué invariantes no dependen de que un temporizador esté activo.
- Distingue las decisiones imprescindibles para el MVP de las evoluciones futuras.

### `03-datos-estados-e-invariantes.md`

- Diagrama entidad-relación y diccionario completo: campos, tipos, nulabilidad, relaciones, índices, restricciones, unicidad y política de eliminación.
- Estados y tablas de transición para ofertas, versiones, reservas, pagos y entradas: disparador, actor, precondiciones, escritura atómica, efectos y resultado de reintentos.
- Define dónde se mantienen capacidad e inventario compartido entre versiones, cómo se identifica la versión contratada y qué cambios permite cada estado.
- Fecha y atracción fijas desde la primera reserva; capacidad no inferior a confirmados y retenciones vigentes; historial conservado al archivar o suspender.
- Cantidades y límites, importes sin coma flotante, tratamiento de fechas, validación de edad y minimización de fecha de nacimiento.
- Diferencia estados persistidos de estados calculados por vencimiento y evita inconsistencias entre ambos.
- Restricciones implementadas en PostgreSQL frente a validaciones del servicio; SQL complementario si Prisma no expresa una restricción o bloqueo necesario.
- Estrategia de migraciones, semillas reproducibles, base de pruebas y datos ficticios, incluyendo cuentas de todos los roles y relaciones necesarias.

### `04-reglas-transacciones-y-concurrencia.md`

Detalla con secuencias y pseudocódigo los flujos críticos. Para cada uno define entrada, validaciones, recursos bloqueados, orden de bloqueos, nivel de aislamiento, límites de la transacción, reintentos, errores y pruebas simultáneas.

- Publicación y revisión concurrentes de versiones; actualización del puntero público.
- Reserva grupal, vencimiento, cálculo de cupos y competencia por el último cupo.
- Clave idempotente por comprador/solicitud: normalización del contenido, repetición idéntica y conflicto con datos distintos.
- Cambio de capacidad/precio, suspensión o archivo en competencia con una reserva o confirmación.
- Creación de orden y captura de PayPal, incluyendo fallos antes o después de persistir el ID externo.
- Confirmación y emisión de entradas en la misma transacción; captura/webhook simultáneos y eventos duplicados, retrasados o fuera de orden.
- Captura tardía con y sin cupos y con oferta suspendida, archivada o actividad ya iniciada.
- Consumo simultáneo de un QR y consumo simultáneo de un token de restablecimiento.
- Revocación de sesiones y efecto sobre HTTP y WebSocket ya conectados.

No mantengas transacciones de PostgreSQL abiertas esperando llamadas de red a PayPal. Explica la coordinación recuperable entre el efecto externo y la persistencia local, sin afirmar que existe una transacción distribuida atómica. Mantén un orden global de bloqueos y justifica cómo evitas sobreventa, doble emisión y degradación de estados confirmados.

### `05-contratos-http-websocket-y-pagos.md`

- Inventario de páginas, Server Actions y Route Handlers con método o invocación, autenticación, autorización, esquema de entrada/salida, errores y tratamiento de caché.
- Contratos compartidos, validaciones y formato de errores por campo.
- Eventos Socket.IO: nombre, emisor/receptor, payload, confirmación, persistencia, deduplicación, límites y errores. Incluye historial incremental, cursores estables, orden de mensajes y reconexión sin pérdida ni duplicación visible.
- Presencia de usuarios únicos con varias pestañas/dispositivos, desconexiones abruptas, expiración y revocación de sesión; persistir antes de emitir y describir recuperación si falla la emisión.
- Diferencia claramente `chat:message`, `presence:update` y la notificación adicional requerida; define ubicación visual y criterio de demostración.
- Adaptador PayPal con `createOrder`, `captureOrder`, `getOrder` y verificación de webhook; ubicación de responsabilidades y contrato del adaptador de pruebas.
- Mapeo de orden/captura/evento al modelo local; claves de idempotencia, firma, importe, moneda, referencia, titularidad, reintentos y timeouts.
- Tratamiento de `REVIEW_REQUIRED`, acción administrativa Consultar pasarela, dinero capturado sin entradas y límite operativo por excluir reembolsos. Nunca presentes una redirección del navegador como prueba de pago.
- Emisión, consulta, descarga y consumo de QR: token opaco, hash, cifrado autenticado, secretos, versionado de clave y estrategia viable de rotación/recuperación. Evita secretos o tokens en URLs y logs.

### `06-seguridad-y-privacidad.md`

- Modelo de amenazas breve con activos, límites de confianza, adversarios y abuso de los flujos críticos.
- Matriz amenaza → control → ubicación de aplicación → prueba → evidencia → riesgo residual.
- Autenticación con Argon2id, sesiones opacas, cookies, fijación de sesión, expiración, revocación y recuperación de contraseña de uso único.
- Límites por cuenta y origen, IP detrás de proxy confiable y prevención de enumeración, explicando almacenamiento y respuesta ante exceso.
- Autorización por recurso, validación de origen y CSRF aplicable a cada transporte; no presupongas que SameSite resuelve todo.
- XSS, inyección SQL, mensajes de chat, webhook falsificado o repetido, acceso a QR ajeno, abuso del lector y exposición por caché o registro.
- Headers y CSP compatibles con la integración real; secretos exclusivamente en servidor, HTTPS/WSS, cuentas DB con privilegios mínimos y dependencias.
- Datos de asistentes, acceso mínimo, retención, borrado o anonimización compatible con trazabilidad, auditoría y copias de respaldo. No inventes obligaciones legales verificadas.
- Matriz Common Criteria limitada a los objetivos realmente aportados. Si faltan, deja su mapeo pendiente; no declares certificación ni equivalencia automática con OWASP.

### `07-pantallas-y-experiencia.md`

- Mapa de navegación y pantallas por rol, estados vacíos, carga, éxito, validación, conflicto, acceso denegado, sesión vencida y fallo de red.
- Flujos de catálogo, revisión, reserva grupal, pago pendiente/en revisión, entradas, lector de ingreso, chat y recuperación de contraseña.
- Wireframes textuales suficientes para implementar componentes y jerarquía de información.
- Interfaz en español, importes USD y fechas locales claras; evitar confianza en el reloj del navegador para decisiones de negocio.
- WCAG 2.2 nivel AA como objetivo propuesto: teclado, foco, etiquetas, contraste, errores anunciados y actualizaciones accesibles. Alternativa manual a cámara y QR.
- Separación visual entre consultar una entrada y registrar ingreso; no consumir al escanear.
- Define si existe ruta inicial `/` y cómo conduce al catálogo y a los paneles, sin agregar funcionalidades fuera del MVP.

### `08-pruebas-y-evidencias.md`

- Estrategia con Vitest, PostgreSQL de pruebas y Playwright; qué se prueba por unidad, integración, contrato, concurrencia y recorrido completo, y por qué.
- Catálogo con IDs, requisito, preparación, pasos, aserciones, nivel y evidencia. Prioriza reglas reales, sin pruebas que solo repitan la implementación.
- Pruebas concurrentes con sincronización reproducible para último cupo, doble QR, recuperación de clave y confirmación duplicada. Evita usar esperas arbitrarias para simular simultaneidad.
- Matriz de fallos del adaptador de pagos: retorno sin captura, firma inválida, repetición, importe/moneda/referencia incorrectos, timeout, captura tardía y eventos fuera de orden.
- Diferencia pruebas automatizadas deterministas de verificación manual real en PayPal Sandbox; la segunda queda pendiente hasta ejecutarse con credenciales.
- Método reproducible para rendimiento del catálogo filtrado: build de producción, dataset, índices, calentamiento, concurrencia, muestras, mediana y p95. Define criterios propuestos y no inventes resultados.
- Comprobaciones de accesibilidad y seguridad proporcionadas al alcance; plan de CI, aislamiento y limpieza segura de datos de pruebas.
- Evidencias por materia, comandos previstos y criterio de avance de fase.

### `09-entorno-despliegue-y-operacion.md`

- Preparación reproducible en Windows/PowerShell y Linux/Bash cuando cambie el comando; PostgreSQL y SMTP de prueba con Docker cuando corresponda.
- `.env.example` documentado con nombres y propósito de variables, valores ficticios y separación entre servidor y cliente.
- Scripts previstos para instalación, migraciones, seed, desarrollo, compilación, producción y pruebas. No afirmes que ya existen ni que se ejecutaron.
- Separación de bases, prevención de comandos de pruebas contra producción, backups y comprobación de restauración.
- Despliegue de un proceso persistente con HTTPS/WSS, proxy, comprobación de salud, reinicios y persistencia; explica por qué el hosting propuesto soporta el servidor propio.
- Runbooks cortos para DB no disponible, SMTP fallido, PayPal temporalmente caído, reservas vencidas, webhooks repetidos, pérdida de clave QR y reinicio durante una operación.
- Logs estructurados sin datos sensibles, diagnóstico y limitaciones de escalar a varias instancias en el futuro.

### `10-fases-y-paquetes-implementables.md`

Conserva las fases 0 a 6 del plan como base. Descompón cada una en paquetes pequeños, ordenados por dependencias y comprobables. Explica cómo encajan pruebas, endurecimiento y entrega sin dejarlos todos para el final.

Cada paquete debe incluir:

1. ID estable y título.
2. Objetivo observable y requisitos que satisface.
3. Dependencias y estado mínimo del repositorio para comenzar.
4. Documentos, decisiones y contratos que la IA debe leer.
5. Archivos o módulos previstos que creará o modificará y responsabilidad de cada cambio; las rutas se verificarán al implementar.
6. Tareas concretas ordenadas, incluyendo migraciones, índices, validaciones y seguridad cuando apliquen.
7. Contratos que introduce y contratos existentes que debe conservar.
8. Criterios de aceptación verificables y pruebas asociadas por ID.
9. Comandos de verificación previstos y evidencia que debe guardar.
10. Errores esperados, riesgos y recuperación si queda a medias.
11. Datos de prueba, credenciales o servicios externos necesarios, usando alternativas de prueba cuando sea posible.
12. Esfuerzo relativo, incertidumbre, posibles bloqueos y propuesta de commit; no inventes responsables ni calendarios.
13. Punto de revisión humana y contexto mínimo de traspaso a la siguiente IA.

Cada paquete debe caber razonablemente en una sesión de implementación con IA y producir una mejora ejecutable o un prerrequisito verificable. Si depende de mucho contexto o mezcla demasiadas responsabilidades, divídelo.

Explica de forma especial cómo la fase 4 podrá confirmar pagos y emitir entradas atómicamente aunque la interfaz de entradas se complete en la fase 5. Adelanta los prerrequisitos de datos y del servicio de emisión que sean necesarios y explicita esa dependencia.

### `11-prompts-para-la-ia-implementadora.md`

- Un prompt maestro reutilizable que obligue a inspeccionar repositorio e instrucciones locales, leer el estado real, implementar solo el paquete solicitado y ejecutar pruebas pertinentes.
- Un prompt concreto por cada paquete de `10-fases-y-paquetes-implementables.md`. Usa IDs coincidentes, documentos/contratos de entrada, alcance, cambios esperados, verificaciones y criterio de finalización. Evita prompts genéricos que deleguen otra vez todas las decisiones importantes.
- Una plantilla de informe al terminar: archivos cambiados, migraciones, comandos ejecutados y resultados reales, pruebas pendientes, decisiones nuevas, riesgos y siguiente paquete habilitado.
- Un formato `ESTADO-IMPLEMENTACION.md` propuesto para mantener progreso y contexto entre sesiones, separando diseñado, implementado, probado y demostrado.
- Instruye a la IA a no inventar resultados, no usar credenciales reales en commits, no efectuar operaciones destructivas sin autorización, no ampliar alcance ni ocultar fallos, y a actualizar la documentación si una decisión necesita cambiar.
- Si una dependencia no está cumplida, la IA debe describir el bloqueo y lo ya verificado, sin improvisar una implementación incompatible.

### `12-demo-y-entrega-academica.md`

- Guion de 15 minutos más 5 de preguntas, con reparto pendiente de integrantes reales.
- Recorrido principal y demostraciones complementarias: recuperación de clave, CRUD, aislamiento de roles, chat, presencia, notificación y seguridad.
- Datos semilla y cuentas ficticias necesarios para una demo repetible.
- Lista de entregables del plan, evidencias, README, declaración de uso de IA, diagramas, matriz de requisitos/pruebas, matriz de seguridad, medición y etiqueta `v1.0-b1`.
- Plan de commits auténticos de los integrantes y revisión/comprensión del código generado; no simular autoría ni actividad.
- Plan de contingencia para una dependencia externa fallida durante la presentación, distinguiendo demostración con adaptador de prueba de evidencia real Sandbox.
- Lista de pendientes que impiden afirmar cumplimiento completo de cada materia.

## 4. Revisión de consistencia antes de terminar

Revisa los documentos entre sí y corrige contradicciones, no te limites a enumerarlas. Verifica que:

- Cada requisito tenga paquete y prueba, o un pendiente explícito con su razón.
- Los nombres de entidades, estados, roles, eventos y errores coincidan en todos los documentos.
- El modelo permita los flujos y rechace los accesos indebidos descritos.
- No exista sobreventa por vencimiento, cambio de versión, pago tardío o concurrencia.
- Ningún retorno del navegador confirme pagos, ningún evento duplicado emita entradas otra vez y ningún escaneo consuma una entrada antes de la acción explícita de ingreso.
- Las sesiones revocadas pierdan acceso también en conexiones WebSocket abiertas.
- Las reservas mantengan sus condiciones contratadas y los asistentes sus entradas individuales.
- Los límites del MVP y los documentos académicos faltantes sean visibles.
- Cada paquete tenga sus prerrequisitos disponibles y su prompt correspondiente.
- Lo propuesto sea realizable en el monolito y no dependa de servicios añadidos sin justificación.

Incluye el resultado de esta revisión en el índice, con pendientes residuales y su impacto, sin afirmar que el sistema está implementado ni probado.

## 5. Forma de trabajar y evitar respuestas incompletas

Comienza con una evaluación breve del plan: fortalezas, vacíos críticos y decisiones necesarias. Después entrega los documentos en orden con contenido técnico concreto.

Si dispones de herramientas de archivos, escribe los documentos completos en `docs/planificacion/` y mantén el índice actualizado. Si estás en una conversación sin herramientas, muestra cada documento con su nombre y contenido Markdown, listo para guardar.

Si el trabajo excede una respuesta, establece primero el índice y las decisiones transversales, desarrolla documentos completos y detente en un límite claro. Indica exactamente el siguiente documento o apartado y conserva los IDs. No resumas los apartados restantes para aparentar que terminaste, ni pidas aprobación para continuar con lo ya solicitado. En chat, deja un mensaje de continuación listo para copiar cuando haga falta otro turno.

La planificación estará completa cuando las decisiones necesarias estén especificadas o marcadas como bloqueos concretos, exista trazabilidad de requisitos a pruebas y otra IA pueda implementar el primer paquete sin rediseñar el sistema.
