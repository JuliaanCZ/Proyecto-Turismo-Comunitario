const guardDependencies = new WeakMap();

const unauthenticated = Object.freeze({
  code: 'UNAUTHENTICATED',
  message: 'Tu sesión ya no es válida.',
});

export function isCurrentPrincipal(principal, now) {
  return principal !== null
    && typeof principal === 'object'
    && Number.isSafeInteger(principal.userId)
    && principal.userId > 0
    && typeof principal.sessionId === 'string'
    && principal.sessionId.length > 0
    && typeof principal.displayName === 'string'
    && Number.isSafeInteger(principal.sessionExpiresAt)
    && principal.sessionExpiresAt > now;
}

export function bindSessionGuard(socket, dependencies) {
  guardDependencies.set(socket, dependencies);
}

export function disconnectForSession(socket, reason, acknowledge) {
  if (!socket.connected) return;
  socket.emit('session:expired', { reason });
  acknowledge?.({ ok: false, error: unauthenticated });
  socket.disconnect(true);
}

/**
 * Protege un manejador entrante: la sesión se resuelve de nuevo justo antes de
 * ejecutar lógica de negocio. El manejador recibe los mismos argumentos y la
 * confirmación, si el cliente la envió.
 */
export function guard(socket, handler) {
  if (typeof handler !== 'function') throw new TypeError('guard requiere un manejador.');
  return async (...incoming) => {
    const dependencies = guardDependencies.get(socket);
    if (!dependencies) throw new Error('El socket no fue configurado para validar sesiones.');

    const args = [...incoming];
    const acknowledge = typeof args.at(-1) === 'function' ? args.pop() : undefined;
    const now = dependencies.clock.now();
    let principal;
    try {
      principal = await dependencies.accounts.resolveSession(socket.data.token, now);
    } catch (error) {
      dependencies.logger?.error?.(error);
    }

    const original = socket.data.principal;
    const sameIdentity = principal?.userId === original.userId
      && principal?.sessionId === original.sessionId;
    if (!sameIdentity || !isCurrentPrincipal(principal, now)) {
      const reason = original.sessionExpiresAt <= now ? 'expired' : 'revoked';
      disconnectForSession(socket, reason, acknowledge);
      return undefined;
    }

    socket.data.principal = principal;
    return handler(...args, ...(acknowledge ? [acknowledge] : []));
  };
}
