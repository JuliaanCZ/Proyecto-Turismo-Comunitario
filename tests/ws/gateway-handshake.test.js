import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import { guard } from '../../src/realtime/session-guard.js';
import { createHttpServer } from '../../src/server.js';
import { fixedClock } from '../../src/shared/clock.js';
import { fakeAccounts } from '../helpers/auth.js';
import { createTestContext } from '../helpers/context.js';
import { createUser } from '../helpers/factories.js';
import { connect } from '../helpers/ws.js';

const NOW = 1_700_000_000_000;
const ORIGIN = 'http://localhost:3000';

function token() {
  return randomBytes(32).toString('base64url');
}

function testSetup(t, { now = NOW } = {}) {
  const clock = fixedClock(now);
  const sessions = new Map();
  const ctx = createTestContext({
    clock,
    overrides: {
      accounts: fakeAccounts(sessions),
      logger: { error() {} },
    },
  });
  t.after(() => ctx.close());
  return { clock, ctx, sessions };
}

async function startGateway(t, ctx) {
  const { httpServer, io, gateway } = createHttpServer(ctx.app, ctx.container);
  t.after(() => new Promise((resolve) => io.close(resolve)));
  const listening = once(httpServer, 'listening');
  httpServer.listen(0, '127.0.0.1');
  await listening;
  const port = httpServer.address().port;
  return { httpServer, io, gateway, port, url: `http://127.0.0.1:${port}` };
}

function addSession(setup, user, {
  sessionId = randomUUID(),
  sessionExpiresAt = setup.clock.now() + 60_000,
  sessionToken = token(),
} = {}) {
  const principal = {
    userId: user.id,
    sessionId,
    displayName: user.displayName,
    sessionExpiresAt,
  };
  setup.sessions.set(sessionToken, principal);
  return { token: sessionToken, cookie: `tc_session=${sessionToken}`, principal };
}

function client(t, server, options = {}) {
  const { cookie } = options;
  const origin = Object.hasOwn(options, 'origin') ? options.origin : ORIGIN;
  const socket = connect({ url: server.url, cookie, origin });
  t.after(() => socket.disconnect());
  return socket;
}

async function expectConnectionError(socket, code) {
  await assert.rejects(
    socket.waitForConnection(),
    (error) => error.data?.code === code,
  );
}

test('TM-WS-01: sin cookie válida rechaza el handshake y no crea salas', async (t) => {
  const setup = testSetup(t);
  const server = await startGateway(t, setup.ctx);

  const missing = client(t, server, { origin: ORIGIN });
  await expectConnectionError(missing, 'UNAUTHENTICATED');
  const malformed = client(t, server, { cookie: 'tc_session=no-es-base64url', origin: ORIGIN });
  await expectConnectionError(malformed, 'UNAUTHENTICATED');

  assert.equal(server.io.sockets.sockets.size, 0);
  assert.equal(
    [...server.io.sockets.adapter.rooms.keys()].some((room) => /^user:|^session:/.test(room)),
    false,
  );
});

test('TM-WS-02: Origin ajeno o ausente produce ORIGIN_MISMATCH', async (t) => {
  const setup = testSetup(t);
  const user = createUser(setup.ctx, { email: 'ana@test.local', displayName: 'Ana' });
  const session = addSession(setup, user);
  const server = await startGateway(t, setup.ctx);

  const foreign = client(t, server, { cookie: session.cookie, origin: 'https://evil.test' });
  await expectConnectionError(foreign, 'ORIGIN_MISMATCH');
  const absent = client(t, server, { cookie: session.cookie, origin: undefined });
  await expectConnectionError(absent, 'ORIGIN_MISMATCH');
  assert.equal(server.io.sockets.sockets.size, 0);
});

test('TM-WS-03: una sesión revocada, inexistente o vencida no conecta', async (t) => {
  const setup = testSetup(t);
  const user = createUser(setup.ctx, { email: 'ana@test.local', displayName: 'Ana' });
  const revoked = addSession(setup, user);
  setup.sessions.delete(revoked.token);
  const expired = addSession(setup, user, { sessionExpiresAt: setup.clock.now() });
  const server = await startGateway(t, setup.ctx);

  await expectConnectionError(client(t, server, { cookie: revoked.cookie }), 'UNAUTHENTICATED');
  await expectConnectionError(client(t, server, { cookie: expired.cookie }), 'UNAUTHENTICATED');
  await expectConnectionError(
    client(t, server, { cookie: `tc_session=${token()}` }),
    'UNAUTHENTICATED',
  );
  assert.equal(server.io.sockets.sockets.size, 0);
});

test('TM-WS-04: una sesión válida conecta por websocket y entra en sus salas', async (t) => {
  const setup = testSetup(t);
  const user = createUser(setup.ctx, { email: 'ana@test.local', displayName: 'Ana' });
  const session = addSession(setup, user);
  const server = await startGateway(t, setup.ctx);
  const socket = client(t, server, { cookie: session.cookie });

  await socket.waitForConnection();
  assert.equal(socket.io.engine.transport.name, 'websocket');
  const serverSocket = [...server.io.sockets.sockets.values()][0];
  assert.deepEqual(serverSocket.data, { principal: session.principal, token: session.token });
  assert.equal(serverSocket.rooms.has(`user:${user.id}`), true);
  assert.equal(serverSocket.rooms.has(`session:${session.principal.sessionId}`), true);
  assert.deepEqual(server.gateway.roomMembers(`user:${user.id}`), [serverSocket]);
  assert.equal(server.io.engine.opts.maxHttpBufferSize, 16 * 1024);
});

test('TM-WS-05: revocar una sesión o un usuario cierra solo las salas correspondientes', async (t) => {
  const setup = testSetup(t);
  const ana = createUser(setup.ctx, { email: 'ana@test.local', displayName: 'Ana' });
  const luis = createUser(setup.ctx, { email: 'luis@test.local', displayName: 'Luis' });
  const anaS1 = addSession(setup, ana);
  const anaS2 = addSession(setup, ana);
  const luisS1 = addSession(setup, luis);
  const server = await startGateway(t, setup.ctx);
  const anaS1a = client(t, server, { cookie: anaS1.cookie });
  const anaS1b = client(t, server, { cookie: anaS1.cookie });
  const anaS2a = client(t, server, { cookie: anaS2.cookie });
  const luisS1a = client(t, server, { cookie: luisS1.cookie });
  await Promise.all([anaS1a, anaS1b, anaS2a, luisS1a].map((socket) => socket.waitForConnection()));

  const s1Expired = [anaS1a, anaS1b].map((socket) => socket.waitFor('session:expired'));
  const s1Disconnected = [anaS1a, anaS1b].map((socket) => once(socket, 'disconnect'));
  setup.ctx.container.sessionEvents.emit('session-revoked', {
    sessionId: anaS1.principal.sessionId,
  });
  await Promise.all([...s1Expired, ...s1Disconnected]);
  for (const socket of [anaS1a, anaS1b]) {
    assert.deepEqual(
      socket.received.find(({ event }) => event === 'session:expired').data,
      { reason: 'revoked' },
    );
  }
  assert.equal(anaS2a.connected, true);
  assert.equal(luisS1a.connected, true);

  const userExpired = anaS2a.waitFor('session:expired');
  const userDisconnected = once(anaS2a, 'disconnect');
  setup.ctx.container.sessionEvents.emit('session-revoked', { userId: ana.id });
  await Promise.all([userExpired, userDisconnected]);
  assert.equal(luisS1a.connected, true);
});

test('TM-WS-06: guard rechaza un evento si la sesión fue revocada sin aviso', async (t) => {
  const setup = testSetup(t);
  const user = createUser(setup.ctx, { email: 'ana@test.local', displayName: 'Ana' });
  const session = addSession(setup, user);
  const server = await startGateway(t, setup.ctx);
  let handled = 0;
  server.io.on('connection', (socket) => {
    socket.on('test:guard', guard(socket, (_payload, acknowledge) => {
      handled += 1;
      acknowledge({ ok: true });
    }));
  });
  const socket = client(t, server, { cookie: session.cookie });
  await socket.waitForConnection();

  assert.deepEqual(await socket.timeout(1_000).emitWithAck('test:guard', {}), { ok: true });
  setup.sessions.delete(session.token);
  const expired = socket.waitFor('session:expired');
  const disconnected = once(socket, 'disconnect');
  const response = await socket.timeout(1_000).emitWithAck('test:guard', {});
  await Promise.all([expired, disconnected]);
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'UNAUTHENTICATED');
  assert.deepEqual(
    socket.received.find(({ event }) => event === 'session:expired').data,
    { reason: 'revoked' },
  );
  assert.equal(handled, 1);
});

test('TM-WS-07: al vencer el reloj de la sesión se avisa y se cierra el socket', async (t) => {
  const setup = testSetup(t);
  const user = createUser(setup.ctx, { email: 'ana@test.local', displayName: 'Ana' });
  const session = addSession(setup, user, { sessionExpiresAt: setup.clock.now() + 50 });
  const server = await startGateway(t, setup.ctx);
  const socket = client(t, server, { cookie: session.cookie });
  await socket.waitForConnection();

  const expired = socket.waitFor('session:expired');
  const disconnected = once(socket, 'disconnect');
  setup.clock.advance(50);
  await Promise.all([expired, disconnected]);
  assert.equal(socket.connected, false);
  const event = socket.received.find(({ event }) => event === 'session:expired');
  assert.deepEqual(event.data, { reason: 'expired' });
});
