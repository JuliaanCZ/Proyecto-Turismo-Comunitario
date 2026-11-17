# Despliegue del MVP con HTTPS y WSS

## Alojamiento y estado

B1.11 se verificó en Windows con Caddy 2.11.9 y Node.js 24.22.3, en `https://localhost:8443` con certificado propio. El alojamiento público y el presupuesto siguen pendientes (PM-03). El entorno público necesita una instancia con un proceso Node persistente, HTTPS con certificado válido, WebSocket por el mismo origen, variables de entorno y un volumen de escritura que conserve el archivo SQLite y sus auxiliares `-wal` y `-shm` junto a él. Las fotos viven en SQLite. En el entorno local, Caddy escucha solo en loopback, termina TLS, reenvía el cambio de protocolo y conserva `Host` y `Origin` hacia el servidor HTTP. En un despliegue público, el puerto interno de Node debe quedar accesible solo desde el proxy o la red privada de la plataforma.

## Repetir la variante local

1. Usa Node.js 24.22.3 según `.nvmrc` e instala [Caddy](https://caddyserver.com/docs/install). Trabaja desde la raíz de una copia de despliegue y reserva una carpeta persistente local fuera de la carpeta que reemplazarías al actualizar la aplicación.
2. Crea un `.env` propio para esa copia con los siguientes valores. Sustituye la ruta de ejemplo por la del volumen y genera un `CSRF_SECRET` aleatorio de al menos 32 caracteres. Activa la bandeja solo durante la demo con su propia clave.

   ```dotenv
   APP_ENV=production
   APP_ORIGIN=https://localhost:8443
   PORT=3099
   COOKIE_SECURE=true
   TRUST_PROXY=1
   DATABASE_FILE=C:/ruta/al/volumen/app.sqlite
   DEMO_MAILBOX_ENABLED=false
   ```

   La configuración de cookies prepara `__Host-tc_session` cuando se integre B1.2. En producción pública, usa el origen canónico del dominio. La variante local de Caddy se usa únicamente con `localhost`.

3. En la copia de despliegue, instala las dependencias, migra y arranca un único proceso. En Windows usa `npm.cmd` si PowerShell bloquea el script `npm.ps1`.

   ```powershell
   npm ci --omit=dev
   npm run db:migrate
   node scripts/check-sqlite-argon2.js
   npm start
   ```

4. En otra terminal, fija `PORT` al mismo valor que en `.env` y usa una carpeta de Caddy de tu usuario. La CA y las claves quedan en esa carpeta. La configuración evita instalar la CA en el almacén del sistema.

   ```powershell
   $env:PORT = '3099'
   $env:B111_CADDY_DATA = Join-Path $env:LOCALAPPDATA 'TurismoComunitario/caddy-local'
   caddy validate --config deploy/Caddyfile --adapter caddyfile
   caddy run --config deploy/Caddyfile --adapter caddyfile
   ```

5. En la terminal de comprobación, proporciona explícitamente la CA local. Ejecuta `check-ws.js` desde un checkout de verificación con `npm ci` completo porque `socket.io-client` es una dependencia de desarrollo.

   ```powershell
   $ca = Join-Path $env:LOCALAPPDATA 'TurismoComunitario/caddy-local/pki/authorities/local/root.crt'
   curl.exe --fail --silent --show-error --cacert $ca -I https://localhost:8443/salud
   $env:NODE_EXTRA_CA_CERTS = $ca
   node scripts/check-ws.js https://localhost:8443
   ```

   Si curl usa Schannel y la CA local no publica la revocación, añade `--ssl-revoke-best-effort` al comando local. La comprobación del nombre y de la cadena del certificado sigue activa. La respuesta esperada es 200 con `Strict-Transport-Security` y transporte `websocket`.

## Pruebas tras integrar cuentas, ofertas y chat

- **TM-DEP-01** · Verificado en local con la CA de Caddy. Repetir con el certificado público cuando se resuelva PM-03.
- **TM-DEP-02** · Transporte WSS y estado 101 verificados por consola. Cuando se integre B1.6, comprobar que un cliente sin cookie recibe `connect_error` con código `UNAUTHENTICATED`. El script vigente imprime ese código y sale con 1 porque interpreta todo rechazo como error. Con sesión válida, abrir `/panel/chat` y capturar la conexión `wss://`, el estado 101 y una trama `42[…]` en DevTools tras enviar un mensaje.
- **TM-DEP-03** · Un registro ficticio de oferta y sus 68 bytes de foto sobrevivieron al reinicio de Node en la copia aislada. La inserción y la lectura se hicieron en SQLite mediante sentencias preparadas y se comparó el BLOB completo. Con B1.4 y B1.5 integrados, crear la oferta y subir su foto desde el panel, reiniciar usando el mismo volumen y comprobar que el detalle y la foto siguen accesibles.

`server.js` ya escucha `SIGTERM` y cierra Socket.IO y el servidor HTTP. En la base actual el proceso web no abre SQLite. El cierre de esa conexión en el arranque integrado queda por comprobar con el Integrante 4. La prueba de reinicio en Windows detuvo el proceso y arrancó otro sobre el mismo volumen. La [evidencia de consola](evidencias/B1.11/verificacion-local.txt) registra los resultados y los límites de la verificación.

Referencias de operación: [proxy inverso de Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) y [CA local de Caddy](https://caddyserver.com/docs/caddyfile/directives/tls#internal).
