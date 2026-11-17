import { once } from 'node:events';
import { io as connectSocket } from 'socket.io-client';
import { createHttpServer } from '../../src/server.js';

export async function startTestServer(appOrContext) {
  const app = appOrContext.app ?? appOrContext;
  const { httpServer, io } = createHttpServer(app);
  httpServer.listen(0, '127.0.0.1');
  await once(httpServer, 'listening');
  const port = httpServer.address().port;
  let closed = false;
  return {
    io,
    url: `http://127.0.0.1:${port}`,
    port,
    close() {
      if (closed) return Promise.resolve();
      closed = true;
      io.close();
      if (!httpServer.listening) return Promise.resolve();
      return new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

export function connect({ url, cookie, origin, transports = ['websocket'] }) {
  const socket = connectSocket(url, {
    transports,
    reconnection: false,
    ...(cookie || origin ? {
      extraHeaders: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
    } : {}),
  });
  const received = [];
  const listeners = new Map();
  const record = (event, ...args) => {
    const item = { event, args, data: args.length === 1 ? args[0] : args };
    received.push(item);
    const eventListeners = listeners.get(event) ?? [];
    for (const listener of eventListeners) listener();
  };
  const originalOn = socket.on.bind(socket);
  socket.on = (event, listener) => {
    if (event !== 'connect' && event !== 'connect_error' && event !== 'disconnect') {
      const eventListeners = listeners.get(event) ?? [];
      listeners.set(event, [...eventListeners, listener]);
    }
    return originalOn(event, listener);
  };
  const trackedEvents = new Set();
  const track = (event) => {
    if (trackedEvents.has(event)) return;
    trackedEvents.add(event);
    originalOn(event, (...args) => record(event, ...args));
  };

  return Object.assign(socket, {
    received,
    waitFor(event, count = 1) {
      track(event);
      const matching = () => received.filter((item) => item.event === event).length;
      if (matching() >= count) return Promise.resolve();
      if (!socket.connected) {
        return Promise.reject(new Error(`No llegaron ${count} eventos "${event}"; el cliente no está conectado.`));
      }
      return new Promise((resolve, reject) => {
        const check = () => {
          if (matching() >= count) {
            socket.off('disconnect', disconnected);
            socket.off('connect_error', failed);
            resolve();
          }
        };
        const disconnected = (reason) => {
          socket.off(event, check);
          reject(new Error(`No llegaron ${count} eventos "${event}"; Socket.IO se desconectó: ${reason}.`));
        };
        const failed = (error) => {
          socket.off(event, check);
          reject(new Error(`No llegaron ${count} eventos "${event}"; conexión fallida: ${error.message}.`));
        };
        socket.on(event, check);
        socket.once('disconnect', disconnected);
        socket.once('connect_error', failed);
      });
    },
  });
}

export function expectNoEvent(client, event, witness) {
  return new Promise((resolve, reject) => {
    const forbidden = () => {
      cleanup();
      reject(new Error(`Llegó el evento prohibido "${event}" antes del testigo "${witness}".`));
    };
    const witnessed = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      client.off(event, forbidden);
      client.off(witness, witnessed);
    };
    client.once(event, forbidden);
    client.once(witness, witnessed);
  });
}
