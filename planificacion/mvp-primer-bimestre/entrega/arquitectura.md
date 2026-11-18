# R3 · Arquitectura del monolito

[Abrir el diagrama de arquitectura](arquitectura.html) · [Consultar el modelo de datos](modelo-datos.md)

El navegador usa HTTPS para recibir páginas HTML renderizadas con EJS y WSS para el chat. Express y Socket.IO comparten el mismo servidor HTTP en un proceso Node.js. Express resuelve las rutas de cuentas, panel y ofertas. Socket.IO valida la cookie y el origen en el handshake y gestiona la sala general, la presencia y los avisos.

La configuración de despliegue toma una imagen Linux de GHCR y la ejecuta como contenedor en Azure App Service. El navegador se comunica con la aplicación a través de Azure. El proceso Node consulta el esquema `app` de PostgreSQL y accede al bucket privado `site-imgs` desde el servidor. Para servir una foto, comprueba la propiedad o visibilidad de la oferta.

El workflow configurado para un push a `main` ejecuta las pruebas, publica una imagen identificada por el SHA del commit y actualiza el contenedor principal en Azure. La comprobación automatizada consulta `/salud`. La conexión autenticada por WSS en Azure requiere una prueba aparte.

El 18 de noviembre de 2026 se comprobó el recorrido con dos sesiones de Edge, un proxy TLS local con certificado de prueba y datos en memoria. Se observó el puerto local con `wss://` y estado `101`, el aviso «1 mensaje nuevo» en el panel de la segunda cuenta y el mensaje en su historial al abrir la sala. La presencia mostró dos conectados.

Para recuperar contraseñas en producción, el diseño prevé que Node.js envíe el enlace mediante la API HTTPS de correo transaccional de Brevo. La clave de API se configuraría como secreto del servidor y el remitente se verificaría en Brevo. La integración está pendiente. En desarrollo funciona la bandeja de pruebas. [API de correo transaccional de Brevo](https://developers.brevo.com/docs/send-a-transactional-email)

Referencias de implementación en [servidor HTTP y Socket.IO](../../../src/server.js), [aplicación Express](../../../src/app.js), [configuración del contenedor](../../../Dockerfile) y [workflow de despliegue](../../../.github/workflows/deploy-azure.yml).
