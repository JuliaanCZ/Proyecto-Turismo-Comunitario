import { createOffersService as createService } from './service/offers.service.js';
export { PROVINCES, provinceLabel } from './domain/provinces.js';
export { offerSchema } from './domain/schemas.js';
export function createOffersService(deps) { return createService(deps); }
