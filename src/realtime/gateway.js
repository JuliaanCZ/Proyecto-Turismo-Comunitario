import { parseCookie } from 'cookie';
import { clearTimeout, setTimeout } from 'node:timers';
import { sessionCookieName } from '../shared/http/auth.js';
import {
  bindSessionGuard,
  disconnectForSession,
  isCurrentPrincipal,
} from './session-guard.js';

const MAX_HTTP_BUFFER_SIZE = 16 * 1024;
const MAX_TIMER_DELAY_MS = 2_147_483_647;
const SESSION_TOKEN = /^[A-Za-z0-9_-]{43}$/;

function connectionError(code, message) {
  const error = new Error(message);
  error.data = { code };
  return error;
}

function readSessionToken(socket, config) {
  const header = socket.handshake.headers.cookie;
  if (!header) return null;
  try {
    const token = parseCookie(header)[sessionCookieName(config)];
    return typeof token === 'string' && SESSION_TOKEN.test(token) ? token : null;
  } catch {
    return null;
  }
}

function scheduleExpiration(socket, clock) {
  let timer;
  const check = () => {
    if (!socket.connected) return;
    const remaining = socket.data.principal.sessionExpiresAt - clock.now();
    if (remaining <= 0) {
      disconnectForSession(socket, 'expired');
      return;
    }
    timer = setTimeout(check, Math.min(remaining, MAX_TIMER_DELAY_MS));
    timer.unref?.();
  };
  check();
  socket.once('disconnect', () => clearTimeout(timer));
}

function disconnectRoom(io, room) {
  io.to(room).emit('session:expired', { reason: 'revoked' });
  io.in(room).disconnectSockets(true);
}

/** Conserva el enganche C-EVT incluso en pruebas que no montan autenticación. */
export function createGateway({ io }) {
  const listeners = new Set();
  return {
    io,
    onMessageStored(fn) {
      if (typeof fn !== 'function') throw new TypeError('onMessageStored requiere una función.');
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    messageStored(message) {
      for (const fn of listeners) fn(message);
    },
    roomMembers(room) {
      if (!io) return [];
      const ids = io.sockets.adapter.rooms.get(room) ?? [];
      return [...ids].map((id) => io.sockets.sockets.get(id)).filter(Boolean);
    },
  };
}

/** Monta el gateway autenticado de C-EVT sobre el mismo servidor HTTP de Express. */
export function attachGateway(io, container) {
  const { accounts, clock, config, logger, sessionEvents } = container;
  const gateway = createGateway({ io });

  // Engine.IO consulta esta opción al crear cada transporte. `src/server.js` también
  // la fija al construir el servidor, antes de que pueda entrar una conexión.
  io.engine.opts.maxHttpBufferSize = MAX_HTTP_BUFFER_SIZE;

  io.use(async (socket, next) => {
    try {
      if (socket.handshake.headers.origin !== config.appOrigin) {
        next(connectionError('ORIGIN_MISMATCH', 'El origen de la conexión no está permitido.'));
        return;
      }

      const token = readSessionToken(socket, config);
      if (!token) {
        next(connectionError('UNAUTHENTICATED', 'La sesión no es válida.'));
        return;
      }

      const principal = await accounts.resolveSession(token, clock.now());
      if (!isCurrentPrincipal(principal, clock.now())) {
        next(connectionError('UNAUTHENTICATED', 'La sesión no es válida.'));
        return;
      }

      socket.data = { principal, token };
      bindSessionGuard(socket, { accounts, clock, logger });
      await socket.join([`user:${principal.userId}`, `session:${principal.sessionId}`]);
      next();
    } catch (error) {
      logger.error?.(error);
      next(connectionError('UNAUTHENTICATED', 'No se pudo validar la sesión.'));
    }
  });

  io.on('connection', (socket) => scheduleExpiration(socket, clock));

  sessionEvents.on('session-revoked', ({ sessionId, userId } = {}) => {
    if (sessionId !== undefined && sessionId !== null) {
      disconnectRoom(io, `session:${sessionId}`);
    }
    if (userId !== undefined && userId !== null) {
      disconnectRoom(io, `user:${userId}`);
    }
  });

  return gateway;
}
