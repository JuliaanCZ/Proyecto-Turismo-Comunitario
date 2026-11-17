import { once } from 'node:events';
import { clearTimeout, setTimeout } from 'node:timers';
import { io as connectSocket } from 'socket.io-client';
import { createHttpServer } from '../../src/server.js';

const DEFAULT_TIMEOUT_MS = 3_000;

function validateTimeout(timeoutMs) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('timeoutMs debe ser un entero positivo.');
  }
}

function withSafetyTimeout(promise, timeoutMs, message) {
  validateTimeout(timeoutMs);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function startTestServer(appOrContext, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const app = appOrContext.app ?? appOrContext;
  const { httpServer, io } = createHttpServer(app);
  const listening = once(httpServer, 'listening');
  httpServer.listen(0, '127.0.0.1');
  try {
    await withSafetyTimeout(listening, timeoutMs, `El servidor no escuchó en ${timeoutMs} ms.`);
  } catch (error) {
    await withSafetyTimeout(
      new Promise((resolve) => io.close(resolve)),
      timeoutMs,
      `El servidor no cerró en ${timeoutMs} ms tras fallar el arranque.`,
    ).catch(() => {});
    throw error;
  }
  const port = httpServer.address().port;
  let closePromise;
  return {
    io,
    url: `http://127.0.0.1:${port}`,
    port,
    close({ timeoutMs: closeTimeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
      if (closePromise) return closePromise;
      const closing = new Promise((resolve) => io.close(resolve));
      closePromise = withSafetyTimeout(
        closing,
        closeTimeoutMs,
        `El servidor no cerró en ${closeTimeoutMs} ms.`,
      );
      return closePromise;
    },
  };
}

export function connect({ url, cookie, origin, transports = ['websocket'] }) {
  const socket = connectSocket(url, {
    autoConnect: false,
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
  let connectionError;
  const connectionOutcome = new Promise((resolve) => {
    const cleanup = () => {
      socket.off('connect', connected);
      socket.off('connect_error', failed);
    };
    const connected = () => {
      cleanup();
      resolve({ connected: true });
    };
    const failed = (error) => {
      connectionError = error;
      cleanup();
      resolve({ connected: false, error });
    };
    socket.once('connect', connected);
    socket.once('connect_error', failed);
  });
  socket.onAny((event, ...args) => {
    const item = { event, args, data: args.length === 1 ? args[0] : args };
    received.push(item);
  });

  Object.assign(socket, {
    received,
    async waitForConnection({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
      if (socket.connected) return socket;
      const outcome = await withSafetyTimeout(
        connectionOutcome,
        timeoutMs,
        `No llegó connect ni connect_error en ${timeoutMs} ms.`,
      );
      if (!outcome.connected) throw outcome.error;
      return socket;
    },
    waitFor(event, count = 1, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
      validateTimeout(timeoutMs);
      if (!Number.isSafeInteger(count) || count <= 0) {
        return Promise.reject(new TypeError('count debe ser un entero positivo.'));
      }
      const matching = () => received.filter((item) => item.event === event).length;
      if (matching() >= count) return Promise.resolve();
      if (!socket.connected && !socket.active) {
        if (connectionError) return Promise.reject(connectionError);
        return Promise.reject(new Error(`No llegaron ${count} eventos "${event}"; el cliente no está conectado.`));
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`No llegaron ${count} eventos "${event}" en ${timeoutMs} ms.`));
        }, timeoutMs);
        const cleanup = () => {
          clearTimeout(timer);
          socket.off(event, check);
          socket.off('disconnect', disconnected);
          socket.off('connect_error', failed);
        };
        const check = () => {
          if (matching() >= count) {
            cleanup();
            resolve();
          }
        };
        const disconnected = (reason) => {
          cleanup();
          reject(new Error(`No llegaron ${count} eventos "${event}"; Socket.IO se desconectó: ${reason}.`));
        };
        const failed = (error) => {
          cleanup();
          reject(error);
        };
        socket.on(event, check);
        socket.once('disconnect', disconnected);
        socket.once('connect_error', failed);
      });
    },
  });
  socket.connect();
  return socket;
}

export function expectNoEvent(client, event, witness, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  validateTimeout(timeoutMs);
  if (event === witness) {
    return Promise.reject(new TypeError('El evento prohibido y el testigo deben ser distintos.'));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`No llegó el testigo "${witness}" en ${timeoutMs} ms.`));
    }, timeoutMs);
    const forbidden = () => {
      cleanup();
      reject(new Error(`Llegó el evento prohibido "${event}" antes del testigo "${witness}".`));
    };
    const witnessed = () => {
      cleanup();
      resolve();
    };
    const disconnected = (reason) => {
      cleanup();
      reject(new Error(`No llegó el testigo "${witness}"; Socket.IO se desconectó: ${reason}.`));
    };
    const failed = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timer);
      client.off(event, forbidden);
      client.off(witness, witnessed);
      client.off('disconnect', disconnected);
      client.off('connect_error', failed);
    };
    if (!client.connected) {
      disconnected('el cliente ya estaba desconectado');
      return;
    }
    client.once(event, forbidden);
    client.once(witness, witnessed);
    client.once('disconnect', disconnected);
    client.once('connect_error', failed);
  });
}
