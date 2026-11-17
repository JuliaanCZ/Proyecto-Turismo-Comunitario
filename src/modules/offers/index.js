import { notImplementedService } from '../../shared/not-implemented.js';

/**
 * Esqueleto del módulo `offers` (B0.4). Lo reemplazan B1.4 y B1.5 (Integrante 2).
 * Firmas de C-MOD (§5.1). `PROVINCES` y `offerSchema` (constantes) los añade B1.4.
 * `deps` = { db, clock, config, logger }.
 */
const FUNCTIONS = [
  'createOffer',
  'listOffers',
  'getOffer',
  'updateOffer',
  'deleteOffer',
  'setOfferPhoto',
  'getOwnOfferPhoto',
  'listPublicOffers',
  'getPublicOffer',
  'getPublicOfferPhoto',
];

export function createOffersService(deps) {
  void deps;
  return notImplementedService('offers', FUNCTIONS);
}
