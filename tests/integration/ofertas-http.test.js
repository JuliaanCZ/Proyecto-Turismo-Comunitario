import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';
import request from 'supertest';
import sharp from 'sharp';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { fixedClock } from '../../src/shared/clock.js';
import { createCsrfToken } from '../../src/shared/http/csrf.js';
import { toEcuadorLocalDateTime } from '../../src/shared/time.js';
import { createSessionFor, fakeAccounts } from '../helpers/auth.js';
import { createTestContext } from '../helpers/context.js';
import { createUser } from '../helpers/factories.js';

const ORIGIN = 'http://localhost:3000';
const NOW = Date.UTC(2026, 10, 17, 12);
function setup(t) {
  const sessions = new Map();
  const ctx = createTestContext({ clock: fixedClock(NOW), overrides: { accounts: fakeAccounts(sessions) } });
  t.after(() => ctx.close());
  function signIn(name, email) {
    const user = createUser(ctx, { displayName: name, email });
    const session = createSessionFor(ctx, user.id);
    const principal = { userId: user.id, sessionId: session.sessionId,
      displayName: name, sessionExpiresAt: NOW + 8 * 3_600_000 };
    sessions.set(session.token, principal);
    return { user, principal, cookie: session.cookie,
      csrf: createCsrfToken(ctx.container.config.csrfSecret, session.sessionId) };
  }
  const a = signIn('Ana', 'ana@test.local');
  const b = signIn('Beto', 'beto@test.local');
  return { ctx, app: ctx.app, a, b };
}
function input(days = 1, other = {}) {
  return { title: 'Ruta Andina', description: 'Experiencia comunitaria de prueba.',
    province: 'PICHINCHA', locationText: 'Centro comunitario',
    startsAt: toEcuadorLocalDateTime(NOW + days * 86_400_000), capacity: '12', ...other };
}
function get(app, user, path) { return request(app).get(path).set('Cookie', user.cookie); }
function post(app, user, path, body) {
  return request(app).post(path).set('Cookie', user.cookie).set('Origin', ORIGIN)
    .set('x-csrf-token', user.csrf).type('form').send(body);
}
function upload(app, user, id, bytes, mime = 'image/png', alt = 'Paisaje de la comunidad') {
  return request(app).post('/panel/ofertas/' + id + '/foto').set('Cookie', user.cookie)
    .set('Origin', ORIGIN).set('x-csrf-token', user.csrf).set('Accept', 'application/json')
    .field('altText', alt).attach('foto', bytes, { filename: 'foto.png', contentType: mime });
}
async function png(color = '#ff0000') {
  return sharp({ create: { width: 30, height: 30, channels: 3, background: color } }).png().toBuffer();
}
function create(ctx, user, changes = {}) {
  return ctx.container.offers.createOffer(user.principal, input(1, changes));
}

test('TM-OFE-09 y 15: ciclo CRUD por HTTP y confirmación obligatoria', async (t) => {
  const { ctx, app, a } = setup(t);
  const made = await post(app, a, '/panel/ofertas', input());
  assert.equal(made.status, 302);
  const id = Number(/\/panel\/ofertas\/(\d+)/.exec(made.headers.location)?.[1]);
  assert.ok(id > 0);
  assert.match((await get(app, a, '/panel/ofertas')).text, /Ruta Andina/);
  assert.match((await get(app, a, '/panel/ofertas/' + id)).text, /Centro comunitario/);
  assert.equal((await get(app, a, '/panel/ofertas/' + id + '/editar')).status, 200);
  const edited = await post(app, a, '/panel/ofertas/' + id + '/editar', input(1, { title: 'Ruta renovada' }));
  assert.equal(edited.status, 302);
  assert.match((await get(app, a, '/panel/ofertas/' + id)).text, /Ruta renovada/);
  assert.match((await get(app, a, '/panel/ofertas/' + id + '/eliminar')).text, /Ruta renovada/);
  assert.equal((await post(app, a, '/panel/ofertas/' + id + '/eliminar', {})).status, 422);
  assert.equal(ctx.container.offers.getOffer(a.principal, id).title, 'Ruta renovada');
  assert.equal((await post(app, a, '/panel/ofertas/' + id + '/eliminar', { confirm: 'on' })).status, 302);
  assert.equal((await get(app, a, '/panel/ofertas/' + id)).status, 404);
});

test('TM-OFE-10: 422 conserva valores y muestra error junto al campo', async (t) => {
  const { app, a } = setup(t);
  const res = await post(app, a, '/panel/ofertas', input(1, { title: 'x' }));
  assert.equal(res.status, 422);
  assert.match(res.text, /value="x"/);
  assert.match(res.text, /data-error-for="title"[^>]*>[^<]*al menos 5/);
  assert.match(res.text, /Centro comunitario/);
});

test('TM-OFE-11 y 12: rutas privadas requieren sesión y ocultan ofertas ajenas', async (t) => {
  const { ctx, app, a, b } = setup(t);
  const offer = create(ctx, a);
  for (const path of ['/panel/ofertas', '/panel/ofertas/nueva', '/panel/ofertas/' + offer.id,
    '/panel/ofertas/' + offer.id + '/editar', '/panel/ofertas/' + offer.id + '/eliminar']) {
    assert.equal((await request(app).get(path)).status, 302);
  }
  for (const path of ['/panel/ofertas/' + offer.id, '/panel/ofertas/' + offer.id + '/editar',
    '/panel/ofertas/' + offer.id + '/eliminar', '/panel/ofertas/' + offer.id + '/foto']) {
    assert.equal((await get(app, b, path)).status, 404);
  }
  assert.equal((await post(app, b, '/panel/ofertas/' + offer.id + '/editar', input())).status, 404);
  assert.equal((await post(app, b, '/panel/ofertas/' + offer.id + '/eliminar', { confirm: 'on' })).status, 404);
  assert.equal((await get(app, a, '/panel/ofertas/no-entero')).status, 404);
  assert.equal((await request(app).get('/ofertas')).status, 200);
});

test('TM-OFE-13 y 14: salida escapada, 25 filtradas y paginación estable', async (t) => {
  const { ctx, app, a } = setup(t);
  for (let index = 0; index < 25; index += 1) create(ctx, a, { title: 'Ruta ' + index });
  const escaped = create(ctx, a, { title: '<script>alert(1)</script>' });
  const detail = await get(app, a, '/panel/ofertas/' + escaped.id);
  assert.match(detail.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(detail.text, /<script>alert\(1\)<\/script>/);
  const pages = [];
  for (let page = 1; page <= 3; page += 1) {
    const res = await get(app, a, '/panel/ofertas?provincia=PICHINCHA&pagina=' + page);
    assert.equal(res.status, 200);
    pages.push((res.text.match(/class="oferta"/g) ?? []).length);
    assert.match(res.text, /provincia=PICHINCHA/);
    assert.match(res.text, /aria-current="page"/);
  }
  assert.deepEqual(pages, [10, 10, 6]);
  assert.match((await get(app, a, '/panel/ofertas?pagina=3')).text, /&lt;script&gt;/);
});

test('TM-OFE-16: foto válida, reemplazo y rechazos conservan la anterior', async (t) => {
  const { ctx, app, a, b } = setup(t);
  const offer = create(ctx, a);
  const first = await png();
  const uploaded = await upload(app, a, offer.id, first);
  assert.equal(uploaded.status, 303, JSON.stringify(uploaded.body));
  const before = ctx.container.offers.getOwnOfferPhoto(a.principal, offer.id);
  assert.equal(before.contentType, 'image/png');
  assert.ok(before.imageBytes.length > 0);
  const second = await png('#00ff00');
  assert.equal((await upload(app, a, offer.id, second)).status, 303);
  const replaced = ctx.container.offers.getOwnOfferPhoto(a.principal, offer.id);
  assert.notDeepEqual(replaced.imageBytes, before.imageBytes);
  for (const [bytes, mime] of [[second, 'image/jpeg'], [Buffer.from('mala'), 'image/png'],
    [Buffer.alloc(2 * 1024 * 1024 + 1), 'image/png']]) {
    const res = await upload(app, a, offer.id, bytes, mime);
    assert.equal(res.status, 422);
    assert.deepEqual(ctx.container.offers.getOwnOfferPhoto(a.principal, offer.id).imageBytes, replaced.imageBytes);
  }
  const tooManyPixels = await sharp({ create: { width: 4000, height: 4000, channels: 3, background: '#000000' } }).png().toBuffer();
  assert.equal((await upload(app, a, offer.id, tooManyPixels)).status, 422);
  assert.deepEqual(ctx.container.offers.getOwnOfferPhoto(a.principal, offer.id).imageBytes, replaced.imageBytes);
  assert.equal((await upload(app, b, offer.id, first)).status, 404);
  const noCsrf = await request(app).post('/panel/ofertas/' + offer.id + '/foto')
    .set('Cookie', a.cookie).set('Origin', ORIGIN).attach('foto', first, 'foto.png');
  assert.equal(noCsrf.status, 403);
  const noSession = await request(app).post('/panel/ofertas/' + offer.id + '/foto')
    .set('Origin', ORIGIN).attach('foto', first, 'foto.png');
  assert.equal(noSession.status, 302);
});

test('TM-OFE-17: catálogo solo publicado, futuro y con foto; contacto configurado', async (t) => {
  const { ctx, app, a } = setup(t);
  const published = create(ctx, a);
  const draft = create(ctx, a, { title: 'Oferta borrador' });
  const expired = create(ctx, a, { title: 'Oferta vencida' });
  const bytes = await png();
  for (const offer of [published, draft, expired]) {
    ctx.container.offers.setOfferPhoto(a.principal, offer.id, {
      contentType: 'image/png', altText: 'Paisaje', imageBytes: bytes,
    });
  }
  ctx.container.offers.updateOffer(a.principal, published.id, { ...input(), isPublished: true });
  ctx.container.offers.updateOffer(a.principal, expired.id, { ...input(), isPublished: true });
  ctx.db.prepare('UPDATE offers SET starts_at = ? WHERE id = ?').run(NOW - 1000, expired.id);
  const list = await request(app).get('/ofertas');
  assert.match(list.text, /Ruta Andina/);
  assert.doesNotMatch(list.text, /Oferta borrador|Oferta vencida/);
  for (const id of [draft.id, expired.id]) {
    assert.equal((await request(app).get('/ofertas/' + id)).status, 404);
    assert.equal((await request(app).get('/ofertas/' + id + '/foto')).status, 404);
  }
  assert.equal((await request(app).get('/ofertas/' + published.id + '/foto')).status, 200);
  const publicDetail = await request(app).get('/ofertas/' + published.id);
  assert.equal(publicDetail.status, 200);
  assert.match(publicDetail.text, /Contacto por WhatsApp no disponible/);
  assert.match(publicDetail.text, /alt="Paisaje"/);
  const config = loadConfig({ APP_ENV: 'test', DATABASE_FILE: ':memory:',
    WHATSAPP_BOOKING_NUMBER: '593999999999' });
  const container = createContainer(config, { db: ctx.db, clock: ctx.clock, accounts: ctx.container.accounts });
  t.after(() => container.close());
  const withNumber = await request(createApp(container)).get('/ofertas/' + published.id);
  assert.equal(withNumber.status, 200);
  assert.match(withNumber.text, /https:\/\/wa\.me\/593999999999\?text=/);
  assert.doesNotMatch(withNumber.text, /ana@test.local/);
});
