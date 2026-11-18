# Evidencias B2.1 — Integración de sesión HTTP y WebSocket

| Archivo | Qué evidencia |
|---|---|
| `pruebas-bloque.txt` | Salida de `node --test tests/integration/sesion-http-ws.test.js` (`TM-INT-01` a `TM-INT-05`) con cuentas, chat, gateway y `sessionEvents` reales, servidor en puerto efímero y cookies obtenidas por `POST /ingreso`. |
| `npm-test.txt` · `npm-lint.txt` | Suite completa y `eslint .` sobre la rama creada desde `main` (incluye B1.2, B1.3, B1.6, B1.7, B1.8, B1.10 y B2.3). |

**Cableado.** No hizo falta tocar `src/container.js` ni `src/server.js`: el contenedor ya entrega `accounts` real y un único `sessionEvents`, y `createHttpServer` pasa ese contenedor a `attachGateway`. El bloque solo añade la prueba y estas evidencias.

**Control de la prueba.** Con la emisión de `session-revoked { sessionId }` desactivada a propósito en `accounts`, `TM-INT-01` y `TM-INT-03` fallan (el socket no se cierra); con el código real pasan. El cambio temporal se revirtió.

**TM-INT-05.** El gateway programa el cierre con un temporizador real según `sessionExpiresAt`. La prueba conecta con el reloj falso a 100 ms del vencimiento y lo adelanta: el temporizador encuentra la sesión vencida y cierra el socket con `session:expired { reason: 'expired' }` sin que el cliente envíe nada.

## Comprobación manual con dos navegadores

Pasos (servidor local con `npm run dev`):

1. Navegador A (ventana normal): crear o usar la cuenta de Ana, ingresar y abrir `/panel/chat`.
2. Navegador B (ventana privada): ingresar como Luis y abrir `/panel/chat`. Ambos se ven en «conectados».
3. En A, pulsar **Salir**.
4. Esperado: la pestaña de chat de A (si había otra abierta con la misma sesión) muestra que la sesión terminó y deja de recibir mensajes; recargar `/panel/chat` lleva a `/ingreso`. En B, Luis sigue conectado y puede escribir.
5. En B, pedir un enlace en `/recuperar` para Luis, abrirlo desde `/dev/bandeja` y guardar una contraseña nueva: el chat de B se desconecta y `/panel` pide ingresar de nuevo.

Resultado (17/11/2026, servidor local con base temporal, dos ventanas de Chrome: normal y privada):

- Pasos 1 y 2: correctos. Ana y Rick ingresaron con cuentas reales, el chat mostró «Conectado por websocket» y «Conectados (2)», y los mensajes de cada uno llegaron al otro al instante.
- Pasos 3 y 4 (cierre de sesión): correctos. Ana pulsó **Salir** y llegó a `/ingreso` con «Cerraste tu sesión» (`manual-1-ana-salir.png`). En la ventana de Rick, sin recargar, «Conectados» bajó a 1 y Rick siguió enviando mensajes confirmados (`manual-2-rick-conectados-1.png`). En la base, las sesiones de Ana quedaron revocadas con `LOGOUT`.
- Paso 5 (restablecimiento): correcto. Se pidió el enlace en `/recuperar`, la bandeja pidió su clave y mostró el mensaje (`manual-3-bandeja.png`); con el enlace de Rick se guardó una contraseña nueva y apareció «Contraseña actualizada». La sesión de Rick que tenía el chat abierto quedó revocada con `PASSWORD_RESET` en el mismo instante en que se usó el token; la clave vieja dio «Correo o contraseña incorrectos» (`manual-4-clave-vieja-rechazada.png`) y la nueva abrió una sesión nueva. No se guardó captura del chat de Rick al desconectarse; ese cierre lo prueba `TM-INT-02`.
- Observación para B1.8: en la lista «Conectados» la viñeta de cada nombre queda encima del nombre anterior (`.chat__presencia-lista` usa `display: flex` y conserva las viñetas). No afecta a B2.1; se avisó al responsable.
