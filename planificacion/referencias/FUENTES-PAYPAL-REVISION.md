# Comprobación puntual de PayPal para continuar 04

Fecha de consulta: 2026-11-13. Se leyó contenido de las páginas mediante el navegador de investigación de Codex, no solo resúmenes de búsqueda. Esto verifica documentación, no el comportamiento de una integración ejecutada.

## Idempotencia

Fuente: https://developer.paypal.com/api/rest/reference/idempotency/

- La retención del identificador depende de la API; la guía remite a la referencia del endpoint.
- Una repetición con el mismo `PayPal-Request-Id` devuelve el estado más reciente de la petición anterior, dentro de las garantías de retención aplicables.
- Dos peticiones simultáneas con la misma clave pueden producir un fallo en la segunda. La guía no fija aquí un código de error único.
- La clave debe distinguir el tipo de operación. No reutilizar sin justificación el mismo identificador entre creación y captura.
- La guía recomienda UUID y menciona un límite de 38 caracteres de un byte.

Contraste: https://developer.paypal.com/api/orders/v2/orders-create

La referencia actual de creación muestra longitud 1–10000 para `PayPal-Request-Id`. Existe una discrepancia entre esa referencia y la guía general. Usar UUID de 36 caracteres cabe en ambos límites, pero no presentar el límite de 38 como una restricción de Orders inequívocamente reconciliada.

Referencia de captura accesible: https://developer.paypal.com/api/orders/v2/orders-capture

Esta comprobación no confirma la retención específica de seis horas ni la vida útil de una orden. Conservarlas como verificaciones separadas y no confundir retención de clave, vida de orden, retención de cupos o arrendamiento local.

## Webhooks

Fuente: https://developer.paypal.com/api/rest/webhooks/rest/

- Un listener responde con HTTP 2xx para reconocer la entrega. Ante fallos de entrega o respuestas no satisfactorias, PayPal documenta hasta 25 intentos durante tres días.
- Hay dos métodos de verificación descritos: criptográfico local y consulta al endpoint de verificación de PayPal (postback).
- Los eventos del simulador no soportan la verificación mediante postback. Una prueba con simulador no sustituye la prueba con eventos reales de una aplicación Sandbox.
- La verificación criptográfica requiere el cuerpo original para calcular CRC32. La guía también advierte conservar los datos del evento al enviarlos al verificador postback.

## Riesgos que deben evaluarse en TX-10/TX-11

Son observaciones de diseño, no garantías obtenidas de las fuentes:

- El vencimiento de un arrendamiento local de 60 segundos no demuestra por sí solo que una captura remota haya terminado o que no exista cargo. Tampoco una consulta aislada sin captura prueba necesariamente la terminación de una solicitud incierta.
- Separar un rechazo remoto definitivo de un timeout o resultado desconocido. No generar una clave nueva para repetir una misma operación incierta sin justificar la seguridad y la recuperación del intento previo.
- No depender exclusivamente de las reentregas del webhook: son finitas. La conciliación debe conservar un camino de revisión para casos que sigan inciertos al agotar sus reintentos.
- No introducir infraestructura adicional por rutina; justificar cualquier cambio de modelo que sea imprescindible para representar intentos o pendientes recuperables.
