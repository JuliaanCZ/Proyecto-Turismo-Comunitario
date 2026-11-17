import { parseCookie } from 'cookie';
import { systemClock } from '../clock.js';
import { AppError } from '../errors.js';
import { safeNext } from './safe-next.js';

const MAX_TOKEN_LENGTH = 512;

/** Nombre de la cookie de sesión (C-SES): con HTTPS lleva el prefijo `__Host-`. */
export function sessionCookieName(config) {
  return config.cookieSecure ? '__Host-tc_session' : 'tc_session';
}

export function isApiPath(path) {
  return path === '/api' || path.startsWith('/api/');
}

/**
 * Resuelve la sesión con el resolvedor INYECTADO (`container.accounts.resolveSession`,
 * C-SES) y fija `req.principal` (`Principal` o `null`). Sin cookie no consulta nada.
 * Si el resolvedor falla, el error llega al manejador de errores.
 */
export function attachPrincipal(resolveSession, { cookieName = 'tc_session', clock = systemClock } = {}) {
  return async function attachPrincipalMiddleware(req, _res, next) {
    req.principal = null;
    try {
      const header = req.headers.cookie;
      const token = header ? parseCookie(header)[cookieName] : undefined;
      if (token && token.length <= MAX_TOKEN_LENGTH) {
        req.principal = (await resolveSession(token, clock.now())) ?? null;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Páginas: 302 a `/ingreso?next=<ruta segura>`. `/api/*`: 401 JSON `UNAUTHENTICATED`
 * (lo emite el manejador de errores). Solo un GET puede volver a su propia ruta tras ingresar.
 */
export function requireAuth(req, res, next) {
  if (req.principal) return next();
  if (isApiPath(req.originalUrl.split('?')[0])) {
    return next(AppError.fromCatalog('UNAUTHENTICATED', 'Debes iniciar sesión para continuar.'));
  }
  const returnTo = req.method === 'GET' ? safeNext(req.originalUrl, req.app.get('appOrigin')) : '/panel';
  return res.redirect(302, `/ingreso?next=${encodeURIComponent(returnTo)}`);
}

/** Respuestas de `/panel` y `/api` (C-HTTP): nada de esto debe quedar en cachés. */
export function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
