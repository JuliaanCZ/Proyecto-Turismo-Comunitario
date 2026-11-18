import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import { URL } from 'node:url';
import { io as connectSocket } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { createHttpServer } from '../../src/server.js';
import { fixedClock } from '../../src/shared/clock.js';
import { createDemoBackend } from '../helpers/demo-backend.js';

/* global AbortSignal */
const START = Date.UTC(2026, 10, 17, 15, 0, 0);
const HOUR = 3_600_000;
const TIMEOUT = 3_000;
const PASSWORD = 'Clave-segura-99';
const ANA = 'ana@example.test';
const LUIS = 'luis@example.test';

async function setup(t) {
  const { db, storage } = createDemoBackend();
  const clock = fixedClock(START);
  const config = loadConfig({ APP_ENV: 'test', ARGON2_MEMORY_KIB: '8', ARGON2_TIME_COST: '1' });
  const container = await createContainer(config, { db, storage, clock, skipMigrate: true });
  const { httpServer, io } = createHttpServer(createApp(container), container);
  t.after(async () => {
    try {
      await io.close();
      await container.close();
    } finally {
      await db.close();
    }
  });
  const listening = once(httpServer, 'listening', { signal: AbortSignal.timeout(TIMEOUT) });
  httpServer.listen(0, '127.0.0.1');
  await listening;

  const url = `http://127.0.0.1:${httpServer.address().port}`;
  const http = request(url);
  const origin = config.appOrigin;
  const post = (path) => http.post(path).set('Origin', origin).type('form');

  async function register(email, displayName) {
    await post('/registro').send({ displayName, email, password: PASSWORD, passwordConfirm: PASSWORD }).expect(302);
  }

  async function login(email, password = PASSWORD) {
    const response = await post('/ingreso').send({ email, password }).expect(302);
    return response.headers['set-cookie'][0].split(';')[0];
  }

  function connect(cookie) {
    const socket = connectSocket(url, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { Cookie: cookie, Origin: origin },
    });
    const expiredReasons = [];
    socket.on('session:expired', ({ reason }) => expiredReasons.push(reason));
    t.after(() => socket.disconnect());
    return { socket, expiredReasons };
  }

  async function signIn(email, password) {
    const cookie = await login(email, password);
    const client = connect(cookie);
    const connected = once(client.socket, 'connect', { signal: AbortSignal.timeout(TIMEOUT) });
    client.socket.connect();
    await connected;
    assert.equal((await client.socket.timeout(TIMEOUT).emitWithAck('chat:join')).ok, true);
    return { ...client, cookie };
  }

  return { db, clock, container, http, post, register, login, connect, signIn };
}

function waitForDisconnect({ socket }) {
  return once(socket, 'disconnect', { signal: AbortSignal.timeout(TIMEOUT) });
}

function send({ socket }, text) {
  return socket.timeout(TIMEOUT).emitWithAck('chat:send', { clientMessageId: randomUUID(), text });
}

async function assertSessionLost(http, cookie) {
  await http.get('/panel').set('Cookie', cookie).expect(302).expect('Location', '/ingreso?next=%2Fpanel');
  await http.get('/panel/chat').set('Cookie', cookie).expect(302).expect('Location', '/ingreso?next=%2Fpanel%2Fchat');
  await http.get('/api/chat/mensajes').set('Cookie', cookie).expect(401);
}

async function logout({ http, post }, { cookie }) {
  const panel = await http.get('/panel').set('Cookie', cookie).expect(200);
  const [, csrf] = /name="_csrf" value="([^"]+)"/.exec(panel.text);
  await post('/salir').set('Cookie', cookie).send({ _csrf: csrf }).expect(302);
}

test('TM-INT-01: cerrar sesión revoca su cookie y su socket y conserva las otras sesiones', async (t) => {
  const ctx = await setup(t);
  await ctx.register(ANA, 'Ana Quispe');
  await ctx.register(LUIS, 'Luis Tupiza');
  const ana = await ctx.signIn(ANA);
  const anaOtroNavegador = await ctx.signIn(ANA);
  const luis = await ctx.signIn(LUIS);

  const closed = waitForDisconnect(ana);
  await Promise.all([closed, logout(ctx, ana)]);

  assert.deepEqual(ana.expiredReasons, ['revoked']);
  await assertSessionLost(ctx.http, ana.cookie);
  assert.equal((await send(luis, 'Sigo conectado')).ok, true);
  assert.equal((await send(anaOtroNavegador, 'Yo también')).ok, true);
  await ctx.http.get('/panel').set('Cookie', anaOtroNavegador.cookie).expect(200);
});

test('TM-INT-02: restablecer la clave revoca todas las sesiones del usuario por HTTP y WebSocket', async (t) => {
  const ctx = await setup(t);
  await ctx.register(ANA, 'Ana Quispe');
  await ctx.register(LUIS, 'Luis Tupiza');
  const ana = await ctx.signIn(ANA);
  const luisUno = await ctx.signIn(LUIS);
  const luisDos = await ctx.signIn(LUIS);

  await ctx.post('/recuperar').send({ email: LUIS }).expect(302);
  const [mail] = await ctx.container.accounts.listMailbox();
  const token = new URL(mail.link).searchParams.get('token');
  const nueva = 'Nueva-clave-segura-1';
  await Promise.all([
    waitForDisconnect(luisUno),
    waitForDisconnect(luisDos),
    ctx.post('/restablecer').send({ token, newPassword: nueva, newPasswordConfirm: nueva }).expect(302),
  ]);

  assert.deepEqual(luisUno.expiredReasons, ['revoked']);
  assert.deepEqual(luisDos.expiredReasons, ['revoked']);
  await assertSessionLost(ctx.http, luisUno.cookie);
  await assertSessionLost(ctx.http, luisDos.cookie);
  assert.equal((await send(ana, 'Ana sigue aquí')).ok, true);
  await ctx.signIn(LUIS, nueva);
});

test('TM-INT-03: una cookie revocada no permite reconectar el socket', async (t) => {
  const ctx = await setup(t);
  await ctx.register(ANA, 'Ana Quispe');
  const ana = await ctx.signIn(ANA);
  await Promise.all([waitForDisconnect(ana), logout(ctx, ana)]);

  const { socket } = ctx.connect(ana.cookie);
  const rejected = once(socket, 'connect_error', { signal: AbortSignal.timeout(TIMEOUT) });
  socket.connect();
  const [error] = await rejected;
  assert.equal(error.data?.code, 'UNAUTHENTICATED');
});

test('TM-INT-04: una sesión revocada en la base no puede guardar mensajes', async (t) => {
  const ctx = await setup(t);
  await ctx.register(ANA, 'Ana Quispe');
  const ana = await ctx.signIn(ANA);
  assert.equal((await send(ana, 'Antes de revocar')).ok, true);

  const session = await ctx.container.accounts.resolveSession(ana.cookie.split('=')[1]);
  // Actualiza la base directamente para que el guard detecte la revocación sin aviso al gateway.
  await ctx.db.query("UPDATE sessions SET revoked_at = $1, revoke_reason = 'LOGOUT' WHERE id = $2",
    [ctx.clock.now(), session.sessionId]);
  const [, ack] = await Promise.all([waitForDisconnect(ana), send(ana, 'Después de revocar')]);

  assert.equal(ack.ok, false);
  assert.equal(ack.error.code, 'UNAUTHENTICATED');
  assert.deepEqual(ana.expiredReasons, ['revoked']);
  const { rows } = await ctx.db.query('SELECT text FROM chat_messages ORDER BY id');
  assert.deepEqual(rows, [{ text: 'Antes de revocar' }]);
});

test('TM-INT-05: al vencer la sesión se cierra el socket y la cookie pierde acceso HTTP', async (t) => {
  const ctx = await setup(t);
  await ctx.register(ANA, 'Ana Quispe');
  const cookie = await ctx.login(ANA);
  // El gateway usa un temporizador real con la diferencia calculada por el reloj inyectado.
  ctx.clock.advance(8 * HOUR - 100);
  const client = ctx.connect(cookie);
  const connected = once(client.socket, 'connect', { signal: AbortSignal.timeout(TIMEOUT) });
  client.socket.connect();
  await connected;
  const closed = waitForDisconnect(client);
  ctx.clock.advance(100);
  await closed;

  assert.deepEqual(client.expiredReasons, ['expired']);
  await assertSessionLost(ctx.http, cookie);
});
