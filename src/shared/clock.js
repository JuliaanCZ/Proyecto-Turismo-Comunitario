/** Reloj del sistema (producción). */
export const systemClock = {
  now() {
    return Date.now();
  },
};

/** Reloj fijo para pruebas; `advance(ms)` mueve el instante. */
export function fixedClock(ms) {
  let current = ms;
  return {
    now() {
      return current;
    },
    advance(deltaMs) {
      current += deltaMs;
    },
  };
}
