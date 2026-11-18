import { AppError } from '../errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isSafeMethod(method) {
  return SAFE_METHODS.has(method);
}

/**
 * Protección de origen (C-HTTP, DM-07): toda petición que no sea GET, HEAD u
 * OPTIONS debe traer `Origin` y ser exactamente `APP_ORIGIN`. Sin `Origin`,
 * con `null` o con otro sitio responde 403 `ORIGIN_MISMATCH`.
 * `nullOriginPaths`: rutas servidas con `Referrer-Policy: no-referrer`, cuyo formulario el navegador envía
 * con `Origin: null`; solo valen si la ruta exige además un secreto propio (p. ej. el token de `/restablecer`).
 */
export function originGuard(appOrigin, { nullOriginPaths = [] } = {}) {
  return function originGuardMiddleware(req, _res, next) {
    const origin = req.get('origin');
    if (isSafeMethod(req.method) || origin === appOrigin) return next();
    if (origin === 'null' && nullOriginPaths.includes(req.path)) return next();
    return next(AppError.fromCatalog('ORIGIN_MISMATCH', 'No pudimos verificar el origen de la solicitud.'));
  };
}
