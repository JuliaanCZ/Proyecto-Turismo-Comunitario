# Turismo comunitario

MVP del primer bimestre: cuentas, ofertas con galería, catálogo con contacto por WhatsApp y correo y chat en tiempo real. La aplicación usa Node.js, Express, EJS, Socket.IO, PostgreSQL de Supabase y Supabase Storage.

## Demostración local

Ejecuta `npm ci` y luego `npm run dev:demo`. Abre `http://127.0.0.1:3100`. El servidor de demostración usa una base y fotos en memoria, empieza con cuatro ofertas y no se conecta a Supabase. Las dos cuentas y la contraseña aparecen en la consola. Los cambios se reinician al cerrar el proceso.

## Preparación con Supabase

Usa Node.js 24 (ver `.nvmrc`). Desde la raíz:

```powershell
npm ci
Copy-Item .env.example .env
```

Configura en `.env`:

- `DATABASE_URL`: cadena del pooler de Supabase en modo sesión (puerto 5432), con la contraseña real en lugar de `[YOUR-DATABASE-PASSWORD]`. Codifica los caracteres especiales de la contraseña para URL.
- `SUPABASE_URL`: URL HTTPS del proyecto.
- `SUPABASE_SERVICE_ROLE_KEY`: clave secreta de servidor del proyecto. Nunca se envía al navegador ni se sube a Git.

El bucket `site-imgs` se crea o actualiza al arrancar como privado, limitado a 50 MB por archivo y a JPEG, PNG y WebP. Revisa también que el límite global de Storage en Supabase admita 50 MB. El servidor sirve las fotos tras comprobar la visibilidad de la oferta.

```powershell
npm run db:migrate
npm start
```

Abre `http://localhost:3000/salud` para comprobar el proceso. `npm run seed:demo` prepara usuarios, ofertas y mensajes en el destino Supabase configurado para desarrollo. Usa `npm run dev:demo` para revisar el prototipo con datos aislados. `npm test` ejecuta las pruebas automatizadas compatibles con PostgreSQL y `npm run lint` revisa el código. Las pruebas automatizadas usan un PostgreSQL simulado y Storage falso; la verificación contra el proyecto real requiere configurar las tres variables anteriores.

## Alcance y planificación

- [Plan del MVP](mvp-primer-bimestre/PLAN-MVP.md)
- [Prompts por bloque](mvp-primer-bimestre/PLAN-PROMPTS.md)
- [Reparto del trabajo](mvp-primer-bimestre/Reparto-y-secuencia-MVP.xlsx)
- [Configuración de Supabase](docs/mvp/supabase.md)
- [Plan general de referencia](docs/planificacion/00-indice-y-control.md)

La planificación original y sus evidencias de SQLite documentan la entrega anterior. La configuración vigente de persistencia se describe aquí y en `docs/mvp/supabase.md`. Los pagos y las reservas internas siguen fuera del MVP.
