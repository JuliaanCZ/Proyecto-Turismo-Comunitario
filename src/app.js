import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import ejs from 'ejs';
import express from 'express';
import helmet from 'helmet';
import { attachPrincipal, noStore, requireAuth, sessionCookieName } from './shared/http/auth.js';
import { csrf } from './shared/http/csrf.js';
import { errorHandler, notFoundHandler } from './shared/http/error-handler.js';
import { originGuard } from './shared/http/origin.js';
import { createAccountsRouter } from './web/accounts.routes.js';
import { createChatRouter } from './web/chat.routes.js';
import { createDesignRouter } from './web/design.routes.js';
import { createOffersRouter } from './web/offers.routes.js';
import { createPanelRouter } from './web/panel.routes.js';
import { pageLocals, renderPage } from './web/render-page.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BODY_LIMIT = '16kb';

function securityHeaders(config) {
  const https = new URL(config.appOrigin).protocol === 'https:';
  const websocketOrigin = config.appOrigin.replace(/^http/, 'ws');
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'", websocketOrigin],
        imgSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(https ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    // No usar `no-referrer` (el valor por defecto de helmet): con esa política el navegador envía
    // `Origin: null` en los formularios del propio sitio y originGuard los rechazaría (comprobado en Chrome).
    // `same-origin` mantiene el Referer fuera de otros sitios y deja el `Origin` real.
    referrerPolicy: { policy: 'same-origin' },
    strictTransportSecurity: https,
  });
}

/**
 * Monta Express con el contenedor ya compuesto (C-HTTP). Orden: cabeceras de seguridad →
 * estáticos → origen → cuerpos (16 kB) → sesión → datos de página → CSRF → `/panel` y `/api` con sesión y `no-store`
 * → routers de módulos → 404 → manejador de errores. El gateway Socket.IO se adjunta
 * al `http.Server` en `server.js`, en el mismo puerto.
 */
export function createApp(container) {
  const { config } = container;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('appOrigin', config.appOrigin);
  app.set('views', join(ROOT, 'src/web/views'));
  app.set('view engine', 'ejs');
  app.set('view cache', config.appEnv === 'production');
  app.engine('ejs', ejs.__express);

  app.use(securityHeaders(config));

  app.get('/salud', (_req, res) => res.json({ status: 'ok' }));
  app.get('/favicon.ico', (_req, res) => res.status(204).end());

  // El navegador descarga el MISMO validate.js que importa el servidor (C-VAL, DM-08).
  app.use('/js/shared', express.static(join(ROOT, 'src/shared/validation'), { index: false }));
  app.use('/js', express.static(join(ROOT, 'public/js'), { index: false }));
  app.use('/css', express.static(join(ROOT, 'public/css'), { index: false }));

  app.use(renderPage);
  app.use(originGuard(config.appOrigin));
  app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(attachPrincipal(
    (token, now) => container.accounts.resolveSession(token, now),
    { cookieName: sessionCookieName(config), clock: container.clock },
  ));
  // `pageLocals` va antes de `csrf`: si el token falla, la página 403 ya conoce la sesión y muestra el menú y el regreso correctos.
  app.use(pageLocals);
  app.use(csrf(config.csrfSecret));

  app.use(['/panel', '/api'], noStore, requireAuth);

  app.use(createPanelRouter(container));
  app.use(createAccountsRouter(container));
  app.use(createOffersRouter(container));
  app.use(createChatRouter(container));
  if (config.appEnv !== 'production') app.use(createDesignRouter(container));

  app.use(notFoundHandler);
  app.use(errorHandler({ logger: container.logger }));
  return app;
}
