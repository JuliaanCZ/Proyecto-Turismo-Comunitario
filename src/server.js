import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { registerChatHandlers } from './realtime/chat.handlers.js';
import { attachGateway } from './realtime/gateway.js';
import { registerNotifications } from './realtime/notifications.js';

const MAX_HTTP_BUFFER_SIZE = 16 * 1024;

/** Un solo `http.Server`: Express (`app`) y Socket.IO comparten el puerto (B0.1). */
export function createHttpServer(app, container) {
  const httpServer = createServer(app);
  const io = new Server(httpServer, { maxHttpBufferSize: MAX_HTTP_BUFFER_SIZE });
  const gateway = container ? attachGateway(io, container) : undefined;
  if (gateway) {
    registerChatHandlers(io, gateway, container);
    registerNotifications(gateway, { logger: container.logger });
  }
  return { httpServer, io, gateway };
}
