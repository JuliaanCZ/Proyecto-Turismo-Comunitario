/**
 * Esqueleto del gateway Socket.IO (B0.4). El real —handshake con cookie y `Origin`,
 * salas, `chat:*`, cierre por sesión— es de B1.6 (Integrante 3).
 *
 * Mientras tanto Socket.IO acepta conexiones sin autenticar: solo sirve para comprobar
 * que HTTP y WebSocket comparten puerto (B0.1). Lo único que fija ya es el enganche de
 * C-EVT entre bloques: `onMessageStored(fn)` registra y `messageStored(message)` invoca.
 */
export function createGateway(deps) {
  const listeners = [];
  return {
    io: deps.io,
    onMessageStored(fn) {
      listeners.push(fn);
    },
    messageStored(message) {
      for (const fn of listeners) fn(message);
    },
  };
}
