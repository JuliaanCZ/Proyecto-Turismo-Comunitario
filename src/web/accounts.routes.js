import { Buffer } from 'node:buffer';
import { createHash, timingSafeEqual } from 'node:crypto';
import { stringifySetCookie } from 'cookie';
import { Router } from 'express';
import {
  loginSchema, recoverSchema, registerSchema, resetSchema, TOKEN_INVALID_MESSAGE,
} from '../modules/accounts/index.js';
import { AppError } from '../shared/errors.js';
import { sessionCookieName } from '../shared/http/auth.js';
import { safeNext } from '../shared/http/safe-next.js';
import { formatEcuadorDateTime } from '../shared/time.js';
import { validate } from '../shared/validation/validate.js';

const RESET_LINK_SENT = 'Si el correo tiene una cuenta, revisa tu bandeja de entrada y la carpeta de spam. El enlace vence en 30 minutos.';

function sha256(text) {
  return createHash('sha256').update(text).digest();
}

/** Autenticación básica de la bandeja: solo cuenta la clave (cualquier usuario). */
function mailboxAuthorized(req, password) {
  const [scheme, encoded] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  if (colon < 0) return false;
  return timingSafeEqual(sha256(decoded.slice(colon + 1)), sha256(password));
}

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
 * Router de `accounts` (B1.1 registro, B1.2 ingreso/salida, B1.3 recuperación y bandeja de pruebas).
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
      recoveryEnabled: config.recoveryEnabled,
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
      recoveryEnabled: config.recoveryEnabled,
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
      recoveryEnabled: config.recoveryEnabled,
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

  router.all(['/recuperar', '/restablecer'], (_req, _res, next) => {
    if (!config.recoveryEnabled) return next('router');
    return next();
  });

  const renderRecover = (res, { values = { email: '' }, errors = {}, formError = null, notice = null } = {}) => res.renderPage(
    'accounts/recuperar',
    { title: 'Recuperar contraseña', schema: recoverSchema, values, errors, formError, notice },
  );

  router.get('/recuperar', (req, res) => {
    renderRecover(res, { notice: req.query?.aviso === 'enlace-enviado' ? RESET_LINK_SENT : null });
  });

  router.post('/recuperar', async (req, res, next) => {
    try {
      await container.accounts.requestPasswordReset(req.body?.email);
      return res.redirect(302, '/recuperar?aviso=enlace-enviado');
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'VALIDATION_ERROR') return next(error);
      return renderRecover(res.status(error.status), {
        values: { email: typeof req.body?.email === 'string' ? req.body.email : '' },
        errors: error.fieldErrors ?? {},
        formError: error.message,
      });
    }
  });

  // La página lleva el token: sin caché y sin Referer hacia ningún recurso.
  const renderReset = (res, { token, errors = {}, formError = null }) => res
    .set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
    .renderPage('accounts/restablecer', { title: 'Nueva contraseña', schema: resetSchema, token, errors, formError });

  router.get('/restablecer', (req, res) => {
    const token = typeof req.query?.token === 'string' ? req.query.token : '';
    if (!token) return renderReset(res.status(400), { token, formError: TOKEN_INVALID_MESSAGE });
    return renderReset(res, { token });
  });

  router.post('/restablecer', async (req, res, next) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    try {
      await container.accounts.resetPassword({
        token,
        newPassword: req.body?.newPassword,
        newPasswordConfirm: req.body?.newPasswordConfirm,
      });
      // Sin Set-Cookie: esta ruta admite Origin null y las sesiones ya quedaron revocadas en la base.
      res.set('Cache-Control', 'no-store');
      return res.redirect(302, '/ingreso?aviso=clave-cambiada');
    } catch (error) {
      if (!(error instanceof AppError)) return next(error);
      if (error.code === 'TOKEN_INVALID') {
        return renderReset(res.status(error.status), { token: '', formError: error.message });
      }
      if (error.code !== 'VALIDATION_ERROR') return next(error);
      return renderReset(res.status(error.status), { token, errors: error.fieldErrors ?? {}, formError: error.message });
    }
  });

  router.get('/dev/bandeja', async (req, res, next) => {
    if (!config.demoMailboxEnabled) return next();
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    if (!mailboxAuthorized(req, config.demoMailboxPassword)) {
      return res.status(401).set('WWW-Authenticate', 'Basic realm="Bandeja de pruebas", charset="UTF-8"')
        .renderPage('errors/error', {
          title: 'Solicitud no procesada',
          status: 401,
          code: 'UNAUTHENTICATED',
          message: 'La bandeja de pruebas necesita su clave.',
        });
    }
    const messages = (await container.accounts.listMailbox()).map((mail) => ({
      ...mail,
      createdAtText: formatEcuadorDateTime(mail.createdAt),
    }));
    return res.renderPage('accounts/bandeja', { title: 'Bandeja de pruebas', messages });
  });

  return router;
}
