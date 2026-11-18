import { Router } from 'express';
import { formatEcuadorDateTime } from '../shared/time.js';
import { REGIONS } from '../modules/offers/index.js';
import { AppError } from '../shared/errors.js';

/**
 * Resumen de ofertas propias para el panel (B1.9). Solo LEE: usa `offers.listOffers` con la
 * primera página y toma `total`; no modifica servicios ni guarda nada.
 *
 * Si el servicio todavía no está implementado (`NOT_IMPLEMENTED`, antes de B1.4 y B1.5) o falla,
 * el panel sigue abriendo y devuelve `{ available: false }`: la vista avisa que el resumen no está
 * disponible y NO muestra ninguna cifra. Un fallo distinto de `NOT_IMPLEMENTED` queda en el registro
 * del servidor sin datos del usuario.
 */
async function summarizeOwnOffers(container, principal) {
  try {
    const page = await container.offers.listOffers(principal, { pagina: 1 });
    const total = page?.total;
    if (Number.isSafeInteger(total) && total >= 0) return { available: true, total, next: await container.offers.nextOwnOffer?.(principal) };
    container.logger.error('El resumen del panel recibió un total de ofertas inválido.');
  } catch (error) {
    const expected = error instanceof AppError && error.code === 'NOT_IMPLEMENTED';
    if (!expected) container.logger.error('No se pudo obtener el resumen de ofertas del panel:', error);
  }
  return { available: false };
}

/**
 * Router de portada y panel (B1.9). `GET /` es pública; `GET /panel` ya llega con sesión porque
 * `createApp` monta `requireAuth` sobre `/panel` (sin sesión: 302 a `/ingreso?next=%2Fpanel`).
 * La navegación vive solo en `views/partials/header.ejs`.
 */
export function createPanelRouter(container) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const featured = container.offers.featured ? await container.offers.featured(REGIONS.slice(0, 3).map((region) => region.key)) : [];
    res.renderPage('portada', { title: 'Inicio', regions: REGIONS, featured, formatEcuadorDateTime });
  });

  router.get('/panel', async (req, res) => {
    const [resumen, history] = await Promise.all([
      summarizeOwnOffers(container, req.principal),
      container.chat?.getHistory?.({ limit: 1 }).catch(() => null),
    ]);
    res.renderPage('panel/inicio', { title: 'Mi panel', resumen, latest: history?.messages.at(-1), formatEcuadorDateTime });
  });

  return router;
}
