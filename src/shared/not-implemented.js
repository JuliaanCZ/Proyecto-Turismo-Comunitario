import { AppError } from './errors.js';

/**
 * Esqueleto de un módulo (B0.4): devuelve un servicio cuyas funciones públicas (C-MOD, §5.1)
 * lanzan `NOT_IMPLEMENTED`. Así el contenedor arma y `npm start` arranca sin que ningún
 * módulo tenga lógica; el responsable de cada módulo reemplaza su `index.js`.
 */
export function notImplementedService(moduleName, functionNames) {
  const service = {};
  for (const name of functionNames) {
    service[name] = function notImplemented() {
      throw AppError.fromCatalog('NOT_IMPLEMENTED', `${moduleName}.${name} aún no está implementado.`);
    };
  }
  return service;
}
