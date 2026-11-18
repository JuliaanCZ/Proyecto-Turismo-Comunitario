# Evidencias B2.1 — Integración de sesión HTTP y WebSocket

| Archivo | Qué evidencia |
|---|---|
| `pruebas-bloque.txt` | Salida de `node --test tests/integration/sesion-http-ws.test.js` (`TM-INT-01` a `TM-INT-05`) con cuentas, chat, gateway y `sessionEvents` reales, servidor en puerto efímero y cookies obtenidas por `POST /ingreso`. |
| `npm-test.txt` · `npm-lint.txt` | Suite completa y `eslint .` sobre la rama creada desde `main` (incluye B1.2, B1.3, B1.6, B1.7, B1.8 y B1.10). |

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
- Pasos 3 a 5: pendientes de registrar a mano; ese comportamiento queda cubierto por `TM-INT-01` y `TM-INT-02`.
- Observación para B1.8: en la lista «Conectados» la viñeta de cada nombre queda encima del nombre anterior (`.chat__presencia-lista` usa `display: flex` y conserva las viñetas). No afecta a B2.1; se avisó al responsable.
