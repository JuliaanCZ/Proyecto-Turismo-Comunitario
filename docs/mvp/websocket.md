# WebSocket del MVP

El servidor HTTP de Express y Socket.IO viven en el mismo proceso, puerto y origen.
No se usa un servicio externo de tiempo real. El gateway acepta únicamente una cookie
de sesión vigente y un `Origin` exactamente igual a `APP_ORIGIN`; después asocia el
socket a las salas `user:<id>` y `session:<id>`.

## Del HTTP inicial al WebSocket

El cliente abre `GET /socket.io/?EIO=4&transport=websocket` con las cabeceras
`Connection: Upgrade` y `Upgrade: websocket`. El servidor acepta el cambio de protocolo
con estado HTTP `101 Switching Protocols`. Desde ese momento la conexión queda abierta
y ambos extremos pueden enviar datos sin crear una petición HTTP por mensaje. En el
despliegue HTTPS la misma operación usa `wss://`; el proxy descrito en
`docs/mvp/despliegue.md` debe reenviar las cabeceras de actualización.

Engine.IO administra el transporte y su latido. Sobre él, Socket.IO añade eventos,
salas, confirmaciones y reconexión. Por ejemplo, una trama textual `42["chat:join"]`
significa: paquete Engine.IO de mensaje (`4`), paquete Socket.IO de evento (`2`) y la
carga JSON del evento. No se debe programar contra esas tramas manualmente: el cliente
Socket.IO las codifica y decodifica.

## Transporte, respaldo, reconexión y latido

Socket.IO normalmente puede comenzar con sondeo largo HTTP (*long polling*) y luego
actualizar a WebSocket. Ese sondeo es un respaldo útil cuando una red o proxy bloquea la
actualización. En este MVP el cliente fuerza `transports: ['websocket']`: así se cumple y
se demuestra de forma inequívoca el requisito de WebSocket, y una configuración WSS
incorrecta falla visiblemente en lugar de quedar oculta por el sondeo.

Las versiones instaladas son Socket.IO y `socket.io-client` 4.8.4. Sus valores por
defecto comprobados en el código instalado son:

- latido del servidor cada 25 000 ms (`pingInterval`) y espera de 20 000 ms
  (`pingTimeout`);
- reconexión habilitada en el cliente, intentos ilimitados, demora inicial de 1 000 ms,
  máximo de 5 000 ms y aleatoriedad de 0,5;
- tiempo máximo de apertura del cliente de 20 000 ms.

El gateway limita cada carga de Engine.IO a 16 KiB. Además del handshake, `guard`
revalida la sesión antes de cada evento entrante. Una sesión revocada o vencida recibe
`session:expired` y pierde el socket; el evento `session-revoked` también permite cerrar
de inmediato todos los sockets de una sesión o de un usuario.

## Verificación

Con una sesión iniciada, en DevTools:

1. Abrir **Network**, elegir el filtro **WS** y recargar la página que conecta Socket.IO.
2. Seleccionar `/socket.io/?EIO=4&transport=websocket`.
3. En **Headers**, comprobar `101 Switching Protocols`, `Upgrade: websocket` y el mismo
   host de la aplicación. No incluir la cookie ni su token en la captura.
4. En **Messages**, comprobar el paquete de apertura, el latido y las tramas de eventos.
5. En la consola comprobar `socket.io.engine.transport.name === 'websocket'`.

Guardar la captura como `docs/mvp/evidencias/B1.6/websocket-devtools.png`.

El script también comprueba el transporte. Como el gateway ya exige autenticación, la
cookie completa de una cuenta de demostración se entrega por la entrada estándar; no
queda como argumento, variable de entorno ni salida del script:

```powershell
Read-Host 'Cookie de demostración' -MaskInput |
  node scripts/check-ws.js http://localhost:3000 --cookie-stdin
```

En HTTPS el nombre es `__Host-tc_session` y la URL empieza con `https://`; el resultado
esperado es `connect · transporte: websocket`. Sin cookie válida debe aparecer
`connect_error · código: UNAUTHENTICATED`.
