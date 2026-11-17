import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { privateListSql } from '../../src/modules/offers/data/offers.repo.js';
import { PAGE_SIZE } from '../../src/modules/offers/domain/pagination.js';
import { createTestContext } from '../helpers/context.js';
import { createUser } from '../helpers/factories.js';
import { fixedClock } from '../../src/shared/clock.js';
import { toEcuadorLocalDateTime } from '../../src/shared/time.js';

const START = Date.UTC(2026, 10, 17, 12);
const DAY = 86_400_000;
function setup(t) {
  const ctx = createTestContext({ clock: fixedClock(START) });
  t.after(() => ctx.close());
  const first = createUser(ctx, { email: 'uno@example.test', displayName: 'Uno' });
  const second = createUser(ctx, { email: 'dos@example.test', displayName: 'Dos' });
  return { ctx, offers: ctx.container.offers, a: { userId: first.id }, b: { userId: second.id } };
}
function input(ctx, days = 1, changes = {}) {
  return { title: 'Ruta Andina', description: 'Experiencia comunitaria de prueba.',
    province: 'PICHINCHA', locationText: 'Centro comunitario',
    startsAt: toEcuadorLocalDateTime(ctx.clock.now() + days * DAY), capacity: 12, ...changes };
}
function error(code, field) {
  return (e) => e.code === code && (!field || e.fieldErrors?.[field]?.length > 0);
}
const photo = (bytes = [1, 2, 3]) => ({ contentType: 'image/png',
  altText: 'Paisaje de la comunidad', imageBytes: Buffer.from(bytes) });

test('TM-OFE-01: crear persiste los seis atributos y devuelve DTO privado', (t) => {
  const { ctx, offers, a } = setup(t);
  const data = input(ctx);
  const made = offers.createOffer(a, data);
  assert.ok(made.id > 0);
  assert.equal(made.title, data.title);
  assert.equal(made.description, data.description);
  assert.equal(made.province, data.province);
  assert.equal(made.locationText, data.locationText);
  assert.equal(made.startsAtLocal, data.startsAt);
  assert.equal(made.capacity, data.capacity);
  assert.equal(made.isPublished, false);
  assert.equal(made.hasPhoto, false);
  assert.deepEqual(offers.getOffer(a, made.id), made);
});

test('TM-OFE-02: entrada inválida y fecha pasada no insertan', (t) => {
  const { ctx, offers, a } = setup(t);
  for (const changes of [{ title: 'x' }, { description: 'x' }, { province: 5 },
    { locationText: 'x' }, { startsAt: 'hoy' }, { capacity: '1.5' },
    { startsAt: toEcuadorLocalDateTime(START - DAY) }]) {
    const field = Object.keys(changes)[0];
    assert.throws(() => offers.createOffer(a, input(ctx, 1, changes)), error('VALIDATION_ERROR', field));
  }
  assert.equal(offers.listOffers(a).total, 0);
});

test('TM-OFE-03/04/07: filtro, propiedad, páginas y parámetros literales', (t) => {
  const { ctx, offers, a, b } = setup(t);
  const ids = [];
  for (let i = 0; i < 25; i += 1) {
    ids.push(offers.createOffer(a, input(ctx, 2, { title: `Ruta ${String(i).padStart(2, '0')}` })).id);
  }
  offers.createOffer(a, input(ctx, 1, { province: 'AZUAY', title: "O'Brian ruta" }));
  offers.createOffer(b, input(ctx, 1));
  const pages = [1, 2, 3].map((pagina) => offers.listOffers(a, { provincia: 'PICHINCHA', pagina }));
  assert.deepEqual(pages.map((p) => p.items.length), [10, 10, 5]);
  assert.deepEqual(pages.flatMap((p) => p.items.map((x) => x.id)), ids);
  assert.equal(pages[0].total, 25);
  assert.equal(offers.listOffers(a, { provincia: 'PICHINCHA', pagina: '999' }).page, 3);
  assert.equal(offers.listOffers(a, { provincia: "' OR 1=1 --" }).total, 26);
  assert.equal(offers.listOffers(a, { provincia: 'AZUAY' }).items[0].title, "O'Brian ruta");
});

test('TM-OFE-05/06: propiedad uniforme y confirmación para eliminar', (t) => {
  const { ctx, offers, a, b } = setup(t);
  const made = offers.createOffer(a, input(ctx));
  assert.throws(() => offers.getOffer(b, made.id), error('NOT_FOUND'));
  assert.throws(() => offers.updateOffer(b, made.id, input(ctx, 2)), error('NOT_FOUND'));
  assert.throws(() => offers.deleteOffer(b, made.id, { confirm: true }), error('NOT_FOUND'));
  assert.throws(() => offers.deleteOffer(a, made.id), error('VALIDATION_ERROR', 'confirm'));
  assert.equal(offers.getOffer(a, made.id).title, made.title);
  assert.equal(offers.deleteOffer(a, made.id, { confirm: true }), true);
  assert.throws(() => offers.getOffer(a, made.id), error('NOT_FOUND'));
});

test('TM-OFE-08: la consulta filtrada usa el índice de propietario y provincia', (t) => {
  const { ctx, offers, a } = setup(t);
  offers.createOffer(a, input(ctx));
  const plan = ctx.db.prepare(`EXPLAIN QUERY PLAN ${privateListSql(true)}`)
    .all(a.userId, 'PICHINCHA', PAGE_SIZE, 0);
  const detail = plan.map((row) => row.detail).join(' | ');
  assert.match(detail, /idx_offers_owner_province_starts/);
  assert.doesNotMatch(detail, /USE TEMP B-TREE/);
});

test('TM-OFE-08a: foto, publicación, vencimiento y cascada', (t) => {
  const { ctx, offers, a, b } = setup(t);
  const made = offers.createOffer(a, input(ctx));
  assert.equal(offers.listPublicOffers().total, 0);
  assert.throws(() => offers.updateOffer(a, made.id, { ...input(ctx), isPublished: true }),
    error('VALIDATION_ERROR', 'isPublished'));
  assert.throws(() => offers.setOfferPhoto(b, made.id, photo()), error('NOT_FOUND'));
  assert.equal(offers.setOfferPhoto(a, made.id, photo()).hasPhoto, true);
  offers.updateOffer(a, made.id, { ...input(ctx), isPublished: true });
  assert.equal(offers.listPublicOffers().total, 1);
  assert.equal(Object.hasOwn(offers.getPublicOffer(made.id), 'ownerId'), false);
  assert.deepEqual([...offers.getPublicOfferPhoto(made.id).imageBytes], [1, 2, 3]);
  offers.setOfferPhoto(a, made.id, photo([4, 5]));
  assert.deepEqual([...offers.getOwnOfferPhoto(a, made.id).imageBytes], [4, 5]);
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM offer_photos').get().n, 1);
  offers.updateOffer(a, made.id, { ...input(ctx), isPublished: false });
  assert.throws(() => offers.getPublicOfferPhoto(made.id), error('NOT_FOUND'));
  offers.updateOffer(a, made.id, { ...input(ctx), isPublished: true });
  ctx.clock.advance(DAY);
  assert.equal(offers.listPublicOffers().total, 0);
  assert.throws(() => offers.getPublicOffer(made.id), error('NOT_FOUND'));
  offers.deleteOffer(a, made.id, { confirm: true });
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM offer_photos').get().n, 0);
});
