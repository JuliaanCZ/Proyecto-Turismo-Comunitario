# Kawsay Ñan

Catálogo de turismo comunitario de Ecuador. Las comunidades publican experiencias con fotos y datos de contacto. Los visitantes pueden consultar por WhatsApp o correo. El equipo gestiona sus ofertas y conversa por WebSocket.

## Desarrollo

Requiere **Node.js 24** y npm. Instala las dependencias con `npm ci`.

Para trabajar con un proyecto **Supabase de desarrollo**, copia `.env.example` a `.env` y complétalo. Define `DATABASE_URL` con la conexión directa o con Session pooler por el puerto 5432. Configura `SUPABASE_URL`, la clave privada de servidor `SUPABASE_SERVICE_ROLE_KEY` y, si corresponde, la ruta local a la CA en `DATABASE_SSL_CA_FILE`. [Conexión y TLS en Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

```sh
npm run db:migrate
npm run dev
```

El servidor guarda los datos en el esquema PostgreSQL `app` y sirve fotografías del bucket privado `site-imgs` tras verificar el acceso. Para cargar las cuatro ofertas de ejemplo en una instancia de desarrollo, configura `SEED_DEMO_PASSWORD` y ejecuta `npm run seed:demo`. El comando crea las cuentas `ana@demo.test` y `luis@demo.test` con esa contraseña, guarda las ofertas y fotos de Ana en Supabase y deja el historial del chat fuera del sembrado. Con `DEMO_LOGIN_ENABLED=true`, la pantalla de ingreso de desarrollo muestra ambas cuentas y su contraseña compartida.

## Producción

1. Configura el entorno del servidor con `APP_ENV=production`, `APP_ORIGIN=https://tu-dominio`, `COOKIE_SECURE=true`, un `CSRF_SECRET` aleatorio de al menos 32 caracteres y las credenciales privadas de un proyecto Supabase de producción. Mantén el esquema `app` fuera de los esquemas expuestos por la API pública de Supabase.
2. Ejecuta `npm ci --omit=dev`, `npm run db:migrate` y `npm start`. El servidor también comprueba y aplica migraciones pendientes al iniciar. Storage debe admitir el límite de 50 MB por foto. El proceso crea o ajusta el bucket privado con los tipos de imagen admitidos.
3. Si usas Caddy en el mismo host, configura `APP_DOMAIN` y `PORT` en el entorno de Caddy y usa [deploy/Caddyfile](deploy/Caddyfile). En Node configura `BIND_HOST=127.0.0.1` y `TRUST_PROXY=1` para ese único proxy. Mantén HTTPS y comprueba `GET /salud`, el catálogo y la conexión WebSocket.

### Recuperación de contraseña con Resend

1. Agrega a Resend un dominio o subdominio cuyo DNS controles. Publica los registros que indique Resend y espera a que figure como verificado. Desactiva el seguimiento de clics y aperturas en ese dominio para los correos de recuperación. [Dominios verificados en Resend](https://resend.com/docs/dashboard/domains/introduction)
2. Crea una API key con permiso **Sending access**, restringida al dominio remitente. [Claves de API de Resend](https://resend.com/docs/dashboard/api-keys/introduction)
3. En Azure Portal, abre **App Services → kawsay-nan → Settings → Environment variables → App settings**. Agrega `RESEND_API_KEY` con la clave y `RESEND_FROM_EMAIL` con la dirección del dominio verificado, por ejemplo `cuentas@correo.tu-dominio.ec`. Guarda ambos ajustes juntos. En otro host, configúralos en el entorno privado del proceso. [Variables de entorno en Azure](https://learn.microsoft.com/azure/app-service/configure-common?tabs=portal#configure-app-settings)
4. Tras el despliegue, abre «¿La olvidaste?» e inicia una recuperación con una cuenta de prueba. Comprueba que el correo llegue, que el enlace use el `APP_ORIGIN` HTTPS del sitio y que puedas iniciar sesión con la nueva contraseña.

Si ambas variables de Resend están vacías, la recuperación queda desactivada en producción. En desarrollo, `/dev/bandeja` muestra los correos simulados.

SQLite pertenece a la entrega anterior. Las migraciones crean y actualizan el esquema de PostgreSQL. Cualquier traslado de registros de una base SQLite requiere una importación aparte.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `src/` | Aplicación, punto de entrada, módulos, vistas y WebSocket |
| `public/` | Estilos, JavaScript del navegador, imágenes y fuentes |
| `db/postgres/` | Migraciones PostgreSQL versionadas |
| `scripts/` | Herramientas de migración y demostración |
| `tests/` | Pruebas unitarias e integración HTTP y WebSocket |
| `deploy/` | Configuración de ejemplo para el proxy HTTPS |
| `planificacion/` | Planes, referencias e historial de la entrega académica |

```sh
npm test
npm run lint
```

Las pruebas automatizadas usan PostgreSQL emulado y Storage en memoria. La comprobación del servicio gestionado se realiza en una instancia de desarrollo o staging autorizada.

## Entrega académica del primer bimestre

Kawsay Ñan representa una PYME ecuatoriana ficticia. La aplicación reúne las ofertas y las fotografías que antes circulaban entre mensajes y documentos. El stack es Node.js 24, Express, EJS y Socket.IO, con PostgreSQL y Storage en Supabase.

- [Problema, objetivos y cronograma](planificacion/mvp-primer-bimestre/entrega/problema-objetivos-cronograma.md)
- [Historias de usuario priorizadas](planificacion/mvp-primer-bimestre/entrega/historias-de-usuario.md)
- [Arquitectura](planificacion/mvp-primer-bimestre/entrega/arquitectura.md) y [modelo de datos](planificacion/mvp-primer-bimestre/entrega/modelo-datos.md)
- [Medición de rendimiento en PostgreSQL](planificacion/mvp-primer-bimestre/entrega/rendimiento.md)

### Integrantes y roles

| Integrante | Responsabilidad |
| --- | --- |
| Mateo Yunga | Ofertas, persistencia y despliegue |
| Mateo Calvache | Cuentas, recuperación y sesiones HTTP y WebSocket |
| Alexis Villareal | Gateway, chat, historial y presencia |
| Julian Camacho | Base web, panel, notificaciones e integración |

### Uso de IA

Se usó OpenAI Codex para revisar la guía y el código, actualizar la documentación académica, preparar la presentación y ampliar la prueba del aviso del chat. Los diagramas se elaboraron con la skill [Diagram Design](https://github.com/cathrynlavery/diagram-design) y se contrastaron con el código y las migraciones de PostgreSQL. El [registro histórico de IA](planificacion/historico-mvp/ia.md) documenta la entrega anterior. Cada integrante revisa su parte y debe poder explicarla y modificarla durante la defensa.
