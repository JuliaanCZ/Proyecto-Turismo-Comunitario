import { Router } from 'express';
import { AppError } from '../shared/errors.js';
import { registerSchema } from '../modules/accounts/index.js';

function emptyRegisterValues() {
  return { displayName: '', email: '' };
}

function valuesFromBody(body = {}) {
  return {
    displayName: typeof body.displayName === 'string' ? body.displayName : '',
    email: typeof body.email === 'string' ? body.email : '',
  };
}

/**
 * Router de `accounts`. B1.1: `/registro`. B1.2/B1.3 añaden ingreso, salida y recuperación.
 * Solo adapta HTTP: valida vía servicio y responde; no consulta SQLite.
 */
export function createAccountsRouter(container) {
  const router = Router();

  router.get('/registro', (_req, res) => {
    res.renderPage('accounts/registro', {
      title: 'Crear cuenta',
      schema: registerSchema,
      values: emptyRegisterValues(),
      errors: {},
      formError: null,
    });
  });

  router.post('/registro', async (req, res, next) => {
    try {
      await container.accounts.registerUser(req.body);
      return res.redirect(302, '/ingreso?aviso=cuenta-creada');
    } catch (error) {
      if (!(error instanceof AppError)) return next(error);
      if (error.code !== 'VALIDATION_ERROR' && error.code !== 'EMAIL_TAKEN') {
        return next(error);
      }
      return res.status(error.status).renderPage('accounts/registro', {
        title: 'Crear cuenta',
        schema: registerSchema,
        values: valuesFromBody(req.body),
        errors: error.fieldErrors ?? {},
        formError: error.message,
      });
    }
  });

  return router;
}
