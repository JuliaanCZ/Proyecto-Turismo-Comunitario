import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import { createHttpServer } from '../../src/server.js';
import { fixedClock } from '../../src/shared/clock.js';
import { createSessionFor, fakeAccounts } from '../helpers/auth.js';
import { createTestContext } from '../helpers/context.js';
import { createUser } from '../helpers/factories.js';
import { connect, expectNoEvent } from '../helpers/ws.js';

const NOW = 1_700_000_000_000;
const ORIGIN = 'http://localhost:3000';
const NOTICE = 'notification:new-message';
const SENTINEL = 'TEXTO-SECRETO-8f3a1c';

// Sesiones simuladas (arnés B0.5) sobre el chat real de B1.7: solo `accounts` es falso.
function setup(t, { logger = { error() {} } } = {}) {
  const sessions = new Map();
  const ctx = createTestContext({
    clock: fixedClock(NOW),
    overrides: { accounts: fakeAccounts(sessions), logger },
  });
  t.after(() => ctx.close());

  function openSession(user) {
    const session = createSessionFor(ctx, user.id);
    sessions.set(session.token, {
      userId: user.id,
      sessionId: session.sessionId,
      displayName: user.displayName,
      sessionExpiresAt: NOW + 8 * 60 * 60 * 1000,
    });
    return session;
  }

  function signIn(email, displayName) {
    const user = createUser(ctx, { email, displayName });
    return { user, ...openSession(user) };
  }

  return { ctx, signIn, openSession };
}

async function startServer(t, ctx) {
  const { httpServer, io, gateway } = createHttpServer(ctx.app, ctx.container);
  io.on('connection', (socket) => {
    socket.on('test:witness', () => socket.emit('test:witness'));
  });
  t.after(() => new Promise((resolve) => io.close(resolve)));
  const listening = once(httpServer, 'listening');
  httpServer.listen(0, '127.0.0.1');
  await listening;
  return { io, gateway, url: `http://127.0.0.1:${httpServer.address().port}` };
}

async function openClient(t, server, session, { join = false } = {}) {
  const socket = connect({ url: server.url, cookie: session.cookie, origin: ORIGIN });
  t.after(() => socket.disconnect());
  await socket.waitForConnection();
  if (join) {
    const response = await socket.timeout(1_000).emitWithAck('chat:join');
    assert.equal(response.ok, true);
  }
  return socket;
}

function send(socket, text, clientMessageId = randomUUID()) {
  return socket.timeout(1_000).emitWithAck('chat:send', { clientMessageId, text });
}

/** Comprueba que `event` NO llegó: el eco `test:witness` viaja después de cualquier emisión previa. */
async function assertNoEvent(socket, event) {
  const absent = expectNoEvent(socket, event, 'test:witness');
  socket.emit('test:witness');
  await absent;
}

test('TM-NOT-01: quien está conectado fuera de la sala recibe el aviso y no chat:message', async (t) => {
  const { ctx, signIn } = setup(t);
  const ana = signIn('ana@test.local', 'Ana');
  const luis = signIn('luis@test.local', 'Luis');
  const server = await startServer(t, ctx);
  const anaSocket = await openClient(t, server, ana, { join: true });
  const luisSocket = await openClient(t, server, luis);

  const response = await send(anaSocket, 'Hola desde Ana');
  assert.equal(response.ok, true);
  await luisSocket.waitFor(NOTICE);
  await assertNoEvent(luisSocket, 'chat:message');

  const notices = luisSocket.received.filter((item) => item.event === NOTICE);
  assert.equal(notices.length, 1);
  assert.deepEqual(notices[0].data, {
    messageId: response.message.id,
    authorDisplayName: 'Ana',
    createdAt: response.message.createdAt,
  });
  assert.equal(luisSocket.received.some((item) => item.event === 'chat:message'), false);
});

test('TM-NOT-02: quien está unido a chat:general recibe chat:message y no el aviso', async (t) => {
  const { ctx, signIn } = setup(t);
  const ana = signIn('ana@test.local', 'Ana');
  const luis = signIn('luis@test.local', 'Luis');
  const carla = signIn('carla@test.local', 'Carla');
  const server = await startServer(t, ctx);
  const anaSocket = await openClient(t, server, ana, { join: true });
  const luisSocket = await openClient(t, server, luis);
  const carlaSocket = await openClient(t, server, carla, { join: true });

  const response = await send(anaSocket, 'Mensaje para la sala');
  assert.equal(response.ok, true);
  await Promise.all([carlaSocket.waitFor('chat:message'), luisSocket.waitFor(NOTICE)]);
  await assertNoEvent(carlaSocket, NOTICE);

  assert.equal(carlaSocket.received.some((item) => item.event === NOTICE), false);
  const chat = carlaSocket.received.filter((item) => item.event === 'chat:message');
  assert.equal(chat.length, 1);
  assert.equal(chat[0].data.id, response.message.id);
});

test('TM-NOT-03: el autor no recibe el aviso en ninguna de sus pestañas ni sesiones', async (t) => {
  const { ctx, signIn, openSession } = setup(t);
  const ana = signIn('ana@test.local', 'Ana');
  const luis = signIn('luis@test.local', 'Luis');
  const anaOtherSession = openSession(ana.user);
  const server = await startServer(t, ctx);
  const anaChat = await openClient(t, server, ana, { join: true });
  const anaPanelTab = await openClient(t, server, ana);
  const anaOtherBrowser = await openClient(t, server, anaOtherSession);
  const luisSocket = await openClient(t, server, luis);

  const response = await send(anaChat, 'Escribo desde la pestaña del chat');
  assert.equal(response.ok, true);
  await luisSocket.waitFor(NOTICE);
  await Promise.all([anaChat, anaPanelTab, anaOtherBrowser].map((socket) => assertNoEvent(socket, NOTICE)));

  for (const socket of [anaChat, anaPanelTab, anaOtherBrowser]) {
    assert.equal(socket.received.some((item) => item.event === NOTICE), false);
  }
});

test('TM-NOT-04: la carga del aviso no contiene el texto del mensaje ni correos', async (t) => {
  const { ctx, signIn } = setup(t);
  const ana = signIn('ana.privada@correo-ejemplo.test', 'Ana');
  const luis = signIn('luis.privado@correo-ejemplo.test', 'Luis');
  const server = await startServer(t, ctx);
  const anaSocket = await openClient(t, server, ana, { join: true });
  const luisSocket = await openClient(t, server, luis);
  const frames = [];
  luisSocket.io.engine.on('packet', (packet) => {
    if (typeof packet.data === 'string') frames.push(packet.data);
  });

  const response = await send(anaSocket, `${SENTINEL} ana.privada@correo-ejemplo.test`);
  assert.equal(response.ok, true);
  await luisSocket.waitFor(NOTICE);

  const notice = luisSocket.received.find((item) => item.event === NOTICE).data;
  assert.deepEqual(Object.keys(notice).sort(), ['authorDisplayName', 'createdAt', 'messageId']);
  const wire = frames.filter((frame) => frame.includes(NOTICE));
  assert.equal(wire.length, 1);
  for (const text of [JSON.stringify(notice), wire[0]]) {
    assert.equal(text.includes(SENTINEL), false);
    assert.equal(text.includes('correo-ejemplo.test'), false);
    assert.equal(text.includes('@'), false);
  }
});

test('extra: gateway.messageStored invocado directamente emite el aviso sin pasar por el chat', async (t) => {
  const { ctx, signIn } = setup(t);
  const ana = signIn('ana@test.local', 'Ana');
  const luis = signIn('luis@test.local', 'Luis');
  const server = await startServer(t, ctx);
  const anaSocket = await openClient(t, server, ana);
  const luisSocket = await openClient(t, server, luis);

  const message = { id: 42, author: { id: ana.user.id, displayName: 'Ana' }, text: SENTINEL, createdAt: NOW, clientMessageId: randomUUID() };
  server.gateway.messageStored(message);
  await luisSocket.waitFor(NOTICE);
  await assertNoEvent(anaSocket, NOTICE);

  assert.deepEqual(luisSocket.received.find((item) => item.event === NOTICE).data, {
    messageId: 42,
    authorDisplayName: 'Ana',
    createdAt: NOW,
  });
});

test('extra: un envío repetido o inválido no genera aviso; uno válido sí', async (t) => {
  const { ctx, signIn } = setup(t);
  const ana = signIn('ana@test.local', 'Ana');
  const luis = signIn('luis@test.local', 'Luis');
  const server = await startServer(t, ctx);
  const anaSocket = await openClient(t, server, ana, { join: true });
  const luisSocket = await openClient(t, server, luis);

  const clientMessageId = randomUUID();
  assert.equal((await send(anaSocket, 'Primero', clientMessageId)).ok, true);
  await luisSocket.waitFor(NOTICE);
  assert.equal((await send(anaSocket, 'Primero', clientMessageId)).ok, true);
  assert.equal((await send(anaSocket, '   ')).ok, false);
  assert.equal((await send(anaSocket, 'x'.repeat(501))).ok, false);
  await assertNoEvent(luisSocket, NOTICE);
  assert.equal(luisSocket.received.filter((item) => item.event === NOTICE).length, 1);

  assert.equal((await send(anaSocket, 'Segundo')).ok, true);
  await luisSocket.waitFor(NOTICE, 2);
});

test('extra: un usuario con dos sockets fuera de la sala recibe un aviso por socket y deja de recibirlo al unirse', async (t) => {
  const { ctx, signIn } = setup(t);
  const ana = signIn('ana@test.local', 'Ana');
  const luis = signIn('luis@test.local', 'Luis');
  const server = await startServer(t, ctx);
  const anaSocket = await openClient(t, server, ana, { join: true });
  const luisA = await openClient(t, server, luis);
  const luisB = await openClient(t, server, luis);

  assert.equal((await send(anaSocket, 'Uno')).ok, true);
  await Promise.all([luisA.waitFor(NOTICE), luisB.waitFor(NOTICE)]);

  assert.equal((await luisB.timeout(1_000).emitWithAck('chat:join')).ok, true);
  assert.equal((await send(anaSocket, 'Dos')).ok, true);
  await Promise.all([luisA.waitFor(NOTICE, 2), luisB.waitFor('chat:message')]);
  await assertNoEvent(luisB, NOTICE);
  assert.equal(luisB.received.filter((item) => item.event === NOTICE).length, 1);

  assert.equal((await luisB.timeout(1_000).emitWithAck('chat:leave')).ok, true);
  assert.equal((await send(anaSocket, 'Tres')).ok, true);
  await Promise.all([luisA.waitFor(NOTICE, 3), luisB.waitFor(NOTICE, 2)]);
});

test('extra: un mensaje mal formado no rompe a los demás oyentes ni al chat y queda en el registro', async (t) => {
  const errors = [];
  const { ctx, signIn } = setup(t, { logger: { error: (...args) => errors.push(args) } });
  const luis = signIn('luis@test.local', 'Luis');
  const server = await startServer(t, ctx);
  const luisSocket = await openClient(t, server, luis);

  let otherListener = 0;
  server.gateway.onMessageStored(() => { otherListener += 1; });
  assert.doesNotThrow(() => server.gateway.messageStored({ id: 1 }));
  assert.equal(otherListener, 1);
  assert.equal(errors.length, 1);
  assert.equal(luisSocket.received.some((item) => item.event === NOTICE), false);
});
