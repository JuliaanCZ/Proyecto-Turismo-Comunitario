# Kawsay Ñan

Catálogo de turismo comunitario de Ecuador. Las comunidades publican experiencias con fotos y datos de contacto. Los visitantes pueden consultar por WhatsApp o correo. El equipo gestiona sus ofertas y conversa por WebSocket.

## Desarrollo

Requiere **Node.js 24** y npm. La demostración usa datos en memoria y carga cuatro experiencias ficticias. Al reiniciarla se restauran esos datos.

```sh
npm ci
npm run dev:demo
```

Abre [la demo local](http://127.0.0.1:3100). Las cuentas de prueba están en la pantalla de ingreso.

Para trabajar con un proyecto **Supabase de desarrollo**, copia `.env.example` a `.env` y complétalo. Define `DATABASE_URL` con la conexión directa o con Session pooler por el puerto 5432. Configura `SUPABASE_URL`, la clave privada de servidor `SUPABASE_SERVICE_ROLE_KEY` y, si corresponde, la ruta local a la CA en `DATABASE_SSL_CA_FILE`. [Conexión y TLS en Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

```sh
npm run db:migrate
npm run dev
```

El servidor guarda los datos en el esquema PostgreSQL `app` y sirve fotografías del bucket privado `site-imgs` tras verificar el acceso. Para sembrar una instancia de desarrollo con Supabase, configura `SEED_DEMO_PASSWORD` y ejecuta `npm run seed:demo`.

## Producción

1. Configura el entorno del servidor con `APP_ENV=production`, `APP_ORIGIN=https://tu-dominio`, `COOKIE_SECURE=true`, un `CSRF_SECRET` aleatorio de al menos 32 caracteres y las credenciales privadas de un proyecto Supabase de producción. Mantén el esquema `app` fuera de los esquemas expuestos por la API pública de Supabase.
2. Ejecuta `npm ci --omit=dev`, `npm run db:migrate` y `npm start`. El servidor también comprueba y aplica migraciones pendientes al iniciar. Storage debe admitir el límite de 50 MB por foto. El proceso crea o ajusta el bucket privado con los tipos de imagen admitidos.
3. Si usas Caddy en el mismo host, configura `APP_DOMAIN` y `PORT` en el entorno de Caddy y usa [deploy/Caddyfile](deploy/Caddyfile). En Node configura `BIND_HOST=127.0.0.1` y `TRUST_PROXY=1` para ese único proxy. Mantén HTTPS y comprueba `GET /salud`, el catálogo y la conexión WebSocket.

SQLite pertenece a la entrega anterior. Las migraciones crean y actualizan el esquema de PostgreSQL. Cualquier traslado de registros de una base SQLite requiere una importación aparte. La recuperación de contraseña usa una bandeja de pruebas en desarrollo. Para ofrecerla en producción hace falta integrar un servicio de correo real.

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
