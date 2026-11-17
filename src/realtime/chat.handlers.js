import { AppError } from '../shared/errors.js';
import { createPresence } from './presence.js';
import { guard } from './session-guard.js';

function errorPayload(error) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      ...(error.details ? { details: error.details } : {}),
    };
  }
  return {
    code: 'INTERNAL_ERROR',
    message: 'No pudimos procesar el mensaje. Inténtalo de nuevo.',
  };
}

export function registerChatHandlers(io, gateway, container) {
  const presence = createPresence(io);
  io.on('connection', (socket) => {
    socket.on('chat:join', guard(socket, async (acknowledge) => {
      await socket.join('chat:general');
      acknowledge?.({
        ok: true,
        lastMessageId: container.chat.lastMessageId(),
        presence: presence.join(socket),
      });
    }));

    socket.on('chat:leave', guard(socket, async (acknowledge) => {
      await socket.leave('chat:general');
      presence.leave(socket);
      acknowledge?.({ ok: true });
    }));

    socket.on('disconnect', () => presence.leave(socket));

    socket.on('chat:send', guard(socket, async (payload, acknowledge) => {
      try {
        const result = await container.chat.postMessage(socket.data.principal, payload);
        acknowledge?.({ ok: true, message: result.message });
        if (!result.duplicated) {
          io.to('chat:general').emit('chat:message', result.message);
          gateway.messageStored(result.message);
        }
      } catch (error) {
        if (!(error instanceof AppError)) container.logger.error('No se pudo enviar el mensaje:', error);
        acknowledge?.({ ok: false, error: errorPayload(error) });
      }
    }));
  });
}
