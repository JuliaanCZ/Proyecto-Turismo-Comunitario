import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';
import request from 'supertest';
import { DEMO_OFFERS, DEMO_USERS, seedDemo } from '../../scripts/seed-demo.js';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { createHttpServer } from '../../src/server.js';
import { fixedClock } from '../../src/shared/clock.js';
import { openDb } from '../../src/shared/db.js';
import { formatEcuadorDateTime, parseEcuadorLocalDateTime, toEcuadorLocalDateTime } from '../../src/shared/time.js';
import { connect, expectNoEvent } from '../helpers/ws.js';

// B2.2: recorrido de extremo a extremo con los servicios REALES de cuentas, ofertas y chat, el gateway
// real y cookies obtenidas por POST /ingreso. No hay servicios falsos ni sesiones insertadas por SQL.
// Las contraseñas son valores ficticios de prueba y no se imprimen.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const START = Date.UTC(2026, 10, 17, 15, 0, 0);
const DAY = 86_400_000;
const NUMBER = '593990000000'; // número ficticio: en pruebas nunca se escribe a WhatsApp
const PASSWORD = 'Clave-demo-ficticia-01';
const NEW_PASSWORD = 'Clave-nueva-ficticia-02';
const MAILBOX_PASSWORD = 'ejemplo-bandeja-local';
const LOW_COST_ARGON = { ARGON2_MEMORY_KIB: '8', ARGON2_TIME_COST: '1' };

function testConfig(extra = {}) {
  return loadConfig({ APP_ENV: 'test', DATABASE_FILE: ':memory:', WHATSAPP_BOOKING_NUMBER: NUMBER, ...LOW_COST_ARGON, ...extra });
}

function localStart(days, time = '09:00') {
  return `${toEcuadorLocalDateTime(START + days * DAY).slice(0, 10)}T${time}`;
}

/** Servidor real (Express + Socket.IO en un puerto efímero) sobre una base en memoria con reloj fijo. */
async function setup(t, { clock = fixedClock(START) } = {}) {
  const db = openDb(':memory:');
  const config = testConfig();
  const container = createContainer(config, { db, clock, logger: { error() {} } });
  const { httpServer, io } = createHttpServer(createApp(container), container);
  io.on('connection', (socket) => socket.on('test:witness', () => socket.emit('test:witness')));
  httpServer.listen(0, '127.0.0.1');
  await once(httpServer, 'listening');
  t.after(async () => {
    await new Promise((resolve) => io.close(resolve));
    container.close();
    db.close();
  });
  const url = `http://127.0.0.1:${httpServer.address().port}`;
  const origin = config.appOrigin;
  const http = () => request(url);

  /** Un «navegador»: su cookie, su token CSRF y los sockets que abre. */
  function browser(email) {
    const self = {
      email, cookie: null, csrf: null,
      get(path, opts = {}) {
        const req = http().get(path);
        if (self.cookie && !opts.anonymous) req.set('Cookie', self.cookie);
        return req;
      },
      post(path, body = {}, { csrf = true } = {}) {
        const req = http().post(path).set('Origin', origin).type('form');
        if (self.cookie) req.set('Cookie', self.cookie);
        return req.send(csrf && self.csrf ? { ...body, _csrf: self.csrf } : body);
      },
      async login(password = PASSWORD) {
        const res = await http().post('/ingreso').set('Origin', origin).type('form')
          .send({ email: self.email, password });
        assert.equal(res.status, 302, `ingreso de ${self.email}`);
        assert.equal(res.headers.location, '/panel');
        self.cookie = res.headers['set-cookie'][0].split(';')[0];
        const panel = await self.get('/panel');
        assert.equal(panel.status, 200);
        self.csrf = /name="_csrf" value="([^"]+)"/.exec(panel.text)[1];
        return panel;
      },
      async socket(t2, { join = false } = {}) {
        const socket = connect({ url, cookie: self.cookie, origin });
        t2.after(() => socket.disconnect());
        await socket.waitForConnection();
        if (join) assert.equal((await socket.timeout(1_000).emitWithAck('chat:join')).ok, true);
        return socket;
      },
    };
    return self;
  }

  async function register(email, displayName) {
    const res = await http().post('/registro').set('Origin', origin).type('form')
      .send({ displayName, email, password: PASSWORD, passwordConfirm: PASSWORD });
    assert.equal(res.status, 302, `registro de ${email}`);
    assert.equal(res.headers.location, '/ingreso?aviso=cuenta-creada');
    return browser(email);
  }

  return { db, clock, container, config, url, origin, http, browser, register, io };
}

/** Impide abrir conexiones a servicios externos: solo se admite el servidor local de la prueba. */
function blockExternalNetwork(t) {
  const hosts = new Set();
  const original = net.Socket.prototype.connect;
  t.mock.method(net.Socket.prototype, 'connect', function guarded(...args) {
    const first = args[0];
    const host = typeof first === 'object' && first !== null
      ? (first.host ?? 'localhost')
      : (typeof first === 'number' ? (typeof args[1] === 'string' ? args[1] : 'localhost') : 'ipc');
    hosts.add(host);
    if (!['127.0.0.1', 'localhost', '::1', 'ipc'].includes(host)) {
      throw new Error(`Conexión externa bloqueada: ${host}`);
    }
    return original.apply(this, args);
  });
  return hosts;
}

function menuOf(html) {
  const nav = /<nav aria-label="Principal">[\s\S]*?<\/nav>/.exec(html)?.[0];
  assert.ok(nav, 'la página debe incluir el menú principal');
  const hrefs = [...nav.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  return { hrefs, normalized: nav.replace(/ aria-current="page"/g, '') };
}

const offerIds = (html, base) => [...html.matchAll(new RegExp(`href="${base}/(\\d+)"`, 'g'))].map((m) => Number(m[1]));

function offerForm(overrides = {}) {
  return {
    title: 'Caminata guiada por el sendero comunitario',
    description: 'Recorrido ficticio de medio día con guía local para la demostración.',
    province: 'COTOPAXI',
    locationText: 'Comunidad Laguna Verde',
    startsAt: localStart(5),
    capacity: '12',
    ...overrides,
  };
}

async function png(color = '#3a7d44') {
  return sharp({ create: { width: 96, height: 64, channels: 3, background: color } }).png().toBuffer();
}

function sendChat(socket, text, clientMessageId = randomUUID()) {
  return socket.timeout(1_000).emitWithAck('chat:send', { clientMessageId, text });
}

async function assertNoEventNow(socket, event) {
  const absent = expectNoEvent(socket, event, 'test:witness');
  socket.emit('test:witness');
  await absent;
}

const NOTICE = 'notification:new-message';

test('TM-INT-06: recorrido completo, del registro al cierre de sesión, con servicios reales', async (t) => {
  const externalHosts = blockExternalNetwork(t);
  const ctx = await setup(t);
  const { http } = ctx;
  const state = {};

  await t.test('1. el visitante ve la portada y el registro valida en el servidor', async () => {
    const home = await http().get('/');
    assert.equal(home.status, 200);
    assert.match(home.text, /href="\/registro"/);
    const bad = await http().post('/registro').set('Origin', ctx.origin).type('form')
      .send({ displayName: 'Ana Quispe', email: 'ana@demo.test', password: PASSWORD, passwordConfirm: 'otra-distinta-1' });
    assert.equal(bad.status, 422);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
  });

  await t.test('2. registro e ingreso reales; /panel exige sesión y muestra el menú', async () => {
    state.ana = await ctx.register('ana@demo.test', 'Ana Quispe');
    state.luis = await ctx.register('luis@demo.test', 'Luis Tupiza');
    const repeated = await http().post('/registro').set('Origin', ctx.origin).type('form')
      .send({ displayName: 'Ana Quispe', email: 'ana@demo.test', password: PASSWORD, passwordConfirm: PASSWORD });
    assert.equal(repeated.status, 409);

    const wrong = await http().post('/ingreso').set('Origin', ctx.origin).type('form')
      .send({ email: 'ana@demo.test', password: 'Clave-equivocada-77' });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers['set-cookie'], undefined);

    const anon = await http().get('/panel');
    assert.equal(anon.status, 302);
    assert.equal(anon.headers.location, '/ingreso?next=%2Fpanel');

    const panel = await state.ana.login();
    assert.deepEqual(menuOf(panel.text).hrefs, ['/panel', '/panel/ofertas', '/panel/chat']);
    assert.match(panel.text, /Ana Quispe/);
    await state.luis.login();
  });

  await t.test('3. crear una oferta (borrador) y rechazar una fecha pasada', async () => {
    const past = await state.ana.post('/panel/ofertas', offerForm({ startsAt: localStart(-1) }));
    assert.equal(past.status, 422);
    const created = await state.ana.post('/panel/ofertas', offerForm());
    assert.equal(created.status, 302);
    const match = /^\/panel\/ofertas\/(\d+)\?aviso=creada$/.exec(created.headers.location);
    assert.ok(match, created.headers.location);
    state.offerId = Number(match[1]);
    const row = ctx.db.prepare('SELECT is_published AS p FROM offers WHERE id = ?').get(state.offerId);
    assert.equal(row.p, 0);
  });

  await t.test('4. listar, filtrar por provincia y paginar de 10 en 10', async () => {
    const provinces = ['COTOPAXI', 'MANABI', 'NAPO', 'IMBABURA'];
    for (let index = 1; index < 12; index += 1) {
      const res = await state.ana.post('/panel/ofertas', offerForm({
        title: `Oferta ficticia número ${String(index + 1).padStart(2, '0')}`,
        province: provinces[index % 4],
        startsAt: localStart(5 + index),
      }));
      assert.equal(res.status, 302);
    }
    const first = await state.ana.get('/panel/ofertas');
    assert.equal(first.status, 200);
    assert.equal(offerIds(first.text, '/panel/ofertas').length, 10);
    assert.match(first.text, /aria-label="Páginas de mis ofertas"/);
    const second = await state.ana.get('/panel/ofertas?pagina=2');
    assert.equal(offerIds(second.text, '/panel/ofertas').length, 2);
    assert.match(second.text, /aria-current="page">2</);

    const napo = await state.ana.get('/panel/ofertas?provincia=NAPO');
    assert.equal(offerIds(napo.text, '/panel/ofertas').length, 3);
    assert.doesNotMatch(napo.text, /<dd>Cotopaxi<\/dd>/);
    // Luis no ve las ofertas de Ana en su propio listado.
    const luisList = await state.luis.get('/panel/ofertas');
    assert.equal(offerIds(luisList.text, '/panel/ofertas').length, 0);
  });

  await t.test('5. detalle por ID y 404 para ofertas ajenas con ingreso real (TM-OFE-09)', async () => {
    const detail = await state.ana.get(`/panel/ofertas/${state.offerId}`);
    assert.equal(detail.status, 200);
    assert.match(detail.text, /Caminata guiada por el sendero comunitario/);
    assert.match(detail.text, /Borrador/);
    for (const path of ['', '/editar', '/eliminar', '/foto']) {
      assert.equal((await state.luis.get(`/panel/ofertas/${state.offerId}${path}`)).status, 404, `GET ${path}`);
    }
    for (const path of ['/editar', '/eliminar']) {
      const res = await state.luis.post(`/panel/ofertas/${state.offerId}${path}`, { ...offerForm(), confirm: 'on' });
      assert.equal(res.status, 404, `POST ${path}`);
    }
    assert.equal((await state.ana.get('/panel/ofertas/999999')).status, 404);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM offers WHERE owner_id = 1').get().n, 12);
  });

  await t.test('6. editar la oferta', async () => {
    const res = await state.ana.post(`/panel/ofertas/${state.offerId}/editar`, offerForm({
      title: 'Caminata guiada a la laguna comunitaria', capacity: '14', isPublished: 'false',
    }));
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, `/panel/ofertas/${state.offerId}?aviso=actualizada`);
    const detail = await state.ana.get(`/panel/ofertas/${state.offerId}`);
    assert.match(detail.text, /Caminata guiada a la laguna comunitaria/);
    assert.match(detail.text, /<dd>14<\/dd>/);
  });

  await t.test('7. publicar exige foto; se carga la foto y luego se publica', async () => {
    const early = await state.ana.post(`/panel/ofertas/${state.offerId}/editar`, offerForm({
      title: 'Caminata guiada a la laguna comunitaria', capacity: '14', isPublished: 'true',
    }));
    assert.equal(early.status, 422);
    assert.match(early.text, /Añade una foto antes de publicar/);

    const upload = await http().post(`/panel/ofertas/${state.offerId}/foto`).set('Cookie', state.ana.cookie)
      .set('Origin', ctx.origin).set('x-csrf-token', state.ana.csrf)
      .field('altText', 'Ilustración verde de un sendero de prueba')
      .attach('foto', await png(), { filename: 'sendero.png', contentType: 'image/png' });
    assert.equal(upload.status, 303);
    const own = await state.ana.get(`/panel/ofertas/${state.offerId}/foto`);
    assert.equal(own.status, 200);
    assert.equal(own.headers['content-type'], 'image/png');

    const published = await state.ana.post(`/panel/ofertas/${state.offerId}/editar`, offerForm({
      title: 'Caminata guiada a la laguna comunitaria', capacity: '14', isPublished: 'true',
    }));
    assert.equal(published.status, 302);

    // Un segundo borrador con foto sirve para comprobar que su imagen sigue privada.
    const draft = await state.ana.post('/panel/ofertas', offerForm({ title: 'Borrador privado con foto de prueba', startsAt: localStart(9) }));
    state.draftId = Number(/\/panel\/ofertas\/(\d+)\?/.exec(draft.headers.location)[1]);
    const draftPhoto = await http().post(`/panel/ofertas/${state.draftId}/foto`).set('Cookie', state.ana.cookie)
      .set('Origin', ctx.origin).set('x-csrf-token', state.ana.csrf)
      .field('altText', 'Imagen privada de prueba')
      .attach('foto', await png('#aa3355'), { filename: 'privada.png', contentType: 'image/png' });
    assert.equal(draftPhoto.status, 303);
  });

  await t.test('8. el visitante ve solo lo publicado, con foto y enlace de WhatsApp sin enviar nada', async () => {
    const catalog = await http().get('/ofertas');
    assert.equal(catalog.status, 200);
    assert.deepEqual(offerIds(catalog.text, '/ofertas'), [state.offerId]);
    assert.match(catalog.text, /Caminata guiada a la laguna comunitaria/);
    assert.doesNotMatch(catalog.text, /Borrador privado con foto de prueba/);
    assert.equal((await http().get(`/ofertas/${state.offerId}/foto`)).status, 200);

    const detail = await http().get(`/ofertas/${state.offerId}`);
    assert.equal(detail.status, 200);
    const startsAt = parseEcuadorLocalDateTime(localStart(5));
    const expected = `https://wa.me/${NUMBER}?text=${encodeURIComponent(
      `Hola, quiero consultar una reserva para Caminata guiada a la laguna comunitaria el ${formatEcuadorDateTime(startsAt)}.`,
    )}`;
    const href = /href="(https:\/\/wa\.me\/[^"]+)"/.exec(detail.text)?.[1];
    assert.equal(href, expected);
    assert.match(detail.text, /rel="noopener noreferrer"/);
    assert.match(decodeURIComponent(new URL(href).searchParams.get('text')), /Caminata guiada a la laguna comunitaria/);

    // Privacidad: el borrador y su foto no existen para el visitante ni para otro usuario.
    for (const path of [`/ofertas/${state.draftId}`, `/ofertas/${state.draftId}/foto`]) {
      assert.equal((await http().get(path)).status, 404, `visitante ${path}`);
      assert.equal((await state.luis.get(path)).status, 404, `otro usuario ${path}`);
    }
    assert.equal((await state.luis.get(`/panel/ofertas/${state.draftId}/foto`)).status, 404);
    assert.equal((await state.ana.get(`/panel/ofertas/${state.draftId}/foto`)).status, 200);

    // Nada salió hacia WhatsApp ni a ningún otro host: solo la propia prueba.
    assert.ok(!externalHosts.has('wa.me'));
    assert.deepEqual([...externalHosts].filter((host) => !['127.0.0.1', 'localhost'].includes(host)), []);
  });

  await t.test('9. eliminar pide confirmación y solo entonces borra', async () => {
    const page = await state.ana.get('/panel/ofertas');
    const victimId = offerIds(page.text, '/panel/ofertas').at(-1);
    const confirmPage = await state.ana.get(`/panel/ofertas/${victimId}/eliminar`);
    assert.equal(confirmPage.status, 200);
    const refused = await state.ana.post(`/panel/ofertas/${victimId}/eliminar`, {});
    assert.equal(refused.status, 422);
    assert.equal((await state.ana.get(`/panel/ofertas/${victimId}`)).status, 200);
    const done = await state.ana.post(`/panel/ofertas/${victimId}/eliminar`, { confirm: 'on' });
    assert.equal(done.status, 302);
    assert.equal(done.headers.location, '/panel/ofertas?aviso=eliminada');
    assert.equal((await state.ana.get(`/panel/ofertas/${victimId}`)).status, 404);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM offers WHERE owner_id = 1').get().n, 12);
  });

  await t.test('10. recuperar la clave con la bandeja cierra la sesión anterior y el enlace sirve una vez', async () => {
    const oldCookie = state.ana.cookie;
    const unknown = await http().post('/recuperar').set('Origin', ctx.origin).type('form').send({ email: 'nadie@demo.test' });
    const known = await http().post('/recuperar').set('Origin', ctx.origin).type('form').send({ email: 'ana@demo.test' });
    assert.equal(unknown.status, 302);
    assert.equal(known.status, 302);
    assert.equal(unknown.headers.location, known.headers.location);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM mail_outbox').get().n, 1);

    assert.equal((await http().get('/dev/bandeja')).status, 401);
    const mailbox = await http().get('/dev/bandeja').auth('bandeja', MAILBOX_PASSWORD);
    assert.equal(mailbox.status, 200);
    assert.match(mailbox.text, /ana@demo\.test/);
    const link = /href="(https?:\/\/[^"]*\/restablecer\?token=[A-Za-z0-9_-]{43})"/.exec(mailbox.text)?.[1];
    assert.ok(link, 'la bandeja debe mostrar el enlace');
    const path = new URL(link).pathname + new URL(link).search;
    const token = new URL(link).searchParams.get('token');

    assert.equal((await http().get(path)).status, 200);
    const mismatch = await http().post('/restablecer').set('Origin', ctx.origin).type('form')
      .send({ token, newPassword: NEW_PASSWORD, newPasswordConfirm: 'No-coincide-1234' });
    assert.equal(mismatch.status, 422);
    const done = await http().post('/restablecer').set('Origin', ctx.origin).type('form')
      .send({ token, newPassword: NEW_PASSWORD, newPasswordConfirm: NEW_PASSWORD });
    assert.equal(done.status, 302);
    assert.equal(done.headers.location, '/ingreso?aviso=clave-cambiada');

    const reuse = await http().post('/restablecer').set('Origin', ctx.origin).type('form')
      .send({ token, newPassword: 'Otra-clave-ficticia-03', newPasswordConfirm: 'Otra-clave-ficticia-03' });
    assert.equal(reuse.status, 400);
    assert.equal((await http().get('/panel').set('Cookie', oldCookie)).status, 302);
    const oldPassword = await http().post('/ingreso').set('Origin', ctx.origin).type('form')
      .send({ email: 'ana@demo.test', password: PASSWORD });
    assert.equal(oldPassword.status, 401);
    // Luis conserva su sesión: solo se revocan las de quien cambió la clave.
    assert.equal((await state.luis.get('/panel')).status, 200);
    await state.ana.login(NEW_PASSWORD);
  });

  await t.test('11. chat real entre dos usuarios: guardar, difundir, presencia, historial y aviso', async () => {
    // Los sockets viven hasta el final de la prueba principal: el paso 12 los usa también.
    const ana = await state.ana.socket(t, { join: true });
    const luisPanel = await state.luis.socket(t); // Luis navega por el panel, fuera de la sala

    const first = await sendChat(ana, 'Hola Luis, ¿ves el aviso?');
    assert.equal(first.ok, true);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, 1);
    await luisPanel.waitFor(NOTICE);
    await assertNoEventNow(luisPanel, 'chat:message');
    const notice = luisPanel.received.find((item) => item.event === NOTICE).data;
    assert.deepEqual(notice, { messageId: first.message.id, authorDisplayName: 'Ana Quispe', createdAt: first.message.createdAt });
    assert.doesNotMatch(JSON.stringify(notice), /Hola Luis|demo\.test/);

    const joined = await luisPanel.timeout(1_000).emitWithAck('chat:join');
    assert.equal(joined.ok, true);
    assert.deepEqual(joined.presence.users.map((user) => user.displayName), ['Ana Quispe', 'Luis Tupiza']);
    await ana.waitFor('presence:update');
    const presence = ana.received.filter((item) => item.event === 'presence:update').at(-1).data;
    assert.equal(presence.count, 2);
    assert.deepEqual(Object.keys(presence.users[0]).sort(), ['displayName', 'id']);

    // TM-CHAT-01 con cuentas reales: se guarda antes de emitir y ambos reciben el mismo mensaje.
    const reply = await sendChat(luisPanel, 'Sí, lo veo en el panel.');
    assert.equal(reply.ok, true);
    await ana.waitFor('chat:message', 2); // su propio mensaje y la respuesta de Luis
    const anaMessages = ana.received.filter((item) => item.event === 'chat:message').map((item) => item.data.id);
    assert.deepEqual(anaMessages, [first.message.id, reply.message.id]);
    assert.equal(luisPanel.received.filter((item) => item.event === 'chat:message').length, 1);
    await assertNoEventNow(ana, NOTICE); // Ana estaba en la sala y es autora: no recibe aviso

    // TM-CHAT-02: cargas inválidas no guardan filas ni emiten.
    const before = ctx.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n;
    for (const payload of [{ clientMessageId: 'no-es-uuid', text: 'x' }, { clientMessageId: randomUUID(), text: '   ' },
      { clientMessageId: randomUUID(), text: 'a'.repeat(501) }]) {
      const ack = await ana.timeout(1_000).emitWithAck('chat:send', payload);
      assert.equal(ack.ok, false);
      assert.equal(ack.error.code, 'VALIDATION_ERROR');
    }
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, before);

    // TM-CHAT-03: repetir clientMessageId devuelve la misma fila y no emite otra vez.
    const same = randomUUID();
    const one = await sendChat(ana, 'Mensaje con reintento', same);
    const two = await sendChat(ana, 'Mensaje con reintento', same);
    assert.equal(two.message.id, one.message.id);
    await luisPanel.waitFor('chat:message', 2);
    await assertNoEventNow(luisPanel, 'chat:message');
    assert.equal(luisPanel.received.filter((item) => item.event === 'chat:message').length, 2);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, before + 1);

    // Historial por HTTP y en la página, con el texto escapado.
    const history = await state.luis.get('/api/chat/mensajes');
    assert.equal(history.status, 200);
    assert.deepEqual(history.body.messages.map((message) => message.text),
      ['Hola Luis, ¿ves el aviso?', 'Sí, lo veo en el panel.', 'Mensaje con reintento']);
    const page = await state.ana.get('/panel/chat');
    assert.equal(page.status, 200);
    assert.match(page.text, /Hola Luis, ¿ves el aviso\?/);
    assert.match(page.text, /id="chat-badge"/);

    state.sockets = { ana, luisPanel };
  });

  await t.test('12. cerrar sesión desconecta el chat, avisa a los demás y la cookie deja de servir', async () => {
    const { ana, luisPanel } = state.sockets;
    const cookie = state.ana.cookie;
    const closed = once(ana, 'disconnect');
    const exit = await state.ana.post('/salir');
    assert.equal(exit.status, 302);
    assert.equal(exit.headers.location, '/ingreso?aviso=sesion-cerrada');
    await closed;
    assert.deepEqual(ana.received.filter((item) => item.event === 'session:expired').map((item) => item.data.reason), ['revoked']);
    assert.equal((await http().get('/panel').set('Cookie', cookie)).status, 302);
    assert.equal((await http().get('/panel/chat').set('Cookie', cookie)).status, 302);
    assert.equal((await http().get('/api/chat/mensajes').set('Cookie', cookie)).status, 401);

    await luisPanel.waitFor('presence:update', 2);
    assert.equal(luisPanel.received.filter((item) => item.event === 'presence:update').at(-1).data.count, 1);
    assert.equal((await sendChat(luisPanel, 'Sigo conectado.')).ok, true);
  });
});

test('TM-NAV-06: los enlaces del menú responden 200 con sesión real y repiten el menú', async (t) => {
  const ctx = await setup(t);
  const user = await ctx.register('nav@demo.test', 'Nora Navegante');

  const anonymousMenu = menuOf((await ctx.http().get('/')).text);
  assert.deepEqual(anonymousMenu.hrefs, ['/ofertas', '/ingreso', '/registro']);
  // El enlace de la marca («Turismo comunitario») también lleva a la portada, con el mismo menú.
  assert.match((await ctx.http().get('/')).text, /<a class="marca" href="\/">/);
  for (const href of ['/', ...anonymousMenu.hrefs]) {
    const res = await ctx.http().get(href);
    assert.equal(res.status, 200, `visitante ${href}`);
    assert.equal(menuOf(res.text).normalized, anonymousMenu.normalized, `menú de visitante en ${href}`);
  }

  const panel = await user.login();
  const menu = menuOf(panel.text);
  assert.deepEqual(menu.hrefs, ['/panel', '/panel/ofertas', '/panel/chat']);
  for (const href of ['/', ...menu.hrefs]) {
    const res = await user.get(href);
    assert.equal(res.status, 200, `con sesión ${href}`);
    assert.match(res.text, /<h1[ >]/, `${href} tiene un h1`);
    assert.equal(menuOf(res.text).normalized, menu.normalized, `el menú se repite en ${href}`);
    assert.match(res.text, /Nora Navegante/);
  }
  // La página actual queda marcada en el menú.
  for (const href of menu.hrefs) {
    const html = (await user.get(href)).text;
    const current = menuOf(html).hrefs.filter((candidate) => new RegExp(`href="${candidate}" aria-current="page"`).test(html));
    assert.deepEqual(current, [href], `aria-current en ${href}`);
  }
  // Pantallas enlazadas desde el panel y el listado también repiten el menú.
  for (const href of ['/panel/ofertas/nueva']) {
    const res = await user.get(href);
    assert.equal(res.status, 200);
    assert.equal(menuOf(res.text).normalized, menu.normalized);
  }
  // «Salir» es un formulario POST con CSRF, no un enlace GET.
  assert.match(panel.text, /<form method="post" action="\/salir">/);
  assert.equal((await user.get('/salir')).status, 404);
});

test('TM-NOT-05: un mensaje rechazado o repetido no genera aviso; uno válido sí', async (t) => {
  const ctx = await setup(t);
  const ana = await ctx.register('ana@demo.test', 'Ana Quispe');
  const luis = await ctx.register('luis@demo.test', 'Luis Tupiza');
  await ana.login();
  await luis.login();
  const anaSocket = await ana.socket(t, { join: true });
  const luisSocket = await luis.socket(t); // fuera de la sala: es quien podría recibir el aviso
  const notices = () => luisSocket.received.filter((item) => item.event === NOTICE);
  const stored = () => ctx.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n;

  // Rechazados por validación: ni fila ni aviso.
  for (const payload of [
    { clientMessageId: 'no-es-uuid', text: 'texto' },
    { clientMessageId: randomUUID(), text: '' },
    { clientMessageId: randomUUID(), text: 'a'.repeat(501) },
    { clientMessageId: randomUUID() },
    {},
  ]) {
    const ack = await anaSocket.timeout(1_000).emitWithAck('chat:send', payload);
    assert.equal(ack.ok, false);
    assert.equal(ack.error.code, 'VALIDATION_ERROR');
  }
  await assertNoEventNow(luisSocket, NOTICE);
  assert.equal(notices().length, 0);
  assert.equal(stored(), 0);

  // Válido: exactamente un aviso, sin texto ni correo.
  const id = randomUUID();
  const ok = await sendChat(anaSocket, 'Mensaje válido para el aviso', id);
  assert.equal(ok.ok, true);
  await luisSocket.waitFor(NOTICE);
  assert.equal(notices().length, 1);
  assert.deepEqual(notices()[0].data, { messageId: ok.message.id, authorDisplayName: 'Ana Quispe', createdAt: ok.message.createdAt });
  assert.doesNotMatch(JSON.stringify(notices()[0].data), /Mensaje válido|demo\.test/);

  // Repetido: se confirma la misma fila pero no hay un segundo aviso.
  const repeated = await sendChat(anaSocket, 'Mensaje válido para el aviso', id);
  assert.equal(repeated.ok, true);
  assert.equal(repeated.message.id, ok.message.id);
  await assertNoEventNow(luisSocket, NOTICE);
  assert.equal(notices().length, 1);
  assert.equal(stored(), 1);

  // Sesión revocada solo en la base: el envío se rechaza y tampoco hay aviso.
  const closed = once(anaSocket, 'disconnect');
  ctx.db.prepare("UPDATE sessions SET revoked_at = ?, revoke_reason = 'LOGOUT' WHERE revoked_at IS NULL AND user_id = 1")
    .run(ctx.clock.now());
  const rejected = await sendChat(anaSocket, 'Con sesión revocada');
  await closed;
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'UNAUTHENTICATED');
  await assertNoEventNow(luisSocket, NOTICE);
  assert.equal(notices().length, 1);
  assert.equal(stored(), 1);

  // Un nuevo mensaje válido de Luis tras todo lo anterior sigue generando su aviso para Ana.
  await ana.login();
  const anaOutside = await ana.socket(t);
  const luisJoined = await luis.socket(t, { join: true });
  assert.equal((await sendChat(luisJoined, 'Respuesta válida de Luis')).ok, true);
  await anaOutside.waitFor(NOTICE);
  assert.equal(anaOutside.received.filter((item) => item.event === NOTICE).length, 1);
});

// ---------------------------------------------------------------------------------------------
// TM-INT-07: el seed de la demostración es idempotente.
const TABLES = ['users', 'offers', 'chat_messages'];

function snapshot(db) {
  const snap = Object.fromEntries(TABLES.map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
  snap.offer_photos = db.prepare(`
    SELECT offer_id, content_type, alt_text, length(image_bytes) AS bytes, hex(substr(image_bytes, 1, 8)) AS head
    FROM offer_photos ORDER BY offer_id`).all();
  snap.sequences = db.prepare('SELECT name, seq FROM sqlite_sequence ORDER BY name').all();
  snap.counts = Object.fromEntries(['sessions', 'mail_outbox', 'password_reset_tokens']
    .map((table) => [table, db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n]));
  return JSON.parse(JSON.stringify(snap, (_key, value) => (typeof value === 'bigint' ? Number(value) : value)));
}

/**
 * Carpeta temporal aislada con una base de archivo. `open()` devuelve un contenedor y lo recuerda:
 * al terminar se cierran todos antes de borrar la carpeta (en Windows no se borra una base abierta).
 */
function tempDatabase(t, prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const file = join(dir, 'demo.sqlite');
  const opened = [];
  t.after(() => {
    for (const container of opened) container.close();
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });
  return {
    file,
    open(clock = fixedClock(START)) {
      const container = createContainer(testConfig({ DATABASE_FILE: file }), { clock, logger: { error() {} } });
      opened.push(container);
      return container;
    },
  };
}

function seedCli(file) {
  const result = spawnSync(process.execPath, ['scripts/seed-demo.js'], {
    cwd: ROOT, encoding: 'utf8', timeout: 120_000,
    env: { ...process.env, APP_ENV: 'test', DATABASE_FILE: file, SEED_DEMO_PASSWORD: PASSWORD, ...LOW_COST_ARGON },
  });
  return { ...result, output: `${result.stdout}${result.stderr}` };
}

test('TM-INT-07: seed:demo dos veces deja las mismas filas y respeta los datos pedidos', async (t) => {
  const container = tempDatabase(t, 'tc-seed-').open();
  const first = await seedDemo({ container, password: PASSWORD });
  const afterFirst = snapshot(container.db);
  const second = await seedDemo({ container, password: PASSWORD });
  const afterSecond = snapshot(container.db);

  assert.deepEqual(afterSecond, afterFirst, 'la segunda ejecución no cambia ninguna fila ni secuencia');
  assert.deepEqual(first.users, { created: 2, kept: 0 });
  assert.deepEqual(second.users, { created: 0, kept: 2 });
  assert.deepEqual(first.offers, { created: 15, kept: 0, expired: [] });
  assert.deepEqual(second.offers, { created: 0, kept: 15, expired: [] });
  assert.deepEqual(second.messages, { created: 0, kept: 5 });
  assert.equal(second.photos.set + second.published.set, 0);

  // Contenido pedido: cuentas @demo.test, 12 + 3 ofertas, 4 provincias de Ana, 5 mensajes.
  assert.deepEqual(afterSecond.users.map((user) => user.email), DEMO_USERS.map((user) => user.email));
  assert.ok(afterSecond.users.every((user) => user.email.endsWith('@demo.test')));
  const [ana, luis] = afterSecond.users;
  const own = (user) => afterSecond.offers.filter((row) => row.owner_id === user.id);
  assert.equal(own(ana).length, 12);
  assert.equal(new Set(own(ana).map((row) => row.province)).size, 4);
  assert.equal(own(luis).length, 3);
  assert.equal(afterSecond.chat_messages.length, 5);
  assert.deepEqual(new Set(afterSecond.chat_messages.map((message) => message.author_id)), new Set([ana.id, luis.id]));
  assert.equal(afterSecond.chat_messages.length, new Set(afterSecond.chat_messages.map((message) => message.client_message_id)).size);

  // Catálogo: al menos dos ofertas futuras publicadas con foto y un borrador con foto que no sale.
  const catalog = container.offers.listPublicOffers();
  const expectedPublished = DEMO_OFFERS.filter((def) => def.publish);
  assert.ok(catalog.total >= 2);
  assert.equal(catalog.total, expectedPublished.length);
  assert.ok(catalog.items.every((item) => item.hasPhoto && item.isPublished && item.startsAt > START));
  assert.deepEqual(catalog.items.map((item) => item.title).sort(), expectedPublished.map((def) => def.title).sort());
  assert.ok(catalog.items.every((item) => container.offers.getPublicOfferPhoto(item.id).imageBytes.byteLength > 0));
  const draft = afterSecond.offers.find((row) => row.title.startsWith('Borrador privado'));
  assert.equal(draft.is_published, 0);
  assert.ok(afterSecond.offer_photos.some((photo) => photo.offer_id === draft.id), 'el borrador tiene foto');
  assert.throws(() => container.offers.getPublicOffer(draft.id), { code: 'NOT_FOUND' });
  assert.throws(() => container.offers.getPublicOfferPhoto(draft.id), { code: 'NOT_FOUND' });
  // Las fotos guardadas son JPEG reales.
  assert.ok(afterSecond.offer_photos.every((photo) => photo.content_type === 'image/jpeg' && photo.head.startsWith('FFD8FF')));
  // El seed solo toca accounts, offers y chat: ni sesiones ni correo de recuperación.
  assert.deepEqual(afterSecond.counts, { sessions: 0, mail_outbox: 0, password_reset_tokens: 0 });
});

test('TM-INT-07: el comando real (node scripts/seed-demo.js) también es idempotente y no imprime la clave', (t) => {
  const { file } = tempDatabase(t, 'tc-seed-cli-');

  const one = seedCli(file);
  assert.equal(one.status, 0, one.output);
  const db1 = openDb(file);
  const afterFirst = snapshot(db1);
  db1.close();
  const two = seedCli(file);
  assert.equal(two.status, 0, two.output);
  const db2 = openDb(file);
  const afterSecond = snapshot(db2);
  db2.close();

  assert.deepEqual(afterSecond, afterFirst);
  assert.equal(afterSecond.users.length, 2);
  assert.equal(afterSecond.offers.length, 15);
  assert.equal(afterSecond.chat_messages.length, 5);
  assert.match(one.stdout, /Ofertas: 15 creadas, 0 conservadas/);
  assert.match(two.stdout, /Ofertas: 0 creadas, 15 conservadas/);
  assert.ok(!one.output.includes(PASSWORD) && !two.output.includes(PASSWORD), 'la clave no aparece en la salida');
  assert.ok(!afterSecond.users.some((user) => JSON.stringify(user).includes(PASSWORD)), 'la clave no se guarda en claro');
});

test('TM-INT-07: repetir el seed días después deja las filas, informa las ofertas vencidas y no las publica', async (t) => {
  const database = tempDatabase(t, 'tc-seed-vencidas-');
  const first = database.open(fixedClock(START));
  await seedDemo({ container: first, password: PASSWORD });
  const baseline = snapshot(first.db);
  first.close();

  // 14 días después: vencen las ofertas que se programaron a 10 y 12 días de la primera ejecución.
  const later = database.open(fixedClock(START + 14 * DAY));
  const summary = await seedDemo({ container: later, password: PASSWORD });
  const expected = DEMO_OFFERS.filter((def) => def.days < 14).map((def) => def.title);

  assert.deepEqual(summary.offers.expired.sort(), expected.sort());
  assert.ok(expected.length >= 2);
  assert.equal(summary.offers.created, 0);
  assert.equal(summary.offers.kept, 15);
  assert.deepEqual(snapshot(later.db), baseline, 'no se duplica, edita ni borra ninguna fila');
  const published = later.offers.listPublicOffers().items.map((item) => item.title);
  assert.equal(published.length, DEMO_OFFERS.filter((def) => def.publish).length - DEMO_OFFERS.filter((def) => def.publish && def.days < 14).length);
  for (const title of expected) assert.ok(!published.includes(title), `${title} sale del catálogo al vencer`);
});

test('TM-INT-07: con otra contraseña el seed falla sin cambiar cuentas ni mostrar claves', async (t) => {
  const container = tempDatabase(t, 'tc-seed-clave-').open();
  await seedDemo({ container, password: PASSWORD });
  const baseline = snapshot(container.db);
  await assert.rejects(
    seedDemo({ container, password: NEW_PASSWORD }),
    (error) => /ya existe con otra contraseña/.test(error.message)
      && !error.message.includes(PASSWORD) && !error.message.includes(NEW_PASSWORD),
  );
  assert.deepEqual(snapshot(container.db), baseline);
  await assert.rejects(seedDemo({ container, password: 'corta' }), /al menos 10 caracteres/);
});
