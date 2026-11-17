import { AppError } from '../../../shared/errors.js';
import { parseEcuadorLocalDateTime, toEcuadorLocalDateTime } from '../../../shared/time.js';
import { validate } from '../../../shared/validation/validate.js';
import { PAGE_SIZE, normalizePage } from '../domain/pagination.js';
import { isProvince, provinceLabel } from '../domain/provinces.js';
import { offerSchema } from '../domain/schemas.js';
import { createOffersRepo } from '../data/offers.repo.js';

function failValidation(fieldErrors, message = 'Revisa los campos indicados.') {
  throw AppError.fromCatalog('VALIDATION_ERROR', message, { fieldErrors });
}
function notFound() { throw AppError.fromCatalog('NOT_FOUND', 'Oferta no encontrada.'); }
function ownerId(principal) {
  if (!Number.isSafeInteger(principal?.userId) || principal.userId < 1) {
    throw AppError.fromCatalog('UNAUTHENTICATED', 'Inicia sesión para continuar.');
  }
  return principal.userId;
}
function offerId(raw) {
  const id = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return id;
}
function dto(row) {
  return {
    id: row.id, title: row.title, description: row.description,
    province: row.province, provinceLabel: provinceLabel(row.province),
    locationText: row.location_text, startsAt: row.starts_at,
    startsAtLocal: toEcuadorLocalDateTime(row.starts_at), capacity: row.capacity,
    isPublished: Boolean(row.is_published), hasPhoto: Boolean(row.has_photo),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function parseInput(input, now, previous) {
  const result = validate(offerSchema, input);
  if (!result.ok) failValidation(result.errors);
  const values = result.values;
  const startsAt = parseEcuadorLocalDateTime(values.startsAt);
  if ((!previous || startsAt !== previous.starts_at) && startsAt <= now) {
    failValidation({ startsAt: ['La fecha y hora debe ser futura.'] });
  }
  return { ...values, startsAt };
}
function publishedValue(input, previous) {
  if (!Object.hasOwn(input, 'isPublished')) return Boolean(previous);
  if (input.isPublished === true || input.isPublished === 1 || input.isPublished === 'true') return true;
  if (input.isPublished === false || input.isPublished === 0 || input.isPublished === 'false') return false;
  failValidation({ isPublished: ['La publicación debe ser verdadera o falsa.'] });
}
function assertPublishable(row, now) {
  if (!row.has_photo) failValidation({ isPublished: ['Añade una foto antes de publicar.'] });
  if (row.starts_at <= now) failValidation({ startsAt: ['La fecha y hora debe ser futura.'] });
}
function normalizePhoto(photo) {
  const contentType = photo?.contentType;
  const imageBytes = photo?.imageBytes;
  const alt = validate({ altText: {
    type: 'string', label: 'texto alternativo', required: true, min: 1, max: 160,
  } }, { altText: photo?.altText });
  const errors = { ...alt.errors };
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    errors.contentType = ['La imagen debe ser JPEG, PNG o WebP.'];
  }
  if (!(imageBytes instanceof Uint8Array) || imageBytes.byteLength < 1 || imageBytes.byteLength > 2 * 1024 * 1024) {
    errors.imageBytes = ['La imagen debe medir entre 1 byte y 2 MiB.'];
  }
  if (Object.keys(errors).length) failValidation(errors);
  return { contentType, altText: alt.values.altText, imageBytes };
}
function photoDto(row) {
  return { contentType: row.content_type, altText: row.alt_text, imageBytes: row.image_bytes };
}

export function createOffersService({ db, clock }) {
  const repo = createOffersRepo(db);
  function ownRow(principal, id) {
    const row = repo.own(offerId(id), ownerId(principal));
    if (!row) notFound();
    return row;
  }
  return {
    createOffer(principal, input) {
      const owner = ownerId(principal);
      const now = clock.now();
      const values = parseInput(input, now);
      const id = repo.create(owner, values, now);
      return dto(repo.own(id, owner));
    },
    listOffers(principal, { provincia, pagina } = {}) {
      const owner = ownerId(principal);
      const province = isProvince(provincia) ? provincia : null;
      const total = repo.privateCount(owner, province);
      const page = normalizePage(pagina, total);
      const { items } = repo.privateList(owner, province, page);
      return { items: items.map(dto), page, pageSize: PAGE_SIZE, total,
        totalPages: Math.ceil(total / PAGE_SIZE), provincia: province };
    },
    getOffer(principal, id) { return dto(ownRow(principal, id)); },
    updateOffer(principal, id, input) {
      const owner = ownerId(principal);
      const key = offerId(id);
      return repo.transaction(() => {
        const previous = repo.own(key, owner);
        if (!previous) notFound();
        const now = clock.now();
        const values = parseInput(input, now, previous);
        const isPublished = publishedValue(input, previous.is_published);
        if (isPublished) assertPublishable({ ...previous, starts_at: values.startsAt }, now);
        repo.update(key, owner, values, isPublished, now);
        return dto(repo.own(key, owner));
      });
    },
    deleteOffer(principal, id, { confirm } = {}) {
      const owner = ownerId(principal);
      const key = offerId(id);
      if (!repo.own(key, owner)) notFound();
      if (confirm !== true) failValidation({ confirm: ['Confirma la eliminación.'] });
      repo.remove(key, owner);
      return true;
    },
    setOfferPhoto(principal, id, photo) {
      const owner = ownerId(principal);
      const key = offerId(id);
      return repo.transaction(() => {
        if (!repo.own(key, owner)) notFound();
        const normalized = normalizePhoto(photo);
        repo.setPhoto(key, normalized);
        return dto(repo.own(key, owner));
      });
    },
    getOwnOfferPhoto(principal, id) {
      const owner = ownerId(principal);
      const key = offerId(id);
      if (!repo.own(key, owner)) notFound();
      const row = repo.ownPhoto(key, owner);
      if (!row) notFound();
      return photoDto(row);
    },
    listPublicOffers({ pagina } = {}) {
      const now = clock.now();
      const total = repo.publicCount(now);
      const page = normalizePage(pagina, total);
      return { items: repo.publicList(now, page).map(dto), page,
        pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) };
    },
    getPublicOffer(id) {
      const row = repo.publicOffer(offerId(id), clock.now());
      if (!row) notFound();
      return dto(row);
    },
    getPublicOfferPhoto(id) {
      const row = repo.publicPhoto(offerId(id), clock.now());
      if (!row) notFound();
      return photoDto(row);
    },
  };
}
