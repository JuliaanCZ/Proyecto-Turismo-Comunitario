import { URLSearchParams } from 'node:url';
import { Router } from 'express';
import { PROVINCES, offerSchema } from '../modules/offers/index.js';
import { AppError } from '../shared/errors.js';
import { formatEcuadorDateTime } from '../shared/time.js';
import { validatedOfferPhoto } from './offer-photo.js';

const AVISOS = Object.freeze({
  creada: 'La oferta fue creada como borrador.',
  actualizada: 'La oferta fue actualizada.',
  eliminada: 'La oferta fue eliminada.',
});
const FORM_FIELDS = [...Object.keys(offerSchema), 'isPublished'];

function valuesFrom(input = {}) {
  return Object.fromEntries(FORM_FIELDS.map((field) => [field, input[field] ?? '']));
}
function valuesFromOffer(offer) {
  return valuesFrom({ ...offer, startsAt: offer.startsAtLocal });
}
function formLocals({ offer = null, values = {}, errors = {}, message = '' } = {}) {
  return {
    title: offer ? 'Editar oferta' : 'Nueva oferta',
    offer, values, errors, message, offerSchema, provinces: PROVINCES,
  };
}
function renderForm(res, state, status = 200) {
  res.status(status).renderPage('offers/formulario', formLocals(state));
}
function pageLink(page, province) {
  const params = new URLSearchParams({ pagina: String(page) });
  if (province) params.set('provincia', province);
  return '/panel/ofertas?' + params;
}
function photoResponse(res, photo) {
  res.set('Content-Type', photo.contentType);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'no-store');
  res.send(photo.imageBytes);
}
function whatsappLink(config, offer) {
  if (!config.whatsappBookingNumber) return null;
  const message = 'Hola, quiero consultar una reserva para ' + offer.title +
    ' el ' + formatEcuadorDateTime(offer.startsAt) + '.';
  return 'https://wa.me/' + config.whatsappBookingNumber + '?text=' + encodeURIComponent(message);
}

export function createOffersRouter(container) {
  const router = Router();
  const { offers, config } = container;

  router.get('/panel/ofertas', (req, res) => {
    const result = offers.listOffers(req.principal, req.query);
    res.renderPage('offers/lista', {
      title: 'Mis ofertas', result, provinces: PROVINCES,
      aviso: (typeof req.query.aviso === 'string' && Object.hasOwn(AVISOS, req.query.aviso) ? AVISOS[req.query.aviso] : null), pageLink, formatEcuadorDateTime,
    });
  });
  router.get('/panel/ofertas/nueva', (_req, res) => renderForm(res));
  router.post('/panel/ofertas', (req, res, next) => {
    try {
      const offer = offers.createOffer(req.principal, req.body);
      res.redirect(302, '/panel/ofertas/' + offer.id + '?aviso=creada');
    } catch (error) {
      if (error instanceof AppError && error.status === 422) {
        renderForm(res, { values: valuesFrom(req.body), errors: error.fieldErrors, message: error.message }, 422);
      } else next(error);
    }
  });
  router.get('/panel/ofertas/:id/editar', (req, res) => {
    const offer = offers.getOffer(req.principal, req.params.id);
    renderForm(res, { offer, values: valuesFromOffer(offer) });
  });
  router.post('/panel/ofertas/:id/editar', (req, res, next) => {
    const offer = offers.getOffer(req.principal, req.params.id);
    try {
      offers.updateOffer(req.principal, offer.id, req.body);
      res.redirect(302, '/panel/ofertas/' + offer.id + '?aviso=actualizada');
    } catch (error) {
      if (error instanceof AppError && error.status === 422) {
        renderForm(res, { offer, values: valuesFrom(req.body),
          errors: error.fieldErrors, message: error.message }, 422);
      } else next(error);
    }
  });
  router.get('/panel/ofertas/:id/eliminar', (req, res) => {
    const offer = offers.getOffer(req.principal, req.params.id);
    res.renderPage('offers/eliminar', { title: 'Eliminar oferta', offer, errors: {} });
  });
  router.post('/panel/ofertas/:id/eliminar', (req, res, next) => {
    const offer = offers.getOffer(req.principal, req.params.id);
    try {
      offers.deleteOffer(req.principal, offer.id, { confirm: req.body?.confirm === 'on' });
      res.redirect(302, '/panel/ofertas?aviso=eliminada');
    } catch (error) {
      if (error instanceof AppError && error.status === 422) {
        res.status(422).renderPage('offers/eliminar', {
          title: 'Eliminar oferta', offer, errors: error.fieldErrors ?? {},
        });
      } else next(error);
    }
  });
  router.get('/panel/ofertas/:id/foto', (req, res) => {
    photoResponse(res, offers.getOwnOfferPhoto(req.principal, req.params.id));
  });
  router.post('/panel/ofertas/:id/foto', async (req, res, next) => {
    try {
      const offer = offers.getOffer(req.principal, req.params.id);
      const photo = await validatedOfferPhoto(req);
      offers.setOfferPhoto(req.principal, offer.id, photo);
      res.redirect(303, '/panel/ofertas/' + offer.id + '?aviso=actualizada');
    } catch (error) {
      if (error instanceof AppError && error.status === 422 && req.get('Accept') === 'application/json') {
        res.status(422).json({ error: { code: error.code, message: error.message,
          fieldErrors: error.fieldErrors } });
      } else next(error);
    }
  });
  router.get('/panel/ofertas/:id', (req, res) => {
    const offer = offers.getOffer(req.principal, req.params.id);
    res.renderPage('offers/detalle', {
      title: offer.title, offer, formatEcuadorDateTime,
      photoAltText: offer.hasPhoto ? offers.getOwnOfferPhoto(req.principal, offer.id).altText : null,
      aviso: (typeof req.query.aviso === 'string' && Object.hasOwn(AVISOS, req.query.aviso) ? AVISOS[req.query.aviso] : null),
    });
  });

  router.get('/ofertas', (req, res) => {
    const result = offers.listPublicOffers({ pagina: req.query.pagina });
    res.renderPage('offers/publica-lista', {
      title: 'Ofertas', result, formatEcuadorDateTime,
    });
  });
  router.get('/ofertas/:id/foto', (req, res) => {
    photoResponse(res, offers.getPublicOfferPhoto(req.params.id));
  });
  router.get('/ofertas/:id', (req, res) => {
    const offer = offers.getPublicOffer(req.params.id);
    res.renderPage('offers/publica-detalle', {
      title: offer.title, offer, formatEcuadorDateTime,
      whatsappUrl: whatsappLink(config, offer),
      photoAltText: offers.getPublicOfferPhoto(offer.id).altText,
    });
  });
  return router;
}
