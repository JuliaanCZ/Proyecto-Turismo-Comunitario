import { stringifySetCookie } from 'cookie';
import { Router } from 'express';
import { loginSchema, registerSchema } from '../modules/accounts/index.js';
import { AppError } from '../shared/errors.js';
import { sessionCookieName } from '../shared/http/auth.js';
import { safeNext } from '../shared/http/safe-next.js';
import { validate } from '../shared/validation/validate.js';

const LOGIN_NOTICES = Object.freeze({
  'cuenta-creada': 'Cuenta creada. Ya puedes iniciar sesión.',
  'clave-cambiada': 'Contraseña actualizada. Inicia sesión con tu nueva clave.',
  'sesion-cerrada': 'Cerraste tu sesión.',
});

function loginNotice(raw) {
  return typeof raw === 'string' && Object.hasOwn(LOGIN_NOTICES, raw) ? LOGIN_NOTICES[raw] : null;
}

function emptyRegisterValues() {
  return { displayName: '', email: '' };
}

function registerValuesFromBody(body = {}) {
  return {
    displayName: typeof body.displayName === 'string' ? body.displayName : '',
    email: typeof body.email === 'string' ? body.email : '',
  };
}

function loginValuesFromBody(body = {}) {
  return {
    email: typeof body.email === 'string' ? body.email : '',
  };
}

function buildSessionCookie(config, token) {
  return stringifySetCookie({
    name: sessionCookieName(config),
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionTtlHours * 3600,
    ...(config.cookieSecure ? { secure: true } : {}),
  });
}

function clearSessionCookie(config) {
  return stringifySetCookie({
    name: sessionCookieName(config),
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    ...(config.cookieSecure ? { secure: true } : {}),
  });
}

/**
 * Router de `accounts` (B1.1 registro, B1.2 ingreso/salida; B1.3 añade recuperación).
 * Solo adapta HTTP: valida, llama al servicio y responde; no consulta SQLite.
 */
export function createAccountsRouter(container) {
  const router = Router();
  const { config } = container;

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
        values: registerValuesFromBody(req.body),
        errors: error.fieldErrors ?? {},
        formError: error.message,
      });
    }
  });

  router.get('/ingreso', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.renderPage('accounts/ingreso', {
      title: 'Ingresar',
      schema: loginSchema,
      values: { email: '' },
      errors: {},
      formError: null,
      notice: loginNotice(req.query?.aviso),
      next: typeof req.query?.next === 'string' ? req.query.next : '',
    });
  });

  router.post('/ingreso', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const rawNext = req.body?.next ?? req.query?.next ?? '';
    const check = validate(loginSchema, req.body);
    if (!check.ok) {
      return res.status(422).renderPage('accounts/ingreso', {
        title: 'Ingresar',
        schema: loginSchema,
        values: loginValuesFromBody(req.body),
        errors: check.errors,
        formError: 'Revisa los campos indicados.',
        notice: null,
        next: typeof rawNext === 'string' ? rawNext : '',
      });
    }

    try {
      const user = await container.accounts.authenticate(check.values.email, check.values.password);
      // Ignora cualquier cookie previa: siempre emite un token nuevo (sin fijación).
      const session = await container.accounts.createSession(user.userId);
      res.set('Set-Cookie', buildSessionCookie(config, session.token));
      return res.redirect(302, safeNext(rawNext, config.appOrigin));
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'INVALID_CREDENTIALS') {
        return next(error);
      }
      return res.status(error.status).renderPage('accounts/ingreso', {
        title: 'Ingresar',
        schema: loginSchema,
        values: loginValuesFromBody(req.body),
        errors: {},
        formError: error.message,
        notice: null,
        next: typeof rawNext === 'string' ? rawNext : '',
      });
    }
  });

  router.post('/salir', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (req.principal?.sessionId) {
        await container.accounts.revokeSession(req.principal.sessionId, 'LOGOUT');
      }
      res.set('Set-Cookie', clearSessionCookie(config));
      return res.redirect(302, '/ingreso?aviso=sesion-cerrada');
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
