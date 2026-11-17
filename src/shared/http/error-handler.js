import console from 'node:console';
import { AppError } from '../errors.js';
import { isApiPath } from './auth.js';

export function notFoundHandler(_req, _res, next) {
  next(AppError.fromCatalog('NOT_FOUND', 'No encontramos lo que buscas.'));
}

// Errores del analizador de cuerpos (JSON mal formado, cuerpo mayor de 16 kB): son del cliente.
function isClientBodyError(error) {
  return typeof error?.type === 'string' && error.status >= 400 && error.status < 500;
}

function toAppError(error, logger) {
  if (error instanceof AppError) return error;
  if (isClientBodyError(error)) {
    return AppError.fromCatalog('VALIDATION_ERROR', 'No pudimos leer la solicitud: está mal formada o es demasiado grande.');
  }
  // Solo el servidor ve el detalle; al cliente nunca se envía la traza.
  logger.error('Error no controlado:', error);
  return AppError.fromCatalog('INTERNAL_ERROR', 'Ocurrió un error interno. Inténtalo de nuevo en unos minutos.');
}

function viewFor(status) {
  if (status === 404) return 'errors/404';
  if (status >= 500) return 'errors/500';
  return 'errors/error';
}

/**
 * Manejador final (C-ERR): `AppError` → página o JSON `{ error: { code, message, fieldErrors? } }`
 * según la ruta (`/api/*` = JSON); cualquier otro error → `INTERNAL_ERROR` sin trazas.
 */
export function errorHandler({ logger = console } = {}) {
  return function errorHandlerMiddleware(error, req, res, next) {
    if (res.headersSent) return next(error);
    const appError = toAppError(error, logger);
    res.status(appError.status);

    if (isApiPath(req.path)) {
      const body = { code: appError.code, message: appError.message };
      if (appError.fieldErrors) body.fieldErrors = appError.fieldErrors;
      return res.json({ error: body });
    }

    const locals = { title: appError.message, status: appError.status, code: appError.code, message: appError.message };
    return res.renderPage(viewFor(appError.status), locals, (renderError) => {
      logger.error('No se pudo mostrar la página de error:', renderError);
      res.type('text/plain').send('Ocurrió un error. Inténtalo de nuevo más tarde.');
    });
  };
}
