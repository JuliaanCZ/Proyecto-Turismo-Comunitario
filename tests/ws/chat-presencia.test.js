import assert from 'node:assert/strict';
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
    sessions.set(session.token, {
      userId: user.id,
      sessionId: session.sessionId,
      displayName,
      email,
      sessionExpiresAt: NOW + 8 * 60 * 60 * 1000,
    });
    return { user, ...session };
  }
  return { ctx, signIn };
}

async function startServer(t, ctx) {
  const { httpServer, io } = createHttpServer(ctx.app, ctx.container);
  io.on('connection', (socket) => {
    socket.on('test:witness', () => socket.emit('test:witness'));
  });
  t.after(() => new Promise((resolve) => io.close(resolve)));
  const listening = once(httpServer, 'listening');
  httpServer.listen(0, '127.0.0.1');
  await listening;
  return { io, url: `http://127.0.0.1:${httpServer.address().port}` };
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

function presenceEvents(socket) {
  return socket.received
    .filter(({ event }) => event === 'presence:update')
    .map(({ data }) => data);
}

function latestPresence(socket) {
  return presenceEvents(socket).at(-1);
}

test('TM-CHAT-10: dos usuarios unidos se ven mutuamente', async (t) => {
  const state = setup(t);
  const ana = state.signIn('ana@test.local', 'Ana');
  const luis = state.signIn('luis@test.local', 'Luis');
  const server = await startServer(t, state.ctx);
  const anaSocket = openClient(t, server, ana);
  const luisSocket = openClient(t, server, luis);

  await join(anaSocket);
  const nextUpdate = anaSocket.waitFor('presence:update', presenceEvents(anaSocket).length + 1);
  const joined = await join(luisSocket);
  await nextUpdate;

  const expected = [
    { id: ana.user.id, displayName: 'Ana' },
    { id: luis.user.id, displayName: 'Luis' },
  ];
  assert.deepEqual(joined.presence, { users: expected, count: 2 });
  assert.deepEqual(latestPresence(anaSocket), joined.presence);
});

test('TM-CHAT-11: dos pestañas cuentan una vez y la última salida elimina la presencia', async (t) => {
  const state = setup(t);
  const ana = state.signIn('ana@test.local', 'Ana');
  const luis = state.signIn('luis@test.local', 'Luis');
  const server = await startServer(t, state.ctx);
  const observer = openClient(t, server, luis);
  const anaOne = openClient(t, server, ana);
  const anaTwo = openClient(t, server, ana);
  await join(observer);

  const firstAnaUpdate = observer.waitFor('presence:update', presenceEvents(observer).length + 1);
  await join(anaOne);
  await firstAnaUpdate;
  assert.equal(latestPresence(observer).count, 2);

  const noSecondJoinUpdate = expectNoEvent(observer, 'presence:update', 'test:witness');
  const secondJoined = await join(anaTwo);
  observer.emit('test:witness');
  await noSecondJoinUpdate;
  assert.equal(secondJoined.presence.count, 2);

  const noFirstLeaveUpdate = expectNoEvent(observer, 'presence:update', 'test:witness');
  const firstLeft = await anaOne.timeout(1_000).emitWithAck('chat:leave');
  assert.equal(firstLeft.ok, true);
  observer.emit('test:witness');
  await noFirstLeaveUpdate;

  const finalUpdate = observer.waitFor('presence:update', presenceEvents(observer).length + 1);
  const serverAnaTwo = server.io.sockets.sockets.get(anaTwo.id);
  const serverDetectedDisconnect = once(serverAnaTwo, 'disconnect');
  anaTwo.disconnect();
  await Promise.all([finalUpdate, serverDetectedDisconnect]);
  assert.deepEqual(latestPresence(observer), {
    users: [{ id: luis.user.id, displayName: 'Luis' }],
    count: 1,
  });
});

test('TM-CHAT-12: un socket conectado sin unirse no aparece', async (t) => {
  const state = setup(t);
  const ana = state.signIn('ana@test.local', 'Ana');
  const luis = state.signIn('luis@test.local', 'Luis');
  const server = await startServer(t, state.ctx);
  const observer = openClient(t, server, ana);
  await join(observer);

  const silent = openClient(t, server, luis);
  const noUpdate = expectNoEvent(observer, 'presence:update', 'test:witness');
  await silent.waitForConnection();
  observer.emit('test:witness');
  await noUpdate;

  const repeatedJoin = await join(observer);
  assert.deepEqual(repeatedJoin.presence, {
    users: [{ id: ana.user.id, displayName: 'Ana' }],
    count: 1,
  });
});

test('TM-CHAT-13: revocar la sesión desconecta y retira la presencia', async (t) => {
  const state = setup(t);
  const ana = state.signIn('ana@test.local', 'Ana');
  const luis = state.signIn('luis@test.local', 'Luis');
  const server = await startServer(t, state.ctx);
  const observer = openClient(t, server, luis);
  const anaSocket = openClient(t, server, ana);
  await join(observer);
  await join(anaSocket);

  const update = observer.waitFor('presence:update', presenceEvents(observer).length + 1);
  const disconnected = once(anaSocket, 'disconnect');
  state.ctx.container.sessionEvents.emit('session-revoked', { sessionId: ana.sessionId });
  await Promise.all([update, disconnected]);

  assert.deepEqual(latestPresence(observer), {
    users: [{ id: luis.user.id, displayName: 'Luis' }],
    count: 1,
  });
});

test('TM-CHAT-14: la presencia contiene solo id y displayName', async (t) => {
  const state = setup(t);
  const ana = state.signIn('ana@test.local', 'Ana');
  const server = await startServer(t, state.ctx);
  const socket = openClient(t, server, ana);
  const joined = await join(socket);
  await socket.waitFor('presence:update');

  for (const payload of [joined.presence, latestPresence(socket)]) {
    assert.deepEqual(Object.keys(payload).sort(), ['count', 'users']);
    assert.equal(payload.count, payload.users.length);
    assert.deepEqual(Object.keys(payload.users[0]).sort(), ['displayName', 'id']);
    assert.equal(JSON.stringify(payload).includes('ana@test.local'), false);
  }
});
