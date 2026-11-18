import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import test from 'node:test';
import request from 'supertest';
import { io as connectSocket } from 'socket.io-client';
/* global AbortSignal */
import sharp from 'sharp';
import { seedDemo } from '../../scripts/seed-demo.js';
import { createHttpServer } from '../../src/server.js';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { createDemoBackend } from '../../scripts/demo-backend.js';
import { createCsrfToken } from '../../src/shared/http/csrf.js';
import { toEcuadorLocalDateTime } from '../../src/shared/time.js';

const PASSWORD = 'Clave-segura-99';
const ORIGIN = 'http://localhost:3000';

async function setup(t) {
  const { db, storage, files } = createDemoBackend();
  const config = loadConfig({ APP_ENV: 'test', APP_ORIGIN: ORIGIN,
    ARGON2_MEMORY_KIB: '8', ARGON2_TIME_COST: '1' });
  const container = await createContainer(config, { db, storage, skipMigrate: true });
  t.after(async () => { await db.close(); });
  return { container, db, files, app: createApp(container) };
}

async function register(container) {
  const { userId } = await container.accounts.registerUser({ displayName: 'Ana Test',
    email: 'ana@example.test', password: PASSWORD, passwordConfirm: PASSWORD });
  return { userId, displayName: 'Ana Test' };
}

test('Supabase: registro, ingreso, sesión y cierre protegen el panel', async (t) => {
  const { container, app } = await setup(t);
  await register(container);
  const login = await request(app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  assert.equal(login.status, 302);
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  assert.equal((await request(app).get('/panel').set('Cookie', cookie)).status, 200);
  const token = cookie.split('=')[1];
  const principal = await container.accounts.resolveSession(token);
  assert.equal(principal.displayName, 'Ana Test');
  await container.accounts.revokeSession(principal.sessionId, 'LOGOUT');
  assert.equal((await request(app).get('/panel').set('Cookie', cookie)).status, 302);
});

test('Supabase: CRUD, filtro y publicación con imagen del bucket', async (t) => {
  const { container, files } = await setup(t);
  const principal = await register(container);
  const startsAt = toEcuadorLocalDateTime(Date.now() + 7 * 86_400_000);
  const input = { title: 'Ruta comunitaria', description: 'Visita guiada por la comunidad local.',
    province: 'PICHINCHA', locationText: 'Comunidad de prueba', startsAt,
    capacity: 20, contactPhone: '0991234567', contactEmail: 'contacto@example.test' };
  const created = await container.offers.createOffer(principal, input);
  assert.equal(created.isPublished, false);
  assert.equal((await container.offers.listOffers(principal, { provincia: 'PICHINCHA' })).total, 1);
  const imageBytes = new Uint8Array([1, 2, 3]);
  const photo = await container.offers.setOfferPhoto(principal, created.id,
    { contentType: 'image/jpeg', altText: 'Paisaje', imageBytes });
  assert.equal(photo.hasPhoto, true);
  assert.equal(files.size, 1);
  await container.offers.updateOffer(principal, created.id, { ...input, isPublished: true });
  assert.equal((await container.offers.listPublicOffers()).total, 1);
  assert.deepEqual((await container.offers.getPublicOfferPhoto(created.id)).imageBytes, imageBytes);
  await container.offers.deleteOffer(principal, created.id, { confirm: true });
  assert.equal(files.size, 0);
});

test('Supabase: chat persistente y recuperación de contraseña', async (t) => {
  const { container } = await setup(t);
  const principal = await register(container);
  const id = 'ce4fb9a8-3dc3-4e4f-9125-2a5a0cc94711';
  const posted = await container.chat.postMessage(principal, { clientMessageId: id, text: 'Hola comunidad' });
  assert.equal(posted.duplicated, false);
  assert.equal((await container.chat.getHistory()).messages.length, 1);
  await container.accounts.requestPasswordReset('ana@example.test');
  const mailbox = await container.accounts.listMailbox();
  assert.equal(mailbox.length, 1);
  const token = new URL(mailbox[0].link).searchParams.get('token');
  await container.accounts.resetPassword({ token, newPassword: 'Clave-nueva-segura-77',
    newPasswordConfirm: 'Clave-nueva-segura-77' });
  assert.equal((await container.accounts.authenticate('ana@example.test', 'Clave-nueva-segura-77')).userId,
    principal.userId);
});

test('Supabase: la carga HTTP guarda la foto y la visibilidad pública se comprueba', async (t) => {
  const { container, app, files } = await setup(t);
  const principal = await register(container);
  const input = { title: 'Ruta con fotografía', description: 'Visita guiada por la comunidad local.',
    province: 'PICHINCHA', locationText: 'Comunidad de prueba',
    startsAt: toEcuadorLocalDateTime(Date.now() + 7 * 86_400_000), capacity: 20, contactPhone: '0991234567', contactEmail: 'contacto@example.test' };
  const offer = await container.offers.createOffer(principal, input);
  const login = await request(app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  const session = await container.accounts.resolveSession(cookie.split('=')[1]);
  const jpg = await sharp({ create: { width: 2, height: 2, channels: 3,
    background: '#112233' } }).jpeg().toBuffer();
  const upload = await request(app).post(`/panel/ofertas/${offer.id}/foto`)
    .set('Origin', ORIGIN).set('Cookie', cookie)
    .set('x-csrf-token', createCsrfToken(container.config.csrfSecret, session.sessionId))
    .field('altText', 'Paisaje local')
    .attach('foto', jpg, { filename: 'paisaje.jpg', contentType: 'image/jpeg' });
  assert.equal(upload.status, 303);
  assert.equal(files.size, 1);
  assert.equal((await request(app).get(`/panel/ofertas/${offer.id}/foto`)
    .set('Cookie', cookie)).status, 200);
  assert.equal((await request(app).get(`/ofertas/${offer.id}/foto`)).status, 404);
  await container.offers.updateOffer(principal, offer.id, { ...input, isPublished: true });
  assert.equal((await request(app).get(`/ofertas/${offer.id}/foto`)).status, 200);
});

test('Galería HTTP permite publicar, editar y conservar la versión anterior si una foto falla', async (t) => {
  const { container, app, files } = await setup(t);
  const principal = await register(container);
  const login = await request(app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  const session = await container.accounts.resolveSession(cookie.split('=')[1]);
  const token = createCsrfToken(container.config.csrfSecret, session.sessionId);
  const jpg = await sharp({ create: { width: 5, height: 5, channels: 3, background: '#fa912c' } }).jpeg().toBuffer();
  const fields = { title: 'Visita a la comunidad', description: 'Recorrido guiado por familias de la comunidad.',
    province: 'COTOPAXI', locationText: 'Camino de la laguna', startsAt: toEcuadorLocalDateTime(Date.now() + 86_400_000),
    capacity: '15', contactPhone: '099 123 4567', contactEmail: 'contacto@example.test', isPublished: 'true' };
  const submit = (path, changes = {}) => {
    const post = request(app).post(path).set('Origin', ORIGIN).set('Cookie', cookie).set('x-csrf-token', token);
    for (const [name, value] of Object.entries({ ...fields, ...changes })) post.field(name, value);
    return post;
  };
  const add = (post, position, bytes = jpg) => post.field('alt' + position, 'Paisaje ' + position)
    .attach('photo' + position, bytes, { filename: 'lugar.jpg', contentType: 'image/jpeg' });

  const missing = await submit('/panel/ofertas', { contactPhone: '' });
  assert.equal(missing.status, 422);
  assert.ok(missing.body.error.fieldErrors.contactPhone);
  let six = submit('/panel/ofertas');
  for (let i = 1; i <= 6; i++) six = add(six, i);
  assert.equal((await six).status, 422);

  const created = await add(add(submit('/panel/ofertas'), 1), 2);
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const { id, updatedAt } = (await container.offers.listOffers(principal)).items[0];
  const detail = '/ofertas/' + id;
  const edit = '/panel/ofertas/' + id + '/editar';
  assert.ok((await request(app).get(detail)).text.includes('wa.me/593991234567'));
  assert.equal((await request(app).get(detail + '/foto/2')).status, 200);
  assert.equal((await request(app).get('/ofertas?region=sierra&q=visita&cupo=15')).status, 200);
  assert.equal(files.size, 2);

  const failed = await add(add(submit(edit, { revision: String(updatedAt), keep1: 'on', title: 'Visita actualizada' }), 1), 2, Buffer.from('invalida'));
  assert.equal(failed.status, 422);
  assert.equal(files.size, 2);
  assert.equal((await container.offers.getPublicOffer(id)).title, fields.title);
  const saved = await submit(edit, { revision: String(updatedAt), keep2: 'on', title: 'Visita actualizada',
    contactPhone: '+1 202 555 0121', contactEmail: 'nuevo@example.test' });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const updated = await request(app).get(detail);
  assert.match(updated.text, /Visita actualizada/);
  assert.ok(updated.text.includes('wa.me/12025550121'));
  assert.match(updated.text, /nuevo@example\.test/);
  assert.equal((await request(app).get(detail + '/foto/2')).status, 404);
  assert.equal(files.size, 1);
});

test('La demo carga cuatro ofertas una sola vez y dos cuentas conversan en el chat', async (t) => {
  const { container, app } = await setup(t);
  const first = await seedDemo({ container, password: PASSWORD });
  const second = await seedDemo({ container, password: PASSWORD });
  assert.equal(first.offers.created, 4);
  assert.equal(second.offers.created, 0);
  assert.equal(second.offers.kept, 4);
  assert.equal(second.messages.created, 0);
  assert.equal((await container.offers.listPublicOffers()).total, 4);
  assert.deepEqual((await container.offers.featured(['sierra', 'costa', 'amazonia'])).map((offer) => offer.region.key),
    ['sierra', 'costa', 'amazonia']);

  const { httpServer, io } = createHttpServer(app, container);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => io.close(resolve)));

  async function connect(email) {
    const login = await request(app).post('/ingreso').set('Origin', ORIGIN).type('form').send({ email, password: PASSWORD });
    assert.equal(login.status, 302);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const url = 'http://127.0.0.1:' + httpServer.address().port;
    const socket = connectSocket(url, { transports: ['websocket'], reconnection: false, timeout: 1000,
      extraHeaders: { Origin: ORIGIN, Cookie: cookie } });
    await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
  }

  const ana = await connect('ana@demo.test');
  let luis;
  try {
    luis = await connect('luis@demo.test');
    assert.equal((await ana.timeout(1000).emitWithAck('chat:join')).ok, true);
    assert.equal((await luis.timeout(1000).emitWithAck('chat:join')).presence.count, 2);
    const message = once(luis, 'chat:message', { signal: AbortSignal.timeout(1000) });
    const ack = await ana.timeout(1000).emitWithAck('chat:send', { clientMessageId: randomUUID(), text: 'Confirmamos la caminata.' });
    assert.equal(ack.ok, true);
    assert.equal((await message)[0].text, 'Confirmamos la caminata.');
  } finally {
    ana.disconnect();
    luis?.disconnect();
  }
});

test('Producción desactiva la recuperación simulada y la bandeja de pruebas', async (t) => {
  const { container } = await setup(t);
  const config = loadConfig({ APP_ENV: 'production', APP_ORIGIN: 'https://example.test',
    CSRF_SECRET: 'una-clave-larga-para-esta-prueba-produccion',
    DEMO_MAILBOX_ENABLED: 'true', DEMO_MAILBOX_PASSWORD: 'ejemplo-bandeja-local',
    SEED_DEMO_PASSWORD: 'ejemplo-semilla-local' });
  const app = createApp({ ...container, config });

  const login = await request(app).get('/ingreso');
  assert.equal(login.status, 200);
  assert.doesNotMatch(login.text, /href="\/recuperar"|ejemplo-semilla-local/);
  for (const path of ['/recuperar', '/restablecer', '/dev/bandeja', '/dev/diseno']) {
    assert.equal((await request(app).get(path)).status, 404, path);
  }
  const post = await request(app).post('/recuperar').set('Origin', config.appOrigin).type('form')
    .send({ email: 'ana@example.test' });
  assert.equal(post.status, 404);
});
