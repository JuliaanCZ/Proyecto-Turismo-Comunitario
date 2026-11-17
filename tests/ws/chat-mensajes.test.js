import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import request from 'supertest';
import { createHttpServer } from '../../src/server.js';
import { fixedClock } from '../../src/shared/clock.js';
import { createSessionFor, fakeAccounts } from '../helpers/auth.js';
import { createTestContext } from '../helpers/context.js';
import { createUser } from '../helpers/factories.js';
import { connect, expectNoEvent } from '../helpers/ws.js';

const NOW = 1_700_000_000_000;
const ORIGIN = 'http://localhost:3000';

function setup(t) {
  const sessions = new Map();
  const ctx = createTestContext({
    clock: fixedClock(NOW),
    overrides: { accounts: fakeAccounts(sessions), logger: { error() {} } },
  });
  t.after(() => ctx.close());

  function signIn(email, displayName) {
    const user = createUser(ctx, { email, displayName });
    const session = createSessionFor(ctx, user.id);
    const principal = {
      userId: user.id,
      sessionId: session.sessionId,
      displayName,
      sessionExpiresAt: NOW + 8 * 60 * 60 * 1000,
    };
    sessions.set(session.token, principal);
    return { user, principal, ...session };
  }
  return { ctx, sessions, signIn };
}

async function startServer(t, ctx) {
  const { httpServer, io, gateway } = createHttpServer(ctx.app, ctx.container);
  t.after(() => new Promise((resolve) => io.close(resolve)));
  const listening = once(httpServer, 'listening');
  httpServer.listen(0, '127.0.0.1');
  await listening;
  const port = httpServer.address().port;
  return { httpServer, io, gateway, url: `http://127.0.0.1:${port}` };
}

function openClient(t, server, session) {
  const socket = connect({ url: server.url, cookie: session.cookie, origin: ORIGIN });
  t.after(() => socket.disconnect());
  return socket;
}

async function join(socket) {
  await socket.waitForConnection();
  const response = await socket.timeout(1_000).emitWithAck('chat:join');
  assert.equal(response.ok, true);
  return response;
}

function send(socket, text, clientMessageId = randomUUID()) {
  return socket.timeout(1_000).emitWithAck('chat:send', { clientMessageId, text });
}

test('TM-CHAT-01: guarda antes de emitir y entrega el mismo mensaje a dos clientes', async (t) => {
  const setupState = setup(t);
  const ana = setupState.signIn('ana@test.local', 'Ana');
  const luis = setupState.signIn('luis@test.local', 'Luis');
  const server = await startServer(t, setupState.ctx);
  const anaSocket = openClient(t, server, ana);
  const luisSocket = openClient(t, server, luis);
  await Promise.all([join(anaSocket), join(luisSocket)]);

  let persistedAtEmission = false;
  const received = new Promise((resolve) => {
    luisSocket.once('chat:message', (message) => {
      persistedAtEmission = Boolean(
        setupState.ctx.db.prepare('SELECT id FROM chat_messages WHERE id = ?').get(message.id),
      );
      resolve(message);
    });
  });
  const stored = new Promise((resolve) => server.gateway.onMessageStored(resolve));
  const clientMessageId = randomUUID();
  const response = await send(anaSocket, 'Hola desde Ana', clientMessageId);
  const [event, hookMessage] = await Promise.all([received, stored]);

  assert.equal(response.ok, true);
  assert.deepEqual(response.message, event);
  assert.deepEqual(hookMessage, event);
  assert.equal(persistedAtEmission, true);
  assert.deepEqual(Object.keys(event), ['id', 'author', 'text', 'createdAt', 'clientMessageId']);
  assert.deepEqual(event.author, { id: ana.user.id, displayName: 'Ana' });
  assert.equal(event.clientMessageId, clientMessageId);
});

test('TM-CHAT-02: cargas inválidas confirman VALIDATION_ERROR sin fila ni emisión', async (t) => {
  const setupState = setup(t);
  const ana = setupState.signIn('ana@test.local', 'Ana');
  const luis = setupState.signIn('luis@test.local', 'Luis');
  const server = await startServer(t, setupState.ctx);
  server.io.on('connection', (socket) => {
    socket.on('test:witness', () => socket.emit('test:witness'));
  });
  const anaSocket = openClient(t, server, ana);
  const luisSocket = openClient(t, server, luis);
  await Promise.all([join(anaSocket), join(luisSocket)]);

  const absent = expectNoEvent(luisSocket, 'chat:message', 'test:witness');
  const invalid = [
    { clientMessageId: randomUUID(), text: '' },
    { clientMessageId: randomUUID(), text: ' '.repeat(4) },
    { clientMessageId: randomUUID(), text: 'x'.repeat(501) },
    { clientMessageId: randomUUID(), text: 12 },
    { clientMessageId: 'incorrecto', text: 'Hola' },
  ];
  for (const payload of invalid) {
    const response = await anaSocket.timeout(1_000).emitWithAck('chat:send', payload);
    assert.equal(response.ok, false);
    assert.equal(response.error.code, 'VALIDATION_ERROR');
  }
  luisSocket.emit('test:witness');
  await absent;
  assert.equal(setupState.ctx.db.prepare('SELECT COUNT(*) AS total FROM chat_messages').get().total, 0);
});

test('TM-CHAT-03: repetir clientMessageId devuelve la misma fila y emite una vez', async (t) => {
  const setupState = setup(t);
  const ana = setupState.signIn('ana@test.local', 'Ana');
  const luis = setupState.signIn('luis@test.local', 'Luis');
  const server = await startServer(t, setupState.ctx);
  server.io.on('connection', (socket) => {
    socket.on('test:witness', () => socket.emit('test:witness'));
  });
  let storedCalls = 0;
  server.gateway.onMessageStored(() => { storedCalls += 1; });
  const anaSocket = openClient(t, server, ana);
  const luisSocket = openClient(t, server, luis);
  await Promise.all([join(anaSocket), join(luisSocket)]);

  const clientMessageId = randomUUID();
  const firstEvent = luisSocket.waitFor('chat:message');
  const first = await send(anaSocket, 'Mensaje original', clientMessageId);
  await firstEvent;
  const noSecondEvent = expectNoEvent(luisSocket, 'chat:message', 'test:witness');
  const repeated = await send(anaSocket, 'Texto distinto que no reemplaza', clientMessageId);
  luisSocket.emit('test:witness');
  await noSecondEvent;

  assert.equal(first.ok, true);
  assert.equal(repeated.ok, true);
  assert.deepEqual(repeated.message, first.message);
  assert.equal(repeated.message.text, 'Mensaje original');
  assert.equal(storedCalls, 1);
  assert.equal(setupState.ctx.db.prepare('SELECT COUNT(*) AS total FROM chat_messages').get().total, 1);
});

test('TM-CHAT-05: al reconectar recupera por after solo los mensajes perdidos', async (t) => {
  const setupState = setup(t);
  const ana = setupState.signIn('ana@test.local', 'Ana');
  const luis = setupState.signIn('luis@test.local', 'Luis');
  const server = await startServer(t, setupState.ctx);
  const anaSocket = openClient(t, server, ana);
  const luisSocket = openClient(t, server, luis);
  await Promise.all([join(anaSocket), join(luisSocket)]);

  const firstReceived = luisSocket.waitFor('chat:message');
  const first = await send(anaSocket, 'Antes de caer');
  await firstReceived;
  luisSocket.disconnect();
  const missed = [];
  for (const text of ['Perdido 1', 'Perdido 2', 'Perdido 3']) {
    missed.push((await send(anaSocket, text)).message);
  }

  const reconnected = openClient(t, server, luis);
  const joined = await join(reconnected);
  assert.equal(joined.lastMessageId, missed.at(-1).id);
  const history = await request(server.httpServer)
    .get(`/api/chat/mensajes?after=${first.message.id}&limit=100`)
    .set('Cookie', luis.cookie);
  assert.equal(history.status, 200);
  assert.deepEqual(history.body.messages, missed);
  assert.equal(new Set(history.body.messages.map((message) => message.id)).size, 3);
  const empty = await request(server.httpServer)
    .get(`/api/chat/mensajes?after=${missed.at(-1).id}&limit=100`)
    .set('Cookie', luis.cookie);
  assert.deepEqual(empty.body, { messages: [], hasMore: false });
});

test('TM-CHAT-09: una sesión revocada no guarda y pierde el socket', async (t) => {
  const setupState = setup(t);
  const ana = setupState.signIn('ana@test.local', 'Ana');
  const server = await startServer(t, setupState.ctx);
  const socket = openClient(t, server, ana);
  await join(socket);
  setupState.sessions.delete(ana.token);

  const expired = socket.waitFor('session:expired');
  const disconnected = once(socket, 'disconnect');
  const response = await send(socket, 'No debe guardarse');
  await Promise.all([expired, disconnected]);
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'UNAUTHENTICATED');
  assert.equal(setupState.ctx.db.prepare('SELECT COUNT(*) AS total FROM chat_messages').get().total, 0);
});
