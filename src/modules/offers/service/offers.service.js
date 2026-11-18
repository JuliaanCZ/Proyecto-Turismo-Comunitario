import { AppError } from '../../../shared/errors.js';
import { parseEcuadorLocalDateTime, toEcuadorLocalDateTime } from '../../../shared/time.js';
import { validate } from '../../../shared/validation/validate.js';
import { PAGE_SIZE, normalizePage } from '../domain/pagination.js';
import { isProvince, provinceLabel } from '../domain/provinces.js';
import { catalogFilters, regionFor } from '../domain/regions.js';
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
function photoPosition(raw) {
  const position = Number(raw);
  if (!Number.isInteger(position) || position < 1 || position > 5) notFound();
  return position;
}
function dto(row) {
  return {
    id: row.id, title: row.title, description: row.description,
    organizerName: row.organizer_name, contactPhone: row.contact_phone, contactEmail: row.contact_email,
    province: row.province, provinceLabel: provinceLabel(row.province),
    locationText: row.location_text, startsAt: row.starts_at, region: regionFor(row.province),
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
  const phone = values.contactPhone?.replace(/[ ()-]/g, '');
  const contactPhone = /^09\d{8}$/.test(phone) ? '+593' + phone.slice(1) : phone;
  if (phone && !/^\+[1-9]\d{7,14}$/.test(contactPhone)) {
    failValidation({ contactPhone: ['Usa un móvil ecuatoriano o incluye el prefijo internacional.'] });
  }
  return { ...values, startsAt, contactPhone: contactPhone ?? null, contactEmail: values.contactEmail ?? null };
}
function publishedValue(input, previous) {
  if (!Object.hasOwn(input, 'isPublished')) return Boolean(previous);
  if (input.isPublished === true || input.isPublished === 1 || input.isPublished === 'true') return true;
  if (input.isPublished === false || input.isPublished === 0 || input.isPublished === 'false') return false;
  failValidation({ isPublished: ['La publicación debe ser verdadera o falsa.'] });
}
function assertPublishable(row, now) {
  const errors = {};
  if (!row.contact_phone) errors.contactPhone = ['Indica el teléfono de contacto.'];
  if (!row.contact_email) errors.contactEmail = ['Indica el correo de contacto.'];
  if (Object.keys(errors).length) failValidation(errors);
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
  if (!(imageBytes instanceof Uint8Array) || imageBytes.byteLength < 1 || imageBytes.byteLength > 50_000_000) {
    errors.imageBytes = ['La imagen debe medir entre 1 byte y 50 MB.'];
  }
  if (Object.keys(errors).length) failValidation(errors);
  return { contentType, altText: alt.values.altText, imageBytes };
}
function photoDto(row, imageBytes) {
  return { contentType: row.content_type, altText: row.alt_text, imageBytes };
}

export function createOffersService({ db, clock, storage, logger }) {
  const repo = createOffersRepo(db);
  async function ownRow(principal, id) {
    const row = await repo.own(offerId(id), ownerId(principal));
    if (!row) notFound();
    return row;
  }
  async function removeOldPhoto(path) {
    if (!path) return;
    try { await storage.remove(path); }
    catch (error) { logger?.error?.('No se pudo limpiar una foto antigua:', error); }
  }
  return {
    async gallery(principal, id) {
      const row = await ownRow(principal, id);
      return (await repo.photos(row.id)).map(({ position, alt_text }) => ({ position, altText: alt_text }));
    },
    async publicGallery(id) {
      const row = await repo.publicOffer(offerId(id), clock.now());
      if (!row) notFound();
      return (await repo.photos(row.id)).map(({ position, alt_text }) => ({ position, altText: alt_text }));
    },
    async saveGalleryOffer(principal, id, input, { keep, additions }) {
      const owner = ownerId(principal);
      const uploaded = [];
      const removed = [];
      try {
        const result = await repo.transaction(async () => {
          const now = clock.now();
          if (id && !await repo.lock(id, owner)) notFound();
          const previous = id ? await repo.own(id, owner) : null;
          const values = parseInput(input, now, previous);
          if (previous && Number(input.revision) !== previous.updated_at) {
            failValidation({ photos: ['La oferta cambió. Recarga la página antes de editarla.'] });
          }
          const existing = id ? await repo.photos(id) : [];
          const retained = existing.filter((photo) => keep.includes(Number(photo.position)));
          if (retained.length !== keep.length || retained.length + additions.length > 5) {
            failValidation({ photos: ['Selecciona hasta cinco fotos de la oferta.'] });
          }
          const published = publishedValue(input, previous?.is_published);
          if (published) assertPublishable({ contact_phone: values.contactPhone, contact_email: values.contactEmail,
            has_photo: retained.length + additions.length > 0, starts_at: values.startsAt }, now);
          const key = id ?? await repo.create(owner, values, now);
          const photos = retained.map((photo) => ({ storagePath: photo.storage_path, contentType: photo.content_type,
            altText: photo.alt_text, sizeBytes: photo.size_bytes }));
          for (const readPhoto of additions) {
            const photo = normalizePhoto(await readPhoto());
            const storagePath = await storage.upload(key, photo);
            uploaded.push(storagePath);
            photos.push({ storagePath, contentType: photo.contentType, altText: photo.altText,
              sizeBytes: photo.imageBytes.byteLength });
          }
          await repo.clearPhotos(key);
          for (const [index, photo] of photos.entries()) await repo.setPhoto(key, photo, index + 1);
          await repo.update(key, owner, values, published, Math.max(now, (previous?.updated_at ?? 0) + 1));
          removed.push(...existing.filter((photo) => !retained.includes(photo)).map((photo) => photo.storage_path));
          return dto(await repo.own(key, owner));
        });
        for (const path of removed) await removeOldPhoto(path);
        return result;
      } catch (error) {
        for (const path of uploaded) await removeOldPhoto(path);
        throw error;
      }
    },
    async createOffer(principal, input) {
      const owner = ownerId(principal);
      const now = clock.now();
      const values = parseInput(input, now);
      const id = await repo.create(owner, values, now);
      return dto(await repo.own(id, owner));
    },
    async listOffers(principal, { provincia, pagina } = {}) {
      const owner = ownerId(principal);
      const province = isProvince(provincia) ? provincia : null;
      const total = await repo.privateCount(owner, province);
      const page = normalizePage(pagina, total);
      const items = await repo.privateList(owner, province, page);
      return { items: items.map(dto), page, pageSize: PAGE_SIZE, total,
        totalPages: Math.ceil(total / PAGE_SIZE), provincia: province };
    },
    async getOffer(principal, id) { return dto(await ownRow(principal, id)); },
    async updateOffer(principal, id, input) {
      const owner = ownerId(principal);
      const key = offerId(id);
      return repo.transaction(async () => {
        if (!await repo.lock(key, owner)) notFound();
        const previous = await repo.own(key, owner);
        if (!previous) notFound();
        const now = clock.now();
        const values = parseInput({ contactPhone: previous.contact_phone, contactEmail: previous.contact_email, ...input }, now, previous);
        const isPublished = publishedValue(input, previous.is_published);
        if (isPublished) assertPublishable({ ...previous, starts_at: values.startsAt, contact_phone: values.contactPhone, contact_email: values.contactEmail }, now);
        await repo.update(key, owner, values, isPublished, Math.max(now, previous.updated_at + 1));
        return dto(await repo.own(key, owner));
      });
    },
    async deleteOffer(principal, id, { confirm } = {}) {
      const owner = ownerId(principal);
      const key = offerId(id);
      if (!await repo.own(key, owner)) notFound();
      if (confirm !== true) failValidation({ confirm: ['Confirma la eliminación.'] });
      const photos = await repo.transaction(async () => {
        if (!await repo.lock(key, owner)) notFound();
        const gallery = await repo.photos(key);
        await repo.remove(key, owner);
        return gallery;
      });
      for (const photo of photos) await removeOldPhoto(photo.storage_path);
      return true;
    },
    async setOfferPhoto(principal, id, photo) {
      const owner = ownerId(principal);
      const key = offerId(id);
      if (!await repo.own(key, owner)) notFound();
      const normalized = normalizePhoto(photo);
      const storagePath = await storage.upload(key, normalized);
      let previousPath;
      let result;
      try {
        result = await repo.transaction(async () => {
          if (!await repo.lock(key, owner)) notFound();
          previousPath = (await repo.ownPhoto(key, owner))?.storage_path;
          await repo.setPhoto(key, { storagePath, contentType: normalized.contentType,
            altText: normalized.altText, sizeBytes: normalized.imageBytes.byteLength });
          return dto(await repo.own(key, owner));
        });
      } catch (error) {
        await removeOldPhoto(storagePath);
        throw error;
      }
      await removeOldPhoto(previousPath);
      return result;
    },
    async getOwnOfferPhotoMetadata(principal, id, position = 1) {
      const owner = ownerId(principal);
      const key = offerId(id);
      if (!await repo.own(key, owner)) notFound();
      const row = await repo.ownPhoto(key, owner, photoPosition(position));
      if (!row) notFound();
      return row;
    },
    async getOwnOfferPhoto(principal, id, position = 1) {
      const row = await this.getOwnOfferPhotoMetadata(principal, id, position);
      return photoDto(row, await storage.download(row.storage_path));
    },
    async nextOwnOffer(principal) {
      const row = await repo.nextOwn(ownerId(principal), clock.now());
      return row ? dto(row) : null;
    },
    async listPublicOffers(query = {}) {
      const filters = catalogFilters(query);
      const { pagina } = query;
      const now = clock.now();
      const total = await repo.publicCount(now, filters);
      const page = normalizePage(pagina, total);
      return { items: (await repo.publicList(now, page, filters)).map(dto), page,
        pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE), filters };
    },
    async getPublicOffer(id) {
      const row = await repo.publicOffer(offerId(id), clock.now());
      if (!row) notFound();
      return dto(row);
    },
    async getPublicOfferPhotoMetadata(id, position = 1) {
      const row = await repo.publicPhoto(offerId(id), clock.now(), photoPosition(position));
      if (!row) notFound();
      return row;
    },
    async getPublicOfferPhoto(id, position = 1) {
      const row = await this.getPublicOfferPhotoMetadata(id, position);
      return photoDto(row, await storage.download(row.storage_path));
    },
  };
}
