import { createServer } from 'node:http';
import { Server } from 'socket.io';

/** Un solo `http.Server`: Express (`app`) y Socket.IO comparten el puerto (B0.1). */
export function createHttpServer(app) {
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  return { httpServer, io };
}
