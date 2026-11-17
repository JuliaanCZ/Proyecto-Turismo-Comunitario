import { Router } from 'express';

/**
 * Router de portada y panel. B0.4 solo deja la portada provisional (`views/panel/portada.ejs`);
 * B1.9 (Integrante 4) la reemplaza y añade /panel sin tocar el resto de la plantilla.
 */
export function createPanelRouter() {
  const router = Router();
  router.get('/', (_req, res) => {
    res.renderPage('panel/portada', { title: 'Inicio' });
  });
  return router;
}
