import { Router } from 'express';
import { formatEcuadorDateTime } from '../shared/time.js';
import { validate } from '../shared/validation/validate.js';

// Datos de ejemplo (ficticios) para revisar la guía visual; no salen de la base.
const OFERTAS_EJEMPLO = [
  {
    nombre: 'Taller de cerámica y almuerzo con la comunidad',
    lugar: 'Salasaka, Tungurahua',
    inicio: Date.UTC(2026, 11, 15, 14, 30),
  },
  {
    nombre: 'Caminata por el bosque nublado y observación de aves',
    lugar: 'Mindo, Pichincha',
    inicio: Date.UTC(2027, 0, 9, 12, 0),
  },
];

const ESQUEMA_EJEMPLO = {
  nombre: { type: 'string', label: 'nombre', required: true, min: 2, max: 80 },
  correo: { type: 'email', label: 'correo', required: true },
  cupo: { type: 'int', label: 'cupo', required: true, min: 1, max: 1000 },
};

function pagina(res, extra = {}) {
  res.renderPage('dev/diseno', {
    title: 'Guía visual',
    ofertas: OFERTAS_EJEMPLO,
    esquema: ESQUEMA_EJEMPLO,
    formatDate: formatEcuadorDateTime,
    valores: {},
    errores: {},
    exito: false,
    ...extra,
  });
}

/**
 * Vista de ejemplo de la guía visual (B0.4): `/dev/diseno`. Solo se monta fuera de producción.
 * Sirve para revisar contraste, foco, lectura en móvil y el formulario con `data-schema`.
 * El POST valida en servidor con el mismo `validate` que corre en el navegador, de modo que
 * también se puede probar con JavaScript desactivado (C-VAL).
 */
export function createDesignRouter() {
  const router = Router();
  router.get('/dev/diseno', (_req, res) => pagina(res));
  router.post('/dev/diseno', (req, res) => {
    const resultado = validate(ESQUEMA_EJEMPLO, req.body);
    if (!resultado.ok) {
      res.status(422);
      return pagina(res, { valores: req.body ?? {}, errores: resultado.errors });
    }
    return pagina(res, { exito: true });
  });
  return router;
}
