import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../errors.js';
import { isSafeMethod } from './origin.js';

/** Token HMAC-SHA256 del id de sesión con `CSRF_SECRET` (DM-07), en base64url. */
export function createCsrfToken(secret, sessionId) {
  return createHmac('sha256', secret).update(String(sessionId)).digest('base64url');
}

export function isValidCsrfToken(secret, sessionId, provided) {
  if (typeof provided !== 'string' || provided === '') return false;
  const expected = Buffer.from(createCsrfToken(secret, sessionId));
  const received = Buffer.from(provided);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Expone `res.locals.csrfToken` (vacío sin sesión) y, cuando hay sesión, exige
 * el token en la cabecera `x-csrf-token` o en el campo `_csrf` para toda
 * mutación. Va después de `attachPrincipal` y después de leer el cuerpo.
 * Sin sesión no hay token que comprobar: el origen ya se validó antes.
 */
export function csrf(secret) {
  return function csrfMiddleware(req, res, next) {
    const sessionId = req.principal?.sessionId;
    res.locals.csrfToken = sessionId ? createCsrfToken(secret, sessionId) : '';
    if (!sessionId || isSafeMethod(req.method)) return next();

    const provided = req.get('x-csrf-token') ?? req.body?._csrf;
    if (isValidCsrfToken(secret, sessionId, provided)) return next();
    return next(AppError.fromCatalog('CSRF_INVALID', 'No pudimos verificar la solicitud. Recarga la página e inténtalo de nuevo.'));
  };
}
