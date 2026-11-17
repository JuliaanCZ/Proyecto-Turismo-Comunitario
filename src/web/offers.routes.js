import { Router } from 'express';

/**
 * Router de `offers` (B0.4: vacío y montado). B1.5 añade /ofertas, /panel/ofertas y las fotos,
 * y recibe `container` como argumento. `/panel` y `/api` ya exigen sesión desde `createApp`.
 */
export function createOffersRouter() {
  return Router();
}
