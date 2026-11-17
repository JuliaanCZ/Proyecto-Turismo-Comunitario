import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import request from 'supertest';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { fixedClock } from '../../src/shared/clock.js';
import { createSessionFor, fakeAccounts } from '../helpers/auth.js';
import { createTestContext } from '../helpers/context.js';
import { createUser } from '../helpers/factories.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const NOW = 1_700_000_000_000;

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

function send(chat, principal, text, clientMessageId = randomUUID()) {
  return chat.postMessage(principal, { clientMessageId, text });
}

test('TM-CHAT-02: valida UUID, tipo, texto, límites y normalización antes de insertar', (t) => {
  const { ctx, signIn } = setup(t);
  const { principal } = signIn('ana@test.local', 'Ana');
  const invalid = [
    { clientMessageId: randomUUID(), text: '' },
    { clientMessageId: randomUUID(), text: '   \n\t' },
    { clientMessageId: randomUUID(), text: 'x'.repeat(501) },
    { clientMessageId: randomUUID(), text: 42 },
    { clientMessageId: 'no-es-uuid', text: 'Hola' },
    { clientMessageId: 42, text: 'Hola' },
  ];
  for (const payload of invalid) {
    assert.throws(
      () => ctx.container.chat.postMessage(principal, payload),
      (error) => error.code === 'VALIDATION_ERROR' && error.status === 422,
    );
  }
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS total FROM chat_messages').get().total, 0);

  const normalized = send(ctx.container.chat, principal, '  cafe\u0301\ncon  dos espacios  ');
  assert.equal(normalized.message.text, 'café\ncon  dos espacios');
  const edge = send(ctx.container.chat, principal, '😀'.repeat(500));
  assert.equal([...edge.message.text].length, 500);
});

test('TM-CHAT-04: historial por cursor pagina 75 mensajes en 30, 30 y 15', (t) => {
  const { ctx, signIn } = setup(t);
  const { principal } = signIn('ana@test.local', 'Ana');
  for (let index = 1; index <= 75; index += 1) {
    send(ctx.container.chat, principal, `Mensaje ${index}`);
  }

  const first = ctx.container.chat.getHistory({ limit: 30 });
  const second = ctx.container.chat.getHistory({ before: first.messages[0].id, limit: 30 });
  const third = ctx.container.chat.getHistory({ before: second.messages[0].id, limit: 30 });
  assert.deepEqual([first.messages.length, second.messages.length, third.messages.length], [30, 30, 15]);
  assert.deepEqual([first.hasMore, second.hasMore, third.hasMore], [true, true, false]);
  const all = [...third.messages, ...second.messages, ...first.messages];
  assert.deepEqual(all.map((message) => message.id), Array.from({ length: 75 }, (_, index) => index + 1));
  for (const page of [first, second, third]) {
    assert.deepEqual(
      page.messages.map((message) => message.id),
      [...page.messages].map((message) => message.id).sort((a, b) => a - b),
    );
  }
});

test('TM-CHAT-06: el historial persiste al cerrar y reabrir la base', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'turismo-chat-'));
  const databaseFile = join(directory, 'chat.sqlite');
  const config = loadConfig({ APP_ENV: 'test', DATABASE_FILE: databaseFile });
  const clock = fixedClock(NOW);

  let container;
  t.after(() => {
    container?.close();
    rmSync(directory, { recursive: true, force: true });
  });
  container = createContainer(config, { clock, logger: { error() {} } });
  const user = createUser({ db: container.db, clock }, {
    email: 'ana@test.local', displayName: 'Ana',
  });
  const principal = { userId: user.id, displayName: user.displayName };
  for (let index = 1; index <= 40; index += 1) send(container.chat, principal, `Persistente ${index}`);
  container.close();

  container = createContainer(config, { clock, logger: { error() {} } });
  const recovered = container.chat.getHistory({ limit: 100 });
  assert.equal(recovered.messages.length, 40);
  assert.deepEqual(recovered.messages.map((message) => message.id), Array.from({ length: 40 }, (_, index) => index + 1));
  const next = send(container.chat, principal, 'Después del reinicio');
  assert.equal(next.message.id, 41);
});

test('TM-CHAT-07: marcado se conserva como texto y la página lo escapa', async (t) => {
  const { ctx, signIn } = setup(t);
  const { principal, cookie } = signIn('ana@test.local', '<i>Ana</i>');
  const attack = '<script>window.__chatXss = true</script>';
  const stored = send(ctx.container.chat, principal, attack);
  assert.equal(stored.message.text, attack);

  const response = await request(ctx.app).get('/panel/chat').set('Cookie', cookie);
  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.match(response.text, /&lt;script&gt;window\.__chatXss = true&lt;\/script&gt;/);
  assert.match(response.text, /&lt;i&gt;Ana&lt;\/i&gt;/);
  assert.doesNotMatch(response.text, /<script>window\.__chatXss = true<\/script>/);
  assert.match(response.text, /role="log"[^>]*aria-live="polite"/s);
  const browserCode = readFileSync(join(ROOT, 'public/js/chat.js'), 'utf8');
  assert.doesNotMatch(browserCode, /innerHTML|insertAdjacentHTML|document\.write/);
  assert.match(browserCode, /textContent = message\.text/);
});

test('TM-CHAT-08: historial HTTP exige sesión y valida cursores y límite', async (t) => {
  const { ctx, signIn } = setup(t);
  const unauthenticated = await request(ctx.app).get('/api/chat/mensajes');
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers['cache-control'], 'no-store');
  assert.equal(unauthenticated.body.error.code, 'UNAUTHENTICATED');

  const { principal, cookie } = signIn('ana@test.local', 'Ana');
  send(ctx.container.chat, principal, 'Uno');
  const valid = await request(ctx.app).get('/api/chat/mensajes?after=0&limit=100').set('Cookie', cookie);
  assert.equal(valid.status, 200);
  assert.equal(valid.headers['cache-control'], 'no-store');
  assert.equal(valid.body.messages.length, 1);

  for (const query of ['limit=0', 'limit=101', 'limit=abc', 'before=x', 'after=x', 'before=1&after=0']) {
    const response = await request(ctx.app).get(`/api/chat/mensajes?${query}`).set('Cookie', cookie);
    assert.equal(response.status, 422, query);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR', query);
  }
});
