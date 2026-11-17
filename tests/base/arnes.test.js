import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createTestContext } from '../helpers/context.js';
import { createMessages, createUser } from '../helpers/factories.js';
import { createSessionFor } from '../helpers/auth.js';
import { connect, expectNoEvent, startTestServer } from '../helpers/ws.js';

test('TM-ARN-01: createSessionFor guarda solo el hash de la sesión', (t) => {
  const ctx = createTestContext();
  t.after(() => ctx.close());
  const user = createUser(ctx, { email: 'ana@test.local', displayName: 'Ana Test' });
  const session = createSessionFor(ctx, user.id);
  const row = ctx.db.prepare('SELECT token_hash FROM sessions WHERE id = ?').get(session.sessionId);
  assert.match(session.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(session.cookie, `tc_session=${session.token}`);
  assert.match(row.token_hash, /^[0-9a-f]{64}$/);
  assert.equal(row.token_hash, createHash('sha256').update(session.token).digest('hex'));
  assert.notEqual(row.token_hash, session.token);
  const firstMessage = createMessages(ctx, 1, { authors: [user] })[0];
  const secondMessage = createMessages(ctx, 1, { authors: [user] })[0];
  assert.notEqual(firstMessage.clientMessageId, secondMessage.clientMessageId);
});

test('TM-ARN-02: waitFor espera n eventos y falla claramente si se desconecta', async (t) => {
  const ctx = createTestContext();
  t.after(() => ctx.close());
  const server = await startTestServer(ctx);
  t.after(() => server.close());
  server.io.on('connection', (socket) => {
    socket.emit('early', { ok: true });
    socket.on('request-ready', () => {
      socket.emit('removed');
      socket.emit('ready', { ok: true });
      socket.emit('ready', { ok: true });
    });
  });
  const client = connect({
    url: server.url,
    cookie: 'tc_session=test-token',
    origin: 'http://localhost:3000',
  });
  t.after(() => client.disconnect());
  await client.waitForConnection();
  assert.equal(client.received.filter(({ event }) => event === 'early').length, 1);
  await assert.doesNotReject(client.waitFor('early'));
  let removedCalls = 0;
  const removed = () => {
    removedCalls += 1;
  };
  client.on('removed', removed);
  client.off('removed', removed);
  const ready = client.waitFor('ready', 2);
  client.emit('request-ready');
  await assert.doesNotReject(ready);
  assert.equal(removedCalls, 0);
  await assert.rejects(
    client.waitFor('never', 1, { timeoutMs: 25 }),
    /No llegaron 1 eventos "never" en 25 ms/,
  );
  client.disconnect();
  await assert.rejects(client.waitFor('never', 1), /No llegaron 1 eventos "never"/);

  server.io.use((_socket, next) => {
    const error = new Error('rechazo original del arnés');
    error.data = { code: 'HARNESS_REJECTION' };
    next(error);
  });
  const rejected = connect({
    url: server.url,
    cookie: 'tc_session=reject',
    origin: 'http://localhost:3000',
  });
  try {
    await assert.rejects(
      rejected.waitForConnection(),
      (error) => error.message === 'rechazo original del arnés'
        && error.data?.code === 'HARNESS_REJECTION',
    );
  } finally {
    rejected.disconnect();
  }
});

test('TM-ARN-03: expectNoEvent distingue ausencia y presencia usando un testigo', async (t) => {
  const ctx = createTestContext();
  t.after(() => ctx.close());
  const server = await startTestServer(ctx);
  t.after(() => server.close());
  const client = connect({
    url: server.url,
    cookie: 'tc_session=test-token',
    origin: 'http://localhost:3000',
  });
  t.after(() => client.disconnect());
  server.io.on('connection', (socket) => {
    socket.on('request-witness', () => socket.emit('witness'));
    socket.on('request-both', () => {
      socket.emit('forbidden');
      socket.emit('witness');
    });
  });
  await client.waitForConnection();
  const absent = expectNoEvent(client, 'forbidden', 'witness');
  client.emit('request-witness');
  await assert.doesNotReject(absent);

  const second = connect({
    url: server.url,
    cookie: 'tc_session=test-token-2',
    origin: 'http://localhost:3000',
  });
  t.after(() => second.disconnect());
  await second.waitForConnection();
  const present = expectNoEvent(second, 'forbidden', 'witness');
  second.emit('request-both');
  await assert.rejects(present, /evento prohibido/);

  const disconnected = connect({
    url: server.url,
    cookie: 'tc_session=test-token-3',
    origin: 'http://localhost:3000',
  });
  t.after(() => disconnected.disconnect());
  await disconnected.waitForConnection();
  const pending = expectNoEvent(disconnected, 'forbidden', 'never');
  disconnected.disconnect();
  await assert.rejects(pending, /Socket\.IO se desconectó/);

  const timedOut = expectNoEvent(client, 'forbidden', 'never', { timeoutMs: 25 });
  await assert.rejects(timedOut, /No llegó el testigo "never" en 25 ms/);
});
