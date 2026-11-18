import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { createHttpServer } from '../../src/server.js';
import { fixedClock } from '../../src/shared/clock.js';
import { openDb } from '../../src/shared/db.js';
import { connect } from '../helpers/ws.js';

// B2.1: sin servicios falsos. Cuentas, chat, gateway y sessionEvents son los del arranque real.
const START = Date.UTC(2026, 10, 17, 15, 0, 0);
const HOUR = 3_600_000;
const PASSWORD = 'Clave-segura-99';

async function setup(t) {
  const db = openDb(':memory:');
  const clock = fixedClock(START);
  const config = loadConfig({
    APP_ENV: 'test',
    DATABASE_FILE: ':memory:',
    ARGON2_MEMORY_KIB: '8',
    ARGON2_TIME_COST: '1',
  });
  const container = createContainer(config, { db, clock, logger: { error() {} } });
  const { httpServer, io } = createHttpServer(createApp(container), container);
  httpServer.listen(0, '127.0.0.1');
  await once(httpServer, 'listening');
  t.after(async () => {
    await new Promise((resolve) => io.close(resolve));
    container.close();
  });

  const url = `http://127.0.0.1:${httpServer.address().port}`;
  const origin = config.appOrigin;
  const http = () => request(url);

  async function register(email, displayName) {
    const res = await http().post('/registro').set('Origin', origin).type('form')
      .send({ displayName, email, password: PASSWORD, passwordConfirm: PASSWORD });
    assert.equal(res.status, 302, `registro de ${email}`);
  }

  /** Un «navegador»: ingreso real por HTTP, su cookie y su socket unido al chat. */
  async function signIn(t2, email, password = PASSWORD) {
    const res = await http().post('/ingreso').set('Origin', origin).type('form').send({ email, password });
    assert.equal(res.status, 302, `ingreso de ${email}`);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const socket = connect({ url, cookie, origin });
    t2.after(() => socket.disconnect());
    await socket.waitForConnection();
    assert.equal((await socket.timeout(1_000).emitWithAck('chat:join')).ok, true);
    return { email, cookie, socket };
  }

  async function sessionLost(browser) {
    const panel = await http().get('/panel').set('Cookie', browser.cookie);
    const chat = await http().get('/panel/chat').set('Cookie', browser.cookie);
    const history = await http().get('/api/chat/mensajes').set('Cookie', browser.cookie);
    return panel.status === 302 && panel.headers.location === '/ingreso?next=%2Fpanel'
      && chat.status === 302 && chat.headers.location === '/ingreso?next=%2Fpanel%2Fchat'
      && history.status === 401;
  }

  function send(browser, text) {
    return browser.socket.timeout(1_000).emitWithAck('chat:send', { clientMessageId: randomUUID(), text });
  }

  return { db, clock, container, config, url, origin, http, register, signIn, sessionLost, send };
}

function expiredReasons(socket) {
  return socket.received.filter((item) => item.event === 'session:expired').map((item) => item.data.reason);
}

test('TM-INT-01: tras POST /salir se cierra el socket de esa sesión y la cookie no abre panel, chat ni historial', async (t) => {
  const ctx = await setup(t);
  await ctx.register('ana@example.test', 'Ana Quispe');
  await ctx.register('luis@example.test', 'Luis Tupiza');
  const ana = await ctx.signIn(t, 'ana@example.test');
  const anaOtroNavegador = await ctx.signIn(t, 'ana@example.test');
  const luis = await ctx.signIn(t, 'luis@example.test');

  const panel = await ctx.http().get('/panel').set('Cookie', ana.cookie);
  assert.equal(panel.status, 200);
  const csrf = /name="_csrf" value="([^"]+)"/.exec(panel.text)[1];

  const closed = once(ana.socket, 'disconnect');
  const salir = await ctx.http().post('/salir').set('Origin', ctx.origin).set('Cookie', ana.cookie)
    .type('form').send({ _csrf: csrf });
  assert.equal(salir.status, 302);
  await closed;

  assert.deepEqual(expiredReasons(ana.socket), ['revoked']);
  assert.equal(await ctx.sessionLost(ana), true);

  // Las demás sesiones siguen vivas: la otra de Ana y la de Luis.
  assert.equal(anaOtroNavegador.socket.connected, true);
  assert.equal(luis.socket.connected, true);
  assert.equal((await ctx.send(luis, 'Sigo conectado')).ok, true);
  assert.equal((await ctx.send(anaOtroNavegador, 'Yo también')).ok, true);
  assert.equal(await ctx.sessionLost(anaOtroNavegador), false);
});

test('TM-INT-02: restablecer la clave cierra todos los sockets del usuario y sus cookies pierden acceso', async (t) => {
  const ctx = await setup(t);
  await ctx.register('ana@example.test', 'Ana Quispe');
  await ctx.register('luis@example.test', 'Luis Tupiza');
  const ana = await ctx.signIn(t, 'ana@example.test');
  const luisUno = await ctx.signIn(t, 'luis@example.test');
  const luisDos = await ctx.signIn(t, 'luis@example.test');

  const pedido = await ctx.http().post('/recuperar').set('Origin', ctx.origin).type('form')
    .send({ email: 'luis@example.test' });
  assert.equal(pedido.status, 302);
  const { body } = ctx.db.prepare('SELECT body FROM mail_outbox ORDER BY id DESC LIMIT 1').get();
  const token = /\/restablecer\?token=([A-Za-z0-9_-]+)/.exec(body)[1];

  const closed = Promise.all([once(luisUno.socket, 'disconnect'), once(luisDos.socket, 'disconnect')]);
  const nueva = 'Nueva-clave-segura-1';
  const res = await ctx.http().post('/restablecer').set('Origin', ctx.origin).type('form')
    .send({ token, newPassword: nueva, newPasswordConfirm: nueva });
  assert.equal(res.status, 302);
  await closed;

  assert.deepEqual(expiredReasons(luisUno.socket), ['revoked']);
  assert.deepEqual(expiredReasons(luisDos.socket), ['revoked']);
  assert.equal(await ctx.sessionLost(luisUno), true);
  assert.equal(await ctx.sessionLost(luisDos), true);

  assert.equal(ana.socket.connected, true);
  assert.equal((await ctx.send(ana, 'Ana sigue aquí')).ok, true);
  // Con la clave nueva Luis vuelve a entrar.
  const luisTres = await ctx.signIn(t, 'luis@example.test', nueva);
  assert.equal(luisTres.socket.connected, true);
});

test('TM-INT-03: reconectar con la cookie de una sesión revocada da connect_error UNAUTHENTICATED', async (t) => {
  const ctx = await setup(t);
  await ctx.register('ana@example.test', 'Ana Quispe');
  const ana = await ctx.signIn(t, 'ana@example.test');
  const csrf = /name="_csrf" value="([^"]+)"/.exec((await ctx.http().get('/panel').set('Cookie', ana.cookie)).text)[1];
  const closed = once(ana.socket, 'disconnect');
  await ctx.http().post('/salir').set('Origin', ctx.origin).set('Cookie', ana.cookie).type('form').send({ _csrf: csrf });
  await closed;

  const retry = connect({ url: ctx.url, cookie: ana.cookie, origin: ctx.origin });
  t.after(() => retry.disconnect());
  await assert.rejects(retry.waitForConnection(), (error) => error.data?.code === 'UNAUTHENTICATED');
});

test('TM-INT-04: con la sesión revocada solo en la base, chat:send da UNAUTHENTICATED y no guarda filas', async (t) => {
  const ctx = await setup(t);
  await ctx.register('ana@example.test', 'Ana Quispe');
  const ana = await ctx.signIn(t, 'ana@example.test');
  assert.equal((await ctx.send(ana, 'Antes de revocar')).ok, true);
  const before = ctx.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n;

  // Sin evento: nadie avisa al gateway; la revalidación de guard debe detectarlo sola.
  const events = [];
  ctx.container.sessionEvents.on('session-revoked', (event) => events.push(event));
  ctx.db.prepare("UPDATE sessions SET revoked_at = ?, revoke_reason = 'LOGOUT'").run(ctx.clock.now());

  const closed = once(ana.socket, 'disconnect');
  const ack = await ctx.send(ana, 'Después de revocar');
  await closed;

  assert.equal(ack.ok, false);
  assert.equal(ack.error.code, 'UNAUTHENTICATED');
  assert.deepEqual(expiredReasons(ana.socket), ['revoked']);
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, before);
  assert.deepEqual(events, []);
});

test('TM-INT-05: con la sesión vencida (8 h) el socket se cierra solo y /panel redirige', async (t) => {
  const ctx = await setup(t);
  await ctx.register('ana@example.test', 'Ana Quispe');
  const login = await ctx.http().post('/ingreso').set('Origin', ctx.origin).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  const cookie = login.headers['set-cookie'][0].split(';')[0];

  // El gateway programa el cierre con un temporizador real: a 100 ms del vencimiento (reloj falso),
  // conectar y adelantar el reloj hace que ese temporizador encuentre la sesión vencida sin ningún evento.
  ctx.clock.advance(8 * HOUR - 100);
  const socket = connect({ url: ctx.url, cookie, origin: ctx.origin });
  t.after(() => socket.disconnect());
  await socket.waitForConnection();
  const closed = once(socket, 'disconnect');
  ctx.clock.advance(100);
  await closed;

  assert.deepEqual(expiredReasons(socket), ['expired']);
  const panel = await ctx.http().get('/panel').set('Cookie', cookie);
  assert.equal(panel.status, 302);
  assert.equal(panel.headers.location, '/ingreso?next=%2Fpanel');
});
