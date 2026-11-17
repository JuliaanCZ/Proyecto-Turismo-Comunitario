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
  assert.match(row.token_hash, /^[0-9a-f]{64}$/);
  assert.equal(row.token_hash, createHash('sha256').update(session.token).digest('hex'));
  assert.notEqual(row.token_hash, session.token);
  const firstMessage = createMessages(ctx, 1, { authors: [user] })[0];
  const secondMessage = createMessages(ctx, 1, { authors: [user] })[0];
  assert.notEqual(firstMessage.clientMessageId, secondMessage.clientMessageId);
});

test('TM-ARN-02: waitFor espera n eventos y falla claramente si se desconecta', async (t) => {
  const ctx = createTestContext();
  const server = await startTestServer(ctx);
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
  t.after(async () => {
    client.disconnect();
    await server.close();
    ctx.close();
  });
  await new Promise((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
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
  client.disconnect();
  await assert.rejects(client.waitFor('never', 1), /No llegaron 1 eventos "never"/);
});

test('TM-ARN-03: expectNoEvent distingue ausencia y presencia usando un testigo', async (t) => {
  const ctx = createTestContext();
  const server = await startTestServer(ctx);
  const client = connect({
    url: server.url,
    cookie: 'tc_session=test-token',
    origin: 'http://localhost:3000',
  });
  t.after(async () => {
    client.disconnect();
    await server.close();
    ctx.close();
  });
  server.io.on('connection', (socket) => {
    socket.on('request-witness', () => socket.emit('witness'));
    socket.on('request-both', () => {
      socket.emit('forbidden');
      socket.emit('witness');
    });
  });
  await new Promise((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
  const absent = expectNoEvent(client, 'forbidden', 'witness');
  client.emit('request-witness');
  await assert.doesNotReject(absent);

  const second = connect({
    url: server.url,
    cookie: 'tc_session=test-token-2',
    origin: 'http://localhost:3000',
  });
  t.after(() => second.disconnect());
  await new Promise((resolve, reject) => {
    second.once('connect', resolve);
    second.once('connect_error', reject);
  });
  const present = expectNoEvent(second, 'forbidden', 'witness');
  second.emit('request-both');
  await assert.rejects(present, /evento prohibido/);

  const disconnected = connect({
    url: server.url,
    cookie: 'tc_session=test-token-3',
    origin: 'http://localhost:3000',
  });
  t.after(() => disconnected.disconnect());
  await new Promise((resolve, reject) => {
    disconnected.once('connect', resolve);
    disconnected.once('connect_error', reject);
  });
  const pending = expectNoEvent(disconnected, 'forbidden', 'never');
  disconnected.disconnect();
  await assert.rejects(pending, /Socket\.IO se desconectó/);
});
