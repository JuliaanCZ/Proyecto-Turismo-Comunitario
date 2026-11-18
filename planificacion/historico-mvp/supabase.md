# Persistencia del MVP en Supabase

La aplicación mantiene su servidor Express y autenticación propia. PostgreSQL de Supabase guarda usuarios, sesiones, ofertas, metadatos de fotos y chat; Supabase Storage guarda los bytes de las fotos en el bucket privado `site-imgs`. El navegador no recibe la clave de servicio ni acceso directo al bucket.

## Configuración

Copiar `.env.example` a `.env` y completar `DATABASE_URL`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. La cadena de conexión usa el pooler en modo sesión por el puerto 5432. La contraseña debe codificarse como componente de URL si contiene caracteres reservados. `.env` está excluido de Git.

`npm run db:migrate` aplica `db/postgres/001_initial.sql` al esquema `app`. Las migraciones se registran con checksum en `app.schema_migrations`; una migración aplicada no debe editarse. El esquema `app` no se expone por la API pública de Supabase. `npm start` aplica migraciones pendientes y configura el bucket privado con límite de 50.000.000 bytes y MIME JPEG, PNG o WebP. El límite global de archivos de Supabase también debe ser al menos 50 MB.

El servidor verifica propietario o publicación y fecha vigente antes de descargar una foto y enviarla al navegador. Al sustituir una foto, sube primero la nueva, actualiza el metadato en una transacción y elimina la anterior. Si falla la transacción, elimina la subida nueva. Si falla la limpieza posterior, el servidor registra el error para intervención manual.

## Verificación

`npm test` cubre cuentas, sesiones, ofertas, foto, chat, recuperación y validación con un doble local de PostgreSQL y Storage. `npm run lint` comprueba el JavaScript. Para verificar la infraestructura real, configurar las variables locales, ejecutar `npm run db:migrate`, `npm run seed:demo`, iniciar el servidor, consultar `/salud` y crear una oferta con foto desde la interfaz. No se migran los datos de la antigua base local, por decisión del equipo.

Las evidencias previas de rendimiento y planificación basadas en SQLite son históricas. El rendimiento debe medirse de nuevo sobre Supabase antes de citar cifras actuales.

Si la conexión informa "self-signed certificate in certificate chain", descarga el certificado CA del proyecto desde Database Settings > SSL Configuration y configura "DATABASE_SSL_CA_FILE" con su ruta absoluta. El cliente mantiene la verificación TLS activada.
