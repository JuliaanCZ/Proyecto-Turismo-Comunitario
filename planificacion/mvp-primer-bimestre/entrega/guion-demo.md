# Guion de exposición del primer bimestre

Duración de la exposición **15 minutos**, seguida de **5 minutos de preguntas**. Usa dos perfiles de navegador con cuentas ficticias y una instancia de desarrollo para la recuperación con bandeja de pruebas. Prepara al menos once ofertas propias si vas a mostrar el cambio de página. Mantén fuera de la proyección las credenciales del servidor.

| Minutos | Integrante | Demostración |
| --- | --- | --- |
| 00:00–03:00 | Julian Camacho | Presentar el problema, los objetivos, el cronograma y el monolito. Mostrar la portada y ubicar el panel dentro de la arquitectura. |
| 03:00–06:30 | Mateo Calvache | Registrar una cuenta ficticia, mostrar el rechazo de un formulario inválido en el servidor e iniciar sesión. Explicar Argon2id. En desarrollo, pedir una recuperación, abrir el enlace desde la bandeja y restablecer la clave. Comprobar que el enlace utilizado queda inválido. |
| 06:30–10:30 | Mateo Yunga | Crear una oferta, consultarla por ID, editarla, filtrar por provincia, mostrar la página siguiente y borrar una oferta ficticia con confirmación. Presentar el modelo PostgreSQL y la medición de la consulta. |
| 10:30–14:00 | Alexis Villareal | Abrir una cuenta en el chat y otra en el panel. Enviar un mensaje y mostrar el aviso. Abrir el chat con la segunda cuenta, comprobar la presencia y responder. Recargar para ver el historial y cerrar sesión para mostrar la desconexión. |
| 14:00–15:00 | Julian Camacho | Mostrar el resultado de pruebas, el repositorio, la declaración de IA y las conclusiones. |

## Seguridad y defensa

- **Hash.** Mostrar el código de Argon2id y un ejemplo sintético de su formato. El servidor verifica el hash y guarda la sesión con expiración.
- **Validación.** Enviar un formulario inválido con JavaScript desactivado y comprobar el error del servidor.
- **Socket.IO.** El handshake comprueba origen y cookie. Engine.IO admite HTTP polling y actualización a WebSocket. El cliente de esta versión fija WebSocket. Socket.IO añade eventos, reconexión y salas. En la instancia publicada, confirmar `wss://` y estado `101` en la pestaña Network, y comprobar el intercambio real de mensajes con sesión.
- **Entrega.** Adjuntar la presentación final y el enlace al repositorio en la carpeta del grupo. Conservar evidencias de las pruebas y del recorrido mostrado. La versión se etiquetará al ejecutar el pipeline.
