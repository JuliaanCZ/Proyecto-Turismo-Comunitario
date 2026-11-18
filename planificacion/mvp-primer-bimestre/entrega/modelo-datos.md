# Modelo de datos · PostgreSQL

[Abrir el diagrama entidad–relación](modelo-datos.html) · [Consultar la arquitectura](arquitectura.md)

El esquema `app` guarda cuentas, sesiones, recuperación, ofertas, metadatos de fotos y mensajes. Supabase Storage guarda los archivos de imagen en el bucket privado `site-imgs`. La columna `offer_photos.storage_path` identifica cada objeto del bucket.

| Tabla | Claves y reglas |
| --- | --- |
| `users` | PK `id`. El correo normalizado es único. `password_hash` guarda el hash de Argon2id. |
| `sessions` | PK `id` (UUID). FK `user_id` → `users.id` con borrado en cascada. Hash del token único, vencimiento y revocación. |
| `password_reset_tokens` | PK `id`. FK `user_id` única → `users.id` con borrado en cascada. Hash único, caducidad y marca de uso. |
| `mail_outbox` | PK `id`. Bandeja de pruebas con destinatario, asunto, cuerpo y fecha, sin FK declarada. Brevo es el proveedor previsto en producción y se conectaría al monolito por API. |
| `offers` | PK `id`. FK `owner_id` → `users.id` con borrado restringido. Guarda título, descripción, provincia, ubicación, fecha, cupo, estado y contactos. |
| `offer_photos` | PK compuesta `(offer_id, position)`. FK `offer_id` → `offers.id` con borrado en cascada. Posiciones de 1 a 5, ruta de Storage única, MIME, texto alternativo y tamaño. |
| `chat_messages` | PK `id`. FK `author_id` → `users.id` con borrado restringido. Sala `general`, texto de hasta 500 caracteres y unicidad de `(author_id, client_message_id)`. |
| `schema_migrations` | PK `version`. Registro técnico con checksum y fecha de aplicación, sin FK. |

Las fechas se guardan como enteros en milisegundos UTC. Los índices cubren sesiones por usuario, ofertas propias por propietario y fecha, ofertas propias filtradas por provincia, catálogo por publicación y fecha, e historial por sala e ID. La base admite ofertas borrador sin fotos. El servicio exige al menos una al publicar.

Fuentes del esquema en [migración inicial](../../../db/postgres/001_initial.sql), [contactos y galería](../../../db/postgres/002_offer_contacts_gallery.sql) y [registro de migraciones](../../../src/shared/pg-migrate.js).
