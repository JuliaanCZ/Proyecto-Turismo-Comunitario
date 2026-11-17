import { AppError } from '../errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isSafeMethod(method) {
  return SAFE_METHODS.has(method);
}

/**
 * Protección de origen (C-HTTP, DM-07): toda petición que no sea GET, HEAD u
 * OPTIONS debe traer `Origin` y ser exactamente `APP_ORIGIN`. Sin `Origin`,
 * con `null` o con otro sitio responde 403 `ORIGIN_MISMATCH`.
 */
export function originGuard(appOrigin) {
  return function originGuardMiddleware(req, _res, next) {
    if (isSafeMethod(req.method) || req.get('origin') === appOrigin) return next();
    return next(AppError.fromCatalog('ORIGIN_MISMATCH', 'No pudimos verificar el origen de la solicitud.'));
  };
}
