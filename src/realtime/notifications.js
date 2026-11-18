const CHAT_ROOM = 'chat:general';
const EVENT = 'notification:new-message';

/**
 * Aviso adicional de nuevo mensaje (B1.10, C-EVT). Se engancha solo a `gateway.onMessageStored`,
 * que el chat invoca únicamente tras guardar un mensaje NUEVO (no en reintentos ni rechazos).
 *
 * Por cada socket conectado emite `notification:new-message { messageId, authorDisplayName, createdAt }`
 * salvo que el socket pertenezca al autor (en cualquiera de sus pestañas o sesiones) o esté unido a
 * `chat:general`, donde ya recibe `chat:message`. La carga nunca lleva el texto ni el correo.
 * El aviso es de mejor esfuerzo: si falla, el historial del chat cubre el mensaje.
 *
 * @returns {() => void} función que retira el oyente (útil en pruebas).
 */
export function registerNotifications(gateway, { logger } = {}) {
  const { io } = gateway;
  if (!io) throw new TypeError('registerNotifications requiere un gateway con Socket.IO.');

  return gateway.onMessageStored((message) => {
    try {
      const payload = {
        messageId: message.id,
        authorDisplayName: message.author.displayName,
        createdAt: message.createdAt,
      };
      const authorId = message.author.id;
      for (const socket of io.sockets.sockets.values()) {
        if (socket.data?.principal?.userId === authorId) continue;
        if (socket.rooms.has(CHAT_ROOM)) continue;
        socket.emit(EVENT, payload);
      }
    } catch (error) {
      // Un fallo del aviso no debe afectar la confirmación del mensaje ya guardado ni a otros oyentes.
      logger?.error?.('No se pudo emitir el aviso de nuevo mensaje:', error);
    }
  });
}
