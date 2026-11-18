import { URLSearchParams } from 'node:url';
import { Router } from 'express';
import { PROVINCES, REGIONS, offerSchema } from '../modules/offers/index.js';
import { AppError } from '../shared/errors.js';
import { formatEcuadorDateTime } from '../shared/time.js';
import { withOfferGallery } from './offer-gallery.js';
import { validatedOfferPhoto } from './offer-photo.js';

const AVISOS = Object.freeze({
  creada: 'La oferta fue creada como borrador.',
  actualizada: 'La oferta fue actualizada.',
  eliminada: 'La oferta fue eliminada.',
});
const FORM_FIELDS = [...Object.keys(offerSchema), 'isPublished'];
const DEMO_CONTACT = Object.freeze({ phone: '+593 99 716 2041', email: 'juliancamacho897@gmail.com' });
const departureDate = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeZone: 'America/Guayaquil' });
const departureTime = new Intl.DateTimeFormat('es-EC', { timeStyle: 'short', hour12: true, timeZone: 'America/Guayaquil' });

function valuesFrom(input = {}) {
  return Object.fromEntries(FORM_FIELDS.map((field) => [field, input[field] ?? '']));
}
function valuesFromOffer(offer) {
  return valuesFrom({ ...offer, startsAt: offer.startsAtLocal });
}
function formLocals({ offer = null, gallery = [], values = {}, errors = {}, message = '' } = {}) {
  return {
    title: offer ? 'Editar oferta' : 'Nueva oferta',
    offer, gallery, values, errors, message, offerSchema, provinces: PROVINCES,
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
function publicContact(offer) {
  const { phone, email } = offer.contactEmail?.endsWith('@demo.test')
    ? DEMO_CONTACT
    : { phone: offer.contactPhone, email: offer.contactEmail };
  const message = 'Hola, quiero consultar una reserva para ' + offer.title +
    ' el ' + formatEcuadorDateTime(offer.startsAt) + '.';
  const whatsappUrl = phone
    ? 'https://wa.me/' + phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(message)
    : null;
  const gmailUrl = email ? 'https://mail.google.com/mail/?' + new URLSearchParams({
    view: 'cm', fs: '1', to: email, su: 'Consulta de reserva: ' + offer.title, body: message,
  }) : null;
  return { phone, email, whatsappUrl, gmailUrl };
}

export function createOffersRouter(container) {
  const router = Router();
  const { offers } = container;
  async function saveGallery(req, res, id) {
    const fields = Object.create(null);
    try {
      if (id) await offers.getOffer(req.principal, id);
      const offer = await withOfferGallery(req, fields,
        (gallery) => offers.saveGalleryOffer(req.principal, id, fields, gallery));
      res.json({ url: '/panel/ofertas/' + offer.id + '?aviso=actualizada' });
    } catch (error) {
      if (!(error instanceof AppError) || error.status !== 422) throw error;
      res.status(422).json({ error: { message: error.message, fieldErrors: error.fieldErrors } });
    }
  }

  router.get('/panel/ofertas', async (req, res) => {
    const result = await offers.listOffers(req.principal, req.query);
    res.renderPage('offers/lista', {
      title: 'Mis ofertas', result, provinces: PROVINCES,
      aviso: (typeof req.query.aviso === 'string' && Object.hasOwn(AVISOS, req.query.aviso) ? AVISOS[req.query.aviso] : null), pageLink, formatEcuadorDateTime,
    });
  });
  router.get('/panel/ofertas/nueva', (_req, res) => renderForm(res));
  router.post('/panel/ofertas', async (req, res, next) => {
    if (req.is('multipart/form-data')) return saveGallery(req, res, null);
    try {
      const offer = await offers.createOffer(req.principal, req.body);
      res.redirect(302, '/panel/ofertas/' + offer.id + '?aviso=creada');
    } catch (error) {
      if (error instanceof AppError && error.status === 422) {
        renderForm(res, { values: valuesFrom(req.body), errors: error.fieldErrors, message: error.message }, 422);
      } else next(error);
    }
  });
  router.get('/panel/ofertas/:id/editar', async (req, res) => {
    const offer = await offers.getOffer(req.principal, req.params.id);
    renderForm(res, { offer, gallery: await offers.gallery(req.principal, offer.id), values: valuesFromOffer(offer) });
  });
  router.post('/panel/ofertas/:id/editar', async (req, res, next) => {
    const offer = await offers.getOffer(req.principal, req.params.id);
    if (req.is('multipart/form-data')) return saveGallery(req, res, offer.id);
    try {
      await offers.updateOffer(req.principal, offer.id, req.body);
      res.redirect(302, '/panel/ofertas/' + offer.id + '?aviso=actualizada');
    } catch (error) {
      if (error instanceof AppError && error.status === 422) {
        renderForm(res, { offer, gallery: await offers.gallery(req.principal, offer.id), values: valuesFrom(req.body),
          errors: error.fieldErrors, message: error.message }, 422);
      } else next(error);
    }
  });
  router.get('/panel/ofertas/:id/eliminar', async (req, res) => {
    const offer = await offers.getOffer(req.principal, req.params.id);
    res.renderPage('offers/eliminar', { title: 'Eliminar oferta', offer, errors: {} });
  });
  router.post('/panel/ofertas/:id/eliminar', async (req, res, next) => {
    const offer = await offers.getOffer(req.principal, req.params.id);
    try {
      await offers.deleteOffer(req.principal, offer.id, { confirm: req.body?.confirm === 'on' });
      res.redirect(302, '/panel/ofertas?aviso=eliminada');
    } catch (error) {
      if (error instanceof AppError && error.status === 422) {
        res.status(422).renderPage('offers/eliminar', {
          title: 'Eliminar oferta', offer, errors: error.fieldErrors ?? {},
        });
      } else next(error);
    }
  });
  router.get(['/panel/ofertas/:id/foto', '/panel/ofertas/:id/foto/:position'], async (req, res) => {
    photoResponse(res, await offers.getOwnOfferPhoto(req.principal, req.params.id, req.params.position ?? 1));
  });
  router.post('/panel/ofertas/:id/foto', async (req, res, next) => {
    try {
      const offer = await offers.getOffer(req.principal, req.params.id);
      const photo = await validatedOfferPhoto(req);
      await offers.setOfferPhoto(req.principal, offer.id, photo);
      res.redirect(303, '/panel/ofertas/' + offer.id + '?aviso=actualizada');
    } catch (error) {
      if (error instanceof AppError && error.status === 422 && req.get('Accept') === 'application/json') {
        res.status(422).json({ error: { code: error.code, message: error.message,
          fieldErrors: error.fieldErrors } });
      } else next(error);
    }
  });
  router.get('/panel/ofertas/:id', async (req, res) => {
    const offer = await offers.getOffer(req.principal, req.params.id);
    res.renderPage('offers/detalle', {
      title: offer.title, offer, formatEcuadorDateTime,
      photoAltText: offer.hasPhoto ? (await offers.getOwnOfferPhotoMetadata(req.principal, offer.id)).alt_text : null,
      aviso: (typeof req.query.aviso === 'string' && Object.hasOwn(AVISOS, req.query.aviso) ? AVISOS[req.query.aviso] : null),
    });
  });

  router.get('/ofertas', async (req, res) => {
    const result = await offers.listPublicOffers(req.query);
    const { filters } = result;
    const query = new URLSearchParams();
    for (const field of ['provincia', 'q', 'desde', 'hasta', 'orden']) {
      if (filters[field]) query.set(field, filters[field]);
    }
    if (filters.cupo > 1) query.set('cupo', String(filters.cupo));
    if (filters.region) query.set('region', filters.region.key);
    const catalogPage = (page) => '/ofertas?' + new URLSearchParams([...query, ['pagina', String(page)]]);
    res.renderPage('offers/publica-lista', {
      title: 'Explorar', result, regions: REGIONS, catalogPage, formatEcuadorDateTime,
    });
  });
  router.get(['/ofertas/:id/foto', '/ofertas/:id/foto/:position'], async (req, res) => {
    photoResponse(res, await offers.getPublicOfferPhoto(req.params.id, req.params.position ?? 1));
  });
  router.get('/ofertas/:id', async (req, res) => {
    const offer = await offers.getPublicOffer(req.params.id);
    res.renderPage('offers/publica-detalle', {
      title: offer.title, offer,
      departureDate: departureDate.format(offer.startsAt),
      departureTime: departureTime.format(offer.startsAt),
      contact: publicContact(offer),
      gallery: await offers.publicGallery(offer.id),
    });
  });
  return router;
}
